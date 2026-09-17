import { useState, useRef, useEffect } from 'react'
import { useLogisticsStore, Driver, FleetVehicle, DispatchRoute, KORNET_BRANCHES } from '../../stores/logisticsStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { useRequireIntegration } from '../../hooks/useRequireIntegration'

interface KanbanStageConfig {
  status: DispatchRoute['status']
  title: string
  icon: string
  color: string
  borderColor: string
  headerBg: string
  badgeBg: string
  nextLabel?: string
  nextStatus?: DispatchRoute['status']
  nextIcon?: string
}

const KANBAN_STAGES: KanbanStageConfig[] = [
  {
    status: 'Draft',
    title: 'Draft / Staged',
    icon: 'edit_note',
    color: 'text-slate-500',
    borderColor: 'border-slate-300 dark:border-slate-700',
    headerBg: 'bg-slate-100 dark:bg-slate-800/80',
    badgeBg: 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
    nextLabel: 'Dispatch Route',
    nextStatus: 'Dispatched',
    nextIcon: 'outgoing_mail',
  },
  {
    status: 'Dispatched',
    title: 'Dispatched',
    icon: 'local_shipping',
    color: 'text-blue-500',
    borderColor: 'border-blue-300 dark:border-blue-900/60',
    headerBg: 'bg-blue-50/80 dark:bg-blue-950/40',
    badgeBg: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300',
    nextLabel: 'Start Transit',
    nextStatus: 'In Transit',
    nextIcon: 'alt_route',
  },
  {
    status: 'In Transit',
    title: 'In Transit',
    icon: 'navigation',
    color: 'text-amber-500',
    borderColor: 'border-amber-300 dark:border-amber-900/60',
    headerBg: 'bg-amber-50/80 dark:bg-amber-950/40',
    badgeBg: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300',
    nextLabel: 'Mark Arrived',
    nextStatus: 'Arrived',
    nextIcon: 'pin_drop',
  },
  {
    status: 'Arrived',
    title: 'Arrived Hub / Port',
    icon: 'pin_drop',
    color: 'text-purple-500',
    borderColor: 'border-purple-300 dark:border-purple-900/60',
    headerBg: 'bg-purple-50/80 dark:bg-purple-950/40',
    badgeBg: 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300',
    nextLabel: 'Sign Digital POD',
    nextIcon: 'draw',
  },
  {
    status: 'Completed',
    title: 'Completed (POD)',
    icon: 'verified',
    color: 'text-emerald-500',
    borderColor: 'border-emerald-300 dark:border-emerald-900/60',
    headerBg: 'bg-emerald-50/80 dark:bg-emerald-950/40',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300',
    nextLabel: 'View POD Slip',
    nextIcon: 'receipt_long',
  },
]

