"use client"

import * as React from "react"
import { Check, X } from "lucide-react"

import { api, ApiError, formatDate, rupiah } from "@/lib/api"

type Payment = Awaited<ReturnType<typeof api.adminPayments>>[number]

type Filter = "PENDING" | "PAID" | "FAILED"

/**
 * Staff area. One job, which is the whole point of a scoped role: see which
 * payments are waiting and record what actually arrived.
 *
 * There is no automatic confirmation here, and there cannot be. A static QRIS
 * converted to dynamic is a request for payment, not a receipt, so someone has
 * to check the hotel's settlement report before pressing a button. That is why
 * this screen exists rather than the reservation confirming itself.
 */
export default function AdminPage() {
  const [filter, setFilter] = React.useState<Filter>("PENDING")
  // The result is stored together with the filter it belongs to, so switching
  // tabs can hide stale rows by comparison instead of clearing them with a
  // synchronous setState inside the effect.
  const [result, setResult] = React.useState<{
    filter: Filter
    rows: Payment[]
  } | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [working, setWorking] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false

    // Every setState here happens in a promise callback, never synchronously in
    // the effect body.
    api.adminPayments(filter).then(
      (rows) => {
        if (cancelled) return
        setResult({ filter, rows })
        setError(null)
      },
      (err: unknown) => {
        if (cancelled) return
        setResult(null)
        setError(
          err instanceof ApiError
            ? err.message
            : "Gagal memuat daftar pembayaran."
        )
      }
    )

    return () => {
      cancelled = true
    }
  }, [filter])

  // Derived, not stored: rows for the current tab, or null while they load.
  const payments = result && result.filter === filter ? result.rows : null
  const loading = payments === null && error === null

  async function settle(payment: Payment, outcome: "PAID" | "FAILED") {
    setWorking(payment.payment_id)
    setError(null)
    try {
      await api.reconcile({
        payment_id: payment.payment_id,
        reservation_id: payment.reservation_id,
        payment_status: outcome,
        paid_at: new Date().toISOString(),
      })
      const rows = await api.adminPayments(filter)
      setResult({ filter, rows })
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Gagal menyimpan status pembayaran."
      )
    } finally {
      setWorking(null)
    }
  }

  const filters: Filter[] = ["PENDING", "PAID", "FAILED"]

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-[-0.02em] md:text-3xl">
          Pembayaran masuk
        </h1>
        <p className="max-w-[58ch] text-sm leading-6 text-background/70">
          Status pembayaran tidak pernah berubah sendiri. Cek laporan QRIS
          hotel, lalu catat hasilnya di sini.
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Saring status pembayaran"
        className="mt-8 flex gap-2"
      >
        {filters.map((value) => (
          <button
            key={value}
            role="tab"
            type="button"
            aria-selected={filter === value}
            onClick={() => setFilter(value)}
            className={[
              "min-h-11 rounded-none border px-4 font-mono text-xs transition-colors",
              filter === value
                ? "border-background bg-background text-foreground"
                : "border-white/20 text-background/70 hover:border-background/60 hover:text-background",
            ].join(" ")}
          >
            {value}
          </button>
        ))}
      </div>

      <section className="mt-6">
        {error ? (
          <p
            role="alert"
            className="border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-background"
          >
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-background/60">Memuat pembayaran</p>
        ) : null}

        {!error && payments !== null && payments.length === 0 ? (
          <p className="border border-white/10 px-3 py-6 text-sm text-background/60">
            Tidak ada pembayaran dengan status {filter}.
          </p>
        ) : null}

        {payments && payments.length > 0 ? (
          <ul className="flex flex-col">
            {payments.map((payment) => (
              <li
                key={payment.payment_id}
                className="grid gap-4 border-t border-white/10 py-5 md:grid-cols-[1fr_auto] md:items-center"
              >
                <div className="flex flex-col gap-1">
                  <p className="font-mono text-xs text-background/60">
                    {payment.payment_id} · {payment.reservation_id} ·{" "}
                    {payment.room_type}
                  </p>
                  <p className="text-sm">{payment.guest_name}</p>
                  <p className="text-sm text-background/70">
                    {formatDate(payment.check_in)} sampai{" "}
                    {formatDate(payment.check_out)} · {rupiah(payment.amount)}
                  </p>
                </div>

                {payment.payment_status === "PENDING" ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={working === payment.payment_id}
                      onClick={() => void settle(payment, "PAID")}
                      className="text-on-accent inline-flex min-h-11 items-center gap-2 rounded-none bg-accent px-4 text-sm font-medium transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background disabled:opacity-50"
                    >
                      <Check aria-hidden className="size-4" />
                      Sudah dibayar
                    </button>
                    <button
                      type="button"
                      disabled={working === payment.payment_id}
                      onClick={() => void settle(payment, "FAILED")}
                      className="inline-flex min-h-11 items-center gap-2 rounded-none border border-white/25 px-4 text-sm transition-colors hover:border-white/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background disabled:opacity-50"
                    >
                      <X aria-hidden className="size-4" />
                      Gagal
                    </button>
                  </div>
                ) : (
                  <span className="font-mono text-xs text-background/60">
                    {payment.payment_status}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </main>
  )
}
