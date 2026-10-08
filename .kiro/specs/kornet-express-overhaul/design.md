# Kornet Express Overhaul — Bugfix Design

## Overview

Kornet Express's logistics ERP (`kornet-system`) has 15 distinct defects that prevent production deployment. The stack is React 18 + Vite 5 + TypeScript + Tailwind 3 + Zustand + React Query + Radix UI + Framer Motion + cmdk on the frontend, and Express + Prisma 5 + SQLite + Node 22 + `node:sqlite` (accounting.db) on the backend.

The fix strategy is surgical: each defect is addressed in the narrowest scope possible without touching unrelated code. Where a defect turns out to be already partially or fully implemented, implementation tasks are limited to verification tests only. The fixes are ordered so infrastructure-layer changes (seed, CI) land first, followed by backend route fixes, then frontend fixes.

---

## Glossary

- **Bug_Condition (C)**: The input condition that triggers a specific defect (wrong rendering, missing field, failed request, etc.)
- **Property (P)**: The observable correct behavior that must hold once the defect is fixed
- **Preservation (¬C)**: All other inputs/states that must behave identically before and after the fix
- **`companyCode`**: The tenant key scoping all Prisma records (`'KORNET'` in the single-tenant deployment)
- **Bridge item**: A `BridgeItem` record staging a logistics double-entry journal for FS posting
- **`fsJvNo`**: The FS journal voucher number written back to the source document after a final bridge post
- **Density token**: A CSS custom property (`--density-row`, `--density-control`) that all height-sensitive UI elements inherit from
- **`injectCompanyCode`**: The recursive function in `server/src/lib/crud.ts` that stamps `companyCode` on all nested Prisma `create` sub-objects
- **`safeLines(linesJson)`**: A utility that parses a `BridgeItem.linesJson` string into `{ dc, acctCode, amount, memo }[]`

---

## Architecture

The 15 defects cluster into six layers:

| Layer | Fixes | Files touched |
|-------|-------|---------------|
| Frontend copy/UX | 1, 2, 14 | `Login.tsx`, `AppShell.tsx`, `PdOrdersPage.tsx`, `ShipmentWorkspace.tsx`, `AdminPages.tsx`, `index.css` |
| Frontend logic | 5 | `PdOrdersPage.tsx` (CancelDialog, PodDialog, `pdApi`) |
| Backend routes | 5, 9 | `logistics.ts` (cancel, complete endpoints; status-events already done) |
| Backend infra | 6, 7, 8 | `crud.ts`, `logistics.ts` (bridge: already done), `globalSearch.ts` (already done) |
| Seed / data | 10 | `server/prisma/seed.ts` |
| CI / deploy | 11 | `.github/workflows/azure-deploy.yml` |
| Verified-working | 3, 7, 8, 9, 11, 12, 13, 15 | No code change — test-only verification |

> **Already-fixed items (verified in code review)**: Fix 7 (bridge Dr/Cr detail panel already renders via `<details>` with `safeLines`), Fix 8 (global search endpoint exists, `globalSearch.ts` already calls it, palette already wired), Fix 9 (explicit `/status-events` handler already accepts `entityType`/`entityId` params), Fix 11 (azure-deploy.yml already specifies Node 22 and runs `npx prisma generate`), Fix 13 (ReportsPage fully implemented with filter, DataGrid, Excel export, print), Fix 15 (command palette already renders `searchGlobal` results grouped under "Search results"). These require test coverage but no code changes.

---

## Components and Interfaces

### Fix 1 — Login page left-panel copy

**File**: `src/pages/Login.tsx`

**Bug condition**: The three feature-marketing cards ("Company-scoped / No company picker", "Audit-ready / Every mutation trails", "Fast entry / Hotkeys and dense grids") render as the sole content below the tagline in the navy left panel.

**Change**: Replace the `<div className="grid grid-cols-3 gap-3 ...">` block with an operations-themed visual section that reflects what Kornet Express actually does: Philippine freight forwarding (ocean/air/domestic, RoRo, P/D).

**Replacement content**:
```
Three icon+stat tiles (no borders/cards — clean text rows):
  • "Ocean · Air · Domestic"  (Ship icon)
  • "Export · Import · RoRo"  (ArrowLeftRight icon)
  • "Manila · Cebu · Davao"   (MapPin icon)

Each tile: small icon at 14 px opacity-60 + one line of text
Tagline above: "Philippine freight forwarding — ocean, air, vehicles, pick-up & delivery."
(replaces "Global logistics solution")
```

**Preserved**: Logo, h1 headline, form section, dark/light toggle, all auth logic.

---

### Fix 2 — AI-generated copy removal

**Files touched** (grep evidence):

