import { createHmac, timingSafeEqual } from "node:crypto"

import { badGateway, badRequest } from "../lib/errors"

/**
 * The hotel side of the integration.
 *
 * The proposal names no gateway vendor, it only describes two patterns:
 *
 *  1. Request-Reply: the hotel asks the gateway to create a payment transaction
 *     and receives the payment URL and payment id back.
 *  2. Webhook/Callback: the gateway posts a status change back to the hotel.
 *
 * So the vendor is an interface. Adapters live beside this file and are chosen
 * in gateway-registry.ts, which imports both sides without a cycle.
 */

export type GatewayTransactionInput = {
  transactionId: string
  reservationId: string
  amount: number
  method: string
}

export type GatewayTransactionResult = {
  paymentId: string
  paymentUrl: string
  status: "PENDING"
}

export type GatewayCallbackPayload = {
  payment_id: string
  reservation_id: string
  payment_status: "PAID" | "FAILED"
  paid_at: string
}

export interface PaymentGateway {
  /** Request-Reply. Creates the transaction on the gateway side. */
  createTransaction(input: GatewayTransactionInput): Promise<GatewayTransactionResult>
  /** Constant time check of the gateway signature on a callback body. */
  verifySignature(rawBody: string, signature: string | undefined): boolean
}

/**
 * Signature format is `sha256=<hex hmac>` over the raw request body. Shared by
 * every adapter so there is one implementation of the rule.
 */
export function signCallbackBody(rawBody: string, secret: string): string {
  return `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`
}

/** Constant time comparison, so a wrong signature leaks nothing by timing. */
export function verifyCallbackSignature(
  rawBody: string,
  secret: string,
  signature: string | undefined
): boolean {
  if (!signature) return false
  const left = Buffer.from(signCallbackBody(rawBody, secret))
  const right = Buffer.from(signature)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

/**
 * Development stand in. It is not a payment processor: nothing is charged, and
 * the returned URL points at this server's own confirmation helper so the whole
 * callback path can be exercised end to end without a vendor account.
 */
export class MockGateway implements PaymentGateway {
  constructor(private readonly webhookSecret: string) {}

  async createTransaction(input: GatewayTransactionInput): Promise<GatewayTransactionResult> {
    return {
      paymentId: `PAY${input.transactionId.replace(/^TRX/, "")}`,
      // Same host as the proposal's example response, kept as a placeholder.
      paymentUrl: `https://payment.example.com/${input.transactionId.replace(/^TRX/, "PAY")}`,
      status: "PENDING",
    }
  }

  verifySignature(rawBody: string, signature: string | undefined): boolean {
    return verifyCallbackSignature(rawBody, this.webhookSecret, signature)
  }

  /** Helper for local testing: signs a callback body the way a gateway would. */
  sign(rawBody: string): string {
    return signCallbackBody(rawBody, this.webhookSecret)
  }
}

/** Parses a callback body into the proposal's field names, or rejects it. */
export function parseCallbackPayload(raw: unknown): GatewayCallbackPayload {
  if (typeof raw !== "object" || raw === null) {
    throw badRequest("Isi callback tidak valid.")
  }

  const body = raw as Record<string, unknown>
  const paymentId = typeof body.payment_id === "string" ? body.payment_id.trim() : ""
  const reservationId =
    typeof body.reservation_id === "string" ? body.reservation_id.trim() : ""
  const status = typeof body.payment_status === "string" ? body.payment_status.trim() : ""
  const paidAt = typeof body.paid_at === "string" ? body.paid_at.trim() : ""

  if (!paymentId) throw badRequest("payment_id wajib diisi.")
  if (!reservationId) throw badRequest("reservation_id wajib diisi.")
  if (status !== "PAID" && status !== "FAILED") {
    throw badRequest("payment_status harus PAID atau FAILED.")
  }
  if (Number.isNaN(Date.parse(paidAt))) throw badRequest("paid_at bukan tanggal yang valid.")

  return {
    payment_id: paymentId,
    reservation_id: reservationId,
    payment_status: status,
    paid_at: new Date(paidAt).toISOString(),
  }
}

/** Normalises a gateway failure so controllers do not leak vendor detail. */
export function asGatewayError(error: unknown): never {
  if (error instanceof Error) {
    throw badGateway(`Payment Gateway menolak permintaan: ${error.message}`)
  }
  throw badGateway("Payment Gateway tidak dapat dihubungi.")
}
