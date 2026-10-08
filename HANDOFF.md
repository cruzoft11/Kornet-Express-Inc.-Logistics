# Kornet Express v2 Overhaul — Handoff for the Next AI Agent

_Last updated: 2026-10-08. Written by the orchestrating agent when its context budget ran out._

---

## 1. Context: what this project is and what the client wants

**Kornet Express, Inc.** is a Philippine freight forwarder: ocean and air, export and import, domestic trucking, pick-up/delivery, and RoRo vehicle exports. Their old software was **Logisuite**, a desktop freight system, plus a legacy **FS** accounting ledger (an old DB-style ledger).

This repo, `cruzoft11/Kornet-Express-Inc.-Logistics`, is a half-built web replacement. The owner (user) asked for a **complete, production-ready, "worth millions of pesos" overhaul**.

The full original request:
- Act as every role: UI/UX designer, frontend, backend, database, DevOps, QA and security engineers. One agent per job.
- Be meticulous. Check every module, process flow, button and data field top to bottom, and make sure the correct data appears.
- Fix everything, add missing features and add QoL features. Creative freedom to add, remove or modify.
- **Complete UI/UX overhaul** to modern standards:
  - smooth dark/light transitions
  - hover and sliding animations
  - slick fonts, easy on the eyes, fluid
- Allowed UI skills: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill and https://github.com/ibelick/ui-skills. Both are already cloned to the session folder `files\skills\`.
- It must be an **improved version of their old Logisuite system**.
- **DO NOT INVENT.** Research logistics data fields, documents and PH finance rules online when unsure.
- **Center everything on user QoL:**
  - keyboard shortcuts and fast data entry
  - automation: e.g. creating an AWB/BL should auto-compute fees and auto-stage AR/AP into accounting
- Be ruthless and hard to impress. Don't stop until it's 100%.
- The user also asked to economize tokens: use cheaper/lower models for sub-agents **without sacrificing quality**.

