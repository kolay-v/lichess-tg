const { createHash } = require('crypto')
const fetch = require('node-fetch')

/**
 * Wrapper around fetch.
 *
 * @param {Array} rest The rest of arguments
 * @return {Promise<Response>} Async response
 */
export const fetcher = (...rest) => fetch(...rest)
  .then(res => res.json())
  .catch(console.error)

/**
 * Make a hash function.
 *
 * @param  {Buffer} buffer The buffer
 * @return {Buffer}
 */
export const sha256 = (buffer) => createHash('sha256')
  .update(buffer)
  .digest()

/**
 * Determines if your turn.
 *
 * @param  {boolean} isWhite Indicates if white
 * @param  {string}  moves The moves
 * @return {boolean} `true` if your turn, `false` otherwise.
 */
export const isYourTurn = (isWhite, moves) =>
  !(moves.split(' ').filter(Boolean).length % 2) === isWhite
