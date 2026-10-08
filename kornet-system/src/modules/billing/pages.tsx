import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Columns2, FileDown, Maximize2, Plus, Printer, Send, Table2, Trash2 } from 'lucide-react'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Combobox, DataGrid, DateInput, EmptyState, FormField, FormSection, Input, MoneyInput, PageHeader, Select, StatCard, StatusPill, Toolbar, exportRowsToExcel } from '@/components/ui'
import { KornetLoader } from '@/components/ui/KornetLoader'
import { useHotkeys } from '@/hooks/useHotkeys'
import { formatDate, formatMoney } from '@/lib/format'
import { billingApi, buildApAging, buildArAging, type AgingBucket, type ApBill, type BillingLine, type BridgeItem, type CheckDoc, type Invoice, type Party } from '@/api/billing'
import { ledgerApi, type FsAccount, type FsBank, type FsSignatory } from '@/api/ledger'

type DraftLine = BillingLine & { id?: string; selected?: boolean; apply?: number; ewt?: number; discount?: number; account?: string; memo?: string }
const today = () => new Date().toISOString().slice(0, 10)
const unwrap = <T,>(v?: { data: T[] }) => v?.data ?? []
const money = (v?: number | null) => <span className="font-mono tabular-nums">{formatMoney(v ?? 0)}</span>
const err = (e: unknown) => e instanceof Error ? e.message : 'Request failed. Check required fields and posting guards.'
const postable = (a: FsAccount[]) => a.filter((x) => x.isActive !== false && ['DC', 'CD'].includes(String(x.formula))).map((x) => ({ id: x.acctCode, label: `${x.acctCode} — ${x.acctDesc}`, description: x.glReport }))
const parties = (p: Party[], flag: 'isCustomer' | 'isVendor') => p.filter((x) => x[flag] !== false).map((x) => ({ id: x.id, label: x.name, description: [x.code, x.tin].filter(Boolean).join(' · ') }))

function useLookups() {
  const partyQ = useQuery({ queryKey: ['billing-parties'], queryFn: () => billingApi.parties({ pageSize: 200 }) })
  const bankQ = useQuery({ queryKey: ['fs-banks'], queryFn: () => ledgerApi.banks() })
  const acctQ = useQuery({ queryKey: ['fs-accounts'], queryFn: () => ledgerApi.accounts() })
  const signQ = useQuery({ queryKey: ['fs-signatories'], queryFn: () => ledgerApi.signatories() })
  return { parties: unwrap(partyQ.data), banks: unwrap(bankQ.data), accounts: unwrap(acctQ.data), signs: unwrap(signQ.data) }
}

function printHtml(title: string, html: string) {
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(`<!doctype html><title>${title}</title><style>body{font-family:Arial,sans-serif;margin:24px;color:#111}table{width:100%;border-collapse:collapse;margin-top:16px}td,th{border:1px solid #ccc;padding:8px}.num{text-align:right;font-family:monospace}.muted{color:#666}.sig{display:flex;gap:60px;margin-top:56px}.sig div{min-width:160px;text-align:center;border-top:1px solid #111;padding-top:6px}@media print{button{display:none}}</style><button onclick="print()">Print / save PDF</button>${html}`)
  w.document.close()
}

function words(n: number): string {
  const o = ['','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen']
  const t = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety']
  const c = (x: number): string => x < 20 ? o[x] : x < 100 ? `${t[Math.floor(x / 10)]}${x % 10 ? `-${o[x % 10]}` : ''}` : `${o[Math.floor(x / 100)]} hundred${x % 100 ? ` ${c(x % 100)}` : ''}`
  const w = (x: number): string => x === 0 ? 'zero' : [['billion',1e9],['million',1e6],['thousand',1e3]].reduce((s, [l, z]) => { const q = Math.floor(x / Number(z)); return q ? `${s}${c(q)} ${l} ${w(x % Number(z))}` : s }, '') || c(x)
  return `${w(Math.floor(n)).trim()} pesos and ${Math.round((n % 1) * 100).toString().padStart(2, '0')}/100 centavos`.toUpperCase()
}

function Msg({ text }: { text: string }) {
  if (!text) return null
  return <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-foreground shadow-2xs">{text}</div>
}

