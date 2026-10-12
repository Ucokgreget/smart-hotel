import { describe, expect, test } from "bun:test"

import type { GatewayCallbackPayload } from "../src/services/payment-gateway"

import { HttpError } from "../src/lib/errors"
import {
  MockGateway,
  parseCallbackPayload,
} from "../src/services/payment-gateway"
import {
  getGateway,
  initGateway,
  setGateway,
} from "../src/services/gateway-registry"

const SECRET = "test-webhook-secret"
const gateway = new MockGateway(SECRET)

describe("MockGateway.createTransaction", () => {
  test("derives a PAY id and URL in the shape of the proposal example", async () => {
    const result = await gateway.createTransaction({
      transactionId: "TRX001",
      reservationId: "RSV001",
      amount: 1000000,
      method: "QRIS",
    })

    expect(result.paymentId).toBe("PAY001")
    expect(result.paymentUrl).toBe("https://payment.example.com/PAY001")
    expect(result.status).toBe("PENDING")
  })

  test("keeps multi digit counters intact", async () => {
    const result = await gateway.createTransaction({
      transactionId: "TRX042",
      reservationId: "RSV042",
      amount: 500000,
      method: "QRIS",
    })

    expect(result.paymentId).toBe("PAY042")
  })
})

describe("MockGateway.verifySignature", () => {
  test("accepts a signature it produced", () => {
    const body = JSON.stringify({ payment_id: "PAY001" })
    expect(gateway.verifySignature(body, gateway.sign(body))).toBe(true)
  })

  test("rejects a signature over a different body", () => {
    const signature = gateway.sign(JSON.stringify({ payment_id: "PAY001" }))
    const tampered = JSON.stringify({ payment_id: "PAY999" })

    expect(gateway.verifySignature(tampered, signature)).toBe(false)
  })

  test("rejects a missing or malformed signature", () => {
    expect(gateway.verifySignature("{}", undefined)).toBe(false)
    expect(gateway.verifySignature("{}", "sha256=deadbeef")).toBe(false)
    expect(gateway.verifySignature("{}", "")).toBe(false)
  })
})

describe("parseCallbackPayload", () => {
  // Annotated so payment_status keeps its "PAID" | "FAILED" literal type
  // instead of widening to string.
  const valid: GatewayCallbackPayload = {
    payment_id: "PAY001",
    reservation_id: "RSV001",
    payment_status: "PAID",
    paid_at: "2026-10-10T14:30:00Z",
  }

  test("accepts the proposal's callback body", () => {
    expect(parseCallbackPayload(valid)).toEqual({
      ...valid,
      paid_at: "2026-10-10T14:30:00.000Z",
    })
  })

  test("accepts FAILED", () => {
    const failed: GatewayCallbackPayload = { ...valid, payment_status: "FAILED" }
    expect(parseCallbackPayload(failed).payment_status).toBe("FAILED")
  })

  test.each([
    [{ ...valid, payment_id: "" }, "payment_id"],
    [{ ...valid, reservation_id: "" }, "reservation_id"],
    [{ ...valid, payment_status: "PENDING" }, "payment_status"],
    [{ ...valid, paid_at: "bukan tanggal" }, "paid_at"],
  ])("rejects a body with a bad %o", (body, field) => {
    try {
      parseCallbackPayload(body)
      throw new Error("should have thrown")
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError)
      expect((error as HttpError).message).toContain(field)
    }
  })

  test("rejects a non-object body", () => {
    expect(() => parseCallbackPayload("nope")).toThrow(HttpError)
    expect(() => parseCallbackPayload(null)).toThrow(HttpError)
  })
})

describe("gateway registry", () => {
  test("initGateway rejects an unknown mode so a typo fails on boot", () => {
    expect(() => initGateway("stripe")).toThrow(/belum didukung/)
  })

  test("initGateway returns the mock in mock mode", () => {
    expect(initGateway("mock")).toBeInstanceOf(MockGateway)
  })

  test("setGateway swaps the active adapter", () => {
    const original = getGateway()
    const replacement = new MockGateway("other")

    setGateway(replacement)
    expect(getGateway()).toBe(replacement)

    setGateway(original)
    expect(getGateway()).toBe(original)
  })
})
