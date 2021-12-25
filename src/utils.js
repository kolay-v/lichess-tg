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
 * @param  {<type>} buffer The buffer
 * @return {<type>} { description_of_the_return_value }
 */
export const sha256 = (buffer) => createHash('sha256')
  .update(buffer)
  .digest()
