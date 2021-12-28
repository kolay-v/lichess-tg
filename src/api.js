const fetch = require('node-fetch')

const { fetchJson, fetchBody } = require('./utils')
const { redirectUrl } = require('./vars')

const { CLIENT_ID } = process.env

/**
 * Gets the lichess token.
 *
 * @param  {string} authCode The auth code from lichess
 * @param  {string} verifier base64url encoded verifier generated before oAuth
 * @return {Promise<string>} The lichess token.
 */
module.exports.apiGetLichessToken = (authCode, verifier) => fetchJson(
  'https://lichess.org/api/token',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      redirect_uri: redirectUrl,
      client_id: CLIENT_ID,
      code: authCode,
      code_verifier: verifier,
    }),
  },
)
  .then(({ access_token }) => access_token)
  .catch(console.error)

/**
 * Gets the lichess user.
 *
 * @param  {string} token lichess auth token
 * @return {Promise<Object>} The lichess user.
 */
module.exports.apiGetLichessUser = (token) => fetchJson(
  'https://lichess.org/api/account',
  {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  },
)

/**
 * Accepts the challenge.
 *
 * @param {string} token The auth token
 * @param {string} id The challenge id
 * @return {Promise<Object>}
 */
module.exports.apiAcceptChallenge = (token, id) => fetchJson(
  `https://lichess.org/api/challenge/${id}/accept`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  },
).catch(console.error)

/**
 * Seeks for a pair.
 *
 * @param {string} token The token
 * @return {Promise<void>}
 */
module.exports.apiSeek = (token) => fetch(
  'https://lichess.org/api/board/seek',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: new URLSearchParams({
      time: '10',
      increment: '5',
      rated: 'false',
    }),
  },
).catch(console.error)

/**
 * Makes a move.
 *
 * @param {string} token The token
 * @param {string} gameId The game identifier
 * @param {string} move The move to play, in UCI format (ex: e2e4)
 * @return {Promise<Object>} { ok }
 */
module.exports.apiMakeMove = (token, gameId, move) => fetchJson(
  `https://lichess.org/api/board/game/${gameId}/move/${move}`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  },
).catch(console.error)

/**
 * Get the main stream for the account.
 *
 * @param {string} token The token
 * @return {Promise}
 */
module.exports.apiGetMainStream = (token) => fetchBody(
  'https://lichess.org/api/stream/event',
  {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  },
)

/**
 * Get the stream for the game.
 *
 * @param {string} token The token
 * @param {number} gameId The game id
 * @return {Promise}
 */
module.exports.apiGetGameStream = (token, gameId) => fetchBody(
  `https://lichess.org/api/board/game/stream/${gameId}`,
  {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  },
)
