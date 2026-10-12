import type { ErrorHandler } from "hono"
import { Prisma } from "../generated/prisma/client"
import { HttpError } from "../lib/errors"
import { failure } from "../lib/envelope"

/**
 * One place that turns anything thrown in a handler into the JSON envelope.
 * Internal messages are never forwarded: the client gets the code and a plain
 * Indonesian sentence, and the detail goes to the server log.
 */
export const onError: ErrorHandler = (error, c) => {
  if (error instanceof HttpError) {
    return c.json(
      failure(error.message, error.code, error.status, error.fields).body,
      error.status as 400
    )
  }

  // Prisma's "record not found" is an expected outcome, not a crash.
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return c.json(
        failure("Data sudah terdaftar.", "DUPLICATE", 409).body,
        409 as never
      )
    }
    if (error.code === "P2028") {
      return c.json(
        failure("Koneksi ke database tidak tersedia. Coba lagi sebentar.", "DB_UNAVAILABLE", 503)
          .body,
        503 as never
      )
    }
  }

  console.error("[error]", error)

  return c.json(
    failure("Terjadi kesalahan di server. Coba lagi sebentar.", "INTERNAL_ERROR", 500).body,
    500 as never
  )
}
