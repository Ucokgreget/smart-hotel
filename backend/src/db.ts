import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "./generated/prisma/client"
import { env } from "./env"

/**
 * One client for the whole process. Bun's dev runner reloads modules on change,
 * so the instance is cached on globalThis to avoid opening a new pool on every
 * reload.
 *
 * The adapter is given DATABASE_URL, the transaction-mode pooler. Migrations use
 * DIRECT_URL instead, configured separately in prisma.config.ts.
 */
const adapter = new PrismaPg({ connectionString: env.databaseUrl })

// SAFETY: globalThis has no `prisma` property, but Bun's dev runner preserves
// this object across module reloads. The cast only teaches TypeScript the shape
// we attach on the next line; the runtime value is whatever the reload kept.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
