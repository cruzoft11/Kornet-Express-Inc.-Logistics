import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileDown, Printer, Search, ShieldAlert, Wand2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button, Card, CardContent, CardHeader, CardTitle, DataGrid, type DataGridColumn, DateInput, Dialog, DialogContent, EmptyState, exportRowsToExcel, FormField, FormSection, FullscreenDialog, Input, NumberInput, PageHeader, Select, Skeleton, StatusPill, Tabs, Textarea, Timeline, Toolbar } from '@/components/ui'
import { KornetLoader } from '@/components/ui/KornetLoader'
import { useHotkeys } from '@/hooks/useHotkeys'
import { formatDate, formatNumber, formatWeightKg } from '@/lib/format'
import { vehiclesApi, type ContainerOption, type Vehicle, type VehicleInput, type VinDecodeResult } from '@/api/vehicles'

const statuses = ['EXPECTED', 'RECEIVED', 'ON_HOLD', 'READY_TO_SHIP', 'PRE_LOADED', 'LOADED', 'SHIPPED', 'RELEASED', 'WITHDRAWN']
const blankVehicle: VehicleInput = { vin: '', status: 'EXPECTED', mode: 'RORO', date: new Date().toISOString(), titleReceived: false, lienReleaseRequired: false, lienReleaseReceived: false, shipperTentative: false, destinationTentative: false, lengthCm: 0, widthCm: 0, heightCm: 0, grossKg: 0, cbm: 0 }
function err(e: unknown) { return e instanceof Error ? e.message : 'Request failed' }
function todayIso() { return new Date().toISOString().slice(0, 10) }
function asInputDate(value?: string | null) { return value ? value.slice(0, 10) : '' }

