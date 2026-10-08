import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Columns2,
  Copy,
  FileCheck,
  FilePlus2,
  FileText,
  LayoutGrid,
  Maximize2,
  Navigation,
  Plane,
  Save,
  ShieldCheck,
  Ship,
  Sparkles,
  TrendingUp,
  Truck,
} from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataGrid,
  Dialog,
  DialogContent,
  EmptyState,
  Input,
  KornetLoader,
  PageHeader,
  Select,
  StatCard,
  StatusPill,
  Stepper,
  Tabs,
  Textarea,
  Toolbar,
} from '@/components/ui'
import {
  opsApi,
  shipmentModeParts,
  type CargoLine,
  type ChargeLine,
  type ContainerLine,
  type Shipment,
  type TransportDoc,
  type WorkspaceMode,
} from '@/api/ops'
import { useHotkeys } from '@/hooks/useHotkeys'
import { formatDate, formatMoney } from '@/lib/format'
import {
  apiErrorMessage,
  cargoTotals,
  computeCargoLine,
  computeChargeLine,
  financialTotals,
  isAirMode,
  newCargoLine,
  STATUS_STEPS,
} from './utils'
import { MarginBadge, SearchBox, useDebouncedValue, useDirtySnapshot } from './components/common'
import { openPrintWindow, shipmentDocumentHtml } from './components/print'
import {
  AccountingTab,
  AuditTab,
  CargoTab,
  ChargesTab,
  CloseTab,
  ContainersTab,
  DocsTab,
  DocumentsTab,
  GeneralTab,
  ImportTab,
  TimelineTab,
} from './components/ShipmentTabs'

type ShipmentWorkspaceProps = { mode?: WorkspaceMode }
type ViewLayout = 'table' | 'split' | 'editor'

const listFilterKey = 'kornet.ops.shipmentFilters'

function defaultShipment(mode?: WorkspaceMode): Partial<Shipment> {
  const parts = mode ? shipmentModeParts(mode) : { mode: 'OCEAN', direction: 'EXPORT' }
  return {
    mode: parts.mode,
    direction: parts.direction,
    status: 'BOOKED',
    fileType: 'DIRECT',
    loadType: parts.mode === 'AIR' ? 'AIR' : parts.mode === 'DOMESTIC' ? 'LTL' : 'LCL',
    freightTerm: 'PREPAID',
    currency: 'PHP',
    exchangeRate: 1,
  }
}

function blankCharge(index: number): ChargeLine {
  return {
    billingCode: 'MISC',
    description: '',
    chargeSide: 'BOTH',
    freightTerm: 'PREPAID',
    billParty: 'SHIPPER',
    unit: 'PER_SHPT',
    qty: 1,
    rate: 0,
    minAmount: 0,
    currency: 'PHP',
    exchangeRate: 1,
    amount: 0,
    amountPhp: 0,
    vatClass: 'VATABLE',
    showOnDoc: true,
    costQty: 1,
    costRate: 0,
    costCurrency: 'PHP',
    costExchangeRate: 1,
    costAmount: 0,
    costAmountPhp: 0,
    billStatus: 'OPEN',
    costStatus: 'OPEN',
    sortOrder: index,
  }
}

function workflowIndex(status?: string) {
  const index = STATUS_STEPS.indexOf(status || 'BOOKED')
  return index >= 0 ? index : 0
}

function statusCodeFor(status: string) {
  const map: Record<string, string> = {
    BOOKED: 'BKD',
    LOADED: 'LDD',
    IN_TRANSIT: 'DEP',
    ARRIVED: 'ARR',
    CLEARED: 'CUS',
    DELIVERED: 'DLV',
    CLOSED: 'CLS',
  }
  return map[status] ?? status
}

