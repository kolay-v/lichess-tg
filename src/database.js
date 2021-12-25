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
 * @return {Promise<{ oauth_temp: Buffer } | null>} The user by secret.
 */
module.exports.getUsersOAuthBySecret = (secret) => knex
  .select('oauth_temp')
  .from('users')
  .where({ secret })
  .first()

/**
 * Creates or updates user by content
 *
 * @param  {TelegrafContext} ctx The secret
 * @return {Promise<void>} The user by secret.
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
