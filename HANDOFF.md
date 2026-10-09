# Kornet Express v2 Overhaul — Handoff for the Next AI Agent

_Last updated: 2026-10-09 after controlled production logistics-to-ledger E2E QA._

## Production state — 2026-10-09

This section supersedes older deployment/status statements below where they conflict.

### Live deployment and code

- Production App Service: `Kornet-Logistics-prod`, resource group `RG-MyApp-Prod`, host `kornet-logistics-prod-b6hweub8gzc9cxej.westus3-01.azurewebsites.net`.
- The previous DB/startup fixes, UI text repair, charge CRUD, quote conversion aggregate fix, FS posted-row counter fix, check metadata fix, automatic finance-draft generation on house freight document issuance, and AR/AP query-cache refresh are deployed. Latest commit `2bb8bc1c2e78c2704ba360605e7db23fd1705e3a`; GitHub Actions run `37868295718` succeeded. Local root and backend builds passed.
- The dashboard/database recovery details and Azure configuration remain as documented in the prior handoff history below. No credentials or secret values are recorded here.
- Latest authenticated production health check returned HTTP 200. FS period is September 2026 (`2026-09-01` through `2026-09-30`). Azure Resource Health reports `Unknown` because the current App Service plan type does not support that signal. AppLens reported the app on a single instance; its latest CPU detector was below 70%, although an earlier diagnostic had a conflicting 92% health-summary reading. Do not scale the plan without an explicit cost/availability decision.

### KORNET ledger cleanup and preservation

- Before cleanup, a fresh backup of both production databases was verified at `/home/kornet-qa-backups/cleanup-20261009-0030/`:
  - `kornet.db`: 839,680 bytes, SHA-256 `f4e5ba0bdbd146b30ab102aa02cf22f0189f9f85ef088331e8c2bd692a92f4f7`.
  - `accounting.db`: 6,447,104 bytes, SHA-256 `66a701f272681a886c674bd653ecf4d4052f831467389f621f95e389851bc02c`.
- Per the user's approval, KORNET's 15 legacy FS vouchers were soft-deleted, 10 orphaned legacy app checks and 20 staged `LEGACY` bridge rows were removed, and KORNET opening balances/movements were cleared. The KORNET chart now has 11 required accounts, including defaults 1130, 2117, 4215 and 4515. The other 17 company partitions in `accounting.db` were preserved.
- After E2E final posting, KORNET's September trial balance is balanced: debit PHP 1,358.40, credit PHP 1,358.40. Month-end checklist is `ok=true`, with zero unposted items. This includes the posted-row-aware count fix; all four QA postings are excluded from unposted counts.

### Controlled production E2E scenario — intentionally retained QA data

The user explicitly authorized production test records and requested the encoded test data be left in the app. These records are synthetic, unmistakably QA-labeled, and must not be treated as real customer business:

- Customer `QA-E2E-CUST-20261009` (`cmv08eh2l000musi5l6g2hixq`) and vendor `QA-E2E-VEND-20261009` (`cmv08ehfz000pusi5wam2si6z`).
- Quote `QT-2026-00002` (`cmv08en8o000tusi5vq6jrna8`) converted to ocean export shipment `OE-2026-00002` (`cmv08g36s001jusi5u6xwtpdu`), now `CLOSED`. One QA crate: 720 kg, 1.2 CBM, 1.2 W/M.
- QA HBL `QA-HBL-OE-2026-00002` (`cmv08z3ps0004k6lypgw7100h`) is `ISSUED` and linked to the cargo line. HBL preview returned one cargo line and one charge.
- Charge `DOC`: bill PHP 1,200 + VAT PHP 144; cost PHP 720. Shipment analysis: revenue PHP 1,200, cost PHP 720, profit PHP 480, margin 40%.
- Tariff application was exercised and returned no charges because KORNET has no active tariff records. Automatic tariff pricing is therefore not validated.
- Financial documents were backdated to 2026-09-30 / `glPeriod=2026-09` to match the open FS period:
  - Sales invoice `SI-2026-000001` (`cmv08zp8d000fk6lyolum3gfi`): taxable sales PHP 1,200 + VAT PHP 144 = PHP 1,344; fully paid, AR balance zero; FS journal `SB-202609-0001`.
  - AP bill `AP-2026-000001` (`cmv08zq3c000mk6lyc4ni204e`): cost PHP 720 + input VAT PHP 86.40 - EWT PHP 14.40 = payable PHP 792; fully paid, AP balance zero; FS journal `PB-202609-0001`.
  - Receipt `CR-2026-000001` (`cmv090ilw000uk6lyq8z80hqz`): PHP 1,344, posted; journal `CR-202609-0001`.
  - Check voucher `CV-2026-000001` (`cmv090nwh0010k6lyy32ezxb6`): printed check `CHECK_1-2026-00001`, bank 1, PHP 792, posted; journal `CDV-202609-0001`. The FS check master was verified to preserve the actual printed check number and bank number.
