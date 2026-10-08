# Bugfix Requirements Document

## Introduction

Kornet Express, Inc. is a Philippine freight forwarding company (ocean/air/domestic export-import, vehicles/RoRo, pick-up/delivery). Their web logistics ERP (`kornet-system`) is half-built: the backend domain layer and UI component library are complete, but 15 distinct defects prevent the system from being production-ready. These range from missing backend models and broken CRUD pipelines, to placeholder UI, dirty seed data, a broken CI workflow, and absent QoL automations that are central to daily freight operations. This document defines each defect in terms of its observable wrong behavior, the exact condition that triggers it, the expected correct behavior, and what must remain unchanged after the fix.

The system must emerge from this overhaul as a premium, production-ready logistics ERP that reflects how a Philippine freight forwarder actually operates — comparable in quality to commercially sold logistics software.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN any page or route renders THEN the system displays basic unstyled Tailwind cards with no motion, no hover micro-animations, no page-transition animations, and no premium visual depth — the UI does not meet the "million-peso enterprise software" bar described in the product requirements.

1.2 WHEN a user opens the Dashboard page THEN the system shows StatCards and charts with zero or stale values because `GET /api/dashboard/summary` either returns empty data or the frontend does not map the response fields correctly to the KPI card slots.

1.3 WHEN a user navigates to Currencies/FX (`/directories/currencies`) or any other route that is still wired to `ModulePlaceholder` THEN the system renders an empty state with no functional content, providing no operational value.

1.4 WHEN the ShipmentWorkspace renders and calls the backend THEN the system may receive 404 or 400 errors because `GET /api/logistics/lookups/global` is absent, status-events are not filtered by `entityType`/`entityId`, and field names in request/response payloads do not match the v2 Prisma schema shapes.

1.5 WHEN the Fleet & Dispatch page (`/logistics/fleet`) loads THEN the system crashes or renders empty because the backend Prisma schema has no `Driver` or `FleetVehicle` models and no REST endpoints exist for them.

1.6 WHEN a user cancels a P/D order and provides a reason, or completes a P/D order with POD remarks and a photo THEN the system silently discards the cancel reason, POD remarks, and photo — they are not sent to the backend and are not persisted.

1.7 WHEN a user saves a new Invoice, Receipt, AP bill, or Check that contains line items or child records THEN the system fails to persist the child rows because the generic CRUD nested-create path in `server/src/lib/crud.ts` does not inject `companyCode` into child record payloads, causing a constraint violation or silent omission.

1.8 WHEN a user opens the Accounting Bridge page THEN the system may display bridge items without Dr/Cr line detail, the trial-post and final-post actions may fail or return errors, and after a successful final post the `jeNo` is not written back to the source document.

1.9 WHEN the development server starts and queries any logistics list THEN the system returns test artifacts — company "OTHER", a `viewer…` test user, smoke-test parties, and smoke-test shipments — that were written by the backend smoke flow and pollute every list view, making the app appear to contain fake operational data.

1.10 WHEN the Azure CI/CD pipeline runs on a commit to `main` THEN the system crashes at startup because `.github/workflows/azure-deploy.yml` specifies Node 20, but `server/src/lib/fsLedger.ts` uses `node:sqlite` which requires Node ≥ 22.

1.11 WHEN a user creates an AWB or BL on a shipment file THEN the system does not automatically apply tariff charges to the file; WHEN a user edits cargo or container dimensions/weight THEN totals and tariff charges are not recalculated; WHEN a user clicks "Generate invoices" or "Generate AP bills" on a file THEN no batch invoice or AP bill is created; WHEN a user creates a receipt THEN open invoices are not auto-applied oldest-first without manual selection; WHEN a user attempts to close a file THEN the system does not run the close-check or surface blockers; WHEN a user pastes rows from Excel into the cargo grid THEN nothing happens; WHEN a user presses a documented keyboard shortcut on a page other than the Dashboard THEN the shortcut has no effect.

1.12 WHEN auth endpoints (`/api/auth/login`, `/api/auth/refresh`) receive repeated requests from the same IP THEN the system does not rate-limit them, leaving them open to brute-force; WHEN a print template renders user-provided data THEN the system interpolates strings directly into HTML without escaping, creating XSS vectors; WHEN a route handler processes a request THEN company-scoping via `getOwned` may not be applied on every protected entity, creating IDOR exposure; WHEN the portal JWT secret is not set in the environment THEN the system silently falls back to `JWT_ACCESS_SECRET`, allowing portal tokens to be forged by anyone with the main JWT secret.

