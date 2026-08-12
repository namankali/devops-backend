const table_ = "messages";

exports.up = async function (knex) {
    await knex.schema.alterTable(table_, (table) => {
        table.timestamp("created_at").defaultTo(knex.fn.now()).notNullable().alter();
        table.timestamp("updated_at").defaultTo(knex.fn.now()).notNullable().alter();
        table.enu("branch", ["development", "staging", "production"]).notNullable().defaultTo("development")
    });
};

exports.down = async function (knex) {
    await knex.schema.alterTable(table_, (table) => {
        table.timestamp("created_at").nullable().alter();
        table.timestamp("updated_at").nullable().alter();
        table.dropColumn("branch")
    });
    await knex.raw(`"DROP TYPE IF EXISTS "branch"`)
};