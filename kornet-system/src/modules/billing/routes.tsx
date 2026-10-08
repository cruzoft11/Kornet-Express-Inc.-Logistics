import { Building2, CircleDollarSign, FileText, Receipt } from 'lucide-react'
import type { AppRoute } from '@/routes'
import { AccountingBridgePage, DisbursementsPage, InvoicesPage, PayablesPage, ReceivablesPage } from './pages'

export const billingRoutes: AppRoute[] = [
  { path: '/billing/invoices', label: 'Invoices & Credits', group: 'Billing', icon: Receipt, element: <InvoicesPage />, shortcut: 'G I', keywords: ['sales invoice', 'credit memo', 'EOPT', 'VAT'] },
  { path: '/billing/invoices/:id', label: 'Invoice Detail', group: 'Billing', icon: Receipt, element: <InvoicesPage />, keywords: ['invoice detail', 'print invoice'] },
  { path: '/billing/receivables', label: 'Receivables / Collections', group: 'Billing', icon: CircleDollarSign, element: <ReceivablesPage />, shortcut: 'G R', keywords: ['official receipt', 'AR aging', 'SOA', '2307'] },
  { path: '/billing/payables', label: 'Payables / AP Bills', group: 'Billing', icon: Receipt, element: <PayablesPage />, shortcut: 'G P', keywords: ['vendor bill', 'input VAT', 'AP aging'] },
  { path: '/billing/disbursements', label: 'Disbursements / Checks', group: 'Billing', icon: FileText, element: <DisbursementsPage />, shortcut: 'G C', keywords: ['check voucher', 'cash disbursement', 'direct expense'] },
  { path: '/billing/accounting-bridge', label: 'Accounting Bridge', group: 'Billing', icon: Building2, element: <AccountingBridgePage />, shortcut: 'G B', keywords: ['trial post', 'final post', 'journal bridge'] },
]
