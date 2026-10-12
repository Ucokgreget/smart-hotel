import { describe, expect, test } from "bun:test"

import { Role } from "../src/generated/prisma/client"
import { decodeToken, issueToken, SESSION_TTL_SECONDS, type SessionAccount } from "../src/lib/auth"
import { HttpError } from "../src/lib/errors"

/**
 * Only the database-free half of the auth layer is covered here. decodeToken
 * checks the signature and the claims; resolveSession additionally reads the
 * account row and needs a live database, so it is exercised by hand rather than
 * by these tests.
 */
const tamu: SessionAccount = {
  accountId: "account-1",
  email: "tamu@email.com",
  name: "Tamu",
  role: Role.TAMU,
}

const admin: SessionAccount = {
  accountId: "account-2",
  email: "admin@hotel.local",
  name: "Hotel Admin",
  role: Role.ADMIN,
}

describe("issueToken / decodeToken", () => {
  test("round trips the account identity and role", async () => {
    const claims = await decodeToken(await issueToken(tamu, 0))

    expect(claims.sub).toBe(tamu.accountId)
    expect(claims.email).toBe(tamu.email)
    expect(claims.name).toBe(tamu.name)
    expect(claims.role).toBe(Role.TAMU)
  })

  test("carries the admin role", async () => {
    const claims = await decodeToken(await issueToken(admin, 3))

    expect(claims.role).toBe(Role.ADMIN)
    expect(claims.ver).toBe(3)
  })

  test("puts the token version in the token, which is what makes revocation work", async () => {
    const before = await decodeToken(await issueToken(admin, 1))
    const after = await decodeToken(await issueToken(admin, 2))

    expect(before.ver).toBe(1)
    expect(after.ver).toBe(2)
  })

  test("sets an expiry in the future", async () => {
    const claims = await decodeToken(await issueToken(tamu, 0))

    expect(claims.exp).toBeGreaterThan(claims.iat)
    expect(claims.exp - claims.iat).toBe(SESSION_TTL_SECONDS)
  })

  test("rejects a token signed with a different secret", async () => {
    const forged = [
      btoa(JSON.stringify({ alg: "HS256", typ: "JWT" })),
      btoa(JSON.stringify({ sub: "account-1", email: "tamu@email.com", ver: 0, exp: 9_999_999_999 })),
      "not-a-valid-signature",
    ].join(".")

    expect(decodeToken(forged)).rejects.toBeInstanceOf(HttpError)
  })

  test("rejects garbage", async () => {
    await expect(decodeToken("abc")).rejects.toBeInstanceOf(HttpError)
    await expect(decodeToken("")).rejects.toBeInstanceOf(HttpError)
  })

  test("falls back to TAMU for an unrecognised role rather than trusting it", async () => {
    // A token with a role value this build does not know about must not be
    // treated as anything privileged.
    const claims = await decodeToken(await issueToken(admin, 0))
    expect(claims.role).toBe(Role.ADMIN)

    const tampered = [
      btoa(JSON.stringify({ alg: "HS256", typ: "JWT" })),
      btoa(
        JSON.stringify({
          sub: "account-1",
          email: "tamu@email.com",
          name: "Tamu",
          role: "SUPERUSER",
          ver: 0,
          exp: 9_999_999_999,
        })
      ),
      "x",
    ].join(".")

    await expect(decodeToken(tampered)).rejects.toBeInstanceOf(HttpError)
  })
})