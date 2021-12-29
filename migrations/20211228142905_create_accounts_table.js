exports.up = async (knex) =>
  await knex.schema.hasTable('accounts')
    ? null
    : knex.schema.createTable('accounts', (table) => {
      table.increments('id')
      table.bigInteger('user_id').notNullable()
      table.string('lichess_id').notNullable()
      table.string('username').nullable()
      table.string('title').nullable()
      table.string('token').notNullable()
      table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable()
      table.timestamp('deleted_at').nullable()

      table.foreign('user_id', 'fk_accounts_user_id').references('id').inTable('users')
      // TODO add unique for user_id and lichess id
    })

exports.down = async (knex) =>
  await knex.schema.hasTable('accounts')
    ? knex.schema.dropTable('accounts')
    : null
