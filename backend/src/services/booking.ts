import {
  PaymentMethod,
  PaymentStatus,
  Prisma,
  ReservationStatus,
  RoomStatus,
} from "../generated/prisma/client"
import { prisma } from "../db"
import { conflict, notFound } from "../lib/errors"
import { nightsBetween } from "../lib/validate"
import { asGatewayError } from "./payment-gateway"
import { getGateway } from "./gateway-registry"

type Tx = Prisma.TransactionClient

/** Statuses that hold a room for the guest. A cancelled booking frees it. */
const BLOCKING_STATUSES: ReservationStatus[] = [
  ReservationStatus.PENDING,
  ReservationStatus.CONFIRMED,
]

/**
 * Human readable identifiers exactly as the proposal writes them: RSV001,
 * TRX001, PAY001. Backed by a counter row so the sequence survives restarts.
 */
async function nextId(tx: Tx, prefix: string, width = 3): Promise<string> {
  const row = await tx.counter.upsert({
    where: { key: prefix },
    create: { key: prefix, value: 1 },
    update: { value: { increment: 1 } },
  })
  return `${prefix}${String(row.value).padStart(width, "0")}`
}

/** A booking that overlaps the requested window, if any. */
function overlappingStay(checkIn: Date, checkOut: Date) {
  return {
    status: { in: BLOCKING_STATUSES },
    // check_in < requestedCheckOut AND check_out > requestedCheckIn
    checkIn: { lt: checkOut },
    checkOut: { gt: checkIn },
  }
}

/** GET /api/rooms — rooms with no overlapping live booking for those dates. */
export async function findAvailableRooms(checkIn: Date, checkOut: Date) {
  const nights = nightsBetween(checkIn, checkOut)

  return prisma.room.findMany({
    where: {
      status: RoomStatus.AVAILABLE,
      NOT: { reservations: { some: overlappingStay(checkIn, checkOut) } },
    },
    select: {
      id: true,
      number: true,
      type: true,
      pricePerNight: true,
      status: true,
    },
    orderBy: { id: "asc" },
  }).then((rooms) =>
    rooms.map((room) => ({
      room_id: room.id,
      room_number: room.number,
      room_type: room.type,
      price_per_night: room.pricePerNight,
      status: "available",
      nights,
    }))
  )
}

export type CreateReservationInput = {
  guestName: string
  email: string
  phone: string
  roomId: string
  checkIn: Date
  checkOut: Date
}

/**
 * POST /api/reservations.
 *
 * Runs at Serializable isolation and re-checks the overlap inside the same
 * transaction, so two guests booking the last room cannot both succeed.
 * The total is computed from the stored room price, never taken from the body.
 */
export async function createReservation(input: CreateReservationInput) {
  const nights = nightsBetween(input.checkIn, input.checkOut)

  return prisma.$transaction(
    async (tx) => {
      const room = await tx.room.findUnique({ where: { id: input.roomId } })
      if (!room) throw notFound(`Kamar ${input.roomId} tidak ditemukan.`)
      if (room.status !== RoomStatus.AVAILABLE) {
        throw conflict("ROOM_UNAVAILABLE", `Kamar ${room.id} sedang tidak dapat dipesan.`)
      }

      const taken = await tx.reservation.findFirst({
        where: { roomId: room.id, ...overlappingStay(input.checkIn, input.checkOut) },
        select: { id: true },
      })
      if (taken) {
        throw conflict(
          "ROOM_UNAVAILABLE",
          `Kamar ${room.id} sudah dipesan untuk tanggal tersebut.`
        )
      }

      const id = await nextId(tx, "RSV")

      return tx.reservation.create({
        data: {
          id,
          checkIn: input.checkIn,
          checkOut: input.checkOut,
          nights,
          totalAmount: room.pricePerNight * nights,
          status: ReservationStatus.PENDING,
          account: {
            connectOrCreate: {
              where: { email: input.email },
              create: {
                name: input.guestName,
                email: input.email,
                phone: input.phone,
                // A booking made without an account gets a value that can never
                // match a real password hash, so the row cannot be logged into.
                passwordHash: "unregistered",
              },
            },
          },
          room: { connect: { id: room.id } },
        },
        include: { room: { select: { id: true, type: true } } },
      })
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  )
}

export async function findReservation(id: string) {
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      room: { select: { id: true, number: true, type: true } },
      payment: {
        select: { id: true, status: true, url: true, paidAt: true, amount: true },
      },
    },
  })

  if (!reservation) throw notFound(`Reservasi ${id} tidak ditemukan.`)

  return {
    reservation_id: reservation.id,
    room_id: reservation.roomId,
    room_number: reservation.room.number,
    room_type: reservation.room.type,
    check_in: reservation.checkIn.toISOString().slice(0, 10),
    check_out: reservation.checkOut.toISOString().slice(0, 10),
    nights: reservation.nights,
    total_amount: reservation.totalAmount,
    reservation_status: reservation.status,
    payment: reservation.payment
      ? {
          payment_id: reservation.payment.id,
          payment_status: reservation.payment.status,
          payment_url: reservation.payment.url,
          paid_at: reservation.payment.paidAt?.toISOString() ?? null,
        }
      : null,
  }
}

