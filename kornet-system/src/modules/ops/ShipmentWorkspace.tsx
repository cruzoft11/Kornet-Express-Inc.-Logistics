import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Copy, FilePlus2, Save } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, DataGrid, Dialog, DialogContent, EmptyState, Input, PageHeader, Select, StatusPill, Stepper, Tabs, Textarea, Toolbar } from '@/components/ui'
import { opsApi, shipmentModeParts, type CargoLine, type ChargeLine, type ContainerLine, type Shipment, type TransportDoc, type WorkspaceMode } from '@/api/ops'
import { useHotkeys } from '@/hooks/useHotkeys'
import { formatDate } from '@/lib/format'
import { apiErrorMessage, cargoTotals, computeCargoLine, computeChargeLine, financialTotals, isAirMode, isOceanMode, newCargoLine, STATUS_STEPS } from './utils'
import { MarginBadge, SearchBox, useDebouncedValue, useDirtySnapshot } from './components/common'
import { openPrintWindow, shipmentDocumentHtml } from './components/print'
import { AccountingTab, AuditTab, CargoTab, ChargesTab, CloseTab, ContainersTab, DocsTab, DocumentsTab, GeneralTab, ImportTab, TimelineTab } from './components/ShipmentTabs'

type ShipmentWorkspaceProps = { mode?: WorkspaceMode }
const listFilterKey = 'kornet.ops.shipmentFilters'

function defaultShipment(mode?: WorkspaceMode): Partial<Shipment> {
  const parts = mode ? shipmentModeParts(mode) : { mode: 'OCEAN', direction: 'EXPORT' }
  return { mode: parts.mode, direction: parts.direction, status: 'BOOKED', fileType: 'DIRECT', loadType: parts.mode === 'AIR' ? 'AIR' : parts.mode === 'DOMESTIC' ? 'LTL' : 'LCL', freightTerm: 'PREPAID', currency: 'PHP', exchangeRate: 1 }
}

function blankCharge(index: number): ChargeLine {
  return { billingCode: 'MISC', description: '', chargeSide: 'BOTH', freightTerm: 'PREPAID', billParty: 'SHIPPER', unit: 'PER_SHPT', qty: 1, rate: 0, minAmount: 0, currency: 'PHP', exchangeRate: 1, amount: 0, amountPhp: 0, vatClass: 'VATABLE', showOnDoc: true, costQty: 1, costRate: 0, costCurrency: 'PHP', costExchangeRate: 1, costAmount: 0, costAmountPhp: 0, billStatus: 'OPEN', costStatus: 'OPEN', sortOrder: index }
}

function workflowIndex(status?: string) {
  const index = STATUS_STEPS.indexOf(status || 'BOOKED')
  return index >= 0 ? index : 0
}

function statusCodeFor(status: string) {
  const map: Record<string, string> = { BOOKED: 'BKD', LOADED: 'LDD', IN_TRANSIT: 'DEP', ARRIVED: 'ARR', CLEARED: 'CUS', DELIVERED: 'DLV', CLOSED: 'CLS' }
  return map[status] ?? status
}

