/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
const table_ = "tool_calls"
exports.up = async function (knex) {
    await knex.schema.createTable(table_, (table) => {
        table.increments("id").primary();
        table.integer("ai_run_id")
            .references("id")
            .inTable("ai_runs")
            .onDelete("CASCADE");

        table.string("tool_name");

        table.jsonb("input")
        table.jsonb("output")

        table.string("status")

        table.timestamp("created_at").defaultTo(knex.fn.now());
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    await knex.schema.dropTableIfExists(table_)
};
