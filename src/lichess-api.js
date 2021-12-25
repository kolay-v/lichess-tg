const { fetcher } = require('./utils')
const { redirectUrl } = require('./lichess-api')

const { CLIENT_ID } = process.env

/**
 * Gets the lichess token.
 *
 * @param  {string} authCode The auth code from lichess
 * @param  {string} verifier base64url encoded verifier generated before oAuth
 * @return {@todo:<type>} The lichess token.
 */
export const getLichessToken = (authCode, verifier) => fetcher('https://lichess.org/api/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    grant_type: 'authorization_code',
    redirect_uri: redirectUrl,
    client_id: CLIENT_ID,
    code: authCode,
    code_verifier: verifier,
  }),
})

/**
 * Gets the lichess user.
 *
 * @param  {string} token lichess auth token
 * @return {@todo:<type>} The lichess user.
 */
export const getLichessUser = (token) => fetcher('https://lichess.org/api/account', {
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
export const getLichessEmail = (token) => fetcher('https://lichess.org/api/account/email', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
})
