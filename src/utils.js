/**
 * @typedef {import('chess')} Chess
 */
const { createHash, randomBytes } = require('crypto')
const fetch = require('node-fetch')
const chess = require('chess')
const { Piece } = require('chess/dist/piece')

/**
 * JSON fetch wrapper.
 *
 * @param {any} rest The rest of arguments
 * @return {Promise<any>} Async response
 */
module.exports.fetchJson = (...rest) => fetch(...rest)
  .then((res) => res.json())
  .catch(console.error)

/**
 * Body fetch wrapper.
 *
 * @param {any} rest The rest of arguments
 * @return {Promise<any>} Async response
 */
module.exports.fetchBody = (...rest) => fetch(...rest)
  .then((res) => res.body)
  .catch(console.error)

/**
 * Make a hash function.
 *
 * @param {Buffer|string} data The data to hash
 * @return {Buffer}
 */
module.exports.sha256 = (data) => createHash('sha256')
  .update(data)
  .digest()

/**
 * Generates new secret
 *
 * @param {number} [depth=16] The depth of randomness
 * @param {string} [format=''] The output format
 * @return {string|Buffer}
 */
module.exports.generateSecret = (depth = 16, format = '') => format
  ? randomBytes(depth).toString(format)
  : randomBytes(depth)

/**
 * Determines if your turn.
 *
 * @param {boolean} isWhite Indicates if white
 * @param {string} moves The moves
 * @return {boolean} `true` if your turn, `false` otherwise.
 */
module.exports.isYourTurn = (isWhite, moves) =>
  !(moves.split(' ').filter(Boolean).length % 2) === isWhite

/**
 * Creates chess game from lichess moves
 *
 * @param {string} moves
 * @return {Chess.SimpleGameClient} chess game
 */
module.exports.createGame = (moves) => {
  const game = chess.createSimple()
  game.on('promote', (...args) => console.log('promote', args))
  moves.split(' ').filter(Boolean).forEach((notation) => {
    const { move } = game.move(notation.substring(0, 2), notation.substring(2, 4))
    if (
      move.postSquare.piece.type === 'pawn' &&
      (move.postSquare.rank === 8 || move.postSquare.rank === 1)
    ) {
      game.game.board.promote(move.postSquare, Piece.createQueen(move.postSquare.piece.side))
    }
  })
  return game
}
