module.exports = {
  apps: [
    {
      name: 'lichess-tg-bot',
      script: 'src/main.js',
      watch: false,
      autorestart: true,
    },
    {
      name: 'lichess-tg-server',
      script: './src/server.js',
      watch: false,
      autorestart: true,
    },
  ],
}