const Telegraf = require('telegraf')
const chess = require('chess')
const fetch = require('node-fetch')
const ndjson = require('ndjson')
const { Markup } = require('telegraf')
require('dotenv').config()

let gameMoves = ''
let gameId

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

const squareToString = ({ file, rank }) => `${file}${rank}`

const getGame = moves => {
  const game = chess.createSimple()
  moves.split(' ').filter(Boolean).forEach(move => {
    game.move(move.substring(0, 2), move.substring(2, 4))
  })
  return game
}

/**
 * @param {chess.Square[]} board
 * @param {chess.ValidMove[]} moves
 * @param {string / null} selection
 */
const render = (board, moves, selection = null) => {
  const horizontal = 'hgfedcba'.split('').reverse()
  const vertical = Array.from({ length: 8 }, (item, idx) => idx + 1).reverse()
  let validMoves
  if (selection) {
    validMoves = moves.find(move => squareToString(move.src) === selection).squares
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
     * @type {Object}
     */
    const square = board
      .find(({ file, rank }) => file === col && rank === row)
    const isSquareTarget = validMoves && validMoves
      .find(move => squareToString(move) === squareToString(square))
    let data = 'none'
    if (
      !selection &&
      moves.find(move => squareToString(square) === squareToString(move.src))
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

bot.start(ctx => ctx.reply('Send me challenge id or /seek command (TODO)')) // TODO
bot.hears(/^[a-zA-Z\d]{4,}$/, ctx => fetch(`https://lichess.org/api/challenge/${ctx.message.text}/accept`, { headers, method: 'POST' }).catch(console.error))

bot.command('seek', () => {
  // fetch('https://lichess.org/api/board/seek', {
  //   headers,
  //   method: 'POST',
  //   body: new URLSearchParams({
  //     time: '30',
  //     increment: '20',
  //   }),
  // }).catch(console.error)
})

bot.action(/^select_(?<selection>[a-h][1-9])$/, ctx => {
  console.log('selected', ctx.match.groups.selection)
  const { board, validMoves } = getGame(gameMoves).getStatus()
  ctx.editMessageReplyMarkup(render(board.squares, validMoves, ctx.match.groups.selection))
  ctx.answerCbQuery()
})
bot.action(/^unselect$/, ctx => {
  const { board, validMoves } = getGame(gameMoves).getStatus()
  ctx.editMessageReplyMarkup(render(board.squares, validMoves))
  ctx.answerCbQuery()
})
bot.action(/^move_(?<move>(?:[a-h][1-9]){2})$/, ctx => {
  fetch(`https://lichess.org/api/board/game/${gameId}/move/${ctx.match.groups.move}`, { headers, method: 'POST' }).catch(console.error)
  ctx.answerCbQuery()
})

const main = async () => {
  await bot.launch()
  const stream = await fetch('https://lichess.org/api/stream/event', { headers })
    .then(response => response.body)
  stream.pipe(ndjson.parse()).on('data', async event => {
    if (event.type === 'gameStart') {
      gameId = event.game.id
      const msg = await bot.telegram.sendMessage(process.env.BOT_CHAT, `started game with id ${gameId}`)
      const gameStream = await fetch(`https://lichess.org/api/board/game/stream/${gameId}`, { headers })
        .then(response => response.body)
      gameStream.pipe(ndjson.parse()).on('data', gameEvent => {
        console.log(gameEvent)
        if (gameEvent.type === 'gameFull') {
          if (gameEvent.state) {
            gameMoves = gameEvent.state.moves
          }
          const { board, validMoves } = getGame(gameMoves).getStatus()
          bot.telegram.editMessageReplyMarkup(msg.chat.id, msg.message_id, null, render(board.squares, validMoves))
        }
        if (gameEvent.type === 'gameState') {
          gameMoves = gameEvent.moves
          const { board, validMoves } = getGame(gameMoves).getStatus()
          bot.telegram.editMessageReplyMarkup(msg.chat.id, msg.message_id, null, render(board.squares, validMoves))
        }
      })
    }
  })
}

main()
