/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
const table_ = "ai_runs"
exports.up = async function (knex) {
    await knex.schema.createTable(table_, (table) => {
        table.increments("id").primary();
        table.integer("conversation_id")
            .references("id")
            .inTable("conversations")
            .onDelete("CASCADE");

        table.integer("user_id")
            .references("id")
            .inTable("users")
            .onDelete("CASCADE");

        table.integer("assistant_message_id")
            .references("id")
            .inTable("messages")
            .onDelete("CASCADE");

        table.string("model");
        table.string("provider").defaultTo("ollama");
        table.enu("status", ["pending", "running", "completed", "failed"]).defaultTo("pending")

        table.string("input").defaultTo("");
        table.string("output").defaultTo("");
        table.string("error").defaultTo("");

        table.integer("tokens_used")
        table.integer("latency_ms")


        table.timestamp("started_at").defaultTo(knex.fn.now());
        table.timestamp("completed_at")
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    await knex.schema.dropTableIfExists(table_)
};
