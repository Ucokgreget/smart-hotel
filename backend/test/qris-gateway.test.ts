import { describe, expect, test } from "bun:test"
import { calculateCRC16, parseQRIS, validateQRIS } from "qris-dinamis/src/core/index"

import { QrisGateway, buildDynamicQris } from "../src/services/qris-gateway"
import { signCallbackBody } from "../src/services/payment-gateway"

/** EMVCo tag-length-value, the encoding QRIS payloads use. */
function tlv(tag: string, value: string): string {
  return `${tag}${value.length.toString().padStart(2, "0")}${value}`
}

/**
 * Builds a valid static QRIS the way a payment provider would print one.
 * Hand-writing one in a test would encode a stale CRC, so the fixture assembles
 * the TLV chain and asks the library for the checksum.
 */
export function buildStaticQris(
  merchantId = "SMH1234",
  name = "SMART HOTEL",
  city = "PALEMBANG"
): string {
  const merchant = tlv("00", "ID.CO.QRIS.WWW") + tlv("01", merchantId)
  const body =
    tlv("00", "01") + // payload format
    tlv("01", "11") + // point of initiation: static
    tlv("26", merchant) + // merchant account info
    tlv("52", "5812") + // MCC: restaurant
    tlv("53", "360") + // currency: IDR
    tlv("58", "ID") +
    tlv("59", name) +
    tlv("60", city) +
    "6304"

  return body + calculateCRC16(body)
}

const STATIC_QRIS = buildStaticQris()

describe("static QRIS fixture", () => {
  test("is a valid static QRIS with no amount", () => {
    expect(validateQRIS(STATIC_QRIS)).toEqual({ valid: true, errors: [] })

    const parsed = parseQRIS(STATIC_QRIS)
    expect(parsed.method).toBe("static")
    expect(parsed.amount).toBeUndefined()
  })
})

describe("QrisGateway constructor", () => {
  test("accepts a valid static code", () => {
    expect(() => new QrisGateway(STATIC_QRIS, "http://localhost:3000", "secret")).not.toThrow()
  })

  test("refuses an invalid static code at construction, not at first payment", () => {
    expect(() => new QrisGateway("bukan-qris", "http://localhost:3000", "secret")).toThrow(
      /not a valid QRIS string/
    )
  })
})

describe("buildDynamicQris", () => {
  test("injects the exact amount and flips static to dynamic", () => {
    const dynamic = buildDynamicQris(STATIC_QRIS, 1_000_000)

    expect(validateQRIS(dynamic).valid).toBe(true)
    expect(parseQRIS(dynamic).method).toBe("dynamic")
    expect(Number(parseQRIS(dynamic).amount)).toBe(1_000_000)
  })

  test("keeps the merchant identity intact", () => {
    const parsed = parseQRIS(buildDynamicQris(STATIC_QRIS, 500_000))

    expect(parsed.merchantName).toBe("SMART HOTEL")
    expect(parsed.merchantCity).toBe("PALEMBANG")
    expect(parsed.currency).toBe("360")
  })

  // The property the whole scheme depends on: the number in the code is the
  // number from the stored reservation, never from the request.
  test("carries a different total for each amount without touching the source", () => {
    for (const amount of [350_000, 500_000, 750_000, 1_000_000, 12_345_678]) {
      const payload = buildDynamicQris(STATIC_QRIS, amount)
      expect(Number(parseQRIS(payload).amount)).toBe(amount)
      expect(validateQRIS(payload).valid).toBe(true)
    }

    expect(parseQRIS(STATIC_QRIS).amount).toBeUndefined()
  })

  test("produces a different payload per amount, so codes cannot be reused", () => {
    expect(buildDynamicQris(STATIC_QRIS, 500_000)).not.toBe(
      buildDynamicQris(STATIC_QRIS, 750_000)
    )
  })
})

describe("QrisGateway.createTransaction", () => {
  const gateway = new QrisGateway(STATIC_QRIS, "http://localhost:3000", "webhook-secret")

  test("derives the payment id from the transaction id", async () => {
    const result = await gateway.createTransaction({
      transactionId: "TRX001",
      reservationId: "RSV001",
      amount: 1_000_000,
      method: "QRIS",
    })

    expect(result.paymentId).toBe("PAY001")
    expect(result.status).toBe("PENDING")
  })

  test("points the payment url at this server's pay page", async () => {
    const result = await gateway.createTransaction({
      transactionId: "TRX007",
      reservationId: "RSV007",
      amount: 750_000,
      method: "QRIS",
    })

    expect(result.paymentUrl).toBe("http://localhost:3000/pay/PAY007")
  })

  test("trims a trailing slash from the public base url", async () => {
    const trailing = new QrisGateway(STATIC_QRIS, "http://localhost:3000/", "s")
    const result = await trailing.createTransaction({
      transactionId: "TRX002",
      reservationId: "RSV002",
      amount: 500_000,
      method: "QRIS",
    })

    expect(result.paymentUrl).toBe("http://localhost:3000/pay/PAY002")
  })

  test("payloadFor encodes the amount it is given", () => {
    expect(Number(parseQRIS(gateway.payloadFor(1_500_000)).amount)).toBe(1_500_000)
  })

  test("amountIn reads back what was encoded", () => {
    expect(gateway.amountIn(gateway.payloadFor(875_000))).toBe(875_000)
  })

  test("amountIn is null for a static code with no amount", () => {
    expect(gateway.amountIn(STATIC_QRIS)).toBeNull()
  })
})

describe("QrisGateway.merchantInfo", () => {
  test("reports the merchant from the static code", () => {
    const gateway = new QrisGateway(STATIC_QRIS, "http://localhost:3000", "s")

    expect(gateway.merchantInfo()).toEqual({
      merchantName: "SMART HOTEL",
      merchantCity: "PALEMBANG",
      currency: "360",
      provider: "ID.CO.QRIS.WWW",
    })
  })
})

describe("QrisGateway.verifySignature", () => {
  const secret = "webhook-secret"
  const gateway = new QrisGateway(STATIC_QRIS, "http://localhost:3000", secret)

  test("accepts a signature it produced, and rejects others", () => {
    const body = JSON.stringify({ payment_id: "PAY001" })

    expect(gateway.verifySignature(body, signCallbackBody(body, secret))).toBe(true)
    expect(gateway.verifySignature(body, signCallbackBody(body, "different-secret"))).toBe(false)
    expect(gateway.verifySignature(body, "sha256=0000")).toBe(false)
    expect(gateway.verifySignature(body, undefined)).toBe(false)
  })
})
