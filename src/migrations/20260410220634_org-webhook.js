/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
const table_ = "org-webhook"
exports.up = async function (knex) {
    await knex.schema.createTable(table_, (table) => {
        table.increments("id").primary();
        table.integer("github_account_id")
            .references("id")
            .inTable("github_accounts")
            .onDelete("CASCADE");

        table.string("org_login").notNullable();

        table.bigInteger("github_hook_id").notNullable();

        table.string("webhook_url").notNullable();

        table.boolean("is_active").defaultTo(true);

        table.timestamps(true, true);

        table.unique(["org_login", "github_hook_id"]);
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    await knex.schema.dropTableIfExists(table_)
};
