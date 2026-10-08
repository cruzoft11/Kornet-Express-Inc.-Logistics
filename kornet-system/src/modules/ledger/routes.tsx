import { BarChart3, BookOpen, Building2, FileText, Landmark, Receipt, Settings2 } from 'lucide-react'
import type { AppRoute } from '@/routes'
import { ChartOfAccountsPage, DirectoryPage, JournalPage, LedgerOverviewPage, MonthEndPage, PostingPage, ReportsPage, VoucherPage } from './pages'

export const ledgerRoutes: AppRoute[] = [
  { path: '/fs', label: 'Ledger Overview', group: 'Ledger (FS)', icon: BookOpen, element: <LedgerOverviewPage />, shortcut: 'G L', keywords: ['FS overview', 'period', 'unposted'] },
  { path: '/fs/journals/:kind', label: 'Journals', group: 'Ledger (FS)', icon: FileText, element: <JournalPage />, keywords: ['CDB', 'CRB', 'sales book', 'purchase book', 'general journal', 'adjustments'] },
  { path: '/fs/journals/general', label: 'General Journal', group: 'Ledger (FS)', icon: FileText, element: <JournalPage kind="general" /> },
  { path: '/fs/journals/receipts', label: 'Cash Receipts Book', group: 'Ledger (FS)', icon: Receipt, element: <JournalPage kind="receipts" /> },
  { path: '/fs/journals/sales', label: 'Sales Book', group: 'Ledger (FS)', icon: Receipt, element: <JournalPage kind="sales" /> },
  { path: '/fs/journals/purchase', label: 'Purchase Book', group: 'Ledger (FS)', icon: Receipt, element: <JournalPage kind="purchase" /> },
  { path: '/fs/journals/adjustments', label: 'Adjustments', group: 'Ledger (FS)', icon: FileText, element: <JournalPage kind="adjustments" /> },
  { path: '/fs/vouchers/cdb', label: 'CDB Check Vouchers', group: 'Ledger (FS)', icon: FileText, element: <VoucherPage /> },
  { path: '/fs/chart-of-accounts', label: 'Chart of Accounts', group: 'Ledger (FS)', icon: BarChart3, element: <ChartOfAccountsPage />, shortcut: 'G A', keywords: ['COA', 'accounts', 'normal balance'] },
  { path: '/fs/reports', label: 'Reports', group: 'Ledger (FS)', icon: BarChart3, element: <ReportsPage />, keywords: ['trial balance', 'balance sheet', 'income statement', 'GL detail', 'books'] },
  { path: '/fs/posting', label: 'Posting', group: 'Ledger (FS)', icon: Landmark, element: <PostingPage />, keywords: ['bulk post', 'recompute balances'] },
  { path: '/fs/month-end', label: 'Month-End', group: 'Ledger (FS)', icon: Settings2, element: <MonthEndPage />, keywords: ['close', 'checklist'] },
  { path: '/fs/banks', label: 'Banks', group: 'Ledger (FS)', icon: Building2, element: <DirectoryPage kind="banks" /> },
  { path: '/fs/suppliers', label: 'Suppliers', group: 'Ledger (FS)', icon: Building2, element: <DirectoryPage kind="suppliers" /> },
  { path: '/fs/signatories', label: 'Signatories', group: 'Ledger (FS)', icon: Settings2, element: <DirectoryPage kind="signatories" />, roles: ['admin', 'superadmin'] },
]
