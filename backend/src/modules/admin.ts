import { Hono } from "hono"

import { prisma } from "../db"
import { PaymentStatus } from "../generated/prisma/client"
import { success } from "../lib/envelope"
import { parse, rules } from "../lib/validate"

const app = new Hono()

/**
 * Staff views. Scope is deliberately one job: settle payments and read
 * reservations. Room management and check-in actions are not here, because the
 * system has no such feature yet and the proposal never asks for one.
 */
app.get("/payments", async (c) => {
  const query = parse(
    {
      status: c.req.query("status") ?? "PENDING",
    },
    { status: rules.literal(Object.values(PaymentStatus) as [PaymentStatus]) }
  )

  const payments = await prisma.payment.findMany({
    where: { status: query.status },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      reservationId: true,
      amount: true,
      status: true,
      url: true,
      createdAt: true,
      paidAt: true,
      reservation: {
        select: {
          checkIn: true,
          checkOut: true,
          room: { select: { id: true, type: true } },
          account: { select: { name: true, email: true } },
        },
      },
    },
  })

  return c.json(
    success(
      payments.map((p) => ({
        payment_id: p.id,
        reservation_id: p.reservationId,
        room_id: p.reservation.room.id,
        room_type: p.reservation.room.type,
        guest_name: p.reservation.account.name,
        guest_email: p.reservation.account.email,
        check_in: p.reservation.checkIn.toISOString().slice(0, 10),
        check_out: p.reservation.checkOut.toISOString().slice(0, 10),
        amount: p.amount,
        payment_status: p.status,
        paid_at: p.paidAt?.toISOString() ?? null,
        created_at: p.createdAt.toISOString(),
      })),
      "Payments retrieved"
    ).body
  )
})

export default app