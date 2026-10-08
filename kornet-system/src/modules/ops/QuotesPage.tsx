import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { FilePlus2, Printer, Send, ThumbsDown, ThumbsUp } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, DataGrid, DateInput, EditableGrid, EmptyState, FormField, FormSection, Input, MoneyInput, NumberInput, PageHeader, Select, StatusPill, Textarea, Toolbar } from '@/components/ui'
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
    { key: 'N', description: 'New quote', handler: () => { setSelectedId(''); setDraft(emptyQuote); setCargo([newCargoLine(1)]); setCharges([blankCharge(0)]) } },
    { key: '/', description: 'Focus quote search', handler: () => document.getElementById('quote-search')?.focus() },
  ])

  const rows = query.data?.data ?? []
  const computedCharges = charges.map((line) => computeChargeLine(line, { declaredValue: draft.declaredValue }, cargo, [], draft.mode === 'AIR'))

  return <div className="p-6">
    <PageHeader title="Quotes" eyebrow="Operations" description="Estimate lanes, cargo, billing and vendor costs before converting accepted quotes to live files." primaryAction={<Button onClick={() => { setSelectedId(''); setDraft(emptyQuote); setCargo([newCargoLine(1)]); setCharges([blankCharge(0)]) }}><FilePlus2 className="size-4" />New quote</Button>} />
    <Toolbar>
      <div id="quote-search"><SearchBox value={filters.q || ''} onChange={(v) => setFilters((f) => ({ ...f, q: v }))} placeholder="Search quote, lane, commodity…" /></div>
      <Select value={filters.status || undefined} onValueChange={(v) => setFilters((f) => ({ ...f, status: v }))} options={QUOTE_STATUSES.map((s) => ({ value: s, label: s }))} placeholder="Status" />
      <Select value={filters.mode || undefined} onValueChange={(v) => setFilters((f) => ({ ...f, mode: v }))} options={['OCEAN', 'AIR', 'DOMESTIC'].map((s) => ({ value: s, label: s }))} placeholder="Mode" />
      <Input type="date" value={filters.dateFrom || ''} onChange={(event) => setFilters((f) => ({ ...f, dateFrom: event.target.value, dateField: 'date' }))} className="w-40" />
      <Input type="date" value={filters.dateTo || ''} onChange={(event) => setFilters((f) => ({ ...f, dateTo: event.target.value, dateField: 'date' }))} className="w-40" />
      <Button variant="outline" onClick={() => setFilters({})}>Clear</Button>
    </Toolbar>
    <div className="grid gap-4 xl:grid-cols-[minmax(26rem,0.9fr)_1.4fr]">
      <DataGrid data={rows} loading={query.isLoading} density="compact" emptyTitle="No quotes match your filters" onRowSelect={(selection) => selection[0]?.id && setSelectedId(String(selection[0].id))} columns={[
        { id: 'quoteNo', header: 'Quote #', accessor: 'quoteNo', sortable: true, className: 'font-mono' },
        { id: 'status', header: 'Status', cell: (row) => <StatusPill status={row.status} /> },
        { id: 'lane', header: 'Lane', cell: (row) => <span>{row.pol || '—'} → {row.pod || '—'}</span> },
        { id: 'mode', header: 'Mode', cell: (row) => <span>{row.mode} {row.direction}</span> },
        { id: 'valid', header: 'Valid', cell: (row) => formatDate(row.validUntil) },
      ]} />
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between gap-3">
            <CardTitle>{draft.id ? `Quote ${draft.quoteNo}` : 'New quote'}</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              {dirty && <StatusPill status="Unsaved" tone="warning" />}
              <Button variant="outline" onClick={() => openPrintWindow(`Quote ${draft.quoteNo || ''}`, quotePrintHtml({ ...(draft as Quote), charges: computedCharges, cargoLines: cargo }))}><Printer className="size-4" />Print</Button>
              <Button variant="outline" onClick={() => statusMutation.mutate('SENT')}><Send className="size-4" />Send</Button>
              <Button variant="outline" onClick={() => statusMutation.mutate('ACCEPTED')}><ThumbsUp className="size-4" />Accept</Button>
              <Button variant="outline" onClick={() => statusMutation.mutate('REJECTED')}><ThumbsDown className="size-4" />Reject</Button>
              <Button onClick={() => convertMutation.mutate()} loading={convertMutation.isPending}>Convert</Button>
              <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} kbd="Ctrl+S">Save</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          {!draft.id && rows.length === 0 && !query.isLoading ? <EmptyState title="Create your first quote" description="Use New quote, add cargo and charge lines, then save." /> : null}
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
            <div className="xl:col-span-3 md:col-span-2">
              <EditableGrid rows={cargo as unknown as Record<string, unknown>[]} onRowsChange={(rows) => setCargo(rows as unknown as CargoLine[])} createRow={() => newCargoLine(cargo.length + 1) as unknown as Record<string, unknown>} columns={[
                { id: 'pieces', header: 'PCS', type: 'number' }, { id: 'packageType', header: 'Pkg' }, { id: 'description', header: 'Description' }, { id: 'lengthCm', header: 'L cm', type: 'number' }, { id: 'widthCm', header: 'W cm', type: 'number' }, { id: 'heightCm', header: 'H cm', type: 'number' }, { id: 'grossKg', header: 'Gross kg', type: 'number' },
              ]} />
            </div>
          </FormSection>
          <FormSection title="Charges" description="Live billing, cost, profit and margin preview.">
            <div className="xl:col-span-3 md:col-span-2 space-y-3">
              <EditableGrid rows={computedCharges as unknown as Record<string, unknown>[]} onRowsChange={(rows) => setCharges(rows as unknown as ChargeLine[])} createRow={() => blankCharge(charges.length) as unknown as Record<string, unknown>} columns={[
                { id: 'billingCode', header: 'Code' }, { id: 'description', header: 'Description' }, { id: 'unit', header: 'Basis' }, { id: 'qty', header: 'Qty', type: 'number', readOnly: true }, { id: 'rate', header: 'Sell', type: 'money' }, { id: 'amountPhp', header: 'Bill PHP', type: 'money', readOnly: true }, { id: 'costRate', header: 'Cost', type: 'money' }, { id: 'costAmountPhp', header: 'Cost PHP', type: 'money', readOnly: true },
              ]} footer={<div className="flex flex-wrap items-center justify-end gap-4"><span>Bill <MoneyValue value={totals.bill} /></span><span>Cost <MoneyValue value={totals.cost} /></span><span>Profit <MoneyValue value={totals.profit} /></span><MarginBadge bill={totals.bill} cost={totals.cost} /></div>} />
              <div className="grid gap-2 md:grid-cols-4">
                <FormField label="Default basis"><OptionsSelect value={charges[0]?.unit} options={CHARGE_UNITS} onChange={(unit) => setCharges((rows) => rows.map((r, i) => i === 0 ? { ...r, unit } : r))} /></FormField>
                <FormField label="VAT class"><OptionsSelect value={charges[0]?.vatClass} options={VAT_CLASSES} onChange={(vatClass) => setCharges((rows) => rows.map((r, i) => i === 0 ? { ...r, vatClass } : r))} /></FormField>
                <FormField label="Declared value"><MoneyInput value={draft.declaredValue ?? 0} onValueChange={(declaredValue) => setDraft((q) => ({ ...q, declaredValue }))} /></FormField>
                <FormField label="Profit"><Input readOnly className="font-mono" value={`${formatMoney(totals.profit)} (${formatNumber(totals.margin)}%)`} /></FormField>
              </div>
            </div>
          </FormSection>
        </CardContent>
      </Card>
    </div>
  </div>
}

export default QuotesPage