### Hard rules
- Work only on local git branch **`overhaul/v2`**.
- **NEVER push.** `.github/workflows/azure-deploy.yml` auto-deploys main/master to the Azure Web App `kornet-logistics-prod`.
- Nothing is committed yet. All work is uncommitted on `overhaul/v2`.
- Never write test data to a live or real accounting database without an isolated QA target and explicit cleanup plan. Kornet is a single-company system (`KORNET`); do not add company selection or user company assignments. Existing company-code database columns are compatibility data and must not be deleted or repurposed without a verified backup.
- Original DB backups:
  - `C:\Users\hans\.copilot\session-state\ff1149ac-6bbf-49f9-948e-787f47aac07f\files\db-backup\`
  - files: `accounting.db`, `kornet.db`
- Windows PowerShell 5:
  - no `&&`; use `;` with `if ($?)`
  - stop processes only with `Stop-Process -Id <pid>`
- Commits must include the trailer `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`.

### Assumptions made (the user never answered the clarification)
- FS ledger scope is **KORNET company only**. The existing KORNET chart of accounts was kept and logistics accounts were added.
- Defaults: PHP currency, KG, CBM.
- Margin gate is 15%, a soft block with manager override plus reason.
- Database stays on SQLite for now.

---

## 2. Reference material (session folder)

Session root: `C:\Users\hans\.copilot\session-state\ff1149ac-6bbf-49f9-948e-787f47aac07f\files\`

| Path | What it is |
|---|---|
| `SPEC.md` | **Single source of truth.** Architecture, data model, formulas, roles, FS ledger contract, journal templates, API, QoL requirements. Read it first. |
| `pdf\*.txt` | Text extracted from the 13 Logisuite/Kornet PDFs. Covers: Air Export/Import, Ocean, P/D orders, disbursements, customer tracking, process flow and accounting integration, FS implementation workflow and timeline. |
| `pdfraw\*.png` | Logisuite screenshots. Key screens:<br>• ocean import file form<br>• misc invoice<br>• check entry<br>• P/D order<br>• vehicle inventory<br>• manifest loader<br>• cargo loader/container details<br>• Transaction Posting dialog |
| `skills\` | The two UI skill repos. |
| `screens\` | Screenshots from the UI agent: login, dashboard, ui-kit light/dark, command palette. |
| `db-backup\` | Pristine copies of both DBs. |
| `HANDOFF.md` | Short earlier version of this file. |

### Domain rules (researched, also in SPEC)
- **Chargeable weight**
  - Air: volumetric = L×W×H cm / 6000; chargeable = max(gross, volumetric), rounded **up to 0.5 kg**.
  - Ocean LCL: W/M = max(kg/1000, cbm), minimum 1.
- **PH VAT**
  - VATABLE 12%.
  - **ZERO_RATED** applies to international freight forwarding (NIRC Sec. 108(B)).
  - EXEMPT.
  - NON_VAT_REIMBURSABLE: pass-through costs, posts to account 1130 "Advances to Clients".
- **EWT:** 2% withheld by customers who are withholding agents (shows as CWT, account 1128). AP side: EWT payable 2166.
- **Invoices** must carry the EOPT Act / RR 7-2024 required fields: seller and buyer name/TIN/address, VATable / zero-rated / exempt breakdown, and VAT amount.
- **Validation hints**
  - MAWB is 11 digits: 3-digit airline prefix + 7-digit serial + mod-7 check digit.
  - Container numbers follow ISO 6346 (check digit).
  - VIN is 17 characters with a check digit (decoded via NHTSA vPIC).
- **Journal templates**

  | Source document | Book | Entry |
  |---|---|---|
  | Invoice | SALEBOOK | Dr 1123 AR / Cr 42xx revenue, 1130 reimbursable, 2122 Output VAT |
  | AP bill | PURCBOOK | Dr 45xx cost + 1142 Input VAT / Cr 2112 AP (net), Cr 2166 EWT |
  | Receipt | CRB | Dr bank GL + 1128 CWT / Cr 1123 AR (unapplied → 2117 Customer Deposits) |
  | Check | CDB | Dr 2112 or expense / Cr bank GL |

- **Key KORNET GL accounts**
  - Banks: 1110–1115 (FS banks 1 BDO, 2 Metrobank, 3 BPI)
  - Assets: 1123 AR, 1128 CWT, 1130/1131 Advances, 1142 Input VAT
  - Liabilities: 2112 AP, 2116/2117, 2122 Output VAT, 2166 EWT payable
  - Revenue: 4200 and 4210–4216
  - Cost: 4500 and 4510–4515
  - FX: 4303
- **FS suppliers (KORNET):** 1 Maersk PH, 2 PAL Cargo, 3 ATI, 4 ICTSI. Current FS period: KORNET = 2026-09.

---

## 3. Stack, how to run

### Stack
- Frontend `kornet-system/`:
  - React 18, Vite 5, TypeScript, Tailwind 3
  - Zustand, React Query, Radix, framer-motion, cmdk, sonner, lucide
  - @tanstack/react-table, react-hook-form, zod, xlsx, jsPDF
- API `kornet-system/server/`:
  - Express + Prisma 5 + SQLite at `prisma/data/kornet.db`
  - Legacy ledger `prisma/data/accounting.db` accessed via Node 22 `node:sqlite` (DatabaseSync). **Requires Node ≥ 22.**
- Ports: web 3000 (Vite proxies `/api` → API on 4000).
- Seed login: **admin / kornet2000**.

### Commands
| Command | Purpose |
|---|---|
| `npm run dev` (in `kornet-system`) | Runs both web and API |
| `npx tsc --noEmit`, `npx vite build` (in `kornet-system`) | Frontend checks |
| `npx tsc --noEmit` (in `kornet-system\server`) | Server type check |

### Backend smoke test
Asserts accounting math, security and state rules; 21 steps.

```
cd kornet-system\server
Copy-Item prisma\data\accounting.db $env:TEMP\kx.db -Force
$env:ACCOUNTING_DB_PATH="$env:TEMP\kx.db"; npx tsx src/index.ts     # (async shell)
node scripts\smoke-flow.mjs                                          # (another shell)
```

- It last passed **21/21** and was verified by the orchestrator.
- Side effect: it writes test rows into `kornet.db` (company OTHER, a viewer user, test parties and shipments). See TODO #4.

### Other scripts
- `scripts/fs-ledger-test.mjs`: tests the ledger engine against a DB copy.
- `scripts/fs-kornet-coa.mjs`: one-off that already ran. It added 18 logistics accounts to KORNET and soft-deleted 13 fake check masters and 26 lines.

---

## 4. What's DONE (verified)

### 4.1 Security + FS ledger (done, verified)
- **`server/src/lib/fsLedger.ts`** is the posting engine.
  - Exports: trialPost, finalPost, reverse, getAccounts, getPeriod, listBanks, listSuppliers, recomputeCompanyBalances, accountingDbPath.
  - Idempotent via the `fs_post_log` table.
  - Asserts Dr = Cr.
- **`server/src/routes/fs.ts`** has been rewritten. It requires auth + company + role + FS access. Endpoints:
  - `/fs/system-info`, `/fs/period`
  - `/fs/accounts` CRUD, `/fs/banks`, `/fs/suppliers`, `/fs/signatories` (real rows only, `{id, signName, signTitle, isActive}`)
  - `/fs/vouchers/masters`, `/fs/vouchers/lines`
  - `/fs/journals/:kind`, `/fs/journals/:kind/trial`, `/fs/journals/:kind/post`, `/fs/posting`
  - `/fs/trial-post`, `/fs/final-post`, `/fs/reverse`
  - `/fs/reports/:type`
  - `/fs/month-end/checklist`, `/fs/month-end/close`
  - `/fs/bridge/create-check`
- Breaking changes:
  - old `/fs/month-end` is rejected (use `/fs/month-end/close`)
  - `/fs/post` is compatibility-only
- Hardening:
  - helmet, CORS from env, JSON size limit
  - login lockout, password minimum 10 characters
  - users route admin-only with a guard against escalating above your own role
  - JWT secrets required in production
- `.env.example` added.
- `.env` and the `.db` files were removed from git tracking (`git rm --cached`; still on disk) and added to `.gitignore`.

### 4.2 Backend logistics domain (done, verified by the smoke test)
- `server/prisma/schema.prisma`: v2 models (Shipment, CargoLine, Container, TransportDoc, Charge with **billStatus/costStatus**, Quote, Invoice/CreditMemo, Receipt, ApBill, Check, BridgeItem, StatusEvent, Party, Port, BillingCode, Tariff, Vehicle, PdOrder, CompanySetting, sequences, audit…).
- `server/src/lib/sequence.ts`: atomic numbering (AE-2026-00001, SI-2026-000001…).
- `server/src/lib/calc.ts`: formulas. Mirrored for the frontend in `src/lib/calc.ts`.
- `server/src/lib/crud.ts`: generic CRUD with roles, optimistic `version` locking, soft delete, audit.
- `server/src/services/domain.ts` (30KB) and `server/src/routes/logistics.ts` (43KB, also exports the `portal` router):
  - company-scoped `getOwned` (IDOR protection)
  - state machines for shipments, vehicles and P/D orders
  - closed-file lock (409)
  - `GET /shipments/:id/close-check` → `{ok, blockers[], warnings[]}`
  - tariff precedence by lane / carrier / customer / equipment and validity dates
  - invoice generation grouped by bill-to party + freight term
  - AP bills grouped by vendor, with input VAT and EWT
  - receipts with bank→GL mapping and unapplied balance → 2117
  - checks applying AP bills and direct expense lines
  - credit memos built from invoice lines
  - void stages a reversal
  - accounting bridge trial → final post with jvNo written back to the source document (`jeNo`)
  - no fake ledger fallback
  - VIN validate/decode
  - signed portal JWT (`PORTAL_JWT_SECRET`, falls back to `JWT_ACCESS_SECRET`)
  - global search, dashboard summary, document print payloads, clone, status events
- `scripts/smoke-flow.mjs`: 21/21 PASS.

### 4.3 UI design system + shell (done, verified visually)
- Tokens and theme:
  - HSL tokens in `src/index.css` and `tailwind.config.cjs`
  - light/dark mode with a View-Transition theme toggle
  - density setting (Comfort/Compact) in `src/stores/settingsStore.ts`
- Self-hosted fonts: Inter Variable, Geist Sans, JetBrains Mono.
- Component library `src/components/ui/*` (see `src/components/ui/README.md`):
  - actions: Button, IconButton, Kbd
  - inputs: Input, NumberInput, MoneyInput, DateInput, Select, Combobox, FormField, Checkbox, Switch, SegmentedControl, Textarea
  - layout: Card, StatCard, FormSection, Tabs, PageHeader, Toolbar, FilterBar, SplitView
  - data: DataGrid, EditableGrid, exportRowsToExcel
  - overlays: Sheet, Dialog, ConfirmDialog, Popover, Tooltip, DropdownMenu
  - feedback: StatusPill, Timeline, Stepper, EmptyState, Skeleton, ModulePlaceholder
- New shell: `src/components/AppShell.tsx` (sidebar groups, breadcrumbs, ⌘K command palette, shortcuts sheet, theme/density toggles).
- `src/routes.tsx` is the route table (still pointing at legacy/placeholder components — see TODO #1).
- `src/hooks/useHotkeys.ts`, `src/lib/format.ts`, `src/lib/cn.ts`.
- `src/pages/UIKit.tsx` at `/ui-kit` (admin).
- Login redesigned (`src/pages/Login.tsx`).
- Hotkeys: Ctrl/⌘+K, `/`, `?`, `N`, `Esc`, `G` then `D/Q/O/A/P/V/F/B`.

### 4.4 Operations frontend (done by agent fe-ops; NOT yet reviewed by the orchestrator)
- Files:
  - `src/api/ops.ts`
  - `src/modules/ops/{routes.tsx, QuotesPage.tsx, ShipmentWorkspace.tsx, utils.ts}`
  - `src/modules/ops/components/{common.tsx, print.ts, ShipmentTabs.tsx}`
- `opsRoutes` exports: `/logistics/quotes`, the five mode workspaces (ocean-export, ocean-import, air-export, air-import, domestic) and `/logistics/files/:id`.
- Its own files pass `vite build`.
- Gaps it reported:
  - It said `GET /lookups/global` is missing. **Verify:** the backend agent claims it added global search; grep `logistics.ts` for `global`.
  - Status-events filtering by `entityType/entityId` is not implemented in the backend.
  - There is no quote print payload endpoint, so quotes are printed client-side.

---

## 5. IN FLIGHT when this was written (background agents; may or may not have finished)

Three frontend agents were still running in the previous session. **In a new session they are gone.** Check what exists on disk and finish or redo the gaps.

| Agent | Owns | Must export |
|---|---|---|
| fe-pd-vehicle | `src/modules/pd/**`, `src/modules/vehicles/**`, `src/modules/fleet/**`, `src/api/{pd,vehicles,fleet}.ts` | `pdRoutes` (`/logistics/pd-orders`, `/logistics/pd-orders/board`), `vehicleRoutes` (`/logistics/vehicles`), `fleetRoutes` (`/logistics/fleet`) |
| fe-acct | `src/modules/billing/**`, `src/modules/ledger/**`, `src/api/{billing,ledger}.ts` | `billingRoutes` (`/billing/invoices`, `/billing/receivables`, `/billing/payables`, `/billing/disbursements`, `/billing/accounting-bridge` + details), `ledgerRoutes` (`/fs`, `/fs/journals/:kind`, `/fs/chart-of-accounts`, `/fs/reports`, `/fs/posting`, `/fs/month-end`, `/fs/banks`, `/fs/suppliers`, `/fs/signatories`) |
| fe-dash-portal | `src/modules/{dashboard,masters,admin,portal}/**`, `src/api/{masters,admin,portal,dashboard}.ts` | `dashboardRoutes` (`/dashboard`), `mastersRoutes` (`/directories/parties`, `/directories/ports`, `/directories/billing-codes`, `/directories/rates`), `adminRoutes` (`/admin/users`, `/admin/settings`, `/admin/audit-log`), `portalRoutes` (public: `/portal/login`, `/portal`, `/track/:ref`), plus `src/modules/dashboard/globalSearch.ts` exporting `searchGlobal(q)` |

At handoff time `npx tsc --noEmit` failed on in-progress files in `src/modules/fleet` and `src/modules/ledger`.

### What each module is supposed to contain (requirements given to the agents)

**P/D orders**
- List with today/tomorrow filters.
- Editor modeled on the Logisuite P/D form: type, linked file, third party, pickup/delivery addresses and contacts, time window, trucker, driver, route, load#, AWB/BL ref, pcs/kg/cbm, instructions.
- Actions:
  - dispatch: dialog to pick a driver and a fleet vehicle
  - complete: POD dialog (signedBy, datetime)
  - cancel with a reason
- Print P/D order and delivery receipt.
- Kanban Dispatch Board.

**Vehicles**
- Status counts and filters.
- VIN Decode button that auto-fills the vehicle details.
- WR#, inspection fields (no/date/by, damages, keys, mileage), and title fields (status/number/state/received).
- The action bar shows **only valid transitions**: receive, inspect, hold/release, ready, force-ready (manager + reason), temporal-release/undo, withdraw, link-to-container, title-rejected.
- Status timeline, bulk actions, dock receipt print.

**Fleet**
- Trucks master: plate, type, capacity, registration/insurance expiry warnings.
- Drivers master: license expiry warnings.
- If the schema lacks Driver/FleetVehicle models, that is a **backend gap to add**.

**Billing**
- Invoices: EOPT-compliant view/print; post, void, credit memo from selected lines; misc invoice.
- Receipts: OR/CR, bank, method, CWT/2307, an application grid with "auto-apply oldest first", unapplied amount.
- AR aging, statement of account.
- AP bills and AP aging.
- Checks, modeled on the Logisuite check screen:
  - computer/manual check numbering
  - Payments & Debits grid
  - direct expense lines with a GL picker
  - approve, print check + voucher (amount in words, "pesos and centavos"), signatories, post
- Accounting Bridge queue: proposed Dr/Cr lines, balanced indicator, trial post / final post / reject, jvNo display.

**Ledger**
- Chart of accounts tree with CRUD.
- Journals/vouchers by book (CDB, CRB, sales, purchase, general, adjustments) with a balanced-entry grid, trial and post.
- Posting page.
- Reports: TB, BS, IS, GL, books, with period selection, Excel and print.
- Month-end checklist and close.
- Banks, suppliers, signatories.

**Dashboard**
- Role-aware KPIs, charts (recharts) and actionable lists (ETAs, cutoffs, overdue invoices, low-margin files).
- Quick actions; all real data.

**Masters**
- Parties: type flags, PH TIN mask, VAT-registered and withholding-agent flags, credit terms/limit, addresses, contacts, SCAC/IATA codes, FS supplier link, Excel import.
- Ports: UN/LOCODE and IATA.
- Billing codes: VAT class, GL revenue/cost accounts, default basis/rate, showOnDoc.
- Tariffs, with a "which tariff wins" explainer.

**Admin**
- Users, company settings (BIR fields, margin gate, EWT defaults, GL defaults, bank→GL map, numbering preview), audit log viewer.

**Portal**
- Customer login, "my shipments" list, documents, invoices.
- Public `/track/:ref` page with minimal fields.

---

### 5.1 Status update (agents finished after this file was first written)
- **fe-pd-vehicle: DONE.**
  - Files: `src/api/{pd,vehicles,fleet}.ts`, `src/modules/{pd,vehicles,fleet}/*`.
  - Exports `pdRoutes`, `vehicleRoutes` and `fleetRoutes`.
  - `tsc` and `vite build` passed.
  - Backend gaps:
    - Fleet registration/insurance expiry fields and a separate driver license-expiry field are missing from the schema; add them.
    - P/D cancel reason, POD remarks and photo are not persisted by the actions.
    - No binary attachment upload endpoint.
- **fe-acct: DONE.**
  - Files: `src/api/{billing,ledger}.ts`, `src/modules/billing/{pages,routes}.tsx`, `src/modules/ledger/{pages,routes}.tsx`.
  - `tsc` and `vite build` passed.
  - Not browser-tested.
  - Backend gaps:
    - Generic CRUD nested create needs `companyCode` injected into child rows (invoice/AP/receipt/check lines). Fix in `server/src/lib/crud.ts` or the specific routes.
    - SMTP/PDF send is not configured; the Send button is disabled.
- **fe-dash-portal:** was still running at the last update. Check on disk whether `src/modules/{dashboard,masters,admin,portal}` and `src/modules/dashboard/globalSearch.ts` are complete.

## 6. REMAINING TODO (in priority order)

1. **Wire the modules into the app.** Edit `src/routes.tsx` (+ `App.tsx`):
   - Import the route manifests from §4.4 / §5 and replace `Placeholder` and legacy components (OceanFreightManager, AirFreightManager, PDOrdersManager, VehicleInventoryManager, FleetDispatchManager, AccountingBridgeView, legacy `components/fs/*`, OperationsOverview).
   - Keep sidebar labels, groups, icons and shortcuts.
   - Mount portal routes **outside** AppShell and auth.
   - Plug `searchGlobal` into the AppShell command palette.
   - Remove the `CalendarIcon` hack in `routes.tsx` (use lucide `CalendarCheck`).
   - Leave legacy files on disk until everything works, then delete dead legacy code (`components/logistics/*`, `components/fs/*`, `stores/logisticsStore.ts`, `api/mappers.ts`, `pages/LogisticsSystem.tsx`, `FSSystem.tsx`, etc.) once unreferenced.
2. **Get the build green.** Both `npx tsc --noEmit` (frontend and server) and `npx vite build` must pass.
3. **Reconcile frontend ↔ backend contracts.** Each agent coded against a moving backend. Click through every screen against the real API and fix 404/400 and field-name mismatches. Known gaps:
   - Status-events `entityType/entityId` filter.
   - Verify `/lookups/global` exists.
   - Quote print payload.
   - Possibly Driver/FleetVehicle models.
   - CompanySetting keys (`bankAccounts`, `withholdOnVendors`, margin gate).
4. **Reset the dev `kornet.db`.** The smoke test left rows behind (company OTHER, a `viewer…` user, smoke parties/files/invoices). Run `prisma db push --force-reset` then the seed, or restore from the backup and push the schema. Make sure the seed creates: admin user, KORNET company, CompanySetting defaults, PH ports (PHMNL, PHCEB, PHDVO, PHSFS, MNL, CEB, DVO… plus major trading partners), billing codes (OFRT, AFRT, THC, DOC, BL fee, AWB fee, brokerage, trucking, customs duties as reimbursable, etc.) with VAT classes and GL accounts. No fake customers or transactions.
5. **UI polish.**
   - "Comfort" density looks oversized (huge text and sidebar items at 1440px). Tune the type scale and spacing so Comfort ≈ 14px base and Compact ≈ 13px.
   - Check dark and light modes on every page.
   - Animations ≤ 200ms; respect `prefers-reduced-motion`.
   - Dashboard header text like "Enterprise Logistics & Freight Operations" / "All Terminals (Consolidated Nationwide)" is legacy fluff; the new dashboard should replace it.
6. **QoL automation to verify end-to-end.** Fix any that don't work:
   - Creating a shipment auto-applies tariffs.
   - Cargo/container edits recalc totals and refresh tariff charges.
   - Generate invoices / AP bills from a file in one click.
   - Posting stages to the bridge; bridge post writes `jeNo` back.
   - Receipts auto-apply oldest invoices first.
   - Close-check is shown before close; clone file works.
   - Keyboard shortcuts work on every page.
   - Paste-from-Excel works in the cargo grid.
   - VIN decode works.
   - Party address snapshots autofill.
7. **QA E2E.** Use Playwright (install as a devDependency) for the full flows:
   - login → quote → convert → shipment → cargo/containers → charges/tariffs → HBL/HAWB issue → invoice → post → bridge trial/final (against a ledger **copy**) → TB report shows it → receipt → AP bill → check → close file
   - P/D dispatch/complete
   - vehicle lifecycle
   - portal tracking
   - RBAC (viewer read-only)
   - Fix the bugs found.
8. **DevOps.**
   - `.github/workflows/azure-deploy.yml`:
     - Node **22** (needed for `node:sqlite`; it currently uses Node 20)
     - build web + server
     - `prisma generate`
     - deploy package that excludes `.db` files
   - Production startup: run `prisma db push`/migrate and seed if empty on first start.
   - `accounting.db` location via `ACCOUNTING_DB_PATH` on persistent storage (Azure `/home`).
   - App settings to document: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `PORTAL_JWT_SECRET`, `CORS_ORIGIN`, `DATABASE_URL`, `ACCOUNTING_DB_PATH`, `NODE_ENV=production`. Azure startup now also detects `WEBSITE_SITE_NAME` and runs schema sync if `NODE_ENV` is unset; set `NODE_ENV=production` and configure strong JWT secrets before relying on production secret validation.
   - Check the server start script (`node server/dist/src/index.js`) serves the built SPA.
   - Health endpoint.
   - DB backup script.
9. **Security review** (security-review agent).
   - Areas: auth/JWT/refresh, RBAC on every route, IDOR (company scoping), portal, file uploads/attachments, SQL in fsLedger (parameterized?), XSS in print HTML (escape all user strings in `print.ts` and other print templates), rate limiting, secrets.
   - Present the findings as a severity table.
10. **Docs + commit.**
    - Update `README.md`: setup, env, scripts, architecture, module guide, shortcuts list.
    - Commit on `overhaul/v2` with the Co-authored-by trailer.
    - **Do not push.**
    - Report to the user, including the open question: should the FS ledger cover other companies, or Kornet only?

---

## 7. Known issues / things that DON'T work yet
- **Placeholder pages:** most sidebar entries still render the legacy component or `ModulePlaceholder` because routes are not wired (TODO #1). From the user's view, these pages "don't work" yet:
  - Quotes, Domestic
  - Invoices, Receivables, Payables, Disbursements
  - Parties, Ports, Billing Codes
  - Users, Settings, Audit Log
- **Legacy pages:** Ocean/Air/P-D/Vehicles/Fleet/Bridge/FS still show the **legacy** components, which call the old API shapes and old `/fs/*` endpoints. They will break or show empty data against the v2 backend until they are replaced.
- **Old dashboard:** the dashboard is the legacy OperationsOverview showing zeros and filler text.
- **Frontend type errors:** `tsc` failed in in-progress `modules/fleet` and `modules/ledger` at handoff.
- **Dirty dev data:** `kornet.db` contains smoke-test data (TODO #4).
- **Azure workflow:** still on Node 20, which will crash on `node:sqlite` (TODO #8). Main also still tracks the old DB files; the `git rm --cached` is only on `overhaul/v2`.
- **Payroll tables:** `pay_*` tables in `accounting.db` are out of scope and untouched.
- **Signatories:** the `fs_signatories` table is empty for KORNET. An admin must enter real signatories (the UI must handle the empty state).
- **Leftover processes:** a dev server may still be running from the previous session (ports 3000/4000). Check with `Get-NetTCPConnection -LocalPort 3000,4000 -State Listen` and stop by PID if needed.

---

## 8. Suggested approach for the next agent
- Read `SPEC.md`, this file, and `src/components/ui/README.md` first.
- Run `git status` and list `src/modules/*` to see what the in-flight agents actually produced.
- Do TODOs 1–4 yourself; they are integration work needing one consistent view.
- Then delegate QA, DevOps and Security to sub-agents. Use lighter models per the user's request, but verify their output yourself with builds, the smoke test and screenshots.
- Keep the quality bar: no fake data, no dead buttons, every field wired, keyboard-first, premium look.
