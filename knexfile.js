require('dotenv').config()

const {
  DB_DATABASE,
  DB_PASSWORD,
  DB_USERNAME,
  DB_PORT,
  DB_HOST,
} = process.env

module.exports = {
  client: 'pg',
  connection: {
    host: DB_HOST,
    database: DB_DATABASE,
    port: DB_PORT,
    user: DB_USERNAME,
    password: DB_PASSWORD,
  },
  pool: {
    min: 1,
    max: 5,
  },
  migrations: {
    tableName: 'migrations',
  },
}
