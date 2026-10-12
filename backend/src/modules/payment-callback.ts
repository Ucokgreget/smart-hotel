import { Hono } from "hono"

import { badRequest, unauthorized } from "../lib/errors"
import { success } from "../lib/envelope"
import { applyPaymentCallback, findReservation } from "../services/booking"
import { parseCallbackPayload } from "../services/payment-gateway"
import { getGateway } from "../services/gateway-registry"

/**
 * Mounted at /api/payment, not /api/payments.
 *
 * The proposal deliberately uses two prefixes: callback goes to
 * `POST /api/payment/callback` while reads go to
 * `GET /api/payments/{payment_id}`. Keeping them apart mirrors that.
 */
const app = new Hono()

/**
 * POST /api/payment/callback — Webhook/Callback, gateway to hotel.
 *
 * The signature is checked against the raw body, so the body is read as text
 * and parsed here rather than through c.req.json(), which would re-serialise it
 * and change the bytes the signature was computed over.
 */
app.post("/callback", async (c) => {
  const raw = await c.req.text()

  if (!getGateway().verifySignature(raw, c.req.header("X-Gateway-Signature"))) {
    throw unauthorized("Signature callback tidak valid.")
  }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(raw)
  } catch {
    throw badRequest("Callback body bukan JSON yang valid.")
  }

  const result = await applyPaymentCallback(parseCallbackPayload(parsedJson))
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
