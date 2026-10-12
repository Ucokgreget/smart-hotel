"use client"

import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react"
import Image from "next/image"
import { useRef } from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

const GRID_OVERLAY =
  "pointer-events-none absolute inset-0 opacity-[0.07] [mask-image:radial-gradient(ellipse_65%_55%_at_50%_0%,#000_70%,transparent_100%)] bg-[size:56px_56px]"

const GRID_LINES =
  "bg-[linear-gradient(to_right,var(--foreground)_1px,transparent_1px),linear-gradient(to_bottom,var(--foreground)_1px,transparent_1px)]"

interface PanelProps {
  progress: MotionValue<number>
  /** Scroll-linked transforms are skipped when the guest asked for less motion. */
  calm: boolean
}

/**
 * Sample payload from the proposal's room availability design.
 * Rendered as sample data and labelled as such in the panel caption.
 */
const SAMPLE_ROOMS = [
  {
    id: "RM101",
    type: "Deluxe",
    price: "Rp500.000",
    image:
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=900&q=80",
    alt: "Kamar tipe Deluxe dengan tempat tidur dua orang",
  },
  {
    id: "RM102",
    type: "Suite",
    price: "Rp750.000",
    image:
      "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=900&q=80",
    alt: "Kamar tipe Suite dengan ruang tamu terpisah",
  },
] as const

/** Sample reservation record from the proposal's reservation design. */
const SAMPLE_RESERVATION = [
  { key: "check_in", value: "2026-10-10" },
  { key: "check_out", value: "2026-10-12" },
  { key: "total", value: "Rp1.000.000" },
] as const

function StatusChip({ status }: { status: string }) {
  const available = status === "available"
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-none px-2 font-mono text-[13px] font-medium",
        // Dark label on a tinted surface. Accent green as a fill would sit at
        // 3.4:1 against white, which fails AA at this size.
        available
          ? "bg-accent/15 text-foreground"
          : "bg-secondary/20 text-foreground"
      )}
    >
      {available ? "Tersedia" : status}
    </span>
  )
}

function GridOverlay({ className }: { className?: string }) {
  return <div aria-hidden className={cn(GRID_OVERLAY, GRID_LINES, className)} />
}

/**
 * Panel 1 pins to the top of the viewport and pulls back as the guest scrolls,
 * which is the moment the interface stops being a landing page and becomes a
 * status view.
 */
function AvailabilityPanel({ progress, calm }: PanelProps) {
  const scale = useTransform(progress, [0, 1], [1, 0.8])
  const rotate = useTransform(progress, [0, 1], [0, -5])

  return (
    <motion.section
      style={{ scale: calm ? 1 : scale, rotate: calm ? 0 : rotate }}
      className="sticky top-0 flex h-[calc(100dvh-4rem)] flex-col items-center justify-center bg-[linear-gradient(to_bottom,var(--muted),var(--background))] px-6 text-foreground"
    >
      <GridOverlay />

      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center gap-5 text-center">
        <h1 className="text-4xl leading-[1.05] font-semibold tracking-[-0.03em] text-balance md:text-6xl">
          Pilih kamar, bayar sekali, langsung terkonfirmasi
        </h1>
        <p className="max-w-[46ch] text-base leading-7 text-muted-foreground">
          Pilih kamar yang masih kosong, pesan, lalu selesaikan pembayaran. Kamu
          tidak perlu menunggu konfirmasi dari staf.
        </p>
      </div>

      <div className="absolute inset-x-0 bottom-8 z-10 flex flex-col items-center gap-2 text-muted-foreground">
        <span className="font-mono text-xs tracking-[0.18em] uppercase">
          Gulir
        </span>
        <ChevronDown aria-hidden className="animate-scroll-cue size-4" />
      </div>
    </motion.section>
  )
}

/**
 * Panel 2 rides up over the shrinking panel 1 and answers the guest question the
 * first panel raised: which rooms are on offer, and what does a payment record
 * look like once the reservation exists.
 */
