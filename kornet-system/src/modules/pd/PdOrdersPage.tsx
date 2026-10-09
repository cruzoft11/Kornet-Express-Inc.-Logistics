import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, ClipboardCheck, FileDown, Printer, Search, Truck } from 'lucide-react'
import { toast } from 'sonner'
import { Button, Card, CardContent, CardHeader, CardTitle, DataGrid, type DataGridColumn, DateInput, Dialog, DialogContent, exportRowsToExcel, FormField, FormSection, Input, NumberInput, PageHeader, Select, Sheet, SheetContent, Skeleton, StatusPill, Tabs, Textarea, Timeline, Toolbar } from '@/components/ui'
import { KornetLoader } from '@/components/ui/KornetLoader'
import { useHotkeys } from '@/hooks/useHotkeys'
import { formatDate, formatMoney, formatNumber, formatWeightKg } from '@/lib/format'
import { pdApi, type Driver, type FleetVehicle, type PdOrder, type PdOrderInput } from '@/api/pd'
import { fleetApi, type DispatchRoute } from '@/api/fleet'

const pdTypes = ['PICKUP', 'DELIVERY', 'XDOCK', 'EXCHANGE', 'QUOTE'].map((value) => ({ value, label: value.replace('_', ' ') }))
const statuses = ['OPEN', 'DISPATCHED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED']
const blankOrder: PdOrderInput = { type: 'PICKUP', status: 'OPEN', date: new Date().toISOString(), currency: 'PHP', declaredValue: 0, insuredValue: 0, cod: false, codAmount: 0, hazardous: false }

function err(error: unknown) { return error instanceof Error ? error.message : 'Request failed' }
function todayIso(offset = 0) { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10) }
function asInputDate(value?: string | null) { return value ? value.slice(0, 10) : '' }
function asLocalDateTime(value?: string | null) { return value ? value.slice(0, 16) : '' }
function atEndOfDay(date: string) { return `${date}T23:59:59.999` }

