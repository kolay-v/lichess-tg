const crypto = require('crypto')
const knex = require('knex')(require('../knexfile'))

/**
 * Gets the user game by message.
 *
 * @param  {number} userId The user identifier
 * @param  {number} messageId The message identifier
 * @return {Promise<{ token: string, game_id: number, moves: string } | null>} The user game by message.
 */
module.exports.getUserGameByMessage = (userId, messageId) => knex
  .select('token', 'game_id', 'moves')
  .from('games')
  .where({ message_id: messageId, user_id: userId })
  .leftJoin('accounts', 'games.account_id', 'accounts.id')
  .first()

/**
 * Gets the user by secret.
 *
 * @param  {string} secret The secret
 * @return {Promise<{ id: number, oauth_temp: Buffer } | null>} The user by secret.
 */
module.exports.getUserBySecret = (secret) => knex
  .select('id', 'oauth_temp')
  .from('users')
  .where({ secret })
  .first()

/**
 * Creates or updates user by content
 *
 * @param  {TelegrafContext} ctx The secret
 * @return {Promise<void>}
 */
module.exports.createOrUpdateUser = ctx => knex('users').insert({
  id: ctx.from.id,
  tg_info: JSON.stringify({
    firstName: ctx.from.first_name,
    username: ctx.from.username,
    lastName: ctx.from.last_name,
    languageCode: ctx.from.language_code,
  }),
}).onConflict('tg_id').merge()

/**
 * Creates account after oAuth
 *
 * @param  {number} userId The user id
 * @param  {string} lichessToken Token from lichess
 * @param  {string} ip Ip address of login
 * @param  {string} email Email of the user
 * @param  {Object} lichessUser Lichess user's data
 * @return {Promise<void>}
 */
module.exports.createAccount = (userId, lichessToken, ip, email, lichessUser) => knex('accounts').insert({
  user_id: userId,
  token: lichessToken,
  email,
  ip,
  lichess_id: lichessUser.id,
  username: lichessUser.username,
  title: lichessUser.title,
})

module.exports.updateOAuthTemp = (userId) => knex('users')
  .update({ oauth_temp: crypto.randomBytes(32) })
  .where({ id: userId })
