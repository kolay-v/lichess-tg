/**
 * @typedef {import('telegraf-develop/typings/telegram-types').User} User
 */
const knex = require('knex')(require('../knexfile'))

const { generateSecret } = require('./utils')

/**
 * Gets the user game by message.
 *
 * @param {number} userId The user identifier
 * @param {number} messageId The message identifier
 * @return {Promise<{
 *   token: string,
 *   game_id: number,
 *   moves: string,
 *   is_white: boolean,
 * } | null>} The user game by message.
 */
module.exports.dbGetUserGameByMessage = (userId, messageId) => knex('games')
  .select('token', 'game_id', 'moves', 'is_white')
  .where({ message_id: messageId, user_id: userId })
  .leftJoin('accounts', 'games.account_id', 'accounts.id')
  .first()

/**
 * Gets the user by secret.
 *
 * @param {string} secret The secret
 * @return {Promise<{ id: number, code_verifier: Buffer } | null>} The user by secret.
 */
module.exports.dbGetUserBySecret = (secret) => knex('users')
  .select('id', 'code_verifier')
  .where({ secret })
  .first()

/**
 * Creates or updates user by content.
 *
 * @param {User} Telegram user from context
 * @return {Promise<void>}
 */
module.exports.dbCreateOrUpdateUser = ({ id, first_name, username, last_name, language_code }) => knex('users')
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
 * Creates account after oAuth.
 *
 * @param {number} userId The user id
 * @param {string} lichessToken Token from lichess
 * @param {Object} lichessUser Lichess user's data
 * @return {Promise<[number]>}
 */
module.exports.dbCreateAccount = (userId, lichessToken, lichessUser) => knex('accounts')
  .insert({
    user_id: userId,
    token: lichessToken,
    lichess_id: lichessUser.id,
    username: lichessUser.username,
    title: lichessUser.title,
  })
  .returning('id')

/**
 * Updates users temp oauth token.
 *
 * @param {number} id The user identifier
 * @return {Promise<void>}
 */
module.exports.dbUpdateCodeVerifier = (id) => knex('users')
  .update({ code_verifier: generateSecret(32) })
  .where({ id })

/**
 * Gets account by user id.
 *
 * @param {number} id The user id
 * @return {Promise<Object|null>}
 */
module.exports.dbGetAccountByUserId = (id) => knex('accounts')
  .select('id', 'username', 'token')
  .where({ user_id: id })
  .orderBy('created_at', 'desc').limit(1).first()

/**
 * Gets the secret by user id.
 *
 * @param {number} id The user id
 * @return {Promise<Object>}
 */
module.exports.dbGetSecretById = (id) => knex('users')
  .select('secret')
  .where({ id })

/**
 * Regenerates secret by user's id
 *
 * @param {number} id The user id
 * @return {Promise<string>}
 */
module.exports.dbRefreshSecret = async (id) => {
  const secret = generateSecret(16, 'hex')
  await knex('users')
    .update({ secret, code_verifier: generateSecret(32) })
    .where({ id })
  return secret
}

/**
 * Finds game by gameId and accountId
 *
 * @param {string} gameId lichess id
 * @param {number} accountId
 * @return {Promise<{
 *   id: number,
 *   moves: string | null,
 *   message_id: number,
 * } | null>} game if found
 */
module.exports.dbFindGame = (gameId, accountId) => knex('games')
  .select('id', 'message_id', 'moves')
  .where({ game_id: gameId, account_id: accountId })
  .first()

/**
 * Creates a db game.
 *
 * @param {string} gameId The game identifier
 * @param {number} accountId The account identifier
 * @param {number} messageId The message identifier
 * @return {Promise<number>}
 */
module.exports.dbCreateGame = async (gameId, accountId, messageId) => (await knex('games')
  .insert({
    game_id: gameId,
    account_id: accountId,
    message_id: messageId,
  })
  .returning('id'))[0]

/**
 * Gets accounts by id.
 *
 * @param {number} id The identifier
 * @return {Promise}
 */
module.exports.dbGetAccountById = (id) => knex('accounts')
  .select('token', 'lichess_id as lichessId', 'user_id as id')
  .where({ id })
  .first()

/**
 * Updates the game in DB.
 *
 * @param {id} id The identifier of the game.
 * @param {string} moves The moves separaded by a space
 * @param {boolean} isWhite Is user's colour white
 * @return {Promise}
 */
module.exports.dbUpdateGame = (id, moves, isWhite) => knex('games')
  .update({ moves, is_white: isWhite })
  .where({ id })