| File | String to replace | Replacement |
|------|-------------------|-------------|
| `src/components/AppShell.tsx` L183 | `'Operations workspace'` (h1 fallback) | `'Kornet Express'` |
| `src/components/AppShell.tsx` L66 | `"Choose a workflow from the sidebar or command palette."` (404 EmptyState description) | `"Use the sidebar or ⌘K to open a module."` |
| `src/modules/pd/PdOrdersPage.tsx` L102 | `"Logisuite-style pickup and delivery entry, dispatching, POD completion, Excel export, and printable receipts."` | `"Manage pickup and delivery orders — dispatch, POD completion, and printable tickets."` |
| `src/modules/ops/ShipmentWorkspace.tsx` L738 | eyebrow `"Operations Workspace"` | `"Operations"` |
| `src/modules/ops/ShipmentWorkspace.tsx` L740 | `"End-to-end freight booking, cargo specs, multi-modal routing, charges, milestones, printouts and accounting."` | `"Freight booking, cargo, charges, milestones, and documents."` |
| `src/components/logistics/OperationsControlTower.tsx` L38 | `"Company-scoped activity across freight, fleet, customer visibility, and accounting handoff."` | `"Live overview of active shipments, fleet, and accounting queue."` |
| `src/modules/admin/AdminPages.tsx` (AuditLogPage) | `"Company-scoped audit trail with entity, user, date filters and raw diff detail."` | `"Audit trail — entity, user, and date filters."` |
| `src/modules/billing/pages.tsx` (AccountingBridgePage description) | `"Review Dr/Cr double-entry lines, run trial posting verification, post confirmed entries to FS books, or reject with audit trail."` | `"Review Dr/Cr journal entries, run trial verification, and post to FS books."` |

**Note**: `UIKit.tsx` and `src/pages/Login.tsx` also contain these strings but are handled by Fix 1 and the UIKit is admin-only; descriptions in UIKit can remain as developer documentation.

---

### Fix 3 — Density scale

**File**: `src/index.css`

**Bug condition**: At 1440 px with "Comfort" density, the body text renders effectively larger than 14 px because no explicit `[data-density='comfortable']` block exists — the default CSS variables are set at `:root` level and the `html[data-density='compact']` override reduces them, but there is no "comfortable" rule that sets the intended desktop sizes precisely.

**Current `:root` defaults**: No `--density-row` or `--density-control` set explicitly at `:root`. `html[data-density='compact']` sets `font-size: 13px`.

**Change**: Add an explicit `[data-density='comfortable']` block and update the compact block:

```css
[data-density='comfortable'] {
  --density-row: 2.25rem;      /* was: 2.375rem (too tall) */
  --density-control: 2rem;     /* was: 2.125rem */
  --density-gap: 0.625rem;
  font-size: 14px;
}

[data-density='compact'] {
  --density-row: 1.875rem;     /* was: 2rem */
  --density-control: 1.75rem;  /* was: 1.875rem */
  --density-gap: 0.5rem;
  font-size: 13px;
}
```

**Sidebar nav link fix** (`AppShell.tsx`): The `<Link>` for sidebar items uses `min-h-10` (hardcoded 2.5 rem). Change to `min-h-[var(--density-row)]` so sidebar height respects the density token at all breakpoints.

---

### Fix 4 — Animation system

**Assessment**: The animation framework is substantially complete. `AnimatePresence` + `motion.div` wraps all routes (fade + x:10→0, 160 ms). `active:scale-[0.97]` is on `Button` in the UI library. Cards do not yet have hover lift. StatCards do not yet have entry stagger.

**Changes**:

**A. Card hover lift** — `src/components/ui/Card.tsx` (or wherever Card is defined):  
Wrap the card root with `motion.div` using `whileHover={{ y: -2, boxShadow: '0 12px 32px -14px hsl(221 83% 10% / 0.22)' }}` and `transition={{ duration: 0.15, ease: 'easeOut' }}`. Gate behind `useReducedMotion()` from Framer Motion.

**B. StatCard entry animation** — `src/components/ui/StatCard.tsx`:  
Add `variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}` with `initial="hidden" animate="show"` and `transition={{ duration: 0.2, ease: 'easeOut' }}`. The Dashboard grid should use `motion.div` with `variants={{ show: { transition: { staggerChildren: 0.05 } } }}` as a parent.

**C. Sheet/Dialog slide-in** — Radix already handles this via the `data-[state=open]` CSS animations in the UI component styles. No change needed.

**D. Sidebar hover** — CSS `transition-colors` already present on nav links. No change needed.

---

### Fix 5 — P/D order cancel reason + POD fields

**Schema verification**: `PdOrder` in `schema.prisma` already has `cancelReason String?`, `podRemarks String?`, `podAt DateTime?`, `podSignedBy String?`, `podPhotoUrl String?`. No schema migration needed.

**Backend** (`server/src/routes/logistics.ts`):

The `/pd-orders/:id/cancel` handler currently does not persist `cancelReason`:
```typescript
// CURRENT (buggy):
data: { status: 'CANCELLED', version: { increment: 1 } }

// FIXED:
data: {
  status: 'CANCELLED',
  cancelReason: String(req.body?.reason ?? '').trim() || null,
  version: { increment: 1 }
}
```

