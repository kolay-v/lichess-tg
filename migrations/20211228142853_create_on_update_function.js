exports.up = (knex) => knex.raw(`
CREATE OR REPLACE FUNCTION on_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
`)

exports.down = (knex) =>
  knex.raw('DROP FUNCTION IF EXISTS on_update')
