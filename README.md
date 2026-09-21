# Kornet Express Inc. — Logistics & Financial Operations Platform

> **A full-stack, enterprise-grade logistics management system** built for Kornet Express Inc. — covering Ocean Freight, Air Freight, Vehicle RORO, P/D Cartage, Fleet Dispatch, Customer Tracking, Accounting Bridge, and FS General Ledger in one unified platform.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Tech Stack](#tech-stack)
3. [Architecture Overview](#architecture-overview)
4. [How to Run](#how-to-run)
5. [Authentication & User Roles](#authentication--user-roles)
6. [Process Flow — End to End](#process-flow--end-to-end)
7. [Module Reference](#module-reference)
8. [Backend API Routes](#backend-api-routes)
9. [Data Models (Prisma)](#data-models-prisma)
10. [Integration System](#integration-system)
11. [How the Modules Connect](#how-the-modules-connect)
12. [Directory Structure](#directory-structure)

---

## System Overview

Kornet Express Inc. is a Philippines-based freight forwarder and logistics company operating in Ocean Export/Import, Air Export/Import, RORO vehicle shipping, domestic P/D cartage, and fleet dispatch. This system is the internal operations platform that digitizes every step of the logistics lifecycle — from shipment booking to final accounting.

The platform has two major systems under one roof:

| System | Path | Purpose |
|---|---|---|
| **Logistics Operations Suite** | `/logistics/*` | All freight, dispatch, tracking, and accounting bridge operations |
| **FS Accounting Ledger** | `/fs/*` | General ledger, vouchers, journal entries, financial reports, month-end |

Both systems share a unified shell (same header, sidebar, auth layer), making the platform feel like one coherent operations workspace.

---

## Tech Stack

### Frontend
| Layer | Technology |
|---|---|
| Framework | React 18 + Vite |
| Language | TypeScript |
| Styling | Tailwind CSS + custom Kornet design tokens |
| State Management | Zustand (persisted) |
| Data Fetching | Axios + React Query |
| Routing | React Router v6 |
| UI Components | Radix UI primitives |
| Animations | Framer Motion |
| Charts | Recharts |
| PDF Generation | jsPDF + jsPDF-AutoTable |
| Forms | React Hook Form + Zod |

### Backend
| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express |
| ORM | Prisma |
| Database | SQLite (file-based, portable) |
| Auth | JWT (access + refresh tokens) + bcrypt |
| Validation | Zod schemas |
| API prefix | `/api/` |

---

## Architecture Overview

```
+-------------------------------------------------------+
|                   React Frontend                       |
|   (Vite dev server -- localhost:3000)                 |
|                                                        |
|   Auth Store  |  Logistics Store  |  FS Accounting    |
|               |                   |                    |
|               +-------------------+                    |
|                        |                               |
|              Axios API Client (JWT Bearer)             |
+------------------------+-------------------------------+
                         | HTTP /api/*
+------------------------v-------------------------------+
|               Express Backend API                      |
|           (localhost:4000)                             |
|                                                        |
|   Auth Routes  |  CRUD Factory  |  FS Routes (/fs/*)  |
|                       |                                |
|              Prisma ORM Layer                          |
|                       |                                |
|           SQLite Database (accounting_v11.db)          |
+-------------------------------------------------------+
```

**Key architectural patterns:**
- **Company isolation** — every DB record is scoped by `companyCode`. Company is auto-assigned from the logged-in user's profile (no company-selection screen).
- **Mapper layer** — `api/mappers.ts` transforms between flat backend Prisma shapes and richer frontend store models.
- **Generic CRUD factory** — `server/src/lib/crud.ts` generates full REST routers for every entity with one config object.
- **Integration gating** — hardware/carrier integrations are only activated when actually connected, tracked via `integrationsStore`.
- **Audit trail** — every mutating action writes a record to `AuditLog` with user, action, entity, and payload.

---

## How to Run

### Prerequisites
- Node.js >= 18, npm >= 9

### 1. Install dependencies

```bash
cd kornet-system
npm install
cd server && npm install && cd ..
```

### 2. Set up the database

```bash
cd server
npx prisma generate
npx prisma db push
npx ts-node prisma/seed.ts
cd ..
```

### 3. Start the app

```bash
# Starts Vite (port 3000) + Express API (port 4000) concurrently
npm run dev
```

Navigate to `http://localhost:3000` and log in with the seeded admin credentials.

---

## Authentication & User Roles

Login posts to `/api/auth/login` and returns a JWT access token + refresh token. The auth store persists both to `localStorage`.

**Roles:**

| Role | Capabilities |
|---|---|
| `superadmin` | Full access — all modules, user mgmt, company mgmt |
| `manager` | Full logistics + FS, no user admin |
| `operator` | Logistics operations only, no FS |
| `accountant` | FS Accounting + Accounting Bridge, read-only on freight |
| `viewer` | Read-only across all modules |

**Session lifecycle:**
1. User logs in ? `POST /api/auth/login`
2. Company auto-applied from `user.companies[0]` (no selection prompt)
3. Axios interceptor attaches `Authorization: Bearer <token>` to every request
4. Silent token refresh on 401 (single-flight, no race conditions)
5. Logout ? `POST /api/auth/logout`, refresh token revoked, store cleared

---

## Process Flow — End to End

This is how a complete freight shipment flows through the system from booking to accounting posting:

```
1. QUOTE (optional)
   Rates & Maintenance -> New Quote
   quoteNo: KE-QT-XXXX

2. SHIPMENT BOOKING
   Ocean/Air Export/Import Manager
   -> fileNo auto-generated (KE-SHP-XXXX)
   -> Enter Shipper, Consignee, Ports, Carrier, Vessel/Flight
   -> Assign billing lines (AR) and cost lines (AP)
   -> Status: Draft -> Open

3. CARGO DOCUMENTATION
   -> Container Stuffing Modal (assign cargo to containers)
   -> Ocean Manifest Modal (print manifest)
   -> Print Document Modal (BL, AWB, Packing List, Customs)
   -> SED Filing Modal (Shipper's Export Declaration)

4. VEHICLE INTAKE (RORO shipments)
   Vehicle Inventory Manager
   -> Enter VIN, make, model, condition, title status
   -> Track warehouse location and bin
   -> Status: Expected -> Received -> Ready to Ship -> Loaded -> Shipped
   -> Customs hold / lien release flags

5. P/D CARTAGE ORDERS
   P/D Orders Manager
   -> orderNo: KE-PD-XXXX
   -> Assign driver, equipment, schedule
   -> Link to shipment file (linkedFileNo)
   -> Status: Open -> Assigned -> In Transit -> Delivered

6. FLEET DISPATCH
   Fleet & Dispatch Manager
   -> routeNo: KE-RT-XXXX
   -> Assign driver + vehicle
   -> Track stops and delivery stages
   -> Capture digital POD signature
   -> Stage: Draft -> Dispatched -> In Transit -> Arrived -> Completed

7. CUSTOMER TRACKING
   Customer Tracking Portal
   -> trackingNo: KE-TRK-XXXX
   -> Post milestone updates (status, location, time)
   -> Customer views via web account (username/password)

8. ACCOUNTING BRIDGE
   Accounting Bridge View
   -> Auto-pull billing/cost lines from closed shipments
   -> Review staged AR invoices and AP costs
   -> Trial Post (verify debit = credit balance)
   -> Final Post (commit to FS GL journal)
   -> Check Disbursements (CDV) for vendor payments
   -> Bridge refNo: KE-BR-XXXX, status: Staged -> Posted

9. FS ACCOUNTING LEDGER
   Financial Statements System
   -> Voucher Entry (cash/check disbursements)
   -> Journal Entry (CDV, JE, AJE, AR, AP)
   -> Chart of Accounts management
   -> Posting (finalize and lock period)
   -> Month-End Close
   -> Reports: Trial Balance, Income Statement, Balance Sheet
```

---

## Module Reference

### 1. Operations Overview (Dashboard)
**Path:** `/logistics/overview` | **Component:** `OperationsOverview.tsx`

Landing dashboard after login. Shows real-time KPIs from the logistics store:
- KPI cards: Ocean Export, Ocean Import, Air Export, Air Import shipment counts; Vehicles on Hold; Pending Cartage; Active Dispatches; Staged Bridge items
- Revenue vs. Cost bar chart per freight mode (Recharts)
- Freight volume area chart over time
- Branch filter (ALL, MNL, CEB, DVO, etc.)
- Each KPI card navigates to the respective module

---

### 2. Ocean Freight — Export & Import
**Paths:** `/logistics/ocean-export`, `/logistics/ocean-import`
**Component:** `OceanFreightManager.tsx` | **Entity:** `Shipment` (mode=ocean)

Main freight operations screen for FCL and LCL ocean shipments.

**Key fields:** Shipper, Consignee, Notify Party, Port of Loading, Port of Discharge, Transship Port, Vessel, Voyage, Container No/Type, Seal No, Commodity, Packages, Gross Weight, Volume CBM, ETD, ETA, Incoterm, BL Class (DBL/MBL/HBL), FCL/LCL, Hazmat, Customs Entry, Lane (Green/Yellow/Red/Blue)

**Key features:**
- Billing Lines (AR) — charges to customer, GL account mapped
- Cost Lines (AP) — vendor costs, GL account mapped
- W/M Calculation (Revenue Tons = max of Weight or Measurement)
- 12% VAT computation on taxable billing lines
- Container Stuffing Modal — assign cargo per container
- Ocean Manifest — print vessel manifest
- Print Documents — BL, Packing List, Commercial Invoice via jsPDF
- SED Filing Modal — Shipper's Export Declaration
- Audit Log — full change history per file
- File Analysis — AI-assisted file status review
- Quote conversion — turn accepted quotes into shipment files

Philippine ports: MNS, MICT, MNN, BTG, SFS, CEB, DVO, CDO
International hubs: LAX, LGB, SIN, HKG, SHA, PUS, TYO

---

### 3. Air Freight — Export & Import
**Paths:** `/logistics/air-export`, `/logistics/air-import`
**Component:** `AirFreightManager.tsx` | **Entity:** `Shipment` (mode=air)

Mirrors Ocean Freight with air-specific fields:
- AWB (Air Waybill) instead of BL
- Flight number and airline carrier
- Chargeable Weight = max(actual weight, CBM x 167)
- IATA airport codes for origin/destination
- SED Filing for export compliance

---

### 4. Vehicle Inventory (RORO)
**Path:** `/logistics/vehicles` | **Component:** `VehicleInventoryManager.tsx` | **Entity:** `Vehicle`

Tracks every vehicle shipped via Roll-on/Roll-off vessels.

**Status lifecycle:** Expected -> Received -> Ready to Ship -> Pre-Loaded -> Loaded -> Shipped (or Hold)

**Key fields:** VIN, Year, Make, Model, Body Class, Color, Engine, Shipper, Consignee, Origin/Destination Ports, Booking No, Warehouse Location, Bin, Odometer, Dimensions, Customs Hold flag, Lien Release Cleared flag, Title Status (Pending/Received/Missing), Inspection details, Full event history

---

### 5. P/D Cartage Orders
**Path:** `/logistics/pd-orders` | **Component:** `PDOrdersManager.tsx` | **Entity:** `PdOrder`

Manages all pickup and delivery cartage work orders.

**Types:** Pickup, Delivery, Xdock, Exchange, Quote

**Status flow:** Open -> Assigned -> In Transit -> Delivered

**Key fields:** Order No (KE-PD-XXXX), Barcode, Shipper/Consignee + addresses, Division, Warehouse, Driver, Equipment, Scheduled date, Cargo details (qty/dims/weight/hazmat/bin), Linked file No, WR No, Load No, Pro No

---

### 6. Fleet & Dispatch Manager
**Path:** `/logistics/fleet` | **Component:** `FleetDispatchManager.tsx`
**Entities:** `Driver`, `FleetVehicle`, `DispatchRoute`

Manages the internal truck/van fleet.

**Sub-sections:**
- **Fleet Registry** — vehicles (plate, type, make, capacity). Status: Available / In Use / Maintenance
- **Driver Registry** — licensed drivers (name, license, phone). Status: Available / On Trip / Off Duty
- **Dispatch Routes** — route assignments (KE-RT-XXXX)

**Route lifecycle:** Draft -> Dispatched -> In Transit -> Arrived -> Completed

**Route fields:** Driver, Vehicle, Origin, Destination, Scheduled time, Multi-stop JSON array, Cargo reference (file/P/D order), Digital POD signature (base64), Signed-by, Signed-at

**Integration gating:** POD signature capture disabled if `signature-pad` integration is not connected.

---

### 7. Nationwide Map View
**Path:** `/logistics/map` | **Component:** `PhilippineLogisticsMap.tsx` (Leaflet.js)

Interactive map of the Philippines showing:
- Logistics branches and terminals
- Active dispatch routes with markers
- Shipment port locations
- Real-time route visualization from live dispatch data

---

### 8. Accounting Bridge
**Path:** `/logistics/accounting-bridge` | **Component:** `AccountingBridgeView.tsx`
**Entities:** `BridgeItem`, `CheckDisbursement`

The financial close step linking logistics operations to the FS General Ledger.

**Tabs:**
| Tab | Purpose |
|---|---|
| Operations Queue (Staged) | AR invoices + AP costs from closed shipments, waiting for GL transfer |
| Checks & Disbursements | Enter CDV check disbursements for vendor payments |
| Miscellaneous Invoices | Non-freight invoices and credit memos |
| Audit Reports | Posted JE reference numbers and posting history |

**Bridge workflow:**
1. Close shipment file in freight module
2. Billing lines auto-stage as AR Invoice bridge items
3. Cost lines auto-stage as AP Cost bridge items
4. Accountant reviews the staged queue
5. Trial Post — dry-run GL verification (debit = credit)
6. Final Post — commits to FS GL, sets BridgeItem status to Posted

**CDV flow:** Enter check -> assign GL account -> link JE No. -> print -> post to GL

---

### 9. Customer Tracking Portal
**Path:** `/logistics/tracking` | **Component:** `CustomerTrackingPortal.tsx`
**Entities:** `TrackingItem`, `WebAccount`

**Tracking Management:**
- Create tracking records (KE-TRK-XXXX) linked to shipment or P/D order
- Post milestone events (status, sub-status, description, location, date/time)
- Milestones stored as JSON array per record

**Web Accounts:**
- Manage customer portal accounts (username + email)
- Permission flags: canTrack, canDownloadPod, canUploadDocs, canViewInvoices

---

### 10. Rates & Maintenance
**Path:** `/logistics/rates-maintenance` | **Component:** `RatesMaintenanceManager.tsx`
**Entities:** `Carrier`, `Port`, `BillingCode`

System configuration and reference data:
- **Carriers Directory** — shipping lines and airlines (name, SCAC, mode, contact)
- **Ports Directory** — port/airport codes, names, country, type (sea/air/inland)
- **Billing Codes** — charge codes, default rates, GL account mapping, VAT taxable flag
- Live FX rates for multi-currency billing (PHP, USD, EUR, JPY, CNY)

---

### 11. FS Accounting Ledger
**Path prefix:** `/fs/*` | **Component:** `FSSystem.tsx`

A complete general ledger integrated into the same shell.

| Route | Module | Purpose |
|---|---|---|
| `/fs/` | Fiscal Narrative | Fiscal year overview, period summary |
| `/fs/voucher` | Voucher Entry | Cash disbursement vouchers (CDV/CV) |
| `/fs/voucher/advance` | Advance Vouchers | Travel and advance fund vouchers |
| `/fs/transfer-advance` | Transfer Advance (CDB) | Transfer funds from advance to disbursement |
| `/fs/journal/:type` | Journal Entry | CDV, JE, AJE, AR, AP manual entries |
| `/fs/chart-of-accounts` | Chart of Accounts | GL account tree (Account > Sub-account > Subsidiary) |
| `/fs/group-codes` | Group Codes | Account grouping for financial statement classification |
| `/fs/subsidiary-groups` | Subsidiary Groups | Sub-ledger groupings (AR/AP ledgers) |
| `/fs/banks` | Banks | Bank account register for check writing |
| `/fs/suppliers` | Suppliers | Vendor/supplier directory for AP |
| `/fs/signatories` | Signatories | Check and document signing authority |
| `/fs/posting` | Posting | Post approved entries to GL, lock period |
| `/fs/month-end` | Month-End Close | Close accounting period, generate closing entries |
| `/fs/reports/:reportType` | Reports | Trial Balance, Income Statement, Balance Sheet, Cash Flow |
| `/fs/query/:queryType` | Query Browser | Ad-hoc GL transaction queries |
| `/fs/manual` | Manual | In-app accounting user manual |
| `/fs/administration/properties` | Company Properties | FS-specific company settings |

---

## Backend API Routes

All routes require `Authorization: Bearer <token>` except `/api/auth/*` and `/api/support`.

| Route | Entity | Notes |
|---|---|---|
| `/api/auth/*` | Authentication | Login, refresh, logout |
| `/api/users/*` | Users | Admin user management |
| `/api/companies/*` | Companies | Tenant management |
| `/api/shipments/*` | Shipment | Ocean + Air freight files |
| `/api/vehicles/*` | Vehicle | RORO vehicle inventory |
| `/api/pd-orders/*` | PdOrder | Pickup & Delivery orders |
| `/api/quotes/*` | Quote | Freight rate quotes |
| `/api/drivers/*` | Driver | Driver registry |
| `/api/fleet-vehicles/*` | FleetVehicle | Fleet truck/van registry |
| `/api/dispatch-routes/*` | DispatchRoute | Route assignments |
| `/api/checks/*` | CheckDisbursement | CDV check register |
| `/api/bridge-items/*` | BridgeItem | Accounting bridge queue |
| `/api/tracking/*` | TrackingItem | Shipment tracking records |
| `/api/web-accounts/*` | WebAccount | Customer portal accounts |
| `/api/carriers/*` | Carrier | Carrier directory |
| `/api/ports/*` | Port | Port directory |
| `/api/billing-codes/*` | BillingCode | Charge/billing code directory |
| `/api/attachments/*` | Attachment | File attachments (base64) |
| `/api/integrations/*` | Integration | Hardware/carrier integrations |
| `/api/audit-logs/*` | AuditLog | System audit trail |
| `/api/fs/*` | FS Accounting | Full FS GL API (vouchers, journals, COA, reports) |
| `/api/support` | SupportTicket | Login support request |

Each CRUD route exposes: `GET /` (list + search + paginate), `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id`.

---

## Data Models (Prisma)

SQLite database via Prisma. All operational entities include `companyCode` for multi-tenant isolation.

```
User --> RefreshToken          (auth)
Company                        (tenant)
Shipment                       (freight files — ocean + air)
Vehicle                        (RORO vehicle inventory)
PdOrder                        (pickup & delivery cartage)
Quote                          (freight rate quotes)
Driver                         (driver registry)
FleetVehicle                   (truck/van fleet)
DispatchRoute                  (route assignments)
CheckDisbursement              (check disbursement register)
BridgeItem                     (accounting bridge queue)
TrackingItem                   (shipment tracking + milestones)
WebAccount                     (customer portal access)
Carrier                        (shipping line / airline directory)
Port                           (port / airport directory)
BillingCode                    (charge code reference)
Attachment                     (file attachments per entity)
Integration                    (hardware + carrier integration status)
AuditLog                       (system-wide change history)
SupportTicket                  (login support tickets)
```

JSON-blob fields stored as TEXT in SQLite: `billingLines`, `costLines`, `cargoItems`, `stops`, `milestones`, `history`, `lines` (quotes), `config` (integrations).

---

## Integration System

The `integrationsStore` tracks connection status for hardware and external services. Features are gated — not available unless the integration is truly connected.

| Integration Key | Category | Purpose |
|---|---|---|
| `barcode-scanner` | Hardware | Scan P/D order barcodes, vehicle VINs |
| `signature-pad` | Hardware | Capture digital POD signatures |
| `label-printer` | Printing | Print shipping labels and checks |
| `boc-e2m` | Government | Bureau of Customs e2m electronic filing |
| `carrier-api` | Carrier | Live carrier rate and booking APIs |

Status: `disconnected` -> `connected` -> `error`

---

## How the Modules Connect

```
Rates & Maintenance
  (provides carrier, port, billing code reference data)
          |
          v
Ocean / Air Freight Manager
  creates shipment file (fileNo)
  generates billing lines (AR) and cost lines (AP)
          |
          v
Vehicle Inventory (if RORO)
  tracks each vehicle on the booking
  links to booking number
          |
          v
P/D Cartage Orders
  creates pickup / delivery work order
  links to shipment file (linkedFileNo)
          |
          v
Fleet & Dispatch
  assigns driver + vehicle to route
  captures delivery POD signature
  links route to cargo reference (P/D order or file)
          |
          v
Customer Tracking Portal
  posts milestone updates to tracking record
  linked to the same shipment file (refFileNo)
  customer views status via web account
          |
          v
Accounting Bridge
  pulls billing/cost lines from closed shipments
  accountant reviews, trial-posts, final-posts to GL
          |
          v
FS Accounting Ledger
  receives journal entries from the bridge
  accountant posts vouchers and journals
  month-end close locks the period
  reports: Trial Balance, P&L, Balance Sheet
          |
          v
Audit Log
  (all mutations recorded throughout every step)
```

The shipment file (`fileNo`) is the central reference record. All downstream entities — vehicles, P/D orders, dispatch routes, tracking records, bridge items — link back to the same file number.

---

## Directory Structure

```
Kornet Express/
+-- kornet-system/              <- Main application
¦   +-- src/
¦   ¦   +-- api/
¦   ¦   ¦   +-- services.ts     <- Axios service wrappers per entity
¦   ¦   ¦   +-- mappers.ts      <- API <-> Store shape transformers
¦   ¦   +-- components/
¦   ¦   ¦   +-- logistics/      <- All logistics module components (23 files)
¦   ¦   ¦   +-- fs/             <- All FS accounting components (19 files)
¦   ¦   ¦   +-- common/         <- Shared UI components
¦   ¦   +-- pages/
¦   ¦   ¦   +-- Login.tsx
¦   ¦   ¦   +-- LogisticsSystem.tsx
¦   ¦   ¦   +-- FSSystem.tsx
¦   ¦   +-- stores/
¦   ¦   ¦   +-- authStore.ts          <- JWT auth, session lock/unlock
¦   ¦   ¦   +-- logisticsStore.ts     <- All logistics state + CRUD actions
¦   ¦   ¦   +-- integrationsStore.ts
¦   ¦   ¦   +-- companyStore.ts
¦   ¦   ¦   +-- settingsStore.ts
¦   ¦   +-- App.tsx
¦   +-- server/
¦       +-- src/
¦       ¦   +-- routes/
¦       ¦   ¦   +-- index.ts    <- All CRUD route registrations
¦       ¦   ¦   +-- auth.ts
¦       ¦   ¦   +-- fs.ts       <- FS Accounting specific routes
¦       ¦   ¦   +-- ...
¦       ¦   +-- lib/
¦       ¦   ¦   +-- crud.ts     <- Generic CRUD router factory
¦       ¦   +-- schemas.ts      <- Zod validation schemas (all entities)
¦       +-- prisma/
¦           +-- schema.prisma   <- Full database schema
+-- Quick_Ocean_Export_Workflow.pdf
+-- Quick_Ocean_Import_Workflow.pdf
+-- Quick_Air_Export_Workflow.pdf
+-- Quick_Air_Import_Workflow.pdf
+-- Quick_Customers_Tracking_Access.pdf
+-- Quick_Disbursements_Workflow_Guide.pdf
+-- Quick_Guide_for_PD_Orders_Entry.pdf
+-- Quick_Invoices_and_CreditsTransfer_to_LS_Accounting.pdf
+-- Vehicle_Inventory_Quick_Guide.pdf
+-- Web_Status_Pick-up_Delivery.pdf
+-- Kornet_Express_Logistics_FS_Implementation_Workflow.pdf
```

---

## Quick Guides (PDF Reference)

| PDF | Module |
|---|---|
| `Quick_Ocean_Export_Workflow.pdf` | Ocean Export shipment entry |
| `Quick_Ocean_Import_Workflow.pdf` | Ocean Import shipment entry |
| `Quick_Air_Export_Workflow.pdf` | Air Export shipment entry |
| `Quick_Air_Import_Workflow.pdf` | Air Import shipment entry |
| `Quick_Guide_for_PD_Orders_Entry.pdf` | P/D Cartage order entry |
| `Quick_Disbursements_Workflow_Guide.pdf` | Check disbursement entry |
| `Quick_Customers_Tracking_Access.pdf` | Customer tracking portal |
| `Vehicle_Inventory_Quick_Guide.pdf` | Vehicle RORO inventory |
| `Web_Status_Pick-up_Delivery.pdf` | Web status updates for P/D |
| `Quick_Invoices_and_CreditsTransfer_to_LS_Accounting.pdf` | Invoice and credit transfer to FS |
| `Kornet_Express_Logistics_FS_Implementation_Workflow.pdf` | Full system implementation workflow |
| `Kornet_Express_Process_Flow_Accounting_Integration.pdf` | Accounting integration process flow |

---

*Kornet Express Inc. Logistics & FS Platform — Internal Operations System*
*Built with React + Vite + TypeScript + Node.js + Express + Prisma + SQLite*
