import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import {
  BarChart3,
  BookOpen,
  Building2,
  CalendarCheck,
  CircleDollarSign,
  ClipboardList,
  Cog,
  FileText,
  Gauge,
  Landmark,
  Plane,
  Receipt,
  Route,
  Settings2,
  Ship,
  Truck,
  Users,
  Warehouse,
} from 'lucide-react'

// Dashboard
const DashboardPage = lazy(() => import('./modules/dashboard/Dashboard'))

// Operations
const QuotesPage = lazy(() => import('./modules/ops/QuotesPage').then((m) => ({ default: m.QuotesPage })))
const ShipmentWorkspace = lazy(() => import('./modules/ops/ShipmentWorkspace').then((m) => ({ default: m.ShipmentWorkspace })))
const PdOrdersPage = lazy(() => import('./modules/pd/PdOrdersPage'))
const PdDispatchBoard = lazy(() => import('./modules/pd/PdDispatchBoard'))
const VehicleInventoryPage = lazy(() => import('./modules/vehicles/VehicleInventoryPage'))
const FleetDispatchPage = lazy(() => import('./modules/fleet/FleetDispatchPage'))
const CustomerTrackingPortal = lazy(() => import('./components/logistics/CustomerTrackingPortal'))

// Billing
const InvoicesPage = lazy(() => import('./modules/billing/pages').then((m) => ({ default: m.InvoicesPage })))
const ReceivablesPage = lazy(() => import('./modules/billing/pages').then((m) => ({ default: m.ReceivablesPage })))
const PayablesPage = lazy(() => import('./modules/billing/pages').then((m) => ({ default: m.PayablesPage })))
const DisbursementsPage = lazy(() => import('./modules/billing/pages').then((m) => ({ default: m.DisbursementsPage })))
const AccountingBridgePage = lazy(() => import('./modules/billing/pages').then((m) => ({ default: m.AccountingBridgePage })))

// Ledger (FS)
const LedgerOverviewPage = lazy(() => import('./modules/ledger/pages').then((m) => ({ default: m.LedgerOverviewPage })))
const JournalPage = lazy(() => import('./modules/ledger/pages').then((m) => ({ default: m.JournalPage })))
const VoucherPage = lazy(() => import('./modules/ledger/pages').then((m) => ({ default: m.VoucherPage })))
const ChartOfAccountsPage = lazy(() => import('./modules/ledger/pages').then((m) => ({ default: m.ChartOfAccountsPage })))
const ReportsPage = lazy(() => import('./modules/ledger/pages').then((m) => ({ default: m.ReportsPage })))
const PostingPage = lazy(() => import('./modules/ledger/pages').then((m) => ({ default: m.PostingPage })))
const MonthEndPage = lazy(() => import('./modules/ledger/pages').then((m) => ({ default: m.MonthEndPage })))
const DirectoryPage = lazy(() => import('./modules/ledger/pages').then((m) => ({ default: m.DirectoryPage })))

// Masters / Directories
const PartiesPage = lazy(() => import('./modules/masters/MastersPages').then((m) => ({ default: m.PartiesPage })))
const PortsPage = lazy(() => import('./modules/masters/MastersPages').then((m) => ({ default: m.PortsPage })))
const BillingCodesPage = lazy(() => import('./modules/masters/MastersPages').then((m) => ({ default: m.BillingCodesPage })))
const TariffsPage = lazy(() => import('./modules/masters/MastersPages').then((m) => ({ default: m.TariffsPage })))
const CurrenciesPage = lazy(() => import('./modules/masters/MastersPages').then((m) => ({ default: m.CurrenciesPage })))

// Admin
const UsersPage = lazy(() => import('./modules/admin/AdminPages').then((m) => ({ default: m.UsersPage })))
const CompanySettingsPage = lazy(() => import('./modules/admin/AdminPages').then((m) => ({ default: m.CompanySettingsPage })))
const AuditLogPage = lazy(() => import('./modules/admin/AdminPages').then((m) => ({ default: m.AuditLogPage })))
const IntegrationsSettings = lazy(() => import('./components/logistics/IntegrationsSettings'))
const UIKit = lazy(() => import('./pages/UIKit'))

export type LazyComponent = LazyExoticComponent<ComponentType<Record<string, never>>> | ComponentType<Record<string, never>>

