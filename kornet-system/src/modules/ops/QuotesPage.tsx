import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Columns2, FilePlus2, Maximize2, Printer, Send, Table2, ThumbsDown, ThumbsUp } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, DataGrid, DateInput, EditableGrid, EmptyState, FormField, FormSection, Input, MoneyInput, NumberInput, PageHeader, Select, StatusPill, Textarea, Toolbar } from '@/components/ui'
import { KornetLoader } from '@/components/ui/KornetLoader'
import { opsApi, type CargoLine, type ChargeLine, type Quote } from '@/api/ops'
import { formatDate, formatMoney, formatNumber } from '@/lib/format'
import { useHotkeys } from '@/hooks/useHotkeys'
import { CHARGE_UNITS, FREIGHT_TERMS, INCOTERMS, QUOTE_STATUSES, VAT_CLASSES, apiErrorMessage, computeChargeLine, financialTotals, newCargoLine, toDateInput } from './utils'
import { LookupField, MarginBadge, MoneyValue, OptionsSelect, SearchBox, useDebouncedValue, useDirtySnapshot } from './components/common'
import { openPrintWindow, quotePrintHtml } from './components/print'

const emptyQuote: Partial<Quote> = { status: 'DRAFT', mode: 'OCEAN', direction: 'EXPORT', freightTerm: 'PREPAID', currency: 'PHP', exchangeRate: 1, incoterm: 'FOB', commodity: '', charges: [], cargoLines: [] }
const filterKey = 'kornet.ops.quoteFilters'

function blankCharge(index: number): ChargeLine {
  return { billingCode: 'MISC', description: '', unit: 'PER_SHPT', qty: 1, rate: 0, currency: 'PHP', exchangeRate: 1, costQty: 1, costRate: 0, costCurrency: 'PHP', costExchangeRate: 1, freightTerm: 'PREPAID', billParty: 'SHIPPER', vatClass: 'VATABLE', billStatus: 'OPEN', costStatus: 'OPEN', sortOrder: index }
}

