import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  Calculator,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileDown,
  FileSpreadsheet,
  Landmark,
  Layers,
  Lock,
  Plus,
  Printer,
  RefreshCcw,
  Search,
  ShieldAlert,
  Trash2,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Combobox,
  ConfirmDialog,
  DataGrid,
  DateInput,
  Dialog,
  DialogContent,
  FormField,
  IconButton,
  Input,
  MoneyInput,
  PageHeader,
  Select,
  Sheet,
  SheetContent,
  StatusPill,
  Textarea,
  Toolbar,
  exportRowsToExcel,
} from '@/components/ui'
import { useHotkeys } from '@/hooks/useHotkeys'
import { formatDate, formatMoney } from '@/lib/format'
import {
  ledgerApi,
  type FsAccount,
  type FsBank,
  type FsJournalLine,
  type FsSignatory,
  type FsSupplier,
  type FsVoucherLine,
  type FsVoucherMaster,
} from '@/api/ledger'

const today = () => new Date().toISOString().slice(0, 10)
const unwrap = <T,>(v?: { data: T[] }) => v?.data ?? []
const money = (v?: number | null) => <span className="font-mono tabular-nums">{formatMoney(v ?? 0)}</span>
const errorText = (e: unknown) => (e instanceof Error ? e.message : 'Request failed. Review required fields and fiscal rules.')

const accountsForCombo = (rows: FsAccount[]) =>
  rows
    .filter((a) => a.isActive !== false && ['DC', 'CD'].includes(String(a.formula)))
    .map((a) => ({ id: a.acctCode, label: `${a.acctCode} — ${a.acctDesc}`, description: `${a.glReport || ''} · ${a.formula === 'CD' ? 'Credit Normal' : 'Debit Normal'}` }))

function numberToWordsPesos(amount: number): string {
  if (!amount || amount <= 0) return 'Zero Pesos Only'
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  const num = Math.floor(amount)
  const cents = Math.round((amount - num) * 100)

  function convertChunk(n: number): string {
    let str = ''
    if (n >= 100) {
      str += units[Math.floor(n / 100)] + ' Hundred '
      n %= 100
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + (n % 10 ? ' ' + units[n % 10] : '')
    } else if (n > 0) {
      str += units[n]
    }
    return str.trim()
  }

  let words = ''
  const millions = Math.floor(num / 1000000)
  const thousands = Math.floor((num % 1000000) / 1000)
  const remainder = num % 1000

  if (millions) words += convertChunk(millions) + ' Million '
  if (thousands) words += convertChunk(thousands) + ' Thousand '
  if (remainder) words += convertChunk(remainder)

  words = words.trim() || 'Zero'
  const centStr = cents > 0 ? ` and ${String(cents).padStart(2, '0')}/100` : ' Exactly'
  return `${words} Pesos${centStr} Only`.toUpperCase()
}

function printHtml(title: string, html: string) {
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(`<!doctype html><html><head><title>${title}</title><style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 32px; color: #1e293b; }
    h1 { margin-bottom: 4px; font-size: 20px; color: #07558f; }
    .subtitle { font-size: 12px; color: #64748b; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 12px; }
    th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; font-weight: 600; }
    td { border: 1px solid #e2e8f0; padding: 7px 10px; }
    .num { text-align: right; font-family: 'JetBrains Mono', monospace; font-size: 11px; }
    .header-box { border-bottom: 2px solid #07558f; padding-bottom: 12px; margin-bottom: 16px; }
    .footer { margin-top: 32px; display: flex; justify-content: space-between; font-size: 11px; color: #64748b; }
    .sig-block { margin-top: 40px; display: flex; justify-content: space-between; }
    .sig-line { width: 200px; border-top: 1px solid #334155; text-align: center; padding-top: 6px; font-size: 11px; }
    @media print { button { display: none; } }
  </style></head><body>
    <div style="margin-bottom:12px"><button onclick="window.print()" style="padding:6px 16px;background:#07558f;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600">Print Report</button></div>
    <div class="header-box">
      <h1>KORNET EXPRESS, INC.</h1>
      <div class="subtitle">Logistics & Freight Forwarding Fiscal Accounting · ${title}</div>
    </div>
    ${html}
    <div class="footer"><span>Generated on ${new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</span><span>Kornet FS Ledger System v2</span></div>
  </body></html>`)
  w.document.close()
}

