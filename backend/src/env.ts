/**
 * Environment validation. Bun loads .env.local for us, so this only checks that
 * every required key actually arrived and fails fast with a readable message.
 */

const REQUIRED = [
  "DATABASE_URL",
  "DIRECT_URL",
  "JWT_SECRET",
  "PAYMENT_GATEWAY_MODE",
  "PAYMENT_GATEWAY_WEBHOOK_SECRET",
] as const

/**
 * Matches any unfilled `[YOUR-...]` marker, not a fixed list, so a newly added
 * key cannot slip through as a literal placeholder string.
 */
const PLACEHOLDER = /\[YOUR-[A-Z0-9-]+\]/

function read(key: (typeof REQUIRED)[number]): string {
  const value = process.env[key]?.trim()

  if (!value) {
    throw new Error(
      `Missing environment variable ${key}. Copy .env.example to .env.local and fill it in.`
    )
  }

  if (PLACEHOLDER.test(value)) {
    throw new Error(
      `${key} still contains a placeholder value. Replace it in .env.local before starting the server.`
    )
  }

  return value
}

/**
 * Read a key that is only needed for one gateway mode, so a mock run does not
 * require a real QRIS string.
 */
function readOptional(key: string): string | undefined {
  const value = process.env[key]?.trim()
  if (!value) return undefined
  if (PLACEHOLDER.test(value)) return undefined
  return value
}

export const env = {
  /** Transaction-mode pooler. Used by the running application. */
  databaseUrl: read("DATABASE_URL"),
  /** Session-mode pooler. Used by the Prisma CLI for migrations. */
  directUrl: read("DIRECT_URL"),
  jwtSecret: read("JWT_SECRET"),
  gatewayMode: read("PAYMENT_GATEWAY_MODE"),
  webhookSecret: read("PAYMENT_GATEWAY_WEBHOOK_SECRET"),
  port: Number(process.env.PORT ?? 3000),

  /** qris mode only. */
  qrisStaticCode: readOptional("QRIS_STATIC_CODE"),
  /** qris mode only. Origin the guest opens to pay. */
  publicBaseUrl: readOptional("PUBLIC_BASE_URL"),

  /**
   * Seed-only. prisma/seed.ts creates the first ADMIN from these. Registration
   * cannot make an admin, so this is the only way one comes into existence.
   */
  adminEmail: readOptional("ADMIN_EMAIL"),
  adminPassword: readOptional("ADMIN_PASSWORD"),
} as const

if (env.gatewayMode === "qris") {
  if (!env.qrisStaticCode) {
    throw new Error(
      "PAYMENT_GATEWAY_MODE is \"qris\" but QRIS_STATIC_CODE is missing or still a placeholder. " +
        "Put the hotel's static QRIS string in .env.local."
    )
  }
  if (!env.publicBaseUrl) {
    throw new Error(
      "PAYMENT_GATEWAY_MODE is \"qris\" but PUBLIC_BASE_URL is missing. " +
        "It is the origin guests open to view the QR code, for example http://localhost:3000."
    )
  }
}

/** Host of the pooler, used by the startup banner. Never logs credentials. */
export function poolerHost(): string {
  try {
    return new URL(env.databaseUrl).hostname
  } catch {
    return "unparseable"
  }
}
