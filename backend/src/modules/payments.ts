import { Hono } from "hono"

import { PaymentMethod } from "../generated/prisma/client"
import { success } from "../lib/envelope"
import { parse, rules } from "../lib/validate"
import { createPaymentTransaction, findPayment } from "../services/booking"

const app = new Hono()

/**
 * POST /api/payments — Request-Reply, hotel to gateway.
 *
 * Body matches the proposal's example request: reservation_id, amount,
 * payment_method. The amount is accepted so the payload matches the document,
 * then checked against the stored reservation total. It is never used as the
 * charge, so a tampered request cannot change what the gateway is asked for.
 */
app.post("/", async (c) => {
  const body = parse(await c.req.json(), {
    reservation_id: rules.string({ min: 4, max: 32 }),
    amount: rules.integer(),
    payment_method: rules.literal(Object.values(PaymentMethod) as [PaymentMethod]),
  })

  const payment = await createPaymentTransaction(
    body.reservation_id,
    body.payment_method,
    body.amount
  )

  return c.json(
    success(payment, "Payment transaction created", 201).body,
    201 as never
  )
})

/** GET /api/payments/{payment_id} */
app.get("/:paymentId", async (c) => {
  const payment = await findPayment(c.req.param("paymentId"))
  return c.json(success(payment, "Payment status retrieved").body)
})

export default app
