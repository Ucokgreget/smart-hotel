# Graph Report - .  (2026-10-05)

## Corpus Check
- Corpus is ~24,563 words - fits in a single context window. You may not need a graph.

## Summary
- 505 nodes · 765 edges · 29 communities (25 shown, 4 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- QRIS Core Conversion
- Database Client and Environment
- Payment Gateway Adapters
- API Envelope and Errors
- Frontend Toolchain
- QRIS Library Dependencies
- Backend Service Documentation
- Frontend TypeScript Config
- Backend Dependencies
- QRIS TypeScript Config
- Next.js Routes and Fonts
- Frontend Runtime Dependencies
- shadcn Path Aliases
- QRIS Build Dependencies
- Hero Scroll Landing Experience
- QRIS Node TypeScript Config
- Design System and Evidence
- Backend TypeScript Config
- Room Inventory Seed
- Product Gap Notes
- Frontend Lint Config
- Next Image Remote Patterns
- Frontend PostCSS Pipeline

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 18 edges
2. `compilerOptions` - 16 edges
3. `QrisGateway` - 11 edges
4. `compilerOptions` - 11 edges
5. `scripts` - 10 edges
6. `unauthorized()` - 10 edges
7. `convertQRIS()` - 10 edges
8. `success()` - 9 edges
9. `MockGateway` - 9 edges
10. `parseQRIS()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Serializable Reservation Transaction` --conceptually_related_to--> `Sistem Hotel (sistem utama)`  [INFERRED]
  backend/README.md → Kelompok 1 - Proposal Sistem Smart Hotel.pdf
- `PaymentGateway Interface` --implements--> `Payment Gateway`  [INFERRED]
  backend/README.md → Kelompok 1 - Proposal Sistem Smart Hotel.pdf
- `Manual Reconciliation Path` --rationale_for--> `Webhook/Callback Pattern`  [INFERRED]
  backend/README.md → Kelompok 1 - Proposal Sistem Smart Hotel.pdf
- `QRIS Dinamis Web App Shell` --conceptually_related_to--> `QrisGateway Adapter`  [AMBIGUOUS]
  qris-dinamis/index.html → backend/README.md
- `Smart Hotel Product Brief` --cites--> `Perancangan Integrasi Sistem Reservasi Hotel dengan Payment Gateway`  [EXTRACTED]
  PRODUCT.md → Kelompok 1 - Proposal Sistem Smart Hotel.pdf

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Reservation and Payment Status Chain** — kelompok_1_proposal_sistem_smart_hotel_status_transition, backend_readme_reconciliation, kelompok_1_proposal_sistem_smart_hotel_webhook_callback, design_form_states [INFERRED 0.85]
- **Dynamic QRIS Generation Pipeline** — qris_dinamis_readme_convert_qris, qris_dinamis_readme_emvco_tlv, backend_readme_qris_adapter, backend_readme_payment_url_shape [EXTRACTED 1.00]
- **Guest-Facing Truthfulness Layer** — product_guest_facing_register, evidence_no_api_jargon_on_guest_ui, evidence_sample_data_marking, evidence_qris_cannot_confirm [INFERRED 0.85]

## Communities (29 total, 4 thin omitted)

### Community 0 - "QRIS Core Conversion"
Cohesion: 0.10
Nodes (32): ask(), main(), rl, buildTLVString(), convertQRIS(), makeTLV(), calculateCRC16(), NESTED_TAGS (+24 more)

### Community 1 - "Database Client and Environment"
Cohesion: 0.08
Nodes (29): adapter, globalForPrisma, env, poolerHost(), REQUIRED, app, issueToken(), optionalSession() (+21 more)

### Community 2 - "Payment Gateway Adapters"
Cohesion: 0.10
Nodes (20): badGateway(), getGateway(), initGateway(), setGateway(), asGatewayError(), GatewayCallbackPayload, GatewayTransactionInput, GatewayTransactionResult (+12 more)

### Community 3 - "API Envelope and Errors"
Cohesion: 0.19
Nodes (22): ApiResponse, success(), badRequest(), conflict(), notFound(), FieldError, nightsBetween(), parse() (+14 more)

### Community 4 - "Frontend Toolchain"
Cohesion: 0.06
Nodes (32): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, prettier, prettier-plugin-tailwindcss, tailwindcss (+24 more)

### Community 5 - "QRIS Library Dependencies"
Cohesion: 0.06
Nodes (30): jsqr, qrcode, author, dependencies, jsqr, qrcode, react, react-dom (+22 more)

### Community 6 - "Backend Service Documentation"
Cohesion: 0.10
Nodes (29): Admin Key Guard for Reconcile Route, Smart Hotel Backend Service, PaymentGateway Interface, Payment URL points at server pay page, QrisGateway Adapter, Manual Reconciliation Path, Serializable Reservation Transaction, Supabase Transaction and Session Pooler Split (+21 more)

### Community 7 - "Frontend TypeScript Config"
Cohesion: 0.07
Nodes (28): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+20 more)

