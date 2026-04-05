const table_name = "sessions"

exports.up = function (knex) {
    return knex.schema.createTable(table_name, function (table) {
        table.increments("id").primary();

        table
            .integer("user_id")
            .notNullable()
            .references("id")
            .inTable("users")
            .onDelete("CASCADE")
            .onUpdate("CASCADE");

        table.string("role").notNullable();
        table.text("session_token").notNullable().unique();

        // IP anonymized — only first 3 octets stored (e.g. 192.168.1.x)
        table.string("ip_subnet").nullable();

        table.string("device_type").nullable();
        table.string("browser_family").nullable();

        table.timestamp("login_time").defaultTo(knex.fn.now());
        table.timestamp("logout_time").nullable();

        // Derived behavioral features
        table.integer("actions_count").defaultTo(0);
        table.decimal("avg_latency_ms", 10, 2).nullable();
        table.decimal("session_duration_sec", 10, 2).nullable();

        table.timestamps(true, true);
    });
};

exports.down = function (knex) {
    return knex.schema.dropTableIfExists(table_name);
};
