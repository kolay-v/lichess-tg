const { Markup } = require('telegraf-develop')

const squareToString = ({ file, rank }) => `${file}${rank}`

const emodji = {
  black: {
    rook: '♜',
    knight: '♞',
    bishop: '♝',
    queen: '♛',
    king: '♚',
    pawn: '♟',
  },
  white: {
    rook: '♖',
    knight: '♘',
    bishop: '♗',
    queen: '♕',
    king: '♔',
    pawn: '♙',
  },
}

/**
 * @param {Chess.Square[]} board
 * @param {Chess.ValidMove[]} validMoves
 * @param {string / null} selection
 */
const render = (board, validMoves, selection = null) => {
  const horizontal = 'abcdefgh'.split('')
  const vertical = Array.from({ length: 8 }, (item, idx) => idx + 1).reverse()
  let pieceMoves = []
  if (selection) {
    pieceMoves = validMoves.find(move => squareToString(move.src) === selection).squares
  }

  /**
   * Nested loops board generation.
   *
   * @type {Array}
   */
  const boardMarkup = vertical.map((row) => horizontal.map((col) => {
    /**
     * Find a pressed square.
     *
     * @type {Object}
     */
    const square = board
      .find(({ file, rank }) => file === col && rank === row)
    const isSquareTarget = pieceMoves.find(move =>
      squareToString(move) === squareToString(square))
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
  // if (!isWhite) {
  //   boardMarkup = boardMarkup.map((row) => row.reverse()).reverse()
  // }

  /**
   * Attach additional buttons.
   */
  // if (actions) {
  //   boardMarkup.push(actions)
  // }

  /**
   * Returns an Extra object.
   */
  return Markup.inlineKeyboard(boardMarkup)
}

module.exports = render