The `/pd-orders/:id/complete` handler currently maps `signedBy → podSignedBy` and `signatureDataUrl` but does NOT map `podRemarks` or `podPhotoUrl`:
```typescript
// CURRENT (buggy):
data: {
  status: 'COMPLETED',
  deliveredAt: new Date(),
  podSignedBy: req.body.signedBy,
  signatureDataUrl: req.body?.signatureDataUrl,
  podAt: new Date(),
  version: { increment: 1 }
}

// FIXED — add podRemarks and podPhotoUrl:
data: {
  status: 'COMPLETED',
  deliveredAt: new Date(),
  podSignedBy: req.body.signedBy,
  podAt: req.body?.podAt ? new Date(req.body.podAt) : new Date(),
  podRemarks: req.body?.podRemarks ?? null,
  podPhotoUrl: req.body?.podPhotoUrl ?? null,
  signatureDataUrl: req.body?.signatureDataUrl ?? null,
  version: { increment: 1 }
}
```

**Frontend** (`src/modules/pd/PdOrdersPage.tsx`):

`CancelDialog` already collects a `reason` string and passes it to `cancel.mutate({ order, reason })`. The `pdApi.cancel(id, reason)` call sends it to the backend — verify the API client sends it as `{ reason }` in the request body.

`PodDialog` collects `signedBy`, `podAt`, `remarks`, `signatureDataUrl`. The `remarks` field is present in the dialog but is sent as `remarks` — the backend now maps `req.body?.podRemarks`. Fix: rename the key sent from the frontend from `remarks` to `podRemarks`, or (simpler) update the backend to accept both `remarks` and `podRemarks` aliases.

Chosen approach: update the backend to accept `req.body?.remarks ?? req.body?.podRemarks` for backward compatibility, and update the `PodDialog` to use `podRemarks` consistently.

**API client** (`src/modules/pd/` — pdApi):  
No change needed if the body keys match; verify `pdApi.cancel` sends `{ reason }` and `pdApi.complete` sends `{ signedBy, podAt, podRemarks, podPhotoUrl, signatureDataUrl }`.

---

### Fix 6 — companyCode in nested child CRUD rows

**Assessment**: `injectCompanyCode` in `crud.ts` already recursively walks the Prisma `create` key and stamps `companyCode`. The `POST /` handler calls `injectCompanyCode(base, companyCode)` before `model.create`. This is functioning correctly for nested create payloads like `{ lines: { create: [{ billingCode, ... }] } }`.

**Remaining risk**: If a frontend sends child records with an explicit `companyCode: undefined` or omits it, Prisma will reject the create with a NOT NULL constraint error. The `injectCompanyCode` function stamps it only on items within a `create` array/object — it does not overwrite an existing `companyCode` field.

**Fix**: Change `injectCompanyCode` to always overwrite (not just set if absent) for any nested `create` child:
```typescript
// In the create array loop, change:
(item as Record<string, unknown>).companyCode = companyCode;
// This already does unconditional assignment — VERIFIED CORRECT.
```

After code review, `injectCompanyCode` already unconditionally sets `companyCode`. The actual bug causing child row constraint violations is more likely that the frontend Zod schemas for Invoice/Receipt line items do not include a `companyCode` field, so Prisma's type-safe create rejects it. Verify that `s.invoiceCreate`, `s.receiptCreate`, etc. allow nested `create` arrays with child objects that lack `companyCode` (since it gets injected server-side). Zod schemas should use `.passthrough()` or explicitly strip unknown fields — if they strip, `companyCode` injected after parsing gets removed.

**Root cause**: The Zod `createSchema.parse(req.body)` call at line `const parsed = createSchema.parse(req.body)` runs BEFORE `injectCompanyCode`. If the schema is `strict()` or strips unknowns, child objects parsed by Zod will lose any `companyCode` field. Then `injectCompanyCode(base, companyCode)` adds it back to the top-level and nested `create` arrays — but only if the nested objects still exist in `base`.

**Verification step**: Confirm `s.invoiceCreate` allows nested `lines.create[*]` and that `injectCompanyCode` can reach them. No code change needed if schemas use `.strip()` (default in Zod) and `injectCompanyCode` adds `companyCode` after parsing. This is the current behavior.

**Verdict**: Fix 6 is already correctly implemented. Test coverage is the action item.

---

### Fix 7 — Accounting Bridge Dr/Cr detail + jeNo writeback

**Assessment**: The `AccountingBridgePage` already renders Dr/Cr line detail via a `<details>` element calling `safeLines(r.linesJson)`. The `fsJvNo` column is already in the DataGrid. `finalBridge` in `domain.ts` writes `fsJvNo` back to the source document. The reject action already accepts a reason via `prompt()`.

**Remaining UX issue**: The reject action uses `window.prompt()` which is blocking and cannot be tested reliably. Replace with an inline dialog.

**Change**: Add a `RejectDialog` component inside `AccountingBridgePage` that captures a text reason before calling `billingApi.rejectBridge`. This replaces the `prompt()` call:
```typescript
// CURRENT:
billingApi.rejectBridge(x.id, prompt('Reject reason') || 'Rejected from bridge UI')

// FIXED:
// Open a RejectDialog, capture reason, then call:
billingApi.rejectBridge(x.id, reason)
```

---

### Fix 8 — Global search endpoint + command palette wiring (VERIFIED WORKING)

