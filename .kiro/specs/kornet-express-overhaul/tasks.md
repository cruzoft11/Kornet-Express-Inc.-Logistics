# Implementation Plan

## Overview

This bugfix plan addresses the `kornet-express-overhaul` spec. It follows the exploratory bugfix workflow:
1. **Explore** — write bug condition property tests on unfixed code to confirm the bug exists and document counterexamples.
2. **Preserve** — write preservation property tests on unfixed code to lock in baseline behavior.
3. **Implement** — apply the fixes guided by the findings from steps 1–2.
4. **Validate** — verify all exploration tests now pass and all preservation tests still pass.

The 18 tasks below span 10 phases: exploration/preservation tests, infrastructure, backend fixes, frontend copy, CSS density, animation, placeholder routes, fleet expiry warnings, and a final checkpoint.

---

## Tasks

### Phase 1 — Exploration & Preservation Tests (write BEFORE any fix)

- [ ] 1. Write bug condition exploration test — P/D cancel reason not persisted
  - **Property 1: Bug Condition** - PD Cancel Reason Lost
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **GOAL**: Surface the counterexample that the cancel reason is silently dropped
  - **Scoped PBT Approach**: Call `POST /api/logistics/pd-orders/:id/cancel` with `{ reason: "Wrong address" }` on the unfixed server, then `GET` the record — assert `cancelReason === "Wrong address"`
  - The `/pd-orders/:id/cancel` handler in `logistics.ts` currently omits `cancelReason` from the Prisma update payload (isBugCondition: request body contains a non-empty `reason` string)
  - Test assertion: `result.cancelReason` equals the submitted reason string
  - Run on UNFIXED code — **EXPECTED OUTCOME**: FAILS with `cancelReason` being `null`
  - Document counterexample: `PATCH cancel { reason: "Wrong address" } → GET → cancelReason: null`
  - Mark complete when test is written, run, and failure is documented
  - _Requirements: 2.6_

- [ ] 2. Write bug condition exploration test — P/D POD fields not persisted
  - **Property 1: Bug Condition** - PD POD Fields Lost
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **GOAL**: Surface counterexamples showing `podRemarks` and `podPhotoUrl` are dropped
  - **Scoped PBT Approach**: Call `POST /api/logistics/pd-orders/:id/complete` with `{ signedBy: "Maria Santos", podRemarks: "Good condition", podPhotoUrl: "https://cdn/pod.jpg" }`, then GET — assert all four POD fields are present
  - The `/pd-orders/:id/complete` handler maps `signedBy` but does NOT map `podRemarks` or `podPhotoUrl` (isBugCondition: request body contains `podRemarks` or `podPhotoUrl`)
  - Test assertions: `result.podRemarks === "Good condition"`, `result.podPhotoUrl === "https://cdn/pod.jpg"`
  - Run on UNFIXED code — **EXPECTED OUTCOME**: FAILS with `podRemarks: null, podPhotoUrl: null`
  - Document both counterexamples
  - Mark complete when tests are written, run, and failures documented
  - _Requirements: 2.6_

- [ ] 3. Write preservation property tests for P/D order baseline (BEFORE implementing fix)
  - **Property 2: Preservation** - PD Order Non-POD Workflows Unchanged
  - **IMPORTANT**: Follow observation-first methodology — run UNFIXED code first
  - Observe: `GET /api/logistics/pd-orders` returns correct list shape on unfixed code
  - Observe: `POST dispatch` with valid `driverId` + `fleetVehicleId` sets status to DISPATCHED on unfixed code
  - Observe: `POST create` returns a new order with correct `companyCode` and `OPEN` status
  - Write property-based tests (fast-check): for all randomly generated `PdOrderInput` with varying `shipperName`, `consigneeName`, `type` (0–50 char strings), create → dispatch → list — assert shape is stable and no fields are lost
  - For all non-buggy inputs (isBugCondition returns false: actions other than cancel-with-reason and complete-with-POD-fields), responses MUST be identical before and after the fix
  - Verify tests PASS on UNFIXED code before proceeding
  - _Requirements: 3.1, 3.3_

---

