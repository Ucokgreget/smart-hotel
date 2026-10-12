import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"

import { Role } from "./generated/prisma/client"
import { env, poolerHost } from "./env"
import { attachAccount, requireAccount, requireRole } from "./middleware/auth"
import { onError } from "./middleware/error"
import adminRoutes from "./modules/admin"
import accountRoutes from "./modules/account"
import authRoutes from "./modules/auth"
import paymentCallbackRoutes from "./modules/payment-callback"
import paymentReconcileRoutes from "./modules/payment-reconcile"
import paymentRoutes from "./modules/payments"
import payRoutes from "./modules/pay"
import reservationRoutes from "./modules/reservations"
import roomRoutes from "./modules/rooms"
import { success } from "./lib/envelope"
import { initGateway } from "./services/gateway-registry"

export const app = new Hono()

app.use("*", logger())
app.use(
  "/api/*",
  cors({
    // The front end runs on its own dev server during development.
    origin: (origin) => (origin.startsWith("http://localhost") ? origin : null),
    allowHeaders: ["Content-Type", "Authorization", "X-Gateway-Signature"],
    credentials: true,
  })
)
app.onError(onError)

app.get("/health", (c) =>
  c.json(
    success(
      {
        status: "ok",
        database_pooler: poolerHost(),
        payment_gateway: env.gatewayMode,
      },
      "Service is running."
    ).body
  )
)

// attachAccount resolves a bearer token when present. The proposal does not
// require a session on the booking endpoints, so it never blocks a request on
// its own; each handler decides whether it needs one.
app.use("/api/*", attachAccount)

app.route("/api/auth", authRoutes)
// The signed-in account's own data. Any signed-in role may read its own rows.
app.use("/api/account/*", requireAccount)
app.route("/api/account", accountRoutes)
app.route("/api/rooms", roomRoutes)
app.route("/api/reservations", reservationRoutes)
app.route("/api/payments", paymentRoutes)
// The proposal keeps the callback on its own singular prefix:
// POST /api/payment/callback, next to GET /api/payments/{payment_id}.
app.route("/api/payment", paymentCallbackRoutes)
// Staff settling a QRIS payment by hand, because QRIS cannot push a callback.
// requireRole runs the role check itself, so it also serves as the
// authentication step for these two routes.
app.use("/api/payment/reconcile", requireRole(Role.ADMIN))
app.route("/api/payment", paymentReconcileRoutes)
// Staff views. Same gate: the ADMIN role only.
app.use("/api/admin/*", requireRole(Role.ADMIN))
app.route("/api/admin", adminRoutes)
// Guest facing payment page, public on purpose: reached without a session.
app.route("/pay", payRoutes)

app.notFound((c) =>
  c.json(
    {
      status: "error",
      message: "Endpoint tidak ditemukan.",
      error: { code: "NOT_FOUND" },
    },
    404
  )
)

// Selected here rather than at import time so a bad mode fails on boot with a
// clear message instead of on the first payment request.
initGateway(env.gatewayMode)

export default app
