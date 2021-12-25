const { randomBytes } = require('crypto')
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
 * @return {Promise<{ id: number, oauth_temp: Buffer } | null>} The user by secret.
 */
module.exports.getUserBySecret = (secret) => knex('users')
  .select('id', 'oauth_temp')
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
 * @param {string} email Email of the user
 * @param {Object} lichessUser Lichess user's data
 * @return {Promise<void>}
 */
module.exports.createAccount = (userId, lichessToken, email, lichessUser) => knex('accounts')
  .insert({
    user_id: userId,
    token: lichessToken,
    email,
    lichess_id: lichessUser.id,
    username: lichessUser.username,
    title: lichessUser.title,
  })

/**
 * Updates users temp oauth token
 *
 * @param {id} userId The user identifier
 * @return {<type>} { description_of_the_return_value }
 */
module.exports.updateOAuthTemp = (id) => knex('users')
  .update({ oauth_temp: randomBytes(32) })
  .where({ id })