export default function VehicleInventoryPage() {
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [containerId, setContainerId] = useState('')
  const [selected, setSelected] = useState<Vehicle | null>(null)
  const [draft, setDraft] = useState<VehicleInput>(blankVehicle)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [tab, setTab] = useState('identity')
  const [action, setAction] = useState<{ vehicle: Vehicle; action: VehicleAction } | null>(null)
  const [printVehicle, setPrintVehicle] = useState<Vehicle | null>(null)
  const [selectedRows, setSelectedRows] = useState<Vehicle[]>([])
  const searchRef = useRef<HTMLInputElement>(null)
  const params = useMemo(() => ({ q, status: status || undefined, dateFrom: dateFrom || undefined, dateField: 'date', containerId: containerId || undefined, pageSize: 200 }), [q, status, dateFrom, containerId])
  const vehicles = useQuery({ queryKey: ['vehicles', params], queryFn: () => vehiclesApi.list(params) })
  const events = useQuery({ queryKey: ['vehicle-events', selected?.id], enabled: !!selected?.id, queryFn: () => vehiclesApi.statusEvents(selected!.id) })
  const containers = useQuery({ queryKey: ['vehicle-containers'], queryFn: () => vehiclesApi.containers() })
  const save = useMutation({ mutationFn: () => draft.id ? vehiclesApi.update(draft.id, draft) : vehiclesApi.create(draft), onSuccess: (row) => { toast.success(`Vehicle ${row.vin} saved`); setSelected(row); setDraft(row); qc.invalidateQueries({ queryKey: ['vehicles'] }) }, onError: (e) => toast.error(err(e)) })
  const runAction = useMutation({ mutationFn: (v: { vehicle: Vehicle; action: VehicleAction; body?: Record<string, unknown> }) => vehiclesApi.action(v.vehicle.id, v.action, v.body), onSuccess: (row) => { toast.success(`${row.vin} updated to ${row.status}`); setAction(null); qc.invalidateQueries({ queryKey: ['vehicles'] }); qc.invalidateQueries({ queryKey: ['vehicle-events'] }) }, onError: (e) => toast.error(err(e)) })
  const decode = useMutation({ mutationFn: (vin: string) => vehiclesApi.decodeVin(vin), onSuccess: (decoded) => { const patch = decodePatch(decoded); setDraft({ ...draft, ...patch, decodedJson: JSON.stringify(decoded) }); if (decoded.warning || decoded.warnings?.length) toast.warning(decoded.warning ?? decoded.warnings?.join(', ')); else toast.success('VIN decoded') }, onError: (e) => toast.error(err(e)) })
  const rows = vehicles.data?.data ?? []
  const openNew = () => { setDraft(blankVehicle); setSelected(null); setSheetOpen(true); setTab('identity') }
  const openEdit = (row: Vehicle) => { setDraft(row); setSelected(row); setSheetOpen(true); setTab('identity') }
  useHotkeys([{ key: 'N', description: 'New vehicle', handler: openNew }, { key: '/', description: 'Search', handler: () => searchRef.current?.focus() }, { key: 'Mod+S', description: 'Save vehicle', handler: () => sheetOpen && save.mutate(), when: sheetOpen }, { key: 'Escape', description: 'Close sheet', handler: () => setSheetOpen(false), when: sheetOpen }])

  const columns: DataGridColumn<Vehicle>[] = [
    { id: 'wrNo', header: 'WR #', cell: (r) => <button className="font-mono font-semibold text-secondary underline-offset-4 hover:underline" onClick={() => openEdit(r)}>{r.wrNo ?? '—'}</button>, sortable: true },
    { id: 'vin', header: 'VIN', accessor: 'vin', sortable: true, className: 'font-mono' },
    { id: 'vehicle', header: 'Vehicle', cell: (r) => [r.year, r.make, r.model, r.trim].filter(Boolean).join(' ') || '—' },
    { id: 'status', header: 'Status', cell: (r) => <StatusPill status={r.status} /> },
    { id: 'received', header: 'Received', cell: (r) => formatDate(r.date), sortable: true },
    { id: 'customer', header: 'Customer', cell: (r) => r.shipperName || r.consigneeName || '—' },
    { id: 'container', header: 'Container', cell: (r) => r.containerId ?? '—' },
    {
      id: 'actions',
      header: 'Actions',
      cell: (r) => {
        const actions = validActions(r)
        const primary = actions[0]
        return (
          <div className="flex items-center gap-1.5">
            {primary && (
              <Button size="sm" variant="secondary" className="h-7 px-2 text-xs" onClick={() => setAction({ vehicle: r, action: primary })}>
                {labelAction(primary)}
              </Button>
            )}
            {actions.length > 1 && (
              <Select
                placeholder="More…"
                options={actions.slice(1).map((a) => ({ value: a, label: labelAction(a) }))}
                onValueChange={(val) => setAction({ vehicle: r, action: val as VehicleAction })}
                className="h-7 w-24 text-xs"
              />
            )}
            <Button size="sm" variant="ghost" className="h-7 px-1.5" onClick={() => setPrintVehicle(r)} title="Print receipt">
              <Printer className="size-3.5" />
            </Button>
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-5 p-4 md:p-6 min-w-0 w-full overflow-hidden">
      <PageHeader
        title="Vehicle Inventory"
        eyebrow="RoRo / car exports"
        description="VIN decode, WR intake, inspection fields, state-machine transitions, container loading, and history."
        primaryAction={<Button onClick={openNew} kbd="N">New vehicle</Button>}
        actions={<Button variant="outline" onClick={() => exportRowsToExcel(rows.map(exportVehicle), `vehicles-${todayIso()}.xlsx`)}><FileDown className="size-4" />Excel</Button>}
      />
      <Toolbar>
        <Input ref={searchRef} leftIcon={<Search className="size-4" />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search VIN, WR, make, customer…" className="w-80" />
        <Select value={status || undefined} onValueChange={setStatus} placeholder="All status" options={statuses.map((value) => ({ value, label: value.replace(/_/g, ' ') }))} />
        <DateInput value={dateFrom} onValueChange={setDateFrom} placeholder="Received from" />
        <Input value={containerId} onChange={(e) => setContainerId(e.target.value)} placeholder="Container ID" className="w-40" />
        <Button disabled={!selectedRows.length} onClick={() => bulkReady(selectedRows, runAction.mutate)}>Bulk ready</Button>
        <Button disabled={!selectedRows.length} onClick={() => selectedRows[0] && setAction({ vehicle: selectedRows[0], action: 'link-to-container' })}>Link to container</Button>
      </Toolbar>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        {statuses.slice(0, 8).map((s) => (
          <Card key={s} className="p-3 shadow-2xs">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate">{s.replace(/_/g, ' ')}</p>
            <p className="mt-1 font-mono text-xl font-bold">{rows.filter((r) => r.status === s).length}</p>
          </Card>
        ))}
      </div>
      {vehicles.isLoading ? (
        <div className="flex h-72 items-center justify-center rounded-2xl border bg-card">
          <KornetLoader size="md" label="Loading vehicle inventory…" />
        </div>
      ) : (
        <DataGrid columns={columns} data={rows} loading={false} emptyTitle="No vehicles found" density="compact" onRowSelect={setSelectedRows} />
      )}
      <FullscreenDialog
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={draft.id ? `Edit Vehicle — ${draft.vin}` : 'New Vehicle Registration'}
        description="Ctrl+S saves; Decode fills NHTSA values. Complete VIN, inspection, and party particulars."
        actions={
          <div className="flex w-full items-center justify-between">
            <Button variant="outline" onClick={() => setSheetOpen(false)}>
              Cancel
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="size-4" />
                Print
              </Button>
              <Button onClick={() => save.mutate()} loading={save.isPending} kbd="Ctrl+S">
                Save Vehicle
              </Button>
            </div>
          </div>
        }
      >
        <VehicleEditor draft={draft} setDraft={setDraft} tab={tab} setTab={setTab} onSave={() => save.mutate()} onDecode={() => draft.vin && decode.mutate(draft.vin)} saving={save.isPending} decoding={decode.isPending} />
      </FullscreenDialog>
      {action && <ActionDialog vehicle={action.vehicle} action={action.action} containers={containers.data?.data ?? []} onClose={() => setAction(null)} loading={runAction.isPending} onSubmit={(body) => runAction.mutate({ vehicle: action.vehicle, action: action.action, body })} />}
      {printVehicle && <PrintVehicle vehicle={printVehicle} onClose={() => setPrintVehicle(null)} />}
      {selected && (
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-base">Status history — {selected.vin}</CardTitle></CardHeader>
          <CardContent>
            {events.isLoading ? (
              <Skeleton className="h-24" />
            ) : events.data?.data.length ? (
              <Timeline items={(events.data?.data ?? []).map((e) => ({ id: e.id, title: e.code, time: formatDate(e.eventAt), description: e.notes ?? e.subStatus ?? undefined, tone: e.code.includes('HOLD') ? 'danger' : 'info' }))} />
            ) : (
              <EmptyState title="No status events yet" />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

type VehicleAction = 'receive' | 'inspect' | 'hold' | 'release-hold' | 'ready' | 'force-ready' | 'temporal-release' | 'undo-temporal-release' | 'withdraw' | 'link-to-container' | 'title-rejected'
function validActions(v: Vehicle): VehicleAction[] { if (v.status === 'EXPECTED') return ['receive', 'withdraw']; if (v.status === 'RECEIVED') return ['inspect', 'hold', 'ready', 'force-ready', 'temporal-release', 'withdraw', 'title-rejected']; if (v.status === 'ON_HOLD') return ['release-hold', 'withdraw']; if (v.status === 'READY_TO_SHIP') return ['hold', 'link-to-container', 'temporal-release', 'withdraw', 'title-rejected']; if (v.status === 'RELEASED' && v.temporalRelease) return ['undo-temporal-release']; if (v.status === 'LOADED') return ['title-rejected']; return [] }
function labelAction(a: VehicleAction) { return a.split('-').map((p) => p[0].toUpperCase() + p.slice(1)).join(' ') }
function decodePatch(d: VinDecodeResult): VehicleInput { return { year: d.year ?? undefined, make: d.make ?? undefined, model: d.model ?? undefined, trim: d.trim ?? undefined, body: d.body ?? d.bodyClass ?? undefined, bodyClass: d.bodyClass ?? d.body ?? undefined, engine: d.engine ?? undefined, fuel: d.fuel ?? undefined } }
function VehicleEditor({ draft, setDraft, tab, setTab, onSave, onDecode, saving, decoding }: { draft: VehicleInput; setDraft: (v: VehicleInput) => void; tab: string; setTab: (v: string) => void; onSave: () => void; onDecode: () => void; saving: boolean; decoding: boolean }) { const set = (p: VehicleInput) => setDraft({ ...draft, ...p }); return <div className="space-y-4"><Tabs value={tab} onValueChange={setTab} tabs={[{ value: 'identity', label: 'Identity', content: <FormSection title="VIN and vehicle"><FormField label="VIN" required><Input value={draft.vin ?? ''} onChange={(e) => set({ vin: e.target.value.toUpperCase() })} rightSlot={<Button type="button" size="sm" variant="ghost" loading={decoding} onClick={onDecode}><Wand2 className="size-3" />Decode</Button>} /></FormField><FormField label="WR #"><Input value={draft.wrNo ?? 'Assigned on receive'} readOnly /></FormField><FormField label="Received date"><DateInput value={asInputDate(draft.date)} onValueChange={(date) => set({ date })} /></FormField><FormField label="Year"><NumberInput value={draft.year ?? ''} onValueChange={(year) => set({ year })} /></FormField><FormField label="Make"><Input value={draft.make ?? ''} onChange={(e) => set({ make: e.target.value })} /></FormField><FormField label="Model"><Input value={draft.model ?? ''} onChange={(e) => set({ model: e.target.value })} /></FormField><FormField label="Trim"><Input value={draft.trim ?? ''} onChange={(e) => set({ trim: e.target.value })} /></FormField><FormField label="Body"><Input value={draft.body ?? draft.bodyClass ?? ''} onChange={(e) => set({ body: e.target.value, bodyClass: e.target.value })} /></FormField><FormField label="Engine"><Input value={draft.engine ?? ''} onChange={(e) => set({ engine: e.target.value })} /></FormField><FormField label="Fuel"><Input value={draft.fuel ?? ''} onChange={(e) => set({ fuel: e.target.value })} /></FormField><FormField label="Color"><Input value={draft.color ?? ''} onChange={(e) => set({ color: e.target.value })} /></FormField><FormField label="Mileage"><NumberInput value={draft.odometer ?? 0} onValueChange={(odometer) => set({ odometer })} /></FormField></FormSection> }, { value: 'inspection', label: 'Inspection', content: <FormSection title="Inspection and title"><FormField label="Inspection #"><Input value={draft.inspectionNo ?? ''} onChange={(e) => set({ inspectionNo: e.target.value })} /></FormField><FormField label="Inspection date"><DateInput value={asInputDate(draft.inspectionDate)} onValueChange={(inspectionDate) => set({ inspectionDate })} /></FormField><FormField label="Inspected by"><Input value={draft.inspectedBy ?? ''} onChange={(e) => set({ inspectedBy: e.target.value })} /></FormField><FormField label="Condition notes"><Textarea value={draft.condition ?? ''} onChange={(e) => set({ condition: e.target.value })} /></FormField><FormField label="Damages / keys"><Textarea value={draft.keys ?? ''} onChange={(e) => set({ keys: e.target.value })} /></FormField><FormField label="Title number"><Input value={draft.titleNumber ?? ''} onChange={(e) => set({ titleNumber: e.target.value })} /></FormField><FormField label="Title state"><Input value={draft.titleState ?? ''} onChange={(e) => set({ titleState: e.target.value })} /></FormField><FormField label="Title received date"><DateInput value={asInputDate(draft.titleReceivedDate)} onValueChange={(titleReceivedDate) => set({ titleReceivedDate, titleReceived: !!titleReceivedDate })} /></FormField></FormSection> }, { value: 'parties', label: 'Parties', content: <FormSection title="Owner, consignee, routing"><FormField label="Owner / shipper"><Input value={draft.shipperName ?? ''} onChange={(e) => set({ shipperName: e.target.value })} /></FormField><FormField label="Consignee"><Input value={draft.consigneeName ?? ''} onChange={(e) => set({ consigneeName: e.target.value })} /></FormField><FormField label="Origin"><Input value={draft.originCode ?? ''} onChange={(e) => set({ originCode: e.target.value })} /></FormField><FormField label="Destination"><Input value={draft.finalDestination ?? ''} onChange={(e) => set({ finalDestination: e.target.value })} /></FormField><FormField label="Shipment ID"><Input value={draft.shipmentId ?? ''} onChange={(e) => set({ shipmentId: e.target.value })} /></FormField><FormField label="Container ID"><Input value={draft.containerId ?? ''} onChange={(e) => set({ containerId: e.target.value })} /></FormField><FormField label="Warehouse"><Input value={draft.warehouse ?? ''} onChange={(e) => set({ warehouse: e.target.value })} /></FormField><FormField label="Location"><Input value={draft.location ?? ''} onChange={(e) => set({ location: e.target.value })} /></FormField><FormField label="Hold info"><Textarea value={draft.hold ? `Prior status: ${draft.priorStatus ?? ''}` : ''} readOnly /></FormField></FormSection> }]} /><div className="sticky bottom-0 flex justify-end gap-2 border-t bg-popover py-3"><Button variant="outline" onClick={() => window.print()}><Printer className="size-4" />Print</Button><Button onClick={onSave} loading={saving} kbd="Ctrl+S">Save</Button></div></div> }
function ActionDialog({ vehicle, action, containers, onClose, onSubmit, loading }: { vehicle: Vehicle; action: VehicleAction; containers: ContainerOption[]; onClose: () => void; onSubmit: (body: Record<string, unknown>) => void; loading: boolean }) { const [reason, setReason] = useState(''); const [inspectionDate, setInspectionDate] = useState(todayIso()); const [inspectedBy, setInspectedBy] = useState(''); const [containerId, setContainerId] = useState(vehicle.containerId ?? ''); const body = () => action === 'inspect' ? { inspectionDate, inspectedBy } : action === 'force-ready' ? { reason } : action === 'link-to-container' ? { containerId } : action === 'hold' || action === 'withdraw' ? { reason } : {}; const invalid = (action === 'inspect' && (!inspectionDate || !inspectedBy)) || (action === 'force-ready' && !reason.trim()) || (action === 'link-to-container' && !containerId); return <Dialog open onOpenChange={(v) => !v && onClose()}><DialogContent title={`${labelAction(action)} ${vehicle.vin}`} description="Only valid transitions are shown from the current state."><div className="space-y-3">{action === 'inspect' && <><FormField label="Inspection date" required><DateInput value={inspectionDate} onValueChange={setInspectionDate} /></FormField><FormField label="Inspected by" required><Input value={inspectedBy} onChange={(e) => setInspectedBy(e.target.value)} /></FormField></>}{['hold', 'force-ready', 'withdraw'].includes(action) && <FormField label="Reason" required={action === 'force-ready'}><Textarea value={reason} onChange={(e) => setReason(e.target.value)} /></FormField>}{action === 'link-to-container' && <FormField label="Container" required><Select value={containerId || undefined} onValueChange={setContainerId} options={containers.map((c) => ({ value: c.id, label: c.containerNo }))} /></FormField>}{action === 'title-rejected' && <p className="flex gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm"><ShieldAlert className="size-4" />This stamps title rejected sent; backend cascades to vehicles in the same container.</p>}<div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Close</Button><Button disabled={invalid} loading={loading} onClick={() => onSubmit(body())}>{labelAction(action)}</Button></div></div></DialogContent></Dialog> }
function PrintVehicle({ vehicle, onClose }: { vehicle: Vehicle; onClose: () => void }) { return <Dialog open onOpenChange={(v) => !v && onClose()}><DialogContent title="Printable dock / vehicle receipt"><div className="rounded-lg border bg-white p-6 text-slate-950"><div className="flex justify-between border-b pb-4"><div><h2 className="text-xl font-bold">Kornet Express</h2><p className="text-sm">Vehicle Receipt</p></div><div className="text-right font-mono"><p>{vehicle.wrNo ?? 'WR pending'}</p><p>{vehicle.vin}</p></div></div><div className="mt-4 grid grid-cols-2 gap-4 text-sm"><p><b>Vehicle:</b> {[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ') || '—'}</p><p><b>Status:</b> {vehicle.status}</p><p><b>Owner:</b> {vehicle.shipperName || '—'}</p><p><b>Consignee:</b> {vehicle.consigneeName || '—'}</p><p><b>Title:</b> {vehicle.titleReceived ? 'Received' : 'Pending'} {vehicle.titleNumber || ''}</p><p><b>Condition:</b> {vehicle.condition || '—'}</p></div></div><div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Close</Button><Button onClick={() => window.print()}><Printer className="size-4" />Print</Button></div></DialogContent></Dialog> }
function bulkReady(rows: Vehicle[], mutate: (v: { vehicle: Vehicle; action: VehicleAction; body?: Record<string, unknown> }) => void) { rows.filter((r) => validActions(r).includes('ready')).forEach((vehicle) => mutate({ vehicle, action: 'ready' })) }
function exportVehicle(v: Vehicle) { return { wrNo: v.wrNo, vin: v.vin, year: v.year, make: v.make, model: v.model, status: v.status, dateReceived: v.date, shipper: v.shipperName, consignee: v.consigneeName, containerId: v.containerId, titleReceived: v.titleReceived, grossKg: formatWeightKg(v.grossKg), cbm: formatNumber(v.cbm) } }

