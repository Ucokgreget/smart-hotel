"use client"

import Link from "next/link"

import { useRequireRole } from "@/hooks/useSession"

/**
 * Layout for the guest area. Separate from /admin on purpose: a staff-only
 * component cannot be reached by a guest because it is not in this tree at all.
 */
export default function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { session, loading, signOut } = useRequireRole("TAMU")

  if (loading || !session) {
    return (
      <main className="grid min-h-[100dvh] place-content-center bg-background px-6 text-muted-foreground">
        Memuat akun kamu
      </main>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link
            href="/"
            className="font-heading text-base font-semibold tracking-[-0.02em]"
          >
            Smart Hotel
          </Link>
          <nav
            aria-label="Menu akun"
            className="flex items-center gap-6 text-sm"
          >
            <span className="text-muted-foreground">{session.name}</span>
            <button
              type="button"
              onClick={signOut}
              className="inline-flex min-h-11 items-center font-medium transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            >
              Keluar
            </button>
          </nav>
        </div>
      </header>
      {children}
    </div>
  )
}