1.13 WHEN a user opens any FS report (Trial Balance, Balance Sheet, Income Statement, GL Detail) THEN the system either returns empty data or renders a non-functional page; WHEN the user selects a period and clicks Export to Excel THEN no file is downloaded; WHEN the user runs the month-end checklist and attempts to close the period THEN the action fails or has no effect.

1.14 WHEN the app is viewed at 1440 px width with the "Comfort" density setting active THEN sidebar items, body text, and form labels appear oversized (effectively larger than 14 px base), making the layout feel like a tablet app rather than a desktop ERP.

1.15 WHEN a user opens the ⌘K command palette and types a query THEN the system returns no live search results because `searchGlobal()` is not wired to the command palette input, and `GET /api/logistics/lookups/global` either does not exist or its response is not rendered in the palette UI.

---

### Expected Behavior (Correct)

2.1 WHEN any page or route renders THEN the system SHALL apply Framer Motion page transitions (fade + 8 px slide-up, 200 ms ease-out), hover lift on all Card components (+2 px translateY + elevated shadow, 150 ms), button press scale (0.97, 100 ms), Sheet/Dialog slide-in (300 ms ease-out), and sidebar collapse/expand (250 ms), all gated behind a `prefers-reduced-motion` check that disables motion when the OS setting is on; typography SHALL use Inter Variable for body, Geist Sans for headings and stat numbers, and JetBrains Mono for all monetary values and reference codes; dark mode SHALL use layered HSL surface tokens (not simple color inversion) so cards, sidebars, and modals each have distinct depth; every interactive element SHALL have a visible hover and focus state meeting WCAG 2.1 AA contrast.

2.2 WHEN the Dashboard page renders THEN the system SHALL call `GET /api/dashboard/summary` and correctly map every response field to its corresponding StatCard, chart dataset, and work-queue list; all 8 KPI cards SHALL show real server values; the AR aging chart, revenue-vs-cost chart, and files-by-status chart SHALL render with real data; every work-queue row (ETAs, cutoffs, overdue invoices, low-margin files) SHALL be a clickable link that navigates to the correct source record route.

2.3 WHEN a user navigates to any previously placeholder route THEN the system SHALL render a fully functional page backed by real API data; the Currencies/FX page SHALL either display a working currency and FX-rate management UI backed by a `Currency` model and corresponding API endpoints, or, if the model is explicitly out of scope, the route SHALL display a clearly labeled "Out of scope for this release" notice with no broken layout.

2.4 WHEN the ShipmentWorkspace calls the backend THEN the system SHALL resolve all field-name mismatches between the frontend store and the v2 Prisma schema; `GET /api/logistics/lookups/global` SHALL exist and return an array of `{ id, type, ref, label, route }` records covering shipments, invoices, parties, and ports; status-events SHALL be filterable by `entityType` and `entityId` query parameters; quote print SHALL be handled client-side using jsPDF with all required quote fields.

2.5 WHEN the Fleet & Dispatch page loads THEN the system SHALL display a fully functional fleet management UI; `Driver` and `FleetVehicle` SHALL exist as Prisma models in `schema.prisma` with fields for plate, type, capacity, registration expiry, insurance expiry (FleetVehicle) and license number, license expiry, name (Driver); REST endpoints SHALL exist for CRUD on both models under `/api/logistics/fleet-vehicles` and `/api/logistics/drivers`; the frontend page SHALL show expiry warnings when registration, insurance, or license expiry is within 30 days.

2.6 WHEN a user cancels a P/D order THEN the system SHALL send the cancel reason string to `PATCH /api/logistics/pd-orders/:id` and the backend SHALL persist it in the `cancelReason` field; WHEN a user completes a P/D order with a POD THEN the system SHALL send `signedBy`, `podAt`, `podRemarks`, and optionally `podPhotoUrl` to the backend and persist all fields; all these fields SHALL be visible when the completed or cancelled P/D order is re-opened.

2.7 WHEN a user saves a new Invoice, Receipt, AP bill, or Check with child line items THEN the system SHALL successfully persist all child rows; the generic nested-create path in `server/src/lib/crud.ts` SHALL inject `companyCode` (taken from `req.company.code`) into every child record before inserting, so no constraint violation occurs; the saved document SHALL be immediately retrievable with its full line items via the corresponding GET endpoint.

