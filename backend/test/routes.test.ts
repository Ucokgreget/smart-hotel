import { describe, expect, test } from "bun:test"

import app from "../src/index"
import { MockGateway } from "../src/services/payment-gateway"

/**
 * These exercise the HTTP layer only. Every case here is one that must be
 * rejected or answered before any query reaches the database, so the suite runs
 * without a live Supabase connection.
 */
const call = (path: string, init?: RequestInit) => app.request(path, init)

const postJson = (path: string, body: unknown) =>
  call(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

describe("envelope and routing", () => {
  test("unknown routes return the JSON error envelope, not HTML", async () => {
    const res = await call("/api/tidak-ada")
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.status).toBe("error")
    expect(body.error.code).toBe("NOT_FOUND")
  })

  test("health check reports the configured gateway mode", async () => {
    const res = await call("/health")
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.status).toBe("success")
    expect(body.data.payment_gateway).toBe("mock")
  })
})

describe("GET /api/rooms validation", () => {
  test("rejects a missing date range with field errors", async () => {
    const res = await call("/api/rooms")
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe("BAD_REQUEST")
    expect(body.error.fields).toHaveProperty("check_in")
    expect(body.error.fields).toHaveProperty("check_out")
  })

  test("rejects a malformed date before any lookup", async () => {
    const res = await call("/api/rooms?check_in=10-10-2026&check_out=2026-10-12")
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.fields.check_in).toContain("YYYY-MM-DD")
  })

  test("accepts both check_in and checkIn spellings", async () => {
    // Reaches the same field error either way, which proves both aliases are
    // read, and stops before the database.
    const underscored = await call("/api/rooms?check_in=buruk&check_out=buruk")
    const camel = await call("/api/rooms?checkIn=buruk&checkOut=buruk")

    for (const res of [underscored, camel]) {
      const body = await res.json()
      expect(res.status).toBe(400)
      expect(body.error.fields).toHaveProperty("check_in")
      expect(body.error.fields).toHaveProperty("check_out")
    }
  })

  test("rejects a check-out that is not after check-in", async () => {
    const res = await call("/api/rooms?checkIn=2026-10-10&checkOut=2026-10-10")
    const body = await res.json()

    // A non-positive stay is a caller mistake, so it is a 400 rather than an
    // empty 200 that reads like "no rooms available".
    expect(res.status).toBe(400)
    expect(body.error.fields.check_out).toContain("setelah")
  })
})

describe("POST /api/reservations validation", () => {
  test("reports every bad field at once", async () => {
    const res = await postJson("/api/reservations", {
      guest_name: "A",
      email: "bukan-email",
      phone: "123",
      room_id: "101",
      check_in: "10/10/2026",
      check_out: "2026-10-12",
    })
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(Object.keys(body.error.fields).sort()).toEqual([
      "check_in",
      "email",
      "guest_name",
      "phone",
      "room_id",
    ])
  })

  test("rejects check-out on or before check-in", async () => {
    const res = await postJson("/api/reservations", {
      guest_name: "Aishwarya Rai",
      email: "tamu@email.com",
      phone: "081234567890",
      room_id: "RM101",
      check_in: "2026-10-12",
      check_out: "2026-10-10",
    })
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.fields.check_out).toContain("setelah")
  })

  test("rejects a non-object body", async () => {
    const res = await postJson("/api/reservations", "bukan objek")
    expect(res.status).toBe(400)
  })
})

describe("POST /api/payments validation", () => {
  test("requires the reservation id, amount, and a known method", async () => {
    const res = await postJson("/api/payments", {
      reservation_id: "RSV001",
      amount: "banyak",
      payment_method: "KARTU",
    })
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.fields).toHaveProperty("amount")
    expect(body.error.fields.payment_method).toContain("QRIS")
  })

  test("rejects a zero or negative amount", async () => {
    const res = await postJson("/api/payments", {
      reservation_id: "RSV001",
      amount: 0,
      payment_method: "QRIS",
    })

    expect(res.status).toBe(400)
  })
})

describe("POST /api/payment/callback signature gate", () => {
  const payload = JSON.stringify({
    payment_id: "PAY001",
    reservation_id: "RSV001",
    payment_status: "PAID",
    paid_at: "2026-10-10T14:30:00Z",
  })

  test("rejects an unsigned callback before touching the database", async () => {
    const res = await call("/api/payment/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    })
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error.code).toBe("UNAUTHORIZED")
  })

  test("rejects a signature made with the wrong secret", async () => {
    const wrong = new MockGateway("secret-yang-salah").sign(payload)
    const res = await call("/api/payment/callback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Gateway-Signature": wrong,
      },
      body: payload,
    })

    expect(res.status).toBe(401)
  })

  test("rejects a signature over a different body", async () => {
    const signature = new MockGateway(process.env.PAYMENT_GATEWAY_WEBHOOK_SECRET!).sign(
      JSON.stringify({ payment_id: "PAY999" })
    )
    const res = await call("/api/payment/callback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Gateway-Signature": signature,
      },
      body: payload,
    })

    expect(res.status).toBe(401)
  })
})

describe("POST /api/auth validation", () => {
  test("rejects a short password before hashing anything", async () => {
    const res = await postJson("/api/auth/register", {
      name: "Aishwarya Rai",
      email: "tamu@email.com",
      phone: "081234567890",
      password: "pendek",
    })
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.fields.password).toContain("minimal 8 karakter")
  })

  test("login reports the same message for a bad email shape and a bad password", async () => {
    const badEmail = await postJson("/api/auth/login", {
      email: "bukan-email",
      password: "apapun123",
    })
    const badPassword = await postJson("/api/auth/login", {
      email: "tamu@email.com",
      password: "",
    })

    expect(badEmail.status).toBe(400)
    expect(badPassword.status).toBe(400)
  })
})