### Phase 2 — Infrastructure & Seed (Fix 10, Fix 11)

- [ ] 4. Fix seed: purge smoke-test artifacts and tighten seed data
  - Open `server/prisma/seed.ts`
  - Add a `cleanSmokeData` function at the top of `main()` that deletes records with `companyCode = 'OTHER'` and users with usernames in `['viewer_smoke', 'testop', 'smoke_admin', 'viewer_test']`, each wrapped in `.catch(() => undefined)` for idempotency
  - Remove the `agents` array from seed — agents are operational data, not bootstrap data
  - Verify `CompanySetting` upsert includes the full `numberFormats` JSON as specified in the design
  - After running `npx prisma db seed`, assert: 1 company (KORNET), 1 admin user, 24 ports, 11 carriers, 18 billing codes, 0 records with `companyCode = 'OTHER'`
  - _Requirements: 2.9_

- [ ] 5. Verify CI workflow is correct (Node 22, prisma generate, no .db files)
  - Open `.github/workflows/azure-deploy.yml`
  - Confirm `node-version: '22'` is present in the `setup-node` step
  - Confirm `npx prisma generate` runs before `npm run build` in the server directory
  - Confirm `.db` files are excluded from the deploy package (check `.gitignore` and any zip/artifact step)
  - Confirm `GET /api/health` endpoint exists in `server/src/index.ts` and returns `{ status: 'ok' }`
  - If any of the above are missing, apply the minimal fix; otherwise write a CI syntax validation note
  - _Requirements: 2.10, 3.5_

---

### Phase 3 — Backend Fixes (Fix 5, Fix 6)

- [ ] 6. Fix P/D order cancel endpoint — persist cancelReason
  - Open `server/src/routes/logistics.ts`, locate `logistics.post('/pd-orders/:id/cancel', ...)`
  - Add `cancelReason: String(req.body?.reason ?? '').trim() || null` to the Prisma update `data` object alongside `status: 'CANCELLED'`
  - Keep `version: { increment: 1 }` intact
  - Confirm the `getOwned` call before the update is preserved (IDOR protection)
  - _Bug_Condition: isBugCondition(req) = req.body?.reason is a non-empty string_
  - _Expected_Behavior: PdOrder.cancelReason equals the submitted reason string after update_
  - _Preservation: dispatch, list, create, complete flows must be unaffected_
  - _Requirements: 2.6_

- [ ] 7. Fix P/D order complete endpoint — persist podRemarks, podPhotoUrl, podAt
  - In the same file, locate `logistics.post('/pd-orders/:id/complete', ...)`
  - Add to the Prisma update `data` object:
    - `podAt: req.body?.podAt ? new Date(req.body.podAt) : new Date()`
    - `podRemarks: String(req.body?.remarks ?? req.body?.podRemarks ?? '').trim() || null`
    - `podPhotoUrl: req.body?.podPhotoUrl ?? null`
    - `signatureDataUrl: req.body?.signatureDataUrl ?? null`
  - Keep existing `status: 'COMPLETED'`, `deliveredAt`, `podSignedBy`, `version` fields
  - The `remarks` alias is supported for backward compatibility with the existing `PodDialog`
  - _Bug_Condition: isBugCondition(req) = req.body contains podRemarks or podPhotoUrl_
  - _Expected_Behavior: all four POD fields returned in response and re-fetchable via GET_
  - _Preservation: dispatch and cancel flows unchanged; version increment preserved_
  - _Requirements: 2.6_

- [ ] 8. Verify companyCode injection in nested child CRUD rows
  - Open `server/src/lib/crud.ts`, locate `injectCompanyCode`
  - Confirm it unconditionally sets `companyCode` on nested `create` array items (not just if absent)
  - Confirm the `POST /` handler calls `injectCompanyCode(base, companyCode)` AFTER `createSchema.parse(req.body)` so injection survives Zod stripping
  - Create a test invoice payload with nested `lines.create[*]` entries that omit `companyCode`, POST it, and assert all line items are persisted and re-fetchable
  - If the order is wrong (injection before parse), move the injection call after parse
  - _Requirements: 2.7_

