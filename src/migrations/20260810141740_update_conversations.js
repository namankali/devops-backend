const table_ = "conversations";

exports.up = async function (knex) {
    await knex.schema.alterTable(table_, (table) => {
        table.enu("branch", ["development", "staging", "production"]).notNullable().defaultTo("development")
    });
};

exports.down = async function (knex) {
    await knex.schema.alterTable(table_, (table) => {
        table.dropColumn("branch")
    });
    await knex.raw(`"DROP TYPE IF EXISTS "branch"`)
};