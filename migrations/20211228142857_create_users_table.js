exports.up = async (knex) => {
  if (await knex.schema.hasTable('users')) {
    return
  }
  await knex.schema.createTable('users', (table) => {
    table.bigInteger('id').notNullable().primary()
    table.jsonb('tg_info').notNullable()
    table.string('secret', 32).nullable()
    table.binary('code_verifier', 32).nullable()
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable()
    table.timestamp('updated_at').nullable()
  })

  await knex.raw(`
    CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE PROCEDURE on_update();
  `)
}

exports.down = async (knex) =>
  await knex.schema.hasTable('users')
    ? knex.schema.dropTable('users')
    : null