- [ ] 9. Replace window.prompt() in Accounting Bridge reject action with inline RejectDialog
  - Open the `AccountingBridgePage` component (search for `billingApi.rejectBridge` or `window.prompt`)
  - Add a `RejectDialog` component with a controlled text input for the rejection reason
  - The dialog opens when the "Reject" button is clicked; calls `billingApi.rejectBridge(id, reason)` only after the user confirms
  - Disable the submit button while the mutation is in-flight; show inline error if the API call fails
  - _Requirements: 2.8_

---

### Phase 4 — Implementation & Fix Validation

- [ ] 10. Fix for P/D cancel reason and POD fields (backend)

  - [ ] 10.1 Apply the cancel reason fix (task 6) and POD fields fix (task 7)
    - These are the two backend handlers in `logistics.ts`
    - _Bug_Condition: isBugCondition(req) — cancel with reason; complete with POD fields_
    - _Expected_Behavior: cancelReason, podRemarks, podPhotoUrl, podAt all persisted_
    - _Preservation: Preservation Requirements from design §Fix 5_
    - _Requirements: 2.6_

  - [ ] 10.2 Verify bug condition exploration test (task 1) now passes
    - **Property 1: Expected Behavior** - PD Cancel Reason Persisted
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - Run `POST cancel { reason: "Wrong address" }` → `GET` → assert `cancelReason === "Wrong address"`
    - **EXPECTED OUTCOME**: PASSES (confirms bug is fixed)
    - _Requirements: Expected Behavior from design §Fix 5_

  - [ ] 10.3 Verify POD bug condition exploration test (task 2) now passes
    - **Property 1: Expected Behavior** - PD POD Fields Persisted
    - **IMPORTANT**: Re-run the SAME test from task 2 — do NOT write a new test
    - Run `POST complete` with all four POD fields → `GET` → assert all fields match
    - **EXPECTED OUTCOME**: PASSES (confirms bug is fixed)
    - _Requirements: Expected Behavior from design §Fix 5_

  - [ ] 10.4 Verify preservation tests (task 3) still pass
    - **Property 2: Preservation** - PD Order Non-POD Workflows Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 3 — do NOT write new tests
    - Run property-based tests for create, dispatch, and list flows
    - **EXPECTED OUTCOME**: All PASS (confirms no regressions)

---

### Phase 5 — Frontend Copy Fixes (Fix 1, Fix 2)

- [x] 11. Fix Login page left-panel copy — replace marketing cards with freight operations content
  - Open `src/pages/Login.tsx`
  - Locate the `<div className="grid grid-cols-3 gap-3 ...">` block containing "Company-scoped", "Audit-ready", and "Fast entry" cards
  - Replace with three clean text rows (no bordered cards):
    - Ship icon + `"Ocean · Air · Domestic"`
    - ArrowLeftRight icon + `"Export · Import · RoRo"`
    - MapPin icon + `"Manila · Cebu · Davao"`
  - Replace the tagline `"Global logistics solution"` with `"Philippine freight forwarding — ocean, air, vehicles, pick-up & delivery."`
  - Import `Ship`, `ArrowLeftRight`, `MapPin` from `lucide-react` (add to existing import)
  - Preserve: logo, h1, form, dark/light toggle, all auth submit logic unchanged
  - _Requirements: 2.1_

- [ ] 12. Fix AI-generated copy strings across AppShell and module pages
  - Apply each replacement listed in design §Fix 2:
    - `AppShell.tsx` h1 fallback: `'Operations workspace'` → `'Kornet Express'`
    - `AppShell.tsx` 404 description: `"Choose a workflow from the sidebar or command palette."` → `"Use the sidebar or ⌘K to open a module."`
    - `PdOrdersPage.tsx` description: replace the long "Logisuite-style…" sentence with `"Manage pickup and delivery orders — dispatch, POD completion, and printable tickets."`
    - `ShipmentWorkspace.tsx` eyebrow `"Operations Workspace"` → `"Operations"` and its description string
    - `OperationsControlTower.tsx` description: replace with `"Live overview of active shipments, fleet, and accounting queue."`
    - `AdminPages.tsx` AuditLogPage description → `"Audit trail — entity, user, and date filters."`
    - `billing/pages.tsx` AccountingBridgePage description → `"Review Dr/Cr journal entries, run trial verification, and post to FS books."`
  - Read each file before editing to confirm exact current strings
  - _Requirements: 2.1_