**Verification findings**:
- `GET /api/logistics/lookups/global?q=` exists at line 91 of `logistics.ts`; returns `{ data: [{type, id, label, sublabel, route}] }`
- `src/modules/dashboard/globalSearch.ts` calls `/lookups/global` with `{ params: { q: query } }`
- `AppShell.tsx` CommandPalette already renders `searchGlobal` results in a "Search results" group
- The 250 ms debounce is in place

**Action**: Write integration test only. No code changes.

---

### Fix 9 — Status events filtering (VERIFIED WORKING)

**Verification findings**:
- `logistics.ts` has an explicit `GET /api/logistics/status-events` handler (not delegated to the generic `buildWhere` crud router) at line 84:
  ```typescript
  logistics.get('/status-events', asyncHandler(async (req, res) => res.json({
    data: await prisma.statusEvent.findMany({
      where: {
        companyCode: req.companyCode!,
        entityType: req.query.entityType ? String(req.query.entityType) : undefined,
        entityId:   req.query.entityId   ? String(req.query.entityId)   : undefined
      },
      orderBy: { eventAt: 'asc' }
    })
  })));
  ```
- Both `entityType` and `entityId` are passed through correctly.

**Action**: Write integration test only. No code changes.

---

### Fix 10 — Seed database cleanup

**File**: `server/prisma/seed.ts`

**Bug condition**: The current seed creates real sample customers (San Miguel, Toyota, etc.), carriers, and agents as operational data. These are not "smoke-test" data per se — they are realistic reference data. However, bug 1.9 says the problem is the smoke-flow script (`scripts/smoke-flow.mjs`) creating a company "OTHER", test users, and test shipments. The seed itself is reasonable.

**Changes needed**:

1. Add a `cleanSmokeData` step at the start of `main()` to delete any record with `companyCode = 'OTHER'` or any user with `username LIKE 'viewer%'` or `username = 'testop'` or similar smoke-test usernames:
   ```typescript
   // Purge smoke-test artifacts if present
   await prisma.shipment.deleteMany({ where: { companyCode: 'OTHER' } }).catch(() => undefined)
   await prisma.company.deleteMany({ where: { code: 'OTHER' } }).catch(() => undefined)
   await prisma.user.deleteMany({
     where: { username: { in: ['viewer_smoke', 'testop', 'smoke_admin'] } }
   }).catch(() => undefined)
   ```

2. Ensure `CompanySetting` defaults are upserted with the correct keys (the seed already does this via `upsert`; verify `numberFormats` JSON is valid).

3. Remove the `agents` array from the seed. Agents are optional operational data; the seed should only contain the absolute minimum for the app to boot: one company, one admin, ports, billing codes, CompanySetting defaults.

**What stays**: The `ports`, `carriers`, `billing` arrays, and `customers` in the current seed represent realistic Philippine freight forwarder reference data. The customers in particular are real companies — however they are seeded as `Party` records (not accounts), which is appropriate since an empty party list would make the app feel broken. Keep them.

**Verification**: After running `npx prisma db seed`, the DB must contain exactly: 1 company (`KORNET`), 1 admin user, 24 ports, 11 carriers, 18 billing codes, 5 customers, and 0 records with `companyCode = 'OTHER'`.

---

### Fix 11 — Azure CI Node 20 → 22 (VERIFIED FIXED)

**Verification findings**: `.github/workflows/azure-deploy.yml` already specifies:
```yaml
- name: Set up Node.js 22
  uses: actions/setup-node@v4
  with:
    node-version: '22'
```
And includes a step that runs `npx prisma generate` before `npm run build` in the server directory. `.db` files are excluded from the bundle.

**Action**: Write a CI syntax validation test only. No code changes.

---

### Fix 12 — Fleet page Driver/FleetVehicle wiring

**File**: `src/modules/fleet/FleetDispatchPage.tsx`

**Assessment**: The page has `expiring()` utility and queries `/api/logistics/drivers` and `/api/logistics/fleet-vehicles`. The backend has `crud('/drivers', ...)` and `crud('/fleet-vehicles', ...)` registered. The Prisma schema has `Driver` and `FleetVehicle` models (confirmed by the existing CRUD registrations in `logistics.ts`).

**Check for expiry warnings**: The `expiring(text)` utility is defined but its usage within the component needs verification. The `FleetVehicle` model has `registrationExpiry`, `insuranceExpiry`; `Driver` has `licenseExpiry`. The page should render warning badges on rows where `expiring()` returns true (within 30 days of today).

**Change if missing**: Add `cell: (r) => expiring(r.registrationExpiry) ? <Badge tone="warning">Expiring</Badge> : null` columns to the fleet vehicles DataGrid.

---

### Fix 13 — FS Reports page (VERIFIED WORKING)

**Verification findings**: `ReportsPage` in `src/modules/ledger/pages.tsx`:
- Calls `ledgerApi.report(type, { from, to })` → `GET /api/fs/reports/:type`
- Renders a full DataGrid with debit/credit/ending columns
- Has "Excel" button calling `exportRowsToExcel`
- Has "Print" button calling `printHtml` with type-appropriate HTML table
- `GET /api/fs/reports/:type` in `fs.ts` returns `{ lines, totalDebit, totalCredit, inBalance }` for trial-balance and book-specific rows for CDB/CRB/sales/etc.
- `MonthEndPage` calls `/fs/month-end/checklist` and `/fs/month-end/close`

