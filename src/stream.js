require('dotenv').config()
const amqp = require('amqplib')
const ndjson = require('ndjson')
const { Telegraf } = require('telegraf-develop')

const render = require('./render')

const {
  createGame,
  isYourTurn,
} = require('./utils')

const {
  dbFindGame,
  dbCreateGame,
  dbUpdateGame,
  dbGetAccountById,
} = require('./database')

const {
  apiGetGameStream,
  apiGetMainStream,
} = require('./api')

const bot = new Telegraf(process.env.BOT_TOKEN)

const streams = new Map()

const stream = async (accountId) => {
  console.log('subscribed to ', accountId)
  const { token, id, lichessId } = await dbGetAccountById(accountId)
  const stream = await apiGetMainStream(token)
  streams.set(accountId, [...(streams.get(accountId) || []), stream])
  stream.pipe(ndjson.parse()).on('data', async (event) => {
    if (event.type !== 'gameStart') {
      return
    }
    const { id: gameId } = event.game
    let game = await dbFindGame(gameId, accountId)
    if (!game) {
      const { message_id } = await bot.telegram.sendMessage(id, `started game with id ${gameId}`)
      game = { id: await dbCreateGame(gameId, accountId, message_id), moves: null, message_id }
    }
    const gameStream = await apiGetGameStream(token, gameId)
    streams.set(accountId, [...(streams.get(accountId) || []), gameStream])
    let isWhite = true
    gameStream.pipe(ndjson.parse()).on('data', async (gameEvent) => {
      console.log(gameEvent)
      if (gameEvent.type === 'gameFull') {
        isWhite = gameEvent.white.id === lichessId
        let { moves } = game
        if (gameEvent.state) {
          moves = gameEvent.state.moves
          if (game.moves !== moves) {
            game.moves = moves
            await dbUpdateGame(game.id, moves)
          }
        }
        const { board, validMoves } = createGame(moves).getStatus()
        bot.telegram.editMessageText(
          id,
          game.message_id,
          null,
          `White ${gameEvent.white.name} (${gameEvent.white.rating})

Black ${gameEvent.black.name} (${gameEvent.black.rating})`,
          render(board.squares, isYourTurn(isWhite, moves) ? validMoves : []).extra(),
        )
      }
      if (gameEvent.type === 'gameState') {
        const { moves } = gameEvent
        if (moves === game.moves) {
          return
        }
        game.moves = moves
        await dbUpdateGame(game.id, moves)
        const { board, validMoves } = createGame(moves).getStatus()
        bot.telegram.editMessageReplyMarkup(
          id,
          game.message_id,
          null,
          render(board.squares, isYourTurn(isWhite, moves) ? validMoves : []),
        )
      }
      if (isYourTurn(isWhite, game.moves)) {
        bot.telegram.sendMessage(id, 'Your turn', { reply_to_message_id: game.message_id })
      }
    })
  })
}

// TODO move to variables
const queue = 'lichess-tg-queue'

const main = async () => {
  const connection = await amqp.connect(process.env.RABBIT_URL)
  const channel = await connection.createChannel()
  await channel.assertQueue(queue)
  await channel.consume(queue, (msg) => {
    if (msg === null) {
      return
    }
    const data = JSON.parse(msg.content.toString())
    if (data.type === 'subscribe') {
      stream(data.accountId).catch(console.error)
    } else if (data.type === 'unsubscribe') {
      const activeStreams = streams.get(data.accountId)
      if (activeStreams) {
        activeStreams.forEach((stream) => stream.destroy())
        streams.delete(data.accountId)
      }
    }
    channel.ack(msg)
  })
}

main()
