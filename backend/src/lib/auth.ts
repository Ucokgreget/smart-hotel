import { sign, verify } from "hono/jwt"

import { prisma } from "../db"
import { env } from "../env"
import { Role } from "../generated/prisma/client"
import { unauthorized } from "../lib/errors"

export type SessionAccount = {
  accountId: string
  email: string
  name: string
  role: Role
}

export const SESSION_TTL_SECONDS = 60 * 60 * 12

/** The claims actually carried inside the token. `sub` is the account id. */
type TokenPayload = {
  sub: string
  email: string
  name: string
  role: Role
  ver: number
  iat: number
  exp: number
}

/**
 * Mints the session token. The role travels inside the token so the common path
 * needs no extra query, and a `ver` claim carries the account's tokenVersion so
 * a role change can invalidate tokens that are already out there.
 */
export async function issueToken(account: SessionAccount, tokenVersion: number): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000)

  // hono/jwt's sign takes the algorithm as its third argument, so exp goes in
  // the payload rather than in an options object.
  return sign(
    {
      sub: account.accountId,
      email: account.email,
      name: account.name,
      role: account.role,
      ver: tokenVersion,
      iat: issuedAt,
      exp: issuedAt + SESSION_TTL_SECONDS,
    },
    env.jwtSecret,
    "HS256"
  )
}

/** Checks the signature and expiry only. Touches no database. */
export async function decodeToken(token: string): Promise<TokenPayload> {
  let payload: unknown
  try {
    // alg is pinned: without it the verifier would accept the algorithm from the
    // token itself.
    payload = await verify(token, env.jwtSecret, { alg: "HS256" })
  } catch {
    throw unauthorized("Sesi tidak valid atau sudah berakhir.")
  }

  const claims = payload as Partial<TokenPayload>
  const role = claims.role === Role.ADMIN ? Role.ADMIN : Role.TAMU

  if (
    typeof claims.sub !== "string" ||
    typeof claims.email !== "string" ||
    typeof claims.ver !== "number"
  ) {
    throw unauthorized("Isi token tidak dikenali.")
  }

  return {
    sub: claims.sub,
    email: claims.email,
    name: typeof claims.name === "string" ? claims.name : "",
    role,
    ver: claims.ver,
    iat: claims.iat ?? 0,
    exp: claims.exp ?? 0,
  }
}

/**
 * Turns a token into a live session by checking it against the stored account.
 *
 * The role inside the token is not trusted on its own: it is compared with the
 * account's current role and tokenVersion. A token minted before a role change
 * therefore stops working on the very next request instead of staying valid for
 * the remaining 12 hours.
 */
export async function resolveSession(token: string): Promise<SessionAccount> {
  const claims = await decodeToken(token)

  const account = await prisma.account.findUnique({
    where: { id: claims.sub },
    select: { id: true, email: true, name: true, role: true, tokenVersion: true },
  })

  if (!account) throw unauthorized("Akun tidak ditemukan.")
  if (account.tokenVersion !== claims.ver) {
    throw unauthorized("Peran akun berubah. Masuk ulang.")
  }

  // The stored role wins, so a stale token cannot keep an old privilege.
  return { accountId: account.id, email: account.email, name: account.name, role: account.role }
}

/** Reads a bearer token if one is present. Returns null for anonymous callers. */
export async function optionalSession(header: string | undefined): Promise<SessionAccount | null> {
  if (!header?.startsWith("Bearer ")) return null
  return resolveSession(header.slice("Bearer ".length).trim())
}

export function bearerToken(header: string | undefined): string | null {
  if (!header?.startsWith("Bearer ")) return null
  const token = header.slice("Bearer ".length).trim()
  return token.length > 0 ? token : null
}