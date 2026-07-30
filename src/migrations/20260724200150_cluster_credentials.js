/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

const table_ = "cluster_credentials";

exports.up = async function (knex) {
    await knex.schema.createTable(table_, (table) => {

        table.increments("id").primary();

        table.integer("cluster_id")
            .references("id")
            .inTable("clusters")
            .onDelete("CASCADE");

        table.enu(
            "authentication_type",
            ["KUBECONFIG", "AWS_IAM", "SERVICE_ACCOUNT", "OIDC"],
            {
                useNative: true,
                enumName: "authentication_type"
            }
        ).notNullable().defaultTo("KUBECONFIG")

        table.text("kubeconfig");

        table.text("bearer_token");

        table.text("client_certificate");

        table.text("client_key");

        table.text("certificate_authority");

        table.timestamp("expires_at");

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