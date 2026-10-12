# Smart Hotel — Backend

Hono + Prisma ORM 7 on Bun. Holds the hotel side of the integration described in
the proposal: room inventory, reservations, and the two-way payment exchange with
a gateway.

## What is here

```
prisma/
  schema.prisma      six models, one per entity in the proposal's data table
  seed.ts            RM101 and RM102 come from the proposal, the rest are samples
prisma.config.ts     Prisma CLI config. Migrations use DIRECT_URL
src/
  server.ts          Bun entry point, opens the port
  index.ts           Hono app, middleware, and route mounting
  db.ts              PrismaClient singleton on the pg driver adapter
  env.ts             environment validation, fails fast on boot
  lib/
    auth.ts          sign and verify the guest session token
    envelope.ts      the response shape used across every endpoint
    errors.ts        HttpError and its helpers
    validate.ts      field rules and the multi-error parser
  middleware/
    auth.ts          attachGuest and requireGuest
    error.ts         one place that turns anything thrown into the envelope
  modules/           one file per endpoint group
  services/
    booking.ts       availability, reservations, payments, callback
    payment-gateway.ts   the gateway interface, shared HMAC, mock adapter
    qris-gateway.ts      real adapter over the qris-dinamis library
    gateway-registry.ts   picks the adapter, keeps the import graph acyclic
test/                84 tests, none of which need a database
```

## Environment

```sh
bun install
cp .env.example .env.local     # then fill in the real values
bun run db:migrate             # needs DIRECT_URL
bun run db:seed
bun run dev
```

`.env.local` holds two connection strings and they are not interchangeable:

| Variable | Port | Used by |
| --- | --- | --- |
| `DATABASE_URL` | 6543, transaction mode | the running application |
| `DIRECT_URL` | 5432, session mode | the Prisma CLI, for migrations |

The rest:

| `JWT_SECRET` | always | signs guest session tokens |
| `PAYMENT_GATEWAY_MODE` | always | `mock` or `qris` |
| `PAYMENT_GATEWAY_WEBHOOK_SECRET` | callback auth | HMAC key |
| `QRIS_STATIC_CODE` | `qris` mode | the hotel's static QRIS string |
| `PUBLIC_BASE_URL` | `qris` mode | origin guests open to pay |
| `ADMIN_EMAIL` | seed only | the first ADMIN account |
| `ADMIN_PASSWORD` | seed only | its password |

`src/env.ts` refuses to boot while any required value is missing or still contains
an `[YOUR-...]` marker, so a half-filled file fails immediately instead of at the
first query.

## Roles

Two roles, on the `account` table:

| Role | Can do |
| --- | --- |
| `TAMU` | book, view own reservations, pay |
| `ADMIN` | settle payments, list all payments |

Registration always creates `TAMU`. There is no way to register as an admin: the
first one comes from `prisma/seed.ts` using `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

An earlier version guarded the reconcile route with a shared `ADMIN_API_KEY`
header. That is gone. A shared secret cannot say *who* settled a payment, so staff
identity is now the authorisation. Re-running the seed bumps `tokenVersion`, which
immediately invalidates any admin session signed with the old password.

The role travels inside the JWT so the common path needs no extra query, but it is
never trusted on its own: `resolveSession` compares the token's role and
`tokenVersion` against the stored row on every authenticated request. A demoted
admin loses access on their next request instead of staying privileged for the
remaining 12 hours.

Gate helpers live in `src/middleware/auth.ts` and use `createMiddleware` from
`hono/factory`:

```ts
app.use("/api/admin/*", requireRole(Role.ADMIN))
app.use("/api/account/*", requireAccount)   // any signed-in role, own rows only
```

## Commands

```sh
bun run dev          # hot reload on $PORT
bun run typecheck    # tsc --noEmit
bun test             # 62 tests, no database required
bun run db:generate  # regenerate the client after a schema change
bun run db:migrate   # create and apply a migration
bun run db:studio    # browse the data
```

## Endpoints

The five paths in the proposal's table, unchanged:

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/rooms` | available rooms for a date range |
| POST | `/api/reservations` | creates the reservation, status PENDING |
| POST | `/api/payments` | Request-Reply out to the gateway |
| POST | `/api/payment/callback` | Webhook/Callback in from a gateway |
| GET | `/api/payments/{payment_id}` | current payment state |