**Action**: Write integration test covering report fetch, Excel export, and print flow. No code changes.

---

### Fix 14 — CurrenciesPage

**File**: `src/modules/masters/MastersPages.tsx` → `CurrenciesPage`

**Current state**: Route `/directories/currencies` is marked `hidden: true` in `routes.tsx`. The `CurrenciesPage` component either renders a placeholder or is not yet implemented.

**Decision**: The Prisma schema has no `Currency` model. Adding one would require a migration, seed data (PHP/USD/EUR/CNY/JPY/SGD), a backend CRUD route, and full frontend CRUD — that's a new feature, not a bugfix. The requirement explicitly allows showing an honest "not in this release" message.

**Change**: Replace the `CurrenciesPage` content with a clean informational card:
```tsx
export function CurrenciesPage() {
  return (
    <div className="p-4 md:p-6">
      <PageHeader eyebrow="Directories" title="Currencies & FX Rates" />
      <Card className="mt-4 max-w-lg p-6">
        <p className="font-semibold">Not available in this release</p>
        <p className="mt-2 text-sm text-muted-foreground">
          The system currently operates in Philippine Peso (PHP). Multi-currency
          FX rate management is planned for a future release. All monetary values
          display in PHP.
        </p>
      </Card>
    </div>
  )
}
```

The route stays `hidden: true` so it does not appear in the sidebar. It remains accessible by direct URL.

---

## Data Models

The following Prisma models are directly touched by these fixes. Only the fields relevant to each fix are listed.

### PdOrder

| Field | Type | Fix |
|-------|------|-----|
| `id` | String (CUID) | — |
| `companyCode` | String | Fix 6 |
| `status` | Enum (`OPEN`, `DISPATCHED`, `COMPLETED`, `CANCELLED`) | Fix 5 |
| `cancelReason` | String? | Fix 5 — was not persisted on cancel |
| `podSignedBy` | String? | Fix 5 |
| `podAt` | DateTime? | Fix 5 |
| `podRemarks` | String? | Fix 5 — was not persisted on complete |
| `podPhotoUrl` | String? | Fix 5 — was not persisted on complete |
| `signatureDataUrl` | String? | Fix 5 |
| `deliveredAt` | DateTime? | Fix 5 |
| `version` | Int | Optimistic-lock counter |

### BridgeItem

| Field | Type | Fix |
|-------|------|-----|
| `id` | String (CUID) | — |
| `companyCode` | String | Fix 6 |
| `linesJson` | String | Fix 7 — parsed by `safeLines()` for Dr/Cr detail display |
| `fsJvNo` | String? | Fix 7 — written back after final bridge post |
| `status` | Enum (`PENDING`, `POSTED`, `REJECTED`) | Fix 7 |
| `rejectReason` | String? | Fix 7 — captured via inline dialog replacing `window.prompt()` |

### Driver

| Field | Type | Fix |
|-------|------|-----|
| `id` | String (CUID) | — |
| `companyCode` | String | Fix 6 |
| `licenseExpiry` | DateTime? | Fix 12 — used by `expiring()` for warning badges |

### FleetVehicle

| Field | Type | Fix |
|-------|------|-----|
| `id` | String (CUID) | — |
| `companyCode` | String | Fix 6 |
| `registrationExpiry` | DateTime? | Fix 12 — used by `expiring()` for warning badges |
| `insuranceExpiry` | DateTime? | Fix 12 — used by `expiring()` for warning badges |

---

## Error Handling

All backend route handlers are wrapped in `asyncHandler` from `server/src/lib/asyncHandler.ts`, which forwards thrown errors to Express's global error middleware. The following conventions govern error responses across the fixes:

**Validation errors (400)**
- Cancel without a required field: the endpoint accepts a missing `reason` and stores `null` rather than rejecting — no 400 is thrown.
- Complete with missing `signedBy`: the handler should return 400 if `signedBy` is absent, since it is the required POD signature field.

**Not-found errors (404)**
- All mutating endpoints call `getOwned(model, id, companyCode)` before updating. If no record is found for the given `id` + `companyCode`, the helper throws a 404 response automatically. This prevents cross-tenant data leakage.

**Concurrency errors (409)**
- `PdOrder` carries a `version` integer for optimistic locking. If the frontend submits a stale version, the Prisma update condition `{ id, version }` matches zero records, and the handler returns 409 with `"Record was modified by another session"`.

**Frontend error surfaces**
- React Query `onError` callbacks show a `toast.error(message)` using the shared toast utility. No raw error objects are exposed to the user.
- The `RejectDialog` (Fix 7) disables its submit button while the mutation is in-flight and shows an inline error message if the rejection API call fails, rather than silently dismissing.

**Seed errors**
- The `cleanSmokeData` deletions in `seed.ts` use `.catch(() => undefined)` so the seed does not abort if the target records do not exist (idempotent cleanup).

---

## Backend Changes Summary

