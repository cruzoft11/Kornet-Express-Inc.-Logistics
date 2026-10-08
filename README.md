# Kornet Express Inc. — Logistics & Financial Operations Platform (v2 Overhaul)

> **A full-stack, enterprise-grade logistics and accounting operations platform** built for Kornet Express, Inc. (Philippine freight forwarder: ocean, air, domestic trucking, pick-up/delivery cartage, and RoRo vehicle exports). Integrates freight operations seamlessly with the legacy **FS General Ledger**.

---

## 1. System Overview & Architecture

Kornet Express v2 is a unified logistics operations and financial management platform replacing the legacy desktop **Logisuite** and integrating with the **FS** accounting ledger.

### Key Architectural Pillars
- **Logistics Operations Suite**: Quotes, Ocean Export/Import, Air Export/Import, Domestic Trucking, P/D Orders, Vehicle Inventory, Fleet & Dispatch.
- **Billing & Accounting Bridge**: BIR EOPT-compliant Sales Invoices, Credit Memos, Official Receipts, AP Bills, Check Disbursements with voucher printing, and an automated Dr/Cr Accounting Bridge queue.
- **FS General Ledger Engine**: Direct transactional integration with the `accounting.db` ledger for Kornet Express using Node 22 `node:sqlite` (`DatabaseSync`), ensuring idempotent postings and Dr = Cr balanced entries.
- **Single-Company Data Scope**: Operational access is fixed to Kornet Express, Inc. (`company_code='KORNET'`). Existing database rows and compatibility columns are preserved during safe upgrades.
- **Single-Company Access**: All authenticated and portal data access is fixed to KORNET. There is no company selector, user company assignment, or company header. Legacy company-code columns and user-assignment storage remain mapped only to preserve existing database data during safe upgrades; the application does not use those values to select a company.
- **Customer Tracking Portal**: Public tracking (`/track/:ref`) and authenticated customer portal (`/portal`) mounted outside the internal ERP shell.
- **Design System & Keyboard-First UX**: Sleek desktop ERP aesthetic with dark/light mode view-transition toggles, comfortable (14px) and compact (13px) density settings, ⌘K global search across files, documents, and parties, and hotkey support (`G` go-to sequences).

---

## 2. Tech Stack

- **Frontend (`kornet-system/`)**:
  - React 18, Vite 5, TypeScript
  - Tailwind CSS + custom HSL design tokens
  - Zustand (persisted settings & auth)
  - TanStack Query (React Query v5) & TanStack Table
  - Framer Motion, cmdk (Command Palette), Sonner (Toasts), Lucide React
  - Self-hosted fonts: Inter Variable, Geist Sans, JetBrains Mono
- **Backend API (`kornet-system/server/`)**:
  - Express.js, TypeScript, Node.js >= 22
  - Prisma ORM 5 with SQLite (`prisma/data/kornet.db`)
  - Legacy FS Ledger engine via Node 22 `node:sqlite` (`prisma/data/accounting.db`)
  - Helmet, rate limiting, JWT authentication (access + refresh), audit logging

---

## 3. Philippine Logistics & Tax Compliance

- **EOPT Act / RR 7-2024 Compliance**: Invoices record seller & buyer TIN, business address, and clear breakdown across VATable, Zero-Rated, Exempt, and Non-VAT Reimbursable amounts.
- **Zero-Rated International Freight**: Applies 0% VAT to international air and ocean freight forwarding under NIRC Sec. 108(B).
- **Pass-Through / Reimbursable Costs**: Arrastre, wharfage, and customs duties post directly to Advances to Clients (1130).
- **Creditable Withholding Tax (EWT/CWT)**: Automatically computes 2% withholding on withholding-agent clients (posts to account 1128) and AP EWT payable (account 2166).
- **Logistics Math**:
  - Air chargeable weight: `volumetric = (L x W x H cm) / 6000`, `chargeable = max(gross, volumetric)` rounded up to 0.5 kg.
  - Ocean LCL: `W/M = max(grossKg / 1000, CBM)`, minimum 1.0.