function LineGrid({ lines, setLines, editable }: { lines: DraftLine[]; setLines: (v: DraftLine[]) => void; editable: boolean }) {
  const patch = (i: number, p: Partial<DraftLine>) => setLines(lines.map((l, n) => n === i ? { ...l, ...p } : l))
  const remove = (i: number) => setLines(lines.filter((_, n) => n !== i))
  return (
    <div className="w-full min-w-0 overflow-x-auto rounded-xl border bg-card shadow-2xs">
      <table className="w-full text-sm">
        <thead className="bg-muted/70">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-28">Code</th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</th>
            <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground w-20">Qty</th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-28">Unit</th>
            <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground w-32">Rate</th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-36">VAT class</th>
            <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground w-32">Amount</th>
            {editable && <th className="px-2 py-2 w-10"></th>}
          </tr>
        </thead>
        <tbody className="divide-y">
          {lines.map((l, i) => (
            <tr key={i} className="hover:bg-muted/30">
              <td className="p-1.5"><Input disabled={!editable} value={l.billingCode ?? ''} onChange={(e) => patch(i, { billingCode: e.target.value })} placeholder="MISC" /></td>
              <td className="p-1.5"><Input disabled={!editable} value={l.description ?? ''} onChange={(e) => patch(i, { description: e.target.value })} placeholder="Charge description" /></td>
              <td className="p-1.5"><Input disabled={!editable} className="text-right font-mono" value={String(l.qty ?? 1)} onChange={(e) => patch(i, { qty: Number(e.target.value), amount: Number(e.target.value) * Number(l.rate || 0), amountPhp: Number(e.target.value) * Number(l.rate || 0) })} /></td>
              <td className="p-1.5"><Input disabled={!editable} value={l.unit ?? 'PER_SHPT'} onChange={(e) => patch(i, { unit: e.target.value })} /></td>
              <td className="p-1.5"><MoneyInput disabled={!editable} value={l.rate ?? 0} onValueChange={(v) => patch(i, { rate: v, amount: Number(l.qty || 1) * v, amountPhp: Number(l.qty || 1) * v })} /></td>
              <td className="p-1.5"><Select value={l.vatClass ?? 'VATABLE'} onValueChange={(v) => patch(i, { vatClass: v as BillingLine['vatClass'] })} options={['VATABLE','ZERO_RATED','EXEMPT','NON_VAT_REIMBURSABLE'].map((v) => ({ value: v, label: v }))} /></td>
              <td className="p-2 text-right font-mono font-medium">{money(l.amountPhp ?? l.amount)}</td>
              {editable && (
                <td className="p-1.5 text-center">
                  {lines.length > 1 && (
                    <button type="button" onClick={() => remove(i)} className="rounded p-1 text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {editable && (
        <div className="border-t p-2 bg-muted/20">
          <Button variant="outline" size="sm" onClick={() => setLines([...lines, { billingCode: '', description: '', qty: 1, unit: 'PER_SHPT', rate: 0, amount: 0, amountPhp: 0, vatClass: 'VATABLE' }])}>
            <Plus className="size-3.5" /> Add line Alt+↓
          </Button>
        </div>
      )}
    </div>
  )
}

function Totals({ i }: { i: Partial<Invoice> }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {[['VATable', i.vatableSales], ['Zero-rated', i.zeroRatedSales], ['Exempt', i.exemptSales], ['Reimbursable', i.reimbursables], ['VAT 12%', i.vatAmount], ['Total', i.totalAmount], ['Less EWT', i.ewtAmount], ['Net receivable', i.netReceivable ?? i.balance]].map(([l, v]) => (
        <StatCard key={String(l)} label={String(l)} value={money(Number(v || 0))} />
      ))}
    </div>
  )
}

export function InvoicesPage() {
  const qc = useQueryClient()
  const look = useLookups()
  const [layoutView, setLayoutView] = useState<'split' | 'table' | 'editor'>('split')
  const [sel, setSel] = useState<Invoice | null>(null)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState<Record<string, string>>({ kind: 'INVOICE', docClass: 'MISC', date: today(), dueDate: today(), currency: 'PHP' })
  const [lines, setLines] = useState<DraftLine[]>([{ billingCode: '', description: '', qty: 1, unit: 'PER_SHPT', rate: 0, amount: 0, amountPhp: 0, vatClass: 'VATABLE' }])

  const q = useQuery({ queryKey: ['invoices'], queryFn: () => billingApi.invoices({ pageSize: 200, include: 'relations' }) })

  const save = useMutation({
    mutationFn: () => billingApi.createInvoice({
      ...form,
      ewtRate: Number(form.ewtRate || 0),
      exchangeRate: 1,
      lines: {
        create: lines.filter((l) => l.description || l.billingCode).map((l) => ({
          ...l,
          billingCode: l.billingCode || 'MISC',
          description: l.description || l.billingCode || 'Charge',
          qty: Number(l.qty || 1),
          rate: Number(l.rate || 0),
          amount: Number(l.amount || 0),
          amountPhp: Number(l.amountPhp || l.amount || 0),
          vatAmountPhp: Number(l.vatAmountPhp || 0),
        })),
      },
    }),
    onSuccess: (r) => {
      setSel(r)
      setMsg('Invoice draft saved. Server totals are authoritative.')
      return qc.invalidateQueries({ queryKey: ['invoices'] })
    },
    onError: (e) => setMsg(err(e)),
  })

  const act = useMutation({
    mutationFn: async (op: string) => {
      if (!sel) return
      if (op === 'post') return billingApi.postInvoice(sel.id)
      if (op === 'void') return billingApi.voidInvoice(sel.id, prompt('Void reason') || 'Voided from billing UI')
      return billingApi.creditMemo(sel.id, (sel.lines ?? []).map((l) => ({ invoiceLineId: l.id!, amount: Number(l.amountPhp || l.amount || 0) })))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
    onError: (e) => setMsg(err(e)),
  })

  useHotkeys([
    { key: 'N', description: 'New invoice', handler: () => { setSel(null); setLayoutView('editor') } },
    { key: 'Mod+S', description: 'Save draft', handler: () => save.mutate() },
    { key: 'Mod+Enter', description: 'Post invoice', handler: () => sel && act.mutate('post') },
    { key: 'Alt+ArrowDown', description: 'Add line', handler: () => setLines([...lines, { billingCode: '', description: '', qty: 1, unit: 'PER_SHPT', rate: 0, amount: 0, amountPhp: 0, vatClass: 'VATABLE' }]) },
  ])

  const rows = unwrap(q.data)
  const preview = lines.reduce((s, l) => s + Number(l.amountPhp || l.amount || 0), 0)
  const totals = sel ?? { totalAmount: preview, netReceivable: preview, balance: preview, vatAmount: 0 }

  const totalInvoiced = rows.reduce((s, r) => s + Number(r.totalAmount || 0), 0)
  const openBalance = rows.reduce((s, r) => s + Number(r.balance || 0), 0)
  const overdueCount = rows.filter((r) => r.balance > 0 && r.dueDate && new Date(r.dueDate).getTime() < Date.now()).length

  return (
    <div className="space-y-5 p-4 md:p-6 min-w-0 w-full overflow-hidden">
      <PageHeader
        eyebrow="Billing"
        title="Invoices & credit memos"
        description="EOPT compliant sales invoicing, VAT categorization, credit memos, AR posting, and BIR print/PDF."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border bg-card p-1 shadow-2xs">
              <Button variant={layoutView === 'table' ? 'secondary' : 'ghost'} size="sm" className="h-8 px-2.5 text-xs font-semibold" onClick={() => setLayoutView('table')}><Table2 className="size-3.5" /> List</Button>
              <Button variant={layoutView === 'split' ? 'secondary' : 'ghost'} size="sm" className="h-8 px-2.5 text-xs font-semibold" onClick={() => setLayoutView('split')}><Columns2 className="size-3.5" /> Split</Button>
              <Button variant={layoutView === 'editor' ? 'secondary' : 'ghost'} size="sm" className="h-8 px-2.5 text-xs font-semibold" onClick={() => setLayoutView('editor')}><Maximize2 className="size-3.5" /> Focus</Button>
            </div>
            <Button variant="outline" disabled={!sel || sel.status !== 'DRAFT'} onClick={() => act.mutate('post')} kbd="Ctrl+Enter">Post</Button>
            <Button variant="outline" disabled={!sel} onClick={() => sel && printInvoice(sel)}><Printer className="size-4" />Print/PDF</Button>
          </div>
        }
        primaryAction={<Button onClick={() => save.mutate()} loading={save.isPending} kbd="Ctrl+S">Save draft</Button>}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4 shadow-2xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Invoices</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-bold">{rows.length}</span>
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{formatMoney(totalInvoiced)}</span>
          </div>
        </Card>
        <Card className="p-4 shadow-2xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Outstanding AR</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-bold text-amber-600 dark:text-amber-400">{formatMoney(openBalance)}</span>
            <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">Open</span>
          </div>
        </Card>
        <Card className="p-4 shadow-2xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Overdue Invoices</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-bold text-destructive">{overdueCount}</span>
            <span className="rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">Past due</span>
          </div>
        </Card>
        <Card className="p-4 shadow-2xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Selected Amount</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-bold text-primary">{sel ? formatMoney(sel.totalAmount) : '—'}</span>
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{sel?.status ?? 'New'}</span>
          </div>
        </Card>
      </div>

      <Msg text={msg} />

      {q.isLoading ? (
        <div className="flex h-72 items-center justify-center rounded-2xl border bg-card">
          <KornetLoader size="md" label="Loading sales invoices…" />
        </div>
      ) : (
        <div className={`grid gap-4 min-w-0 ${layoutView === 'split' ? 'xl:grid-cols-[minmax(22rem,0.9fr)_1.35fr]' : 'grid-cols-1'}`}>
          {layoutView !== 'editor' && (
            <div className="min-w-0 w-full overflow-hidden">
              <DataGrid
                data={rows}
                loading={false}
                density="compact"
                onRowSelect={(r) => {
                  setSel(r[0] ?? null)
                  if (layoutView === 'table') setLayoutView('split')
                }}
                columns={[
                  { id: 'no', header: 'No', accessor: 'invoiceNo', className: 'font-mono font-semibold' },
                  { id: 'status', header: 'Status', cell: (r) => <StatusPill status={r.status} /> },
                  { id: 'customer', header: 'Customer', accessor: 'billToName' },
                  { id: 'due', header: 'Due', cell: (r) => <span className={r.balance > 0 && r.dueDate && new Date(r.dueDate).getTime() < Date.now() ? 'text-destructive font-semibold' : ''}>{formatDate(r.dueDate)}</span> },
                  { id: 'bal', header: 'Balance', cell: (r) => money(r.balance), className: 'text-right font-mono' },
                ]}
              />
            </div>
          )}

          {layoutView !== 'table' && (
            <Card className="min-w-0 w-full overflow-hidden shadow-sm">
              <CardHeader className="border-b bg-card/60 px-5 py-4">
                <CardTitle className="text-base sm:text-lg">{sel?.invoiceNo ?? 'New manual / misc invoice'}</CardTitle>
                <CardDescription>Seller name/TIN/address prints from company settings. Client previews are not authoritative.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5 p-4 sm:p-6">
                <FormSection title="EOPT header">
                  <FormField label="Kind"><Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })} options={['INVOICE','CREDIT_MEMO','DEBIT_NOTE'].map((v) => ({ value: v, label: v }))} /></FormField>
                  <FormField label="Buyer"><Combobox items={parties(look.parties, 'isCustomer')} value={form.billToName} onSelect={(p) => setForm({ ...form, billToPartyId: p.id, billToName: p.label })} /></FormField>
                  <FormField label="TIN"><Input value={form.billToTin ?? ''} onChange={(e) => setForm({ ...form, billToTin: e.target.value })} /></FormField>
                  <FormField label="Address"><Input value={form.billToAddress ?? ''} onChange={(e) => setForm({ ...form, billToAddress: e.target.value })} /></FormField>
                  <FormField label="Date"><DateInput value={form.date} onValueChange={(v) => setForm({ ...form, date: v, glPeriod: v.slice(0, 7) })} /></FormField>
                  <FormField label="Due date"><DateInput value={form.dueDate} onValueChange={(v) => setForm({ ...form, dueDate: v })} /></FormField>
                  <FormField label="Reference file/BL/AWB"><Input value={form.customerRef ?? ''} onChange={(e) => setForm({ ...form, customerRef: e.target.value })} /></FormField>
                  <FormField label="EWT rate"><Input value={form.ewtRate ?? ''} placeholder="0.02" onChange={(e) => setForm({ ...form, ewtRate: e.target.value })} /></FormField>
                </FormSection>
                <LineGrid lines={sel?.lines?.length ? sel.lines : lines} setLines={setLines} editable={!sel} />
                <Totals i={totals} />
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <Button onClick={() => save.mutate()} loading={save.isPending}>Save draft</Button>
                  <Button variant="outline" disabled={!sel || sel.kind !== 'INVOICE'} onClick={() => act.mutate('cm')}>Create credit memo</Button>
                  <Button variant="destructive" disabled={!sel || sel.status !== 'POSTED'} onClick={() => act.mutate('void')}>Void</Button>
                  <Button variant="outline" disabled title="SMTP integration is not configured"><Send className="size-4" />Send unavailable</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

function printInvoice(i: Invoice) {
  printHtml(`Invoice ${i.invoiceNo}`, `<h1>Sales Invoice ${i.invoiceNo}</h1><p class="muted">Seller name/TIN/address from company settings</p><p><b>Buyer:</b> ${i.billToName ?? ''}<br><b>TIN:</b> ${i.billToTin ?? ''}<br><b>Address:</b> ${i.billToAddress ?? ''}<br><b>Date:</b> ${formatDate(i.date)} · <b>Due:</b> ${formatDate(i.dueDate)}<br><b>Reference:</b> ${i.customerRef ?? ''}</p><table><tr><th>Code</th><th>Description</th><th>VAT class</th><th class="num">Amount</th></tr>${(i.lines ?? []).map((l) => `<tr><td>${l.billingCode}</td><td>${l.description}${l.zeroRatedReason ? `<br><span class="muted">${l.zeroRatedReason}</span>` : ''}</td><td>${l.vatClass}</td><td class="num">${formatMoney(l.amountPhp ?? l.amount ?? 0)}</td></tr>`).join('')}</table><p class="num"><b>VATable:</b> ${formatMoney(i.vatableSales)} · <b>Zero:</b> ${formatMoney(i.zeroRatedSales)} · <b>Exempt:</b> ${formatMoney(i.exemptSales)} · <b>Reimb:</b> ${formatMoney(i.reimbursables)}<br><b>VAT:</b> ${formatMoney(i.vatAmount)} · <b>EWT:</b> ${formatMoney(i.ewtAmount)} · <b>Net receivable:</b> ${formatMoney(i.netReceivable)}</p>`)
}

export function ReceivablesPage() {
  const qc = useQueryClient()
  const look = useLookups()
  const [cust, setCust] = useState<Party>()
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({ date: today(), method: 'CASH', bankNo: '', amount: 0, ewtAmount: 0 })
  const [apps, setApps] = useState<DraftLine[]>([])

  const inv = useQuery({ queryKey: ['ar-open'], queryFn: () => billingApi.invoices({ pageSize: 200, include: 'relations' }) })
  const rec = useQuery({ queryKey: ['receipts'], queryFn: () => billingApi.receipts({ pageSize: 200, include: 'relations' }) })

  const open = unwrap(inv.data).filter((i) => i.balance > 0 && (!cust || i.billToPartyId === cust.id || i.billToName === cust.name))
  const applied = apps.reduce((s, a) => s + Number(a.apply || 0) + Number(a.ewt || 0), 0)

  const save = useMutation({
    mutationFn: () => billingApi.createReceipt({
      partyId: cust?.id,
      partyName: cust?.name,
      ...form,
      bankNo: Number(form.bankNo || 0),
      unapplied: Math.max(0, Number(form.amount) + Number(form.ewtAmount) - applied),
      applications: {
        create: apps.filter((a) => a.selected && a.id).map((a) => ({
          invoiceId: a.id,
          applied: Number(a.apply || 0),
          ewt: Number(a.ewt || 0),
        })),
      },
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['receipts'] }),
    onError: (e) => setMsg(err(e)),
  })

  const post = useMutation({ mutationFn: (id: string) => billingApi.postReceipt(id), onSuccess: () => qc.invalidateQueries(), onError: (e) => setMsg(err(e)) })
  const aging = useMemo(() => buildArAging(unwrap(inv.data)), [inv.data])

  const totalOpen = open.reduce((s, i) => s + Number(i.balance || 0), 0)
  const receiptsList = unwrap(rec.data)
  const totalCollected = receiptsList.reduce((s, r) => s + Number(r.amount || 0), 0)

  return (
    <div className="space-y-5 p-4 md:p-6 min-w-0 w-full overflow-hidden">
      <PageHeader
        eyebrow="Receivables"
        title="Collections, AR aging & SOA"
        description="OR/CR receipting, bank deposits, CWT/EWT 2307, open invoice applications, unapplied customer deposits, and statements."
        primaryAction={<Button onClick={() => save.mutate()} loading={save.isPending}>Save receipt</Button>}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4 shadow-2xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Open Invoices</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-bold">{open.length}</span>
            <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">Receivable</span>
          </div>
        </Card>
        <Card className="p-4 shadow-2xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Open AR</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-bold text-amber-600 dark:text-amber-400">{formatMoney(totalOpen)}</span>
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Balance</span>
          </div>
        </Card>
        <Card className="p-4 shadow-2xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Receipts Staged</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-bold">{receiptsList.length}</span>
            <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">{formatMoney(totalCollected)}</span>
          </div>
        </Card>
        <Card className="p-4 shadow-2xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Unapplied Deposit</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-bold text-primary">{formatMoney(Math.max(0, form.amount + form.ewtAmount - applied))}</span>
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Preview</span>
          </div>
        </Card>
      </div>

      <Msg text={msg} />

      {inv.isLoading || rec.isLoading ? (
        <div className="flex h-72 items-center justify-center rounded-2xl border bg-card">
          <KornetLoader size="md" label="Loading receivables & AR aging…" />
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2 min-w-0">
          <Card className="shadow-sm min-w-0">
            <CardHeader className="border-b bg-card/60 px-5 py-4">
              <CardTitle className="text-base sm:text-lg">Receipt Entry (OR / CR)</CardTitle>
              <CardDescription>Select customer, bank account, payment method and allocate against open invoices</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 p-4 sm:p-6">
              <FormSection title="Header">
                <FormField label="Customer"><Combobox items={parties(look.parties, 'isCustomer')} value={cust?.name} onSelect={(x) => setCust(look.parties.find((p) => p.id === x.id))} /></FormField>
                <FormField label="Date"><DateInput value={form.date} onValueChange={(v) => setForm({ ...form, date: v })} /></FormField>
                <FormField label="Bank"><Select value={form.bankNo} onValueChange={(v) => setForm({ ...form, bankNo: v })} options={look.banks.map((b) => ({ value: String(b.bankNo), label: `${b.bankNo} — ${b.bankName}` }))} /></FormField>
                <FormField label="Method"><Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })} options={['CASH','CHECK','BANK_TRANSFER','ONLINE'].map((v) => ({ value: v, label: v }))} /></FormField>
                <FormField label="Amount"><MoneyInput value={form.amount} onValueChange={(v) => setForm({ ...form, amount: v })} /></FormField>
                <FormField label="CWT/EWT 2307"><MoneyInput value={form.ewtAmount} onValueChange={(v) => setForm({ ...form, ewtAmount: v })} /></FormField>
              </FormSection>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Invoice Applications</h3>
                <Button variant="outline" size="sm" onClick={() => { let left = form.amount + form.ewtAmount; setApps(open.map((i) => { const x = Math.min(left, i.balance); left -= x; return { id: i.id, billingCode: i.invoiceNo, description: i.billToName ?? '', amountPhp: i.balance, selected: x > 0, apply: x, ewt: 0 } })) }}>
                  Auto-apply oldest first
                </Button>
              </div>
              <ApplyGrid docs={open} apps={apps} setApps={setApps} />
              <p className="text-sm text-muted-foreground">Unapplied deposit: <span className="font-mono font-semibold text-foreground">{formatMoney(Math.max(0, form.amount + form.ewtAmount - applied))}</span></p>
            </CardContent>
          </Card>

          <div className="space-y-5 min-w-0">
            <Card className="shadow-sm min-w-0">
              <CardHeader className="border-b bg-card/60 px-5 py-4">
                <CardTitle className="text-base sm:text-lg">Recent Collections</CardTitle>
                <CardDescription>Staged official receipts and credit receipts</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <DataGrid
                  data={receiptsList}
                  loading={false}
                  density="compact"
                  columns={[
                    { id: 'no', header: 'OR/CR', accessor: 'receiptNo', className: 'font-mono font-semibold' },
                    { id: 'cust', header: 'Customer', accessor: 'partyName' },
                    { id: 'status', header: 'Status', cell: (r) => <StatusPill status={r.status} /> },
                    { id: 'amt', header: 'Amount', cell: (r) => money(r.amount), className: 'text-right font-mono' },
                    { id: 'post', header: 'Action', cell: (r) => <Button size="sm" variant="outline" disabled={r.status !== 'DRAFT'} onClick={() => post.mutate(r.id)}>Post</Button> },
                  ]}
                />
              </CardContent>
            </Card>
            <Aging title="AR Aging Breakdown" rows={aging} filename="ar-aging.xlsx" />
          </div>
        </div>
      )}
    </div>
  )
}

function ApplyGrid({ docs, apps, setApps }: { docs: Invoice[]; apps: DraftLine[]; setApps: (v: DraftLine[]) => void }) {
  const row = (id: string) => apps.find((a) => a.id === id)
  const patch = (d: Invoice, p: Partial<DraftLine>) => setApps(row(d.id) ? apps.map((a) => a.id === d.id ? { ...a, ...p } : a) : [...apps, { id: d.id, billingCode: d.invoiceNo, description: d.billToName || d.invoiceNo, amount: d.balance, amountPhp: d.balance, ...p }])
  return (
    <div className="w-full min-w-0 overflow-x-auto rounded-xl border bg-card shadow-2xs">
      <table className="w-full text-sm">
        <thead className="bg-muted/70">
          <tr>
            <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground w-12">Apply</th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Doc</th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-28">Due</th>
            <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground w-28">Balance</th>
            <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground w-32">Applied</th>
            <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground w-28">EWT</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {docs.map((d) => (
            <tr key={d.id} className="hover:bg-muted/30">
              <td className="p-2 text-center">
                <input type="checkbox" className="size-4 rounded accent-primary cursor-pointer" checked={!!row(d.id)?.selected} onChange={(e) => patch(d, { selected: e.target.checked })} />
              </td>
              <td className="p-2 font-mono font-medium">{d.invoiceNo}</td>
              <td className="p-2 text-muted-foreground">{formatDate(d.dueDate)}</td>
              <td className="p-2 text-right font-mono">{money(d.balance)}</td>
              <td className="p-1.5"><MoneyInput value={row(d.id)?.apply ?? 0} onValueChange={(v) => patch(d, { apply: v, selected: v > 0 })} /></td>
              <td className="p-1.5"><MoneyInput value={row(d.id)?.ewt ?? 0} onValueChange={(v) => patch(d, { ewt: v })} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Aging({ title, rows, filename }: { title: string; rows: AgingBucket[]; filename: string }) {
  return (
    <Card className="shadow-sm min-w-0">
      <CardHeader className="flex-row items-center justify-between border-b bg-card/60 px-5 py-4">
        <div>
          <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
          <CardDescription>Current / 1-30 / 31-60 / 61-90 / 90+ aging buckets</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => exportRowsToExcel(rows as unknown as Record<string, unknown>[], filename)}>
          <FileDown className="size-3.5" /> Excel
        </Button>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {rows.length ? rows.map((r) => (
          <details key={r.party} className="rounded-xl border bg-card/50 p-3">
            <summary className={`cursor-pointer font-semibold flex items-center justify-between ${r.d90Plus ? 'text-destructive' : r.d61_90 ? 'text-amber-600 dark:text-amber-400' : ''}`}>
              <span>{r.party}</span>
              <span className="font-mono">{formatMoney(r.total)}</span>
            </summary>
            <div className="mt-3 grid grid-cols-5 gap-2 text-center text-xs">
              <div><span className="block text-muted-foreground mb-1">Current</span><span className="block rounded bg-muted/60 p-1.5 font-mono">{formatMoney(r.current)}</span></div>
              <div><span className="block text-muted-foreground mb-1">1-30d</span><span className="block rounded bg-muted/60 p-1.5 font-mono">{formatMoney(r.d1_30)}</span></div>
              <div><span className="block text-muted-foreground mb-1">31-60d</span><span className="block rounded bg-muted/60 p-1.5 font-mono">{formatMoney(r.d31_60)}</span></div>
              <div><span className="block text-muted-foreground mb-1">61-90d</span><span className="block rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 p-1.5 font-mono">{formatMoney(r.d61_90)}</span></div>
              <div><span className="block text-muted-foreground mb-1">90+d</span><span className="block rounded bg-destructive/10 text-destructive p-1.5 font-mono">{formatMoney(r.d90Plus)}</span></div>
            </div>
            <div className="mt-3 space-y-1 divide-y border-t pt-2">
              {r.docs.map((d) => (
                <div key={d.id} className="flex justify-between text-xs py-1">
                  <span>{d.no} · <span className="text-muted-foreground">{d.days} days</span></span>
                  <span className="font-mono">{money(d.balance)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => printHtml(`Statement ${r.party}`, `<h1>Statement of Account</h1><h2>${r.party}</h2>${r.docs.map((d) => `<p>${d.no} ${formatDate(d.date)} due ${formatDate(d.dueDate)} <b>${formatMoney(d.balance)}</b></p>`).join('')}<h3>Total ${formatMoney(r.total)}</h3>`)}>
                <Printer className="size-3.5" /> Print SOA
              </Button>
            </div>
          </details>
        )) : <EmptyState title="No open balances" />}
      </CardContent>
    </Card>
  )
}

export function PayablesPage() {
  const qc = useQueryClient()
  const look = useLookups()
  const [layoutView, setLayoutView] = useState<'split' | 'table' | 'editor'>('split')
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState<Record<string, string>>({ date: today(), dueDate: today(), currency: 'PHP' })
  const [lines, setLines] = useState<DraftLine[]>([{ billingCode: '', description: '', amount: 0, amountPhp: 0, inputVat: 0 }])

  const q = useQuery({ queryKey: ['ap-bills'], queryFn: () => billingApi.apBills({ pageSize: 200, include: 'relations' }) })

  const save = useMutation({
    mutationFn: () => billingApi.createApBill({
      ...form,
      lines: {
        create: lines.filter((l) => l.description).map((l) => ({
          ...l,
          billingCode: l.billingCode || 'MISC',
          description: l.description || l.billingCode || 'Cost',
          amount: Number(l.amount || 0),
          amountPhp: Number(l.amountPhp || l.amount || 0),
          inputVat: Number(l.inputVat || 0),
        })),
      },
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ap-bills'] }),
    onError: (e) => setMsg(err(e)),
  })

  const post = useMutation({ mutationFn: (id: string) => billingApi.postApBill(id), onSuccess: () => qc.invalidateQueries(), onError: (e) => setMsg(err(e)) })
  const rows = unwrap(q.data)
  const aging = useMemo(() => buildApAging(rows), [rows])

  const totalBills = rows.length
  const totalApBalance = rows.reduce((s, r) => s + Number(r.balance || 0), 0)

  return (
    <div className="space-y-5 p-4 md:p-6 min-w-0 w-full overflow-hidden">
      <PageHeader
        eyebrow="Payables"
        title="AP bills & AP aging"
        description="Vendor cost bills with input VAT deduction, EWT withheld, carrier/agent linkage, and posting."
        actions={
          <div className="flex items-center gap-1 rounded-lg border bg-card p-1 shadow-2xs">
            <Button variant={layoutView === 'table' ? 'secondary' : 'ghost'} size="sm" className="h-8 px-2.5 text-xs font-semibold" onClick={() => setLayoutView('table')}><Table2 className="size-3.5" /> List</Button>
            <Button variant={layoutView === 'split' ? 'secondary' : 'ghost'} size="sm" className="h-8 px-2.5 text-xs font-semibold" onClick={() => setLayoutView('split')}><Columns2 className="size-3.5" /> Split</Button>
            <Button variant={layoutView === 'editor' ? 'secondary' : 'ghost'} size="sm" className="h-8 px-2.5 text-xs font-semibold" onClick={() => setLayoutView('editor')}><Maximize2 className="size-3.5" /> Focus</Button>
          </div>
        }
        primaryAction={<Button onClick={() => save.mutate()} loading={save.isPending}>Save AP bill</Button>}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="p-4 shadow-2xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Vendor Bills</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-bold">{totalBills}</span>
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Recorded</span>
          </div>
        </Card>
        <Card className="p-4 shadow-2xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Open AP Balance</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-bold text-amber-600 dark:text-amber-400">{formatMoney(totalApBalance)}</span>
            <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">Payable</span>
          </div>
        </Card>
        <Card className="p-4 shadow-2xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Draft Unposted</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-bold">{rows.filter((r) => r.status === 'DRAFT').length}</span>
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Pending</span>
          </div>
        </Card>
      </div>

      <Msg text={msg} />

      {q.isLoading ? (
        <div className="flex h-72 items-center justify-center rounded-2xl border bg-card">
          <KornetLoader size="md" label="Loading vendor payables…" />
        </div>
      ) : (
        <div className={`grid gap-5 min-w-0 ${layoutView === 'split' ? 'xl:grid-cols-2' : 'grid-cols-1'}`}>
          {layoutView !== 'editor' && (
            <div className="space-y-5 min-w-0">
              <Card className="shadow-sm min-w-0">
                <CardHeader className="border-b bg-card/60 px-5 py-4">
                  <CardTitle className="text-base sm:text-lg">Vendor AP Bills</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <DataGrid
                    data={rows}
                    loading={false}
                    density="compact"
                    columns={[
                      { id: 'no', header: 'Bill', accessor: 'billNo', className: 'font-mono font-semibold' },
                      { id: 'vendor', header: 'Vendor', accessor: 'vendorName' },
                      { id: 'status', header: 'Status', cell: (r) => <StatusPill status={r.status} /> },
                      { id: 'bal', header: 'Balance', cell: (r) => money(r.balance), className: 'text-right font-mono' },
                      { id: 'post', header: 'Action', cell: (r: ApBill) => <Button size="sm" variant="outline" disabled={r.status !== 'DRAFT'} onClick={() => post.mutate(r.id)}>Post</Button> },
                    ]}
                  />
                </CardContent>
              </Card>
              <Aging title="AP Aging Breakdown" rows={aging} filename="ap-aging.xlsx" />
            </div>
          )}

          {layoutView !== 'table' && (
            <Card className="shadow-sm min-w-0">
              <CardHeader className="border-b bg-card/60 px-5 py-4">
                <CardTitle className="text-base sm:text-lg">New AP Bill</CardTitle>
                <CardDescription>Input vendor costs, line items, and VAT deduction</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5 p-4 sm:p-6">
                <FormSection title="Vendor bill">
                  <FormField label="Vendor"><Combobox items={parties(look.parties, 'isVendor')} value={form.vendorName} onSelect={(p) => setForm({ ...form, vendorPartyId: p.id, vendorName: p.label })} /></FormField>
                  <FormField label="Vendor invoice no"><Input value={form.vendorInvoiceNo ?? ''} onChange={(e) => setForm({ ...form, vendorInvoiceNo: e.target.value })} /></FormField>
                  <FormField label="Date"><DateInput value={form.date} onValueChange={(v) => setForm({ ...form, date: v, glPeriod: v.slice(0, 7) })} /></FormField>
                  <FormField label="Due"><DateInput value={form.dueDate} onValueChange={(v) => setForm({ ...form, dueDate: v })} /></FormField>
                </FormSection>
                <LineGrid lines={lines} setLines={setLines} editable />
                <p className="text-xs text-muted-foreground">Server computes authoritative subtotal, input VAT, EWT, total and balance.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

export function DisbursementsPage() {
  const qc = useQueryClient()
  const look = useLookups()
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState<Record<string, string>>({ date: today(), checkType: 'COMPUTER', currency: 'PHP', amount: '0' })
  const [apps, setApps] = useState<DraftLine[]>([])
  const [expenses, setExpenses] = useState<DraftLine[]>([])

  const bills = useQuery({ queryKey: ['ap-open'], queryFn: () => billingApi.apBills({ pageSize: 200, include: 'relations' }) })
  const checks = useQuery({ queryKey: ['checks'], queryFn: () => billingApi.checks({ pageSize: 200, include: 'relations' }) })

  const save = useMutation({
    mutationFn: () => billingApi.createCheck({
      ...form,
      bankNo: Number(form.bankNo || 0),
      amount: Number(form.amount || 0),
      applications: {
        create: apps.filter((a) => a.selected && a.id).map((a) => ({
          apBillId: a.id,
          applied: Number(a.apply || 0),
          discount: Number(a.discount || 0),
        })),
      },
      directExpenses: {
        create: expenses.filter((e) => e.account && Number(e.amount)).map((e) => ({
          account: e.account,
          amount: Number(e.amount),
          memo: e.memo,
        })),
      },
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['checks'] }),
    onError: (e) => setMsg(err(e)),
  })

  const act = useMutation({
    mutationFn: ({ id, op }: { id: string; op: string }) => op === 'approve' ? billingApi.approveCheck(id) : op === 'print' ? billingApi.printCheck(id) : billingApi.postCheck(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['checks'] }),
    onError: (e) => setMsg(err(e)),
  })

  const checkList = unwrap(checks.data)
  const totalDisbursed = checkList.filter((c) => c.status === 'POSTED').reduce((s, c) => s + Number(c.amount || 0), 0)

  return (
    <div className="space-y-5 p-4 md:p-6 min-w-0 w-full overflow-hidden">
      <PageHeader
        eyebrow="Disbursements"
        title="Checks & check vouchers"
        description="Bank disbursement checks, AP bill applications, direct expense GL entries, approval workflow, and check printing."
        primaryAction={<Button onClick={() => save.mutate()} loading={save.isPending}>Save check</Button>}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4 shadow-2xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Vouchers</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-bold">{checkList.length}</span>
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">All checks</span>
          </div>
        </Card>
        <Card className="p-4 shadow-2xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pending Approval</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-bold text-amber-600 dark:text-amber-400">{checkList.filter((c) => c.status === 'DRAFT').length}</span>
            <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">Draft</span>
          </div>
        </Card>
        <Card className="p-4 shadow-2xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ready to Print</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-bold text-primary">{checkList.filter((c) => c.status === 'APPROVED').length}</span>
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Approved</span>
          </div>
        </Card>
        <Card className="p-4 shadow-2xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Disbursed</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(totalDisbursed)}</span>
            <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">Posted</span>
          </div>
        </Card>
      </div>

      <Msg text={msg} />

      {checks.isLoading ? (
        <div className="flex h-72 items-center justify-center rounded-2xl border bg-card">
          <KornetLoader size="md" label="Loading check vouchers…" />
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2 min-w-0">
          <Card className="shadow-sm min-w-0">
            <CardHeader className="border-b bg-card/60 px-5 py-4">
              <CardTitle className="text-base sm:text-lg">Check Entry & Voucher</CardTitle>
              <CardDescription>Computer checks receive bank-based check numbers on print</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 p-4 sm:p-6">
              <FormSection title="Header">
                <FormField label="Type"><Select value={form.checkType} onValueChange={(v) => setForm({ ...form, checkType: v })} options={['COMPUTER','MANUAL'].map((v) => ({ value: v, label: v }))} /></FormField>
                <FormField label="Bank"><Select value={form.bankNo} onValueChange={(v) => setForm({ ...form, bankNo: v })} options={look.banks.map((b) => ({ value: String(b.bankNo), label: `${b.bankNo} — ${b.bankName}` }))} /></FormField>
                <FormField label="Manual check no"><Input disabled={form.checkType !== 'MANUAL'} value={form.checkNo ?? ''} onChange={(e) => setForm({ ...form, checkNo: e.target.value })} /></FormField>
                <FormField label="Date"><DateInput value={form.date} onValueChange={(v) => setForm({ ...form, date: v, glPeriod: v.slice(0, 7) })} /></FormField>
                <FormField label="Payee"><Combobox items={parties(look.parties, 'isVendor')} value={form.payeeName} onSelect={(p) => setForm({ ...form, payeePartyId: p.id, payeeName: p.label })} /></FormField>
                <FormField label="Amount"><MoneyInput value={form.amount} onValueChange={(v) => setForm({ ...form, amount: String(v) })} /></FormField>
              </FormSection>
              <CheckApps bills={unwrap(bills.data).filter((b) => b.balance > 0)} apps={apps} setApps={setApps} />
              <Expenses accounts={look.accounts} rows={expenses} setRows={setExpenses} />
              <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                <p className="text-xs font-mono font-semibold text-foreground">Amount in words: {words(Number(form.amount || 0))}</p>
                <p className="text-xs text-muted-foreground">Signatories: {look.signs.filter((s) => s.isActive).map((s) => `${s.signName} (${s.signTitle})`).join(', ') || 'Configure in FS Signatories'}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm min-w-0">
            <CardHeader className="border-b bg-card/60 px-5 py-4">
              <CardTitle className="text-base sm:text-lg">Issued Checks & Status</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <DataGrid
                data={checkList}
                loading={false}
                density="compact"
                columns={[
                  { id: 'voucher', header: 'Voucher', accessor: 'voucherNo', className: 'font-mono font-semibold' },
                  { id: 'check', header: 'Check', accessor: 'checkNo', className: 'font-mono' },
                  { id: 'payee', header: 'Payee', accessor: 'payeeName' },
                  { id: 'status', header: 'Status', cell: (r) => <StatusPill status={r.status} /> },
                  { id: 'amt', header: 'Amount', cell: (r) => money(r.amount), className: 'text-right font-mono' },
                  { id: 'actions', header: 'Actions', cell: (r: CheckDoc) => (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" disabled={r.status !== 'DRAFT'} onClick={() => act.mutate({ id: r.id, op: 'approve' })}>Approve</Button>
                      <Button size="sm" variant="outline" disabled={!['DRAFT','APPROVED'].includes(r.status)} onClick={() => { act.mutate({ id: r.id, op: 'print' }); printCheck(r, look.banks, look.signs) }}>Print</Button>
                      <Button size="sm" disabled={!['DRAFT','APPROVED','PRINTED'].includes(r.status)} onClick={() => act.mutate({ id: r.id, op: 'post' })}>Post</Button>
                    </div>
                  )},
                ]}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function CheckApps({ bills, apps, setApps }: { bills: ApBill[]; apps: DraftLine[]; setApps: (v: DraftLine[]) => void }) {
  const row = (id: string) => apps.find((a) => a.id === id)
  const patch = (b: ApBill, p: Partial<DraftLine>) => setApps(row(b.id) ? apps.map((a) => a.id === b.id ? { ...a, ...p } : a) : [...apps, { id: b.id, billingCode: b.billNo, description: b.vendorName || b.billNo, amount: b.balance, amountPhp: b.balance, ...p }])
  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-sm">Payments against AP Bills</h3>
      <div className="w-full min-w-0 overflow-x-auto rounded-xl border bg-card shadow-2xs">
        <table className="w-full text-sm">
          <thead className="bg-muted/70">
            <tr>
              <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground w-12">Pay</th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bill</th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground w-28">Balance</th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground w-32">Payment</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {bills.map((b) => (
              <tr key={b.id} className="hover:bg-muted/30">
                <td className="p-2 text-center">
                  <input type="checkbox" className="size-4 rounded accent-primary cursor-pointer" checked={!!row(b.id)?.selected} onChange={(e) => patch(b, { selected: e.target.checked })} />
                </td>
                <td className="p-2">
                  <span className="font-mono font-semibold">{b.billNo}</span>
                  <span className="block text-xs text-muted-foreground">{b.vendorName}</span>
                </td>
                <td className="p-2 text-right font-mono">{money(b.balance)}</td>
                <td className="p-1.5"><MoneyInput value={row(b.id)?.apply ?? 0} onValueChange={(v) => patch(b, { apply: v, selected: v > 0 })} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Expenses({ accounts, rows, setRows }: { accounts: FsAccount[]; rows: DraftLine[]; setRows: (v: DraftLine[]) => void }) {
  const upd = (i: number, p: Partial<DraftLine>) => setRows(rows.map((r, n) => n === i ? { ...r, ...p } : r))
  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-sm">Direct Expenses</h3>
      {rows.map((r, i) => (
        <div key={i} className="grid gap-2 sm:grid-cols-[1fr_10rem_1fr]">
          <Combobox items={postable(accounts)} value={r.account} onSelect={(a) => upd(i, { account: a.id })} placeholder="Postable GL account" />
          <MoneyInput value={r.amount ?? 0} onValueChange={(v) => upd(i, { amount: v })} />
          <Input placeholder="Memo" value={r.memo ?? ''} onChange={(e) => upd(i, { memo: e.target.value, description: e.target.value || r.description })} />
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => setRows([...rows, { billingCode: 'EXP', description: 'Direct expense', account: '', amount: 0 }])}>
        <Plus className="size-3.5" /> Add expense line
      </Button>
    </div>
  )
}

function printCheck(c: CheckDoc, banks: FsBank[], signs: FsSignatory[]) {
  printHtml(`Check ${c.voucherNo}`, `<h1>Check Voucher / Check</h1><p><b>Voucher:</b> ${c.voucherNo}<br><b>Check:</b> ${c.checkNo ?? '(assigned by server on print)'}<br><b>Bank:</b> ${banks.find((b) => b.bankNo === c.bankNo)?.bankName ?? c.bankNo ?? ''}<br><b>Payee:</b> ${c.payeeName ?? ''}<br><b>Amount:</b> ${formatMoney(c.amount)}<br><b>In words:</b> ${words(c.amount)}</p><div class="sig">${signs.filter((s) => s.isActive).slice(0, 3).map((s) => `<div>${s.signName}<br><span class="muted">${s.signTitle ?? ''}</span></div>`).join('')}</div>`)
}

export function AccountingBridgePage() {
  const qc = useQueryClient()
  const [status, setStatus] = useState('STAGED')
  const [sel, setSel] = useState<BridgeItem[]>([])
  const [msg, setMsg] = useState('')

  const q = useQuery({ queryKey: ['bridge', status], queryFn: () => billingApi.bridge(status === 'ALL' ? undefined : status) })

  const act = useMutation({
    mutationFn: async (op: string) => op === 'trial' ? billingApi.trialBridge(sel.map((x) => x.id)) : op === 'post' ? billingApi.postBridge(sel.map((x) => x.id)) : { data: await Promise.all(sel.map((x) => billingApi.rejectBridge(x.id, prompt('Reject reason') || 'Rejected from bridge UI'))) },
    onSuccess: (r) => {
      setMsg(JSON.stringify(r))
      return qc.invalidateQueries({ queryKey: ['bridge'] })
    },
    onError: (e) => setMsg(err(e)),
  })

  const rows = unwrap(q.data)
  const totalDebit = rows.reduce((s, r) => s + Number(r.totalDebit || 0), 0)
  const totalCredit = rows.reduce((s, r) => s + Number(r.totalCredit || 0), 0)

  return (
    <div className="space-y-5 p-4 md:p-6 min-w-0 w-full overflow-hidden">
      <PageHeader
        eyebrow="Accounting bridge"
        title="Staged logistics-to-FS journals"
        description="Review Dr/Cr double-entry lines, run trial posting verification, post confirmed entries to FS books, or reject with audit trail."
        actions={<Select value={status} onValueChange={setStatus} options={['ALL','STAGED','TRIAL_OK','TRIAL_ERROR','POSTED','REJECTED'].map((v) => ({ value: v, label: v }))} />}
        primaryAction={<Button disabled={!sel.length} onClick={() => act.mutate('trial')}>Trial post ({sel.length})</Button>}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4 shadow-2xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Staged Entries</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-bold">{rows.length}</span>
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{status}</span>
          </div>
        </Card>
        <Card className="p-4 shadow-2xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Selected</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-bold text-primary">{sel.length}</span>
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">For batch action</span>
          </div>
        </Card>
        <Card className="p-4 shadow-2xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Debit</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-bold">{formatMoney(totalDebit)}</span>
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Dr</span>
          </div>
        </Card>
        <Card className="p-4 shadow-2xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Credit</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-bold">{formatMoney(totalCredit)}</span>
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Cr</span>
          </div>
        </Card>
      </div>

      <Toolbar>
        <Button disabled={!sel.length} onClick={() => act.mutate('post')}><CheckCircle2 className="size-4" /> Final post selected</Button>
        <Button variant="destructive" disabled={!sel.length} onClick={() => act.mutate('reject')}>Reject selected</Button>
        <span className="text-sm text-muted-foreground font-mono">{sel.length} entries selected</span>
      </Toolbar>

      <Msg text={msg} />

      {q.isLoading ? (
        <div className="flex h-72 items-center justify-center rounded-2xl border bg-card">
          <KornetLoader size="md" label="Loading accounting bridge…" />
        </div>
      ) : (
        <DataGrid
          data={rows}
          loading={false}
          onRowSelect={setSel}
          columns={[
            { id: 'ref', header: 'Ref', accessor: 'refNo', className: 'font-mono font-semibold' },
            { id: 'source', header: 'Source', accessor: 'sourceType' },
            { id: 'journal', header: 'Book', accessor: 'journal' },
            { id: 'party', header: 'Party', accessor: 'party' },
            { id: 'bal', header: 'Balanced', cell: (r) => Math.abs(r.totalDebit - r.totalCredit) < 0.01 ? <StatusPill status="balanced" tone="success" /> : <StatusPill status="unbalanced" tone="danger" /> },
            { id: 'status', header: 'Status', cell: (r) => <StatusPill status={r.status} /> },
            { id: 'dr', header: 'Dr', cell: (r) => money(r.totalDebit), className: 'text-right font-mono' },
            { id: 'cr', header: 'Cr', cell: (r) => money(r.totalCredit), className: 'text-right font-mono' },
            { id: 'jv', header: 'JV no', accessor: 'fsJvNo', className: 'font-mono' },
            { id: 'lines', header: 'Lines', cell: (r) => (
              <details className="cursor-pointer">
                <summary className="text-xs font-medium text-secondary">{safeLines(r.linesJson).length} lines</summary>
                <div className="mt-1 space-y-0.5 rounded border bg-muted/40 p-1.5">
                  {safeLines(r.linesJson).map((l, i) => (
                    <p key={i} className="font-mono text-xs">{l.dc} {l.acctCode} {formatMoney(l.amount)} {l.memo}</p>
                  ))}
                </div>
              </details>
            )},
          ]}
        />
      )}
    </div>
  )
}

function safeLines(json: string): Array<{ acctCode: string; dc: string; amount: number; memo?: string }> {
  try { return JSON.parse(json || '[]') } catch { return [] }
}
