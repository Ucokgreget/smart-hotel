import { Hono } from "hono"

import { badRequest } from "../lib/errors"
import { success } from "../lib/envelope"
import { nightsBetween, parse, rules } from "../lib/validate"
import { createReservation, findReservation } from "../services/booking"

const app = new Hono()

/**
 * POST /api/reservations
 *
 * Body matches the proposal's example request: guest_name, email, phone,
 * room_id, check_in, check_out. The proposal does not attach a session to this
 * call, so a guest can book without an account; the account simply gets created
 * or matched on email.
 */
app.post("/", async (c) => {
  const body = parse(await c.req.json(), {
    guest_name: rules.string({ min: 2, max: 120 }),
    email: rules.email(),
    phone: rules.string({ min: 8, max: 20 }),
    room_id: rules.roomId(),
    check_in: rules.date(),
    check_out: rules.date(),
  })

  if (body.check_out <= body.check_in) {
    throw badRequest("Tanggal check-out harus setelah check-in.", {
      check_out: "harus setelah tanggal check-in",
    })
  }

  const nights = nightsBetween(body.check_in, body.check_out)
  if (nights > 30) {
    throw badRequest("Durasi menginap maksimal 30 malam.", {
      check_out: "maksimal 30 malam per reservasi",
    })
  }

  const reservation = await createReservation({
    guestName: body.guest_name,
    email: body.email,
    phone: body.phone,
    roomId: body.room_id,
    checkIn: body.check_in,
    checkOut: body.check_out,
  })

  return c.json(
    success(
      {
        reservation_id: reservation.id,
        guest_name: body.guest_name,
        room_id: reservation.roomId,
        check_in: body.check_in.toISOString().slice(0, 10),
        check_out: body.check_out.toISOString().slice(0, 10),
        total_amount: reservation.totalAmount,
        reservation_status: reservation.status,
      },
      "Reservation created successfully"
    ).body,
    201 as never
  )
})

/**
 * GET /api/reservations/{reservation_id}
 *
 * Not in the proposal's endpoint table. It exists because the guest needs to
 * see the payment state of their own reservation, and it is the cheapest way to
 * demonstrate that the callback updated both tables.
 */
app.get("/:reservationId", async (c) => {
  const reservation = await findReservation(c.req.param("reservationId"))
  return c.json(success(reservation, "Reservation retrieved").body)
})

export default app