---

## 4. Setup & Running Locally

### Prerequisites
- **Node.js >= 22** (required for `node:sqlite` DatabaseSync)
- **npm >= 10**

### Environment Configuration
Copy `.env.example` in `kornet-system/server/`:
```bash
cp kornet-system/server/.env.example kornet-system/server/.env
```
Ensure `ACCOUNTING_DB_PATH` points to your `accounting.db` file (default: `./prisma/data/accounting.db`).

### Running the System
```powershell
# In kornet-system (runs both Vite web on :3000 and Express API on :4000)
npm run dev
```

### Default Login
- **Username**: `admin`
- **Password**: `kornet2000`
- **Role**: `superadmin`

---

## 5. Verification & Testing

### Type Checks and Production Builds
```powershell
# Frontend check and build
cd kornet-system
npx tsc --noEmit
npx vite build

# Backend check and build
cd kornet-system\server
npx tsc --noEmit
npm run build
```

### End-to-End Smoke Test Flow
Runs a 21-step automated verification covering RBAC, IDOR protection, volumetric/WM math, tariff precedence, document sequences, invoice EOPT math, balanced bridge generation, trial/final posting to FS ledger, receipt & check applications, and file closing gates:
```powershell
cd kornet-system\server
Copy-Item prisma\data\accounting.db $env:TEMP\kx.db -Force
$env:ACCOUNTING_DB_PATH="$env:TEMP\kx.db"; npx tsx src/index.ts

# In another shell:
node scripts\smoke-flow.mjs
```

---

## 6. Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+K` or `Cmd+K` | Global Command Palette & search (files, BL/AWB, VIN, invoices, parties) |
| `/` | Focus global search input |
| `?` | Open keyboard shortcuts help dialog |
| `N` | Quick create / new record in current module |
| `Esc` | Close modal / sheet / command palette |
| `G` then `D` | Go to Dashboard |
| `G` then `O` | Go to Ocean Export |
| `G` then `A` | Go to Air Export |
| `G` then `P` | Go to P/D Orders |
| `G` then `V` | Go to Vehicle Inventory |
| `G` then `F` | Go to Fleet Dispatch |
| `G` then `I` | Go to Invoices & Credits |
| `G` then `R` | Go to Receivables |
| `G` then `B` | Go to Accounting Bridge |
| `G` then `L` | Go to FS Ledger Overview |

---

## 7. Deployment (Azure Web App)

The GitHub Actions workflow (`.github/workflows/azure-deploy.yml`) is configured for:
- Node.js 22 runtime
- Building both frontend SPA and Express server
- Bundling production artifacts excluding SQLite `.db` files to prevent overwriting persistent Azure storage
- Persistent database locations configured via Azure App Settings:
  - `ACCOUNTING_DB_PATH=/home/data/accounting.db`
  - `DATABASE_URL=file:/home/data/kornet.db`
  - `NODE_ENV=production`
  - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `PORTAL_JWT_SECRET`
- If `DATABASE_URL` is absent, the server falls back to the bundled server SQLite path so startup does not fail with Prisma's missing-environment-variable error. Production should still configure `DATABASE_URL` to the existing persistent database location; do not point it at a new empty file to work around login errors.
- Azure App Service sets `WEBSITE_SITE_NAME`; the server uses it to recognize Azure production and run schema sync even when `NODE_ENV` was not configured. Set `NODE_ENV=production` as well so production-only secret validation is enabled.
- Before production schema sync, the server creates a schema-versioned SQLite backup under `$HOME/kornet-db-backups`, preserves known legacy columns/tables, then runs `prisma db push` **without** `--accept-data-loss` or `--force-reset`. If Prisma detects a destructive change, startup stops rather than deleting data. Inspect the startup logs and resolve the schema difference before redeploying.