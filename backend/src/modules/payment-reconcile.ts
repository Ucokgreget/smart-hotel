import { Hono } from "hono"

import { success } from "../lib/envelope"
import { parseCallbackPayload } from "../services/payment-gateway"
import { applyPaymentCallback, findReservation } from "../services/booking"

const app = new Hono()

/**
 * POST /api/payment/reconcile
 *
 * Staff only. Guarded by requireAdmin at mount time.
 *
 * WHY THIS EXISTS: the proposal's Webhook/Callback pattern needs a party that
 * pushes a status change to the hotel. A static-to-dynamic QRIS converter cannot
 * do that. QRIS has no push and no webhook, so nothing automated will ever say
 * "this guest paid". In this deployment a staff member checks the hotel's own
 * QRIS settlement report or banking app and records the result here.
 *
 * Access is RBAC: the ADMIN role only, checked against the stored role at
 * requireRole in src/index.ts. An earlier version used a shared ADMIN_API_KEY
 * header instead, which was replaced because a shared secret cannot say who
 * settled a payment.
 *
 * The body takes exactly the fields a real gateway would post, and it reuses the
 * same applyPaymentCallback() transition, so confirming a QRIS payment and
 * receiving a webhook run identical code. When a real provider is added, delete
 * this route and POST /api/payment/callback and nothing else changes.
 */
app.post("/reconcile", async (c) => {
  const payload = parseCallbackPayload(await c.req.json())
  const result = await applyPaymentCallback(payload)
  const reservation = await findReservation(result.payment.reservationId)

  return c.json(
    success(
      {
        payment_id: result.payment.id,
        payment_status: result.payment.status,
        reservation_status: reservation.reservation_status,
      },
      result.alreadyProcessed
        ? "Payment status was already up to date"
        : "Payment status updated successfully"
    ).body
  )
})

export default app