### Schema changes required
None. All required fields (`cancelReason`, `podRemarks`, `podAt`, `podPhotoUrl` on `PdOrder`) already exist in `schema.prisma`.

### Route changes (logistics.ts)

**1. `/pd-orders/:id/cancel`** — add `cancelReason` to the update payload:
```typescript
data: {
  status: 'CANCELLED',
  cancelReason: String(req.body?.reason ?? '').trim() || null,
  version: { increment: 1 }
}
```

**2. `/pd-orders/:id/complete`** — add `podRemarks`, `podPhotoUrl`, accept `podAt` from body:
```typescript
data: {
  status: 'COMPLETED',
  deliveredAt: new Date(),
  podSignedBy: req.body.signedBy,
  podAt: req.body?.podAt ? new Date(req.body.podAt) : new Date(),
  podRemarks: String(req.body?.remarks ?? req.body?.podRemarks ?? '').trim() || null,
  podPhotoUrl: req.body?.podPhotoUrl ?? null,
  signatureDataUrl: req.body?.signatureDataUrl ?? null,
  version: { increment: 1 }
}
```

### No new endpoints needed
- `/lookups/global` — already exists and works
- `/status-events` with filtering — already exists and works
- `/fs/reports/:type` — already exists and works
- `/api/health` — already exists (verify in `server/src/index.ts`)

---

## Data Flow — P/D Order Cancel & Complete

```
Frontend (CancelDialog)          Backend (logistics.ts)         Database (kornet.db)
─────────────────────────────    ──────────────────────────     ──────────────────
User types reason: "Wrong addr"
cancel.mutate({ order, reason })
  → pdApi.cancel(id, "Wrong addr")
    → PATCH /api/logistics/pd-orders/:id/cancel
      { reason: "Wrong addr" }   →  getOwned(pdOrder, id, cc)
                                    update pdOrder {
                                      status: CANCELLED,
                                      cancelReason: "Wrong addr"  → PdOrder.cancelReason
                                    }
                                 ←  { ...updatedOrder }
  ← row (with cancelReason)
toast("PD-001 cancelled")
```

```
Frontend (PodDialog)             Backend (logistics.ts)         Database (kornet.db)
─────────────────────────────    ──────────────────────────     ──────────────────
User fills: signedBy, podAt,
  podRemarks, podPhotoUrl
complete.mutate({ order, ...v })
  → pdApi.complete(id, {
      signedBy: "Maria Santos",
      podAt: "2025-09-17T14:30",
      podRemarks: "Received in good condition",
      podPhotoUrl: "https://cdn/pod.jpg"
    })
    → POST /api/logistics/pd-orders/:id/complete
                                 →  getOwned(pdOrder, id, cc)
                                    update pdOrder {
                                      status: COMPLETED,
                                      podSignedBy: "Maria Santos",
                                      podAt: 2025-09-17T14:30,
                                      podRemarks: "Received...",
                                      podPhotoUrl: "https://cdn/...",
                                      deliveredAt: now()
                                    }
                                    emitStatus(CC, PD_ORDER, id, POD, ...)
                                 ←  { ...updatedOrder }
  ← row (with all POD fields)
toast("PD-001 completed with POD")
```

---

## Data Flow — Global Search

```
User types "MNL-2025"           AppShell.tsx (CommandPalette)    Backend        Database
───────────────────────         ──────────────────────────────   ────────────   ──────────
keydown → setQuery("MNL-2025")
setTimeout(250ms)...
  searchGlobal("MNL-2025")      →  GET /api/logistics/lookups/global?q=MNL-2025
                                    prisma.shipment.findMany({ fileNo contains })
                                    prisma.invoice.findMany({ invoiceNo contains })
                                    ...7 other models...
                                 ←  { data: [{ type:'shipment', id, label:'MNL-2025-001', route:'/logistics/files/...' }] }
setResults([...])
  render: <Command.Group heading="Search results">
            <Command.Item label="MNL-2025-001" type="shipment" />
          </Command.Group>
user selects → navigate('/logistics/files/abc123') → onOpenChange(false)
```

---

## CSS / Animation Design Tokens

### Density token table

| Token | Comfortable | Compact | Applied to |
|-------|-------------|---------|------------|
| `--density-row` | 2.25 rem | 1.875 rem | DataGrid row height, sidebar nav link min-height |
| `--density-control` | 2 rem | 1.75 rem | Input, Select, Button heights |
| `--density-gap` | 0.625 rem | 0.5 rem | Form field gaps |
| `font-size` (html) | 14 px | 13 px | Base type scale |

### Animation values

| Element | Property | Value | Condition |
|---------|----------|-------|-----------|
| Route change | opacity + translateX | 0→1, 10px→0, 160ms easeOut | `prefers-reduced-motion: no-preference` |
| Card hover | translateY + shadow | 0→-2px, elevated shadow, 150ms easeOut | `prefers-reduced-motion: no-preference` |
| Button press | scale | 1→0.97, 100ms | CSS `active:` (already present) |
| StatCard entry | opacity + translateY | 0→1, 8px→0, 200ms easeOut, stagger 50ms | `prefers-reduced-motion: no-preference` |
| Sheet open | translateX | 100%→0, 300ms easeOut | Radix CSS (already present) |

