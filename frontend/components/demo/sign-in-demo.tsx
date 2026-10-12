"use client"

import { useRouter } from "next/navigation"

import { SignInPage } from "@/components/ui/sign-in"
import { api, setToken } from "@/lib/api"

/**
 * Calls the real backend. An earlier version simulated the call with a timeout
 * and showed a notice saying no server was connected, because the API did not
 * exist yet. There is no simulation left here: either the backend accepts the
 * credentials or the error reaches the form as it came back.
 *
 * The page owns routing, the component owns validation and error display, so
 * this file stays a thin adapter between the two.
 */
export function SignInDemo({ next }: { next?: string }) {
  const router = useRouter()

  async function handleSignIn(credentials: {
    email: string
    password: string
  }) {
    const result = await api.login(credentials.email, credentials.password)
    setToken(result.token)

    // Honour ?next= only for a local path, so a crafted link cannot bounce
    // someone off-site after signing in.
    const destination =
      next && next.startsWith("/") && !next.startsWith("//")
        ? next
        : result.role === "ADMIN"
          ? "/admin"
          : "/account"

    router.push(destination)
    router.refresh()
  }

  return (
    <SignInPage
      heroImageSrc="https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1400&q=80"
      heroImageAlt="Kamar hotel dengan tempat tidur ganda dan lampu meja"
      heroCaption="Lihat kamar yang tersedia, pesan, lalu bayar."
      onSignIn={handleSignIn}
    />
  )
}

export default SignInDemo
