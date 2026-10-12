# EVIDENCE.md

| Claim | Source | Confidence | Allowed wording | Usage |
|-------|--------|------------|-----------------|-------|
| Project title "Perancangan Integrasi Sistem Reservasi Hotel dengan Payment Gateway" | proposal PDF, section 1 | high | exact wording | footer wordmark context, page title |
| Team "Kelompok 1", six named members, Sistem Informasi | proposal PDF, cover | high | exact | footer |
| Payment statuses PENDING / PAID / FAILED | proposal PDF, sections 6 and 11 | high | exact uppercase tokens | must not appear in the guest-facing UI; use Indonesian wording instead |
| Reservation reaches CONFIRMED only when payment is PAID | proposal PDF, section 7 | high | "dikonfirmasi otomatis setelah pembayaran berhasil" | hero payoff, never the raw tokens |
| Reservation starts as PENDING | proposal PDF, section 11.2 response `reservation_status: "PENDING"` | high | Indonesian only: "menunggu pembayaran" | reservation card |
| Integration patterns Request-Reply and Webhook/Callback | proposal PDF, section 9 | high | exact, documentation only | MUST NOT USE on the guest-facing page |
| REST API, JSON over HTTP/HTTPS | proposal PDF, sections 8 and 9 | high | exact, documentation only | MUST NOT USE on the guest-facing page |
| Endpoints /api/rooms, /api/reservations, /api/payments, /api/payment/callback, /api/payments/{payment_id} | proposal PDF, section 10 | high | exact, documentation only | MUST NOT USE on the guest-facing page |
| Room RM101 Deluxe 500000, RM102 Suite 750000, status "available" | proposal PDF, section 11.1 example response | high | must be labelled "contoh data" | room grid |
| reservation_id RSV001 | proposal PDF, section 11.2 example response | high | exact, labelled as sample data | reservation card |
| total_amount 1000000 for 2 nights | proposal PDF, section 11.2 example response | high | "Rp1.000.000", labelled as sample data | reservation card |
| Currency label "Rp" | not stated in the proposal, which shows bare `500000` and `750000` | medium | "Rp" only, in the Indonesian guest context of a QRIS payment | room and reservation cards |
| payment_method "QRIS" | proposal PDF, section 11.3 example request | high | "bayar dengan QRIS" | booking steps, only payment method that may be named |
| Room types beyond Deluxe and Suite (Standard, Presidential, etc.) | NOT in proposal | 0 | MUST NOT USE | only Deluxe and Suite may appear, plus two images without invented type names |
| Real prices or live availability | NOT in proposal | 0 | MUST NOT USE | room grid must stay marked as sample data |
| Guest count, occupancy rate, hotel rating, awards | NOT in proposal | 0 | MUST NOT USE | omitted entirely |
| Payment gateway vendor name | NOT in proposal | 0 | MUST NOT USE | the words "Payment Gateway" and "callback" are internal and are not shown to a guest |
| Guest logs in with email and password | proposal PDF, section 7 | high | "email dan kata sandi" | sign-in form fields |
| Sign-up collects nama, email, nomor telepon, kata sandi | proposal PDF, section 7 | high | the flow is attested, the paths are not | /api/auth/register is this project's choice |
| Session token issued on login | not in proposal | 0 | MUST NOT USE as a proposal feature | implementation detail of the login page |
| Payment callback is authenticated by shared HMAC secret | not in proposal | 0 | MUST NOT USE as a proposal feature | implementation security choice |
| Registration collects nama, email, nomor telepon, kata sandi | proposal PDF, section 7 | high | sign-up is NOT built yet | login page does not link to a sign-up page |
| Minimum 8 characters for the password | not stated in the proposal | 0 | MUST NOT USE as a claim; acceptable only as an unverified client-side guard, which the form does not assert as a hotel rule | login validation |
| Sign-in with Google / OAuth | NOT in proposal | 0 | MUST NOT USE | removed, not shipped |
| Password reset / forgot password flow | NOT in proposal | 0 | MUST NOT USE | removed, not shipped |
| Guest testimonials or reviews | NOT in proposal | 0 | MUST NOT USE | removed, not shipped |
| Sign-in is connected to a running backend | not built yet | 0 | MUST NOT USE as a success claim | the form says plainly that no server is connected |
| Testimonials or customer logos | NOT in proposal | 0 | MUST NOT USE | no testimonial or logo section |
| Reduction in processing time or cost | NOT in proposal | 0 | MUST NOT USE | no efficiency claim |