export interface AppRoute {
  path: string
  label: string
  group: string
  icon: ComponentType<{ className?: string }>
  roles?: string[];
  element: React.ReactNode
  shortcut?: string
  keywords?: string[]
  hidden?: boolean
}

export const appRoutes: AppRoute[] = [
  // Dashboard
  { path: '/dashboard', label: 'Dashboard', group: 'Dashboard', icon: Gauge, element: <DashboardPage />, shortcut: 'G D', keywords: ['kpi', 'control tower', 'operations'] },

  // Operations
  { path: '/logistics/quotes', label: 'Quotes', group: 'Operations', icon: ClipboardList, element: <QuotesPage />, shortcut: 'G Q', keywords: ['quotation', 'rate quote', 'lane'] },
  { path: '/logistics/ocean-export', label: 'Ocean Export', group: 'Operations', icon: Ship, element: <ShipmentWorkspace mode="OCEAN_EXPORT" />, shortcut: 'G O', keywords: ['sea', 'bl', 'hbl', 'booking'] },
  { path: '/logistics/ocean-import', label: 'Ocean Import', group: 'Operations', icon: Ship, element: <ShipmentWorkspace mode="OCEAN_IMPORT" />, keywords: ['import', 'arrival notice', 'customs'] },
  { path: '/logistics/air-export', label: 'Air Export', group: 'Operations', icon: Plane, element: <ShipmentWorkspace mode="AIR_EXPORT" />, shortcut: 'G A', keywords: ['flight', 'awb', 'mawb', 'hawb'] },
  { path: '/logistics/air-import', label: 'Air Import', group: 'Operations', icon: Plane, element: <ShipmentWorkspace mode="AIR_IMPORT" />, keywords: ['air cargo', 'import'] },
  { path: '/logistics/domestic', label: 'Domestic / Trucking', group: 'Operations', icon: Truck, element: <ShipmentWorkspace mode="DOMESTIC" />, keywords: ['domestic', 'waybill', 'trucking'] },
  { path: '/logistics/pd-orders', label: 'P/D Orders', group: 'Operations', icon: Warehouse, element: <PdOrdersPage />, shortcut: 'G P', keywords: ['pickup', 'delivery', 'dispatch', 'pod'] },
  { path: '/logistics/pd-orders/board', label: 'P/D Dispatch Board', group: 'Operations', icon: Route, element: <PdDispatchBoard />, hidden: true, keywords: ['board', 'kanban'] },
  { path: '/logistics/vehicles', label: 'Vehicle Inventory', group: 'Operations', icon: Truck, element: <VehicleInventoryPage />, shortcut: 'G V', keywords: ['vin', 'roro', 'dock receipt', 'title'] },
  { path: '/logistics/fleet', label: 'Fleet & Dispatch', group: 'Operations', icon: Route, element: <FleetDispatchPage />, shortcut: 'G F', keywords: ['trucks', 'drivers', 'plate'] },
  { path: '/logistics/tracking', label: 'Customer Tracking', group: 'Operations', icon: Route, element: <CustomerTrackingPortal />, keywords: ['milestones', 'status'] },
  { path: '/logistics/files/:id', label: 'Shipment Detail', group: 'Operations', icon: Ship, element: <ShipmentWorkspace />, hidden: true },

  // Billing
  { path: '/billing/invoices', label: 'Invoices & Credits', group: 'Billing', icon: Receipt, element: <InvoicesPage />, shortcut: 'G I', keywords: ['sales invoice', 'credit memo', 'EOPT', 'VAT'] },
  { path: '/billing/invoices/:id', label: 'Invoice Detail', group: 'Billing', icon: Receipt, element: <InvoicesPage />, hidden: true },
  { path: '/billing/receivables', label: 'Receivables / Collections', group: 'Billing', icon: CircleDollarSign, element: <ReceivablesPage />, shortcut: 'G R', keywords: ['official receipt', 'AR aging', 'SOA', '2307'] },
  { path: '/billing/payables', label: 'Payables / AP Bills', group: 'Billing', icon: Receipt, element: <PayablesPage />, shortcut: 'G P', keywords: ['vendor bill', 'input VAT', 'AP aging'] },
  { path: '/billing/disbursements', label: 'Disbursements / Checks', group: 'Billing', icon: FileText, element: <DisbursementsPage />, shortcut: 'G C', keywords: ['check voucher', 'cash disbursement', 'direct expense'] },
  { path: '/billing/accounting-bridge', label: 'Accounting Bridge', group: 'Billing', icon: Building2, element: <AccountingBridgePage />, shortcut: 'G B', keywords: ['trial post', 'final post', 'journal bridge'] },

  // Ledger (FS)
  { path: '/fs', label: 'Ledger Overview', group: 'Ledger (FS)', icon: BookOpen, element: <LedgerOverviewPage />, shortcut: 'G L', keywords: ['FS overview', 'period', 'unposted'] },
  { path: '/fs/journals/general', label: 'General Journal', group: 'Ledger (FS)', icon: FileText, element: <JournalPage kind="general" /> },
  { path: '/fs/journals/:kind', label: 'Journals', group: 'Ledger (FS)', icon: FileText, element: <JournalPage />, hidden: true },
  { path: '/fs/vouchers/cdb', label: 'CDB Vouchers', group: 'Ledger (FS)', icon: FileText, element: <VoucherPage />, hidden: true },
  { path: '/fs/chart-of-accounts', label: 'Chart of Accounts', group: 'Ledger (FS)', icon: BarChart3, element: <ChartOfAccountsPage />, shortcut: 'G A', keywords: ['COA', 'accounts'] },
  { path: '/fs/reports', label: 'Reports', group: 'Ledger (FS)', icon: BarChart3, element: <ReportsPage />, keywords: ['trial balance', 'balance sheet', 'income statement', 'GL detail'] },
  { path: '/fs/reports/:type', label: 'Report Detail', group: 'Ledger (FS)', icon: BarChart3, element: <ReportsPage />, hidden: true },
  { path: '/fs/posting', label: 'Posting', group: 'Ledger (FS)', icon: Landmark, element: <PostingPage />, keywords: ['bulk post', 'recompute balances'] },
  { path: '/fs/month-end', label: 'Month-End', group: 'Ledger (FS)', icon: CalendarCheck, element: <MonthEndPage />, keywords: ['close', 'checklist'] },
  { path: '/fs/banks', label: 'Banks', group: 'Ledger (FS)', icon: Building2, element: <DirectoryPage kind="banks" />, keywords: ['bank accounts'] },
  { path: '/fs/suppliers', label: 'Suppliers', group: 'Ledger (FS)', icon: Building2, element: <DirectoryPage kind="suppliers" />, keywords: ['suppliers directory'] },
  { path: '/fs/signatories', label: 'Signatories', group: 'Ledger (FS)', icon: Settings2, element: <DirectoryPage kind="signatories" />, roles: ['admin', 'superadmin'] },

  // Directories
  { path: '/directories/parties', label: 'Customers & Vendors', group: 'Directories', icon: Users, element: <PartiesPage />, keywords: ['parties', 'shippers', 'consignees', 'carriers'] },
  { path: '/directories/ports', label: 'Ports', group: 'Directories', icon: Ship, element: <PortsPage />, keywords: ['airports', 'seaports', 'unlocode'] },
  { path: '/directories/billing-codes', label: 'Billing Codes', group: 'Directories', icon: Receipt, element: <BillingCodesPage />, keywords: ['charge catalog', 'revenue accounts'] },
  { path: '/directories/rates', label: 'Tariffs / Rates', group: 'Directories', icon: CircleDollarSign, element: <TariffsPage />, keywords: ['tariffs', 'pricing'] },
  { path: '/directories/currencies', label: 'Currencies / FX', group: 'Directories', icon: CircleDollarSign, element: <CurrenciesPage />, hidden: true },

  // Admin
  { path: '/admin/users', label: 'Users', group: 'Admin', icon: Users, roles: ['admin', 'superadmin'], element: <UsersPage /> },
  { path: '/admin/settings', label: 'Settings', group: 'Admin', icon: Cog, roles: ['admin', 'superadmin', 'manager'], element: <CompanySettingsPage /> },
  { path: '/admin/integrations', label: 'Integrations', group: 'Admin', icon: Cog, roles: ['admin', 'superadmin', 'manager'], element: <IntegrationsSettings /> },
  { path: '/admin/audit-log', label: 'Audit Log', group: 'Admin', icon: FileText, roles: ['admin', 'superadmin', 'manager'], element: <AuditLogPage /> },
  { path: '/ui-kit', label: 'UI Kit', group: 'Admin', icon: Cog, roles: ['admin', 'superadmin'], element: <UIKit /> },
]
