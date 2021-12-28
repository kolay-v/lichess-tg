require('dotenv').config()
const { Telegraf, Markup } = require('telegraf-develop')

const render = require('./render')
const { acceptChallenge, seek, makeMove } = require('./api')
const { createGame } = require('./utils')
const {
  createOrUpdateUser,
  getAccountByUserId,
  getUserGameByMessage,
  getSecretById,
  dbRefreshSecret,
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

bot.command('login', async (ctx) => {
  let secret = (await getSecretById(ctx.from.id))?.secret
  if (!secret) {
    secret = await dbRefreshSecret(ctx.from.id)
  }
  ctx.reply('Click button bellow.', Markup.inlineKeyboard([
    Markup.urlButton('Login', `${process.env.URL}/login/${secret}`),
  ]).extra())
})

bot.start(async (ctx) => {
  ctx.reply('Hello. You should /login and then send me challenge id or /seek command')
})

bot.hears(/^[a-zA-Z\d]{4,}$/, authorized, async (ctx) => {
  const { ok } = await acceptChallenge(ctx.account.token, ctx.message.text) || { ok: false }
  if (ok) {
    await ctx.reply(`Challenge ${ctx.match[0]} accepted!`)
      .catch(console.error)
  }
})

bot.command('seek', authorized, async (ctx) => {
  seek(ctx.account.token)
})

bot.action(/^select_(?<selection>[a-h][1-8])$/, async (ctx) => {
  const game = await getUserGameByMessage(ctx.from.id, ctx.callbackQuery.message.message_id)
  if (game === null) {
    return ctx.answerCbQuery('Game not found.')
  }
  const { board, validMoves } = createGame(game.moves).getStatus()
  await ctx.editMessageReplyMarkup(render(board.squares, validMoves, ctx.match.groups.selection))
  await ctx.answerCbQuery()
})

bot.action(/^unselect$/, async (ctx) => {
  const game = await getUserGameByMessage(ctx.from.id, ctx.callbackQuery.message.message_id)
  if (game === null) {
    return ctx.answerCbQuery('Game not found.')
  }
  const { board, validMoves } = createGame(game.moves).getStatus()
  await ctx.editMessageReplyMarkup(render(board.squares, validMoves))
  return ctx.answerCbQuery()
})

bot.action(/^move_(?<move>(?:[a-h][1-8]){2})$/, async (ctx) => {
  const game = await getUserGameByMessage(ctx.from.id, ctx.callbackQuery.message.message_id)
  if (!game) {
    return ctx.answerCbQuery('Game not found.')
  }
  const { token, game_id: gameId } = game
  await makeMove(token, gameId, ctx.match.groups.move)
  return ctx.answerCbQuery()
})

bot.catch(error => console.error(error))

// TODO move to variables
const queue = 'lichess-tg-queue'

const main = async () => {
  const connection = await amqp.connect(process.env.RABBIT_URL)
  const channel = await connection.createChannel()
  await channel.assertQueue(queue)

  await bot.telegram.getUpdates(1, 100, -1)
  await bot.launch()
}

main()