## Backend schema claims

| Claim | Source | Confidence | Allowed wording | Usage |
|-------|--------|------------|-----------------|-------|
| Tables guest, room, reservation, transaction, payment | proposal PDF, section 5 data table | high | exact | prisma/schema.prisma |
| room_id, room_type, price_per_night, status | proposal PDF, section 5 row 1 and section 11.1 | high | exact | Room model, snake_case columns |
| reservation_id, room_id, check_in, check_out, jumlah malam | proposal PDF, section 5 row 2 | high | exact | Reservation model |
| guest name, email, nomor telepon | proposal PDF, section 5 row 3 | high | exact | Guest model |
| transaction id and reservation id | proposal PDF, section 5 row 4 | high | exact | Transaction model |
| total pembayaran and metode pembayaran | proposal PDF, section 5 row 5 | high | exact | Transaction amount and method |
| payment_url, id pembayaran, status pembayaran, waktu pembayaran | proposal PDF, section 5 rows 6 to 9 | high | exact | Payment model |
| PENDING / PAID / FAILED payment statuses | proposal PDF, sections 6 and 11 | high | exact enum values | PaymentStatus |
| PENDING then CONFIRMED reservation | proposal PDF, sections 7 and 11.2 | high | exact enum values | ReservationStatus |
| QRIS as a payment method | proposal PDF, section 11.3 | high | exact | PaymentMethod, currently the only value |
| Money stored as Int rupiah | inferred from bare integers in the examples | medium | never state a currency the proposal does not | pricePerNight, totalAmount |
| RSV001 / TRX001 / PAY001 id format | proposal PDF, section 11 examples | high | exact | Counter model |
| RoomStatus.OUT_OF_SERVICE | NOT in proposal | 0 | MUST NOT USE as a proposal field | enum value only, for operations |
| ReservationStatus.CANCELLED | NOT in proposal | 0 | MUST NOT USE as a proposal status | enum value only, to free a room |
| Rooms RM103 and RM104 in the seed | NOT in proposal | 0 | MUST NOT USE | seed comment marks them as samples |
| MockGateway is a payment processor | it is not | 0 | MUST NOT USE | README and health output call it a mock |
| QrisGateway converts a static QRIS into a dynamic one carrying the exact total | verified by test against qris-dinamis | high | describe the mechanism only, never claim it confirms payment | createTransaction, payloadFor |
| A QRIS conversion confirms that payment was received | FALSE, the standard has no push or webhook | 0 | MUST NOT USE, ever | README states the opposite explicitly |
| Payment becomes CONFIRMED automatically after a QRIS payment | FALSE in this deployment | 0 | MUST NOT USE | confirmation is manual via /api/payment/reconcile |
| Static QRIS string of the hotel | NOT supplied by the user yet | 0 | MUST NOT USE | QRIS_STATIC_CODE must be filled before qris mode boots |
| Merchant name, city, and provider in the QRIS payload | whatever the hotel's own QRIS contains | 0 | MUST NOT USE | read from the static code at runtime, never hardcoded |
| Reconcile route requires ADMIN_API_KEY | implementation choice, not in proposal | 0 | MUST NOT USE as a proposal feature | documented as a deliberate limitation |
| GET /pay/{payment_id} is public by design | implementation choice, not in proposal | 0 | MUST NOT USE as a proposal feature | exposes amount and payload only, no guest data |
| Schema migrated on a live database | not done, no password configured | 0 | MUST NOT USE | nothing claims a deployed database |
| Four rooms exist in the hotel | NOT in proposal | 0 | MUST NOT USE | only RM101 and RM102 are attested |
