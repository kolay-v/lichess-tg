require('dotenv').config()
const { Telegraf, Markup } = require('telegraf-develop')
const fetch = require('node-fetch')

const render = require('./render')
const { createGame } = require('./utils')
const {
  createOrUpdateUser,
  getAccountByUserId,
  getUserGameByMessage,
  getSecretById,
  regenerateSecret,
} = require('./database')
const amqp = require('amqplib')

const bot = new Telegraf(process.env.BOT_TOKEN)

bot.on(['message', 'callback_query'], async (ctx, next) => {
  await createOrUpdateUser(ctx.from).catch(console.error)
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

bot.command('login', async ctx => {
  let secret = (await getSecretById(ctx.from.id))?.secret
  if (!secret) {
    secret = await regenerateSecret(ctx.from.id)
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
  const game = await getUserGameByMessage(ctx.from.id, ctx.callbackQuery.message.message_id)
  if (game === null) {
    return ctx.answerCbQuery('Game not found.')
  }
  const { board, validMoves } = createGame(game.moves).getStatus()
  await ctx.editMessageReplyMarkup(render(board.squares, validMoves, ctx.match.groups.selection))
  await ctx.answerCbQuery()
})
bot.action(/^unselect$/, async ctx => {
  const game = await getUserGameByMessage(ctx.from.id, ctx.callbackQuery.message.message_id)
  if (game === null) {
    return ctx.answerCbQuery('Game not found.')
  }
  const { board, validMoves } = createGame(game.moves).getStatus()
  await ctx.editMessageReplyMarkup(render(board.squares, validMoves))
  await ctx.answerCbQuery()
})
bot.action(/^move_(?<move>(?:[a-h][1-9]){2})$/, async ctx => {
  const game = await getUserGameByMessage(ctx.from.id, ctx.callbackQuery.message.message_id)
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

// TODO move to variables
const queue = 'lichess-tg-queue'

const main = async () => {
  await bot.telegram.getUpdates(1, 100, -1)
  await bot.launch()

  const connection = await amqp.connect(process.env.RABBIT_URL)
  const channel = await connection.createChannel()
  await channel.assertQueue(queue)
}

main()