export default function PdOrdersPage() {
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [quick, setQuick] = useState<'all' | 'today' | 'tomorrow'>('all')
  const [selected, setSelected] = useState<PdOrder | null>(null)
  const [draft, setDraft] = useState<PdOrderInput>(blankOrder)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [tab, setTab] = useState('order')
  const [dispatchOrder, setDispatchOrder] = useState<PdOrder | null>(null)
  const [podOrder, setPodOrder] = useState<PdOrder | null>(null)
  const [cancelOrder, setCancelOrder] = useState<PdOrder | null>(null)
  const [printOrder, setPrintOrder] = useState<PdOrder | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const params = useMemo(() => {
    const day = quick === 'today' ? todayIso() : quick === 'tomorrow' ? todayIso(1) : ''
    return { q, type: type || undefined, status: status || undefined, dateFrom: day || undefined, dateTo: day ? atEndOfDay(day) : undefined, dateField: 'date', include: 'relations' as const, pageSize: 200 }
  }, [q, type, status, quick])
  const orders = useQuery({ queryKey: ['pd-orders', params], queryFn: () => pdApi.list(params) })
  const drivers = useQuery({ queryKey: ['pd-drivers'], queryFn: () => pdApi.drivers() })
  const fleet = useQuery({ queryKey: ['pd-fleet'], queryFn: () => pdApi.fleetVehicles() })
  const routes = useQuery({ queryKey: ['pd-routes'], queryFn: () => fleetApi.routes() })
  const events = useQuery({ queryKey: ['pd-events', selected?.id], enabled: !!selected?.id, queryFn: () => pdApi.statusEvents(selected!.id) })

  const save = useMutation({ mutationFn: () => draft.id ? pdApi.update(draft.id, draft) : pdApi.create(draft), onSuccess: (row) => { toast.success(`P/D ${row.orderNo} saved`); setSelected(row); setDraft(row); qc.invalidateQueries({ queryKey: ['pd-orders'] }) }, onError: (e) => toast.error(err(e)) })
  const invalidateDispatchData = () => {
    for (const key of [['pd-orders'], ['pd-board'], ['pd-drivers'], ['pd-fleet'], ['pd-routes'], ['pd-board-drivers'], ['pd-board-fleet'], ['pd-board-routes']]) {
      qc.invalidateQueries({ queryKey: key })
    }
  }
  const dispatch = useMutation({ mutationFn: (v: { order: PdOrder; driverId: string; fleetVehicleId: string; routeId?: string }) => pdApi.dispatch(v.order.id, { driverId: v.driverId, fleetVehicleId: v.fleetVehicleId, routeId: v.routeId }), onSuccess: (row) => { toast.success(`${row.orderNo} dispatched`); setDispatchOrder(null); invalidateDispatchData() }, onError: (e) => toast.error(err(e)) })
  const complete = useMutation({ mutationFn: (v: { order: PdOrder; signedBy: string; podAt?: string; remarks?: string; signatureDataUrl?: string }) => pdApi.complete(v.order.id, v), onSuccess: (row) => { toast.success(`${row.orderNo} completed with POD`); setPodOrder(null); invalidateDispatchData() }, onError: (e) => toast.error(err(e)) })
  const cancel = useMutation({ mutationFn: (v: { order: PdOrder; reason: string }) => pdApi.cancel(v.order.id, v.reason), onSuccess: (row) => { toast.success(`${row.orderNo} cancelled`); setCancelOrder(null); invalidateDispatchData() }, onError: (e) => toast.error(err(e)) })

  const openNew = () => { setSelected(null); setDraft(blankOrder); setSheetOpen(true); setTab('order') }
  const openEdit = (row: PdOrder) => { setSelected(row); setDraft(row); setSheetOpen(true); setTab('order') }
  const rows = orders.data?.data ?? []
  useHotkeys([
    { key: 'N', description: 'New P/D order', handler: openNew },
    { key: '/', description: 'Search', handler: () => searchRef.current?.focus() },
    { key: 'Mod+S', description: 'Save', handler: () => sheetOpen && save.mutate(), when: sheetOpen },
    { key: 'Escape', description: 'Close sheet', handler: () => setSheetOpen(false), when: sheetOpen },
  ])

  const columns: DataGridColumn<PdOrder>[] = [
    { id: 'orderNo', header: 'Order #', accessor: 'orderNo', sortable: true, cell: (r) => <button className="font-mono font-semibold text-secondary underline-offset-4 hover:underline" onClick={() => openEdit(r)}>{r.orderNo}</button> },
    { id: 'type', header: 'Type', cell: (r) => <StatusPill status={r.type} tone="info" />, sortable: true },
    { id: 'status', header: 'Status', cell: (r) => <StatusPill status={r.status} />, sortable: true },
    { id: 'date', header: 'Date', cell: (r) => formatDate(r.date), sortable: true },
    { id: 'driver', header: 'Driver', cell: (r) => lookupDriver(r.driverId, drivers.data?.data) },
    { id: 'customer', header: 'Customer', cell: (r) => r.shipperName || r.consigneeName || '—' },
    { id: 'route', header: 'Route', cell: (r) => <span className="text-xs">{r.originAddr || '—'} → {r.destAddr || '—'}</span> },
    {
      id: 'actions',
      header: 'Actions',
      cell: (r) => (
        <div className="flex items-center gap-1">
          {r.status === 'OPEN' && (
            <Button size="sm" variant="secondary" className="h-7 px-2 text-xs" onClick={() => setDispatchOrder(r)}>
              Dispatch
            </Button>
          )}
          {['DISPATCHED', 'IN_TRANSIT'].includes(r.status) && (
            <Button size="sm" variant="secondary" className="h-7 px-2 text-xs" onClick={() => setPodOrder(r)}>
              POD
            </Button>
          )}
          {['OPEN', 'DISPATCHED'].includes(r.status) && (
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive hover:text-destructive" onClick={() => setCancelOrder(r)}>
              Cancel
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 px-1.5" onClick={() => setPrintOrder(r)} title="Print P/D ticket">
            <Printer className="size-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5 p-4 md:p-6 min-w-0 w-full overflow-hidden">
      <PageHeader
        title="P/D Orders"
        eyebrow="Operations"
        description="Manage pickup and delivery orders — dispatch, POD completion, and printable tickets."
        primaryAction={<Button onClick={openNew} kbd="N">New order</Button>}
        actions={<Button variant="outline" onClick={() => exportRowsToExcel(rows.map(exportPd), `pd-orders-${todayIso()}.xlsx`)}><FileDown className="size-4" />Excel</Button>}
      />
      <Toolbar>
        <Input ref={searchRef} leftIcon={<Search className="size-4" />} placeholder="Search order, customer, tracking…" value={q} onChange={(e) => setQ(e.target.value)} className="w-72" />
        <Select value={type || undefined} onValueChange={(v) => setType(v)} placeholder="All types" options={pdTypes} />
        <Select value={status || undefined} onValueChange={(v) => setStatus(v)} placeholder="All status" options={statuses.map((value) => ({ value, label: value }))} />
        <Button variant={quick === 'today' ? 'secondary' : 'outline'} onClick={() => setQuick(quick === 'today' ? 'all' : 'today')}><CalendarDays className="size-4" />Today</Button>
        <Button variant={quick === 'tomorrow' ? 'secondary' : 'outline'} onClick={() => setQuick(quick === 'tomorrow' ? 'all' : 'tomorrow')}>Tomorrow</Button>
      </Toolbar>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {statuses.map((s) => (
          <Card key={s} className="p-3 shadow-2xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.replace('_', ' ')}</p>
            <p className="mt-1 font-mono text-2xl font-bold">{rows.filter((r) => r.status === s).length}</p>
          </Card>
        ))}
      </div>
      {orders.isLoading ? (
        <div className="flex h-72 items-center justify-center rounded-2xl border bg-card">
          <KornetLoader size="md" label="Loading P/D orders…" />
        </div>
      ) : (
        <DataGrid columns={columns} data={rows} loading={false} emptyTitle="No P/D orders found" density="compact" />
      )}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent title={draft.id ? `Edit ${draft.orderNo}` : 'New P/D order'} description="Ctrl+S saves; Esc closes." className="w-[min(72rem,100vw)] overflow-y-auto">
          <OrderEditor draft={draft} setDraft={setDraft} tab={tab} setTab={setTab} onSave={() => save.mutate()} saving={save.isPending} />
        </SheetContent>
      </Sheet>
      {dispatchOrder && <DispatchDialog order={dispatchOrder} drivers={drivers.data?.data ?? []} vehicles={fleet.data?.data ?? []} routes={routes.data?.data ?? []} onClose={() => setDispatchOrder(null)} onSubmit={(driverId, fleetVehicleId, routeId) => dispatch.mutate({ order: dispatchOrder, driverId, fleetVehicleId, routeId })} loading={dispatch.isPending} />}
      {podOrder && <PodDialog order={podOrder} onClose={() => setPodOrder(null)} onSubmit={(v) => complete.mutate({ order: podOrder, ...v })} loading={complete.isPending} />}
      {cancelOrder && <CancelDialog order={cancelOrder} onClose={() => setCancelOrder(null)} onSubmit={(reason) => cancel.mutate({ order: cancelOrder, reason })} loading={cancel.isPending} />}
      {printOrder && <PrintDialog order={printOrder} onClose={() => setPrintOrder(null)} />}
      {selected && (
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-base">Status history — {selected.orderNo}</CardTitle></CardHeader>
          <CardContent>
            {events.isLoading ? (
              <Skeleton className="h-24" />
            ) : (
              <Timeline items={(events.data?.data ?? []).map((e) => ({ id: e.id, title: e.code, time: formatDate(e.eventAt), description: e.notes ?? e.subStatus ?? undefined, tone: e.code === 'POD' ? 'success' : e.code === 'DSP' ? 'info' : 'neutral' }))} />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function OrderEditor({ draft, setDraft, tab, setTab, onSave, saving }: { draft: PdOrderInput; setDraft: (v: PdOrderInput) => void; tab: string; setTab: (v: string) => void; onSave: () => void; saving: boolean }) {
  const set = (patch: PdOrderInput) => setDraft({ ...draft, ...patch })
  return <div className="space-y-4"><Tabs value={tab} onValueChange={setTab} tabs={[{ value: 'order', label: 'Order', content: <div className="space-y-4"><FormSection title="Header"><FormField label="P/D #"><Input value={draft.orderNo ?? 'Auto on save'} readOnly /></FormField><FormField label="Type" required><Select value={draft.type} onValueChange={(type) => set({ type })} options={pdTypes} /></FormField><FormField label="Date"><DateInput value={asInputDate(draft.date)} onValueChange={(date) => set({ date })} /></FormField><FormField label="Warehouse"><Input value={draft.warehouse ?? ''} onChange={(e) => set({ warehouse: e.target.value })} /></FormField><FormField label="Division"><Input value={draft.division ?? ''} onChange={(e) => set({ division: e.target.value })} /></FormField><FormField label="Shipment file ID"><Input value={draft.shipmentId ?? ''} onChange={(e) => set({ shipmentId: e.target.value })} placeholder="Paste linked shipment id" /></FormField><FormField label="Quote #"><Input value={draft.quoteNo ?? ''} onChange={(e) => set({ quoteNo: e.target.value })} /></FormField><FormField label="Shipping instruction"><Input value={draft.shippingInstructionNo ?? ''} onChange={(e) => set({ shippingInstructionNo: e.target.value })} /></FormField><FormField label="AWB/BL tracking ref"><Input value={draft.trackingNo ?? ''} onChange={(e) => set({ trackingNo: e.target.value })} /></FormField></FormSection><PartySection draft={draft} set={set} /><FormSection title="Pickup & delivery"><FormField label="Pickup address"><Textarea value={draft.originAddr ?? ''} onChange={(e) => set({ originAddr: e.target.value })} /></FormField><FormField label="Delivery address"><Textarea value={draft.destAddr ?? ''} onChange={(e) => set({ destAddr: e.target.value })} /></FormField><FormField label="Ready at"><Input type="datetime-local" value={asLocalDateTime(draft.readyAt)} onChange={(e) => set({ readyAt: e.target.value })} /></FormField><FormField label="Close at"><Input type="datetime-local" value={asLocalDateTime(draft.closeAt)} onChange={(e) => set({ closeAt: e.target.value })} /></FormField><FormField label="Deliver by"><Input type="datetime-local" value={asLocalDateTime(draft.deliverBy)} onChange={(e) => set({ deliverBy: e.target.value })} /></FormField><FormField label="Carrier / trucker party ID"><Input value={draft.carrierPartyId ?? ''} onChange={(e) => set({ carrierPartyId: e.target.value })} /></FormField><FormField label="Load #"><Input value={draft.loadNumber ?? ''} onChange={(e) => set({ loadNumber: e.target.value })} /></FormField><FormField label="Equipment"><Input value={draft.equipmentType ?? ''} onChange={(e) => set({ equipmentType: e.target.value })} /></FormField></FormSection></div> }, { value: 'cargo', label: 'Cargo', content: <FormSection title="Cargo and values"><FormField label="Container details"><Textarea value={draft.containerDetails ?? ''} onChange={(e) => set({ containerDetails: e.target.value })} /></FormField><FormField label="Marks"><Textarea value={draft.marks ?? ''} onChange={(e) => set({ marks: e.target.value })} /></FormField><FormField label="Declared value"><NumberInput value={draft.declaredValue ?? 0} onValueChange={(declaredValue) => set({ declaredValue })} /></FormField><FormField label="Insured value"><NumberInput value={draft.insuredValue ?? 0} onValueChange={(insuredValue) => set({ insuredValue })} /></FormField><FormField label="Currency"><Input value={draft.currency ?? 'PHP'} onChange={(e) => set({ currency: e.target.value.toUpperCase() })} /></FormField><FormField label="COD amount"><NumberInput value={draft.codAmount ?? 0} onValueChange={(codAmount) => set({ codAmount, cod: codAmount > 0 })} /></FormField></FormSection> }, { value: 'additional', label: 'Additional', content: <div className="space-y-4"><FormSection title="Instructions"><FormField label="Special instructions"><Textarea value={draft.instructions ?? ''} onChange={(e) => set({ instructions: e.target.value })} /></FormField><FormField label="Route ID"><Input value={draft.routeId ?? ''} onChange={(e) => set({ routeId: e.target.value })} /></FormField></FormSection><Card><CardHeader><CardTitle>Charges</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Existing trucking charges are loaded when returned by the API and exported with the order. Charge editing requires the backend charge owner endpoints; no fake charge rows are created here.</CardContent></Card></div> }]} /><div className="sticky bottom-0 flex justify-end gap-2 border-t bg-popover py-3"><Button variant="outline" type="button" onClick={() => window.print()}><Printer className="size-4" />Print HTML</Button><Button onClick={onSave} loading={saving} kbd="Ctrl+S">Save</Button></div></div>
}
function PartySection({ draft, set }: { draft: PdOrderInput; set: (p: PdOrderInput) => void }) { return <FormSection title="Parties"><FormField label="Third-party party ID"><Input value={draft.thirdPartyPartyId ?? ''} onChange={(e) => set({ thirdPartyPartyId: e.target.value })} /></FormField><FormField label="Shipper"><Input value={draft.shipperName ?? ''} onChange={(e) => set({ shipperName: e.target.value })} /></FormField><FormField label="Shipper contact"><Input value={draft.shipperContact ?? ''} onChange={(e) => set({ shipperContact: e.target.value })} /></FormField><FormField label="Shipper phone"><Input value={draft.shipperPhone ?? ''} onChange={(e) => set({ shipperPhone: e.target.value })} /></FormField><FormField label="Consignee"><Input value={draft.consigneeName ?? ''} onChange={(e) => set({ consigneeName: e.target.value })} /></FormField><FormField label="Consignee contact"><Input value={draft.consigneeContact ?? ''} onChange={(e) => set({ consigneeContact: e.target.value })} /></FormField><FormField label="Consignee phone"><Input value={draft.consigneePhone ?? ''} onChange={(e) => set({ consigneePhone: e.target.value })} /></FormField></FormSection> }
function DispatchDialog({ order, drivers, vehicles, routes, onClose, onSubmit, loading }: { order: PdOrder; drivers: Driver[]; vehicles: FleetVehicle[]; routes: DispatchRoute[]; onClose: () => void; onSubmit: (driverId: string, fleetVehicleId: string, routeId?: string) => void; loading: boolean }) {
  const assignedRoute = routes.find((route) => route.id === order.routeId);
  const [routeId, setRoute] = useState(order.routeId ?? '');
  const [driverId, setDriver] = useState(order.driverId ?? drivers.find((driver) => driver.name === assignedRoute?.driverName)?.id ?? '');
  const [fleetVehicleId, setVehicle] = useState(order.fleetVehicleId ?? vehicles.find((vehicle) => vehicle.plateNo === assignedRoute?.vehiclePlate)?.id ?? '');
  const selectedRoute = routes.find((route) => route.id === routeId);
  const assignedDriver = selectedRoute?.stage.toUpperCase() === 'IN_PROGRESS'
    ? drivers.find((driver) => driver.name === selectedRoute.driverName)
    : undefined;
  const assignedVehicle = selectedRoute?.stage.toUpperCase() === 'IN_PROGRESS'
    ? vehicles.find((vehicle) => vehicle.plateNo === selectedRoute.vehiclePlate)
    : undefined;
  const selectRoute = (id: string) => {
    if (id === '__none__') {
      setRoute('');
      setDriver('');
      setVehicle('');
      return;
    }
    setRoute(id);
    const route = routes.find((item) => item.id === id);
    const routeDriver = drivers.find((driver) => driver.name === route?.driverName);
    const routeVehicle = vehicles.find((vehicle) => vehicle.plateNo === route?.vehiclePlate);
    setDriver(routeDriver?.id ?? '');
    setVehicle(routeVehicle?.id ?? '');
  };
  const routeOptions = routes
    .filter((route) => route.stage.toUpperCase() !== 'COMPLETED')
    .map((route) => ({ value: route.id, label: `${route.routeNo} · ${route.origin || 'Origin'} → ${route.destination || 'Destination'} · ${route.stage}` }));
  const driverOptions = drivers
    .filter((driver) => driver.status.toUpperCase() === 'AVAILABLE' || driver.id === assignedDriver?.id)
    .map((driver) => ({ value: driver.id, label: `${driver.name}${driver.licenseNo ? ` · ${driver.licenseNo}` : ''} · ${driver.status}` }));
  const vehicleOptions = vehicles
    .filter((vehicle) => vehicle.status.toUpperCase() === 'AVAILABLE' || vehicle.id === assignedVehicle?.id)
    .map((vehicle) => ({ value: vehicle.id, label: `${vehicle.plateNo}${vehicle.type ? ` · ${vehicle.type}` : ''} · ${vehicle.status}` }));
  return <Dialog open onOpenChange={(v) => !v && onClose()}><DialogContent title={`Dispatch ${order.orderNo}`} description="Assign available resources, or join the resources already assigned to a route."><div className="space-y-3"><FormField label="Dispatch route"><Select value={routeId || undefined} onValueChange={selectRoute} options={[{ value: '__none__', label: 'No route' }, ...routeOptions]} /></FormField><FormField label="Driver" required><Select value={driverId || undefined} onValueChange={setDriver} options={driverOptions} /></FormField><FormField label="Fleet vehicle" required><Select value={fleetVehicleId || undefined} onValueChange={setVehicle} options={vehicleOptions} /></FormField><div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Close</Button><Button disabled={!driverId || !fleetVehicleId} loading={loading} onClick={() => onSubmit(driverId, fleetVehicleId, routeId || undefined)}><Truck className="size-4" />Dispatch</Button></div></div></DialogContent></Dialog>
}
function PodDialog({ order, onClose, onSubmit, loading }: { order: PdOrder; onClose: () => void; onSubmit: (v: { signedBy: string; podAt?: string; remarks?: string; signatureDataUrl?: string }) => void; loading: boolean }) { const [signedBy, setSignedBy] = useState(''); const [podAt, setPodAt] = useState(new Date().toISOString().slice(0, 16)); const [remarks, setRemarks] = useState(''); const [signatureDataUrl, setSignature] = useState(''); return <Dialog open onOpenChange={(v) => !v && onClose()}><DialogContent title={`Complete ${order.orderNo}`} description="POD completion requires the receiver/signatory."><div className="space-y-3"><FormField label="Signed by" required><Input value={signedBy} onChange={(e) => setSignedBy(e.target.value)} /></FormField><FormField label="POD date/time"><Input type="datetime-local" value={podAt} onChange={(e) => setPodAt(e.target.value)} /></FormField><FormField label="Remarks"><Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} /></FormField><FormField label="Signature / attachment reference"><><Textarea value={signatureDataUrl} onChange={(e) => setSignature(e.target.value)} /><p className="text-xs text-muted-foreground">Backend accepts signatureDataUrl text; binary photo upload endpoint is not exposed.</p></></FormField><div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Close</Button><Button disabled={!signedBy.trim()} loading={loading} onClick={() => onSubmit({ signedBy, podAt, remarks, signatureDataUrl })}><ClipboardCheck className="size-4" />Complete</Button></div></div></DialogContent></Dialog> }
function CancelDialog({ order, onClose, onSubmit, loading }: { order: PdOrder; onClose: () => void; onSubmit: (reason: string) => void; loading: boolean }) { const [reason, setReason] = useState(''); return <Dialog open onOpenChange={(v) => !v && onClose()}><DialogContent title={`Cancel ${order.orderNo}`} description="Cancellation reason is sent to the backend action."><FormField label="Reason" required><Textarea value={reason} onChange={(e) => setReason(e.target.value)} /></FormField><div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Close</Button><Button variant="destructive" disabled={!reason.trim()} loading={loading} onClick={() => onSubmit(reason)}>Cancel order</Button></div></DialogContent></Dialog> }
function PrintDialog({ order, onClose }: { order: PdOrder; onClose: () => void }) { return <Dialog open onOpenChange={(v) => !v && onClose()}><DialogContent title="Printable P/D order / delivery receipt" className="w-[min(54rem,calc(100vw-2rem))]"><div className="rounded-lg border bg-white p-6 text-slate-950 print:border-0"><div className="flex justify-between border-b pb-4"><div><h2 className="text-xl font-bold">Kornet Express</h2><p className="text-sm">Pickup / Delivery Order</p></div><div className="text-right font-mono"><p>{order.orderNo}</p><p>{formatDate(order.date)}</p></div></div><div className="mt-4 grid grid-cols-2 gap-4 text-sm"><p><b>Type:</b> {order.type}</p><p><b>Status:</b> {order.status}</p><p><b>Shipper:</b> {order.shipperName || '—'}</p><p><b>Consignee:</b> {order.consigneeName || '—'}</p><p><b>Pickup:</b> {order.originAddr || '—'}</p><p><b>Delivery:</b> {order.destAddr || '—'}</p><p><b>Tracking:</b> {order.trackingNo || '—'}</p><p><b>Load #:</b> {order.loadNumber || '—'}</p></div><p className="mt-4 text-sm"><b>Instructions:</b> {order.instructions || '—'}</p><div className="mt-10 grid grid-cols-2 gap-8 text-sm"><span className="border-t pt-2">Driver</span><span className="border-t pt-2">Received by / Date</span></div></div><div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Close</Button><Button onClick={() => window.print()}><Printer className="size-4" />Print</Button></div></DialogContent></Dialog> }
function lookupDriver(id?: string | null, rows?: Driver[]) { return rows?.find((d) => d.id === id)?.name ?? '—' }
function exportPd(r: PdOrder) { return { orderNo: r.orderNo, type: r.type, status: r.status, date: r.date, shipper: r.shipperName, consignee: r.consigneeName, trackingNo: r.trackingNo, declaredValue: formatMoney(r.declaredValue ?? 0, r.currency), pieces: r.cargoLines?.reduce((s, l) => s + Number(l.pieces ?? 0), 0) ?? 0, weight: formatWeightKg(r.cargoLines?.reduce((s, l) => s + Number(l.grossKg ?? 0), 0) ?? 0), cbm: formatNumber(r.cargoLines?.reduce((s, l) => s + Number(l.cbm ?? 0), 0) ?? 0) } }
