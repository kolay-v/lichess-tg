require('dotenv').config()
const express = require('express')

const {
  getUserBySecret,
  createAccount,
  updateOAuthTemp,
} = require('./database')

const {
  sha256,
} = require('./utils')

const {
  getLichessEmail,
  getLichessToken,
  getLichessUser,
} = require('./lichess-api')

const { URL, CLIENT_ID } = process.env
const scope = ['email:read', 'challenge:write', 'board:play'].join(' ')

const redirectUrl = `${URL}/callback`

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
    code_challenge: sha256(user.oauth_temp.toString('base64url'))
      .toString('base64url'),
    state: req.params.secret,
  }))
})

app.get('/callback', async (req, res) => {
  const ip = req.header('x-forwarded-for')
  const user = await getUserBySecret(req.query.state)
  if (!user) {
    res.send('User was not found')
    return
  }
  const lichessToken = await getLichessToken(req.query.code, user.oauth_temp.toString('base64url'))
  if (!lichessToken) {
    res.send('Failed to get token')
    return
  }
  const lichessUser = await getLichessUser(lichessToken)
  const { email } = await getLichessEmail(lichessToken)
  await updateOAuthTemp()
  await createAccount(user.id, lichessToken, email, ip, lichessUser)
  res.send('Success. Now you can now close this window and return to the bot!')
})

app.listen(3000)
module.exports = { redirectUrl }