---

## Seed Data Specification

After `npx prisma db seed`, the database must contain exactly the following and nothing else:

### Company
| Code | Name |
|------|------|
| KORNET | Kornet Express Inc. |

### Users
| Username | Password | Role |
|----------|----------|------|
| admin | kornet2000 | superadmin |

### Ports (24 total)
Philippine sea: PHMNL, PHMNN, PHCEB, PHDVO, PHBTG, PHSFS, PHCGY  
Major foreign sea: CNSHA, SGSIN, HKHKG, JPTYO, KRPUS, USLAX, USLGB, NLRTM  
Philippine air: MNL, CEB, DVO, CRK  
Major foreign air: HKG, SIN, NRT, ICN, LAX

### Billing Codes (18 total)
| Code | Description | VAT Class | Revenue GL | Cost GL |
|------|-------------|-----------|-----------|---------|
| OFRT | Ocean Freight | ZERO_RATED | 4210 | 4510 |
| AFRT | Air Freight | ZERO_RATED | 4211 | 4511 |
| FSC | Fuel Surcharge | ZERO_RATED | 4210 | 4510 |
| BAF | Bunker Adjustment Factor | ZERO_RATED | 4210 | 4510 |
| THC | Terminal Handling Charge | VATABLE | 4215 | 4515 |
| DOC | Documentation Fee | VATABLE | 4215 | 4515 |
| BLF | Bill of Lading Fee | VATABLE | 4215 | 4515 |
| AWBF | Air Waybill Fee | VATABLE | 4215 | 4515 |
| SEC | Security Surcharge | VATABLE | 4215 | 4515 |
| CFS | Container Freight Station Charge | VATABLE | 4214 | 4514 |
| ARR | Arrastre Charges | NON_VAT_REIMBURSABLE | 1130 | 1130 |
| WHF | Wharfage Dues | NON_VAT_REIMBURSABLE | 1130 | 1130 |
| DUT | Customs Duties & Taxes | NON_VAT_REIMBURSABLE | 1130 | 1130 |
| BRK | Customs Brokerage Fee | VATABLE | 4212 | 4512 |
| TRK | Inland Trucking Delivery | VATABLE | 4213 | 4513 |
| STO | Bonded Warehouse Storage | VATABLE | 4214 | 4514 |
| HDL | Cargo Handling Fee | VATABLE | 4215 | 4515 |
| VHD | RoRo Vehicle Port Handling | VATABLE | 4216 | 4515 |

### Smoke-test artifact cleanup
Delete any records with: `companyCode = 'OTHER'`, or `username` in `['viewer_smoke', 'testop', 'smoke_admin', 'viewer_test']`.

### CompanySetting defaults
| Key | Value |
|-----|-------|
| companyName | Kornet Express Inc. |
| companyAddress | (blank — configured post-deploy) |
| tin | (blank) |
| vatType | VAT |
| defaultCurrency | PHP |
| numberFormats | `{"invoice":"SI-YYYY-NNNNNN","apBill":"AP-YYYY-NNNNNN","receipt":"OR-YYYY-NNNNNN","check":"CV-YYYY-NNNNNN","quote":"QO-YYYY-NNNNNN","pd":"PD-YYYY-NNNNNN","wr":"WR-YYYY-NNNNNN","dispatch":"DT-YYYY-NNNNNN"}` |

---

## Correctness Properties

Property 1: Bug Condition — P/D Cancel Reason Persisted

_For any_ PATCH to `/pd-orders/:id/cancel` that includes a non-empty `reason` body field, the fixed backend SHALL write that string to `PdOrder.cancelReason` in the database, and a subsequent GET of the same record SHALL return `cancelReason` equal to the submitted string.

**Validates: Requirements 2.6**

Property 2: Bug Condition — P/D POD Fields Persisted

_For any_ POST to `/pd-orders/:id/complete` that includes `signedBy`, `podAt`, `podRemarks`, and `podPhotoUrl`, the fixed backend SHALL persist all four fields on the `PdOrder` record, and a subsequent GET SHALL return them with values equal to what was submitted.

**Validates: Requirements 2.6**

Property 3: Preservation — P/D Order Core Workflow Unchanged

_For any_ P/D order action that does NOT involve cancel or complete (create, dispatch, list, search, print), the fixed backend SHALL produce exactly the same response as the original backend, with no fields removed or changed.

**Validates: Requirements 3.1, 3.3**

Property 4: Bug Condition — Login Panel Copy

_For any_ render of the `Login` page, the fixed component SHALL NOT render any of the strings "Company-scoped", "Audit-ready", or "Fast entry / Hotkeys and dense grids", and SHALL render freight-related operational content in the left panel.

**Validates: Requirements 2.1**

Property 5: Preservation — Login Authentication Unchanged

_For any_ login attempt with valid credentials, the fixed `Login` page SHALL continue to call `authStore.login()`, set the JWT, and navigate to `/dashboard` with behavior identical to the original.

**Validates: Requirements 3.1**

Property 6: Bug Condition — Density at Comfortable

