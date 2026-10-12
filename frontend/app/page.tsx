import Link from "next/link"

import { HeroScrollDemo } from "@/components/demo/hero-scroll-demo"

/**
 * Guest journey from the proposal, section 7, written for a guest rather than
 * for a reader of the integration design. No backend vocabulary on this page.
 */
const BOOKING_STEPS = [
  {
    step: "01",
    title: "Daftar akun",
    body: "Isi nama, email, nomor telepon, dan kata sandi.",
  },
  {
    step: "02",
    title: "Masuk",
    body: "Akun yang sudah terdaftar langsung bisa dipakai untuk memesan.",
  },
  {
    step: "03",
    title: "Cari kamar",
    body: "Tentukan tanggal check-in dan check-out, lalu lihat kamar yang tersedia.",
  },
  {
    step: "04",
    title: "Pilih kamar",
    body: "Tipe kamar dan harga per malam ditampilkan lengkap sebelum kamu memilih.",
  },
  {
    step: "05",
    title: "Pesan dan bayar",
    body: "Reservasi tersimpan dengan status menunggu pembayaran, lalu selesaikan pembayaran.",
  },
  {
    step: "06",
    title: "Terkonfirmasi",
    body: "Pembayaran berhasil membuat reservasi terkonfirmasi tanpa perlu dicatat ulang.",
  },
] as const

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <p className="font-heading text-base font-semibold tracking-[-0.02em]">
          Smart Hotel
        </p>
        <nav aria-label="Bagian halaman">
          <ul className="flex items-center gap-6 text-sm">
            <li>
              <a
                href="#kamar"
                className="inline-flex min-h-11 items-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
              >
                Kamar
              </a>
            </li>
            <li>
              <a
                href="#alur"
                className="inline-flex min-h-11 items-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
              >
                Cara memesan
              </a>
            </li>
            <li>
              <Link
                href="/login"
                className="inline-flex min-h-11 items-center font-medium text-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
              >
                Masuk
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  )
}

function BookingSteps() {
  return (
    <section
      id="alur"
      className="scroll-mt-16 bg-background px-6 py-16 md:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-3">
          <p className="font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">
            Cara memesan
          </p>
          <h2 className="max-w-[22ch] text-2xl font-semibold tracking-[-0.02em] md:text-4xl">
            Enam langkah dari akun sampai kamar
          </h2>
        </div>

        <ol className="mt-12 grid gap-x-12 md:grid-cols-2">
          {BOOKING_STEPS.map((item) => (
            <li
              key={item.step}
              className="flex flex-col gap-2 border-t border-border py-6"
            >
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-xs text-primary">
                  {item.step}
                </span>
                <h3 className="text-lg font-semibold tracking-[-0.01em]">
                  {item.title}
                </h3>
              </div>
              <p className="max-w-[46ch] text-sm leading-6 text-muted-foreground">
                {item.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background px-6 py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <p className="font-heading text-base font-semibold tracking-[-0.02em]">
            Smart Hotel
          </p>
          <p className="max-w-[44ch] text-sm leading-6 text-muted-foreground">
            Sistem reservasi kamar dengan pembayaran terintegrasi. Proposal
            project, Kelompok 1.
          </p>
        </div>
        <p className="font-mono text-xs leading-5 text-muted-foreground">
          Halaman pemesanan kamar
        </p>
      </div>
    </footer>
  )
}

export default function Page() {
  return (
    <>
      <Nav />
      <main>
        <HeroScrollDemo />
        <BookingSteps />
      </main>
      <SiteFooter />
    </>
  )
}
