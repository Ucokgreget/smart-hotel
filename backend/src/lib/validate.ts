import { badRequest } from "./errors"

type FieldError = Record<string, string>

/**
 * Small hand written validator. Each endpoint declares its fields once and gets
 * typed values back, so a controller never reads an unchecked `any`.
 */
type Rule<T> = {
  parse: (raw: unknown) => T
}

export const rules = {
  string(opts: { min?: number; max?: number; trim?: boolean } = {}): Rule<string> {
    return {
      parse: (raw) => {
        if (typeof raw !== "string") throw new Error("harus berupa teks")
        const value = opts.trim === false ? raw : raw.trim()
        const min = opts.min ?? 1
        if (value.length < min) {
          throw new Error(min === 1 ? "wajib diisi" : `minimal ${min} karakter`)
        }
        if (opts.max !== undefined && value.length > opts.max) {
          throw new Error(`maksimal ${opts.max} karakter`)
        }
        return value
      },
    }
  },

  email(): Rule<string> {
    return {
      parse: (raw) => {
        if (typeof raw !== "string") throw new Error("wajib diisi")
        const value = raw.trim()
        if (!value) throw new Error("wajib diisi")
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) throw new Error("format email belum benar")
        return value.toLowerCase()
      },
    }
  },

  password(): Rule<string> {
    return {
      parse: (raw) => {
        if (typeof raw !== "string") throw new Error("wajib diisi")
        if (raw.length < 8) throw new Error("minimal 8 karakter")
        if (raw.length > 200) throw new Error("terlalu panjang")
        return raw
      },
    }
  },

  integer(): Rule<number> {
    return {
      parse: (raw) => {
        if (typeof raw !== "number" || !Number.isInteger(raw)) {
          throw new Error("harus berupa bilangan bulat")
        }
        if (raw <= 0) throw new Error("harus lebih besar dari nol")
        return raw
      },
    }
  },

  /**
   * Calendar date in YYYY-MM-DD. Parsed as UTC midnight so the stored value does
   * not drift with the server timezone.
   */
  date(): Rule<Date> {
    return {
      parse: (raw) => {
        if (typeof raw !== "string") throw new Error("wajib diisi")
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim())
        if (!match) throw new Error("format harus YYYY-MM-DD")

        const [, year, month, day] = match
        const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
        if (Number.isNaN(date.getTime())) throw new Error("tanggal tidak valid")

        // Rejects overflow such as 2026-02-31, which Date.UTC would roll over.
        if (date.getUTCMonth() !== Number(month) - 1 || date.getUTCDate() !== Number(day)) {
          throw new Error("tanggal tidak valid")
        }
        return date
      },
    }
  },

  roomId(): Rule<string> {
    return {
      parse: (raw) => {
        if (typeof raw !== "string") throw new Error("wajib diisi")
        const value = raw.trim().toUpperCase()
        if (!/^RM\d{3,}$/.test(value)) throw new Error("format id kamar tidak dikenal")
        return value
      },
    }
  },

  literal<T extends string>(allowed: readonly T[]): Rule<T> {
    return {
      parse: (raw) => {
        if (typeof raw !== "string") throw new Error("wajib diisi")
        const value = raw.trim().toUpperCase()
        if (!allowed.includes(value as T)) {
          throw new Error(`harus salah satu dari: ${allowed.join(", ")}`)
        }
        return value as T
      },
    }
  },
}

/**
 * Parses `input` with `schema`. Collects every field error before throwing so the
 * guest sees all problems at once instead of one per attempt.
 */
export function parse<S extends Record<string, Rule<unknown>>>(
  input: unknown,
  schema: S
): { [K in keyof S]: S[K] extends Rule<infer T> ? T : never } {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw badRequest("Isi permintaan harus berupa objek.")
  }

  const raw = input as Record<string, unknown>
  const fields: FieldError = {}
  const out: Record<string, unknown> = {}

  for (const key of Object.keys(schema) as (keyof S & string)[]) {
    try {
      out[key] = schema[key].parse(raw[key])
    } catch (error) {
      fields[key] = error instanceof Error ? error.message : "nilai tidak valid"
    }
  }

  if (Object.keys(fields).length > 0) {
    throw badRequest("Sebagian data perlu diperbaiki.", fields)
  }

  return out as { [K in keyof S]: S[K] extends Rule<infer T> ? T : never }
}

/** Nights between two UTC-midnight dates, at least one. */
export function nightsBetween(checkIn: Date, checkOut: Date): number {
  const ms = checkOut.getTime() - checkIn.getTime()
  return Math.round(ms / 86_400_000)
}
