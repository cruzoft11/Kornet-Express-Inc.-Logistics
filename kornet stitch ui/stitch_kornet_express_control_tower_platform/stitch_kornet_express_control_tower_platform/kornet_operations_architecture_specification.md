# Kornet Express Inc. - Global Logistics Operations System Specification & UI Architecture

## 1. System Identity & Positioning
- **Company**: Kornet Express Inc. (Est. 2000, Philippines)
- **Brand Slogan**: Global Logistics Solutions
- **Operational Pillars**: Communication • Accuracy • Service Quality • Speed
- **Architecture**: React 18 + TypeScript + Vite + Tailwind CSS + Zustand + Axios
- **Scope Isolation**: Multi-tenant company-scoped header (`X-Company-Id`, `Authorization: Bearer <token>`)

## 2. Color Palette & Theming (Tokens)
- **Kornet Navy**: `#071D49` (Primary Brand & Navigation)
- **Deep Navy**: `#102B59` (Surface & Accent)
- **Kornet Red**: `#C1121F` (High Priority & Brand Accent, Hover `#A90F1A`)
- **Operational Blue**: `#1769A8` (Primary Action & Affordances)
- **Bright Blue**: `#2D86C5` (Interactive Links & Active Elements)
- **Graphite**: `#28343D` (Structural Lines & Dark Labels)
- **Body Text**: `#111827` / Muted: `#697386` / Border: `#DCE2EB` / Surface: `#F8FAFC`
- **Functional Semantics**: Success `#087443`, Warning `#B7791F`, Error `#B42318`
- **Monospace Element**: `IBM Plex Mono` for File numbers, B/L, AWB, VIN, Tracking codes, Timestamps, GL accounts.

## 3. Comprehensive Module Inventory
1. **Authentication & Session Gate**:
   - Secure company-scoped login, password visibility, generic authentication error feedback, "Need access help?" modal.
2. **Operations Control Tower (Main Dashboard)**:
   - Live metrics summary: Open shipment files, In-transit shipments, Vehicles on hold, Pending P/D orders, Dispatches requiring attention, Accounting bridge pending.
   - Modules: Operational Priorities, Shipment Live Activity, Fleet/Dispatch Status, Integrations Status, Recent Audit Trail, Network Route Overview.
   - Interactive state switchers: Live Working state, Empty State ("Your operational workspace is clear"), Error State, Loading Skeletons.
3. **Ocean Freight Management**:
   - File table: File No, Booking, B/L, Direction, Shipper, Consignee, Origin, Destination, Carrier, ETD, ETA, Status, Margin, Actions.
   - Detail Drawer: Shipment identity, Parties, Routing, Container & Cargo specs, Billing/Cost lines, Documents, Close File modal with margin check & customs warnings.
4. **Air Freight Module**:
   - AWB No, Airline, Flight No, Chargeable Weight, Origin/Dest Airport, Flight Schedule, Security/Documentation Status.
5. **Vehicle Staging & VIN Decoder**:
   - VIN inventory, Customs holds, Inspection logs, Container assignment, manual entry fallback.
6. **Pickup & Delivery (P/D)**:
   - Order pipeline, Driver dispatch, Warehouse receipt link, cargo handover verification.
7. **Fleet & Dispatch / POD Capture**:
   - Drivers, Fleet equipment, Route dispatching, Touch signature POD pad with hardware connectivity indicators.
8. **Customer Tracking & Milestones**:
   - Multi-leg milestone timeline: Booked, Received, In Transit, Customs Processing, Released, Delivered, Exception.
9. **Accounting Bridge & Disbursements**:
   - Staged lines, Debit/Credit ledger, Checks disbursement, Trial post & Final post verification.
10. **Integrations & Hardware Devices**:
    - Carrier API, Barcode scanner, Label printer, Signature pad, Customs/BOC portal, SMTP service with honest connectivity states.