export function ShipmentWorkspace({ mode }: ShipmentWorkspaceProps) {
  const params = useParams()
  const routeId = params.id
  const modeInfo = mode ? shipmentModeParts(mode) : undefined
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // View mode layout: table (full list) | split (side-by-side) | editor (full focused edit)
  const [layout, setLayout] = useState<ViewLayout>(routeId || !mode ? 'editor' : 'table')

  const [filters, setFilters] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`${listFilterKey}.${mode || 'detail'}`) || '{}') as Record<string, string>
    } catch {
      return {}
    }
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
  const { dirty, markClean } = useDirtySnapshot({ draft, cargo, containers, charges, docs })

  useEffect(() => {
    localStorage.setItem(`${listFilterKey}.${mode || 'detail'}`, JSON.stringify(filters))
  }, [filters, mode])

  useEffect(() => {
    if (routeId) {
      setSelectedId(routeId)
      setLayout('editor')
    }
  }, [routeId])

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [dirty])

  const listQuery = useQuery({
    queryKey: ['ops', 'shipments', mode, filters, debouncedSearch],
    queryFn: () =>
      opsApi.listShipments({
        ...filters,
        q: debouncedSearch,
        mode: modeInfo?.mode,
        direction: modeInfo?.direction,
      }),
    enabled: Boolean(mode),
  })

  const shipmentQuery = useQuery({
    queryKey: ['ops', 'shipment', selectedId],
    queryFn: () => opsApi.getShipment(selectedId),
    enabled: Boolean(selectedId),
  })

  const eventsQuery = useQuery({
    queryKey: ['ops', 'events', selectedId],
    queryFn: () => opsApi.listStatusEvents('SHIPMENT', selectedId),
    enabled: Boolean(selectedId),
  })

  const closeCheckQuery = useQuery({
    queryKey: ['ops', 'close-check', selectedId],
    queryFn: () => opsApi.closeCheck(selectedId),
    enabled: closeOpen && Boolean(selectedId),
  })

  useEffect(() => {
    if (!shipmentQuery.data) return
    const sh = shipmentQuery.data
    setDraft(sh)
    setCargo(sh.cargoLines?.length ? sh.cargoLines : [newCargoLine(1)])
    setContainers(sh.containers ?? [])
    setCharges(sh.charges?.length ? sh.charges : [blankCharge(0)])
    setDocs(sh.transportDocs ?? [])
    markClean({
      draft: sh,
      cargo: sh.cargoLines ?? [],
      containers: sh.containers ?? [],
      charges: sh.charges ?? [],
      docs: sh.transportDocs ?? [],
    })
  }, [markClean, shipmentQuery.data])

  const computedCargo = useMemo(() => cargo.map((line) => computeCargoLine(line, air)), [air, cargo])
  const computedCharges = useMemo(
    () => computeChargeLine ? charges.map((line) => computeChargeLine(line, draft, computedCargo, containers, air)) : charges,
    [air, charges, computedCargo, containers, draft],
  )
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
      const initialDocIds = (shipmentQuery.data?.transportDocs ?? []).map((d) => d.id).filter(Boolean) as string[]
      const currentDocIds = new Set(docs.map((d) => d.id).filter(Boolean))
      for (const removedId of initialDocIds) {
        if (!currentDocIds.has(removedId)) {
          await opsApi.deleteTransportDoc(removedId)
        }
      }
      for (const doc of docs) {
        const payload = {
          ...doc,
          shipmentId: shipment.id,
          docNo: doc.docNo || `${doc.docType || (draft.mode === 'AIR' ? 'AWB' : 'BL')}-${shipment.fileNo || 'DRAFT'}`,
        }
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
      markClean({
        draft: shipment,
        cargo: shipment.cargoLines ?? [],
        containers: shipment.containers ?? [],
        charges: shipment.charges ?? [],
        docs: shipment.transportDocs ?? [],
      })
      queryClient.invalidateQueries({ queryKey: ['ops'] })
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  })

  const createMutation = useMutation({
    mutationFn: () => opsApi.createShipment(defaultShipment(mode)),
    onSuccess: (shipment) => {
      toast.success(`Created ${shipment.fileNo}`)
      setSelectedId(shipment.id)
      setLayout('editor')
      if (modeInfo?.path) {
        navigate(`${modeInfo.path}?file=${shipment.id}`)
      }
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  })

  const statusMutation = useMutation({
    mutationFn: (status: string) => opsApi.setShipmentStatus(String(draft.id), status, statusCodeFor(status)),
    onSuccess: (res) => {
      toast.success(`Status updated to ${res.shipment.status}`)
      setDraft(res.shipment)
      queryClient.invalidateQueries({ queryKey: ['ops'] })
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  })

  const simpleAction = useMutation({
    mutationFn: async (action: string) => {
      if (!draft.id) throw new Error('Open a shipment first.')
      if (action === 'tariffs') return opsApi.applyTariffs(draft.id)
      if (action === 'invoice') return opsApi.generateInvoices(draft.id)
      if (action === 'ap') return opsApi.generateApBills(draft.id)
      if (action === 'clone') return opsApi.cloneShipment(draft.id)
      throw new Error('Unknown action')
    },
    onSuccess: (result, action) => {
      if (action === 'clone' && typeof result === 'object' && result && 'id' in result) {
        setSelectedId((result as Shipment).id)
        setLayout('editor')
      }
      toast.success('Action completed')
      queryClient.invalidateQueries({ queryKey: ['ops'] })
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  })

  const closeMutation = useMutation({
    mutationFn: () => opsApi.closeShipment(String(draft.id), overrideReason),
    onSuccess: (shipment) => {
      toast.success(`${shipment.fileNo} closed`)
      setDraft(shipment)
      setCloseOpen(false)
      queryClient.invalidateQueries({ queryKey: ['ops'] })
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  })

  const reopenMutation = useMutation({
    mutationFn: () => opsApi.reopenShipment(String(draft.id), reopenReason),
    onSuccess: (shipment) => {
      toast.success(`${shipment.fileNo} reopened`)
      setDraft(shipment)
      setReopenReason('')
      queryClient.invalidateQueries({ queryKey: ['ops'] })
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  })

  const milestoneMutation = useMutation({
    mutationFn: () => opsApi.createStatusEvent({ entityType: 'SHIPMENT', entityId: String(draft.id), ...milestone }),
    onSuccess: () => {
      toast.success('Milestone added')
      setMilestone({ code: 'BKD', location: '', notes: '', isPublic: true })
      queryClient.invalidateQueries({ queryKey: ['ops', 'events', selectedId] })
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  })

  const printDocument = useCallback(
    (kind: string) => {
      if (!draft.id) {
        toast.error('Save the shipment before printing.')
        return
      }
      opsApi
        .documentPayload(draft.id, kind)
        .then((payload) => openPrintWindow(`${draft.fileNo} ${kind}`, shipmentDocumentHtml(payload)))
        .catch((error: unknown) => toast.error(apiErrorMessage(error)))
    },
    [draft.fileNo, draft.id],
  )

  const saveAndClose = useCallback(() => {
    saveMutation.mutate(undefined, {
      onSuccess: () => {
        if (mode) setLayout('table')
        else navigate('/dashboard')
      },
    })
  }, [mode, navigate, saveMutation])

  useHotkeys([
    { key: 'Mod+S', description: 'Save file', handler: () => saveMutation.mutate() },
    { key: 'Mod+Enter', description: 'Save and close', handler: saveAndClose },
    { key: 'N', description: 'New file', handler: () => createMutation.mutate(), when: Boolean(mode) },
    { key: '/', description: 'Focus shipment search', handler: () => document.getElementById('shipment-search')?.focus(), when: Boolean(mode) },
    ...['general', 'import', 'cargo', 'containers', 'docs', 'charges', 'timeline', 'documents', 'accounting', 'close', 'audit'].map(
      (value, index) => ({
        key: `Alt+${index + 1}`,
        description: `Open ${value}`,
        handler: () => setTab(value),
      }),
    ),
  ])

  const updateDraft = (patch: Partial<Shipment>) => setDraft((current) => ({ ...current, ...patch }))
  const rows = listQuery.data?.data ?? []

  // Metrics for current mode
  const metrics = useMemo(() => {
    const activeFiles = rows.filter((r) => !['CLOSED', 'CANCELLED'].includes(r.status)).length
    const inTransit = rows.filter((r) => ['IN_TRANSIT', 'LOADED'].includes(r.status)).length
    const cleared = rows.filter((r) => ['CLEARED', 'DELIVERED'].includes(r.status)).length
    const totalMargin = rows.reduce((acc, r) => {
      const bill = r.charges?.reduce((s, c) => s + Number(c.amountPhp || 0), 0) ?? 0
      const cost = r.charges?.reduce((s, c) => s + Number(c.costAmountPhp || 0), 0) ?? 0
      return acc + (bill - cost)
    }, 0)
    return { activeFiles, inTransit, cleared, totalMargin }
  }, [rows])

  const handleOpenRow = (fileId: string) => {
    setSelectedId(fileId)
    setLayout('editor')
  }

  // Renders the Specialized File Editor Card
  const renderEditorCard = () => {
    const activeFileMode = (draft.mode || (mode ? shipmentModeParts(mode).mode : air ? 'AIR' : 'OCEAN')).toUpperCase()
    const isModeDomestic = activeFileMode.includes('DOMESTIC')
    const isModeAir = !isModeDomestic && activeFileMode.includes('AIR')
    const isModeOcean = !isModeDomestic && !isModeAir

    const processStages = isModeDomestic
      ? [
          { id: 'st-general', num: '1', title: 'Parties & Dispatch', targetTab: 'general', icon: Truck },
          { id: 'st-cargo', num: '2', title: 'Cargo Manifest', targetTab: 'cargo', icon: FileText },
          { id: 'st-docs', num: '3', title: 'Delivery Receipts (DR)', targetTab: 'docs', icon: FileCheck },
          { id: 'st-charges', num: '4', title: 'Trucking Rates & Margin', targetTab: 'charges', icon: TrendingUp },
          { id: 'st-timeline', num: '5', title: 'Delivery Milestones', targetTab: 'timeline', icon: Navigation },
          { id: 'st-acct', num: '6', title: 'Invoicing & Close', targetTab: 'accounting', icon: ShieldCheck },
        ]
      : isModeAir
      ? [
          { id: 'st-general', num: '1', title: 'Flight & AWB Booking', targetTab: 'general', icon: Plane },
          ...(draft.direction === 'IMPORT' ? [{ id: 'st-imp', num: '2', title: 'Airport Customs', targetTab: 'import', icon: ShieldCheck }] : []),
          { id: 'st-cargo', num: draft.direction === 'IMPORT' ? '3' : '2', title: 'Air Cargo (Volumetric)', targetTab: 'cargo', icon: FileText },
          { id: 'st-docs', num: draft.direction === 'IMPORT' ? '4' : '3', title: 'Air Waybills (AWB)', targetTab: 'docs', icon: FileCheck },
          { id: 'st-charges', num: draft.direction === 'IMPORT' ? '5' : '4', title: 'Tariffs & Margin', targetTab: 'charges', icon: TrendingUp },
          { id: 'st-timeline', num: draft.direction === 'IMPORT' ? '6' : '5', title: 'Flight Milestones', targetTab: 'timeline', icon: Navigation },
          { id: 'st-acct', num: draft.direction === 'IMPORT' ? '7' : '6', title: 'Invoicing & Close', targetTab: 'accounting', icon: ShieldCheck },
        ]
      : [
          { id: 'st-general', num: '1', title: 'Vessel & Route', targetTab: 'general', icon: Ship },
          ...(draft.direction === 'IMPORT' ? [{ id: 'st-imp', num: '2', title: 'Port Customs', targetTab: 'import', icon: ShieldCheck }] : []),
          { id: 'st-cargo', num: draft.direction === 'IMPORT' ? '3' : '2', title: 'Cargo Specs', targetTab: 'cargo', icon: FileText },
          { id: 'st-containers', num: draft.direction === 'IMPORT' ? '4' : '3', title: 'Container Stuffing', targetTab: 'containers', icon: Columns2 },
          { id: 'st-docs', num: draft.direction === 'IMPORT' ? '5' : '4', title: 'Bills of Lading (B/L)', targetTab: 'docs', icon: FileCheck },
          { id: 'st-charges', num: draft.direction === 'IMPORT' ? '6' : '5', title: 'Tariffs & Margin', targetTab: 'charges', icon: TrendingUp },
          { id: 'st-timeline', num: draft.direction === 'IMPORT' ? '7' : '6', title: 'Vessel Milestones', targetTab: 'timeline', icon: Navigation },
          { id: 'st-acct', num: draft.direction === 'IMPORT' ? '8' : '7', title: 'Invoicing & Close', targetTab: 'accounting', icon: ShieldCheck },
        ]

    const dynamicTabs = [
      {
        value: 'general',
        label: isModeDomestic ? 'Dispatch & Route' : isModeAir ? 'Flight & Route' : 'Vessel & Route',
        content: (
          <GeneralTab
            draft={draft}
            mode={activeFileMode}
            air={isModeAir}
            update={updateDraft}
            onNext={() => setTab(draft.direction === 'IMPORT' && !isModeDomestic ? 'import' : 'cargo')}
          />
        ),
      },
      ...(draft.direction === 'IMPORT' && !isModeDomestic
        ? [
            {
              value: 'import',
              label: isModeAir ? 'Airport Customs (BOC)' : 'Port Customs (BOC)',
              content: (
                <ImportTab
                  draft={draft}
                  update={updateDraft}
                  disabled={false}
                  onNext={() => setTab('cargo')}
                />
              ),
            },
          ]
        : []),
      {
        value: 'cargo',
        label: isModeDomestic ? 'Cargo Manifest' : isModeAir ? 'Air Cargo Specs' : 'Cargo Specs',
        content: (
          <CargoTab
            air={isModeAir}
            mode={activeFileMode}
            cargo={computedCargo}
            setCargo={setCargo}
            totals={cargoSummary}
            pasteText={pasteText}
            setPasteText={setPasteText}
            onNext={() => setTab(isModeOcean ? 'containers' : 'docs')}
          />
        ),
      },
      ...(isModeOcean
        ? [
            {
              value: 'containers',
              label: 'Container Stuffing',
              content: (
                <ContainersTab
                  ocean={isModeOcean}
                  shipmentId={String(draft.id || '')}
                  containers={containers}
                  setContainers={setContainers}
                  onNext={() => setTab('docs')}
                />
              ),
            },
          ]
        : []),
      {
        value: 'docs',
        label: isModeDomestic ? 'Delivery Receipts (DR)' : isModeAir ? 'Air Waybills (AWB)' : 'Bills of Lading (B/L)',
        content: (
          <DocsTab
            air={isModeAir}
            mode={activeFileMode}
            draft={draft}
            cargo={computedCargo}
            docs={docs}
            setDocs={setDocs}
            onNext={() => setTab('charges')}
          />
        ),
      },
      {
        value: 'charges',
        label: isModeDomestic ? 'Trucking Rates & Margin' : isModeAir ? 'Air Tariffs & Margin' : 'Tariffs & Margin',
        content: (
          <ChargesTab
            draft={draft}
            air={isModeAir}
            cargo={computedCargo}
            containers={containers}
            charges={computedCharges}
            setCharges={setCharges}
            applyTariffs={() => simpleAction.mutate('tariffs')}
            loading={simpleAction.isPending}
            totals={moneyTotals}
          />
        ),
      },
      {
        value: 'timeline',
        label: isModeDomestic ? 'Delivery Milestones' : isModeAir ? 'Flight Milestones' : 'Vessel Milestones',
        content: (
          <TimelineTab
            events={eventsQuery.data?.data ?? []}
            milestone={milestone}
            setMilestone={setMilestone}
            add={() => milestoneMutation.mutate()}
            status={(status) => statusMutation.mutate(status)}
          />
        ),
      },
      {
        value: 'documents',
        label: 'Printouts',
        content: <DocumentsTab air={isModeAir} print={printDocument} />,
      },
      {
        value: 'accounting',
        label: 'Accounting Bridge',
        content: (
          <AccountingTab
            fileId={draft.id}
            generateInvoices={() => simpleAction.mutate('invoice')}
            generateAp={() => simpleAction.mutate('ap')}
            loading={simpleAction.isPending}
          />
        ),
      },
      {
        value: 'close',
        label: 'Close Gate',
        content: (
          <CloseTab
            status={draft.status}
            openClose={() => setCloseOpen(true)}
            reopenReason={reopenReason}
            setReopenReason={setReopenReason}
            reopen={() => reopenMutation.mutate()}
          />
        ),
      },
      {
        value: 'audit',
        label: 'Audit Trail',
        content: <AuditTab draft={draft} />,
      },
    ]

    return (
      <Card className="w-full min-w-0 border-border/80 shadow-xs">
        <CardHeader className="border-b bg-card/60 pb-4">
          {draft.id ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xl font-bold tracking-tight text-foreground">{draft.fileNo}</span>
                    {mode && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLayout('table')}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        <ArrowLeft className="mr-1 size-3.5" /> Back to Table
                      </Button>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {draft.mode} {draft.direction} · {draft.loadType} · Lane: {draft.polCode || '—'} → {draft.podCode || '—'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill status={draft.status || 'DRAFT'} />
                  <StatusPill status={draft.mode || 'MODE'} tone="info" />
                  <MarginBadge bill={moneyTotals.bill} cost={moneyTotals.cost} />
                </div>
              </div>
              <div className="w-full min-w-0 overflow-x-auto py-1 custom-scrollbar">
                <Stepper steps={STATUS_STEPS} current={workflowIndex(draft.status)} />
              </div>
            </div>
          ) : (
            <CardTitle className="text-base">No file selected</CardTitle>
          )}
        </CardHeader>
        <CardContent className="w-full min-w-0 pt-4">
          {!draft.id && !mode ? (
            <EmptyState
              title="Open a shipment file"
              description="Use a mode list route or pass /logistics/files/:id after converting a quote."
            />
          ) : (
            <div className="space-y-4">
              {/* Interactive Process Flow Stage Navigator */}
              <div className="rounded-xl border bg-muted/30 p-2.5 shadow-2xs">
                <div className="flex items-center justify-between px-2 pb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-primary" />
                    {isModeDomestic
                      ? 'Straightforward Domestic Trucking Flow'
                      : isModeAir
                      ? 'Straightforward IATA Air Cargo Flow'
                      : 'Straightforward Ocean Freight Flow'}
                  </span>
                  <span className="text-[10px] font-normal text-muted-foreground">
                    Click any stage to navigate directly
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto p-0.5 custom-scrollbar">
                  {processStages.map((st) => {
                    const isActive = tab === st.targetTab
                    const Icon = st.icon
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setTab(st.targetTab)}
                        className={`group flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${
                          isActive
                            ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                            : 'border-border/60 bg-card text-foreground hover:border-primary/50 hover:bg-muted/60'
                        }`}
                      >
                        <span
                          className={`flex size-4.5 items-center justify-center rounded-full text-[10px] font-bold ${
                            isActive
                              ? 'bg-primary-foreground/20 text-primary-foreground'
                              : 'bg-muted text-muted-foreground group-hover:text-foreground'
                          }`}
                        >
                          {st.num}
                        </span>
                        <Icon className="size-3.5 shrink-0" />
                        <span className="whitespace-nowrap">{st.title}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Dynamic Mode-Tailored Tabs */}
              <Tabs value={tab} onValueChange={setTab} tabs={dynamicTabs} />
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full min-w-0 space-y-4">
      {/* Workspace Header */}
      <PageHeader
        title={modeInfo?.label ?? (draft.fileNo ? `File ${draft.fileNo}` : 'Shipment file')}
        eyebrow="Operations"
        description="Freight booking, cargo, charges, milestones, and documents."
        primaryAction={
          mode ? (
            <Button onClick={() => createMutation.mutate()} loading={createMutation.isPending} kbd="N">
              <FilePlus2 className="size-4" /> Quick create
            </Button>
          ) : undefined
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {dirty && <StatusPill status="Unsaved changes" tone="warning" />}

            {/* Layout Switcher (when mode is provided) */}
            {mode && (
              <div className="flex items-center rounded-lg border bg-card p-0.5 shadow-2xs">
                <Button
                  variant={layout === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setLayout('table')}
                  className="h-8 gap-1.5 px-2.5 text-xs"
                >
                  <LayoutGrid className="size-3.5" /> Table
                </Button>
                <Button
                  variant={layout === 'split' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setLayout('split')}
                  className="h-8 gap-1.5 px-2.5 text-xs"
                >
                  <Columns2 className="size-3.5" /> Split
                </Button>
                <Button
                  variant={layout === 'editor' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setLayout('editor')}
                  className="h-8 gap-1.5 px-2.5 text-xs"
                >
                  <Maximize2 className="size-3.5" /> Editor
                </Button>
              </div>
            )}

            {draft.id && (
              <>
                <Button variant="outline" size="sm" onClick={() => simpleAction.mutate('clone')} disabled={!draft.id}>
                  <Copy className="size-4" /> Clone
                </Button>
                <Button size="sm" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} kbd="Ctrl+S">
                  <Save className="size-4" /> Save
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* KPI Cards in Table mode */}
      {mode && layout === 'table' && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Active Files"
            value={metrics.activeFiles}
            icon={<Ship className="size-4" />}
          />
          <StatCard
            label="In Transit"
            value={metrics.inTransit}
            icon={<Truck className="size-4" />}
          />
          <StatCard
            label="Delivered / Cleared"
            value={metrics.cleared}
            icon={<Ship className="size-4" />}
          />
          <StatCard
            label="Freight Margin (PHP)"
            value={formatMoney(metrics.totalMargin)}
            icon={<TrendingUp className="size-4 text-success" />}
          />
        </div>
      )}

      {/* Mode Filters Toolbar */}
      {mode && layout !== 'editor' && (
        <Toolbar>
          <div id="shipment-search" className="min-w-0 flex-1 sm:max-w-xs">
            <SearchBox
              value={filters.q || ''}
              onChange={(q) => setFilters((f) => ({ ...f, q }))}
              placeholder="Search file, booking, consignee…"
            />
          </div>
          <Select
            value={filters.status || undefined}
            onValueChange={(status) => setFilters((f) => ({ ...f, status }))}
            placeholder="Status"
            options={['BOOKED', 'LOADED', 'IN_TRANSIT', 'ARRIVED', 'CLEARED', 'DELIVERED', 'CLOSED', 'CANCELLED'].map((s) => ({
              value: s,
              label: s,
            }))}
          />
          <Input
            type="date"
            value={filters.dateFrom || ''}
            onChange={(event) => setFilters((f) => ({ ...f, dateFrom: event.target.value, dateField: 'etd' }))}
            className="w-36 text-xs sm:w-40"
          />
          <Input
            type="date"
            value={filters.dateTo || ''}
            onChange={(event) => setFilters((f) => ({ ...f, dateTo: event.target.value, dateField: 'eta' }))}
            className="w-36 text-xs sm:w-40"
          />
          <Button variant="ghost" size="sm" onClick={() => setFilters({})}>
            Reset filters
          </Button>
        </Toolbar>
      )}

      {/* Table Layout (Full Width DataGrid) */}
      {mode && layout === 'table' && (
        <div className="w-full min-w-0">
          {listQuery.isLoading ? (
            <div className="flex h-64 items-center justify-center rounded-xl border bg-card">
              <KornetLoader size="lg" text="Loading files…" />
            </div>
          ) : (
            <DataGrid
              data={rows}
              density="comfortable"
              emptyTitle={`No ${modeInfo?.label.toLowerCase()} files found`}
              onRowSelect={(selection) => selection[0]?.id && handleOpenRow(String(selection[0].id))}
              columns={[
                {
                  id: 'fileNo',
                  header: 'File #',
                  cell: (row) => (
                    <button
                      onClick={() => handleOpenRow(row.id)}
                      className="font-mono font-semibold text-secondary hover:underline"
                    >
                      {row.fileNo}
                    </button>
                  ),
                },
                {
                  id: 'status',
                  header: 'Status',
                  cell: (row) => <StatusPill status={row.status} />,
                },
                { id: 'booking', header: 'Booking #', accessor: 'bookingNo' },
                {
                  id: 'lane',
                  header: 'Routing',
                  cell: (row) => (
                    <span className="font-mono text-xs">
                      {row.polCode || '—'} → {row.podCode || '—'}
                    </span>
                  ),
                },
                { id: 'etd', header: 'ETD', cell: (row) => formatDate(row.etd) },
                { id: 'eta', header: 'ETA', cell: (row) => formatDate(row.eta) },
                {
                  id: 'margin',
                  header: 'Margin',
                  cell: (row) => (
                    <MarginBadge
                      bill={row.charges?.reduce((s, c) => s + Number(c.amountPhp || 0), 0) ?? 0}
                      cost={row.charges?.reduce((s, c) => s + Number(c.costAmountPhp || 0), 0) ?? 0}
                    />
                  ),
                },
                {
                  id: 'actions',
                  header: 'Action',
                  cell: (row) => (
                    <Button size="sm" variant="outline" onClick={() => handleOpenRow(row.id)}>
                      Open Editor
                    </Button>
                  ),
                },
              ]}
            />
          )}
        </div>
      )}

      {/* Split View Layout (Compact Navigator + Responsive Editor) */}
      {mode && layout === 'split' && (
        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(18rem,24rem)_1fr]">
          <div className="min-w-0 space-y-2 overflow-hidden rounded-xl border bg-card p-3 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {rows.length} Files
            </p>
            <div className="max-h-[75vh] space-y-2 overflow-y-auto pr-1 custom-scrollbar">
              {rows.map((row) => {
                const isSelected = row.id === selectedId
                return (
                  <button
                    key={row.id}
                    onClick={() => setSelectedId(row.id)}
                    className={`flex w-full flex-col gap-1.5 rounded-lg border p-3 text-left transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-xs'
                        : 'border-border/60 bg-card hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-foreground">{row.fileNo}</span>
                      <StatusPill status={row.status} />
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.polCode || '—'} → {row.podCode || '—'} · {formatDate(row.etd)}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="min-w-0">{renderEditorCard()}</div>
        </div>
      )}

      {/* Focused Editor Layout (100% Full Width Workspace) */}
      {layout === 'editor' && (
        <div className="w-full min-w-0">
          {shipmentQuery.isLoading ? (
            <div className="flex h-96 items-center justify-center rounded-xl border bg-card">
              <KornetLoader size="lg" text="Loading shipment file…" />
            </div>
          ) : (
            renderEditorCard()
          )}
        </div>
      )}

      {/* Close File Gate Modal */}
      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent
          title={`Close file: ${draft.fileNo || 'Draft'}`}
          description="Verification gate asserts all fees are invoiced, vendors billed, and margin rules satisfied."
        >
          {closeCheckQuery.isLoading ? (
            <div className="flex items-center justify-center p-6">
              <KornetLoader size="md" text="Evaluating closing blockers…" />
            </div>
          ) : (
            <div className="space-y-3">
              {(closeCheckQuery.data?.blockers ?? []).length > 0 && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-xs font-bold uppercase text-destructive">Blockers (Must Clear)</p>
                  <ul className="mt-1 list-disc pl-5 text-xs text-destructive">
                    {closeCheckQuery.data?.blockers.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {(closeCheckQuery.data?.warnings ?? []).length > 0 && (
                <div className="rounded-xl border border-warning/30 bg-warning/5 p-3">
                  <p className="text-xs font-bold uppercase text-warning">Warnings (Override Required)</p>
                  <ul className="mt-1 list-disc pl-5 text-xs text-warning">
                    {closeCheckQuery.data?.warnings.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              <Textarea
                value={overrideReason}
                onChange={(event) => setOverrideReason(event.target.value)}
                placeholder="Manager override reason (if margin below threshold or unbilled waiver applies)…"
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setCloseOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => closeMutation.mutate()}
                  loading={closeMutation.isPending}
                  disabled={(closeCheckQuery.data?.blockers?.length ?? 0) > 0}
                >
                  Confirm & Lock File
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ShipmentWorkspace
