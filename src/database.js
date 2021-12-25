const knex = require('knex')(require('../knexfile'))

/**
 * Gets the user game by message.
 *
 * @param  {<type>} userId The user identifier
 * @param  {<type>} messageId The message identifier
 * @return {<type>} The user game by message.
 */
export const getUserGameByMessage = (userId, messageId) => knex
  .select('token', 'game_id', 'moves')
  .from('games')
  .where({ message_id: messageId, user_id: userId })
  .leftJoin('accounts', 'games.account_id', 'accounts.id')
  .first()

/**
 * Gets the user by secret.
 *
 * @param  {<type>} secret The secret
 * @return {<type>} The user by secret.
 */
export const getUserBySecret = (secret) => knex
  .select('oauth_temp')
  .from('users')
  .where({ secret })
  .first()