- All four corresponding bridge items passed trial post and final-posted. All are `POSTED`, with balanced debit/credit totals. Invoice and AP bill are paid; shipment close-check passed and shipment is closed.
- No QA production records were deleted after posting. The earlier smoke party `QA-20261008231909` and draft quote `QT-2026-00001` with an open PHP 100 charge also remain from the prior session.
- A second QA-only shipment tests the new automation: `OE-2026-00003` (`cmv09n9hj0004x0g865jeyyly`), charge `DOC` (`cmv09nafx000bx0g87fja7fmq`), and issued house BL `QA-AUTO-BL-OE-2026-00003` (`cmv09naur000fx0g8u9hxsyk0`). Issuance automatically created draft invoice `SI-2026-000002` (`cmv09nbu4000lx0g8k8qei8gg`; PHP 100 + PHP 12 VAT = PHP 112) and draft AP bill `AP-2026-000002` (`cmv09nc4g000rx0g8lmd8owq8`; PHP 50 + PHP 6 input VAT - PHP 1 EWT = PHP 55). Both remain `DRAFT`; no bridge or GL entry was created. Reissuing the already-issued document did not create duplicates.
- The auto-draft trigger applies to HOUSE-class `BL`, `HBL`, `AWB`, and `HAWB` documents. MASTER docs and domestic `DR`/`WAYBILL` docs do not trigger this automation. Frontend success feedback reports draft counts and invalidates AR/AP queues.

### Fixes discovered during E2E QA

- Quote conversion copied cargo but left shipment aggregates at zero. Commit `f361e4b` now recalculates copied cargo totals when a converted shipment's derived totals are all zero. Deployed and production-verified: 1 piece, 720 kg, 1.2 CBM and 1.2 W/M.
- FS unposted counts included rows already final-posted to the ledger. Commit `6d8f64f` excludes rows with matching posting-log entries. Deployed and verified after all four postings: zero unposted.
- Final CDB bridge posting omitted the printed check number and bank number from the legacy FS check master. Commit `de587b9` now loads those values from the source check before final posting. Deployed and verified against check master number `CHECK_1-2026-00001`, bank 1.
- Per the user's approval, issuing a HOUSE-class BL/HBL/AWB/HAWB now creates eligible invoice/AP **drafts only**; it does not post financial entries or create checks. The API reports generated document numbers and the UI shows the resulting draft counts. Production-tested with `OE-2026-00003`; retry did not duplicate drafts.
- Earlier in this QA, charge detail/update/delete routes were added and verified in production (GET/PATCH/DELETE 200/200/204; deleted charge then returned 404).

### Still outstanding — do not call the app fully QA-complete

- This was one controlled Ocean Export LCL scenario, not a full system/module/button/field certification. Air export/import, ocean import, FCL/container flows, domestic/P&D orders, vehicle/RoRo, fleet/dispatch, customer tracking portal, all document types, and broader dashboard/report screens remain to be exercised.
- Finance edge cases remain: customer withholding-agent receipts, partial/multiple invoice applications, unapplied deposits, partial AP/check settlements, direct check expenses, manual checks, voids/credit memos/reversals, multiple vendor/customer groupings, and period-close/exception paths.
- The FS ledger is still open only through September 2026, while newly generated drafts use the current October 2026 date/period. Do not post `SI-2026-000002` or `AP-2026-000002` until an accountant updates the fiscal period or intentionally corrects the document dates/period. Do not backdate or close periods automatically.
- No tariffs existed, so tariff match precedence, validity dates, currencies, minimums and container-specific ratings were not tested.
- The automatic draft-creation endpoint was production-tested directly through the authenticated API; the user-facing toast and cache refresh were type/build-checked but not yet verified through a complete interactive browser click-flow.
- No full role/permission matrix, concurrency/race testing, restore-from-backup drill, security review, browser/device accessibility pass, or full regression suite was completed. The current plan's one-instance redundancy and unsupported Resource Health signal merit operational review.
- The old smoke quote `QT-2026-00001` and new E2E QA records are intentionally retained. Do not clean them up or modify other company partitions without explicit authorization and a verified backup.
- Pre-existing worktree changes are unrelated and must remain untouched: modified `.github/workflows/azure-deploy.yml` and untracked scripts `check-accts.mjs`, `check-co.mjs`, `check-fs.mjs`, `list-tables.mjs`.

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
- The current production fixes are committed and deployed from **`main`** as listed above. Future deployment changes require an explicit user request because pushes to `main` auto-deploy.
- Production QA data was added only under the user's explicit request and is marked QA-only; do not add financial postings or other irreversible test data without a safe void/cleanup plan. Kornet is a single-company system (`KORNET`); do not add company selection or user company assignments. Existing company-code database columns are compatibility data and must not be deleted or repurposed without a verified backup.
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

