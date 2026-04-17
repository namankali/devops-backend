/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
const table_ = "messages"
exports.up = async function (knex) {
    await knex.schema.createTable(table_, (table) => {
        table.increments("id").primary();
        table.integer("conversation_id")
            .references("id")
            .inTable("conversations")
            .onDelete("CASCADE");

        table.enu("role", ["user", "assistant", "system"]).notNullable();

        table.string("content");

        table.enu("status", ["pending", "streaming", "completed"]).defaultTo("completed")

        table.timestamps(true);
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    await knex.schema.dropTableIfExists(table_)
};
