import { Hono } from "hono"

import { prisma } from "../db"
import { success } from "../lib/envelope"
import { getGateway } from "../services/gateway-registry"
import { QrisGateway } from "../services/qris-gateway"

/**
 * GET /pay/{payment_id}
 *
 * The payment URL the guest opens. The dynamic QRIS is rebuilt here on every
 * request from the amount stored on the payment row, never from anything the
 * caller sends, so a guest cannot alter what they are asked to pay.
 *
 * Public on purpose: the guest needs it after scanning no QR yet. It exposes the
 * amount and a payment code and nothing about the guest.
 */
const app = new Hono()

app.get("/:paymentId", async (c) => {
  const paymentId = c.req.param("paymentId").trim().toUpperCase()

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      reservationId: true,
      amount: true,
      status: true,
      url: true,
      transaction: { select: { method: true } },
    },
  })

  if (!payment) {
    return c.json(
      {
        status: "error",
        message: "Pembayaran tidak ditemukan.",
        error: { code: "NOT_FOUND" },
      },
      404 as never
    )
  }

  const gateway = getGateway()
  // A QRIS code only exists in qris mode. In mock mode the pay screen still
  // answers, it just has no payload to show.
  const qris =
    gateway instanceof QrisGateway
      ? (() => {
          const payload = gateway.payloadFor(payment.amount)
          return { payload, ...gateway.merchantInfo() }
        })()
      : null

  return c.json(
    success(
      {
        payment_id: payment.id,
        reservation_id: payment.reservationId,
        amount: payment.amount,
        payment_method: payment.transaction.method,
        payment_status: payment.status,
        qris,
      },
      "Payment details retrieved"
    ).body
  )
})

export default app