_For any_ render with `[data-density='comfortable']`, the fixed CSS SHALL apply `--density-row: 2.25rem` and `font-size: 14px`, making sidebar items and form labels render at the correct desktop ERP scale at 1440 px.

**Validates: Requirements 2.14**

Property 7: Preservation — Compact Density Unchanged

_For any_ render with `[data-density='compact']`, the fixed CSS SHALL produce row heights and font sizes that are equal to or smaller than the comfortable values, preserving the compact mode's visual density.

**Validates: Requirements 2.14, 3.4**

---

## Testing Strategy

### Validation Approach

Three-phase: (1) exploratory tests on unfixed code to surface counterexamples and confirm root causes; (2) fix-checking tests after each fix is applied; (3) preservation tests verifying regression-free behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface failing behavior on unfixed code before applying fixes.

**Test plan — P/D cancel/complete (Fix 5)**:
1. **Cancel reason not persisted**: POST to `/pd-orders/:id/cancel` with `{ reason: "Wrong address" }` on unfixed code, then GET the record — expect `cancelReason` to be null (demonstrating the bug).
2. **POD remarks not persisted**: POST to `/pd-orders/:id/complete` with `{ signedBy: "X", podRemarks: "Good", podPhotoUrl: "https://x/y.jpg" }`, then GET — expect `podRemarks` and `podPhotoUrl` to be null (demonstrating the bug).

**Test plan — UI copy (Fix 1, 2)**:
3. Render `Login` page and assert that the three marketing card texts exist in the DOM (demonstrating the bug before fix).
4. Render `AppShell` with an unknown route and assert the description "Choose a workflow from the sidebar or command palette." exists (demonstrating the bug).

**Expected counterexamples**:
- `cancelReason` is null after cancel with reason body
- `podRemarks`/`podPhotoUrl` are null after complete with those fields
- Marketing strings are present in Login DOM

### Fix Checking

```
FOR ALL pdOrder WHERE isBugCondition(pdOrder) // = cancel with reason or complete with POD fields
  result := patchEndpoint_fixed(pdOrder)
  ASSERT result.cancelReason = submittedReason (for cancel)
  ASSERT result.podRemarks = submittedRemarks (for complete)
  ASSERT result.podPhotoUrl = submittedUrl (for complete)
END FOR
```

```
FOR ALL loginRender DO
  dom := render(<Login />)
  ASSERT NOT dom.contains("Company-scoped")
  ASSERT NOT dom.contains("Audit-ready")
  ASSERT dom.contains("Ocean") OR dom.contains("Air") // freight content present
END FOR
```

### Preservation Checking

```
FOR ALL pdOrder WHERE NOT isBugCondition(pdOrder) // = dispatch, list, search, new
  ASSERT endpoint_original(pdOrder) = endpoint_fixed(pdOrder)
END FOR
```

**Property-based test approach**: Generate random `PdOrderInput` objects (varying `type`, `status`, `date`, `shipperName`, `consigneeName`) and assert that the list, search, and edit flows return identical shapes before and after the fix. Use `fast-check` for property generation.

### Unit Tests

**Backend**:
- `POST /pd-orders/:id/cancel` with `{ reason: "Test" }` → asserts `cancelReason === "Test"` on returned row and re-fetched row
- `POST /pd-orders/:id/cancel` with no reason → asserts `cancelReason` is null (not crash)
- `POST /pd-orders/:id/complete` with all POD fields → asserts all four fields on returned row
- `POST /pd-orders/:id/complete` without `podPhotoUrl` → asserts no crash, `podPhotoUrl` is null

**Frontend**:
- `Login` renders without marketing cards
- `AppShell` 404 route shows updated description
- `[data-density='comfortable']` CSS variable resolves to `2.25rem` for `--density-row`

### Property-Based Tests

- **PBT 1 (P/D preservation)**: For any randomly generated `PdOrder` in `OPEN` status, dispatching and then completing it with random `signedBy` + `podRemarks` strings of 0–500 chars MUST persist those strings verbatim without truncation or encoding changes
- **PBT 2 (Density preservation)**: For any `font-size` value in `[12, 13, 14, 15, 16]` px, the `--density-row` token in comfortable mode MUST always be strictly greater than in compact mode
- **PBT 3 (Search result shape)**: For any search string of 1–50 alphanumeric characters, `GET /lookups/global?q=` MUST return an array of objects each having `{ type: string, id: string, label: string, route: string }`

### Integration Tests

- Full P/D order lifecycle: create → dispatch → complete with POD photo URL → re-open record → assert all POD fields visible
- Login renders login form → submit valid credentials → navigated to `/dashboard` → assert marketing strings absent throughout
- FS reports: select trial-balance report, click Apply Filter, assert DataGrid rows > 0 when test journal entries exist, click Excel, assert download triggered
- Command palette: open with ⌘K, type known file number, assert result item appears within 500ms, select it, assert navigation to correct route
- Seed: run `npx prisma db seed`, assert 0 records with `companyCode='OTHER'`, assert `admin` user exists, assert 24 ports, assert `cancelReason`/`podRemarks`/`podPhotoUrl` all null on the one test P/D order created by the smoke flow
