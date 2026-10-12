/**
 * Bun entry point. `bun run src/index.ts` serves Hono directly, and
 * `export default app` still lets tests import the app without opening a port.
 */
import { env, poolerHost } from "./env"
import app from "./index"

export default {
  port: env.port,
  fetch: app.fetch,
}

console.log(
  `[smart-hotel] listening on http://localhost:${env.port} | pooler: ${poolerHost()} | gateway: ${env.gatewayMode}`
)
