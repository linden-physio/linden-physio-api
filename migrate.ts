import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

// Run every migration this database hasn't had yet, in order, in one transaction. (drizzle-kit migrate
// does the same, but when a migration fails it exits without showing Postgres's error.)
const db = drizzle("postgres://localhost/linden");
await migrate(db, { migrationsFolder: "migrations" });
await db.$client.end();
console.log("Migrations applied.");
