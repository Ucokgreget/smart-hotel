import { Hono } from "hono"

import { prisma } from "../db"
import { Role } from "../generated/prisma/client"
import { issueToken, resolveSession, type SessionAccount } from "../lib/auth"
import { conflict, unauthorized } from "../lib/errors"
import { success } from "../lib/envelope"
import { bearerToken } from "../lib/auth"
import { requireAccount } from "../middleware/auth"
import { parse, rules } from "../lib/validate"

const app = new Hono()

function sessionOf(account: {
  id: string
  email: string
  name: string
  role: Role
  tokenVersion: number
}) {
  const session: SessionAccount = {
    accountId: account.id,
    email: account.email,
    name: account.name,
    role: account.role,
  }

  return {
    account_id: account.id,
    email: account.email,
    name: account.name,
    role: account.role,
    token: undefined as string | undefined,
    session,
  }
}

/**
 * Guest accounts, which is the only role the proposal describes. Registration
 * always creates TAMU. There is deliberately no way to register yourself as an
 * admin: the first admin comes from prisma/seed.ts using env credentials.
 */
app.post("/register", async (c) => {
  const body = parse(await c.req.json(), {
    name: rules.string({ min: 2, max: 120 }),
    email: rules.email(),
    phone: rules.string({ min: 8, max: 20 }),
    password: rules.password(),
  })

  const existing = await prisma.account.findUnique({
    where: { email: body.email },
    select: { id: true, passwordHash: true },
  })

  if (existing) {
    // An account created by booking has the "unregistered" sentinel hash. Let
    // that guest claim it instead of showing a dead-end conflict.
    if (existing.passwordHash !== "unregistered") {
      throw conflict("EMAIL_TAKEN", "Email ini sudah terdaftar. Silakan masuk.")
    }

    const claimed = await prisma.account.update({
      where: { id: existing.id },
      data: {
        name: body.name,
        phone: body.phone,
        passwordHash: await Bun.password.hash(body.password, { algorithm: "argon2id" }),
        role: Role.TAMU,
      },
    })

    const out = sessionOf(claimed)
    out.token = await issueToken(out.session, claimed.tokenVersion)

    return c.json(success(out, "Akun berhasil dibuat.").body, 201 as never)
  }

  const account = await prisma.account.create({
    data: {
      name: body.name,
      email: body.email,
      phone: body.phone,
      passwordHash: await Bun.password.hash(body.password, { algorithm: "argon2id" }),
      role: Role.TAMU,
    },
  })

  const out = sessionOf(account)
  out.token = await issueToken(out.session, account.tokenVersion)

  return c.json(success(out, "Akun berhasil dibuat.").body, 201 as never)
})

app.post("/login", async (c) => {
  const body = parse(await c.req.json(), {
    email: rules.email(),
    password: rules.string({ trim: false, min: 1 }),
  })

  const account = await prisma.account.findUnique({
    where: { email: body.email },
    select: { id: true, email: true, name: true, passwordHash: true, role: true, tokenVersion: true },
  })

  // Same message for "no such account" and "wrong password" so the endpoint
  // cannot be used to enumerate registered emails.
  const invalid = unauthorized("Email atau kata sandi salah.")

  if (!account || account.passwordHash === "unregistered") throw invalid

  // verify throws on a malformed hash, so it is guarded rather than assumed.
  const ok = await Bun.password.verify(body.password, account.passwordHash).catch(() => false)
  if (!ok) throw invalid

  const out = sessionOf(account)
  out.token = await issueToken(out.session, account.tokenVersion)

  return c.json(success(out, "Berhasil masuk.").body)
})

/**
 * GET /api/auth/me
 *
 * Tells the frontend who is signed in and with which role, so the two route
 * trees can each decide what to render. The role comes from the database row
 * after resolveSession, not from the token, so a demoted admin sees the change
 * immediately instead of after the token expires.
 */
app.get("/me", requireAccount, async (c) => {
  const token = bearerToken(c.req.header("Authorization"))
  if (!token) throw unauthorized()

  const session = await resolveSession(token)

  return c.json(
    success(
      {
        account_id: session.accountId,
        email: session.email,
        name: session.name,
        role: session.role,
      },
      "Session retrieved"
    ).body
  )
})

export default app