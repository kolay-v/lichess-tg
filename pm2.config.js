module.exports = {
  apps: [
    {
      name: 'lichess-tg-bot',
      script: 'src/ище.js',
      watch: false,
      autorestart: true,
    },
    {
      name: 'lichess-tg-server',
      script: 'src/server.js',
      watch: false,
      autorestart: true,
    },
  ],
}