2.8 WHEN the Accounting Bridge page loads THEN the system SHALL display each bridge item with its proposed Dr/Cr line detail parsed from `linesJson`; the "Trial post" action SHALL call `POST /api/billing/bridge/trial` and reflect `TRIAL_OK` or `TRIAL_ERROR` status on each item; the "Final post" action SHALL call `POST /api/billing/bridge/post` and, on success, SHALL write the returned `fsJvNo` back to the source document (Invoice, Receipt, AP Bill, or Check) as `jeNo`; the "Reject" action SHALL persist a rejection reason and set status to `REJECTED`.

2.9 WHEN the development environment is initialized THEN the system SHALL contain only seed data: one company (code=`KORNET`, name="Kornet Express Inc."), one admin user (`admin` / `kornet2000`), Philippine ports (PHMNL, PHCEB, PHDVO, PHSFS, MNL, CEB, DVO, plus SGSIN, HKHKG, CNSHA, USLAX, USNYC, DEHAM, NLRTM, JPOSA), billing codes (OFRT ZERO_RATED, AFRT ZERO_RATED, THC VATABLE, DOC VATABLE, BLFEE VATABLE, AWBFEE VATABLE, BROK VATABLE, TRUCK VATABLE, DUTIES NON_VAT_REIMBURSABLE, DISBURSE NON_VAT_REIMBURSABLE) with correct GL accounts, and `CompanySetting` defaults; no company "OTHER", no smoke-test users, no smoke-test parties, no smoke-test shipments SHALL exist.

2.10 WHEN the Azure CI/CD pipeline runs THEN the system SHALL use Node 22 in `.github/workflows/azure-deploy.yml`; the workflow SHALL run `prisma generate` before building; the built SPA SHALL be served by the Express server in production mode; the deploy package SHALL exclude all `.db` files; the health endpoint `GET /api/health` SHALL respond 200 after deployment.

2.11 WHEN a user issues an AWB or BL number on a shipment file THEN the system SHALL automatically query applicable tariffs and create `Charge` records for each matching tariff on that file; WHEN a user saves a cargo line or container record THEN the system SHALL recalculate chargeable weight (air: `max(gross, L×W×H/6000)` rounded up to 0.5 kg; ocean LCL: `max(kg/1000, cbm)` min 1) and update all tariff-driven charges; WHEN a user clicks "Generate invoices" on a file with unbilled charges THEN the system SHALL batch-create one Invoice per bill-to party grouping all `billStatus='UNBILLED'` charges; WHEN a user clicks "Generate AP bills" on a file with un-costed charges THEN the system SHALL batch-create one AP bill per vendor grouping all `costStatus='UNBILLED'` cost charges; WHEN a user opens the Receipt entry form THEN the "Auto-apply oldest first" button SHALL allocate the receipt amount against open invoices in ascending due-date order; WHEN a user clicks "Close file" THEN the system SHALL call `GET /api/logistics/shipments/:id/close-check`, display all blockers and warnings in a modal, and only allow close if there are zero blockers; WHEN a user pastes rows from Excel into the cargo grid THEN the system SHALL parse the clipboard TSV and populate cargo line rows; WHEN a user presses any documented keyboard shortcut (N, Mod+S, Mod+Enter, G+D, G+O, G+A, G+P, G+V, G+F, G+I, G+R, G+B, Alt+↓) on a page that supports it THEN the system SHALL execute the corresponding action; WHEN a user types a MAWB number that fails the 3-prefix + 7-serial + mod-7 check-digit validation THEN the system SHALL show an inline validation error; WHEN a user types a container number that fails ISO 6346 check-digit validation THEN the system SHALL show an inline validation error; WHEN a user clicks "VIN Decode" THEN the system SHALL call the NHTSA vPIC API with the entered VIN and auto-fill make, model, model year, body type fields; WHEN a user selects a party on a shipment form THEN the system SHALL auto-fill the party's latest address and contact snapshot into the corresponding shipment fields.

2.12 WHEN the auth login or refresh endpoint receives more than 10 requests from the same IP within 60 seconds THEN the system SHALL return HTTP 429 and block further requests for 60 seconds; WHEN a print template renders any user-provided string THEN the system SHALL HTML-escape all values before interpolation; WHEN any protected route handler executes THEN the system SHALL verify `companyCode` ownership via `getOwned` before returning or mutating any entity; WHEN the portal JWT is initialized THEN the system SHALL require `PORTAL_JWT_SECRET` to be explicitly set and SHALL throw a startup error if it is absent in `NODE_ENV=production`.

