/**
 * Seeds room inventory.
 *
 * RM101 Deluxe 500000 and RM102 Suite 750000 come straight from the proposal's
 * `GET /api/rooms` example response. RM103 and RM104 are extra sample rows added
 * so the availability query has something to filter, and are not part of the
 * proposal. Replace the whole table with the hotel's real inventory.
 */
import { PrismaClient, Role, RoomStatus } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { env } from "../src/env"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const ROOMS = [
  { id: "RM101", number: "101", type: "Deluxe", pricePerNight: 500_000, fromProposal: true },
  { id: "RM102", number: "102", type: "Suite", pricePerNight: 750_000, fromProposal: true },
  { id: "RM103", number: "103", type: "Standard", pricePerNight: 350_000, fromProposal: false },
  { id: "RM104", number: "104", type: "Deluxe", pricePerNight: 500_000, fromProposal: false },
] as const

async function seedAdmin() {
  if (!env.adminEmail || !env.adminPassword) {
    console.log("[seed] ADMIN_EMAIL / ADMIN_PASSWORD not set, skipping admin account.")
    return
  }

  const account = await prisma.account.upsert({
    where: { email: env.adminEmail },
    create: {
      name: "Hotel Admin",
      email: env.adminEmail,
      phone: "0000000000",
      passwordHash: await Bun.password.hash(env.adminPassword, { algorithm: "argon2id" }),
      role: Role.ADMIN,
    },
    update: {
      // Re-seeding resets the password and re-arms the account, but bumps
      // tokenVersion so any admin session signed with the old password stops
      // working immediately.
      passwordHash: await Bun.password.hash(env.adminPassword, { algorithm: "argon2id" }),
      role: Role.ADMIN,
      tokenVersion: { increment: 1 },
    },
  })

  console.log(`[seed] admin ready: ${account.email} (role ADMIN).`)
}

async function main() {
  for (const room of ROOMS) {
    await prisma.room.upsert({
      where: { id: room.id },
      create: {
        id: room.id,
        number: room.number,
        type: room.type,
        pricePerNight: room.pricePerNight,
        status: RoomStatus.AVAILABLE,
      },
      update: {
        number: room.number,
        type: room.type,
        pricePerNight: room.pricePerNight,
      },
    })
  }

  console.log(`[seed] ${ROOMS.length} rooms ready (RM101 and RM102 from the proposal).`)

  await seedAdmin()
}

main()
  .catch((error: unknown) => {
    console.error("[seed] failed:", error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