Added by this project, because the proposal's business process needs them but its
endpoint table does not list them:

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/auth/register` | name, email, phone, password; always TAMU |
| POST | `/api/auth/login` | returns a session token and the role |
| GET | `/api/auth/me` | who is signed in, with the role the server believes now |
| GET | `/api/account/reservations` | the signed-in account's own bookings |
| GET | `/api/admin/payments` | staff only, filter by status |
| GET | `/pay/{payment_id}` | guest facing payment page, returns the dynamic QRIS |
| POST | `/api/payment/reconcile` | staff only, settles a QRIS payment by hand |
| GET | `/health` | liveness, gateway mode, pooler host |

`/api/admin/*` and `/api/payment/reconcile` require the `ADMIN` role. Everything
under `/api/account/*` accepts any signed-in role but only ever returns that
account's own rows.

## Responses

Every endpoint answers with the proposal's envelope:

```json
{ "status": "success", "message": "...", "data": { } }
```

Failures keep the same outer shape and add a machine readable code:

```json
{
  "status": "error",
  "message": "Sebagian data perlu diperbaiki.",
  "error": { "code": "BAD_REQUEST", "fields": { "check_in": "format harus YYYY-MM-DD" } }
}
```

`fields` collects every problem in one pass, so a form can show all of its errors
at once.

## The payment integration

### What the gateway is, and what it is not

The gateway is [`qris-dinamis`](../qris-dinamis), a local library. It converts the
hotel's own **static QRIS** string into a **dynamic** one carrying a reservation's
exact total, so the guest scans and pays the right number instead of typing it in.

Read this part carefully, because it shapes the whole design:

> Converting a QRIS payload is a **request** for payment, not a **confirmation**
> of payment. The QRIS standard has no push and no webhook, so nothing in this
> library, and nothing in the spec, will ever tell the hotel "this guest paid".

The proposal's second pattern, Webhook/Callback, is therefore **not satisfiable by
this gateway alone**. `POST /api/payment/callback` is built and verified, and it is
wired for a future real provider, but in this deployment it is not what confirms a
payment.

### How a payment actually gets confirmed

A staff member checks the hotel's own QRIS settlement report or banking app, then
records the result:

```
POST /api/payment/reconcile
X-Admin-Key: <ADMIN_API_KEY>

{ "payment_id": "PAY001", "reservation_id": "RSV001",
  "payment_status": "PAID", "paid_at": "2026-10-10T14:30:00Z" }
```

That body takes exactly the fields a real gateway would post, and it runs through
the same `applyPaymentCallback()` as the webhook route. When a real provider is
added, delete `/api/payment/reconcile` and `/api/payment/callback` and nothing else
changes. Being the one manual step here is honest, not a shortcut: the alternative
is simulating a payment event that never happened.

### Request-Reply, the half that does work

`POST /api/payments` creates a `transaction` row, converts the QRIS, then writes
the returned `payment` row. The two database transactions are deliberately separate
so no pool connection is held open across a call to a third party. If conversion
fails, the transaction row survives without a payment and the request can be
retried.

The guest's payment URL is `${PUBLIC_BASE_URL}/pay/{payment_id}`, and
`GET /pay/{payment_id}` rebuilds the dynamic QRIS **on every request from the amount
stored on the payment row**, never from anything the caller sends. A guest cannot
alter what they are asked to pay.

The `amount` in the request body is checked against the stored reservation total and
rejected on mismatch. The charge always comes from the stored total.

### Switching mode

| `PAYMENT_GATEWAY_MODE` | Behaviour |
| --- | --- |
| `mock` | placeholder URLs, no real QRIS, used by tests |
| `qris` | real conversion via `qris-dinamis`; needs `QRIS_STATIC_CODE` and `PUBLIC_BASE_URL` |

`env.ts` refuses to boot in `qris` mode when either is missing or still an unfilled
`[YOUR-...]` marker, and `QrisGateway` validates the static code at construction, so
a bad QRIS string fails at boot rather than on the first guest payment.

Adapters are chosen in `services/gateway-registry.ts`, which is its own module
because both adapters need it and `qris-gateway.ts` imports from
`payment-gateway.ts`. Putting the registry in `payment-gateway.ts` would close an
import cycle.

**Availability.** A room is bookable when it has no reservation in `PENDING` or
`CONFIRMED` that overlaps the requested window (`check_in < requestedCheckOut`
and `check_out > requestedCheckIn`). Reservation creation repeats that check
inside a `Serializable` transaction, so two guests racing for the last room cannot
both win.

## Testing

```sh
bun test
```

84 tests, and none of them need a database. They cover the date and email
parsers, the multi-error parser, night counting across month boundaries, token
issue and verify including a forged signature, gateway signature verification,
callback body validation, reconcile access control, the HTTP layer for every route
that must answer before touching Postgres, and the QRIS adapter: that conversion
injects the exact amount, that each amount yields a different valid payload, that
the merchant identity survives conversion, and that an invalid static code is
rejected at construction.

## Known gaps

- **Payment confirmation is manual.** See the section above. This is the single
  biggest honest limitation: a QRIS converter cannot push a payment event.
- **Migrations have never been run.** The schema is valid and the client is
  generated, but `account`, `room`, `reservation`, `transaction`, `payment` and
  `counter` do not exist yet, so every query fails with `P2021`. Run
  `bun run db:migrate` then `bun run db:seed` before anything works.
- **The cross-role 403 path is not covered by an automated test.** `requireRole`
  resolves the role from the database first, so testing that a TAMU token is
  turned away from an admin route needs a live database. The 401 paths are
  covered.
- `GET /api/reservations/{id}` has no ownership check, because the proposal does
  not describe sessions on reservations. Move it behind `requireAccount` before it
  is exposed publicly.
- The callback authenticates with a shared HMAC secret and no timestamp, so a
  captured callback can be replayed. A real provider should include one.
- Staff accounts have no password reset and no second-factor path.
- Migrations have not been run against the live database yet.
