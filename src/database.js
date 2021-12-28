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
 * @return {Promise<[number]>}
 */
module.exports.createAccount = (userId, lichessToken, lichessUser) =>
  knex('accounts').insert({
    user_id: userId,
    token: lichessToken,
    lichess_id: lichessUser.id,
    username: lichessUser.username,
    title: lichessUser.title,
  }).returning('id')

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
 * returns account by user's id
 * @param {number} id user id
 * @return {Promise<{
 * id: number,
 * username: string,
 * token: string,
 * } | null>} account if found
 */
module.exports.getAccountByUserId = (id) => knex.select('id', 'username', 'token')
  .from('accounts').where({ user_id: id })
  .orderBy('created_at', 'desc').limit(1).first()

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
    code_verifier: crypto.randomBytes(32),
  }).where({ id })
  return secret
}

/**
 * Finds game by gameId and accountId
 * @param {string} gameId lichess id
 * @param {number} accountId
 * @return {Promise<{ id: number, moves: string | null, message_id: number } | null>} game if found
 */
module.exports.findGame = (gameId, accountId) => knex.select('id', 'message_id', 'moves')
  .from('games')
  .where({ game_id: gameId, account_id: accountId }).first()

module.exports.createDBGame = async (gameId, accountId, messageId) => (await knex('games')
  .insert({
    game_id: gameId,
    account_id: accountId,
    message_id: messageId,
  }).returning('id'))[0]
