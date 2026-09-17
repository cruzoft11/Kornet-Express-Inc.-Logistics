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
    <div className={`stitch-module-surface flex-1 flex flex-col overflow-hidden select-none font-body ${darkMode ? 'bg-[#0a0f1d] text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Top Banner / Breadcrumb Bar */}
      <div className={`px-6 py-3 border-b flex items-center justify-between ${darkMode ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-sm">
            <span className="material-symbols-outlined text-[18px]">local_shipping</span>
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">Fleet Operations & Nationwide Dispatch</h1>
            <p className="text-[11px] text-slate-500">
              Philippine Corridors &bull; Manila South Harbor, Bataan, Clark, Cebu, Davao, CDO
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {activeTab === 'dispatches' && (
            <button
              onClick={() => setShowNewDispatchModal(true)}
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">add_road</span>
              New Dispatch Route
            </button>
          )}
          {activeTab === 'vehicles' && (
            <button
              onClick={() => setShowNewVehicleModal(true)}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Add Fleet Vehicle
            </button>
          )}
          {activeTab === 'drivers' && (
            <button
              onClick={() => setShowNewDriverModal(true)}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">person_add</span>
              Register Driver
            </button>
          )}
        </div>
      </div>

      {/* Tab Switcher & Filters */}
      <div className={`px-6 py-2 border-b flex items-center justify-between text-xs ${darkMode ? 'bg-[#0e1628] border-slate-800' : 'bg-slate-100/70 border-slate-200'}`}>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('dispatches')}
            className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'dispatches'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">alt_route</span>
            Active Dispatches ({dispatchRoutes.length})
          </button>
          <button
            onClick={() => setActiveTab('vehicles')}
            className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'vehicles'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">local_shipping</span>
            Fleet Assets ({fleetVehicles.length})
          </button>
          <button
            onClick={() => setActiveTab('drivers')}
            className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'drivers'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">badge</span>
            Driver Directory ({drivers.length})
          </button>
        </div>

        {activeTab === 'dispatches' && (
          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className={`p-0.5 rounded-lg border flex items-center text-xs ${
              darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-200/80 border-slate-300'
            }`}>
              <button
                onClick={() => setDispatchView('kanban')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all flex items-center gap-1 ${
                  dispatchView === 'kanban'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">view_kanban</span>
                Kanban
              </button>
              <button
                onClick={() => setDispatchView('list')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all flex items-center gap-1 ${
                  dispatchView === 'list'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">format_list_bulleted</span>
                List
              </button>
            </div>

            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700" />

            <input
              type="text"
              placeholder="Search dispatch #, driver, plate..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`px-3 py-1 rounded-md text-xs border focus:outline-none focus:ring-1 focus:ring-blue-500 w-52 ${
                darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300'
              }`}
            />
            {dispatchView === 'list' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`px-2.5 py-1 rounded-md text-xs border focus:outline-none ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300'
                }`}
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
      <div className="flex-1 overflow-y-auto p-6">
        {/* TAB 1: DISPATCHES */}
        {activeTab === 'dispatches' && (
          <div className="space-y-4">
            {filteredDispatches.length === 0 ? (
              <div className={`rounded-xl border p-12 text-center ${darkMode ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
                  <span className="material-symbols-outlined text-3xl">route</span>
                </div>
                <h3 className="text-sm font-bold mb-1">No Active Dispatches</h3>
                <p className="text-xs text-slate-500 mb-4 max-w-sm mx-auto">
                  Click &ldquo;New Dispatch Route&rdquo; to assign a driver, vehicle, and corridor between Philippine branches.
                </p>
                <button
                  onClick={() => setShowNewDispatchModal(true)}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm"
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
                      className={`w-80 flex-shrink-0 flex flex-col rounded-2xl border transition-all ${
                        darkMode ? 'bg-[#0f172a]/70 border-slate-800' : 'bg-white/90 border-slate-200'
                      } shadow-sm overflow-hidden`}
                    >
                      {/* Column Header */}
                      <div className={`p-3 border-b flex items-center justify-between ${col.headerBg} ${col.borderColor}`}>
                        <div className="flex items-center gap-2">
                          <span className={`material-symbols-outlined text-[18px] ${col.color}`}>{col.icon}</span>
                          <h3 className="font-bold text-xs">{col.title}</h3>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${col.badgeBg}`}>
                          {stageRoutes.length}
                        </span>
                      </div>

                      {/* Column Body Cards */}
                      <div className="p-3 flex-1 flex flex-col gap-3 min-h-[350px] overflow-y-auto max-h-[620px]">
                        {stageRoutes.length === 0 ? (
                          <div className="flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl border-slate-200 dark:border-slate-800/80 text-center">
                            <span className="material-symbols-outlined text-2xl text-slate-300 dark:text-slate-700 mb-1">
                              {col.icon}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium">No orders in {col.status}</span>
                          </div>
                        ) : (
                          stageRoutes.map((route) => (
                            <div
                              key={route.id}
                              className={`p-3.5 rounded-xl border transition-all shadow-sm flex flex-col gap-2.5 ${
                                darkMode
                                  ? 'bg-slate-900/90 border-slate-700/80 hover:border-slate-600'
                                  : 'bg-slate-50 border-slate-200/90 hover:border-blue-300 hover:bg-white'
                              }`}
                            >
                              {/* Card Top */}
                              <div className="flex items-center justify-between">
                                <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                                  {route.dispatchNo}
                                </span>
                                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                  {route.orderType}
                                </span>
                              </div>

                              {/* Origin & Destination */}
                              <div className="text-xs font-semibold flex items-center gap-1.5 leading-snug">
                                <span className="truncate max-w-[105px]" title={route.originBranch}>{route.originBranch.replace(/\s*\(.*\)/, '')}</span>
                                <span className="material-symbols-outlined text-[13px] text-slate-400">arrow_forward</span>
                                <span className="truncate max-w-[105px]" title={route.destBranch}>{route.destBranch.replace(/\s*\(.*\)/, '')}</span>
                              </div>

                              {/* Driver, Vehicle, Cargo Details */}
                              <div className="space-y-1 text-[11px] text-slate-500 border-t pt-2 dark:border-slate-800/80">
                                <div className="flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-[13px] text-slate-400">badge</span>
                                  <span className="truncate font-medium">{route.driverName}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-[13px] text-slate-400">local_shipping</span>
                                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{route.vehiclePlate}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-[13px] text-slate-400">inventory_2</span>
                                  <span className="truncate">{route.cargoRef}</span>
                                </div>
                                {route.podDeliveredAt && (
                                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                                    <span className="material-symbols-outlined text-[13px]">check_circle</span>
                                    <span>POD: {route.podReceiverName}</span>
                                  </div>
                                )}
                              </div>

                              {/* Stage Action Progression Button */}
                              <div className="pt-2 border-t dark:border-slate-800 flex items-center justify-between gap-1.5">
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
                                    className={`flex-1 py-1.5 px-2.5 rounded-lg text-white font-bold text-[11px] flex items-center justify-center gap-1 shadow-sm transition-all ${
                                      col.status === 'Arrived'
                                        ? 'bg-emerald-600 hover:bg-emerald-700'
                                        : 'bg-blue-600 hover:bg-blue-700'
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
                                    className="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-[11px] flex items-center justify-center gap-1 shadow-sm"
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
                    className={`rounded-xl border p-4 transition-all shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      darkMode ? 'bg-[#0f172a] border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-blue-400'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 font-bold ${
                        route.status === 'Completed'
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          : route.status === 'In Transit'
                          ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                          : route.status === 'Arrived'
                          ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20'
                          : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
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
                          <span className="font-mono font-bold text-xs">{route.dispatchNo}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            route.status === 'Completed'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                              : route.status === 'In Transit'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400'
                              : route.status === 'Arrived'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-400'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400'
                          }`}>
                            {route.status}
                          </span>
                          <span className="text-[10px] text-slate-400">{route.createdAt}</span>
                        </div>
                        <div className="text-xs font-semibold mt-1 flex items-center gap-2">
                          <span>{route.originBranch}</span>
                          <span className="material-symbols-outlined text-[14px] text-slate-400">arrow_forward</span>
                          <span>{route.destBranch}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-3">
                          <span>Driver: <strong>{route.driverName}</strong></span>
                          <span>&bull;</span>
                          <span>Unit: <strong>{route.vehiclePlate}</strong></span>
                          <span>&bull;</span>
                          <span>Cargo: <strong>{route.cargoRef}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      {route.status === 'Draft' && (
                        <button
                          onClick={() => updateDispatchRoute(route.id, { status: 'Dispatched' })}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
                        >
                          <span className="material-symbols-outlined text-[15px]">outgoing_mail</span>
                          Dispatch Route
                        </button>
                      )}
                      {route.status === 'Dispatched' && (
                        <button
                          onClick={() => updateDispatchRoute(route.id, { status: 'In Transit' })}
                          className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
                        >
                          <span className="material-symbols-outlined text-[15px]">alt_route</span>
                          Start Transit
                        </button>
                      )}
                      {route.status === 'In Transit' && (
                        <button
                          onClick={() => updateDispatchRoute(route.id, { status: 'Arrived' })}
                          className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
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
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
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
                          className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
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
          <div className={`rounded-xl border overflow-hidden shadow-sm ${darkMode ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'}`}>
            <table className="w-full text-left text-xs border-collapse">
              <thead className={`border-b uppercase tracking-wider text-[10px] font-bold ${darkMode ? 'bg-slate-800/60 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                <tr>
                  <th className="p-3">Plate No</th>
                  <th className="p-3">Vehicle Type</th>
                  <th className="p-3">Make / Model</th>
                  <th className="p-3">Capacity (KG)</th>
                  <th className="p-3">Volume (CBM)</th>
                  <th className="p-3">Branch Depot</th>
                  <th className="p-3">Current Driver</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {fleetVehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">{v.plateNo}</td>
                    <td className="p-3 font-medium">{v.vehicleType}</td>
                    <td className="p-3 text-slate-500">{v.makeModel}</td>
                    <td className="p-3 font-mono">{v.capacityKg.toLocaleString()} kg</td>
                    <td className="p-3 font-mono">{v.volumeCbm} CBM</td>
                    <td className="p-3 font-bold">{v.branch}</td>
                    <td className="p-3">{v.currentDriver || <span className="text-slate-400 italic">Unassigned</span>}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        v.status === 'Ready'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400'
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
          <div className={`rounded-xl border overflow-hidden shadow-sm ${darkMode ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'}`}>
            <table className="w-full text-left text-xs border-collapse">
              <thead className={`border-b uppercase tracking-wider text-[10px] font-bold ${darkMode ? 'bg-slate-800/60 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                <tr>
                  <th className="p-3">Driver Code</th>
                  <th className="p-3">Driver Name</th>
                  <th className="p-3">LTO License No</th>
                  <th className="p-3">Mobile Contact</th>
                  <th className="p-3">Assigned Branch</th>
                  <th className="p-3">Default Unit</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {drivers.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">{d.code}</td>
                    <td className="p-3 font-bold">{d.name}</td>
                    <td className="p-3 font-mono">{d.licenseNo}</td>
                    <td className="p-3 text-slate-500">{d.phone}</td>
                    <td className="p-3 font-bold">{d.branch}</td>
                    <td className="p-3 font-mono">{d.assignedVehiclePlate || 'None'}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        d.status === 'Available'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl ${darkMode ? 'bg-[#0f172a] border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between pb-4 border-b dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600 text-2xl">add_road</span>
                <h3 className="text-base font-bold">New Dispatch Route</h3>
              </div>
              <button onClick={handleCloseNewDispatch} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateDispatch} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold mb-1 text-slate-500">Dispatch No</label>
                  <input
                    type="text"
                    value={newDispatch.dispatchNo}
                    onChange={(e) => setNewDispatch({ ...newDispatch, dispatchNo: e.target.value })}
                    className={`w-full px-3 py-1.5 rounded-lg border font-mono ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'}`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold mb-1 text-slate-500">Dispatch Type</label>
                  <select
                    value={newDispatch.orderType}
                    onChange={(e) => setNewDispatch({ ...newDispatch, orderType: e.target.value as any })}
                    className={`w-full px-3 py-1.5 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'}`}
                  >
                    <option value="Delivery">Delivery</option>
                    <option value="Pickup">Pickup</option>
                    <option value="Transfer">Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold mb-1 text-slate-500">Initial Status</label>
                  <select
                    value={newDispatch.status}
                    onChange={(e) => setNewDispatch({ ...newDispatch, status: e.target.value as any })}
                    className={`w-full px-3 py-1.5 rounded-lg border font-bold ${darkMode ? 'bg-slate-800 border-slate-700 text-blue-400' : 'bg-slate-50 border-slate-300 text-blue-600'}`}
                  >
                    <option value="Draft">Draft / Staged</option>
                    <option value="Dispatched">Dispatched</option>
                    <option value="In Transit">In Transit</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold mb-1 text-slate-500">Origin Branch / Depot</label>
                  <select
                    value={newDispatch.originBranch}
                    onChange={(e) => setNewDispatch({ ...newDispatch, originBranch: e.target.value })}
                    className={`w-full px-3 py-1.5 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'}`}
                  >
                    {KORNET_BRANCHES.map((b) => (
                      <option key={b.id} value={`${b.name} (${b.code})`}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold mb-1 text-slate-500">Destination Branch / Hub</label>
                  <select
                    value={newDispatch.destBranch}
                    onChange={(e) => setNewDispatch({ ...newDispatch, destBranch: e.target.value })}
                    className={`w-full px-3 py-1.5 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'}`}
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
                  <label className="block text-[11px] font-bold mb-1 text-slate-500">Assigned Driver</label>
                  <select
                    value={newDispatch.driverId}
                    onChange={(e) => setNewDispatch({ ...newDispatch, driverId: e.target.value })}
                    className={`w-full px-3 py-1.5 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'}`}
                  >
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.branch} - {d.status})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold mb-1 text-slate-500">Assigned Vehicle Unit</label>
                  <select
                    value={newDispatch.vehicleId}
                    onChange={(e) => setNewDispatch({ ...newDispatch, vehicleId: e.target.value })}
                    className={`w-full px-3 py-1.5 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'}`}
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
                <label className="block text-[11px] font-bold mb-1 text-slate-500">Cargo Reference / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Container MSKU-992144-8 / 4 Crates Auto Parts"
                  value={newDispatch.cargoRef}
                  onChange={(e) => setNewDispatch({ ...newDispatch, cargoRef: e.target.value })}
                  className={`w-full px-3 py-1.5 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'}`}
                />
              </div>

              <div className="pt-3 border-t dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewDispatchModal(false)}
                  className="px-4 py-1.5 rounded-lg border text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md"
                >
                  Dispatch Unit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DIGITAL PROOF OF DELIVERY (POD) SIGNATURE */}
      {podTargetRoute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${darkMode ? 'bg-[#0f172a] border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between pb-4 border-b dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 text-2xl">verified</span>
                <div>
                  <h3 className="text-base font-bold leading-tight">Digital Proof of Delivery (POD)</h3>
                  <p className="text-[11px] text-slate-500">Dispatch: {podTargetRoute.dispatchNo}</p>
                </div>
              </div>
              <button onClick={() => setPodTargetRoute(null)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className={`p-3 rounded-lg border ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <div className="text-[11px] text-slate-500 mb-1">Route & Consignee:</div>
                <div className="font-bold">{podTargetRoute.originBranch} &rarr; {podTargetRoute.destBranch}</div>
                <div className="text-slate-500 mt-1">Cargo: <strong>{podTargetRoute.cargoRef}</strong></div>
                <div className="text-slate-500">Driver: <strong>{podTargetRoute.driverName}</strong> ({podTargetRoute.vehiclePlate})</div>
              </div>

              <div>
                <label className="block text-[11px] font-bold mb-1 text-slate-500">Receiver / Authorized Representative Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Engr. Juan Dela Cruz (Warehouse Head)"
                  value={podReceiverName}
                  onChange={(e) => setPodReceiverName(e.target.value)}
                  className={`w-full px-3 py-1.5 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'}`}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-500">Digital Signature Pad *</label>
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="text-[10px] text-red-500 hover:underline flex items-center gap-0.5"
                  >
                    <span className="material-symbols-outlined text-[12px]">refresh</span> Clear Pad
                  </button>
                </div>
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden bg-white">
                  <canvas
                    ref={canvasRef}
                    width={380}
                    height={140}
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
                <p className="text-[10px] text-slate-400 mt-1 italic text-center">
                  Sign inside the box using touch or mouse to seal delivery acceptance
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold mb-1 text-slate-500">Delivery Inspection Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Cargo received in good condition, seals intact"
                  value={podNotes}
                  onChange={(e) => setPodNotes(e.target.value)}
                  className={`w-full px-3 py-1.5 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'}`}
                />
              </div>

              <div className="pt-3 border-t dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPodTargetRoute(null)}
                  className="px-4 py-1.5 rounded-lg border text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePOD}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  Confirm & Seal Delivery
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD FLEET VEHICLE */}
      {isNewVehicleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${darkMode ? 'bg-[#0f172a] border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between pb-4 border-b dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-600 text-2xl">local_shipping</span>
                <h3 className="text-base font-bold">Add Fleet Vehicle</h3>
              </div>
              <button onClick={handleCloseNewVehicle} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateVehicle} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold mb-1 text-slate-500">Plate Number *</label>
                <input
                  type="text"
                  placeholder="e.g. NAA-8890"
                  value={newVehicle.plateNo}
                  onChange={(e) => setNewVehicle({ ...newVehicle, plateNo: e.target.value })}
                  className={`w-full px-3 py-1.5 rounded-lg border font-mono uppercase ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold mb-1 text-slate-500">Vehicle Type</label>
                  <select
                    value={newVehicle.vehicleType}
                    onChange={(e) => setNewVehicle({ ...newVehicle, vehicleType: e.target.value as any })}
                    className={`w-full px-3 py-1.5 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'}`}
                  >
                    <option value="10-Wheeler Wing Van">10-Wheeler Wing Van</option>
                    <option value="40ft Container Chassis">40ft Container Chassis</option>
                    <option value="4-Wheeler Closed Van">4-Wheeler Closed Van</option>
                    <option value="Reefer Truck">Reefer Truck</option>
                    <option value="Prime Mover">Prime Mover</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold mb-1 text-slate-500">Make / Model</label>
                  <input
                    type="text"
                    placeholder="e.g. Isuzu Giga 6UZ1"
                    value={newVehicle.makeModel}
                    onChange={(e) => setNewVehicle({ ...newVehicle, makeModel: e.target.value })}
                    className={`w-full px-3 py-1.5 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold mb-1 text-slate-500">Payload Capacity (KG)</label>
                  <input
                    type="number"
                    value={newVehicle.capacityKg}
                    onChange={(e) => setNewVehicle({ ...newVehicle, capacityKg: Number(e.target.value) })}
                    className={`w-full px-3 py-1.5 rounded-lg border font-mono ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'}`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold mb-1 text-slate-500">Volume (CBM)</label>
                  <input
                    type="number"
                    value={newVehicle.volumeCbm}
                    onChange={(e) => setNewVehicle({ ...newVehicle, volumeCbm: Number(e.target.value) })}
                    className={`w-full px-3 py-1.5 rounded-lg border font-mono ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'}`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold mb-1 text-slate-500">Home Branch Depot</label>
                <select
                  value={newVehicle.branch}
                  onChange={(e) => setNewVehicle({ ...newVehicle, branch: e.target.value })}
                  className={`w-full px-3 py-1.5 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'}`}
                >
                  {KORNET_BRANCHES.map((b) => (
                    <option key={b.id} value={b.code}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewVehicleModal(false)}
                  className="px-4 py-1.5 rounded-lg border text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md"
                >
                  Save Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTER DRIVER */}
      {isNewDriverOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${darkMode ? 'bg-[#0f172a] border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between pb-4 border-b dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 text-2xl">person_add</span>
                <h3 className="text-base font-bold">Register Driver</h3>
              </div>
              <button onClick={handleCloseNewDriver} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateDriver} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold mb-1 text-slate-500">Driver Code</label>
                  <input
                    type="text"
                    value={newDriver.code}
                    onChange={(e) => setNewDriver({ ...newDriver, code: e.target.value })}
                    className={`w-full px-3 py-1.5 rounded-lg border font-mono ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'}`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold mb-1 text-slate-500">Branch Assignment</label>
                  <select
                    value={newDriver.branch}
                    onChange={(e) => setNewDriver({ ...newDriver, branch: e.target.value })}
                    className={`w-full px-3 py-1.5 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'}`}
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
                <label className="block text-[11px] font-bold mb-1 text-slate-500">Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Danilo Ramos"
                  value={newDriver.name}
                  onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })}
                  className={`w-full px-3 py-1.5 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold mb-1 text-slate-500">LTO License No *</label>
                  <input
                    type="text"
                    placeholder="e.g. N01-12-889021"
                    value={newDriver.licenseNo}
                    onChange={(e) => setNewDriver({ ...newDriver, licenseNo: e.target.value })}
                    className={`w-full px-3 py-1.5 rounded-lg border font-mono uppercase ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'}`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold mb-1 text-slate-500">Mobile Phone</label>
                  <input
                    type="text"
                    placeholder="+63 917 000 0000"
                    value={newDriver.phone}
                    onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })}
                    className={`w-full px-3 py-1.5 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'}`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold mb-1 text-slate-500">Assigned Vehicle Plate (Optional)</label>
                <select
                  value={newDriver.assignedVehiclePlate}
                  onChange={(e) => setNewDriver({ ...newDriver, assignedVehiclePlate: e.target.value })}
                  className={`w-full px-3 py-1.5 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'}`}
                >
                  <option value="">None / Float Driver</option>
                  {fleetVehicles.map((v) => (
                    <option key={v.id} value={v.plateNo}>
                      {v.plateNo} - {v.vehicleType}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewDriverModal(false)}
                  className="px-4 py-1.5 rounded-lg border text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md"
                >
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