export default function FleetDispatchManager() {
  const {
    drivers,
    fleetVehicles,
    dispatchRoutes,
    createDriver,
    createFleetVehicle,
    createDispatchRoute,
    updateDispatchRoute,
    signPOD,
    openPrintModal,
    modalOpen,
    setModalOpen
  } = useLogisticsStore()

  const darkMode = useSettingsStore((s) => s.darkMode)
  const requireIntegration = useRequireIntegration()

  const [activeTab, setActiveTab] = useState<'dispatches' | 'vehicles' | 'drivers'>('dispatches')
  const [dispatchView, setDispatchView] = useState<'kanban' | 'list'>('kanban')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // Modals inside manager
  const [showNewDispatchModal, setShowNewDispatchModal] = useState(false)
  const [showNewVehicleModal, setShowNewVehicleModal] = useState(false)
  const [showNewDriverModal, setShowNewDriverModal] = useState(false)

  const isNewDispatchOpen = showNewDispatchModal || modalOpen.newDispatchRoute
  const handleCloseNewDispatch = () => {
    setShowNewDispatchModal(false)
    setModalOpen('newDispatchRoute', false)
  }

  const isNewVehicleOpen = showNewVehicleModal || modalOpen.newVehicle
  const handleCloseNewVehicle = () => {
    setShowNewVehicleModal(false)
    setModalOpen('newVehicle', false)
  }

  const isNewDriverOpen = showNewDriverModal || modalOpen.newDriver
  const handleCloseNewDriver = () => {
    setShowNewDriverModal(false)
    setModalOpen('newDriver', false)
  }
  const [podTargetRoute, setPodTargetRoute] = useState<DispatchRoute | null>(null)
  const [podReceiverName, setPodReceiverName] = useState('')
  const [podNotes, setPodNotes] = useState('')

  // Canvas for Digital POD signature
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)

  // New Dispatch Form State
  const [newDispatch, setNewDispatch] = useState({
    dispatchNo: '',
    originBranch: '',
    destBranch: '',
    driverId: drivers[0]?.id || '',
    vehicleId: fleetVehicles[0]?.id || '',
    orderType: 'Delivery' as 'Pickup' | 'Delivery' | 'Transfer',
    status: 'Dispatched' as DispatchRoute['status'],
    cargoRef: '',
    waypoints: ''
  })

  // New Vehicle Form State
  const [newVehicle, setNewVehicle] = useState({
    plateNo: '',
    vehicleType: '10-Wheeler Wing Van' as FleetVehicle['vehicleType'],
    makeModel: '',
    capacityKg: 0,
    volumeCbm: 0,
    branch: '',
    status: 'Ready' as FleetVehicle['status']
  })

  // New Driver Form State
  const [newDriver, setNewDriver] = useState({
    code: '',
    name: '',
    licenseNo: '',
    phone: '',
    branch: '',
    status: 'Available' as Driver['status'],
    assignedVehiclePlate: ''
  })

  // Canvas Drawing Handlers
  useEffect(() => {
    if (podTargetRoute && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.strokeStyle = '#0f172a'
        ctx.lineWidth = 2.5
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
      setHasSignature(false)
    }
  }, [podTargetRoute])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    draw(e)
  }

  const stopDrawing = () => {
    setIsDrawing(false)
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      ctx?.beginPath()
    }
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing && e.type !== 'mousedown' && e.type !== 'touchstart') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    const x = clientX - rect.left
    const y = clientY - rect.top

    ctx.lineTo(x, y)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x, y)
    setHasSignature(true)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.beginPath()
    setHasSignature(false)
  }

  const handleSavePOD = () => {
    if (!podTargetRoute) return
    if (!requireIntegration('signature-pad', 'POD Signature Capture')) return
    if (!podReceiverName.trim()) {
      alert('Please enter the name of the receiving party.')
      return
    }
    if (!hasSignature && !canvasRef.current) {
      alert('Please provide a signature on the signature pad.')
      return
    }

    const signatureDataUrl = canvasRef.current?.toDataURL('image/png') || ''
    signPOD(podTargetRoute.id, signatureDataUrl, podReceiverName, podNotes)
    setPodTargetRoute(null)
    setPodReceiverName('')
    setPodNotes('')
    alert(`Proof of Delivery (POD) confirmed for Dispatch ${podTargetRoute.dispatchNo}!`)
  }

  const handleCreateDispatch = (e: React.FormEvent) => {
    e.preventDefault()
    const selectedDriver = drivers.find((d) => d.id === newDispatch.driverId) || drivers[0]
    const selectedVehicle = fleetVehicles.find((v) => v.id === newDispatch.vehicleId) || fleetVehicles[0]

    const route: DispatchRoute = {
      id: `dsp-${Date.now()}`,
      dispatchNo: newDispatch.dispatchNo || `DSP-${Date.now().toString().slice(-6)}`,
      originBranch: newDispatch.originBranch,
      destBranch: newDispatch.destBranch,
      waypoints: newDispatch.waypoints ? newDispatch.waypoints.split(',').map((w) => w.trim()) : [],
      driverId: selectedDriver?.id || 'drv-gen',
      driverName: selectedDriver?.name || 'Assigned Driver',
      vehicleId: selectedVehicle?.id || 'flt-gen',
      vehiclePlate: selectedVehicle?.plateNo || '',
      status: newDispatch.status || 'Dispatched',
      cargoRef: newDispatch.cargoRef || '',
      orderType: newDispatch.orderType,
      createdAt: new Date().toISOString()
    }

    createDispatchRoute(route)
    setShowNewDispatchModal(false)
    setNewDispatch({
      dispatchNo: `DSP-${Date.now().toString().slice(-6)}`,
      originBranch: 'Manila South Harbor HQ (MNL)',
      destBranch: 'Clark International Airport Hub (CRK)',
      driverId: drivers[0]?.id || '',
      vehicleId: fleetVehicles[0]?.id || '',
      orderType: 'Delivery',
      status: 'Dispatched',
      cargoRef: '',
      waypoints: 'NLEX Harbor Link, Dau Interchange'
    })
  }

  const handleCreateVehicle = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newVehicle.plateNo.trim()) {
      alert('Please enter the vehicle plate number.')
      return
    }

    const vehicle: FleetVehicle = {
      id: `flt-${Date.now()}`,
      plateNo: newVehicle.plateNo.toUpperCase(),
      vehicleType: newVehicle.vehicleType,
      makeModel: newVehicle.makeModel || 'Commercial Carrier',
      capacityKg: Number(newVehicle.capacityKg) || 10000,
      volumeCbm: Number(newVehicle.volumeCbm) || 40,
      branch: newVehicle.branch,
      status: newVehicle.status
    }

    createFleetVehicle(vehicle)
    setShowNewVehicleModal(false)
    setNewVehicle({
      plateNo: '',
      vehicleType: '10-Wheeler Wing Van',
      makeModel: '',
      capacityKg: 15000,
      volumeCbm: 58,
      branch: 'MNL',
      status: 'Ready'
    })
  }

  const handleCreateDriver = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDriver.name.trim() || !newDriver.licenseNo.trim()) {
      alert('Please provide driver name and license number.')
      return
    }

    const driver: Driver = {
      id: `drv-${Date.now()}`,
      code: newDriver.code,
      name: newDriver.name,
      licenseNo: newDriver.licenseNo.toUpperCase(),
      phone: newDriver.phone,
      branch: newDriver.branch,
      status: newDriver.status,
      assignedVehiclePlate: newDriver.assignedVehiclePlate || undefined
    }

    createDriver(driver)
    setShowNewDriverModal(false)
    setNewDriver({
      code: `DRV-PH-${String(drivers.length + 2).padStart(2, '0')}`,
      name: '',
      licenseNo: '',
      phone: '+63 ',
      branch: 'MNL',
      status: 'Available',
      assignedVehiclePlate: ''
    })
  }

  const filteredDispatches = dispatchRoutes.filter((r) => {
    const matchSearch =
      r.dispatchNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.cargoRef.toLowerCase().includes(searchTerm.toLowerCase())
    const matchStatus = statusFilter === 'ALL' || r.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="stitch-module-surface flex-1 flex flex-col overflow-hidden select-none font-sans relative">
      {/* Top Banner / Header Bar */}
      <div className="px-6 py-3 border-b border-white/10 bg-black/40 backdrop-blur-xl flex items-center justify-between relative z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-300 flex items-center justify-center font-black text-sm shadow-lg shadow-blue-500/10">
            <span className="material-symbols-outlined text-[20px]">local_shipping</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-white">Fleet Operations & Nationwide Dispatch</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block mr-1 animate-pulse" />
                CORRIDOR TELEMATICS ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Philippine Corridors &bull; Manila South Harbor, Bataan, Clark, Cebu, Davao, CDO
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {activeTab === 'dispatches' && (
            <button
              onClick={() => setShowNewDispatchModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">add_road</span>
              New Dispatch Route
            </button>
          )}
          {activeTab === 'vehicles' && (
            <button
              onClick={() => setShowNewVehicleModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Add Fleet Vehicle
            </button>
          )}
          {activeTab === 'drivers' && (
            <button
              onClick={() => setShowNewDriverModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">person_add</span>
              Register Driver
            </button>
          )}
        </div>
      </div>

      {/* Tab Switcher & Filters */}
      <div className="px-6 py-2.5 border-b border-white/10 bg-black/25 backdrop-blur-lg flex items-center justify-between text-xs relative z-10">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('dispatches')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-2 ${
              activeTab === 'dispatches'
                ? 'bg-blue-500/20 text-blue-200 border border-blue-400/40 shadow-[0_0_15px_rgba(59,130,246,0.25)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">alt_route</span>
            Active Dispatches ({dispatchRoutes.length})
          </button>
          <button
            onClick={() => setActiveTab('vehicles')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-2 ${
              activeTab === 'vehicles'
                ? 'bg-blue-500/20 text-blue-200 border border-blue-400/40 shadow-[0_0_15px_rgba(59,130,246,0.25)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">local_shipping</span>
            Fleet Assets ({fleetVehicles.length})
          </button>
          <button
            onClick={() => setActiveTab('drivers')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-2 ${
              activeTab === 'drivers'
                ? 'bg-blue-500/20 text-blue-200 border border-blue-400/40 shadow-[0_0_15px_rgba(59,130,246,0.25)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">badge</span>
            Driver Directory ({drivers.length})
          </button>
        </div>

        {activeTab === 'dispatches' && (
          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="p-1 rounded-xl border border-white/10 bg-white/[0.03] flex items-center text-xs">
              <button
                onClick={() => setDispatchView('kanban')}
                className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  dispatchView === 'kanban'
                    ? 'bg-blue-500/30 text-blue-200 border border-blue-400/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">view_kanban</span>
                Kanban
              </button>
              <button
                onClick={() => setDispatchView('list')}
                className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  dispatchView === 'list'
                    ? 'bg-blue-500/30 text-blue-200 border border-blue-400/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">format_list_bulleted</span>
                List
              </button>
            </div>

            <div className="h-5 w-px bg-white/10" />

            <input
              type="text"
              placeholder="Search dispatch #, driver, plate..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-glass px-3 py-1.5 rounded-xl text-xs w-56 text-white"
            />
            {dispatchView === 'list' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-glass px-3 py-1.5 rounded-xl text-xs bg-slate-900 text-white font-bold"
              >
                <option value="ALL">All Statuses</option>
                <option value="Draft">Draft / Staged</option>
                <option value="Dispatched">Dispatched</option>
                <option value="In Transit">In Transit</option>
                <option value="Arrived">Arrived Hub</option>
                <option value="Completed">Completed</option>
              </select>
            )}
          </div>
        )}
      </div>

      {/* Main Tab Workspace */}
      <div className="flex-1 overflow-y-auto p-6 relative z-10">
        {/* TAB 1: DISPATCHES */}
        {activeTab === 'dispatches' && (
          <div className="space-y-4">
            {filteredDispatches.length === 0 ? (
              <div className="liquid-glass-card rounded-2xl border border-white/10 p-12 text-center max-w-lg mx-auto mt-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-400/30">
                  <span className="material-symbols-outlined text-3xl">route</span>
                </div>
                <h3 className="text-base font-bold text-white mb-1">No Active Dispatches</h3>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                  Click &ldquo;New Dispatch Route&rdquo; to assign a driver, vehicle, and corridor between Philippine branches.
                </p>
                <button
                  onClick={() => setShowNewDispatchModal(true)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-blue-500/25 active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">add_road</span>
                  Create First Dispatch
                </button>
              </div>
            ) : dispatchView === 'kanban' ? (
              /* KANBAN BOARD VIEW */
              <div className="flex gap-4 overflow-x-auto pb-4 items-start min-h-[500px]">
                {KANBAN_STAGES.map((col) => {
                  const stageRoutes = filteredDispatches.filter((r) => r.status === col.status)
                  return (
                    <div
                      key={col.status}
                      className="w-80 flex-shrink-0 flex flex-col rounded-2xl liquid-glass-card border border-white/10 shadow-xl overflow-hidden"
                    >
                      {/* Column Header */}
                      <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                        <div className="flex items-center gap-2">
                          <span className={`material-symbols-outlined text-[18px] ${col.color}`}>{col.icon}</span>
                          <h3 className="font-bold text-xs text-white tracking-wide">{col.title}</h3>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-slate-200 border border-white/10 font-mono">
                          {stageRoutes.length}
                        </span>
                      </div>

                      {/* Column Body Cards */}
                      <div className="p-3 flex-1 flex flex-col gap-3 min-h-[350px] overflow-y-auto max-h-[620px]">
                        {stageRoutes.length === 0 ? (
                          <div className="flex-1 flex flex-col items-center justify-center p-6 border border-dashed rounded-xl border-white/10 text-center">
                            <span className="material-symbols-outlined text-2xl text-slate-500 mb-1">
                              {col.icon}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium">No orders in {col.status}</span>
                          </div>
                        ) : (
                          stageRoutes.map((route) => (
                            <div
                              key={route.id}
                              className="p-3.5 rounded-xl border border-white/10 bg-white/[0.03] hover:border-blue-400/40 hover:bg-white/[0.05] transition-all shadow-md flex flex-col gap-2.5"
                            >
                              {/* Card Top */}
                              <div className="flex items-center justify-between">
                                <span className="font-mono font-bold text-xs text-cyan-400">
                                  {route.dispatchNo}
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-white/10 text-slate-300 border border-white/10 font-mono">
                                  {route.orderType}
                                </span>
                              </div>

                              {/* Origin & Destination */}
                              <div className="text-xs font-semibold flex items-center gap-1.5 leading-snug text-white">
                                <span className="truncate max-w-[105px]" title={route.originBranch}>{route.originBranch.replace(/\s*\(.*\)/, '')}</span>
                                <span className="material-symbols-outlined text-[13px] text-sky-400">arrow_forward</span>
                                <span className="truncate max-w-[105px]" title={route.destBranch}>{route.destBranch.replace(/\s*\(.*\)/, '')}</span>
                              </div>

                              {/* Driver, Vehicle, Cargo Details */}
                              <div className="space-y-1.5 text-[11px] text-slate-400 border-t border-white/5 pt-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-[13px] text-slate-400">badge</span>
                                  <span className="truncate font-medium text-slate-200">{route.driverName}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-[13px] text-slate-400">local_shipping</span>
                                  <span className="font-mono font-bold text-cyan-300">{route.vehiclePlate}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-[13px] text-slate-400">inventory_2</span>
                                  <span className="truncate text-slate-300">{route.cargoRef}</span>
                                </div>
                                {route.podDeliveredAt && (
                                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[10px] bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/20">
                                    <span className="material-symbols-outlined text-[13px]">check_circle</span>
                                    <span>POD: {route.podReceiverName}</span>
                                  </div>
                                )}
                              </div>

                              {/* Stage Action Progression Button */}
                              <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-1.5">
                                {col.nextStatus ? (
                                  <button
                                    onClick={() => {
                                      if (col.status === 'Arrived') {
                                        setPodTargetRoute(route)
                                        setPodReceiverName('')
                                        setPodNotes('')
                                      } else {
                                        updateDispatchRoute(route.id, { status: col.nextStatus })
                                      }
                                    }}
                                    className={`flex-1 py-1.5 px-2.5 rounded-xl text-white font-bold text-[11px] flex items-center justify-center gap-1 shadow-md transition-all active:scale-95 ${
                                      col.status === 'Arrived'
                                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/20'
                                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/20'
                                    }`}
                                  >
                                    <span className="material-symbols-outlined text-[14px]">{col.nextIcon}</span>
                                    {col.nextLabel}
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      openPrintModal({
                                        type: 'DOCK_RECEIPT',
                                        title: `Proof of Delivery - ${route.dispatchNo}`,
                                        data: {
                                          dispatchNo: route.dispatchNo,
                                          receiver: route.podReceiverName,
                                          date: route.podDeliveredAt,
                                          driver: route.driverName,
                                          plate: route.vehiclePlate,
                                          cargo: route.cargoRef,
                                          signature: route.podSignature
                                        }
                                      })
                                    }}
                                    className="flex-1 py-1.5 px-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-[11px] flex items-center justify-center gap-1 shadow-sm transition-all"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">receipt_long</span>
                                    View POD Slip
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* LIST VIEW */
              <div className="grid grid-cols-1 gap-3">
                {filteredDispatches.map((route) => (
                  <div
                    key={route.id}
                    className="liquid-glass-card rounded-2xl border border-white/10 p-4 transition-all shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-blue-400/30"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold border ${
                        route.status === 'Completed'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : route.status === 'In Transit'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : route.status === 'Arrived'
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                          : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                      }`}>
                        <span className="material-symbols-outlined text-[20px]">
                          {route.status === 'Completed'
                            ? 'verified'
                            : route.status === 'In Transit'
                            ? 'navigation'
                            : route.status === 'Arrived'
                            ? 'pin_drop'
                            : 'local_shipping'}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-white">{route.dispatchNo}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            route.status === 'Completed'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : route.status === 'In Transit'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              : route.status === 'Arrived'
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                              : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                          }`}>
                            {route.status}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">{route.createdAt}</span>
                        </div>
                        <div className="text-xs font-semibold mt-1 flex items-center gap-2 text-white">
                          <span>{route.originBranch}</span>
                          <span className="material-symbols-outlined text-[14px] text-sky-400">arrow_forward</span>
                          <span>{route.destBranch}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-3">
                          <span>Driver: <strong className="text-slate-200">{route.driverName}</strong></span>
                          <span>&bull;</span>
                          <span>Unit: <strong className="text-cyan-300 font-mono">{route.vehiclePlate}</strong></span>
                          <span>&bull;</span>
                          <span>Cargo: <strong className="text-slate-200">{route.cargoRef}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      {route.status === 'Draft' && (
                        <button
                          onClick={() => updateDispatchRoute(route.id, { status: 'Dispatched' })}
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1 shadow-md active:scale-95 transition-all"
                        >
                          <span className="material-symbols-outlined text-[15px]">outgoing_mail</span>
                          Dispatch Route
                        </button>
                      )}
                      {route.status === 'Dispatched' && (
                        <button
                          onClick={() => updateDispatchRoute(route.id, { status: 'In Transit' })}
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs flex items-center gap-1 shadow-md active:scale-95 transition-all"
                        >
                          <span className="material-symbols-outlined text-[15px]">alt_route</span>
                          Start Transit
                        </button>
                      )}
                      {route.status === 'In Transit' && (
                        <button
                          onClick={() => updateDispatchRoute(route.id, { status: 'Arrived' })}
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs flex items-center gap-1 shadow-md active:scale-95 transition-all"
                        >
                          <span className="material-symbols-outlined text-[15px]">pin_drop</span>
                          Mark Arrived
                        </button>
                      )}
                      {route.status === 'Arrived' && (
                        <button
                          onClick={() => {
                            setPodTargetRoute(route)
                            setPodReceiverName('')
                            setPodNotes('')
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1 shadow-md active:scale-95 transition-all"
                        >
                          <span className="material-symbols-outlined text-[15px]">draw</span>
                          Sign Digital POD
                        </button>
                      )}
                      {route.status === 'Completed' && (
                        <button
                          onClick={() => {
                            openPrintModal({
                              type: 'DOCK_RECEIPT',
                              title: `Proof of Delivery - ${route.dispatchNo}`,
                              data: {
                                dispatchNo: route.dispatchNo,
                                receiver: route.podReceiverName,
                                date: route.podDeliveredAt,
                                driver: route.driverName,
                                plate: route.vehiclePlate,
                                cargo: route.cargoRef,
                                signature: route.podSignature
                              }
                            })
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition-all"
                        >
                          <span className="material-symbols-outlined text-[15px]">receipt_long</span>
                          View POD Slip
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: FLEET ASSETS */}
        {activeTab === 'vehicles' && (
          <div className="liquid-glass-card rounded-2xl border border-white/10 overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="border-b border-white/10 uppercase tracking-wider text-[10px] font-bold bg-white/[0.02] text-slate-400">
                <tr>
                  <th className="p-4">Plate No</th>
                  <th className="p-4">Vehicle Type</th>
                  <th className="p-4">Make / Model</th>
                  <th className="p-4">Capacity (KG)</th>
                  <th className="p-4">Volume (CBM)</th>
                  <th className="p-4">Branch Depot</th>
                  <th className="p-4">Current Driver</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {fleetVehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="p-4 font-mono font-bold text-cyan-400">{v.plateNo}</td>
                    <td className="p-4 font-medium text-white">{v.vehicleType}</td>
                    <td className="p-4 text-slate-300">{v.makeModel}</td>
                    <td className="p-4 font-mono text-white">{v.capacityKg.toLocaleString()} kg</td>
                    <td className="p-4 font-mono text-white">{v.volumeCbm} CBM</td>
                    <td className="p-4 font-bold text-slate-200">{v.branch}</td>
                    <td className="p-4 text-slate-300">{v.currentDriver || <span className="text-slate-500 italic">Unassigned</span>}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        v.status === 'Ready'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      }`}>
                        {v.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: DRIVERS */}
        {activeTab === 'drivers' && (
          <div className="liquid-glass-card rounded-2xl border border-white/10 overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="border-b border-white/10 uppercase tracking-wider text-[10px] font-bold bg-white/[0.02] text-slate-400">
                <tr>
                  <th className="p-4">Driver Code</th>
                  <th className="p-4">Driver Name</th>
                  <th className="p-4">LTO License No</th>
                  <th className="p-4">Mobile Contact</th>
                  <th className="p-4">Assigned Branch</th>
                  <th className="p-4">Default Unit</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {drivers.map((d) => (
                  <tr key={d.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="p-4 font-mono font-bold text-cyan-400">{d.code}</td>
                    <td className="p-4 font-bold text-white">{d.name}</td>
                    <td className="p-4 font-mono text-slate-300">{d.licenseNo}</td>
                    <td className="p-4 text-slate-300 font-mono">{d.phone}</td>
                    <td className="p-4 font-bold text-slate-200">{d.branch}</td>
                    <td className="p-4 font-mono text-slate-300">{d.assignedVehiclePlate || 'None'}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        d.status === 'Available'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      }`}>
                        {d.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: NEW DISPATCH ROUTE */}
      {isNewDispatchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`w-full max-w-xl rounded-2xl border p-6 shadow-2xl relative overflow-hidden backdrop-blur-2xl ${
            darkMode ? 'bg-[#0f172a]/95 border-white/10 text-white shadow-black/80' : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-300'
          }`}>
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500" />
            
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <span className="material-symbols-outlined text-xl">add_road</span>
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight">New Inland Dispatch Route</h3>
                  <p className="text-[11px] text-slate-400 font-mono">Drayage Manifest & Cartage Waybill Assignment</p>
                </div>
              </div>
              <button 
                onClick={handleCloseNewDispatch} 
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateDispatch} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">Dispatch No</label>
                  <input
                    type="text"
                    value={newDispatch.dispatchNo}
                    onChange={(e) => setNewDispatch({ ...newDispatch, dispatchNo: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border font-mono text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/50 ${
                      darkMode ? 'bg-slate-900/80 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">Order Type</label>
                  <select
                    value={newDispatch.orderType}
                    onChange={(e) => setNewDispatch({ ...newDispatch, orderType: e.target.value as any })}
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/50 ${
                      darkMode ? 'bg-slate-900/80 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="Delivery">Delivery Cartage</option>
                    <option value="Pickup">Port/Vendor Pickup</option>
                    <option value="Transfer">Inter-Hub Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">Initial Status</label>
                  <select
                    value={newDispatch.status}
                    onChange={(e) => setNewDispatch({ ...newDispatch, status: e.target.value as any })}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500/50 ${
                      darkMode ? 'bg-slate-900/80 border-white/10 text-blue-400' : 'bg-slate-50 border-slate-300 text-blue-600'
                    }`}
                  >
                    <option value="Draft">Draft / Staged</option>
                    <option value="Dispatched">Dispatched</option>
                    <option value="In Transit">In Transit</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">Origin Depot / Terminal</label>
                  <select
                    value={newDispatch.originBranch}
                    onChange={(e) => setNewDispatch({ ...newDispatch, originBranch: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/50 ${
                      darkMode ? 'bg-slate-900/80 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    {KORNET_BRANCHES.map((b) => (
                      <option key={b.id} value={`${b.name} (${b.code})`}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">Destination Hub / Consignee</label>
                  <select
                    value={newDispatch.destBranch}
                    onChange={(e) => setNewDispatch({ ...newDispatch, destBranch: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/50 ${
                      darkMode ? 'bg-slate-900/80 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    {KORNET_BRANCHES.map((b) => (
                      <option key={b.id} value={`${b.name} (${b.code})`}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">Assigned Driver</label>
                  <select
                    value={newDispatch.driverId}
                    onChange={(e) => setNewDispatch({ ...newDispatch, driverId: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/50 ${
                      darkMode ? 'bg-slate-900/80 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.branch} &bull; {d.status})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">Assigned Vehicle Unit</label>
                  <select
                    value={newDispatch.vehicleId}
                    onChange={(e) => setNewDispatch({ ...newDispatch, vehicleId: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/50 ${
                      darkMode ? 'bg-slate-900/80 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    {fleetVehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.plateNo} &bull; {v.vehicleType} ({v.branch})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">Cargo Manifest Reference / Seal No</label>
                <input
                  type="text"
                  placeholder="e.g. Container MSKU-992144-8 / Seal #BOC-99214 / 4 Crates Auto Parts"
                  value={newDispatch.cargoRef}
                  onChange={(e) => setNewDispatch({ ...newDispatch, cargoRef: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/50 ${
                    darkMode ? 'bg-slate-900/80 border-white/10 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleCloseNewDispatch}
                  className={`px-4 py-2 rounded-xl font-semibold transition-all border ${
                    darkMode ? 'border-white/10 text-slate-300 hover:bg-white/5' : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold shadow-lg shadow-blue-900/30 flex items-center gap-1.5 transition-all active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-[16px]">local_shipping</span>
                  Dispatch Transport Unit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DIGITAL PROOF OF DELIVERY (POD) SIGNATURE */}
      {podTargetRoute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl relative overflow-hidden backdrop-blur-2xl ${
            darkMode ? 'bg-[#0f172a]/95 border-white/10 text-white shadow-black/80' : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-300'
          }`}>
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <span className="material-symbols-outlined text-xl">verified</span>
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight">Digital Proof of Delivery (e-POD)</h3>
                  <p className="text-[11px] text-slate-400 font-mono">Dispatch Route: {podTargetRoute.dispatchNo}</p>
                </div>
              </div>
              <button 
                onClick={() => setPodTargetRoute(null)} 
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className={`p-3.5 rounded-xl border ${
                darkMode ? 'bg-slate-900/60 border-white/10' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between text-[11px] mb-1.5">
                  <span className="text-slate-400 font-mono uppercase">Route Waypoints:</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">Active Drayage</span>
                </div>
                <div className="font-bold text-sm tracking-tight flex items-center gap-2">
                  <span>{podTargetRoute.originBranch}</span>
                  <span className="material-symbols-outlined text-xs text-slate-400">arrow_forward</span>
                  <span className="text-emerald-400">{podTargetRoute.destBranch}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/5 text-[11px] text-slate-400">
                  <div>Cargo: <strong className="text-slate-200">{podTargetRoute.cargoRef}</strong></div>
                  <div>Driver: <strong className="text-slate-200">{podTargetRoute.driverName}</strong> ({podTargetRoute.vehiclePlate})</div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                  Receiver / Authorized Consignee Representative *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Engr. Juan Dela Cruz (Warehouse Head / Customs Broker)"
                  value={podReceiverName}
                  onChange={(e) => setPodReceiverName(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 ${
                    darkMode ? 'bg-slate-900/80 border-white/10 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">draw</span>
                    Consignee Signature Touch Pad *
                  </label>
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 font-mono transition-colors"
                  >
                    <span className="material-symbols-outlined text-[13px]">restart_alt</span> Clear Signature
                  </button>
                </div>
                <div className="border border-white/20 rounded-xl overflow-hidden bg-white shadow-inner">
                  <canvas
                    ref={canvasRef}
                    width={480}
                    height={150}
                    onMouseDown={startDrawing}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onMouseMove={draw}
                    onTouchStart={startDrawing}
                    onTouchEnd={stopDrawing}
                    onTouchMove={draw}
                    className="w-full cursor-crosshair touch-none"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5 italic text-center font-mono">
                  Sign inside box using touchscreen or mouse cursor to seal delivery acceptance
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                  Delivery Inspection & Seal Integrity Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cargo received in pristine condition, bolt seal intact #BOC-99214"
                  value={podNotes}
                  onChange={(e) => setPodNotes(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 ${
                    darkMode ? 'bg-slate-900/80 border-white/10 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setPodTargetRoute(null)}
                  className={`px-4 py-2 rounded-xl font-semibold transition-all border ${
                    darkMode ? 'border-white/10 text-slate-300 hover:bg-white/5' : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePOD}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-lg shadow-emerald-900/30 flex items-center gap-1.5 transition-all active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-[16px]">verified</span>
                  Confirm & Seal e-POD
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD FLEET VEHICLE */}
      {isNewVehicleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl relative overflow-hidden backdrop-blur-2xl ${
            darkMode ? 'bg-[#0f172a]/95 border-white/10 text-white shadow-black/80' : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-300'
          }`}>
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500" />

            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <span className="material-symbols-outlined text-xl">local_shipping</span>
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight">Add Fleet Vehicle Asset</h3>
                  <p className="text-[11px] text-slate-400 font-mono">Register prime mover, wing van, or container chassis</p>
                </div>
              </div>
              <button 
                onClick={handleCloseNewVehicle} 
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateVehicle} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">LTO Plate Number *</label>
                <input
                  type="text"
                  placeholder="e.g. NAA-8890"
                  value={newVehicle.plateNo}
                  onChange={(e) => setNewVehicle({ ...newVehicle, plateNo: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border font-mono uppercase text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/50 ${
                    darkMode ? 'bg-slate-900/80 border-white/10 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">Vehicle Type</label>
                  <select
                    value={newVehicle.vehicleType}
                    onChange={(e) => setNewVehicle({ ...newVehicle, vehicleType: e.target.value as any })}
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/50 ${
                      darkMode ? 'bg-slate-900/80 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="10-Wheeler Wing Van">10-Wheeler Wing Van</option>
                    <option value="40ft Container Chassis">40ft Container Chassis</option>
                    <option value="4-Wheeler Closed Van">4-Wheeler Closed Van</option>
                    <option value="Reefer Truck">Reefer Truck</option>
                    <option value="Prime Mover">Prime Mover</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">Make / Model Specs</label>
                  <input
                    type="text"
                    placeholder="e.g. Isuzu Giga 6UZ1"
                    value={newVehicle.makeModel}
                    onChange={(e) => setNewVehicle({ ...newVehicle, makeModel: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/50 ${
                      darkMode ? 'bg-slate-900/80 border-white/10 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">Payload Capacity (KG)</label>
                  <input
                    type="number"
                    value={newVehicle.capacityKg}
                    onChange={(e) => setNewVehicle({ ...newVehicle, capacityKg: Number(e.target.value) })}
                    className={`w-full px-3 py-2 rounded-xl border font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/50 ${
                      darkMode ? 'bg-slate-900/80 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">Volume (CBM)</label>
                  <input
                    type="number"
                    value={newVehicle.volumeCbm}
                    onChange={(e) => setNewVehicle({ ...newVehicle, volumeCbm: Number(e.target.value) })}
                    className={`w-full px-3 py-2 rounded-xl border font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/50 ${
                      darkMode ? 'bg-slate-900/80 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">Home Depot Branch</label>
                <select
                  value={newVehicle.branch}
                  onChange={(e) => setNewVehicle({ ...newVehicle, branch: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/50 ${
                    darkMode ? 'bg-slate-900/80 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  {KORNET_BRANCHES.map((b) => (
                    <option key={b.id} value={b.code}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleCloseNewVehicle}
                  className={`px-4 py-2 rounded-xl font-semibold transition-all border ${
                    darkMode ? 'border-white/10 text-slate-300 hover:bg-white/5' : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold shadow-lg shadow-indigo-900/30 flex items-center gap-1.5 transition-all active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  Save Vehicle Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTER DRIVER */}
      {isNewDriverOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl relative overflow-hidden backdrop-blur-2xl ${
            darkMode ? 'bg-[#0f172a]/95 border-white/10 text-white shadow-black/80' : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-300'
          }`}>
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500" />

            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <span className="material-symbols-outlined text-xl">person_add</span>
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight">Register Fleet Driver</h3>
                  <p className="text-[11px] text-slate-400 font-mono">Drayage driver profile & LTO professional license</p>
                </div>
              </div>
              <button 
                onClick={handleCloseNewDriver} 
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateDriver} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">Driver Code</label>
                  <input
                    type="text"
                    value={newDriver.code}
                    onChange={(e) => setNewDriver({ ...newDriver, code: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 ${
                      darkMode ? 'bg-slate-900/80 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">Branch Depot Assignment</label>
                  <select
                    value={newDriver.branch}
                    onChange={(e) => setNewDriver({ ...newDriver, branch: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 ${
                      darkMode ? 'bg-slate-900/80 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    {KORNET_BRANCHES.map((b) => (
                      <option key={b.id} value={b.code}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">Full Legal Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Danilo Ramos"
                  value={newDriver.name}
                  onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 ${
                    darkMode ? 'bg-slate-900/80 border-white/10 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">LTO Professional License *</label>
                  <input
                    type="text"
                    placeholder="e.g. N01-12-889021"
                    value={newDriver.licenseNo}
                    onChange={(e) => setNewDriver({ ...newDriver, licenseNo: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border font-mono uppercase text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 ${
                      darkMode ? 'bg-slate-900/80 border-white/10 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">Mobile Contact Phone</label>
                  <input
                    type="text"
                    placeholder="+63 917 000 0000"
                    value={newDriver.phone}
                    onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 ${
                      darkMode ? 'bg-slate-900/80 border-white/10 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">Assigned Fleet Vehicle (Optional)</label>
                <select
                  value={newDriver.assignedVehiclePlate}
                  onChange={(e) => setNewDriver({ ...newDriver, assignedVehiclePlate: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 ${
                    darkMode ? 'bg-slate-900/80 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="">None / Float Driver</option>
                  {fleetVehicles.map((v) => (
                    <option key={v.id} value={v.plateNo}>
                      {v.plateNo} &bull; {v.vehicleType}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleCloseNewDriver}
                  className={`px-4 py-2 rounded-xl font-semibold transition-all border ${
                    darkMode ? 'border-white/10 text-slate-300 hover:bg-white/5' : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-lg shadow-emerald-900/30 flex items-center gap-1.5 transition-all active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-[16px]">person_add</span>
                  Register Driver
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
