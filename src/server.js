require('dotenv').config()
const express = require('express')

const {
  createAccount,
  getUserBySecret,
  updateCodeVerifier,
} = require('./database')
const { sha256 } = require('./utils')
const { redirectUrl } = require('./vars')

const {
  getLichessUser,
  getLichessToken,
} = require('./api')
const amqp = require('amqplib')

// TODO move to variables
const queue = 'lichess-tg-queue'

const { CLIENT_ID } = process.env
const scope = ['challenge:write', 'board:play'].join(' ')

const app = express()

app.get('/login/:secret', async (req, res) => {
  const user = await getUserBySecret(req.params.secret)

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
  const user = await getUserBySecret(req.query.state)
  if (!user) {
    res.send('User was not found')
    return
  }
  const lichessToken = await getLichessToken(req.query.code, user.code_verifier.toString('base64url'))
  if (!lichessToken) {
    res.send('Failed to get token')
    return
  }
  const lichessUser = await getLichessUser(lichessToken)
  await updateCodeVerifier(user.id)
  const [account] = await createAccount(user.id, lichessToken, lichessUser)
  console.log(account)
  res.send('Success. Now you can now close this window and return to the bot!')
  req.app.channel.sendToQueue(queue, Buffer.from(JSON.stringify({
    type: 'subscribe',
    accountId: account,
  })))
})

amqp.connect('amqp://localhost').then(async (connection) => {
  const channel = await connection.createChannel()
  await channel.assertQueue(queue)
  app.channel = channel
  app.listen(3000)
})
