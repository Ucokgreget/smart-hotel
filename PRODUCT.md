# PRODUCT.md

## What it is
Smart Hotel, a hotel reservation system whose booking flow is wired to a payment
gateway. A guest picks a room, the hotel system creates the reservation and a payment
transaction, the gateway returns a payment URL, and the gateway callback flips the
reservation to CONFIRMED. Source: user (proposal PDF).

## Target audience
Primary: hotel guests (tamu) checking availability and booking a room, on a phone,
mid-trip. Secondary: the thesis panel reading this as the working front end of a
research project by Kelompok 1, Sistem Informasi, UIN Raden Fatah Palembang.
Source: user.

## Brand voice
Calm, precise, transactional. Room availability and payment status are the two facts
the interface must never let a guest misread.

## Key messages
- Availability and payment status are never guessed by the interface; they come from
  the system as `available` / `PENDING` / `PAID` / `FAILED`.
- One reservation flows into one payment transaction through REST API.
- The reservation updates itself when the gateway calls back. No manual confirmation.

## Anti-references
Not hotel-luxury navy-and-gold. Not generic travel-booking gradient. Not a fintech
landing page. The product is a system that exchanges status, so the look is a status
console that happens to be friendly, not a resort brochure.

## Register
- Source: user — the interface is addressed to the guest. Endpoint paths, HTTP methods,
  payment gateway terminology, request-reply and webhook wording stay in the
  documentation and never appear on the page. Everything the guest reads is plain
  Indonesian about searching, booking, and paying.
- Room numbers, check-in and check-out wording, reservation numbers, and QRIS stay,
  because a guest meets all of those.

## User-provided facts
Source: user — project title "Perancangan Integrasi Sistem Reservasi Hotel dengan
  Payment Gateway".
Source: user — team Kelompok 1, six members, Sistem Informasi.
Source: user — guest journey: register, login, search room by check-in/check-out,
  reserve, receive payment URL, pay, callback updates status.
Source: user — payment statuses PENDING, PAID, FAILED. Reservation reaches CONFIRMED
  only on PAID.
Source: user — endpoint list: GET /api/rooms, POST /api/reservations,
  POST /api/payments, POST /api/payment/callback, GET /api/payments/{payment_id}.
Source: user — integration patterns: Request-Reply and Webhook/Callback, JSON over
  HTTP/HTTPS.
Source: user — example room payload: RM101 Deluxe 500000, RM102 Suite 750000,
  status "available". Explicitly sample data from the API design, not real inventory.
Source: user — example total_amount 1000000 for a 2-night stay.

## Missing facts
- Real room inventory, real prices: [NEEDS INPUT]. The room grid renders the proposal
  sample payload and is labelled as such.
- Hotel name and brand identity: [NEEDS INPUT]. Working name "Smart Hotel" is taken
  from the proposal title.
- Availability of rooms for a given date range from the backend: [NEEDS INPUT].
- Anything about hotel facilities, location, or rating: not in the proposal, omitted.

## Working assumptions
- Bahasa Indonesia for all interface copy, because the proposal and the team are
  Indonesian. Technical identifiers stay in English (endpoint paths, status values).
- The front end is a landing/hero page only for now. Booking and payment screens come
  later once the backend is up.

## Scope: routes
- `/` landing and hero. Built.
- `/login` sign in. Built. Validation, password visibility, inline errors, and a
  pending state are real. The submit itself has no server to talk to, so the page says
  so instead of faking success.
- Not built yet: sign up, room search, reservation, payment. The proposal covers all
  of them, the pages do not exist.

## Accessibility target
WCAG 2.2 AA. Reduced-motion honoured for the pinned scroll scene.

## Success criteria
- The pinned hero reads as one idea on desktop and on 375px without horizontal scroll.
- Every status string on the page is a real status from the proposal, never invented.
- Sample data is visibly marked as sample data.

## Approval
Build mode: the user asked for the landing page to be built now. No approval pause.
