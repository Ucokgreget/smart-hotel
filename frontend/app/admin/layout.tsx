"use client"

import Link from "next/link"

import { useRequireRole } from "@/hooks/useSession"

/**
 * Layout for the staff area. A separate tree from /account so a guest cannot
 * render anything from here, and so the API gate and the UI gate are two
 * independent checks rather than one.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { session, loading, signOut } = useRequireRole("ADMIN")

  if (loading || !session) {
    return (
      <main className="grid min-h-[100dvh] place-content-center bg-foreground px-6 text-background">
        Memuat panel staf
      </main>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-foreground text-background">
      <header className="border-b border-white/10">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <div className="flex items-baseline gap-3">
            <p className="font-heading text-base font-semibold tracking-[-0.02em]">
              Smart Hotel
            </p>
            <p className="font-mono text-xs tracking-[0.18em] text-background/60 uppercase">
              Panel staf
            </p>
          </div>
          <nav
            aria-label="Menu staf"
            className="flex items-center gap-6 text-sm"
          >
            <span className="text-background/60">{session.name}</span>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center text-background/70 transition-colors hover:text-background focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-background"
            >
              Lihat situs
            </Link>
            <button
              type="button"
              onClick={signOut}
              className="inline-flex min-h-11 items-center font-medium transition-colors hover:text-background focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-background"
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