2.13 WHEN a user opens the Trial Balance, Balance Sheet, Income Statement, or GL Detail report page THEN the system SHALL render real financial data for the selected FS period fetched from `GET /api/fs/reports/:type`; WHEN the user clicks "Export Excel" THEN the system SHALL download a correctly formatted `.xlsx` file; WHEN the user clicks "Print" THEN the system SHALL open a print-ready HTML window; WHEN the user runs the month-end checklist THEN the system SHALL display the real checklist items and their completion status; WHEN the user confirms month-end close THEN the system SHALL call `POST /api/fs/month-end/close` and lock the period.

2.14 WHEN the app is viewed at 1440 px width with the "Comfort" density setting THEN the system SHALL render with a base font size of 14 px, sidebar item height of 36 px, and form label size of 13 px; WHEN the "Compact" density is active THEN the base font size SHALL be 13 px, sidebar item height 32 px, and form label size 12 px; all spacing SHALL be derived from the density token so no single page overrides it independently.

2.15 WHEN a user opens the ⌘K command palette and types at least 2 characters THEN the system SHALL debounce 200 ms then call `GET /api/logistics/lookups/global?q={query}` and render results grouped by type (Shipments, Invoices, Parties) with each result showing its reference number, type badge, and a secondary descriptor; selecting a result SHALL navigate to the correct route and close the palette; WHEN there are no results THEN the system SHALL display a "No results" empty state with a suggestion to try a different term.

---

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user logs in with valid credentials THEN the system SHALL CONTINUE TO issue a JWT access token and refresh token, set the auth store, and redirect to `/dashboard` without requiring company selection.

3.2 WHEN a user with role `viewer` accesses any write endpoint THEN the system SHALL CONTINUE TO return HTTP 403 and block the mutation.

3.3 WHEN a user creates, patches, or deletes a Shipment THEN the system SHALL CONTINUE TO enforce company scoping so that no user can access records belonging to a different company.

3.4 WHEN the backend smoke test (`scripts/smoke-flow.mjs`) is run against a clean copy of `kornet.db` THEN the system SHALL CONTINUE TO pass all 21 steps.

3.5 WHEN the TypeScript compiler runs (`npx tsc --noEmit`) on both `kornet-system/` and `kornet-system/server/` THEN the system SHALL CONTINUE TO produce zero errors.

3.6 WHEN `npx vite build` runs in `kornet-system/` THEN the system SHALL CONTINUE TO produce a clean production bundle with no build errors.

3.7 WHEN a user navigates to any of the five ShipmentWorkspace modes (OCEAN_EXPORT, OCEAN_IMPORT, AIR_EXPORT, AIR_IMPORT, DOMESTIC) THEN the system SHALL CONTINUE TO load the correct workspace with mode-appropriate field visibility.

3.8 WHEN the FS ledger posting engine runs a trial or final post THEN the system SHALL CONTINUE TO assert Dr = Cr and reject unbalanced entries; idempotency via `fs_post_log` SHALL be maintained.

3.9 WHEN the `GET /api/fs/signatories` endpoint is called THEN the system SHALL CONTINUE TO return only real signatory rows (none fabricated), returning an empty array if no signatories have been configured.

3.10 WHEN any list page loads and `kornet.db` contains only seed data THEN the system SHALL CONTINUE TO display a proper empty state with a clear CTA instead of crashing or showing a blank screen.

3.11 WHEN a user triggers the View-Transition API theme toggle THEN the system SHALL CONTINUE TO switch between dark and light modes with a smooth transition without a full page reload.

3.12 WHEN the app shell sidebar is rendered THEN the system SHALL CONTINUE TO group navigation items by section (Operations, Billing, Ledger, Directories, Admin), apply role-based visibility, and highlight the active route.

3.13 WHEN the `node:sqlite`-based `fsLedger.ts` engine reads or writes `accounting.db` THEN the system SHALL CONTINUE TO scope all queries to `company_code = 'KORNET'` and SHALL CONTINUE TO use parameterized statements, not string concatenation, for all user-influenced values.

3.14 WHEN the git working tree is checked THEN the system SHALL CONTINUE TO be on branch `overhaul/v2` and SHALL NOT push to `main` or `master` under any circumstance.

3.15 WHEN the portal route `/track/:ref` is accessed without authentication THEN the system SHALL CONTINUE TO render the public customer tracking page outside of AppShell and without requiring a staff JWT.
