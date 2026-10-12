# DESIGN.md — Visual System

## Art direction
A booking status console that happens to feel like a front desk: a light availability
panel that pulls back to reveal a dark transaction panel, the same way the system moves
from "kamar tersedia" to "transaksi diproses".

## Brand
- Name: Smart Hotel
- Voice: calm, precise, transactional
- Anti-patterns: hotel navy-and-gold luxury, resort photography as the whole identity,
  purple/cyan tech gradient, glassmorphism, badge-everywhere status pills

## Color System
Source row: `colors.csv` row 104, "Booking & Appointment App".
Chosen over row 38 "Hotel/Hospitality" because that row's accent is gold `#A16207`,
which is the category stereotype for hotel landing pages. Row 104 is grounded in the
actual product: the accent green `#059669` is the "available / confirmed" colour of the
system's own status vocabulary.

| Token | Hex | Role |
|---|---|---|
| Primary | `#0284C7` | links, active states, focus, dark panel accent line |
| On Primary | `#FFFFFF` | text on Primary |
| Secondary | `#0EA5E9` | dark-panel depth gradient, secondary emphasis |
| On Secondary | `#FFFFFF` | text on Secondary |
| Accent | `#059669` | available and PAID status only |
| On Accent | `#FFFFFF` | text on Accent |
| Background | `#F0F9FF` | light panel base, page background |
| Foreground | `#0F172A` | body text, dark panel base |
| Card | `#FFFFFF` | room card surfaces on the dark panel |
| Card Foreground | `#0F172A` | text on Card |
| Muted | `#EFF7FB` | light panel gradient top, muted blocks |
| Muted Foreground | `#64748B` | secondary text, captions |
| Border | `#E0F0F8` | light panel hairline and grid lines |
| Destructive | `#DC2626` | FAILED status only |
| On Destructive | `#FFFFFF` | text on Destructive |
| Ring | `#0284C7` | focus ring |

Documented derivation (only non-CSV colours in the system):
- `--surface-night: #0D2742` = Foreground `#0F172A` blended 15% toward Primary
  `#0284C7`. Used as the second stop of the dark panel gradient so the dark half
  belongs to the same palette instead of borrowing a generic near-black.
- `--muted-foreground: #394558` = 50% mix of the row's Muted Foreground `#64748B`
  with Foreground `#0F172A`. The row's own value scores only 4.20:1 on the row's own
  Background `#F0F9FF`, which fails WCAG AA for 14px body text. The mix scores 8.98:1
  and stays in the same hue family. Applied in `:root`, not only in components.

Dark surfaces use `Foreground` and `--surface-night` only. `Card` `#FFFFFF` is the only
light surface inside the dark panel. No other hex may appear.

## Typography
Source row: `typography.csv` row 11, "Geometric Modern" (Outfit + Work Sans).
Mono role: `typography.csv` row 42 "Dashboard Data" (Fira Code), restricted to endpoint
paths, status tokens, and room identifiers. Chosen over row 40 (Rubik) because Outfit
holds up at the display sizes the pinned hero needs.

- Display: Outfit 600, `clamp(2.25rem, 7vw, 4.5rem)`, tracking `-0.03em`, leading 1.05
- H2: Outfit 600, `clamp(1.5rem, 4vw, 2.25rem)`, tracking `-0.02em`, leading 1.15
- H3 / card title: Outfit 600, 1.125rem, tracking `-0.01em`, leading 1.3
- Body: Work Sans 400, 1rem / 1.75rem leading, max 65ch
- Caption: Work Sans 400, 0.8125rem, leading 1.5, colour Muted Foreground on light
  surfaces, Background at 70% alpha on dark surfaces (Muted Foreground on a dark
  surface is only 3.98:1 and fails AA for 14px text)
- Mono token: Fira Code 400, 0.8125rem, leading 1.4

Type scale ratio: 1.25. No serif anywhere. Emphasis inside a headline uses weight of the
same family, never a mixed family.

## Spacing
Base unit 4px. Scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128.
Section padding: `py-16 md:py-24`.
Component gap: `gap-4` for cards, `gap-6` for panels.
Content max width: `max-w-5xl` for the hero copy, `max-w-6xl` for the room grid.

