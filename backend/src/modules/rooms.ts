import { Hono } from "hono"

import { badRequest } from "../lib/errors"
import { success } from "../lib/envelope"
import { nightsBetween, parse, rules } from "../lib/validate"
import { findAvailableRooms } from "../services/booking"

const app = new Hono()

/**
 * GET /api/rooms
 *
 * The proposal shows the two dates in a request body; a GET carries them as
 * query parameters, so both are accepted. check_in and check_out are also
 * accepted as underscore names to match the field names in the document.
 */
app.get("/", async (c) => {
  const query = c.req.query()
  const body = parse(
    {
      check_in: query.check_in ?? query.checkIn ?? query.check_in_date,
      check_out: query.check_out ?? query.checkOut ?? query.check_out_date,
    },
    { check_in: rules.date(), check_out: rules.date() }
  )

  if (body.check_out <= body.check_in) {
    // A non-positive stay is a caller mistake, not an answer of "no rooms".
    throw badRequest("Tanggal check-out harus setelah check-in.", {
      check_out: "harus setelah tanggal check-in",
    })
  }

  const nights = nightsBetween(body.check_in, body.check_out)
  const rooms = await findAvailableRooms(body.check_in, body.check_out)

  return c.json(success({ ...rooms, nights }, "Available rooms retrieved").body)
})

export default app
