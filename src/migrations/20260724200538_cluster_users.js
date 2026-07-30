/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

const table_ = "cluster_users";

exports.up = async function (knex) {
    await knex.schema.createTable(table_, (table) => {

        table.increments("id").primary();

        table.integer("cluster_id")
            .references("id")
            .inTable("clusters")
            .onDelete("CASCADE");

        table.integer("user_id")
            .references("id")
            .inTable("users")
            .onDelete("CASCADE");

        table.enu(
            "role",
            ["owner", "admin", "member", "viewer"],
            {
                useNative: true,
                enumName: "role"
            }
        ).notNullable().defaultTo("member")

        table.timestamp("created_at")
            .defaultTo(knex.fn.now());

        table.unique(["cluster_id", "user_id"])
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

exports.down = async function (knex) {
    await knex.schema.dropTableIfExists(table_);
};