---

### Phase 6 — CSS & Density Fix (Fix 3)

- [ ] 13. Fix density token — add comfortable block and correct compact values
  - Open `src/index.css`
  - Add an explicit `[data-density='comfortable']` block:
    ```css
    [data-density='comfortable'] {
      --density-row: 2.25rem;
      --density-control: 2rem;
      --density-gap: 0.625rem;
      font-size: 14px;
    }
    ```
  - Update `[data-density='compact']` block to:
    ```css
    [data-density='compact'] {
      --density-row: 1.875rem;
      --density-control: 1.75rem;
      --density-gap: 0.5rem;
      font-size: 13px;
    }
    ```
  - In `AppShell.tsx`, change the sidebar `<Link>` min-height from `min-h-10` (hardcoded 2.5rem) to `min-h-[var(--density-row)]`
  - _Requirements: 2.14_

---

### Phase 7 — Animation System (Fix 4)

- [ ] 14. Add Card hover lift animation
  - Open `src/components/ui/Card.tsx` (or wherever the base Card is defined)
  - Wrap the card root with `motion.div` from Framer Motion
  - Apply `whileHover={{ y: -2, boxShadow: '0 12px 32px -14px hsl(221 83% 10% / 0.22)' }}` and `transition={{ duration: 0.15, ease: 'easeOut' }}`
  - Gate behind `const reduced = useReducedMotion()` — skip `whileHover` when `reduced` is true
  - _Requirements: 2.1_

- [ ] 15. Add StatCard entry stagger animation on Dashboard (optional polish)
  - Open `src/components/ui/StatCard.tsx` (or wherever StatCard is defined)
  - Add `variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}` with `initial="hidden" animate="show"` and `transition={{ duration: 0.2, ease: 'easeOut' }}`
  - On the Dashboard grid parent, add `variants={{ show: { transition: { staggerChildren: 0.05 } } }}` as a `motion.div`
  - Gate behind `useReducedMotion()` — skip stagger/variants when reduced motion is preferred
  - _Requirements: 2.1_

---

### Phase 8 — Placeholder Routes (Fix 14)

- [ ] 16. Fix CurrenciesPage — replace placeholder with honest "out of scope" notice
  - Open `src/modules/masters/MastersPages.tsx`, locate `CurrenciesPage`
  - Replace any existing placeholder content with:
    ```tsx
    <div className="p-4 md:p-6">
      <PageHeader eyebrow="Directories" title="Currencies & FX Rates" />
      <Card className="mt-4 max-w-lg p-6">
        <p className="font-semibold">Not available in this release</p>
        <p className="mt-2 text-sm text-muted-foreground">
          The system currently operates in Philippine Peso (PHP). Multi-currency
          FX rate management is planned for a future release.
        </p>
      </Card>
    </div>
    ```
  - Keep the route `hidden: true` in `routes.tsx` so it is not visible in the sidebar
  - _Requirements: 2.3_

---

### Phase 9 — Fleet Expiry Warnings (Fix 12)

- [ ] 17. Verify fleet expiry warning badges render in FleetDispatchPage (optional)
  - Open `src/modules/fleet/FleetDispatchPage.tsx`
  - Confirm `expiring(text)` utility exists and returns `true` when the date is within 30 days
  - Confirm the DataGrid for fleet vehicles has a `cell` renderer that shows `<Badge tone="warning">Expiring</Badge>` when `expiring(r.registrationExpiry)` or `expiring(r.insuranceExpiry)` is true
  - Confirm the drivers grid shows a warning badge when `expiring(r.licenseExpiry)` is true
  - If any warning cell is missing, add it — no schema or route changes needed
  - _Requirements: 2.5_

---

### Phase 10 — Checkpoint