// =========================================================================
// 1. LEDGER OVERVIEW
// =========================================================================
export function LedgerOverviewPage() {
  const navigate = useNavigate()
  const info = useQuery({ queryKey: ['fs-system-info'], queryFn: () => ledgerApi.systemInfo() })
  const checklist = useQuery({ queryKey: ['fs-month-end'], queryFn: () => ledgerApi.monthEndChecklist() })

  const books = [
    { key: 'unpostedChecks', name: 'Cash Disbursement Vouchers (CDV)', path: '/fs/vouchers/cdb', count: Number(info.data?.unpostedChecks || 0) },
    { key: 'unpostedCashReceipts', name: 'Cash Receipts Book (CRB)', path: '/fs/journals/receipts', count: Number(info.data?.unpostedCashReceipts || 0) },
    { key: 'unpostedSalesBook', name: 'Sales Book (AR Invoices)', path: '/fs/journals/sales', count: Number(info.data?.unpostedSalesBook || 0) },
    { key: 'unpostedJournals', name: 'General Journal Vouchers (JV)', path: '/fs/journals/general', count: Number(info.data?.unpostedJournals || 0) },
    { key: 'unpostedPurchaseBook', name: 'Purchase Book (AP Bills)', path: '/fs/journals/purchase', count: Number(info.data?.unpostedPurchaseBook || 0) },
    { key: 'unpostedAdjustments', name: 'Adjusting Journal Vouchers', path: '/fs/journals/adjustments', count: Number(info.data?.unpostedAdjustments || 0) },
  ]

  const totalUnposted = books.reduce((sum, b) => sum + b.count, 0)
  const isReady = checklist.data?.data?.ok ?? false

  return (
    <div className="space-y-6 p-4 md:p-6 min-w-0 w-full">
      <PageHeader
        eyebrow="FS Ledger"
        title="Fiscal Ledger Overview"
        description="Core accounting control tower for Kornet Express, Inc. Monitor active fiscal period, unposted transaction books, balance integrity, and month-end readiness."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/fs/reports')}>
              <FileSpreadsheet className="size-4" />
              Reports
            </Button>
            <Button size="sm" onClick={() => navigate('/fs/posting')}>
              <RefreshCcw className="size-4" />
              Batch Posting
            </Button>
          </div>
        }
      />

      {/* Primary KPI Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 shadow-2xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Fiscal Period</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-bold">
              {info.data?.currentMonth ? `${String(info.data.currentMonth).padStart(2, '0')} / ${info.data.currentYear}` : '—'}
            </span>
            <span className="rounded-md bg-secondary/10 px-2 py-0.5 text-xs font-semibold text-secondary">
              {info.data?.companyCode || 'KORNET'}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground truncate">
            {info.data?.begDate ? `${formatDate(info.data.begDate as string)} → ${formatDate(info.data.endDate as string)}` : 'Period loaded'}
          </p>
        </Card>

        <Card className="p-4 shadow-2xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Staged Unposted Records</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className={`font-mono text-2xl font-bold ${totalUnposted > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {totalUnposted}
            </span>
            <StatusPill status={totalUnposted === 0 ? 'Clean' : 'Pending'} tone={totalUnposted === 0 ? 'success' : 'warning'} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Awaiting bulk post to General Ledger</p>
        </Card>

        <Card className="p-4 shadow-2xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trial Balance Status</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-lg font-bold">
              {checklist.data?.data?.tbBalanced ? 'Balanced' : 'Out of Balance'}
            </span>
            <StatusPill status={checklist.data?.data?.tbBalanced ? 'Dr = Cr' : 'Variance'} tone={checklist.data?.data?.tbBalanced ? 'success' : 'danger'} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground truncate">
            Debits: {formatMoney(checklist.data?.data?.totalDebit)}
          </p>
        </Card>

        <Card className="p-4 shadow-2xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Month-End Readiness</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className={`font-mono text-2xl font-bold ${isReady ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {isReady ? 'Ready' : 'Blocked'}
            </span>
            <Button size="sm" variant={isReady ? 'default' : 'secondary'} onClick={() => navigate('/fs/month-end')}>
              Checklist →
            </Button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {isReady ? 'Period clear for closing' : `${totalUnposted} entries require posting`}
          </p>
        </Card>
      </div>

      {/* Quick Action Navigation Grid */}
      <div>
        <h2 className="mb-3 text-sm font-semibold tracking-wide uppercase text-muted-foreground">Ledger Workspaces</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { title: 'Month-End Close', desc: 'Pre-close checklist, advance CDV transfers, and fiscal calendar period roll.', path: '/fs/month-end', icon: Lock, color: 'text-amber-600' },
            { title: 'Staged Batch Posting', desc: 'Validate Dr=Cr equality and post staged books into fs_pournals.', path: '/fs/posting', icon: RefreshCcw, color: 'text-secondary' },
            { title: 'Financial Reports', desc: 'Generate Trial Balance, Balance Sheet, Income Statement, and GL details.', path: '/fs/reports', icon: FileSpreadsheet, color: 'text-emerald-600' },
            { title: 'Chart of Accounts', desc: 'Maintain GL account tree, normal balances (DC/CD), and report groupings.', path: '/fs/chart-of-accounts', icon: Layers, color: 'text-blue-600' },
            { title: 'Check Vouchers (CDB)', desc: 'Prepare and print cash disbursements, check vouchers, and payee allocations.', path: '/fs/vouchers/cdb', icon: Landmark, color: 'text-indigo-600' },
            { title: 'General Journal (JV)', desc: 'Record balanced manual journal entries and adjustments with live validation.', path: '/fs/journals/general', icon: BookOpen, color: 'text-rose-600' },
          ].map((item) => {
            const Icon = item.icon
            return (
              <Card
                key={item.title}
                className="group cursor-pointer p-5 transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-secondary/40"
                onClick={() => navigate(item.path)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl border bg-muted/60 p-2.5 group-hover:bg-secondary/10 transition-colors">
                      <Icon className={`size-5 ${item.color}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm group-hover:text-secondary transition-colors">{item.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.desc}</p>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Unposted Books Audit Table */}
      <Card className="shadow-xs overflow-hidden">
        <CardHeader className="border-b bg-card/60 px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Staged Subsidiary Books Audit</CardTitle>
              <CardDescription>Breakdown of staged unposted records across all 6 fiscal accounting books</CardDescription>
            </div>
            {totalUnposted > 0 && (
              <Button size="sm" onClick={() => navigate('/fs/posting')}>
                <RefreshCcw className="size-3.5" />
                Post All ({totalUnposted})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y text-sm">
            {books.map((b) => (
              <div key={b.key} className="flex items-center justify-between px-5 py-3 hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`size-2.5 rounded-full ${b.count > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  <div>
                    <span className="font-medium text-foreground">{b.name}</span>
                    <span className="ml-2 font-mono text-xs text-muted-foreground">({b.key})</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`font-mono font-bold ${b.count > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                    {b.count} {b.count === 1 ? 'record' : 'records'}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => navigate(b.path)}>
                    Open Book →
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// =========================================================================
// 2. MONTH-END PROCESSING
// =========================================================================
export function MonthEndPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [forceReason, setForceReason] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [forceDialogOpen, setForceDialogOpen] = useState(false)
  const [advanceTransferOpen, setAdvanceTransferOpen] = useState(false)

  const sysInfo = useQuery({ queryKey: ['fs-system-info'], queryFn: () => ledgerApi.systemInfo() })
  const checklist = useQuery({ queryKey: ['fs-month-end'], queryFn: () => ledgerApi.monthEndChecklist() })
  const advanceChecks = useQuery({ queryKey: ['fs-advance-checks'], queryFn: () => ledgerApi.advanceChecks() })

  const closeMutation = useMutation({
    mutationFn: (args?: { force?: boolean; reason?: string }) => ledgerApi.closeMonth(args),
    onSuccess: (data) => {
      toast.success(`Fiscal period successfully closed! Now on Month ${data.currentMonth}/${data.currentYear}`)
      qc.invalidateQueries({ queryKey: ['fs-month-end'] })
      qc.invalidateQueries({ queryKey: ['fs-system-info'] })
      setConfirmOpen(false)
      setForceDialogOpen(false)
      setForceReason('')
    },
    onError: (err) => toast.error(errorText(err)),
  })

  const transferMutation = useMutation({
    mutationFn: () => ledgerApi.transferAdvanceCdb(),
    onSuccess: (res) => {
      toast.success(res.message || `Transferred ${res.transferredCount} advance checks to active period.`)
      qc.invalidateQueries({ queryKey: ['fs-month-end'] })
      qc.invalidateQueries({ queryKey: ['fs-advance-checks'] })
      qc.invalidateQueries({ queryKey: ['fs-system-info'] })
      setAdvanceTransferOpen(false)
    },
    onError: (err) => toast.error(errorText(err)),
  })

  const d = checklist.data?.data
  const advCount = unwrap(advanceChecks.data).length
  const isReady = d?.ok ?? false
  const unposted = d?.unposted ?? 0
  const tbBalanced = d?.tbBalanced ?? false

  return (
    <div className="space-y-6 p-4 md:p-6 min-w-0 w-full">
      <PageHeader
        eyebrow="Month-End Processing"
        title="Fiscal Month-End Close"
        description="Verify subsidiary books, ensure Trial Balance equality, transfer advance disbursements, and advance the Kornet Express fiscal period."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ['fs-month-end'] })}>
              <RefreshCcw className="size-3.5" />
              Re-verify Checklist
            </Button>
            {isReady ? (
              <Button size="sm" onClick={() => setConfirmOpen(true)}>
                <Lock className="size-4" />
                Close Month
              </Button>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => setForceDialogOpen(true)}>
                <ShieldAlert className="size-4" />
                Admin Force Close
              </Button>
            )}
          </div>
        }
      />

      {/* Active Period Banner */}
      <Card className="border-secondary/30 bg-secondary/5 p-4 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-secondary/20 p-2.5 text-secondary">
              <Clock className="size-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-secondary">Current Active Period</p>
              <h3 className="text-lg font-bold">
                Month {sysInfo.data?.currentMonth || '—'}, {sysInfo.data?.currentYear || '—'}
                <span className="ml-3 text-xs font-normal text-muted-foreground font-mono">
                  ({formatDate(sysInfo.data?.begDate as string)} to {formatDate(sysInfo.data?.endDate as string)})
                </span>
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Status:</span>
            <StatusPill status={isReady ? 'Ready for Close' : 'Close Blocked'} tone={isReady ? 'success' : 'danger'} />
          </div>
        </div>
      </Card>

      {/* Readiness KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 shadow-2xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">General Ledger Balance</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-bold">{tbBalanced ? 'Balanced' : 'Variance'}</span>
            <StatusPill status={tbBalanced ? 'Dr = Cr' : 'Unbalanced'} tone={tbBalanced ? 'success' : 'danger'} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground truncate">
            Total Debits: {formatMoney(d?.totalDebit)}
          </p>
        </Card>

        <Card className="p-4 shadow-2xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Unposted Staged Entries</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className={`font-mono text-2xl font-bold ${unposted === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {unposted}
            </span>
            <StatusPill status={unposted === 0 ? 'Zero' : 'Requires Post'} tone={unposted === 0 ? 'success' : 'warning'} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Across all 6 subsidiary books</p>
        </Card>

        <Card className="p-4 shadow-2xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Advance Check Vouchers</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className={`font-mono text-2xl font-bold ${advCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {advCount}
            </span>
            {advCount > 0 && (
              <Button size="sm" variant="outline" onClick={() => setAdvanceTransferOpen(true)}>
                Transfer →
              </Button>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Post-dated checks for next cycle</p>
        </Card>

        <Card className="p-4 shadow-2xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Close Authorization</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-bold">{isReady ? 'Clear' : 'Pending'}</span>
            <StatusPill status={isReady ? 'Authorized' : 'Blocked'} tone={isReady ? 'success' : 'warning'} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {isReady ? 'All prerequisites satisfied' : 'Resolve blockers below'}
          </p>
        </Card>
      </div>

      {/* Pre-Close Verification Checklist */}
      <Card className="shadow-xs overflow-hidden">
        <CardHeader className="border-b bg-card/60 px-5 py-4">
          <CardTitle className="text-base">Pre-Close Verification Checklist</CardTitle>
          <CardDescription>Each validation gate must be green before the fiscal period can be closed</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {/* Item 1: Trial Balance */}
            <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3.5">
                {tbBalanced ? (
                  <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="size-5 text-destructive shrink-0" />
                )}
                <div>
                  <h4 className="font-semibold text-sm">General Ledger Trial Balance Equality</h4>
                  <p className="text-xs text-muted-foreground">
                    Verifies that total debits match total credits with zero net difference.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-muted-foreground">
                  Dr: {formatMoney(d?.totalDebit)} | Cr: {formatMoney(d?.totalCredit)}
                </span>
                <Button size="sm" variant="outline" onClick={() => navigate('/fs/reports?type=trial-balance')}>
                  View TB
                </Button>
              </div>
            </div>

            {/* Item 2: Unposted Transactions */}
            <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3.5">
                {unposted === 0 ? (
                  <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="size-5 text-amber-500 shrink-0" />
                )}
                <div>
                  <h4 className="font-semibold text-sm">Zero Staged Unposted Transactions</h4>
                  <p className="text-xs text-muted-foreground">
                    All Cash Disbursements, Receipts, Sales, Purchases, and Journal entries must be posted to General Ledger.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`font-mono text-xs font-semibold ${unposted > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600'}`}>
                  {unposted} pending
                </span>
                {unposted > 0 && (
                  <Button size="sm" onClick={() => navigate('/fs/posting')}>
                    Batch Post Now →
                  </Button>
                )}
              </div>
            </div>

            {/* Item 3: Advance CDV Transfer */}
            <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3.5">
                <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
                <div>
                  <h4 className="font-semibold text-sm">Advance Check Vouchers Review</h4>
                  <p className="text-xs text-muted-foreground">
                    Advance checks (ADV series) can be rolled forward to the new active period automatically.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-muted-foreground">
                  {advCount} advance checks
                </span>
                <Button size="sm" variant="outline" onClick={() => setAdvanceTransferOpen(true)}>
                  Transfer Tool
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unposted Breakdown by Book */}
      {d?.counts && (
        <Card className="shadow-xs overflow-hidden">
          <CardHeader className="border-b bg-card/60 px-5 py-4">
            <CardTitle className="text-base">Unposted Count by Subsidiary Book</CardTitle>
            <CardDescription>Individual book counts in current period</CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(d.counts).map(([book, count]) => (
                <div key={book} className="flex items-center justify-between rounded-lg border p-3 bg-card shadow-2xs">
                  <span className="capitalize font-medium text-sm text-foreground">{book}</span>
                  <span className={`font-mono font-bold text-sm ${count > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Regular Close Confirmation Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Close Fiscal Month?"
        description={`This will formally close Month ${sysInfo.data?.currentMonth}/${sysInfo.data?.currentYear} and advance the Kornet Express fiscal period to the next calendar month. All account ending balances will be preserved as the next period opening balances.`}
        onConfirm={() => closeMutation.mutate({ force: false })}
      />

      {/* Admin Force Close Dialog */}
      <Dialog open={forceDialogOpen} onOpenChange={setForceDialogOpen}>
        <DialogContent
          title="Admin Emergency Force Close"
          description="Force close bypasses unposted transaction checks. A formal managerial justification is permanently recorded in the system audit log."
        >
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
              <p className="font-semibold">Warning: Incomplete Period Data</p>
              <p className="mt-1">
                There are {unposted} unposted records and/or trial balance variances. Only perform this if explicitly approved by the Financial Controller.
              </p>
            </div>
            <FormField label="Reason for Emergency Force Close" required>
              <Textarea
                placeholder="Enter audit explanation (e.g. Authorized manual adjustment period rollover)..."
                value={forceReason}
                onChange={(e) => setForceReason(e.target.value)}
                rows={3}
              />
            </FormField>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setForceDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={!forceReason.trim()}
                loading={closeMutation.isPending}
                onClick={() => closeMutation.mutate({ force: true, reason: forceReason.trim() })}
              >
                Execute Force Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Advance Checks Transfer Sheet */}
      <Sheet open={advanceTransferOpen} onOpenChange={setAdvanceTransferOpen}>
        <SheetContent
          title="Advance Check Vouchers"
          description="Advance CDVs (ADV series) dated for future periods. Transfer them to the active period."
          className="w-[min(40rem,100vw)] overflow-y-auto"
        >
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{advCount} Advance Checks Found</p>
              <Button
                size="sm"
                onClick={() => transferMutation.mutate()}
                loading={transferMutation.isPending}
                disabled={advCount === 0}
              >
                Transfer All to Active Period
              </Button>
            </div>
            <div className="divide-y rounded-xl border">
              {unwrap(advanceChecks.data).map((ck: FsVoucherMaster) => (
                <div key={ck.jCkNo} className="flex items-center justify-between p-3 text-xs">
                  <div>
                    <span className="font-mono font-bold text-secondary">{ck.jCkNo}</span>
                    <span className="ml-2 font-medium">{ck.jPayTo || 'No Payee'}</span>
                    <p className="text-muted-foreground mt-0.5">Date: {formatDate(ck.jDate)}</p>
                  </div>
                  <span className="font-mono font-semibold">{formatMoney(ck.jCkAmt)}</span>
                </div>
              ))}
              {advCount === 0 && (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No advance checks pending transfer.
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

// =========================================================================
// 3. BULK POSTING CONSOLE
// =========================================================================
export function PostingPage() {
  const qc = useQueryClient()
  const [postResult, setPostResult] = useState<{ success: boolean; recordsPosted: number; errors?: string[]; message: string } | null>(null)

  const sysInfo = useQuery({ queryKey: ['fs-system-info'], queryFn: () => ledgerApi.systemInfo() })

  const postMutation = useMutation({
    mutationFn: () => ledgerApi.posting(),
    onSuccess: (data) => {
      setPostResult(data)
      if (data.success) {
        toast.success(`Successfully posted ${data.recordsPosted} staged transactions!`)
      } else {
        toast.warning(data.message || 'Posting completed with warnings.')
      }
      qc.invalidateQueries({ queryKey: ['fs-system-info'] })
      qc.invalidateQueries({ queryKey: ['fs-month-end'] })
    },
    onError: (err) => {
      toast.error(errorText(err))
      setPostResult(null)
    },
  })

  const recomputeMutation = useMutation({
    mutationFn: () => ledgerApi.recomputeBalances(),
    onSuccess: (res) => {
      toast.success(res.message || 'Account balances recomputed across General Ledger.')
      qc.invalidateQueries({ queryKey: ['fs-accounts'] })
      qc.invalidateQueries({ queryKey: ['fs-system-info'] })
    },
    onError: (err) => toast.error(errorText(err)),
  })

  const total = Number(sysInfo.data?.totalUnposted || 0)

  return (
    <div className="space-y-6 p-4 md:p-6 min-w-0 w-full">
      <PageHeader
        eyebrow="FS Ledger"
        title="Staged Transaction Batch Posting"
        description="Validate and commit staged subsidiary books (Cash Disbursements, Cash Receipts, Sales, Purchases, and Journal Vouchers) into the General Ledger (fs_pournals)."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => recomputeMutation.mutate()}
              loading={recomputeMutation.isPending}
            >
              <Calculator className="size-4" />
              Recompute Balances
            </Button>
            <Button
              size="sm"
              onClick={() => postMutation.mutate()}
              loading={postMutation.isPending}
              disabled={total === 0}
            >
              <RefreshCcw className="size-4" />
              Run Batch Posting
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4 shadow-2xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Staged Transactions</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className={`font-mono text-3xl font-bold ${total > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {total}
            </span>
            <StatusPill status={total > 0 ? 'Ready to Post' : 'All Clear'} tone={total > 0 ? 'warning' : 'success'} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Pending General Ledger commitment</p>
        </Card>

        <Card className="p-4 shadow-2xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Fiscal Cycle</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-bold">
              {sysInfo.data?.currentMonth ? `M${String(sysInfo.data.currentMonth).padStart(2, '0')} / ${sysInfo.data.currentYear}` : '—'}
            </span>
            <span className="rounded-md bg-secondary/10 px-2 py-0.5 text-xs font-semibold text-secondary">
              {sysInfo.data?.companyCode || 'KORNET'}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {sysInfo.data?.begDate ? `${formatDate(sysInfo.data.begDate as string)} → ${formatDate(sysInfo.data.endDate as string)}` : 'Active'}
          </p>
        </Card>

        <Card className="p-4 shadow-2xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ledger Engine State</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400">Online</span>
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-mono">Idempotent</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Asserts Dr = Cr with audit trail</p>
        </Card>
      </div>

      {/* Execution Results Banner if available */}
      {postResult && (
        <Card className={`border ${postResult.success ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-amber-500/40 bg-amber-500/5'} p-5 shadow-sm`}>
          <div className="flex items-start gap-3">
            {postResult.success ? (
              <CheckCircle2 className="size-5 text-emerald-600 mt-0.5" />
            ) : (
              <AlertTriangle className="size-5 text-amber-500 mt-0.5" />
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-sm">
                {postResult.message || (postResult.success ? 'Batch Posting Completed' : 'Batch Posting Completed with Exceptions')}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Committed <span className="font-bold text-foreground font-mono">{postResult.recordsPosted}</span> entries into General Ledger tables.
              </p>
              {postResult.errors && postResult.errors.length > 0 && (
                <div className="mt-3 space-y-1 rounded-lg bg-card p-3 border text-xs">
                  <p className="font-semibold text-destructive">Validation Errors Encountered:</p>
                  <ul className="list-disc pl-4 space-y-0.5 font-mono text-[11px] text-muted-foreground">
                    {postResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Staged Books Breakdown Grid */}
      <Card className="shadow-xs overflow-hidden">
        <CardHeader className="border-b bg-card/60 px-5 py-4">
          <CardTitle className="text-base">Staged Subsidiary Books Queue</CardTitle>
          <CardDescription>Each staged batch is validated for debit-credit equality before posting</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y text-sm">
            {[
              { label: 'Check Disbursements (CDV)', count: sysInfo.data?.unpostedChecks, table: 'fs_checkmas / fs_checkvou' },
              { label: 'Cash Receipts Book (CRB)', count: sysInfo.data?.unpostedCashReceipts, table: 'fs_cashrcpt' },
              { label: 'Sales Book (AR Invoices)', count: sysInfo.data?.unpostedSalesBook, table: 'fs_salebook' },
              { label: 'General Journal Vouchers (JV)', count: sysInfo.data?.unpostedJournals, table: 'fs_journals' },
              { label: 'Purchase Book (AP Bills)', count: sysInfo.data?.unpostedPurchaseBook, table: 'fs_purcbook' },
              { label: 'Adjusting Journal Vouchers', count: sysInfo.data?.unpostedAdjustments, table: 'fs_adjstmnt' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors">
                <div>
                  <p className="font-medium text-foreground">{item.label}</p>
                  <p className="font-mono text-xs text-muted-foreground">{item.table}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`font-mono font-bold ${Number(item.count || 0) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600'}`}>
                    {Number(item.count || 0)} staged
                  </span>
                  <StatusPill status={Number(item.count || 0) > 0 ? 'Queued' : 'Clear'} tone={Number(item.count || 0) > 0 ? 'warning' : 'success'} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// =========================================================================
// 4. FINANCIAL REPORTS
// =========================================================================
export function ReportsPage() {
  const [type, setType] = useState('trial-balance')
  const [from, setFrom] = useState(today().slice(0, 8) + '01')
  const [to, setTo] = useState(today())

  const q = useQuery({ queryKey: ['fs-report', type, from, to], queryFn: () => ledgerApi.report(type, { from, to }) })
  const rows = (q.data?.lines ?? []) as Array<Record<string, unknown>>
  const gridRows: Array<Record<string, unknown> & { id: number }> = rows.map((r, i) => ({ id: i, ...r }))

  const asString = (r: Record<string, unknown>, keys: string[]) => String(keys.map((k) => r[k]).find((v) => v !== undefined && v !== null) ?? '')
  const asNumber = (v: unknown) => Number(v ?? 0)

  const reportTitles: Record<string, string> = {
    'trial-balance': 'Trial Balance of Accounts',
    'balance-sheet': 'Statement of Financial Position (Balance Sheet)',
    'income-statement': 'Statement of Comprehensive Income (P&L)',
    'general-ledger': 'General Ledger Detail Audit',
    cdv: 'Cash Disbursement Book (CDV)',
    receipts: 'Cash Receipts Book (CRB)',
    sales: 'Sales Book (Sales Invoices)',
    purchase: 'Purchase Book (Vendor Bills)',
    journals: 'General Journal Book',
    adjustments: 'Adjustments Book',
  }

  const handlePrint = () => {
    const title = reportTitles[type] || type
    let tableHtml = ''
    if (type === 'trial-balance') {
      tableHtml = `<table><thead><tr><th>Account Code</th><th>Description</th><th>Group</th><th class="num">Debit Movement</th><th class="num">Credit Movement</th><th class="num">Ending Balance</th></tr></thead><tbody>`
      for (const r of rows) {
        tableHtml += `<tr><td>${r.acctCode || ''}</td><td>${r.acctDesc || ''}</td><td>${r.glReport || ''}</td><td class="num">${formatMoney(asNumber(r.debitMovement))}</td><td class="num">${formatMoney(asNumber(r.creditMovement))}</td><td class="num">${formatMoney(asNumber(r.endingBalance))}</td></tr>`
      }
      tableHtml += `</tbody><tfoot><tr style="font-weight:bold;background:#f8fafc"><td colspan="3">TOTALS</td><td class="num">${formatMoney(q.data?.totalDebit)}</td><td class="num">${formatMoney(q.data?.totalCredit)}</td><td class="num">${q.data?.inBalance ? 'BALANCED' : 'OUT OF BALANCE'}</td></tr></tfoot></table>`
    } else {
      tableHtml = `<table><thead><tr><th>Ref #</th><th>Description / Payee</th><th>Date</th><th class="num">Debit</th><th class="num">Credit</th><th class="num">Ending</th></tr></thead><tbody>`
      for (const r of rows) {
        tableHtml += `<tr><td>${asString(r, ['acctCode', 'refNo', 'jJvNo', 'jCkNo'])}</td><td>${asString(r, ['acctDesc', 'jPayTo', 'memo'])}</td><td>${formatDate(asString(r, ['jDate', 'date']))}</td><td class="num">${formatMoney(r.debitMovement !== undefined ? asNumber(r.debitMovement) : r.jDOrC === 'D' ? asNumber(r.jCkAmt) : 0)}</td><td class="num">${formatMoney(r.creditMovement !== undefined ? asNumber(r.creditMovement) : r.jDOrC === 'C' ? asNumber(r.jCkAmt) : 0)}</td><td class="num">${formatMoney(asNumber(r.endingBalance ?? r.endBal ?? r.runningBalance))}</td></tr>`
      }
      tableHtml += `</tbody></table>`
    }
    printHtml(title, tableHtml)
  }

  return (
    <div className="space-y-5 p-4 md:p-6 min-w-0 w-full">
      <PageHeader
        eyebrow="FS Ledger"
        title="Financial Statements & Books of Accounts"
        description="Generate official BIR and corporate accounting reports from the Kornet Express general ledger."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => exportRowsToExcel(rows, `kornet-${type}-${to}.xlsx`)}>
              <FileDown className="size-4" />
              Excel
            </Button>
            <Button size="sm" onClick={handlePrint}>
              <Printer className="size-4" />
              Print
            </Button>
          </div>
        }
      />

      {/* Filter Toolbar */}
      <Card className="p-4 shadow-2xs">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 items-end">
          <FormField label="Report Type">
            <Select
              value={type}
              onValueChange={setType}
              options={[
                { value: 'trial-balance', label: 'Trial Balance' },
                { value: 'balance-sheet', label: 'Balance Sheet' },
                { value: 'income-statement', label: 'Income Statement (P&L)' },
                { value: 'general-ledger', label: 'General Ledger' },
                { value: 'cdv', label: 'Cash Disbursement Book (CDV)' },
                { value: 'receipts', label: 'Cash Receipts Book (CRB)' },
                { value: 'sales', label: 'Sales Book' },
                { value: 'purchase', label: 'Purchase Book' },
                { value: 'journals', label: 'General Journal' },
                { value: 'adjustments', label: 'Adjustments Book' },
              ]}
            />
          </FormField>
          <FormField label="Date From">
            <DateInput value={from} onValueChange={setFrom} />
          </FormField>
          <FormField label="Date To">
            <DateInput value={to} onValueChange={setTo} />
          </FormField>
          <Button variant="secondary" onClick={() => q.refetch()}>
            <RefreshCcw className="size-3.5" />
            Apply Filter
          </Button>
        </div>
      </Card>

      {/* Financial Summary KPI Block */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4 shadow-2xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Debits</p>
          <span className="font-mono text-2xl font-bold mt-1 block">{formatMoney(q.data?.totalDebit)}</span>
        </Card>
        <Card className="p-4 shadow-2xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Credits</p>
          <span className="font-mono text-2xl font-bold mt-1 block">{formatMoney(q.data?.totalCredit)}</span>
        </Card>
        <Card className="p-4 shadow-2xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ledger Balance State</p>
          <div className="mt-1 flex items-center justify-between">
            <span className="font-mono text-xl font-bold">{q.data?.inBalance ? 'In Balance' : 'Variance'}</span>
            <StatusPill status={q.data?.inBalance ? 'Balanced' : 'Review'} tone={q.data?.inBalance ? 'success' : 'warning'} />
          </div>
        </Card>
      </div>

      {/* Report DataGrid */}
      <Card className="shadow-xs overflow-hidden">
        <CardHeader className="border-b bg-card/60 px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">{reportTitles[type] || type}</CardTitle>
              <CardDescription>{rows.length} lines · Period ending {formatDate(to)}</CardDescription>
            </div>
            <StatusPill status={q.data?.inBalance ? 'Verified' : 'Audit'} tone={q.data?.inBalance ? 'success' : 'warning'} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataGrid
            data={gridRows}
            loading={q.isLoading}
            density="compact"
            emptyTitle="No transactions match this report period"
            columns={[
              { id: 'ref', header: 'Ref / Account', cell: (r) => asString(r, ['acctCode', 'refNo', 'jJvNo', 'jCkNo']), className: 'font-mono font-semibold' },
              { id: 'desc', header: 'Description', cell: (r) => asString(r, ['acctDesc', 'jPayTo', 'memo']) },
              { id: 'date', header: 'Date', cell: (r) => formatDate(asString(r, ['jDate', 'date'])) },
              {
                id: 'debit',
                header: 'Debit',
                cell: (r) => money(r.debitMovement !== undefined ? asNumber(r.debitMovement) : r.jDOrC === 'D' ? asNumber(r.jCkAmt) : 0),
                className: 'text-right font-mono',
              },
              {
                id: 'credit',
                header: 'Credit',
                cell: (r) => money(r.creditMovement !== undefined ? asNumber(r.creditMovement) : r.jDOrC === 'C' ? asNumber(r.jCkAmt) : 0),
                className: 'text-right font-mono',
              },
              {
                id: 'ending',
                header: 'Ending',
                cell: (r) => money(asNumber(r.endingBalance ?? r.endBal ?? r.runningBalance)),
                className: 'text-right font-mono font-bold',
              },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  )
}

// =========================================================================
// 5. GENERAL JOURNAL
// =========================================================================
export function JournalPage({ kind = 'general' }: { kind?: string }) {
  const qc = useQueryClient()
  const [ref, setRef] = useState(`JV-${Date.now().toString().slice(-6)}`)
  const [date, setDate] = useState(today())
  const [lines, setLines] = useState<Array<Partial<FsJournalLine>>>([
    { jJvNo: ref, jDate: date, jDOrC: 'D', jCkAmt: 0 },
    { jJvNo: ref, jDate: date, jDOrC: 'C', jCkAmt: 0 },
  ])

  const accts = useQuery({ queryKey: ['fs-accounts'], queryFn: () => ledgerApi.accounts() })
  const q = useQuery({ queryKey: ['fs-journal', kind], queryFn: () => ledgerApi.journal(kind) })

  const debit = lines.filter((l) => l.jDOrC === 'D').reduce((s, l) => s + Number(l.jCkAmt || 0), 0)
  const credit = lines.filter((l) => l.jDOrC === 'C').reduce((s, l) => s + Number(l.jCkAmt || 0), 0)
  const balanced = Math.abs(debit - credit) < 0.01 && debit > 0

  const save = useMutation({
    mutationFn: async () => {
      for (const l of lines.filter((x) => x.acctCode && Number(x.jCkAmt))) {
        await ledgerApi.createJournalLine(kind, { ...l, jJvNo: ref, jDate: date })
      }
    },
    onSuccess: () => {
      toast.success('Journal lines saved to staging!')
      qc.invalidateQueries({ queryKey: ['fs-journal', kind] })
      qc.invalidateQueries({ queryKey: ['fs-system-info'] })
    },
    onError: (e) => toast.error(errorText(e)),
  })

  const act = useMutation({
    mutationFn: (op: string) => (op === 'trial' ? ledgerApi.trialJournal(kind, ref) : ledgerApi.postJournal(kind, ref)),
    onSuccess: (_, op) => {
      toast.success(op === 'trial' ? 'Trial post passed: Dr = Cr balanced!' : 'Journal voucher posted directly to ledger!')
      qc.invalidateQueries({ queryKey: ['fs-journal', kind] })
      qc.invalidateQueries({ queryKey: ['fs-system-info'] })
    },
    onError: (e) => toast.error(errorText(e)),
  })

  useHotkeys([
    { key: 'Mod+S', description: 'Save', handler: () => save.mutate() },
    { key: 'Mod+Enter', description: 'Post', handler: () => balanced && act.mutate('post') },
    { key: 'Alt+ArrowDown', description: 'Add line', handler: () => setLines([...lines, { jJvNo: ref, jDate: date, jDOrC: 'D', jCkAmt: 0 }]) },
  ])

  return (
    <div className="space-y-5 p-4 md:p-6 min-w-0 w-full">
      <PageHeader
        eyebrow="Journals"
        title={`${kind.toUpperCase()} Entry`}
        description="Enter balanced double-entry accounting records with real-time Dr/Cr validation and account search."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => act.mutate('trial')}>
              Simulate / Trial
            </Button>
            <Button
              size="sm"
              onClick={() => act.mutate('post')}
              disabled={!balanced}
              kbd="Ctrl+Enter"
            >
              Post to Ledger
            </Button>
          </div>
        }
        primaryAction={
          <Button onClick={() => save.mutate()} loading={save.isPending} kbd="Ctrl+S">
            Save Staged Lines
          </Button>
        }
      />

      <Card className="shadow-xs overflow-hidden">
        <CardHeader className="border-b bg-card/60 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Voucher Entry Header & Allocation</CardTitle>
              <CardDescription>Enter reference number, posting date, and debit/credit legs</CardDescription>
            </div>
            <div className={`flex items-center gap-3 font-mono text-xs font-semibold px-3 py-1.5 rounded-lg border ${balanced ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-destructive/10 text-destructive border-destructive/30'}`}>
              <span>Dr: {formatMoney(debit)}</span>
              <span>·</span>
              <span>Cr: {formatMoney(credit)}</span>
              <span>·</span>
              <span>Diff: {formatMoney(debit - credit)}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Journal Voucher Reference" required>
              <Input
                value={ref}
                onChange={(e) => {
                  setRef(e.target.value)
                  setLines(lines.map((l) => ({ ...l, jJvNo: e.target.value })))
                }}
              />
            </FormField>
            <FormField label="Transaction Date" required>
              <DateInput
                value={date}
                onValueChange={(v) => {
                  setDate(v)
                  setLines(lines.map((l) => ({ ...l, jDate: v })))
                }}
              />
            </FormField>
          </div>

          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                <tr>
                  <th className="p-3 text-left">GL Account</th>
                  <th className="p-3 text-left w-32">D / C</th>
                  <th className="p-3 text-right w-48">Amount (PHP)</th>
                  <th className="p-3 text-center w-16">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {lines.map((l, i) => (
                  <tr key={i} className="hover:bg-muted/20">
                    <td className="p-2.5">
                      <Combobox
                        items={accountsForCombo(unwrap(accts.data))}
                        value={l.acctCode}
                        placeholder="Search account by code or description..."
                        onSelect={(a) => setLines(lines.map((x, n) => (n === i ? { ...x, acctCode: a.id } : x)))}
                      />
                    </td>
                    <td className="p-2.5">
                      <Select
                        value={l.jDOrC ?? 'D'}
                        onValueChange={(v) => setLines(lines.map((x, n) => (n === i ? { ...x, jDOrC: v as 'D' | 'C' } : x)))}
                        options={[
                          { value: 'D', label: 'Debit (Dr)' },
                          { value: 'C', label: 'Credit (Cr)' },
                        ]}
                      />
                    </td>
                    <td className="p-2.5">
                      <MoneyInput
                        value={l.jCkAmt ?? 0}
                        onValueChange={(v) => setLines(lines.map((x, n) => (n === i ? { ...x, jCkAmt: v } : x)))}
                      />
                    </td>
                    <td className="p-2.5 text-center">
                      <IconButton
                        label="Remove line"
                        variant="ghost"
                        icon={<Trash2 className="size-4 text-destructive" />}
                        onClick={() => lines.length > 2 && setLines(lines.filter((_, n) => n !== i))}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLines([...lines, { jJvNo: ref, jDate: date, jDOrC: 'D', jCkAmt: 0 }])}
            >
              <Plus className="size-3.5" />
              Add Leg (Alt+↓)
            </Button>
            <span className="text-xs text-muted-foreground font-mono">
              {lines.length} lines configured
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Existing Unposted Lines Grid */}
      <Card className="shadow-xs overflow-hidden">
        <CardHeader className="border-b bg-card/60 px-5 py-4">
          <CardTitle className="text-base">Existing Staged {kind.toUpperCase()} Entries</CardTitle>
          <CardDescription>Unposted lines currently stored in the staging table</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataGrid
            data={unwrap(q.data)}
            density="compact"
            emptyTitle="No staged entries in this journal"
            columns={[
              { id: 'ref', header: 'Voucher Ref', accessor: 'jJvNo', className: 'font-mono font-semibold' },
              { id: 'date', header: 'Date', cell: (r) => formatDate(r.jDate) },
              { id: 'acct', header: 'Account Code', accessor: 'acctCode', className: 'font-mono' },
              {
                id: 'dc',
                header: 'Leg',
                cell: (r) => (
                  <span className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded ${r.jDOrC === 'D' ? 'bg-blue-500/10 text-blue-600' : 'bg-emerald-500/10 text-emerald-600'}`}>
                    {r.jDOrC === 'D' ? 'Debit' : 'Credit'}
                  </span>
                ),
              },
              { id: 'amt', header: 'Amount', cell: (r) => money(r.jCkAmt), className: 'text-right font-mono' },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  )
}

// =========================================================================
// 6. CASH DISBURSEMENT VOUCHERS (CDB)
// =========================================================================
export function VoucherPage() {
  const qc = useQueryClient()
  const [type, setType] = useState('current')
  const [master, setMaster] = useState<Partial<FsVoucherMaster>>({
    jDate: today(),
    jCkAmt: 0,
    jJvNo: `CDV-${Date.now().toString().slice(-6)}`,
    jCkNo: `CHK-${Date.now().toString().slice(-6)}`,
  })
  const [lines, setLines] = useState<Array<Partial<FsVoucherLine>>>([
    { acctCode: '4510', jDOrC: 'D', jCkAmt: 0 },
    { acctCode: '1110', jDOrC: 'C', jCkAmt: 0 },
  ])

  const masters = useQuery({ queryKey: ['fs-vouchers', type], queryFn: () => ledgerApi.voucherMasters(type) })
  const accts = useQuery({ queryKey: ['fs-accounts'], queryFn: () => ledgerApi.accounts() })
  const banks = useQuery({ queryKey: ['fs-banks'], queryFn: () => ledgerApi.banks() })
  const sups = useQuery({ queryKey: ['fs-suppliers'], queryFn: () => ledgerApi.suppliers() })
  const unbal = useQuery({ queryKey: ['fs-unbalanced-vouchers'], queryFn: () => ledgerApi.unbalancedVouchers() })

  const dr = lines.filter((l) => l.jDOrC === 'D').reduce((s, l) => s + Number(l.jCkAmt || 0), 0)
  const cr = lines.filter((l) => l.jDOrC === 'C').reduce((s, l) => s + Number(l.jCkAmt || 0), 0)
  const balanced = Math.abs(dr - cr) < 0.01 && dr > 0

  const saveMutation = useMutation({
    mutationFn: async () => {
      const computedAmt = dr > 0 ? dr : master.jCkAmt || 0
      const m = await ledgerApi.createVoucherMaster({ ...master, jCkAmt: computedAmt })
      for (const l of lines.filter((x) => x.acctCode && Number(x.jCkAmt))) {
        await ledgerApi.createVoucherLine({ ...l, jCkNo: m.data.jCkNo })
      }
      return m
    },
    onSuccess: () => {
      toast.success('Check voucher and allocation lines saved!')
      qc.invalidateQueries({ queryKey: ['fs-vouchers'] })
      qc.invalidateQueries({ queryKey: ['fs-system-info'] })
    },
    onError: (e) => toast.error(errorText(e)),
  })

  const printVoucher = () => {
    const words = numberToWordsPesos(Number(master.jCkAmt || dr))
    const bank = unwrap(banks.data).find((b: FsBank) => b.bankNo === master.bankNo)
    const sup = unwrap(sups.data).find((s: FsSupplier) => s.supNo === master.supNo)

    const html = `
      <div style="border:1px solid #cbd5e1;padding:16px;border-radius:8px;margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:12px">
          <div>
            <p><strong>CHECK NO:</strong> ${master.jCkNo || '—'}</p>
            <p><strong>JV NO:</strong> ${master.jJvNo || '—'}</p>
            <p><strong>DATE:</strong> ${formatDate(master.jDate)}</p>
          </div>
          <div style="text-align:right">
            <p><strong>PAYEE:</strong> ${master.jPayTo || sup?.supName || '—'}</p>
            <p><strong>BANK:</strong> ${bank?.bankName || 'BDO'} (${bank?.bankAcct || '—'})</p>
            <p style="font-size:16px;font-weight:bold;color:#07558f">PHP ${formatMoney(master.jCkAmt || dr)}</p>
          </div>
        </div>
        <p style="margin-top:10px;font-size:11px;font-style:italic"><strong>AMOUNT IN WORDS:</strong> ${words}</p>
        <p style="font-size:12px;margin-top:6px"><strong>PARTICULARS:</strong> ${master.jDesc || 'Freight and operational disbursement'}</p>
      </div>

      <table>
        <thead><tr><th>Account Code</th><th>Debit / Credit</th><th class="num">Amount (PHP)</th></tr></thead>
        <tbody>
          ${lines.map((l) => `<tr><td>${l.acctCode || ''}</td><td>${l.jDOrC === 'D' ? 'DEBIT' : 'CREDIT'}</td><td class="num">${formatMoney(l.jCkAmt)}</td></tr>`).join('')}
        </tbody>
        <tfoot>
          <tr style="font-weight:bold;background:#f8fafc">
            <td colspan="2">TOTAL</td>
            <td class="num">${formatMoney(dr)}</td>
          </tr>
        </tfoot>
      </table>

      <div class="sig-block">
        <div class="sig-line">Prepared By</div>
        <div class="sig-line">Checked By</div>
        <div class="sig-line">Approved for Payment</div>
        <div class="sig-line">Received By (Signature)</div>
      </div>
    `
    printHtml(`Check Voucher ${master.jCkNo || ''}`, html)
  }

  return (
    <div className="space-y-5 p-4 md:p-6 min-w-0 w-full">
      <PageHeader
        eyebrow="Cash Disbursements"
        title="Check Vouchers (CDB)"
        description="Issue, manage, and print cash disbursement vouchers with vendor linkage, check numbers, and GL account splits."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={printVoucher}>
              <Printer className="size-4" />
              Print Voucher
            </Button>
            <Select
              value={type}
              onValueChange={setType}
              options={[
                { value: 'current', label: 'Current Period Checks' },
                { value: 'advance', label: 'Advance / Post-Dated' },
                { value: 'all', label: 'All Checks' },
              ]}
            />
          </div>
        }
        primaryAction={
          <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>
            Save Voucher
          </Button>
        }
      />

      {/* Unbalanced Vouchers Banner */}
      {unwrap(unbal.data).length > 0 && (
        <Card className="border-destructive/40 bg-destructive/10 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="size-5 text-destructive" />
              <div>
                <p className="font-semibold text-sm text-destructive">Unbalanced Vouchers Detected</p>
                <p className="text-xs text-muted-foreground">
                  {unwrap(unbal.data).length} vouchers have debit-credit discrepancies in fs_checkvou.
                </p>
              </div>
            </div>
            <span className="font-mono text-xs font-bold text-destructive">Action Required</span>
          </div>
        </Card>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        {/* Editor Form */}
        <Card className="shadow-xs overflow-hidden">
          <CardHeader className="border-b bg-card/60 px-5 py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Voucher Master Details</CardTitle>
              <div className={`font-mono text-xs font-semibold px-2.5 py-1 rounded border ${balanced ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-destructive/10 text-destructive border-destructive/30'}`}>
                Dr: {formatMoney(dr)} | Cr: {formatMoney(cr)}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Check #" required>
                <Input value={master.jCkNo ?? ''} onChange={(e) => setMaster({ ...master, jCkNo: e.target.value })} />
              </FormField>
              <FormField label="Voucher / JV #">
                <Input value={master.jJvNo ?? ''} onChange={(e) => setMaster({ ...master, jJvNo: e.target.value })} />
              </FormField>
              <FormField label="Disbursement Date" required>
                <DateInput value={master.jDate} onValueChange={(v) => setMaster({ ...master, jDate: v })} />
              </FormField>
              <FormField label="Bank Account">
                <Select
                  value={String(master.bankNo ?? '')}
                  onValueChange={(v) => setMaster({ ...master, bankNo: Number(v) })}
                  options={unwrap(banks.data).map((b: FsBank) => ({ value: String(b.bankNo), label: `${b.bankName} (${b.bankAcct || '—'})` }))}
                />
              </FormField>
              <FormField label="Supplier / Vendor Link">
                <Select
                  value={String(master.supNo ?? '')}
                  onValueChange={(v) => setMaster({ ...master, supNo: Number(v) })}
                  options={unwrap(sups.data).map((s: FsSupplier) => ({ value: String(s.supNo), label: s.supName }))}
                />
              </FormField>
              <FormField label="Payee Name" required>
                <Input value={master.jPayTo ?? ''} onChange={(e) => setMaster({ ...master, jPayTo: e.target.value })} placeholder="Pay to the order of..." />
              </FormField>
            </div>

            <FormField label="Memo / Particulars">
              <Textarea value={master.jDesc ?? ''} onChange={(e) => setMaster({ ...master, jDesc: e.target.value })} rows={2} />
            </FormField>

            <div className="rounded-lg bg-muted/40 p-3 border">
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">Amount in Words Preview</p>
              <p className="font-mono text-xs font-bold text-secondary mt-1">{numberToWordsPesos(Number(master.jCkAmt || dr))}</p>
            </div>

            {/* Lines Grid */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground">Allocation Split Lines</h4>
                <Button size="sm" variant="outline" onClick={() => setLines([...lines, { jDOrC: 'D', jCkAmt: 0 }])}>
                  <Plus className="size-3" /> Add Split Line
                </Button>
              </div>

              <div className="divide-y rounded-lg border">
                {lines.map((l, i) => (
                  <div key={i} className="flex items-center gap-2 p-2.5">
                    <div className="flex-1">
                      <Combobox
                        items={accountsForCombo(unwrap(accts.data))}
                        value={l.acctCode}
                        onSelect={(a) => setLines(lines.map((x, n) => (n === i ? { ...x, acctCode: a.id } : x)))}
                      />
                    </div>
                    <div className="w-24">
                      <Select
                        value={l.jDOrC ?? 'D'}
                        onValueChange={(v) => setLines(lines.map((x, n) => (n === i ? { ...x, jDOrC: v as 'D' | 'C' } : x)))}
                        options={[
                          { value: 'D', label: 'Debit' },
                          { value: 'C', label: 'Credit' },
                        ]}
                      />
                    </div>
                    <div className="w-36">
                      <MoneyInput value={l.jCkAmt ?? 0} onValueChange={(v) => setLines(lines.map((x, n) => (n === i ? { ...x, jCkAmt: v } : x)))} />
                    </div>
                    <IconButton
                      label="Delete"
                      icon={<Trash2 className="size-4 text-destructive" />}
                      variant="ghost"
                      onClick={() => lines.length > 1 && setLines(lines.filter((_, n) => n !== i))}
                    />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Existing Vouchers List */}
        <Card className="shadow-xs overflow-hidden">
          <CardHeader className="border-b bg-card/60 px-5 py-4">
            <CardTitle className="text-base">Vouchers Master Directory</CardTitle>
            <CardDescription>{unwrap(masters.data).length} vouchers registered</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataGrid
              data={unwrap(masters.data)}
              loading={masters.isLoading}
              density="compact"
              emptyTitle="No check vouchers recorded"
              onRowSelect={(selection) => {
                if (selection[0]) {
                  setMaster(selection[0])
                }
              }}
              columns={[
                { id: 'check', header: 'Check #', accessor: 'jCkNo', className: 'font-mono font-semibold' },
                { id: 'jv', header: 'JV #', accessor: 'jJvNo', className: 'font-mono' },
                { id: 'date', header: 'Date', cell: (r) => formatDate(r.jDate) },
                { id: 'pay', header: 'Payee', accessor: 'jPayTo' },
                { id: 'amt', header: 'Amount', cell: (r) => money(r.jCkAmt), className: 'text-right font-mono font-bold' },
              ]}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// =========================================================================
// 7. CHART OF ACCOUNTS
// =========================================================================
export function ChartOfAccountsPage() {
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [form, setForm] = useState<Partial<FsAccount>>({ formula: 'DC', isActive: true })

  const accountsQuery = useQuery({ queryKey: ['fs-accounts'], queryFn: () => ledgerApi.accounts() })

  const save = useMutation({
    mutationFn: () => (form.acctCode ? ledgerApi.updateAccount(form.acctCode, form) : ledgerApi.createAccount(form)),
    onSuccess: () => {
      toast.success('Account saved successfully!')
      qc.invalidateQueries({ queryKey: ['fs-accounts'] })
      setForm({ formula: 'DC', isActive: true })
    },
    onError: (e) => toast.error(errorText(e)),
  })

  const rows = unwrap(accountsQuery.data)
  const filtered = rows.filter((a) => !q.trim() || a.acctCode.toLowerCase().includes(q.toLowerCase()) || a.acctDesc.toLowerCase().includes(q.toLowerCase()))

  const groups = useMemo(
    () =>
      filtered.reduce<Record<string, FsAccount[]>>((m, a) => {
        const key = a.glReport || a.groupCode || 'OTHER'
        ;(m[key] ||= []).push(a)
        return m
      }, {}),
    [filtered],
  )

  return (
    <div className="space-y-5 p-4 md:p-6 min-w-0 w-full">
      <PageHeader
        eyebrow="FS Ledger"
        title="Chart of Accounts"
        description="Philippine standard logistics chart of accounts with normal balance rules (Debit/Credit), financial statement report routing, and balances."
        actions={
          <Button variant="outline" size="sm" onClick={() => exportRowsToExcel(rows as unknown as Record<string, unknown>[], 'kornet-chart-of-accounts.xlsx')}>
            <FileDown className="size-4" />
            Export Excel
          </Button>
        }
        primaryAction={
          <Button onClick={() => save.mutate()} loading={save.isPending}>
            Save Account
          </Button>
        }
      />

      <Toolbar>
        <Input
          leftIcon={<Search className="size-4" />}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search account code or description..."
          className="w-80"
        />
      </Toolbar>

      <div className="grid gap-5 xl:grid-cols-[24rem_1fr]">
        {/* Account Maintenance Card */}
        <Card className="shadow-xs h-fit">
          <CardHeader className="border-b bg-card/60 px-5 py-4">
            <CardTitle className="text-base">{form.acctCode ? `Edit ${form.acctCode}` : 'New GL Account'}</CardTitle>
            <CardDescription>Configure account properties and report mappings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            <FormField label="Account Code" required>
              <Input
                value={form.acctCode ?? ''}
                onChange={(e) => setForm({ ...form, acctCode: e.target.value.toUpperCase() })}
                placeholder="e.g. 1123"
              />
            </FormField>
            <FormField label="Account Description" required>
              <Input
                value={form.acctDesc ?? ''}
                onChange={(e) => setForm({ ...form, acctDesc: e.target.value })}
                placeholder="e.g. Accounts Receivable - Freight"
              />
            </FormField>
            <FormField label="Report Group">
              <Input
                value={form.glReport ?? ''}
                onChange={(e) => setForm({ ...form, glReport: e.target.value.toUpperCase() })}
                placeholder="BA (Assets), BL (Liab), IS (Income)"
              />
            </FormField>
            <FormField label="Normal Balance / Type">
              <Select
                value={String(form.formula ?? 'DC')}
                onValueChange={(v) => setForm({ ...form, formula: v })}
                options={[
                  { value: 'DC', label: 'Debit Normal (Postable)' },
                  { value: 'CD', label: 'Credit Normal (Postable)' },
                  { value: 'H', label: 'Header (Non-Postable Summary)' },
                ]}
              />
            </FormField>
            <FormField label="Opening Balance (PHP)">
              <MoneyInput value={form.openBal ?? 0} onValueChange={(v) => setForm({ ...form, openBal: v })} />
            </FormField>
          </CardContent>
        </Card>

        {/* Grouped Account Tables */}
        <div className="space-y-4 min-w-0">
          {Object.entries(groups).map(([groupKey, list]) => (
            <Card key={groupKey} className="shadow-xs overflow-hidden">
              <CardHeader className="border-b bg-card/40 px-5 py-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">Group {groupKey}</span>
                  <span className="text-xs text-muted-foreground font-mono">{list.length} accounts</span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <DataGrid
                  data={list}
                  density="compact"
                  onRowSelect={(r) => r[0] && setForm(r[0])}
                  columns={[
                    { id: 'code', header: 'Code', accessor: 'acctCode', className: 'font-mono font-bold text-secondary' },
                    { id: 'desc', header: 'Description', accessor: 'acctDesc' },
                    {
                      id: 'type',
                      header: 'Type',
                      cell: (r) => (['DC', 'CD'].includes(String(r.formula)) ? <StatusPill status="Postable" tone="success" /> : <StatusPill status="Header" />),
                    },
                    { id: 'debit', header: 'Debit Movement', cell: (r) => money(r.curDebit ?? r.debitMovement), className: 'text-right font-mono' },
                    { id: 'credit', header: 'Credit Movement', cell: (r) => money(r.curCredit ?? r.creditMovement), className: 'text-right font-mono' },
                    { id: 'end', header: 'Ending Balance', cell: (r) => money(r.endBal ?? r.endingBalance), className: 'text-right font-mono font-bold' },
                  ]}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

// =========================================================================
// 8. DIRECTORIES (BANKS, SUPPLIERS, SIGNATORIES)
// =========================================================================
export function DirectoryPage({ kind }: { kind: 'banks' | 'suppliers' | 'signatories' }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<Partial<FsSignatory>>({ isActive: true })

  const q = useQuery<{ data: unknown[] }>({
    queryKey: ['fs-dir', kind],
    queryFn: async () => (kind === 'banks' ? ledgerApi.banks() : kind === 'suppliers' ? ledgerApi.suppliers() : ledgerApi.signatories()),
  })

  const save = useMutation({
    mutationFn: () => ledgerApi.createSignatory(form),
    onSuccess: () => {
      toast.success('Signatory added successfully!')
      qc.invalidateQueries({ queryKey: ['fs-dir', kind] })
      setForm({ isActive: true, signName: '', signTitle: '' })
    },
    onError: (e) => toast.error(errorText(e)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => ledgerApi.deleteSignatory(id),
    onSuccess: () => {
      toast.success('Signatory removed.')
      qc.invalidateQueries({ queryKey: ['fs-dir', kind] })
    },
    onError: (e) => toast.error(errorText(e)),
  })

  const rows = unwrap(q.data).map((r, i) => ({ id: (r as { id?: string | number }).id ?? i, ...(r as Record<string, unknown>) }))

  return (
    <div className="space-y-5 p-4 md:p-6 min-w-0 w-full">
      <PageHeader
        eyebrow="FS Setup"
        title={kind === 'banks' ? 'Bank Accounts Directory' : kind === 'suppliers' ? 'Suppliers & Vendors Directory' : 'Disbursement Signatories'}
        description={
          kind === 'signatories'
            ? 'Authorized signatories printed on cash disbursement check vouchers and official financial statements.'
            : 'Corporate master directory synchronizing accounting ledgers with logistics operations.'
        }
        primaryAction={
          kind === 'signatories' ? (
            <Button onClick={() => save.mutate()} loading={save.isPending}>
              Add Signatory
            </Button>
          ) : undefined
        }
      />

      {kind === 'signatories' && (
        <Card className="shadow-xs p-5">
          <h3 className="font-semibold text-sm mb-3">Add Authorized Signatory</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <FormField label="Signatory Name" required>
              <Input
                value={form.signName ?? ''}
                onChange={(e) => setForm({ ...form, signName: e.target.value })}
                placeholder="e.g. Maria Santos"
              />
            </FormField>
            <FormField label="Official Title / Position" required>
              <Input
                value={form.signTitle ?? ''}
                onChange={(e) => setForm({ ...form, signTitle: e.target.value })}
                placeholder="e.g. Finance Director"
              />
            </FormField>
            <FormField label="Active Status">
              <Select
                value={String(form.isActive ?? true)}
                onValueChange={(v) => setForm({ ...form, isActive: v === 'true' })}
                options={[
                  { value: 'true', label: 'Active Signatory' },
                  { value: 'false', label: 'Inactive' },
                ]}
              />
            </FormField>
          </div>
        </Card>
      )}

      <Card className="shadow-xs overflow-hidden">
        <CardContent className="p-0">
          {kind === 'banks' && (
            <DataGrid
              data={rows as unknown as FsBank[]}
              loading={q.isLoading}
              columns={[
                { id: 'bankNo', header: 'Bank #', accessor: 'bankNo', className: 'font-mono font-bold' },
                { id: 'bankName', header: 'Bank Name', accessor: 'bankName', className: 'font-semibold' },
                { id: 'bankAcct', header: 'Account Number', accessor: 'bankAcct', className: 'font-mono' },
                { id: 'bankAddr', header: 'Branch Address', accessor: 'bankAddr' },
              ]}
            />
          )}

          {kind === 'suppliers' && (
            <DataGrid
              data={rows as unknown as FsSupplier[]}
              loading={q.isLoading}
              columns={[
                { id: 'supNo', header: 'Supplier #', accessor: 'supNo', className: 'font-mono font-bold' },
                { id: 'supName', header: 'Supplier / Carrier Name', accessor: 'supName', className: 'font-semibold' },
                { id: 'supPhone', header: 'Contact Phone', accessor: 'supPhone' },
                { id: 'supContak', header: 'Contact Person', accessor: 'supContak' },
                { id: 'supAddr', header: 'Address', accessor: 'supAddr' },
              ]}
            />
          )}

          {kind === 'signatories' && (
            <DataGrid
              data={rows as unknown as FsSignatory[]}
              loading={q.isLoading}
              columns={[
                { id: 'signName', header: 'Full Name', accessor: 'signName', className: 'font-semibold' },
                { id: 'signTitle', header: 'Position / Title', accessor: 'signTitle' },
                {
                  id: 'status',
                  header: 'Status',
                  cell: (r) => <StatusPill status={r.isActive ? 'Active' : 'Inactive'} tone={r.isActive ? 'success' : 'neutral'} />,
                },
                {
                  id: 'actions',
                  header: 'Action',
                  cell: (r) => (
                    <IconButton
                      label="Delete"
                      icon={<Trash2 className="size-4 text-destructive" />}
                      variant="ghost"
                      onClick={() => r.id && deleteMutation.mutate(r.id)}
                    />
                  ),
                },
              ]}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
