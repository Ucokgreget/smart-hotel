import "dotenv/config"
import { config } from "dotenv"
import { defineConfig, env } from "prisma/config"

// Bun loads .env.local automatically for the running server, but the Prisma CLI
// runs outside Bun and Prisma 7 no longer reads .env files by itself. Load both
// explicitly so migrations and the app always see the same values.
config({ path: ".env.local" })
config({ path: ".env" })

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // Bun runs the seed directly, no extra TypeScript loader needed.
    seed: "bun run prisma/seed.ts",
  },
  datasource: {
    // Migrations need a direct session, so the CLI gets the session-mode
    // pooler on port 5432. The application itself uses the transaction-mode
    // pooler from DATABASE_URL, which is configured in src/db.ts.
    url: env("DIRECT_URL"),
  },
})
