const { createHash } = require('crypto')
const fetch = require('node-fetch')

/**
 * Wrapper around fetch.
 *
 * @param {any} rest The rest of arguments
 * @return {Promise<any>} Async response
 */
module.exports.fetcher = (...rest) => fetch(...rest)
  .then(res => res.json())
  .catch(console.error)

/**
 * Make a hash function.
 *
 * @param  {Buffer | string} data The data to hash
 * @return {Buffer}
 */
module.exports.sha256 = (data) => createHash('sha256')
  .update(data)
  .digest()

/**
 * Determines if your turn.
 *
 * @param  {boolean} isWhite Indicates if white
 * @param  {string}  moves The moves
 * @return {boolean} `true` if your turn, `false` otherwise.
 */
module.exports.isYourTurn = (isWhite, moves) =>
  !(moves.split(' ').filter(Boolean).length % 2) === isWhite
