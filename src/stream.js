require('dotenv').config()
const amqp = require('amqplib')
const fetch = require('node-fetch')
const ndjson = require('ndjson')
const { createGame, isYourTurn } = require('./utils')
const render = require('./render')
const { Telegraf } = require('telegraf-develop')
const knex = require('knex')(require('../knexfile'))

const bot = new Telegraf(process.env.BOT_TOKEN)

const streams = new Map()

const stream = async (accountId) => {
  const { token, id, lichessId } = knex.select('token', 'lichess_id as lichessId', 'user_id as id')
    .from('accounts').where({ id: accountId })
  const stream = await fetch('https://lichess.org/api/stream/event', {
    headers: { Authorization: `Bearer ${token}` },
  }).then(response => response.body)
  streams.set(accountId, [...(streams.get(accountId) || []), stream])
  stream.pipe(ndjson.parse()).on('data', async event => {
    if (event.type === 'gameStart') {
      const { id: gameId } = event.game
      let game = await knex.select('id', 'message_id', 'moves').from('games')
        .where({ game_id: gameId, account_id: accountId }).first()
      if (!game) {
        const { message_id } = await bot.telegram.sendMessage(id, `started game with id ${gameId}`)
        const [gameRaw] = await knex('games').insert({
          game_id: gameId,
          account_id: accountId,
          message_id,
        }).returning('id')
        game = { id: gameRaw.id, moves: '', message_id }
      }
      const gameStream = await fetch(`https://lichess.org/api/board/game/stream/${gameId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(response => response.body)
      streams.set(accountId, [...(streams.get(accountId) || []), gameStream])
      let isWhite = true
      gameStream.pipe(ndjson.parse()).on('data', async gameEvent => {
        console.log(gameEvent)
        if (gameEvent.type === 'gameFull') {
          isWhite = gameEvent.white.id === lichessId
          let { moves } = game
          if (gameEvent.state) {
            moves = gameEvent.state.moves
            if (game.moves !== moves) {
              game.moves = moves
              await knex('games').update({ moves }).where({ id: game.id })
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
          await knex('games').update({ moves }).where({ id: game.id })
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
    }
  })
}

// TODO move to variables
const queue = 'lichess-tg-queue'

const main = async () => {
  const connection = await amqp.connect('ampq://localhost')
  const channel = await connection.createChannel()
  await channel.assertQueue(queue)
  await channel.consume(queue, (msg) => {
    if (msg === null) {
      return
    }
    const data = JSON.parse(msg.content.toString())
    if (data.type === 'subscribe') {
      stream(data.accountId)
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
