const Telegraf = require('telegraf')
const chess = require('chess')
const fetch = require('node-fetch')
const ndjson = require('ndjson')
const { Markup } = require('telegraf')
require('dotenv').config()

let gameId
let board = chess.createSimple().getStatus().board

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

const headers = {
  Authorization: 'Bearer ' + process.env.LICHESS_TOKEN,
}
const bot = new Telegraf(process.env.BOT_TOKEN)

const render = (board, selection) => {
  const horizontal = 'hgfedcba'.split('')
  const vertical = Array.from({ length: 8 }, (item, idx) => idx + 1).reverse()

  /**
   * Nested loops board generation.
   *
   * @type {Array}
   */
  let boardMarkup = vertical.map((row) => horizontal.map((col) => {
    /**
     * Find a pressed square.
     *
     * @type {Object}
     */
    const square = board
      .find(({ file, rank }) => file === col && rank === row)

    /**
     * If it is a piece.
     */
    if (square && square.piece) {
      const piece = emodji[square.piece.side.name][square.piece.type]

      return {
        text: `${square.move ? 'X' : ''}${piece}`,
        callback_data: selection ? `move_${selection}${col}${row}` : `select_${col}${row}`,
      }
    }

    /**
     * If it is an empty square.
     */
    return {
      text: square.move ? '·' : unescape('%u0020'),
      callback_data: selection ? `move_${selection}${col}${row}` : 'none',
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

bot.start(async ctx => {
  const stream = await fetch('https://lichess.org/api/stream/event', { headers })
    .then(response => response.body)
  stream.pipe(ndjson.parse()).on('data', async event => {
    if (event.type === 'gameStart') {
      gameId = event.game.id
      const msg = await ctx.reply(`started game with id ${gameId}`)
      const gameStream = await fetch(`https://lichess.org/api/board/game/stream/${gameId}`, { headers })
        .then(response => response.body)
      gameStream.pipe(ndjson.parse()).on('data', gameEvent => {
        if (gameEvent.type === 'gameFull') {
          console.log(gameEvent)
          bot.telegram.editMessageReplyMarkup(msg.chat.id, msg.message_id, null, render(board.squares, null))
        }
        if (gameEvent.type === 'gameState') {
          board = chess.createSimple().getStatus().board
          gameEvent.moves.split(' ').forEach(move => {
            board.move(move.substring(0, 2), move.substring(2, 4))
          })
          bot.telegram.editMessageReplyMarkup(msg.chat.id, msg.message_id, null, render(board.squares, null))
        }
      })
    }
  })
  fetch('https://lichess.org/api/board/seek', {
    headers,
    method: 'POST',
    body: new URLSearchParams({
      time: '30',
      increment: '20',
    }),
  }).catch(console.error)
})

bot.action(/select_(?<selection>[a-h][1-9])/, ctx => {
  ctx.editMessageReplyMarkup(render(board.squares, ctx.match.groups.selection))
  ctx.answerCbQuery()
})
bot.action(/^move_(?<move>(?:[a-h][1-9]){2})$/, ctx => {
  fetch(`https://lichess.org/api/board/game/${gameId}/move/${ctx.match.groups.move}`, { headers, method: 'POST' }).catch(console.error)
  ctx.answerCbQuery()
})

bot.launch()
