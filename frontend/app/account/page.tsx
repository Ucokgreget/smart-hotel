"use client"

import * as React from "react"

import { useSession } from "@/hooks/useSession"
import { api, ApiError, formatDate, rupiah } from "@/lib/api"

type Reservation = Awaited<ReturnType<typeof api.myReservations>>[number]

/**
 * The guest area. Scoped to what a guest can actually do today: see who they are
 * and find their own bookings. Room search and booking are not here yet, so this
 * page says so rather than showing an empty table with no explanation.
 */
export default function AccountPage() {
  const { session } = useSession()
  const [reservations, setReservations] = React.useState<Reservation[] | null>(
    null
  )
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false

    api
      .myReservations()
      .then((rows) => {
        if (!cancelled) setReservations(rows)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof ApiError
            ? err.message
            : "Gagal memuat daftar reservasi."
        )
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-[-0.02em] md:text-3xl">
          Halo, {session?.name}
        </h1>
        <p className="max-w-[52ch] text-sm leading-6 text-muted-foreground">
          Ini daftar reservasi yang tercatat atas nama {session?.email}.
        </p>
      </div>

      <section className="mt-10">
        {error ? (
          <p
            role="alert"
            className="border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}

        {!error && reservations === null ? (
          <p className="text-sm text-muted-foreground">Memuat reservasi</p>
        ) : null}

        {!error && reservations !== null && reservations.length === 0 ? (
          <div className="border border-border p-6">
            <p className="text-sm font-medium">Belum ada reservasi</p>
            <p className="mt-2 max-w-[48ch] text-sm leading-6 text-muted-foreground">
              Kamu belum memesan kamar. Halaman pencarian kamar belum tersedia,
              jadi pemesanan belum bisa dilakukan dari sini.
            </p>
          </div>
        ) : null}

        {reservations && reservations.length > 0 ? (
          <ul className="flex flex-col">
            {reservations.map((r) => (
              <li
                key={r.reservation_id}
                className="grid gap-2 border-t border-border py-5 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div className="flex flex-col gap-1">
                  <p className="font-mono text-xs text-muted-foreground">
                    {r.reservation_id} · {r.room_type}
                  </p>
                  <p className="text-sm">
                    {formatDate(r.check_in)} sampai {formatDate(r.check_out)} ·{" "}
                    {r.nights} malam
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {rupiah(r.total_amount)}
                  </p>
                </div>
                <div className="flex gap-3 text-xs">
                  <span className="rounded-none bg-muted px-2 py-1 font-mono">
                    {r.reservation_status}
                  </span>
                  <span className="rounded-none bg-muted px-2 py-1 font-mono">
                    {r.payment_status ?? "BELUM BAYAR"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </main>
  )
}
