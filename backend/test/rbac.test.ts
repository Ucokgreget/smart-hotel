import { describe, expect, test } from "bun:test"

import app from "../src/index"

/**
 * RBAC gate behaviour that can be decided without a database: a caller with no
 * token, or with an unusable one, must be turned away before any query runs.
 *
 * The cross-role case, a TAMU token hitting an ADMIN route and getting 403, is
 * not covered here because requireRole resolves the role from the account row
 * first. That path needs a live database and is exercised manually.
 */
const guarded: [string, RequestInit][] = [
  ["GET", { method: "GET" }],
  [
    "POST",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payment_id: "PAY001",
        reservation_id: "RSV001",
        payment_status: "PAID",
        paid_at: "2026-10-10T14:30:00Z",
      }),
    },
  ],
]

const routes: [string, RequestInit][] = [
  ["/api/admin/payments", guarded[0][1]],
  ["/api/payment/reconcile", guarded[1][1]],
]

describe("RBAC rejects anonymous callers before the database", () => {
  test.each(routes)("GET|POST %s without a token is 401", async (path, init) => {
    const res = await app.request(path, init)
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error.code).toBe("UNAUTHORIZED")
  })

  test.each(routes)("%s with an unusable token is 401", async (path, init) => {
    const res = await app.request(path, {
      ...init,
      headers: { ...(init.headers ?? {}), Authorization: "Bearer nonsense" },
    })

    expect(res.status).toBe(401)
  })

  test("a malformed Authorization header is treated as no token", async () => {
    // "Basic ..." is not a bearer token, so the guard must not crash on it.
    const res = await app.request("/api/admin/payments", {
      headers: { Authorization: "Basic dXNlcjpwYXNz" },
    })

    expect(res.status).toBe(401)
  })
})

describe("the shared admin key is gone", () => {
  test("the old X-Admin-Key header no longer opens anything", async () => {
    const res = await app.request("/api/payment/reconcile", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Admin-Key": "anything" },
      body: JSON.stringify({
        payment_id: "PAY001",
        reservation_id: "RSV001",
        payment_status: "PAID",
        paid_at: "2026-10-10T14:30:00Z",
      }),
    })

    // A header that used to be the whole of staff authentication no longer
    // authenticates anyone.
    expect(res.status).toBe(401)
  })
})

describe("public routes stay public", () => {
  test("/health needs no token", async () => {
    const res = await app.request("/health")

    expect(res.status).toBe(200)
  })

  test("/pay is not behind the RBAC gate", async () => {
    // Reaches the database rather than being turned away, which is how we know
    // no role check blocks it.
    const res = await app.request("/pay/PAY-UNKNOWN")

    expect(res.status).not.toBe(401)
    expect(res.status).not.toBe(403)
  })
})

describe("guest facing validation is unchanged by RBAC", () => {
  test("booking without a session still works on the validation path", async () => {
    const res = await app.request("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guest_name: "A" }),
    })

    expect(res.status).toBe(400)
  })
})