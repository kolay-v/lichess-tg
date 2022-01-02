/**
 * @typedef {import('chess')} Chess
 */
const { Markup } = require('telegraf-develop')

const { BOARD_IMAGE_URL } = process.env

/**
 * Converts chess square to string
 * @param {Chess.Square} square
 * @param {number} square.rank
 * @param {string} square.file
 * @return {string}{string}
 */
const squareToString = ({ file, rank }) => `${file}${rank}`

const getFen = (board) => {
  const fen = []
  const squares = board
    .reduce((acc, cur, idx) => {
      const outerIdx = Math.floor(idx / 8)
      acc[outerIdx] = acc[outerIdx] || []
      acc[outerIdx].push(cur)
      return acc
    }, [])
    .flatMap((row) => row.reverse())
    .reverse()

  for (let index = 0; index < squares.length; index += 1) {
    const square = squares[index]

    if (square.file === 'a' && square.rank < 8) {
      fen.push('/')
    }

    if (square.piece) {
      const transform = `to${square.piece.side.name === 'white' ? 'Upp' : 'Low'}erCase`
      fen.push((square.piece.notation || 'p')[transform]())
    } else {
      if (isNaN(Number(fen[fen.length - 1]))) {
        fen.push(1)
      } else {
        fen[fen.length - 1] += 1
      }
    }
  }

  return fen.join('')
}

const emodji = {
  white: {
    rook: '♜',
    knight: '♞',
    bishop: '♝',
    queen: '♛',
    king: '♚',
    pawn: '♙',
  },
  black: {
    rook: '♖',
    knight: '♘',
    bishop: '♗',
    queen: '♕',
    king: '♔',
    pawn: '♟',
  },
}

/**
 * @param {Chess.Square[]} board
 * @param {Chess.ValidMove[]} validMoves
 * @param {boolean} rotate
 * @param {string / null} selection
 */
const render = (board, validMoves, rotate, selection = null) => {
  const horizontal = 'abcdefgh'.split('')
  const vertical = Array.from({ length: 8 }, (item, idx) => idx + 1).reverse()
  let pieceMoves = []
  if (selection) {
    pieceMoves = validMoves.find((move) => squareToString(move.src) === selection).squares
  }

  /**
   * Nested loops board generation.
   *
   * @type {Array}
   */
  let boardMarkup = vertical.map((row) => horizontal.map((col) => {
    /**
     * Find a pressed square.
     *
     * @type {Chess.Square}
     */
    const square = board.find(({ file, rank }) => file === col && rank === row)
    const isSquareTarget = pieceMoves.find((move) => squareToString(move) === squareToString(square))
    let data = 'none'
    if (
      !selection &&
      validMoves.find((move) => squareToString(square) === squareToString(move.src))
    ) {
      data = `select_${squareToString(square)}`
    } if (selection) {
      if (isSquareTarget) {
        data = `move_${selection}${squareToString(square)}`
      } else {
        data = 'unselect'
      }
    }

    /**
     * If it is a piece.
     */
    if (square && square.piece) {
      const piece = emodji[square.piece.side.name][square.piece.type]

      return {
        text: `${isSquareTarget ? 'X' : ''}${piece}`,
        callback_data: data,
      }
    }

    /**
     * If it is an empty square.
     */
    return {
      text: isSquareTarget ? '·' : unescape('%u0020'),
      callback_data: data,
    }
  }))

  /**
   * Manage the rotation of a board.
   //  */
  if (rotate) {
    boardMarkup = boardMarkup.map((row) => row.reverse()).reverse()
  }

  /**
   * Attach additional buttons.
   */
  // if (actions) {
  //   boardMarkup.push(actions)
  // }
  const marks = pieceMoves.map(({ file, rank }) => `${file}${rank}`).join(',')
  const url = `
${BOARD_IMAGE_URL}
${getFen(board).replace(/\//g, '%2F')}.jpg?
${Object.entries({ rotate: Number(rotate), marks }).map((pair) => pair.join('=')).join('&')}
`.replaceAll('\n', '')

  return [
    { type: 'photo', media: url },
    Markup.inlineKeyboard(boardMarkup).extra(),
  ]
}

module.exports = render
