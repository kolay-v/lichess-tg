exports.up = async (knex) =>
  await knex.schema.hasTable('users')
    ? null
    : knex.schema.createTable('users', (table) => {
      table.bigInteger('id').notNullable().primary()
      table.jsonb('tg_info').notNullable()
      table.string('secret', 32).nullable()
      table.binary('oauth_temp', 32).nullable()
      table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable()
    })

exports.down = async (knex) =>
  await knex.schema.hasTable('users')
    ? knex.schema.dropTable('users')
    : null