function RoomsPanel({ progress, calm }: PanelProps) {
  const scale = useTransform(progress, [0, 1], [0.8, 1])
  const rotate = useTransform(progress, [0, 1], [5, 0])

  return (
    <motion.section
      style={{ scale: calm ? 1 : scale, rotate: calm ? 0 : rotate }}
      className="relative flex min-h-[calc(100dvh-4rem)] items-center overflow-hidden bg-[linear-gradient(to_bottom,var(--surface-night),var(--foreground))] px-6 py-14 text-background md:py-20"
    >
      <GridOverlay />

      <div className="relative z-10 mx-auto w-full max-w-6xl">
        <div className="flex flex-col gap-3">
          <h2 className="text-2xl font-semibold tracking-[-0.02em] md:text-4xl">
            Cek kamar sebelum memesan
          </h2>
          <p className="max-w-[52ch] text-base leading-7 text-muted-foreground">
            Daftar kamar di bawah untuk tanggal 10 sampai 12 Oktober 2026.
          </p>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-12">
          {SAMPLE_ROOMS.map((room) => (
            <article
              key={room.id}
              className="overflow-hidden rounded-xl border border-white/15 bg-card text-card-foreground lg:col-span-4"
            >
              <Image
                src={room.image}
                alt={room.alt}
                width={900}
                height={675}
                sizes="(max-width: 1024px) 100vw, 33vw"
                className="aspect-4/3 w-full object-cover"
              />
              <div className="flex flex-col gap-2 p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-mono text-xs text-muted-foreground">
                    {room.id}
                  </span>
                  <StatusChip status="available" />
                </div>
                <h3 className="text-lg font-semibold tracking-[-0.01em]">
                  {room.type}
                </h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  {room.price} per malam
                </p>
              </div>
            </article>
          ))}

          <article className="flex flex-col gap-3 rounded-xl border border-white/15 bg-card p-4 text-card-foreground lg:col-span-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-mono text-xs text-muted-foreground">RSV001</p>
              <span className="inline-flex h-6 items-center rounded-none bg-secondary/20 px-2 font-mono text-[13px] font-medium text-foreground">
                Menunggu pembayaran
              </span>
            </div>
            <h3 className="text-lg font-semibold tracking-[-0.01em]">
              Bukti reservasi
            </h3>
            <p className="text-sm leading-6 text-muted-foreground">
              Detail ini yang kamu bawa saat check-in, lengkap dengan nomor
              kamar dan total yang harus dibayar.
            </p>
            <dl className="mt-2 flex flex-col gap-1 border-t border-foreground/10 pt-3 font-mono text-xs">
              {SAMPLE_RESERVATION.map((row) => (
                <div key={row.key} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{row.key}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          </article>
        </div>

        <p className="mt-6 max-w-[62ch] text-sm leading-6 text-background/70">
          Kamar dan harga di atas adalah contoh data, bukan ketersediaan hari
          ini. Kamar yang benar-benar tersedia mengikuti tanggal check-in dan
          check-out yang kamu pilih.
        </p>
      </div>
    </motion.section>
  )
}

/**
 * Resolution of the scene. The giant word is the product payoff: the reservation
 * reaches CONFIRMED because the gateway reported PAID, and nothing had to be
 * retyped.
 */
function ConfirmationBeat() {
  return (
    <div className="bg-foreground px-6 text-background">
      <div className="mx-auto max-w-6xl">
        <p className="bg-gradient-to-r from-background via-background to-muted-foreground bg-clip-text pt-12 text-center text-[clamp(3rem,15vw,11rem)] leading-[0.85] font-semibold tracking-[-0.05em] text-transparent uppercase">
          Confirmed
        </p>
        <p className="mx-auto max-w-[54ch] pt-4 pb-16 text-center text-sm leading-6 text-background/70">
          Begitu pembayaranmu tercatat berhasil, reservasi berubah menjadi
          terkonfirmasi dengan sendirinya.
        </p>
      </div>
    </div>
  )
}

function HeroScrollAnimation() {
  const container = useRef<HTMLDivElement>(null)
  const calm = !!useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: container,
    offset: ["start start", "end end"],
  })

  return (
    <>
      <div
        ref={container}
        className="relative scroll-mt-16 bg-foreground"
        id="kamar"
      >
        <AvailabilityPanel progress={scrollYProgress} calm={calm} />
        <RoomsPanel progress={scrollYProgress} calm={calm} />
      </div>
      <ConfirmationBeat />
    </>
  )
}

export default HeroScrollAnimation
