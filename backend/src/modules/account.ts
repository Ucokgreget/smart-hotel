import { Hono } from "hono"

import { prisma } from "../db"
import { success } from "../lib/envelope"
import { currentAccount, requireAccount } from "../middleware/auth"

const app = new Hono()

/**
 * GET /api/account/reservations
 *
 * The signed-in account's own bookings. Not in the proposal, which describes
 * booking but no way to look one up again, and a guest who cannot see their
 * reservation cannot find the payment page either.
 */
app.use("*", requireAccount)

app.get("/reservations", async (c) => {
  const account = currentAccount(c)

  const reservations = await prisma.reservation.findMany({
    where: { accountId: account.accountId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      checkIn: true,
      checkOut: true,
      nights: true,
      totalAmount: true,
      status: true,
      room: { select: { id: true, type: true } },
      payment: { select: { id: true, status: true, amount: true } },
    },
  })

  return c.json(
    success(
      reservations.map((r) => ({
        reservation_id: r.id,
        room_id: r.room.id,
        room_type: r.room.type,
        check_in: r.checkIn.toISOString().slice(0, 10),
        check_out: r.checkOut.toISOString().slice(0, 10),
        nights: r.nights,
        total_amount: r.totalAmount,
        reservation_status: r.status,
        payment_id: r.payment?.id ?? null,
        payment_status: r.payment?.status ?? null,
      })),
      "Reservations retrieved"
    ).body
  )
})

export default app