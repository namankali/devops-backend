const table_ = "cluster_credentials";

exports.up = async function (knex) {
    await knex.schema.alterTable(table_, (table) => {
        table.text("service_account_name");
        table.string("namespace");
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {

};