export function QuotesPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [layoutView, setLayoutView] = useState<'split' | 'table' | 'editor'>('split')
  const [filters, setFilters] = useState(() => {
    try { return JSON.parse(localStorage.getItem(filterKey) || '{}') as Record<string, string> } catch { return {} }
  })
  const [selectedId, setSelectedId] = useState<string>('')
  const [draft, setDraft] = useState<Partial<Quote>>(emptyQuote)
  const [cargo, setCargo] = useState<CargoLine[]>([])
  const [charges, setCharges] = useState<ChargeLine[]>([])
  const debouncedSearch = useDebouncedValue(filters.q || '')
  const { dirty, markClean } = useDirtySnapshot({ draft, cargo, charges })

  useEffect(() => localStorage.setItem(filterKey, JSON.stringify(filters)), [filters])

  const query = useQuery({ queryKey: ['ops', 'quotes', filters, debouncedSearch], queryFn: () => opsApi.listQuotes({ ...filters, q: debouncedSearch }) })
  const selectedQuery = useQuery({ queryKey: ['ops', 'quote', selectedId], queryFn: () => opsApi.getQuote(selectedId), enabled: Boolean(selectedId) })

  useEffect(() => {
    if (!selectedQuery.data) return
    setDraft(selectedQuery.data)
    setCargo(selectedQuery.data.cargoLines?.length ? selectedQuery.data.cargoLines : [newCargoLine(1)])
    setCharges(selectedQuery.data.charges?.length ? selectedQuery.data.charges : [blankCharge(0)])
    markClean({ draft: selectedQuery.data, cargo: selectedQuery.data.cargoLines ?? [], charges: selectedQuery.data.charges ?? [] })
  }, [markClean, selectedQuery.data])

  const totals = useMemo(() => financialTotals(charges.map((line) => computeChargeLine(line, { declaredValue: draft.declaredValue }, cargo, [], draft.mode === 'AIR'))), [cargo, charges, draft.declaredValue, draft.mode])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = { ...draft, charges: undefined, cargoLines: undefined }
      const quote = draft.id ? await opsApi.updateQuote(draft.id, body) : await opsApi.createQuote(body)
      for (const [index, line] of cargo.entries()) {
        const computed = { ...line, quoteId: quote.id, lineNo: index + 1 }
        if (line.id) await opsApi.updateCargoLine(line.id, computed)
        else if (line.description || line.pieces || line.grossKg) await opsApi.createCargoLine(computed)
      }
      for (const [index, line] of charges.entries()) {
        const computed = computeChargeLine({ ...line, quoteId: quote.id, sortOrder: index }, { declaredValue: draft.declaredValue }, cargo, [], draft.mode === 'AIR')
        if (line.id) await opsApi.updateCharge(line.id, computed)
        else if (line.billingCode || line.description) await opsApi.createCharge(computed)
      }
      return opsApi.getQuote(quote.id)
    },
    onSuccess: (quote) => {
      toast.success('Quote saved')
      setSelectedId(quote.id)
      setDraft(quote)
      setCargo(quote.cargoLines?.length ? quote.cargoLines : [newCargoLine(1)])
      setCharges(quote.charges?.length ? quote.charges : [blankCharge(0)])
      markClean({ draft: quote, cargo: quote.cargoLines ?? [], charges: quote.charges ?? [] })
      queryClient.invalidateQueries({ queryKey: ['ops', 'quotes'] })
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  })

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      if (!draft.id) throw new Error('Save the quote before changing status.')
      return opsApi.updateQuote(draft.id, { status, version: draft.version })
    },
    onSuccess: (quote) => { toast.success(`Quote ${quote.status.toLowerCase()}`); setDraft(quote); queryClient.invalidateQueries({ queryKey: ['ops', 'quotes'] }) },
    onError: (error) => toast.error(apiErrorMessage(error)),
  })

  const convertMutation = useMutation({
    mutationFn: async () => {
      if (!draft.id) throw new Error('Save the quote before conversion.')
      return opsApi.convertQuote(draft.id)
    },
    onSuccess: (shipment) => { toast.success(`Created file ${shipment.fileNo}`); navigate(`/logistics/files/${shipment.id}`) },
    onError: (error) => toast.error(apiErrorMessage(error)),
  })

  useHotkeys([
    { key: 'Mod+S', description: 'Save quote', handler: () => saveMutation.mutate() },
    { key: 'N', description: 'New quote', handler: () => { setSelectedId(''); setDraft(emptyQuote); setCargo([newCargoLine(1)]); setCharges([blankCharge(0)]); setLayoutView('editor') } },
    { key: '/', description: 'Focus quote search', handler: () => document.getElementById('quote-search')?.focus() },
  ])

  const rows = query.data?.data ?? []
  const computedCharges = charges.map((line) => computeChargeLine(line, { declaredValue: draft.declaredValue }, cargo, [], draft.mode === 'AIR'))

  const draftCount = rows.filter((r) => ['DRAFT', 'SENT'].includes(r.status)).length
  const acceptedCount = rows.filter((r) => r.status === 'ACCEPTED').length

  return (
    <div className="space-y-5 p-4 md:p-6 min-w-0 w-full overflow-hidden">
      <PageHeader
        title="Quotes"
        eyebrow="Operations"
        description="Estimate lanes, cargo, billing and vendor costs before converting accepted quotes to live files."
        actions={
          <div className="flex items-center gap-1.5 rounded-lg border bg-card p-1 shadow-2xs">
            <Button
              variant={layoutView === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 px-2.5 text-xs font-semibold"
              onClick={() => setLayoutView('table')}
              title="Full Table View"
            >
              <Table2 className="size-3.5" />
              List
            </Button>
            <Button
              variant={layoutView === 'split' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 px-2.5 text-xs font-semibold"
              onClick={() => setLayoutView('split')}
              title="Master-Detail Split View"
            >
              <Columns2 className="size-3.5" />
              Split
            </Button>
            <Button
              variant={layoutView === 'editor' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 px-2.5 text-xs font-semibold"
              onClick={() => setLayoutView('editor')}
              title="Focused Editor View"
            >
              <Maximize2 className="size-3.5" />
              Focus
            </Button>
          </div>
        }
        primaryAction={
          <Button onClick={() => { setSelectedId(''); setDraft(emptyQuote); setCargo([newCargoLine(1)]); setCharges([blankCharge(0)]); setLayoutView('editor') }}>
            <FilePlus2 className="size-4" />
            New quote
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4 shadow-2xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Quotes</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-bold">{rows.length}</span>
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Active</span>
          </div>
        </Card>
        <Card className="p-4 shadow-2xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Open / In Review</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-bold text-amber-600 dark:text-amber-400">{draftCount}</span>
            <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">Pending</span>
          </div>
        </Card>
        <Card className="p-4 shadow-2xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Accepted / Won</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400">{acceptedCount}</span>
            <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">Ready to convert</span>
          </div>
        </Card>
        <Card className="p-4 shadow-2xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Est. Pipeline Margin</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-bold text-primary">{totals.profit ? formatMoney(totals.profit) : '—'}</span>
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Live</span>
          </div>
        </Card>
      </div>

      <Toolbar>
        <div id="quote-search" className="flex-1 min-w-[14rem]">
          <SearchBox value={filters.q || ''} onChange={(v) => setFilters((f) => ({ ...f, q: v }))} placeholder="Search quote, lane, commodity…" />
        </div>
        <Select value={filters.status || undefined} onValueChange={(v) => setFilters((f) => ({ ...f, status: v }))} options={QUOTE_STATUSES.map((s) => ({ value: s, label: s }))} placeholder="Status" />
        <Select value={filters.mode || undefined} onValueChange={(v) => setFilters((f) => ({ ...f, mode: v }))} options={['OCEAN', 'AIR', 'DOMESTIC'].map((s) => ({ value: s, label: s }))} placeholder="Mode" />
        <Input type="date" value={filters.dateFrom || ''} onChange={(event) => setFilters((f) => ({ ...f, dateFrom: event.target.value, dateField: 'date' }))} className="w-36" />
        <Input type="date" value={filters.dateTo || ''} onChange={(event) => setFilters((f) => ({ ...f, dateTo: event.target.value, dateField: 'date' }))} className="w-36" />
        <Button variant="outline" onClick={() => setFilters({})}>Clear</Button>
      </Toolbar>

      {query.isLoading ? (
        <div className="flex h-72 items-center justify-center rounded-2xl border bg-card">
          <KornetLoader size="md" label="Loading quotes pipeline…" />
        </div>
      ) : (
        <div className={`grid gap-4 min-w-0 ${layoutView === 'split' ? 'xl:grid-cols-[minmax(22rem,0.95fr)_1.35fr]' : 'grid-cols-1'}`}>
          {/* Quote List Table */}
          {layoutView !== 'editor' && (
            <div className="min-w-0 w-full overflow-hidden">
              <DataGrid
                data={rows}
                loading={false}
                density="compact"
                emptyTitle="No quotes match your filters"
                onRowSelect={(selection) => {
                  if (selection[0]?.id) {
                    setSelectedId(String(selection[0].id))
                    if (layoutView === 'table') setLayoutView('split')
                  }
                }}
                columns={[
                  { id: 'quoteNo', header: 'Quote #', accessor: 'quoteNo', sortable: true, className: 'font-mono font-semibold' },
                  { id: 'status', header: 'Status', cell: (row) => <StatusPill status={row.status} /> },
                  { id: 'lane', header: 'Lane', cell: (row) => <span className="truncate">{row.pol || '—'} → {row.pod || '—'}</span> },
                  { id: 'mode', header: 'Mode', cell: (row) => <span>{row.mode} {row.direction}</span> },
                  { id: 'valid', header: 'Valid', cell: (row) => formatDate(row.validUntil) },
                ]}
              />
            </div>
          )}

          {/* Quote Editor */}
          {layoutView !== 'table' && (
            <Card className="min-w-0 w-full overflow-hidden shadow-sm">
              <CardHeader className="border-b bg-card/60 px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base sm:text-lg">
                      {draft.id ? `Quote ${draft.quoteNo}` : 'New quote draft'}
                    </CardTitle>
                    <p className="mt-0.5 text-xs text-muted-foreground">Configure customer, lane, validity, cargo lines, and rate breakdown</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {dirty && <StatusPill status="Unsaved" tone="warning" />}
                    <Button variant="outline" size="sm" onClick={() => openPrintWindow(`Quote ${draft.quoteNo || ''}`, quotePrintHtml({ ...(draft as Quote), charges: computedCharges, cargoLines: cargo }))}>
                      <Printer className="size-3.5" />
                      Print
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => statusMutation.mutate('SENT')}>
                      <Send className="size-3.5" />
                      Send
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => statusMutation.mutate('ACCEPTED')}>
                      <ThumbsUp className="size-3.5" />
                      Accept
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => statusMutation.mutate('REJECTED')}>
                      <ThumbsDown className="size-3.5" />
                      Reject
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => convertMutation.mutate()} loading={convertMutation.isPending}>
                      Convert to File
                    </Button>
                    <Button size="sm" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} kbd="Ctrl+S">
                      Save
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 p-4 sm:p-6">
                {!draft.id && rows.length === 0 ? (
                  <EmptyState title="Create your first quote" description="Use New quote, add cargo and charge lines, then save." />
                ) : null}
                <FormSection title="Header" description="Customer, lane, validity and commercial terms.">
                  <FormField label="Status"><OptionsSelect value={draft.status} options={QUOTE_STATUSES} onChange={(status) => setDraft((q) => ({ ...q, status }))} /></FormField>
                  <FormField label="Mode"><OptionsSelect value={draft.mode} options={['OCEAN', 'AIR', 'DOMESTIC']} onChange={(mode) => setDraft((q) => ({ ...q, mode }))} /></FormField>
                  <FormField label="Direction"><OptionsSelect value={draft.direction} options={['EXPORT', 'IMPORT', 'DOMESTIC']} onChange={(direction) => setDraft((q) => ({ ...q, direction }))} /></FormField>
                  <LookupField label="Customer" value={draft.customerPartyId} onChange={(id, item) => setDraft((q) => ({ ...q, customerPartyId: id, contact: String(item?.raw?.contactName ?? q.contact ?? '') }))} loader={opsApi.lookupParties} role="isCustomer" required />
                  <FormField label="Contact"><Input value={draft.contact || ''} onChange={(event) => setDraft((q) => ({ ...q, contact: event.target.value }))} /></FormField>
                  <FormField label="Valid until"><DateInput value={toDateInput(draft.validUntil)} onValueChange={(validUntil) => setDraft((q) => ({ ...q, validUntil }))} /></FormField>
                  <FormField label="POL"><LookupField label="POL" value={draft.pol} onChange={(code) => setDraft((q) => ({ ...q, pol: code }))} loader={(q) => opsApi.lookupPorts(q, draft.mode === 'AIR' ? 'AIR' : 'SEA')} /></FormField>
                  <FormField label="POD"><LookupField label="POD" value={draft.pod} onChange={(code) => setDraft((q) => ({ ...q, pod: code }))} loader={(q) => opsApi.lookupPorts(q, draft.mode === 'AIR' ? 'AIR' : 'SEA')} /></FormField>
                  <FormField label="Place of receipt"><Input value={draft.placeOfReceipt || ''} onChange={(event) => setDraft((q) => ({ ...q, placeOfReceipt: event.target.value }))} /></FormField>
                  <FormField label="Final destination"><Input value={draft.finalDestination || ''} onChange={(event) => setDraft((q) => ({ ...q, finalDestination: event.target.value }))} /></FormField>
                  <FormField label="Incoterm"><OptionsSelect value={draft.incoterm} options={INCOTERMS} onChange={(incoterm) => setDraft((q) => ({ ...q, incoterm }))} /></FormField>
                  <FormField label="Freight term"><OptionsSelect value={draft.freightTerm} options={FREIGHT_TERMS} onChange={(freightTerm) => setDraft((q) => ({ ...q, freightTerm }))} /></FormField>
                  <FormField label="Currency"><Input value={draft.currency || 'PHP'} onChange={(event) => setDraft((q) => ({ ...q, currency: event.target.value.toUpperCase() }))} /></FormField>
                  <FormField label="FX"><NumberInput value={draft.exchangeRate ?? 1} onValueChange={(exchangeRate) => setDraft((q) => ({ ...q, exchangeRate }))} /></FormField>
                  <FormField label="Commodity"><Input value={draft.commodity || ''} onChange={(event) => setDraft((q) => ({ ...q, commodity: event.target.value }))} /></FormField>
                  <FormField label="Notes"><Textarea value={draft.notes || ''} onChange={(event) => setDraft((q) => ({ ...q, notes: event.target.value }))} /></FormField>
                </FormSection>

                <FormSection title="Cargo summary" description="Dimensions preview CBM and chargeable basis before the server recalculates.">
                  <div className="col-span-full">
                    <EditableGrid
                      rows={cargo as unknown as Record<string, unknown>[]}
                      onRowsChange={(rows) => setCargo(rows as unknown as CargoLine[])}
                      createRow={() => newCargoLine(cargo.length + 1) as unknown as Record<string, unknown>}
                      columns={[
                        { id: 'pieces', header: 'PCS', type: 'number' },
                        { id: 'packageType', header: 'Pkg' },
                        { id: 'description', header: 'Description' },
                        { id: 'lengthCm', header: 'L cm', type: 'number' },
                        { id: 'widthCm', header: 'W cm', type: 'number' },
                        { id: 'heightCm', header: 'H cm', type: 'number' },
                        { id: 'grossKg', header: 'Gross kg', type: 'number' },
                      ]}
                    />
                  </div>
                </FormSection>

                <FormSection title="Charges" description="Live billing, cost, profit and margin preview.">
                  <div className="col-span-full space-y-3">
                    <EditableGrid
                      rows={computedCharges as unknown as Record<string, unknown>[]}
                      onRowsChange={(rows) => setCharges(rows as unknown as ChargeLine[])}
                      createRow={() => blankCharge(charges.length) as unknown as Record<string, unknown>}
                      columns={[
                        { id: 'billingCode', header: 'Code' },
                        { id: 'description', header: 'Description' },
                        { id: 'unit', header: 'Basis' },
                        { id: 'qty', header: 'Qty', type: 'number', readOnly: true },
                        { id: 'rate', header: 'Sell', type: 'money' },
                        { id: 'amountPhp', header: 'Bill PHP', type: 'money', readOnly: true },
                        { id: 'costRate', header: 'Cost', type: 'money' },
                        { id: 'costAmountPhp', header: 'Cost PHP', type: 'money', readOnly: true },
                      ]}
                      footer={
                        <div className="flex flex-wrap items-center justify-end gap-4 font-mono text-sm">
                          <span>Bill <MoneyValue value={totals.bill} /></span>
                          <span>Cost <MoneyValue value={totals.cost} /></span>
                          <span>Profit <MoneyValue value={totals.profit} /></span>
                          <MarginBadge bill={totals.bill} cost={totals.cost} />
                        </div>
                      }
                    />
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                      <FormField label="Default basis"><OptionsSelect value={charges[0]?.unit} options={CHARGE_UNITS} onChange={(unit) => setCharges((rows) => rows.map((r, i) => i === 0 ? { ...r, unit } : r))} /></FormField>
                      <FormField label="VAT class"><OptionsSelect value={charges[0]?.vatClass} options={VAT_CLASSES} onChange={(vatClass) => setCharges((rows) => rows.map((r, i) => i === 0 ? { ...r, vatClass } : r))} /></FormField>
                      <FormField label="Declared value"><MoneyInput value={draft.declaredValue ?? 0} onValueChange={(declaredValue) => setDraft((q) => ({ ...q, declaredValue }))} /></FormField>
                      <FormField label="Profit"><Input readOnly className="font-mono bg-muted/40 font-semibold" value={`${formatMoney(totals.profit)} (${formatNumber(totals.margin)}%)`} /></FormField>
                    </div>
                  </div>
                </FormSection>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

export default QuotesPage