## Grid
12-column at `lg`. Breakpoints: sm 640, md 768, lg 1024, xl 1280.
Container: `max-w-6xl mx-auto px-6`.

## Radius
One rule, no mixing: **interactive elements are sharp, media is the only soft thing.**
- Buttons, inputs, checkboxes, status chips: `rounded-none` (0). This matches the
  project's own shadcn `base-lyra` `Button` primitive, so a hand-built control and a
  shadcn control are pixel-identical.
- Media cards and the sign-in photo panel: `rounded-xl` (12px).
- No pills anywhere. No `rounded-full`.

## Elevation
Level 0: flat, no shadow. This design has no drop shadows; depth comes from the scale
and rotate of the pinned scene and from light panel against dark panel.
Level 1: card on dark panel gets a 1px `--card/12` ring, not a shadow.

## Motion
Source: `animate` canonical table.
- Entrance reveal: 320ms, `[0.22, 1, 0.36, 1]`, opacity + translateY 12px
- Hover: 160ms, `ease-out`, transform + border colour only
- Press: 100ms, scale 0.98
- Pinned scroll scene: scroll-linked scale 1 to 0.8 and rotate 0 to -5deg on the light
  panel, 0.8 to 1 and 5 to 0 on the dark panel, over `200dvh - 8rem` of scroll
- Pinned panel height: `calc(100dvh - 4rem)`, because the sticky nav occupies 4rem of
  normal flow. A plain `100dvh` panel pushes its bottom 4rem below the fold, which hides
  the scroll cue and the caption under the nav.
- Scroll cue: 2.4s ease-in-out loop, 4px drift, opacity 0.5 to 1, ambient only. Defined
  as `animate-scroll-cue` in `app/globals.css` and gated behind
  `prefers-reduced-motion: no-preference`. No bounce or elastic easing anywhere.
- Reduced motion: `useReducedMotion()` disables the scale and rotate on both pinned
  panels and the CSS scroll cue stops, so the page becomes a normal stacked document.

## Component Patterns
- Hero: pinned two-panel scene. Panel 1 light, panel 2 dark, one dramatic moment only.
- Status chip: 6px radius, mono, colour by status token, never more than two on screen.
- Room card: white surface on the dark panel, image 4:3, mono room id, price in rupiah.
- Flow list: numbered rows separated by hairlines, not cards.
- Footer: hairline top border, wordmark and one line of project identity.
- Sign in `/login`: split column, form left and photo right, photo hidden below `md`.
  Form owns validation, password visibility, and inline errors. Submit is the shadcn
  `Button`, stretched to `h-11`.

## Form states
Every form ships all of these, not only the happy path:
- Invalid field: red border, red ring, inline message with an icon, `aria-invalid`,
  and `aria-describedby` pointing at the message. Submitting moves focus to the first
  invalid field.
- Validating: submit button disabled, label switches to "Memproses".
- Result notice: a neutral bordered block with `role="status"`, not a red toast.

## Imagery
Hotel rooms and public areas, natural or low-key interior light, no people posing, no
beach or pool clichés. Source: Unsplash direct URLs, chosen by the user. Aspect 4:3,
`object-cover`, 10px radius, white ring on the dark panel.

## Accessibility
- WCAG 2.2 AA: body text on `#0F172A` on `#F0F9FF` and `#FFFFFF` on `#0D2742`.
- Focus: 2px `--ring` outline with 2px offset on every interactive element.
- Touch targets: min 44px on all controls.
- Reduced motion honoured, see Motion above.
- One `h1` per page. Decorative grid overlay is `aria-hidden`.
- Every image has meaningful alt text describing the room type shown.

## Intentional exceptions
- The room grid is the one place white `#FFFFFF` appears inside the dark panel. It is
  allowed because the cards are real image surfaces and the accent green status chip
  sits on them.
- The `CONFIRMED` wordmark uses gradient text (`bg-gradient` + `bg-clip-text`). The
  anti-slop detector flags this pattern. It is kept deliberately: it is the single
  dramatic beat of the scroll scene, it is not a heading or a metric, and the gradient
  runs only between two existing tokens (Background to Muted Foreground). It appears
  exactly once in the whole page.
