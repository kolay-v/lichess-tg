require('dotenv').config()
const express = require('express')
const crypto = require('crypto')

const {
  getUsersOAuthBySecret,
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

export const redirectUrl = `${URL}/chess`

const app = express()

app.get('/login/:secret', async (req, res) => {
  const user = await getUsersOAuthBySecret(req.params.secret)

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

app.get('/chess', async (req, res) => {
  const ip = req.header('x-forwarded-for')
  const user = await knex.select('id', 'oauth_temp').from('users')
    .where({ secret: req.query.state }).first()
  if (!user) {
    res.send('Authorization was success, but user was not found')
    return
  }
  const lichessToken = await getLichessToken(req.query.code, user.oauth_temp.toString('base64url'))
  if (!lichessToken.access_token) {
    res.send('Failed getting token')
    return
  }
  const lichessUser = await getLichessUser(lichessToken.access_token)
  const { email } = await getLichessEmail(lichessToken.access_token)
  await knex('users').update({ oauth_temp: crypto.randomBytes(32) })
  await knex('accounts').insert({
    user_id: user.id,
    token: lichessToken.access_token,
    email,
    ip,
    lichess_id: lichessUser.id,
    username: lichessUser.username,
    title: lichessUser.title,
  })
  res.send('Success. Now you can now close this window and return to the bot!')
})

app.listen(3000)
