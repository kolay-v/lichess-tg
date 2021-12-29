exports.up = async (knex) =>
  await knex.schema.hasTable('games')
    ? null
    : knex.schema.createTable('games', (table) => {
      table.increments('id')
      table.integer('account_id').notNullable()
      table.string('game_id').notNullable()
      table.string('moves').nullable()
      table.integer('message_id').notNullable()
      table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable()

      table.foreign('account_id', 'fk_games_account_id').references('id').inTable('accounts')
    })

exports.down = async (knex) =>
  await knex.schema.hasTable('games')
    ? knex.schema.dropTable('games')
    : null