### Community 8 - "Backend Dependencies"
Cohesion: 0.07
Nodes (27): dependencies, hono, @prisma/adapter-pg, @prisma/client, qris-dinamis, devDependencies, dotenv, prisma (+19 more)

### Community 9 - "QRIS TypeScript Config"
Cohesion: 0.07
Nodes (27): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+19 more)

### Community 10 - "Next.js Routes and Fonts"
Cohesion: 0.11
Nodes (12): firaCode, outfit, workSans, SignInDemo(), ThemeProvider(), Button(), buttonVariants, FieldErrors (+4 more)

### Community 11 - "Frontend Runtime Dependencies"
Cohesion: 0.09
Nodes (23): @base-ui/react, class-variance-authority, cn, dependencies, @base-ui/react, class-variance-authority, cn, lucide-react (+15 more)

### Community 12 - "shadcn Path Aliases"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 13 - "QRIS Build Dependencies"
Cohesion: 0.10
Nodes (21): autoprefixer, postcss, devDependencies, autoprefixer, postcss, tailwindcss, tsx, @types/qrcode (+13 more)

### Community 14 - "Hero Scroll Landing Experience"
Cohesion: 0.12
Nodes (5): BOOKING_STEPS, HeroScrollDemo(), PanelProps, SAMPLE_RESERVATION, SAMPLE_ROOMS

### Community 15 - "QRIS Node TypeScript Config"
Cohesion: 0.13
Nodes (14): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+6 more)

### Community 16 - "Design System and Evidence"
Cohesion: 0.15
Nodes (13): CONFIRMED Wordmark Gradient Exception, Muted Foreground AA Derivation, Palette Row 104 Booking and Appointment App, Radius Rule: interactive sharp, media soft, Reduced Motion Contract, Visual System Contract, Evidence Ledger, Next.js Agent Version Warning (+5 more)

### Community 17 - "Backend TypeScript Config"
Cohesion: 0.29
Nodes (6): compilerOptions, jsx, jsxImportSource, strict, types, bun

### Community 18 - "Room Inventory Seed"
Cohesion: 0.40
Nodes (3): adapter, prisma, ROOMS

## Ambiguous Edges - Review These
- `QrisGateway Adapter` → `QRIS Dinamis Web App Shell`  [AMBIGUOUS]
  qris-dinamis/index.html · relation: conceptually_related_to

## Knowledge Gaps
- **200 isolated node(s):** `name`, `dev`, `start`, `typecheck`, `test` (+195 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `QrisGateway Adapter` and `QRIS Dinamis Web App Shell`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `qrcode` connect `QRIS Library Dependencies` to `QRIS Core Conversion`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `QRISResult()` connect `QRIS Core Conversion` to `QRIS Library Dependencies`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `name`, `dev`, `start` to the rest of the system?**
  _200 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `QRIS Core Conversion` be split into smaller, more focused modules?**
  _Cohesion score 0.10034013605442177 - nodes in this community are weakly interconnected._
- **Should `Database Client and Environment` be split into smaller, more focused modules?**
  _Cohesion score 0.08084163898117387 - nodes in this community are weakly interconnected._
- **Should `Payment Gateway Adapters` be split into smaller, more focused modules?**
  _Cohesion score 0.09871794871794871 - nodes in this community are weakly interconnected._