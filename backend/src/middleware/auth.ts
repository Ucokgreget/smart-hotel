import { createMiddleware } from "hono/factory"

import { Role } from "../generated/prisma/client"
import { bearerToken, optionalSession, resolveSession, type SessionAccount } from "../lib/auth"
import { forbidden, unauthorized } from "../lib/errors"

export type AppEnv = {
  Variables: {
    account: SessionAccount
    accountId: string
  }
}

/**
 * Resolves a bearer token when one is present and never blocks on its own.
 * The proposal does not attach a session to the booking endpoints, so this only
 * attaches context. Handlers that need a role use requireRole.
 */
export const attachAccount = createMiddleware<AppEnv>(async (c, next) => {
  const session = await optionalSession(c.req.header("Authorization"))
  if (session) {
    c.set("account", session)
    c.set("accountId", session.accountId)
  }
  await next()
})

/** Rejects the request when no valid session was attached. */
export const requireAccount = createMiddleware<AppEnv>(async (c, next) => {
  const token = bearerToken(c.req.header("Authorization"))
  if (!token) throw unauthorized()

  const session = await resolveSession(token)
  c.set("account", session)
  c.set("accountId", session.accountId)
  await next()
})

/**
 * Gate for a role. `requireRole(Role.ADMIN)` admits only admins; passing several
 * roles admits any of them.
 *
 * Compares against the role loaded from the database during resolveSession, not
 * against a role cached at login, so a demotion takes effect on the next request.
 */
export function requireRole(...allowed: Role[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const account = c.get("account")

    if (!account) {
      // Runs before requireAccount would have, so make the failure explicit.
      const token = bearerToken(c.req.header("Authorization"))
      if (!token) throw unauthorized()

      const session = await resolveSession(token)
      c.set("account", session)
      c.set("accountId", session.accountId)

      if (!allowed.includes(session.role)) {
        throw forbidden("Halaman ini hanya untuk staf hotel.")
      }
      await next()
      return
    }

    if (!allowed.includes(account.role)) {
      throw forbidden("Halaman ini hanya untuk staf hotel.")
    }

    await next()
  })
}

export function currentAccount(c: { get: (k: "account") => SessionAccount }): SessionAccount {
  const account = c.get("account")
  if (!account) throw unauthorized()
  return account
}