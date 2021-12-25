require('dotenv').config()
const { Telegraf, Markup } = require('telegraf-develop')
const chess = require('chess')
const crypto = require('crypto')
const fetch = require('node-fetch')
const ndjson = require('ndjson')
const render = require('./render')
const { isYourTurn } = require('./utils')
const {
  getAccountByUserId,
  getUserGameByMessage,
  createOrUpdateUser,
} = require('./database')

const bot = new Telegraf(process.env.BOT_TOKEN)

bot.on(['message', 'callback_query'], async (ctx, next) => {
  await createOrUpdateUser(ctx)
  return next()
})

const authorized = async (ctx, next) => {
  const account = await getAccountByUserId(ctx.from.id)
  if (!account) {
    return ctx.reply('First you need to /login')
  }
  ctx.account = account
  return next()
}

const getGame = moves => {
  const game = chess.createSimple()
  moves.split(' ').filter(Boolean).forEach(move => {
    game.move(move.substring(0, 2), move.substring(2, 4))
  })
  return game
}

bot.command('login', async ctx => {
  let { secret } = await knex.select('secret').from('users')
    .where({ id: ctx.from.id })
  if (!secret) {
    secret = crypto.randomBytes(16).toString('hex')
    await knex('users').update({
      secret,
      oauth_temp: crypto.randomBytes(32),
    }).where({ id: ctx.from.id })
  }
  ctx.reply('Click button bellow.', Markup.inlineKeyboard([
    Markup.urlButton('Login', `${process.env.URL}/login/${secret}`),
  ]).extra())
})
bot.start(ctx => ctx.reply('Hello. You should /login and then send me challenge id or /seek command'))
bot.hears(/^[a-zA-Z\d]{4,}$/, authorized, ctx => {
  fetch(`https://lichess.org/api/challenge/${ctx.message.text}/accept`, {
    headers: { Authorization: `Bearer ${ctx.account.token}` }, method: 'POST',
  })
})

bot.command('seek', authorized, ctx => {
  fetch('https://lichess.org/api/board/seek', {
    headers: { Authorization: `Bearer ${ctx.account.token}` },
    method: 'POST',
    body: new URLSearchParams({
      time: '10',
      increment: '5',
      rated: 'false',
    }),
  }).catch(console.error)
})

bot.action(/^select_(?<selection>[a-h][1-9])$/, async ctx => {
  const game = await getUserGameByMessage(ctx.from.id, ctx.message.message_id)
  if (game === null) {
    return ctx.answerCbQuery('Game not found.')
  }
  const { board, validMoves } = getGame(game.moves).getStatus()
  await ctx.editMessageReplyMarkup(render(board.squares, validMoves, ctx.match.groups.selection))
  await ctx.answerCbQuery()
})
bot.action(/^unselect$/, async ctx => {
  const game = await getUserGameByMessage(ctx.from.id, ctx.message.message_id)
  if (game === null) {
    return ctx.answerCbQuery('Game not found.')
  }
  const { board, validMoves } = getGame(game.moves).getStatus()
  await ctx.editMessageReplyMarkup(render(board.squares, validMoves))
  await ctx.answerCbQuery()
})
bot.action(/^move_(?<move>(?:[a-h][1-9]){2})$/, async ctx => {
  const game = await getUserGameByMessage(ctx.from.id, ctx.message.message_id)
  if (game === null) {
    return ctx.answerCbQuery('Game not found.')
  }
  const { token, game_id: gameId } = game
  fetch(`https://lichess.org/api/board/game/${gameId}/move/${ctx.match.groups.move}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  }).catch(console.error)
  await ctx.answerCbQuery()
})

bot.catch(error => console.error(error))

const stream = async (token, id, tgId, accountId) => {
  const stream = await fetch('https://lichess.org/api/stream/event', {
    headers: { Authorization: `Bearer ${token}` },
  }).then(response => response.body)
  stream.pipe(ndjson.parse()).on('data', async event => {
    if (event.type === 'gameStart') {
      const { id: gameId } = event.game
      let game = await knex.select('id', 'message_id', 'moves').from('games')
        .where({ game_id: gameId, account_id: accountId }).first()
      if (!game) {
        const { message_id } = await bot.telegram.sendMessage(tgId, `started game with id ${gameId}`)
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
      let isWhite = true
      gameStream.pipe(ndjson.parse()).on('data', async gameEvent => {
        console.log(gameEvent)
        if (gameEvent.type === 'gameFull') {
          isWhite = gameEvent.white.id === id
          let { moves } = game
          if (gameEvent.state) {
            moves = gameEvent.state.moves
            if (game.moves !== moves) {
              game.moves = moves
              await knex('games').update({ moves }).where({ id: game.id })
            }
          }
          const { board, validMoves } = getGame(moves).getStatus()
          bot.telegram.editMessageText(
            tgId,
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
          const { board, validMoves } = getGame(moves).getStatus()
          bot.telegram.editMessageReplyMarkup(
            tgId,
            game.message_id,
            null,
            render(board.squares, isYourTurn(isWhite, moves) ? validMoves : []),
          )
        }
        if (isYourTurn(isWhite, game.moves)) {
          bot.telegram.sendMessage(tgId, 'Your turn', { reply_to_message_id: game.message_id })
        }
      })
    }
  })
}

const main = async () => {
  await bot.telegram.getUpdates(2, 100, -1)
  await bot.launch()
  const accountsQuery = knex.select('id').from('accounts')
    .where({ user_id: knex.raw('users.id') }).limit(1)
    .orderBy('created_at', 'desc')
  const users = await knex.select('users.tg_id', 'token', 'lichess_id', 'accounts.id')
    .from('users')
    .joinRaw('join accounts on accounts.id = ?', [accountsQuery])
  users.forEach(({ tg_id, token, lichess_id, id }) =>
    stream(token, lichess_id, tg_id, id))
}

main()
