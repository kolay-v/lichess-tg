const { randomBytes } = require('crypto')
const crypto = require('crypto')
const knex = require('knex')(require('../knexfile'))

/**
 * Gets the user game by message.
 *
 * @param {number} userId The user identifier
 * @param {number} messageId The message identifier
 * @return {Promise<{ token: string, game_id: number, moves: string } | null>} The user game by message.
 */
module.exports.getUserGameByMessage = (userId, messageId) => knex('games')
  .select('token', 'game_id', 'moves')
  .where({ message_id: messageId, user_id: userId })
  .leftJoin('accounts', 'games.account_id', 'accounts.id')
  .first()

/**
 * Gets the user by secret.
 *
 * @param {string} secret The secret
 * @return {Promise<{ id: number, code_verifier: Buffer } | null>} The user by secret.
 */
module.exports.getUserBySecret = (secret) => knex('users')
  .select('id', 'code_verifier')
  .where({ secret })
  .first()

/**
 * Creates or updates user by content
 *
 * @param {User} Telegram user from context
 * @return {Promise<void>}
 */
module.exports.createOrUpdateUser = ({ id, first_name, username, last_name, language_code }) => knex('users')
  .insert({
    id,
    tg_info: JSON.stringify({
      first_name,
      username,
      last_name,
      language_code,
    }),
  })
  .onConflict('id')
  .merge()

/**
 * Creates account after oAuth
 *
 * @param {number} userId The user id
 * @param {string} lichessToken Token from lichess
 * @param {Object} lichessUser Lichess user's data
 * @return {Promise<void>}
 */
module.exports.createAccount = (userId, lichessToken, lichessUser) => knex('accounts')
  .insert({
    user_id: userId,
    token: lichessToken,
    lichess_id: lichessUser.id,
    username: lichessUser.username,
    title: lichessUser.title,
  })

/**
 * Updates users temp oauth token
 *
 * @param {number} id The user identifier
 * @return {Promise<void>}
 */
module.exports.updateCodeVerifier = (id) => knex('users')
  .update({ code_verifier: randomBytes(32) })
  .where({ id })

/**
 * returns secret by user's id
 * @param {number} id user id
 * @return {Promise<{ secret: string } | null>} secret if found
 */
module.exports.getSecretById = (id) => knex.select('secret')
  .from('users').where({ id })

/**
 * regenerates secret by user's id
 * @param {number} id user id
 * @return {Promise<string>} secret
 */
module.exports.regenerateSecret = async (id) => {
  const secret = crypto.randomBytes(16).toString('hex')
  await knex('users').update({
    secret,
    oauth_temp: crypto.randomBytes(32),
  }).where({ id })
  return secret
}
