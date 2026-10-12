/**
 * Thin client for the backend API.
 *
 * The session token lives in localStorage rather than an httpOnly cookie because
 * the backend speaks Bearer tokens. That is a deliberate trade-off: localStorage
 * is readable by any script on the page, while an httpOnly cookie would need the
 * backend to set cookies and use credentialed CORS. For this project's scope the
 * simpler option is fine, and the tradeoff is written down rather than hidden.
 */

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:3000"

const TOKEN_KEY = "smarthotel.token"

export type Role = "TAMU" | "ADMIN"

export type Session = {
  account_id: string
  email: string
  name: string
  role: Role
}

type Envelope<T> = {
  status: "success" | "error"
  message: string
  data?: T
  error?: { code: string; fields?: Record<string, string> }
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return
  if (token) window.localStorage.setItem(TOKEN_KEY, token)
  else window.localStorage.removeItem(TOKEN_KEY)
}

async function request<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {}
): Promise<T> {
  const { auth = true, headers, ...rest } = init
  const token = auth ? getToken() : null

  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  })

  let body: Envelope<T> | null = null
  try {
    body = (await res.json()) as Envelope<T>
  } catch {
    throw new ApiError(
      res.status,
      "BAD_RESPONSE",
      "Server tidak mengirim jawaban yang valid."
    )
  }

  if (!res.ok || body.status === "error") {
    throw new ApiError(
      res.status,
      body.error?.code ?? "UNKNOWN",
      body.message || "Terjadi kesalahan.",
      body.error?.fields
    )
  }

  return body.data as T
}

export const api = {
  login: (email: string, password: string) =>
    request<Session & { token: string }>("/api/auth/login", {
      method: "POST",
      auth: false,
      body: JSON.stringify({ email, password }),
    }),

  register: (input: {
    name: string
    email: string
    phone: string
    password: string
  }) =>
    request<Session & { token: string }>("/api/auth/register", {
      method: "POST",
      auth: false,
      body: JSON.stringify(input),
    }),

  me: () => request<Session>("/api/auth/me"),

  myReservations: () =>
    request<
      {
        reservation_id: string
        room_id: string
        room_type: string
        check_in: string
        check_out: string
        nights: number
        total_amount: number
        reservation_status: string
        payment_id: string | null
        payment_status: string | null
      }[]
    >("/api/account/reservations"),

  adminPayments: (status: "PENDING" | "PAID" | "FAILED" = "PENDING") =>
    request<
      {
        payment_id: string
        reservation_id: string
        room_id: string
        room_type: string
        guest_name: string
        guest_email: string
        check_in: string
        check_out: string
        amount: number
        payment_status: string
        created_at: string
      }[]
    >(`/api/admin/payments?status=${status}`),

  reconcile: (input: {
    payment_id: string
    reservation_id: string
    payment_status: "PAID" | "FAILED"
    paid_at: string
  }) =>
    request<{
      payment_id: string
      payment_status: string
      reservation_status: string
    }>("/api/payment/reconcile", {
      method: "POST",
      body: JSON.stringify(input),
    }),
}

export function rupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`)
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date)
}
