/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
const table_ = "conversations"
exports.up = async function (knex) {
    await knex.schema.createTable(table_, (table) => {
        table.increments("id").primary();
        table.integer("user_id")
            .references("id")
            .inTable("users")
            .onDelete("CASCADE");

        table.string("title");

        table.timestamps(true, true);
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    await knex.schema.dropTableIfExists(table_)
};
