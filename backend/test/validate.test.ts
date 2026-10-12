import { describe, expect, test } from "bun:test"

import { HttpError } from "../src/lib/errors"
import { nightsBetween, parse, rules } from "../src/lib/validate"

describe("rules.email", () => {
  test("normalises to lowercase and trims", () => {
    expect(rules.email().parse("  Tamu@Email.COM ")).toBe("tamu@email.com")
  })

  test.each([
    ["tamu", "bukan email"],
    ["tamu@", "tanpa domain"],
    ["tamu@email", "tanpa titik"],
    ["tamu@.com", "domain kosong"],
    ["", "kosong"],
  ])("rejects %s (%s)", (value) => {
    expect(() => rules.email().parse(value)).toThrow()
  })
})

describe("rules.date", () => {
  test("parses YYYY-MM-DD as UTC midnight", () => {
    const date = rules.date().parse("2026-10-10")
    expect(date.toISOString()).toBe("2026-10-10T00:00:00.000Z")
  })

  test("rejects a format with slashes", () => {
    expect(() => rules.date().parse("10/10/2026")).toThrow("format harus YYYY-MM-DD")
  })

  test("rejects a day that would overflow the month", () => {
    // Date.UTC silently rolls 2026-02-31 over to 3 March; the extra comparison
    // is what catches it.
    expect(() => rules.date().parse("2026-02-31")).toThrow("tanggal tidak valid")
    expect(() => rules.date().parse("2026-13-01")).toThrow()
  })

  test("accepts a leap day in a leap year", () => {
    expect(rules.date().parse("2028-02-29").toISOString()).toBe("2028-02-29T00:00:00.000Z")
  })
})

describe("rules.integer", () => {
  test("accepts a positive integer", () => {
    expect(rules.integer().parse(1000000)).toBe(1000000)
  })

  test("rejects zero, negatives, fractions, and strings", () => {
    expect(() => rules.integer().parse(0)).toThrow()
    expect(() => rules.integer().parse(-5)).toThrow()
    expect(() => rules.integer().parse(10.5)).toThrow()
    expect(() => rules.integer().parse("1000")).toThrow()
  })
})

describe("rules.roomId", () => {
  test("uppercases and validates the shape", () => {
    expect(rules.roomId().parse("rm101")).toBe("RM101")
  })

  test("rejects anything that is not RM followed by digits", () => {
    expect(() => rules.roomId().parse("101")).toThrow()
    expect(() => rules.roomId().parse("RM-101")).toThrow()
    expect(() => rules.roomId().parse("RMABC")).toThrow()
  })
})

describe("rules.literal", () => {
  test("accepts a known value case insensitively", () => {
    expect(rules.literal(["QRIS"] as const).parse("qris")).toBe("QRIS")
  })

  test("rejects an unknown value", () => {
    expect(() => rules.literal(["QRIS"] as const).parse("CARD")).toThrow(/harus salah satu/)
  })
})

describe("rules.password", () => {
  test("enforces the minimum length", () => {
    expect(() => rules.password().parse("short")).toThrow("minimal 8 karakter")
    expect(rules.password().parse("longenough")).toBe("longenough")
  })

  test("does not trim, spaces are part of the password", () => {
    expect(rules.password().parse("  spaces  ")).toBe("  spaces  ")
  })
})

describe("parse", () => {
  test("collects every field error in one pass", () => {
    const schema = {
      email: rules.email(),
      room_id: rules.roomId(),
      check_in: rules.date(),
    }

    try {
      parse({ email: "bukan", room_id: "101" }, schema)
      throw new Error("parse should have thrown")
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError)
      const http = error as HttpError
      expect(http.status).toBe(400)
      expect(Object.keys(http.fields ?? {}).sort()).toEqual(["check_in", "email", "room_id"])
    }
  })

  test("rejects a non-object body", () => {
    expect(() => parse("nope", { email: rules.email() })).toThrow(HttpError)
    expect(() => parse([1, 2], { email: rules.email() })).toThrow(HttpError)
    expect(() => parse(null, { email: rules.email() })).toThrow(HttpError)
  })

  test("returns typed values when everything passes", () => {
    const out = parse(
      { email: "Tamu@Email.com", room_id: "rm101", check_in: "2026-10-10" },
      { email: rules.email(), room_id: rules.roomId(), check_in: rules.date() }
    )

    expect(out.email).toBe("tamu@email.com")
    expect(out.room_id).toBe("RM101")
    expect(out.check_in.toISOString()).toBe("2026-10-10T00:00:00.000Z")
  })
})

describe("nightsBetween", () => {
  test("matches the proposal's two night example", () => {
    const checkIn = rules.date().parse("2026-10-10")
    const checkOut = rules.date().parse("2026-10-12")
    expect(nightsBetween(checkIn, checkOut)).toBe(2)
  })

  test("crosses a month boundary", () => {
    const checkIn = rules.date().parse("2026-10-28")
    const checkOut = rules.date().parse("2026-11-02")
    expect(nightsBetween(checkIn, checkOut)).toBe(5)
  })

  test("is zero for a same day stay", () => {
    const day = rules.date().parse("2026-10-10")
    expect(nightsBetween(day, day)).toBe(0)
  })
})