## 9. Production QA continuation - 2026-10-09

This section supersedes older statements above wherever they conflict with the current production state. It records a focused live QA pass; it is not evidence that every module or field has been fully tested.

### Dashboard fixes already deployed

- `d4bcf4d` (`d4bcf4db8e563f94f645e5bf68c1b6a71a9b4d3d`): dashboard worklists and posted-only AR/AP aging; bounded MTD revenue excluding VAT; by-mode MTD data; due-this-week AP; shipment ETA/cutoff lists.
- `f07451f` (`f07451fe601886912305abd647df9a924141ece9`): `pdToday` excludes completed/cancelled orders and counts active orders by scheduled delivery date.
- `a772524` (`a772524`), deployment run `37872778916`: dispatch-dialog resource filtering and shared query invalidation across the P/D screens.
- `d598668` (`d5986681a4ea917a697bf62e63b9178ab7e5e423`), deployment run `37873225457`: inspection numbers use a dedicated `INSP` sequence instead of consuming `WR` numbers.
- All four relevant GitHub Actions deployments succeeded. The inspection-numbering deployment initially left the old server process live; a soft App Service restart was needed before the new prefix appeared. After restart, health and dashboard summary returned HTTP 200; drafts remain excluded from AR/AP, so AR and AP are PHP 0 while the current-month posted-income values remain empty.

### Dispatch workflow fix deployed and production-verified

- Commit `867b6e4` (`867b6e449cb1210c71532861faba39f9b5dd09b0`), deployment run `37870951031`, succeeded.
- Changed `kornet-system/server/src/routes/logistics.ts`:
  - Dispatch now checks company ownership, reserves an available driver and vehicle, and blocks concurrent conflicting assignments.
  - Multiple P/D orders may join an active route only with its assigned driver and vehicle.
  - Completing/cancelling the last active order releases resources; route state completes only after its open/active work is finished.
  - Invalid status transitions remain explicit conflicts; completion requires a POD signer.
- Changed `kornet-system/src/modules/pd/PdOrdersPage.tsx` and `kornet-system/src/modules/pd/PdDispatchBoard.tsx`:
  - Route selection is passed to the dispatch API.
  - Existing route assignments preselect their driver/vehicle.
  - Resource/route queries refresh after dispatch, completion, and cancellation.
- Production workflow checks passed: wrong driver/vehicle for an active route returned 409; joining that route with its assigned resources returned 200; completing one of multiple route orders kept resources `ON_ROUTE`; completing the final stop released both to `AVAILABLE` and completed the route; dispatch-then-cancel also released resources.
- The dispatch dialogs now show only available resources unless joining an active route, where only its assigned driver/vehicle are selectable. P/D board/list queries invalidate together after mutations.
- Production `/api/health` and `/api/dashboard/summary` returned HTTP 200 after deployment.
- `npm run build` passed in `kornet-system/` and `kornet-system/server/`. There is no configured backend test script/test suite; do not treat “no tests found” as a test pass. The frontend build reports existing chunk-size/dynamic-import warnings.

### Vehicle inventory QA

