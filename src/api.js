const { fetcher } = require('./utils')
const { redirectUrl } = require('./server')

const { CLIENT_ID } = process.env

/**
 * Gets the lichess token.
 *
 * @param  {string} authCode The auth code from lichess
 * @param  {string} verifier base64url encoded verifier generated before oAuth
 * @return {Promise<string>} The lichess token.
 */
module.exports.getLichessToken = (authCode, verifier) => fetcher('https://lichess.org/api/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    grant_type: 'authorization_code',
    redirect_uri: redirectUrl,
    client_id: CLIENT_ID,
    code: authCode,
    code_verifier: verifier,
  }),
}).then(({ access_token }) => access_token)

/**
 * Gets the lichess user.
 *
 * @param  {string} token lichess auth token
 * @return {Promise<Object>} The lichess user.
 */
module.exports.getLichessUser = (token) => fetcher('https://lichess.org/api/account', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
})

/**
 * Gets the lichess email.
 *
 * @param  {string} token lichess auth token
 * @return {Promise<{ email: string }>} The lichess email.
 */
module.exports.getLichessEmail = (token) => fetcher('https://lichess.org/api/account/email', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
})
