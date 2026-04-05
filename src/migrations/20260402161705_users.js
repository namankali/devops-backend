export async function up(knex) {
  await knex.schema.createTable("users", (table) => {
    table.increments("id").primary();


    table.string("email").unique().notNullable()
    table.string("username").unique()

    table.text("password_hash").notNullable()
    table.boolean("is_email_verified").defaultTo(false)

    table.string("full_name")
    table.text("avatar_url")

    table.string("role").defaultTo("user")

    table.boolean("is_active").defaultTo(true)

    table.timestamp("created_at").defaultTo(knex.fn.now())
    table.timestamp("updated_at").defaultTo(knex.fn.now())
  })
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("users")
}