/**
 * POST /api/payments — the Request-Reply half of the integration.
 *
 * Deliberately two transactions with the gateway call in between: holding a
 * database transaction open across a network call to a third party is how
 * pools run out. If the gateway call fails the transaction row stays behind
 * without a payment, and the request can be retried safely.
 */
export async function createPaymentTransaction(
  reservationId: string,
  method: PaymentMethod,
  requestedAmount: number
) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { payment: true, transaction: true },
  })

  if (!reservation) throw notFound(`Reservasi ${reservationId} tidak ditemukan.`)
  if (reservation.payment) {
    throw conflict("PAYMENT_EXISTS", `Reservasi ${reservationId} sudah punya transaksi pembayaran.`)
  }
  if (reservation.status === ReservationStatus.CANCELLED) {
    throw conflict("RESERVATION_CANCELLED", `Reservasi ${reservationId} sudah dibatalkan.`)
  }
  // The proposal's request carries `amount`, but the charge always comes from
  // the stored reservation total. A mismatch means the caller is working from
  // stale data, so it is reported instead of quietly ignored.
  if (requestedAmount !== reservation.totalAmount) {
    throw conflict(
      "AMOUNT_MISMATCH",
      `Total yang diminta (${requestedAmount}) tidak sama dengan total reservasi (${reservation.totalAmount}).`
    )
  }

  const transactionId = await prisma.$transaction(async (tx) => {
    const id = await nextId(tx, "TRX")
    await tx.transaction.create({
      data: {
        id,
        reservationId: reservation.id,
        amount: reservation.totalAmount,
        method,
      },
    })
    return id
  })

  let gatewayResult: Awaited<ReturnType<ReturnType<typeof getGateway>["createTransaction"]>>
  try {
    gatewayResult = await getGateway().createTransaction({
      transactionId,
      reservationId: reservation.id,
      amount: reservation.totalAmount,
      method,
    })
  } catch (error) {
    asGatewayError(error)
  }

  const payment = await prisma.$transaction(async (tx) => {
    await tx.transaction.update({
      where: { id: transactionId },
      data: { gatewayReference: gatewayResult.paymentId },
    })

    return tx.payment.create({
      data: {
        id: gatewayResult.paymentId,
        transactionId,
        reservationId: reservation.id,
        amount: reservation.totalAmount,
        url: gatewayResult.paymentUrl,
        status: PaymentStatus.PENDING,
      },
    })
  })

  return {
    payment_id: payment.id,
    reservation_id: payment.reservationId,
    amount: payment.amount,
    payment_method: method,
    payment_status: payment.status,
    payment_url: payment.url,
  }
}

/**
 * POST /api/payment/callback — the Webhook/Callback half.
 *
 * Gateways retry until they get a 2xx, so this must be safe to run twice. The
 * update only matches rows still in PENDING; if nothing matched the payment was
 * already settled and the reservation is left exactly as it is.
 *
 * Per the proposal, a FAILED payment leaves the reservation unconfirmed.
 */
export async function applyPaymentCallback(payload: {
  payment_id: string
  reservation_id: string
  payment_status: "PAID" | "FAILED"
  paid_at: string
}) {
  const nextStatus = payload.payment_status === "PAID" ? PaymentStatus.PAID : PaymentStatus.FAILED
  const paidAt = new Date(payload.paid_at)

  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: payload.payment_id },
      select: { id: true, reservationId: true, status: true, amount: true },
    })

    if (!payment) throw notFound(`Pembayaran ${payload.payment_id} tidak ditemukan.`)
    if (payment.reservationId !== payload.reservation_id) {
      throw conflict(
        "RESERVATION_MISMATCH",
        "reservation_id tidak cocok dengan pembayaran tersebut."
      )
    }

    if (payment.status !== PaymentStatus.PENDING) {
      // Already settled by an earlier delivery. Report the stored truth and
      // leave the reservation untouched.
      return { payment, alreadyProcessed: true as const }
    }

    const settled = await tx.payment.updateMany({
      where: { id: payment.id, status: PaymentStatus.PENDING },
      data: { status: nextStatus, paidAt },
    })

    // Another delivery won the race between the read and this write.
    if (settled.count === 0) {
      const current = await tx.payment.findUniqueOrThrow({ where: { id: payment.id } })
      return { payment: current, alreadyProcessed: true as const }
    }

    if (nextStatus === PaymentStatus.PAID) {
      await tx.reservation.updateMany({
        where: { id: payment.reservationId, status: ReservationStatus.PENDING },
        data: { status: ReservationStatus.CONFIRMED },
      })
    }

    const updated = await tx.payment.findUniqueOrThrow({ where: { id: payment.id } })
    return { payment: updated, alreadyProcessed: false as const }
  })
}

/** GET /api/payments/{payment_id} */
export async function findPayment(paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { reservation: { select: { id: true, status: true } } },
  })

  if (!payment) throw notFound(`Pembayaran ${paymentId} tidak ditemukan.`)

  return {
    payment_id: payment.id,
    reservation_id: payment.reservationId,
    payment_status: payment.status,
    amount: payment.amount,
    paid_at: payment.paidAt?.toISOString() ?? null,
    reservation_status: payment.reservation.status,
  }
}