export function ShipmentWorkspace({ mode }: ShipmentWorkspaceProps) {
  const params = useParams()
  const routeId = params.id
  const modeInfo = mode ? shipmentModeParts(mode) : undefined
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`${listFilterKey}.${mode || 'detail'}`) || '{}') as Record<string, string> } catch { return {} }
  })
  const [selectedId, setSelectedId] = useState(routeId || '')
  const [draft, setDraft] = useState<Partial<Shipment>>(defaultShipment(mode))
  const [cargo, setCargo] = useState<CargoLine[]>([newCargoLine(1)])
  const [containers, setContainers] = useState<ContainerLine[]>([])
  const [charges, setCharges] = useState<ChargeLine[]>([blankCharge(0)])
  const [docs, setDocs] = useState<TransportDoc[]>([])
  const [tab, setTab] = useState('general')
  const [closeOpen, setCloseOpen] = useState(false)
  const [overrideReason, setOverrideReason] = useState('')
  const [reopenReason, setReopenReason] = useState('')
  const [pasteText, setPasteText] = useState('')
  const [milestone, setMilestone] = useState({ code: 'BKD', location: '', notes: '', isPublic: true })
  const debouncedSearch = useDebouncedValue(filters.q || '')
  const air = isAirMode(mode || draft.mode || '')
  const ocean = isOceanMode(mode || draft.mode || '')
  const { dirty, markClean } = useDirtySnapshot({ draft, cargo, containers, charges, docs })

  useEffect(() => localStorage.setItem(`${listFilterKey}.${mode || 'detail'}`, JSON.stringify(filters)), [filters, mode])
  useEffect(() => { if (routeId) setSelectedId(routeId) }, [routeId])
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [dirty])

  const listQuery = useQuery({ queryKey: ['ops', 'shipments', mode, filters, debouncedSearch], queryFn: () => opsApi.listShipments({ ...filters, q: debouncedSearch, mode: modeInfo?.mode, direction: modeInfo?.direction }), enabled: Boolean(mode) })
  const shipmentQuery = useQuery({ queryKey: ['ops', 'shipment', selectedId], queryFn: () => opsApi.getShipment(selectedId), enabled: Boolean(selectedId) })
  const eventsQuery = useQuery({ queryKey: ['ops', 'events', selectedId], queryFn: () => opsApi.listStatusEvents('SHIPMENT', selectedId), enabled: Boolean(selectedId) })
  const closeCheckQuery = useQuery({ queryKey: ['ops', 'close-check', selectedId], queryFn: () => opsApi.closeCheck(selectedId), enabled: closeOpen && Boolean(selectedId) })

  useEffect(() => {
    if (!shipmentQuery.data) return
    const sh = shipmentQuery.data
    setDraft(sh)
    setCargo(sh.cargoLines?.length ? sh.cargoLines : [newCargoLine(1)])
    setContainers(sh.containers ?? [])
    setCharges(sh.charges?.length ? sh.charges : [blankCharge(0)])
    setDocs(sh.transportDocs ?? [])
    markClean({ draft: sh, cargo: sh.cargoLines ?? [], containers: sh.containers ?? [], charges: sh.charges ?? [], docs: sh.transportDocs ?? [] })
  }, [markClean, shipmentQuery.data])

  const computedCargo = useMemo(() => cargo.map((line) => computeCargoLine(line, air)), [air, cargo])
  const computedCharges = useMemo(() => charges.map((line) => computeChargeLine(line, draft, computedCargo, containers, air)), [air, charges, computedCargo, containers, draft])
  const cargoSummary = useMemo(() => cargoTotals(computedCargo, air), [air, computedCargo])
  const moneyTotals = useMemo(() => financialTotals(computedCharges), [computedCharges])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = { ...draft, cargoLines: undefined, containers: undefined, charges: undefined, transportDocs: undefined }
      const shipment = draft.id ? await opsApi.updateShipment(draft.id, body) : await opsApi.createShipment(body)
      for (const [index, line] of computedCargo.entries()) {
        const payload = { ...line, shipmentId: shipment.id, lineNo: index + 1 }
        if (line.id) await opsApi.updateCargoLine(line.id, payload)
        else if (line.description || line.pieces || line.grossKg) await opsApi.createCargoLine(payload)
      }
      for (const line of containers) {
        const payload = { ...line, shipmentId: shipment.id }
        if (!payload.containerNo) continue
        if (line.id) await opsApi.updateContainer(line.id, payload)
        else await opsApi.createContainer(payload)
      }
      for (const [index, line] of computedCharges.entries()) {
        const payload = { ...line, shipmentId: shipment.id, sortOrder: index }
        if (line.id) await opsApi.updateCharge(line.id, payload)
        else if (line.billingCode || line.description) await opsApi.createCharge(payload)
      }
      for (const doc of docs) {
        const payload = { ...doc, shipmentId: shipment.id }
        if (!payload.docNo) continue
        if (doc.id) await opsApi.updateTransportDoc(doc.id, payload)
        else await opsApi.createTransportDoc(payload)
      }
      return opsApi.getShipment(shipment.id)
    },
    onSuccess: (shipment) => {
      toast.success(`Saved ${shipment.fileNo}`)
      setSelectedId(shipment.id)
      setDraft(shipment)
      setCargo(shipment.cargoLines?.length ? shipment.cargoLines : [newCargoLine(1)])
      setContainers(shipment.containers ?? [])
      setCharges(shipment.charges?.length ? shipment.charges : [blankCharge(0)])
      setDocs(shipment.transportDocs ?? [])
      markClean({ draft: shipment, cargo: shipment.cargoLines ?? [], containers: shipment.containers ?? [], charges: shipment.charges ?? [], docs: shipment.transportDocs ?? [] })
      queryClient.invalidateQueries({ queryKey: ['ops'] })
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  })

  const createMutation = useMutation({ mutationFn: () => opsApi.createShipment(defaultShipment(mode)), onSuccess: (shipment) => { toast.success(`Created ${shipment.fileNo}`); setSelectedId(shipment.id); navigate(modeInfo?.path ? `${modeInfo.path}?file=${shipment.id}` : `/logistics/files/${shipment.id}`) }, onError: (error) => toast.error(apiErrorMessage(error)) })
  const statusMutation = useMutation({ mutationFn: (status: string) => opsApi.setShipmentStatus(String(draft.id), status, statusCodeFor(status)), onSuccess: (res) => { toast.success(`Status updated to ${res.shipment.status}`); setDraft(res.shipment); queryClient.invalidateQueries({ queryKey: ['ops'] }) }, onError: (error) => toast.error(apiErrorMessage(error)) })
  const simpleAction = useMutation({ mutationFn: async (action: string) => { if (!draft.id) throw new Error('Open a shipment first.'); if (action === 'tariffs') return opsApi.applyTariffs(draft.id); if (action === 'invoice') return opsApi.generateInvoices(draft.id); if (action === 'ap') return opsApi.generateApBills(draft.id); if (action === 'clone') return opsApi.cloneShipment(draft.id); throw new Error('Unknown action') }, onSuccess: (result, action) => { if (action === 'clone' && typeof result === 'object' && result && 'id' in result) setSelectedId((result as Shipment).id); toast.success('Action completed'); queryClient.invalidateQueries({ queryKey: ['ops'] }) }, onError: (error) => toast.error(apiErrorMessage(error)) })
  const closeMutation = useMutation({ mutationFn: () => opsApi.closeShipment(String(draft.id), overrideReason), onSuccess: (shipment) => { toast.success(`${shipment.fileNo} closed`); setDraft(shipment); setCloseOpen(false); queryClient.invalidateQueries({ queryKey: ['ops'] }) }, onError: (error) => toast.error(apiErrorMessage(error)) })
  const reopenMutation = useMutation({ mutationFn: () => opsApi.reopenShipment(String(draft.id), reopenReason), onSuccess: (shipment) => { toast.success(`${shipment.fileNo} reopened`); setDraft(shipment); setReopenReason(''); queryClient.invalidateQueries({ queryKey: ['ops'] }) }, onError: (error) => toast.error(apiErrorMessage(error)) })
  const milestoneMutation = useMutation({ mutationFn: () => opsApi.createStatusEvent({ entityType: 'SHIPMENT', entityId: String(draft.id), ...milestone }), onSuccess: () => { toast.success('Milestone added'); setMilestone({ code: 'BKD', location: '', notes: '', isPublic: true }); queryClient.invalidateQueries({ queryKey: ['ops', 'events', selectedId] }) }, onError: (error) => toast.error(apiErrorMessage(error)) })

  const printDocument = useCallback((kind: string) => { if (!draft.id) { toast.error('Save the shipment before printing.'); return } opsApi.documentPayload(draft.id, kind).then((payload) => openPrintWindow(`${draft.fileNo} ${kind}`, shipmentDocumentHtml(payload))).catch((error: unknown) => toast.error(apiErrorMessage(error))) }, [draft.fileNo, draft.id])
  const saveAndClose = useCallback(() => { saveMutation.mutate(undefined, { onSuccess: () => navigate(modeInfo?.path ?? '/dashboard') }) }, [modeInfo?.path, navigate, saveMutation])

  useHotkeys([
    { key: 'Mod+S', description: 'Save file', handler: () => saveMutation.mutate() },
    { key: 'Mod+Enter', description: 'Save and close', handler: saveAndClose },
    { key: 'N', description: 'New file', handler: () => createMutation.mutate(), when: Boolean(mode) },
    { key: '/', description: 'Focus shipment search', handler: () => document.getElementById('shipment-search')?.focus(), when: Boolean(mode) },
    ...['general', 'import', 'cargo', 'containers', 'docs', 'charges', 'timeline', 'documents', 'accounting', 'close', 'audit'].map((value, index) => ({ key: `Alt+${index + 1}`, description: `Open ${value}`, handler: () => setTab(value) })),
  ])

  const updateDraft = (patch: Partial<Shipment>) => setDraft((current) => ({ ...current, ...patch }))
  const rows = listQuery.data?.data ?? []

  return <div className="p-6">
    <PageHeader title={modeInfo?.label ?? (draft.fileNo ? `File ${draft.fileNo}` : 'Shipment file')} eyebrow="Operations" description="Workspace for bookings, cargo, transport documents, charges, milestones, printouts and accounting handoff." primaryAction={mode ? <Button onClick={() => createMutation.mutate()} loading={createMutation.isPending} kbd="N"><FilePlus2 className="size-4" />Quick create</Button> : undefined} actions={<div className="flex gap-2">{dirty && <StatusPill status="Unsaved" tone="warning" />}<Button variant="outline" onClick={() => simpleAction.mutate('clone')} disabled={!draft.id}><Copy className="size-4" />Clone</Button><Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} kbd="Ctrl+S"><Save className="size-4" />Save</Button></div>} />
    {mode && <Toolbar><div id="shipment-search"><SearchBox value={filters.q || ''} onChange={(q) => setFilters((f) => ({ ...f, q }))} placeholder="Search file, booking, customer ref…" /></div><Select value={filters.status || undefined} onValueChange={(status) => setFilters((f) => ({ ...f, status }))} placeholder="Status" options={['BOOKED', 'LOADED', 'IN_TRANSIT', 'ARRIVED', 'CLEARED', 'DELIVERED', 'CLOSED', 'CANCELLED'].map((s) => ({ value: s, label: s }))} /><Input type="date" value={filters.dateFrom || ''} onChange={(event) => setFilters((f) => ({ ...f, dateFrom: event.target.value, dateField: 'etd' }))} className="w-40" /><Input type="date" value={filters.dateTo || ''} onChange={(event) => setFilters((f) => ({ ...f, dateTo: event.target.value, dateField: 'eta' }))} className="w-40" /><Button variant="outline" onClick={() => setFilters({})}>Clear saved filters</Button></Toolbar>}
    <div className={mode ? 'grid gap-4 2xl:grid-cols-[minmax(28rem,0.85fr)_1.5fr]' : ''}>
      {mode && <DataGrid data={rows} loading={listQuery.isLoading} density="compact" emptyTitle={`No ${modeInfo?.label.toLowerCase()} files`} onRowSelect={(selection) => selection[0]?.id && setSelectedId(String(selection[0].id))} columns={[{ id: 'fileNo', header: 'File #', accessor: 'fileNo', sortable: true, className: 'font-mono' }, { id: 'status', header: 'Status', cell: (row) => <StatusPill status={row.status} /> }, { id: 'booking', header: 'Booking', accessor: 'bookingNo' }, { id: 'lane', header: 'Lane', cell: (row) => <span>{row.polCode || '—'} → {row.podCode || '—'}</span> }, { id: 'etd', header: 'ETD', cell: (row) => formatDate(row.etd) }, { id: 'eta', header: 'ETA', cell: (row) => formatDate(row.eta) }, { id: 'margin', header: 'Margin', cell: (row) => <MarginBadge bill={row.charges?.reduce((s, c) => s + Number(c.amountPhp || 0), 0) ?? 0} cost={row.charges?.reduce((s, c) => s + Number(c.costAmountPhp || 0), 0) ?? 0} /> }]} />}
      <Card><CardHeader className="border-b">{draft.id ? <div className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle className="font-mono">{draft.fileNo}</CardTitle><p className="text-sm text-muted-foreground">{draft.mode} {draft.direction} · {draft.loadType}</p></div><div className="flex flex-wrap items-center gap-2"><StatusPill status={draft.status || 'DRAFT'} /><StatusPill status={draft.mode || 'MODE'} tone="info" /><MarginBadge bill={moneyTotals.bill} cost={moneyTotals.cost} /></div></div><Stepper steps={STATUS_STEPS} current={workflowIndex(draft.status)} /></div> : <CardTitle>No file selected</CardTitle>}</CardHeader><CardContent className="pt-5">{!draft.id && !mode ? <EmptyState title="Open a shipment file" description="Use a mode list route or pass /logistics/files/:id after converting a quote." /> : <Tabs value={tab} onValueChange={setTab} tabs={[{ value: 'general', label: 'General', content: <GeneralTab draft={draft} air={air} update={updateDraft} /> }, { value: 'import', label: 'Import info', content: <ImportTab draft={draft} update={updateDraft} disabled={draft.direction !== 'IMPORT'} /> }, { value: 'cargo', label: 'Cargo', content: <CargoTab air={air} cargo={computedCargo} setCargo={setCargo} totals={cargoSummary} pasteText={pasteText} setPasteText={setPasteText} /> }, { value: 'containers', label: 'Containers', content: <ContainersTab ocean={ocean} shipmentId={String(draft.id || '')} containers={containers} setContainers={setContainers} /> }, { value: 'docs', label: 'Transport Docs', content: <DocsTab air={air} draft={draft} docs={docs} setDocs={setDocs} /> }, { value: 'charges', label: 'Charges', content: <ChargesTab draft={draft} air={air} cargo={computedCargo} containers={containers} charges={computedCharges} setCharges={setCharges} applyTariffs={() => simpleAction.mutate('tariffs')} loading={simpleAction.isPending} totals={moneyTotals} /> }, { value: 'timeline', label: 'Status/Timeline', content: <TimelineTab events={eventsQuery.data?.data ?? []} milestone={milestone} setMilestone={setMilestone} add={() => milestoneMutation.mutate()} status={(status) => statusMutation.mutate(status)} /> }, { value: 'documents', label: 'Documents', content: <DocumentsTab air={air} print={printDocument} /> }, { value: 'accounting', label: 'Accounting', content: <AccountingTab fileId={draft.id} generateInvoices={() => simpleAction.mutate('invoice')} generateAp={() => simpleAction.mutate('ap')} loading={simpleAction.isPending} /> }, { value: 'close', label: 'Close', content: <CloseTab status={draft.status} openClose={() => setCloseOpen(true)} reopenReason={reopenReason} setReopenReason={setReopenReason} reopen={() => reopenMutation.mutate()} /> }, { value: 'audit', label: 'Audit', content: <AuditTab draft={draft} /> }]} />}</CardContent></Card>
    </div>
    <Dialog open={closeOpen} onOpenChange={setCloseOpen}><DialogContent title={`Close ${draft.fileNo || 'file'}`} description="Close-check blockers must be cleared; warnings require manager override if policy applies.">{closeCheckQuery.isLoading ? <p className="text-sm text-muted-foreground">Checking file…</p> : <div className="space-y-3">{(closeCheckQuery.data?.blockers ?? []).length > 0 && <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3"><p className="font-semibold text-destructive">Blockers</p><ul className="list-disc pl-5 text-sm">{closeCheckQuery.data?.blockers.map((item) => <li key={item}>{item}</li>)}</ul></div>}{(closeCheckQuery.data?.warnings ?? []).length > 0 && <div className="rounded-lg border border-warning/30 bg-warning/5 p-3"><p className="font-semibold text-warning">Warnings</p><ul className="list-disc pl-5 text-sm">{closeCheckQuery.data?.warnings.map((item) => <li key={item}>{item}</li>)}</ul></div>}<Textarea value={overrideReason} onChange={(event) => setOverrideReason(event.target.value)} placeholder="Manager override reason when required" /><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setCloseOpen(false)}>Cancel</Button><Button onClick={() => closeMutation.mutate()} loading={closeMutation.isPending} disabled={(closeCheckQuery.data?.blockers?.length ?? 0) > 0}>Close file</Button></div></div>}</DialogContent></Dialog>
  </div>
}

export default ShipmentWorkspace
