"use client"

import { useRouter } from "next/navigation"
import * as React from "react"

import { api, ApiError, getToken, setToken, type Session } from "@/lib/api"

/**
 * Asks the backend who the stored token belongs to.
 *
 * Kept outside the hook and free of setState on purpose: the role that comes
 * back is the one the server believes right now, so a demoted admin sees the
 * change without waiting for the token to expire.
 */
async function fetchSession(): Promise<Session | null> {
  if (!getToken()) return null

  try {
    return await api.me()
  } catch (error) {
    // An expired or role-stale token is not an error worth showing, it just
    // means signed out.
    if (error instanceof ApiError && error.status === 401) setToken(null)
    return null
  }
}

export function useSession() {
  const router = useRouter()
  const [session, setSession] = React.useState<Session | null>(null)
  // With no stored token there is nothing to resolve, so the session starts
  // settled rather than loading.
  const [loading, setLoading] = React.useState(() => Boolean(getToken()))

  // Imperative refresh, for use from event handlers.
  const refresh = React.useCallback(async () => {
    const me = await fetchSession()
    setSession(me)
    setLoading(false)
    return me
  }, [])

  React.useEffect(() => {
    if (!getToken()) return

    // State is only ever set inside the promise callback, never synchronously in
    // the effect body, which would cascade a render on every mount.
    let cancelled = false
    fetchSession().then((me) => {
      if (cancelled) return
      setSession(me)
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [])

  const signOut = React.useCallback(() => {
    setToken(null)
    setSession(null)
    router.push("/login")
  }, [router])

  return { session, loading, refresh, signOut }
}

/**
 * Gate for a route tree. Sends anyone without the required role back to the
 * right place instead of rendering the page and letting the API answer 403.
 */
export function useRequireRole(role: "TAMU" | "ADMIN") {
  const { session, loading, signOut } = useSession()
  const router = useRouter()

  React.useEffect(() => {
    if (loading) return

    if (!session) {
      router.replace(`/login?next=${role === "ADMIN" ? "/admin" : "/account"}`)
      return
    }

    // Admins can use the admin area. The account area is for guests, so an
    // admin is sent to the admin home rather than shown an empty booking list.
    if (role === "TAMU" && session.role === "ADMIN") {
      router.replace("/admin")
      return
    }

    if (role === "ADMIN" && session.role !== "ADMIN") {
      router.replace("/account")
    }
  }, [loading, session, role, router])

  // signOut is returned so a guarded tree does not have to call useSession a
  // second time, which would start a duplicate session fetch.
  return { session, loading, signOut }
}