- `QA-SIM-VEHICLE-001` (`cmv0bsoxx0002q9m7ovimzfmf`) completed EXPECTED -> RECEIVED -> inspected -> ON_HOLD -> RECEIVED -> READY_TO_SHIP. Readiness guards rejected the premature transition and missing title/lien prerequisites with 409.
- This first record exposed the inspection/WR sequence collision: it received `WR-2026-00001` and the old backend wrongly assigned inspection number `WR-2026-00002`.
- `QA-SIM-VEHICLE-002` (`cmv0bynz1000fq9m7lt9z2kei`) also received an incorrectly prefixed inspection number before the successful restart (`WR-2026-00004`).
- After the soft restart, `QA-SIM-VEHICLE-003` verified separate numbering: receipt `WR-2026-00005`, inspection `INSP-2026-00001`. The older two QA-only inspection numbers remain historically incorrect; decide whether to relabel them safely without colliding with the new sequence.
- Vehicle 001 is `READY_TO_SHIP`; vehicle 002 and 003 remain `RECEIVED`. Continue inventory testing with container link/load, temporal release, title-rejected and withdrawal guards. All VIN values are conspicuously QA simulation identifiers, not customer VINs.

### QA-only production records

All listed records are synthetic and visibly QA-marked. They were not posted to the general ledger, paid, or treated as real customer activity.

- Shipments:
  - `OI-2026-00001` / `cmv0agv070002ppuh4awj7tw7`: Ocean Import FCL; invoice `SI-2026-000003` and AP `AP-2026-000003`, both drafts.
  - `AE-2026-00002` / `cmv0agz0g0010ppuh8fa24ij0`: Air Export; invoice `SI-2026-000004` and AP `AP-2026-000004`, both drafts.
  - `AI-2026-00001` / `cmv0ah28w001uppuh9x4rs2nw`: Air Import; invoice `SI-2026-000005` and AP `AP-2026-000005`, both drafts.
  - `OE-2026-00004` / `cmv0ah55v002nppuhse00no6k`: Ocean Export LCL; invoice `SI-2026-000006` and AP `AP-2026-000006`, both drafts. Its destination was corrected from `NRT` to the existing master-data seaport `LAX` (Port of Los Angeles).
- P/D:
  - `PD-2026-00001` completed with a simulated POD.
  - `PD-2026-00002` and `PD-2026-00003` completed as two orders on route `DT-2026-00002`.
  - `PD-2026-00004` and resource-release test `PD-2026-00005` cancelled.
  - `PD-2026-00006` remains intentionally `OPEN`, QA-only, and due today to exercise the dashboard scheduled-delivery card. Dashboard currently reports `pdToday: 1`.
- Fleet resources: two QA-only drivers and two QA-only vehicles; all currently `AVAILABLE`. QA-only routes `DT-2026-00001` and `DT-2026-00002` are `COMPLETED`.
- Latest observed dashboard summary: HTTP 200, `pdToday: 1`, 4 upcoming ETAs, 3 upcoming cutoffs, AR PHP 0, AP PHP 0.

### Important unresolved QA data-quality issue

Do not regard `AE-2026-00002` as a representative, reconciled air-freight example yet:

- Its cargo line says 4 pieces, gross 118 kg, dimensions 91 x 100 x 100 cm, but stored CBM is only 0.75. Given the application's per-piece dimension calculation, those dimensions imply 3.64 CBM.
- The shipment recalculation reports `totalVolumetricKg: 606.67` and `totalChargeableKg: 607`, while its charge and invoice line still use quantity 118 at PHP 58/kg (PHP 6,844). The AP draft line is PHP 4,602 (118 x PHP 39). The cargo line's stored `chargeableKg: 126` is also stale relative to the shipment aggregate.
- Financial charge fields are locked once invoice/AP generation marks them billed, even while the documents are drafts. Do not bypass this lock or post anything. Decide a safe correction: either add supported synchronization/editing of linked draft invoice/AP lines and charge, or clearly invalidate/replace only this QA sample. Keep the ledger unchanged.

### Next QA steps

1. Resolve the Air Export mismatch above; verify cargo dimensions, CBM, shipment totals, charge quantities, and linked draft invoice/AP values agree before using it as a workflow example.
2. Continue targeted tests for vehicle-inventory lifecycle, quote conversion, shipment-to-draft-finance recalculation, receipts/checks, and bridge/ledger read behavior. Do not post October finance entries or alter the September ledger period without approval; zero posted October metrics are correct.
3. Keep load testing off production's single low-tier instance. Azure Load Testing resource discovery previously failed; no stress test has been run.
4. Refresh this handoff after the next QA pass. Preserve unrelated worktree changes listed in `git status`; only the three dispatch implementation files were included in commit `867b6e4`.
