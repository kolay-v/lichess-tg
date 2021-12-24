require('dotenv').config()
const express = require('express')
const crypto = require('crypto')
const fetch = require('node-fetch')
const knex = require('knex')(require('../knexfile'))

const { URL, CLIENT_ID } = process.env

const sha256 = buffer => crypto.createHash('sha256').update(buffer).digest()

const scope = ['email:read', 'challenge:write', 'board:play'].join(' ')

const redirectUrl = `${URL}/chess`

const app = express()

const getLichessToken = (authCode, verifier) => fetch('https://lichess.org/api/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    grant_type: 'authorization_code',
    redirect_uri: redirectUrl,
    client_id: CLIENT_ID,
    code: authCode,
    code_verifier: verifier,
  }),
}).then(res => res.json())

const getLichessUser = accessToken => fetch('https://lichess.org/api/account', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
}).then(res => res.json())

const getLichessEmail = accessToken => fetch('https://lichess.org/api/account/email', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
}).then(res => res.json())

app.get('/login/:secret', async (req, res) => {
  const { secret } = req.params
  const user = await knex.select('oauth_temp').from('users')
    .where({ secret }).first()
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
    state: secret,
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
