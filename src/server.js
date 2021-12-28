require('dotenv').config()
const amqp = require('amqplib')
const express = require('express')

const { sha256 } = require('./utils')
const { redirectUrl } = require('./vars')

const {
  apiGetLichessUser,
  apiGetLichessToken,
} = require('./api')

const {
  dbCreateAccount,
  dbGetUserBySecret,
  dbUpdateCodeVerifier,
} = require('./database')

// TODO move to variables
const queue = 'lichess-tg-queue'

const { CLIENT_ID } = process.env
const scope = ['challenge:write', 'board:play'].join(' ')

const app = express()

app.get('/login/:secret', async (req, res) => {
  const user = await dbGetUserBySecret(req.params.secret)

  if (!user) {
    res.send('Invalid link.')
    return
  }

  res.redirect('https://lichess.org/oauth?' + new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: redirectUrl,
    scope,
    code_challenge_method: 'S256',
    code_challenge: sha256(user.code_verifier.toString('base64url'))
      .toString('base64url'),
    state: req.params.secret,
  }))
})

app.get('/callback', async (req, res) => {
  const user = await dbGetUserBySecret(req.query.state)
  if (!user) {
    res.send('User was not found')
    return
  }
  const lichessToken = await apiGetLichessToken(req.query.code, user.code_verifier.toString('base64url'))
  if (!lichessToken) {
    res.send('Failed to get token')
    return
  }
  const lichessUser = await apiGetLichessUser(lichessToken)
  await dbUpdateCodeVerifier(user.id)
  const [account] = await dbCreateAccount(user.id, lichessToken, lichessUser)
  console.log(account)
  res.send('Success. Now you can now close this window and return to the bot!')
  req.app.channel.sendToQueue(queue, Buffer.from(JSON.stringify({
    type: 'subscribe',
    accountId: account,
  })))
})

amqp.connect(process.env.RABBIT_URL).then(async (connection) => {
  const channel = await connection.createChannel()
  await channel.assertQueue(queue)
  app.channel = channel
  app.listen(3000)
})