- [ ] 18. Checkpoint — Ensure all tests pass and build is clean
  - Run `npx tsc --noEmit` in both `kornet-system/` and `kornet-system/server/` — expect zero errors
  - Run `npx vite build` in `kornet-system/` — expect clean production bundle
  - Re-run bug condition exploration tests (tasks 1 and 2) — both should PASS on fixed code
  - Re-run preservation property tests (task 3) — all should PASS
  - Run `npx prisma db seed` and assert: 0 records with `companyCode = 'OTHER'`, 1 admin user, 24 ports, 18 billing codes
  - Confirm no `window.prompt()` calls remain in the billing module
  - Confirm no "Company-scoped", "Audit-ready", or "Logisuite-style" strings remain in the frontend source
  - Ensure all tests pass; ask the user if questions arise.

---

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1", "2", "3"] },
    { "wave": 2, "tasks": ["4", "5", "6", "7", "8", "9"] },
    { "wave": 3, "tasks": ["10"] },
    { "wave": 4, "tasks": ["11", "12", "13", "14", "15", "16", "17"] },
    { "wave": 5, "tasks": ["18"] }
  ],
  "dependencies": {
    "10": ["1", "2", "3", "6", "7"],
    "18": ["4", "5", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17"]
  }
}
```

```
1 (Bug Condition: cancel reason) ──┐
                                    ├──► 10 (Fix & Validate)
2 (Bug Condition: POD fields) ─────┤        └── 10.1 (apply fixes 6 & 7)
                                    │            └── 10.2 (verify task 1 passes)
3 (Preservation: baseline) ────────┘            └── 10.3 (verify task 2 passes)
                                                 └── 10.4 (verify task 3 passes)

4 (Seed fix) ─────────────────────────────────────────────────────► 18 (Checkpoint)
5 (CI verification) ──────────────────────────────────────────────► 18

6 (cancel endpoint fix) ──────────────────────────────────────────► 10.1
7 (complete endpoint fix) ────────────────────────────────────────► 10.1
8 (companyCode injection) ────────────────────────────────────────► 18
9 (RejectDialog) ─────────────────────────────────────────────────► 18

11 (Login copy) ──────────────────────────────────────────────────► 18
12 (AppShell copy) ───────────────────────────────────────────────► 18
13 (density tokens) ──────────────────────────────────────────────► 18
14 (Card animation) ──────────────────────────────────────────────► 18
15 (StatCard stagger) ────────────────────────────────────────────► 18
16 (CurrenciesPage) ──────────────────────────────────────────────► 18
17 (fleet expiry badges) ─────────────────────────────────────────► 18

All tasks ────────────────────────────────────────────────────────► 18 (Checkpoint)
```

**Critical path**: Tasks 1 → 2 → 3 must complete before task 10. Tasks 6 and 7 must complete before 10.1. All other phases are independent and can proceed in parallel.

---

## Notes

- **Bugfix methodology**: Tasks 1–3 follow the bug condition methodology. Tasks 1 and 2 are exploration tests that MUST fail on unfixed code. Task 3 is a preservation test that MUST pass on unfixed code. Only after both are documented should implementation (task 10) begin.
- **Property-based testing**: Tasks 1, 2, and 3 use property-based testing (fast-check recommended). This provides stronger guarantees than hand-written unit tests by generating many inputs automatically.
- **Test reuse**: Sub-tasks 10.2, 10.3, and 10.4 re-run the exact same tests from tasks 1, 2, and 3 respectively. Do NOT write new tests — the existing tests validate both the bug and its fix.
- **Optional tasks**: Task 15 (StatCard stagger) and task 17 (fleet expiry badges) are marked optional polish — they should not block the checkpoint if the target environment does not yet have the required components.
- **Seed idempotency**: Task 4's `cleanSmokeData` function uses `.catch(() => undefined)` on each delete so the seed can be re-run safely on any environment.
- **CI gate**: Task 5 must confirm the Azure deploy workflow uses Node 22 and runs `prisma generate` before the build step. Missing either causes silent deploy failures.
- **Preservation scope**: The preservation property (task 3) covers create, dispatch, and list flows only. Cancel-with-reason and complete-with-POD-fields are explicitly excluded because those are the buggy paths being fixed.
