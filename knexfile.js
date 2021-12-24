require('dotenv').config()

const {
  DB_CHARSET,
  DB_DATABASE,
  DB_PASSWORD,
  DB_USERNAME,
  DB_PORT,
  DB_HOST,
  DB_MIGRATIONS_TABLE,
} = process.env

module.exports = {
  client: 'pg',
  connection: {
    host: DB_HOST,
    database: DB_DATABASE,
    port: DB_PORT,
    user: DB_USERNAME,
    password: DB_PASSWORD,
    charset: DB_CHARSET,
  },
  pool: {
    min: 1,
    max: 5,
  },
  migrations: {
    tableName: DB_MIGRATIONS_TABLE,
  },
}
