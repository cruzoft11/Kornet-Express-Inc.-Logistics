import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button, Card, CardContent, CardHeader, CardTitle, Dialog, DialogContent, EmptyState, FormField, PageHeader, Select, StatusPill, Toolbar } from '@/components/ui'
import { formatDate } from '@/lib/format'
import { pdApi, type Driver, type FleetVehicle, type PdOrder } from '@/api/pd'

const columns = ['OPEN', 'DISPATCHED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED']
function err(e: unknown) { return e instanceof Error ? e.message : 'Request failed' }
function todayIso() { return new Date().toISOString().slice(0, 10) }

export default function PdDispatchBoard() {
  const qc = useQueryClient()
  const [scope, setScope] = useState<'today' | 'all'>('today')
  const [dragged, setDragged] = useState<PdOrder | null>(null)
  const [dispatchOrder, setDispatchOrder] = useState<PdOrder | null>(null)
  const params = useMemo(() => scope === 'today' ? { dateFrom: todayIso(), dateTo: `${todayIso()}T23:59:59.999`, dateField: 'date', include: 'relations' as const, pageSize: 200 } : { include: 'relations' as const, pageSize: 200 }, [scope])
  const orders = useQuery({ queryKey: ['pd-board', params], queryFn: () => pdApi.list(params) })
  const drivers = useQuery({ queryKey: ['pd-board-drivers'], queryFn: () => pdApi.drivers() })
  const fleet = useQuery({ queryKey: ['pd-board-fleet'], queryFn: () => pdApi.fleetVehicles() })
  const dispatch = useMutation({ mutationFn: (v: { order: PdOrder; driverId: string; fleetVehicleId: string }) => pdApi.dispatch(v.order.id, { driverId: v.driverId, fleetVehicleId: v.fleetVehicleId }), onSuccess: (row) => { toast.success(`${row.orderNo} dispatched`); setDispatchOrder(null); qc.invalidateQueries({ queryKey: ['pd-board'] }) }, onError: (e) => toast.error(err(e)) })
  const rows = orders.data?.data ?? []
  return <div className="space-y-5 p-4 md:p-6"><PageHeader title="P/D Dispatch Board" eyebrow="Operations" description="Drag an OPEN run into Dispatch to assign a driver and fleet vehicle." actions={<Button variant={scope === 'today' ? 'secondary' : 'outline'} onClick={() => setScope(scope === 'today' ? 'all' : 'today')}>{scope === 'today' ? "Today's runs" : 'All runs'}</Button>} />
    <Toolbar><span className="text-sm text-muted-foreground">{rows.length} runs visible</span></Toolbar>
    <div className="grid gap-3 xl:grid-cols-5">{columns.map((status) => <Card key={status} className="min-h-[32rem]" onDragOver={(e) => e.preventDefault()} onDrop={() => { if (status === 'DISPATCHED' && dragged?.status === 'OPEN') setDispatchOrder(dragged); setDragged(null) }}><CardHeader className="border-b py-3"><CardTitle className="flex items-center justify-between text-sm"><StatusPill status={status} /><span className="font-mono">{rows.filter((r) => r.status === status).length}</span></CardTitle></CardHeader><CardContent className="space-y-2 p-3">{rows.filter((r) => r.status === status).map((r) => <article key={r.id} draggable={r.status === 'OPEN'} onDragStart={() => setDragged(r)} className="cursor-grab rounded-lg border bg-background p-3 shadow-sm active:cursor-grabbing"><div className="flex items-start justify-between gap-2"><p className="font-mono text-sm font-semibold">{r.orderNo}</p><StatusPill status={r.type} tone="info" /></div><p className="mt-2 text-sm font-medium">{r.shipperName || r.consigneeName || 'No customer'}</p><p className="mt-1 text-xs text-muted-foreground">{r.originAddr || '—'} → {r.destAddr || '—'}</p><p className="mt-2 text-xs text-muted-foreground">{formatDate(r.date)} · {r.trackingNo || 'No tracking ref'}</p>{r.status === 'OPEN' && <Button className="mt-3 w-full" size="sm" variant="outline" onClick={() => setDispatchOrder(r)}>Dispatch</Button>}</article>)}{!rows.filter((r) => r.status === status).length && <EmptyState title="No runs" description="No P/D orders in this column." />}</CardContent></Card>)}</div>
    {dispatchOrder && <DispatchDialog order={dispatchOrder} drivers={drivers.data?.data ?? []} vehicles={fleet.data?.data ?? []} onClose={() => setDispatchOrder(null)} onSubmit={(driverId, fleetVehicleId) => dispatch.mutate({ order: dispatchOrder, driverId, fleetVehicleId })} loading={dispatch.isPending} />}
  </div>
}
function DispatchDialog({ order, drivers, vehicles, onClose, onSubmit, loading }: { order: PdOrder; drivers: Driver[]; vehicles: FleetVehicle[]; onClose: () => void; onSubmit: (driverId: string, fleetVehicleId: string) => void; loading: boolean }) { const [driverId, setDriver] = useState(order.driverId ?? ''); const [fleetVehicleId, setVehicle] = useState(order.fleetVehicleId ?? ''); return <Dialog open onOpenChange={(v) => !v && onClose()}><DialogContent title={`Dispatch ${order.orderNo}`} description="Choose driver and truck to move this run into Dispatch."><div className="space-y-3"><FormField label="Driver" required><Select value={driverId || undefined} onValueChange={setDriver} options={drivers.map((d) => ({ value: d.id, label: d.name }))} /></FormField><FormField label="Fleet vehicle" required><Select value={fleetVehicleId || undefined} onValueChange={setVehicle} options={vehicles.map((v) => ({ value: v.id, label: v.plateNo }))} /></FormField><div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Close</Button><Button disabled={!driverId || !fleetVehicleId} loading={loading} onClick={() => onSubmit(driverId, fleetVehicleId)}>Dispatch</Button></div></div></DialogContent></Dialog> }
