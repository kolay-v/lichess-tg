module.exports = {
  apps: [
    {
      name: 'lichess-tg-bot',
      script: 'src/bot.js',
      watch: false,
      autorestart: true,
    },
    {
      name: 'lichess-tg-server',
      script: 'src/server.js',
      watch: false,
      autorestart: true,
    },
    {
      name: 'lichess-tg-stream',
      script: 'src/stream.js',
      watch: false,
      autorestart: true,
    },
  ],
}
