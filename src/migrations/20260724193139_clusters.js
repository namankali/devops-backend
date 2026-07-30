/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

const table_ = "clusters";

exports.up = async function (knex) {
    await knex.schema.createTable(table_, (table) => {

        table.increments("id").primary();

        table.integer("user_id")
            .references("id")
            .inTable("users")
            .onDelete("CASCADE");

        table.string("name").notNullable();

        table.string("display_name").notNullable();

        table.enu(
            "provider",
            ["LOCAL", "AWS_EC2_K3S", "AWS_EKS", "AZURE_AKS", "GCP_GKS"],
            {
                useNative: true,
                enumName: "provider"
            }
        ).notNullable().defaultTo("LOCAL");

        table.enu(
            "environment",
            ["DEVELOPMENT", "STAGING", "PRODUCTION"],
            {
                useNative: true,
                enumName: "environment"
            }
        ).notNullable().defaultTo("DEVELOPMENT");

        table.text("api_server").notNullable();

        table.string("kubernetes_version");

        table.string("status")
            .defaultTo("CONNECTED");

        table.boolean("is_default")
            .defaultTo(false);

        table.timestamp("created_at")
            .defaultTo(knex.fn.now());

        table.timestamp("updated_at")
            .defaultTo(knex.fn.now());
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

exports.down = async function (knex) {
    await knex.schema.dropTableIfExists(table_);
};