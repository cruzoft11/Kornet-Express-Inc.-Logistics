import { useState } from 'react'
import { useLogisticsStore, PDOrder } from '../../stores/logisticsStore'
import { useSettingsStore } from '../../stores/settingsStore'

export default function PDOrdersManager() {
  const darkMode = useSettingsStore((s) => s.darkMode)
  const {
    pdOrders,
    createPDOrder,
    updatePDOrder,
    createWRFromPD,
    openPrintModal,
    addAuditLog,
    bridgeQueue,
    stageBridgeItem,
    modalOpen,
    setModalOpen
  } = useLogisticsStore()

  const [selectedOrderId, setSelectedOrderId] = useState<string>(pdOrders[0]?.id || '')
  const [activeTab, setActiveTab] = useState<'shipment' | 'times' | 'parties' | 'additional' | 'cargo' | 'dock'>('shipment')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [scannedBarcode, setScannedBarcode] = useState('')

  // Modal States
  const [showNewOrderModal, setShowNewOrderModal] = useState(false)
  const isNewOrderOpen = showNewOrderModal || modalOpen.newPDOrder
  const handleCloseNewOrder = () => {
    setShowNewOrderModal(false)
    setModalOpen('newPDOrder', false)
  }
  const [showLinkingModal, setShowLinkingModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState<string | null>(null)

  // Linking Modal States (Window #3.1)
  const [linkingTab, setLinkingTab] = useState<'cargo' | 'vehicle'>('cargo')
  const [linkingInput, setLinkingInput] = useState('')
  const [linkingStatus, setLinkingStatus] = useState<string | null>(null)

  // New Order Form State (Window #3)
  const [newOrder, setNewOrder] = useState<Partial<PDOrder>>({
    type: 'Pickup',
    warehouse: '',
    division: '',
    shipper: '',
    shipperAddress: '',
    shipperContact: '',
    consignee: '',
    consigneeAddress: '',
    consigneeContact: '',
    thirdParty: '',
    origin: '',
    destination: '',
    status: 'Scheduled',
    scheduledDate: new Date().toISOString().split('T')[0],
    appointmentTime: '',
    driver: '',
    equipmentType: '',
    route: '',
    proNo: '',
    barcode: '',
    amount: 0,
    quoteNo: '',
    siNo: '',
    declaredValue: 0,
    cargoDetails: [
      {
        cargoType: '',
        qty: 1,
        length: 0,
        width: 0,
        height: 0,
        unitWeight: 0,
        totalWeight: 0,
        cubic: 0,
        location: '',
        bin: '',
        materialDescription: '',
        hazardous: false
      }
    ],
    dockReceiptNo: ''
  })

  const selectedOrder = pdOrders.find((o) => o.id === selectedOrderId) || pdOrders[0]

  const filteredOrders = pdOrders.filter((o) => {
    const matchesSearch =
      searchTerm === '' ||
      o.orderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.consignee.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.shipper.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.driver.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.barcode.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter
    const matchesType = typeFilter === 'ALL' || o.type === typeFilter
    return matchesSearch && matchesStatus && matchesType
  })

  const handleSimulateScan = () => {
    if (!scannedBarcode) return
    const found = pdOrders.find((p) => p.barcode === scannedBarcode || p.orderNo === scannedBarcode)
    if (found) {
      setSelectedOrderId(found.id)
      alert(`Barcode Scan Verified: Linked to P/D Order ${found.orderNo} (${found.type}) for ${found.consignee}.`)
    } else {
      alert(`Barcode ${scannedBarcode} not recognized in active dispatch list.`)
    }
  }

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newOrder.shipper || !newOrder.consignee) {
      alert('Please enter both Shipper and Consignee details.')
      return
    }

    const orderNum = `PD-2026-${String(pdOrders.length + 1).padStart(3, '0')}`
    const fullOrder: PDOrder = {
      id: `pd-${Date.now()}`,
      orderNo: orderNum,
      type: newOrder.type || 'Pickup',
      division: newOrder.division || '',
      warehouse: newOrder.warehouse || '',
      shipper: newOrder.shipper || '',
      shipperAddress: newOrder.shipperAddress,
      shipperContact: newOrder.shipperContact,
      consignee: newOrder.consignee || '',
      consigneeAddress: newOrder.consigneeAddress,
      consigneeContact: newOrder.consigneeContact,
      thirdParty: newOrder.thirdParty,
      origin: newOrder.origin || '',
      destination: newOrder.destination || '',
      status: 'Scheduled',
      scheduledDate: newOrder.scheduledDate || new Date().toISOString().split('T')[0],
      appointmentTime: newOrder.appointmentTime,
      driver: newOrder.driver || '',
      equipmentType: newOrder.equipmentType,
      route: newOrder.route,
      proNo: newOrder.proNo,
      barcode: newOrder.barcode || `KNET-${Math.floor(10000000 + Math.random() * 90000000)}`,
      amount: Number(newOrder.amount) || 0,
      quoteNo: newOrder.quoteNo,
      siNo: newOrder.siNo,
      declaredValue: newOrder.declaredValue,
      cargoDetails: newOrder.cargoDetails || [],
      dockReceiptNo: newOrder.dockReceiptNo || ''
    }

    createPDOrder(fullOrder)
    setSelectedOrderId(fullOrder.id)
    handleCloseNewOrder()
    addAuditLog({
      module: 'P/D Orders',
      action: 'Create Order',
      referenceNo: fullOrder.orderNo,
      user: 'OP_DISPATCH',
      details: `Created new domestic ${fullOrder.type} order for ${fullOrder.consignee}`
    })
  }

  const handleCreateWR = () => {
    if (!selectedOrder) return
    const wrNo = createWRFromPD(selectedOrder.id)
    alert(`Warehouse Receipt ${wrNo} generated and linked to Order ${selectedOrder.orderNo}. Cargo is staged on Dock Bay 3.`)
  }

  const handlePickCargo = () => {
    if (!selectedOrder) return
    updatePDOrder(selectedOrder.id, { status: 'In Transit' })
    addAuditLog({
      module: 'P/D Orders',
      action: 'Pick Cargo Handover',
      referenceNo: selectedOrder.orderNo,
      user: 'WH_AGENT',
      details: `Driver ${selectedOrder.driver} confirmed physical pickup and cargo scan.`
    })
    alert(`Cargo Pick Verified: Order ${selectedOrder.orderNo} is now marked 'In Transit' with Driver ${selectedOrder.driver}.`)
  }

  const handleTransferToBridge = async () => {
    if (!selectedOrder) return
    // Check if already staged
    const exists = bridgeQueue.some((b) => b.sourceFileNo === selectedOrder.orderNo)
    if (exists) {
      alert(`Order ${selectedOrder.orderNo} has already been transferred to the Accounting Bridge.`)
      return
    }

    const staged = await stageBridgeItem({
      id: `br-pd-${Date.now()}`,
      sourceFileNo: selectedOrder.orderNo,
      sourceType: 'P/D Cartage',
      customerOrVendor: selectedOrder.consignee,
      docType: 'Invoice (AR)',
      billingOrCostCode: 'CART',
      glAccount: '',
      description: `Domestic ${selectedOrder.type} Cartage Delivery - ${selectedOrder.origin} to ${selectedOrder.destination}`,
      amount: selectedOrder.amount,
      status: 'Staged'
    })

    if (!staged) {
      alert('The cartage charge could not be saved to the Accounting Bridge. No local transfer was kept.')
      return
    }

    addAuditLog({
      module: 'P/D Orders',
      action: 'Transfer to Bridge',
      referenceNo: selectedOrder.orderNo,
      user: 'ACCT_BRIDGE',
      details: `Staged cartage charge $${selectedOrder.amount.toFixed(2)} to FS AR queue`
    })

    alert(`Order ${selectedOrder.orderNo} cartage fee of $${selectedOrder.amount.toFixed(2)} was saved to the Accounting Bridge queue.`)
  }

  const handleLinkingAction = (mode: 'search' | 'browse' | 'scan') => {
    if (linkingTab === 'cargo') {
      if (mode === 'search') {
        setLinkingStatus(linkingInput ? `Warehouse Receipt ${linkingInput} linked to order.` : 'Enter a warehouse receipt number to link.')
      } else if (mode === 'browse') {
        setLinkingStatus('Warehouse receipt lookup is unavailable until backend inventory is loaded.')
      } else {
        setLinkingStatus('Barcode scanner integration is not configured.')
      }
    } else {
      if (mode === 'search') {
        setLinkingStatus(linkingInput ? `VIN ${linkingInput} linked to order.` : 'Enter a VIN to link.')
      } else if (mode === 'browse') {
        setLinkingStatus('Vehicle lookup is unavailable until inventory is loaded.')
      } else {
        setLinkingStatus('Barcode scanner integration is not configured.')
      }
    }
  }

  return (
    <div className={`stitch-module-surface flex-1 flex flex-col overflow-hidden relative ${
      darkMode ? 'bg-[#0b1120] text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Ambient background light orbs */}
      <div className="orb-float-1 absolute -top-24 -left-24 w-96 h-96 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />
      <div className="orb-float-2 absolute -bottom-32 right-1/4 w-[28rem] h-[28rem] rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />

      {/* Top Action & Search Bar (Window #1 & #2) */}
      <div className={`px-6 py-3 border-b flex flex-wrap items-center justify-between gap-4 z-20 backdrop-blur-xl ${
        darkMode ? 'bg-[#0f172a]/80 border-white/10' : 'bg-white/80 border-slate-200'
      }`}>
        {/* Left: Barcode Scanner & Search */}
        <div className="flex items-center gap-2.5 flex-1 max-w-lg">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">
              barcode_scanner
            </span>
            <input
              type="text"
              placeholder="Scan Barcode or Search Order # / Consignee..."
              value={scannedBarcode || searchTerm}
              onChange={(e) => {
                setScannedBarcode(e.target.value)
                setSearchTerm(e.target.value)
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSimulateScan()}
              className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all ${
                darkMode ? 'bg-slate-900/80 border-white/10 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-800'
              }`}
            />
          </div>
          <button
            onClick={handleSimulateScan}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-900/30 flex items-center gap-1.5 transition-all active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[16px]">qr_code_scanner</span>
            Scan Link
          </button>
        </div>

        {/* Center: Filters */}
        <div className="flex items-center gap-2 text-xs">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className={`px-3 py-2 rounded-xl border font-semibold text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/50 ${
              darkMode ? 'bg-slate-900/80 border-white/10 text-slate-300' : 'bg-white border-slate-300 text-slate-700'
            }`}
          >
            <option value="ALL">All Types</option>
            <option value="Pickup">Pickup</option>
            <option value="Delivery">Delivery</option>
            <option value="Xdock">Cross-Dock (Xdock)</option>
            <option value="Exchange">Exchange</option>
            <option value="Quote">Quote</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`px-3 py-2 rounded-xl border font-semibold text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/50 ${
              darkMode ? 'bg-slate-900/80 border-white/10 text-slate-300' : 'bg-white border-slate-300 text-slate-700'
            }`}
          >
            <option value="ALL">All Statuses</option>
            <option value="Scheduled">Scheduled</option>
            <option value="In Transit">In Transit</option>
            <option value="Completed">Completed</option>
            <option value="Pending">Pending</option>
          </select>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewOrderModal(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 flex items-center gap-1.5 transition-all active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[16px]">add_circle</span>
            New P/D Order
          </button>

          <button
            onClick={() => setShowLinkingModal(true)}
            className={`px-3.5 py-2 rounded-xl border font-semibold text-xs flex items-center gap-1.5 transition-all active:scale-[0.98] ${
              darkMode ? 'border-white/10 text-slate-300 hover:bg-white/5' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span className="material-symbols-outlined text-[16px] text-amber-400">link</span>
            Link Cargo / VIN
          </button>

          <button
            onClick={() => setShowReportModal('summary')}
            className={`px-3.5 py-2 rounded-xl border font-semibold text-xs flex items-center gap-1.5 transition-all active:scale-[0.98] ${
              darkMode ? 'border-white/10 text-slate-300 hover:bg-white/5' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span className="material-symbols-outlined text-[16px] text-blue-400">description</span>
            P/D Reports
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden z-10">
        {/* Left: Orders List (Window #2) */}
        <div className={`w-84 border-r flex flex-col overflow-y-auto backdrop-blur-xl ${
          darkMode ? 'bg-slate-900/40 border-white/10' : 'bg-white/60 border-slate-200'
        }`}>
          <div className={`p-3.5 border-b text-[10px] font-mono uppercase tracking-wider flex justify-between items-center ${
            darkMode ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-500'
          }`}>
            <span className="font-bold">Cartage Orders ({filteredOrders.length})</span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">Kornet Drayage</span>
          </div>

          <div className="p-2 space-y-1.5 overflow-y-auto">
            {filteredOrders.map((o) => {
              const isSelected = o.id === selectedOrder?.id
              return (
                <div
                  key={o.id}
                  onClick={() => setSelectedOrderId(o.id)}
                  className={`p-3 rounded-xl cursor-pointer transition-all border ${
                    isSelected
                      ? darkMode
                        ? 'bg-blue-500/15 border-blue-500/30 text-white shadow-lg shadow-blue-500/10'
                        : 'bg-blue-50 border-blue-300 text-slate-900 shadow-sm'
                      : darkMode
                      ? 'border-white/5 hover:border-white/15 hover:bg-white/5 text-slate-300'
                      : 'border-slate-100 hover:border-slate-300 hover:bg-white text-slate-700'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="font-bold text-xs font-mono tracking-tight">{o.orderNo}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-mono uppercase font-bold border ${
                        o.status === 'Completed'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : o.status === 'In Transit'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      }`}
                    >
                      {o.status}
                    </span>
                  </div>
                  <div className="text-xs font-semibold truncate mb-1">
                    <span className="text-blue-400 font-mono text-[11px] mr-1">{o.type.toUpperCase()}</span>
                    <span>{o.consignee}</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 flex justify-between items-center">
                    <span className="truncate max-w-[150px]">{o.origin} &rarr; {o.destination}</span>
                    <span className="font-bold text-emerald-400">${o.amount.toFixed(2)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: Detailed Order View with Tabs (Window #3) */}
        {selectedOrder ? (
          <div className="flex-1 flex flex-col overflow-y-auto p-6 space-y-5">
            {/* Header Card */}
            <div className={`rounded-2xl p-6 border shadow-2xl relative overflow-hidden backdrop-blur-2xl ${
              darkMode ? 'bg-[#0f172a]/90 border-white/10 text-white' : 'bg-white/95 border-slate-200 text-slate-900'
            }`}>
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500" />
              
              <div className="flex flex-wrap justify-between items-start gap-4 pb-5 border-b border-white/10">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-black font-mono tracking-tight">
                      {selectedOrder.orderNo}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {selectedOrder.type} Cartage
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      Warehouse Depot: <strong className={darkMode ? 'text-white' : 'text-slate-900'}>{selectedOrder.warehouse}</strong>
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5 font-mono">
                    Routing: <strong className={darkMode ? 'text-slate-200' : 'text-slate-700'}>{selectedOrder.origin}</strong> &rarr; <strong className={darkMode ? 'text-slate-200' : 'text-slate-700'}>{selectedOrder.destination}</strong> &bull; Sched: <strong className="text-blue-400">{selectedOrder.scheduledDate}</strong>
                  </p>
                </div>

                {/* Operations Toolbar */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleCreateWR}
                    title="Generate official Warehouse Receipt from cargo lines"
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-900/30 flex items-center gap-1.5 transition-all active:scale-[0.98]"
                  >
                    <span className="material-symbols-outlined text-[16px]">warehouse</span>
                    Create W/R
                  </button>

                  <button
                    onClick={handlePickCargo}
                    title="Confirm physical cargo handover and advance status"
                    className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md shadow-amber-900/30 flex items-center gap-1.5 transition-all active:scale-[0.98]"
                  >
                    <span className="material-symbols-outlined text-[16px]">forklift</span>
                    Pick Cargo
                  </button>

                  <button
                    onClick={() =>
                      openPrintModal({
                        type: 'DOCK_RECEIPT',
                        title: `Official Dock Receipt - ${selectedOrder.orderNo}`,
                        data: selectedOrder
                      })
                    }
                    className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all active:scale-[0.98] ${
                      darkMode ? 'border-white/10 text-slate-200 hover:bg-white/5' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                    Dock Receipt
                  </button>

                  <button
                    onClick={() =>
                      openPrintModal({
                        type: 'BARCODE_LABELS',
                        title: `Cartage Barcode Shipping Labels - ${selectedOrder.orderNo}`,
                        data: {
                          fileNo: selectedOrder.orderNo,
                          shipper: selectedOrder.shipper,
                          consignee: selectedOrder.consignee,
                          pieces: selectedOrder.cargoDetails.reduce((a, b) => a + b.qty, 0),
                          weightKg: 1905,
                          barcode: selectedOrder.barcode
                        }
                      })
                    }
                    className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all active:scale-[0.98] ${
                      darkMode ? 'border-white/10 text-slate-200 hover:bg-white/5' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">qr_code_2</span>
                    Labels
                  </button>

                  <button
                    onClick={handleTransferToBridge}
                    title="Stage cartage freight fee to the Accounting Bridge"
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-900/30 flex items-center gap-1.5 transition-all active:scale-[0.98]"
                  >
                    <span className="material-symbols-outlined text-[16px]">hub</span>
                    Transfer to Acct Bridge
                  </button>
                </div>
              </div>

              {/* Quick Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-5 text-xs">
                <div className={`p-3 rounded-xl border ${darkMode ? 'bg-slate-900/60 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-slate-400 text-[10px] font-mono uppercase tracking-wider block mb-1">Assigned Driver</span>
                  <span className="font-semibold">{selectedOrder.driver || 'Unassigned'}</span>
                </div>
                <div className={`p-3 rounded-xl border ${darkMode ? 'bg-slate-900/60 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-slate-400 text-[10px] font-mono uppercase tracking-wider block mb-1">Appointment Time</span>
                  <span className="font-semibold font-mono">{selectedOrder.appointmentTime || 'N/A'}</span>
                </div>
                <div className={`p-3 rounded-xl border ${darkMode ? 'bg-slate-900/60 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-slate-400 text-[10px] font-mono uppercase tracking-wider block mb-1">Cartage Freight Fee</span>
                  <strong className="text-emerald-400 font-mono text-sm">${selectedOrder.amount.toFixed(2)}</strong>
                </div>
                <div className={`p-3 rounded-xl border ${darkMode ? 'bg-slate-900/60 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-slate-400 text-[10px] font-mono uppercase tracking-wider block mb-1">Barcode Tracking</span>
                  <span className="font-mono font-bold text-blue-400">{selectedOrder.barcode}</span>
                </div>
                <div className={`p-3 rounded-xl border ${darkMode ? 'bg-slate-900/60 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-slate-400 text-[10px] font-mono uppercase tracking-wider block mb-1">Warehouse Receipt</span>
                  <span className="font-mono font-bold text-indigo-400">{selectedOrder.linkedWR || 'Pending Generation'}</span>
                </div>
              </div>
            </div>

            {/* Tab Navigation (Window #3 Tabs) */}
            <div className={`flex p-1.5 gap-1.5 rounded-2xl border backdrop-blur-xl ${
              darkMode ? 'bg-[#0f172a]/80 border-white/10' : 'bg-white/80 border-slate-200'
            }`}>
              {[
                { id: 'shipment', label: 'Shipment & Carrier', icon: 'local_shipping' },
                { id: 'times', label: 'Times & Handling', icon: 'schedule' },
                { id: 'parties', label: 'Shipper & Consignee', icon: 'group' },
                { id: 'additional', label: 'Additional Information', icon: 'info' },
                { id: 'cargo', label: 'Cargo Details & W/R', icon: 'inventory_2' },
                { id: 'dock', label: 'Dock Receipt', icon: 'fact_check' }
              ].map((tab) => {
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                      isActive
                        ? darkMode
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-sm'
                          : 'bg-blue-600 text-white shadow-md'
                        : darkMode
                        ? 'text-slate-400 hover:text-white hover:bg-white/5'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                    <span className="tracking-tight">{tab.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Tab Body */}
            <div className={`border rounded-2xl p-6 shadow-2xl backdrop-blur-2xl ${
              darkMode ? 'bg-[#0f172a]/90 border-white/10 text-white' : 'bg-white/95 border-slate-200 text-slate-900'
            }`}>
              {/* 1. Shipment & Carrier Tab */}
              {activeTab === 'shipment' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                  <div className="space-y-4">
                    <h4 className="font-bold border-b border-white/10 pb-2 text-sm flex items-center gap-2">
                      <span className="material-symbols-outlined text-blue-400 text-[18px]">tag</span>
                      Reference & Dispatch Numbers
                    </h4>
                    <div>
                      <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5">PRO Tracking #</label>
                      <input
                        type="text"
                        value={selectedOrder.proNo || 'PRO-88129'}
                        readOnly
                        className={`w-full px-3 py-2 rounded-xl border font-mono font-bold text-xs ${
                          darkMode ? 'bg-slate-900/60 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5">Quote # Reference</label>
                      <input
                        type="text"
                        value={selectedOrder.quoteNo || 'QT-2026-0042'}
                        readOnly
                        className={`w-full px-3 py-2 rounded-xl border font-mono text-xs ${
                          darkMode ? 'bg-slate-900/60 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5">Shipping Instruction (SI #)</label>
                      <input
                        type="text"
                        value={selectedOrder.siNo || 'SI-7739'}
                        readOnly
                        className={`w-full px-3 py-2 rounded-xl border font-mono text-xs ${
                          darkMode ? 'bg-slate-900/60 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold border-b border-white/10 pb-2 text-sm flex items-center gap-2">
                      <span className="material-symbols-outlined text-indigo-400 text-[18px]">alt_route</span>
                      Equipment & Corridor
                    </h4>
                    <div>
                      <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5">Equipment Type</label>
                      <input
                        type="text"
                        value={selectedOrder.equipmentType || '40ft Skeletal Chassis Trailer'}
                        readOnly
                        className={`w-full px-3 py-2 rounded-xl border font-bold text-xs ${
                          darkMode ? 'bg-slate-900/60 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5">Route Corridor</label>
                      <input
                        type="text"
                        value={selectedOrder.route || 'SLEX Southbound Express Highway'}
                        readOnly
                        className={`w-full px-3 py-2 rounded-xl border text-xs ${
                          darkMode ? 'bg-slate-900/60 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5">Declared Customs Value ($)</label>
                      <input
                        type="text"
                        value={`$${(selectedOrder.declaredValue || 25000).toLocaleString()}`}
                        readOnly
                        className={`w-full px-3 py-2 rounded-xl border font-mono font-bold text-emerald-400 text-xs ${
                          darkMode ? 'bg-slate-900/60 border-white/10' : 'bg-slate-50 border-slate-300'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold border-b border-white/10 pb-2 text-sm flex items-center gap-2">
                      <span className="material-symbols-outlined text-emerald-400 text-[18px]">payments</span>
                      Financial Summary
                    </h4>
                    <div className={`p-4 rounded-xl border space-y-2.5 ${
                      darkMode ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'
                    }`}>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Cartage Base Rate:</span>
                        <strong className="font-mono text-slate-200">$280.00</strong>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Fuel & Toll Surcharge:</span>
                        <strong className="font-mono text-slate-200">$40.00</strong>
                      </div>
                      <div className="border-t border-white/10 pt-2.5 flex justify-between items-center text-sm font-black">
                        <span className="text-blue-400">Total Cartage Fee:</span>
                        <span className="text-emerald-400 font-mono text-base">${selectedOrder.amount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Times & Handling Tab */}
              {activeTab === 'times' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  <div className="space-y-4">
                    <h4 className="font-bold border-b border-white/10 pb-2 text-sm flex items-center gap-2">
                      <span className="material-symbols-outlined text-blue-400 text-[18px]">calendar_clock</span>
                      Target & Scheduled Timeline
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5">Ready Date</label>
                        <input
                          type="date"
                          value={selectedOrder.scheduledDate}
                          readOnly
                          className={`w-full px-3 py-2 rounded-xl border font-semibold text-xs ${
                            darkMode ? 'bg-slate-900/60 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5">Ready Time</label>
                        <input
                          type="text"
                          value="08:00 AM"
                          readOnly
                          className={`w-full px-3 py-2 rounded-xl border font-semibold text-xs ${
                            darkMode ? 'bg-slate-900/60 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                          }`}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5">Appointment Date</label>
                        <input
                          type="date"
                          value={selectedOrder.scheduledDate}
                          readOnly
                          className={`w-full px-3 py-2 rounded-xl border font-semibold text-xs ${
                            darkMode ? 'bg-slate-900/60 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5">Appointment Time</label>
                        <input
                          type="text"
                          value={selectedOrder.appointmentTime || '09:00 AM'}
                          readOnly
                          className={`w-full px-3 py-2 rounded-xl border font-semibold text-xs ${
                            darkMode ? 'bg-slate-900/60 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold border-b border-white/10 pb-2 text-sm flex items-center gap-2">
                      <span className="material-symbols-outlined text-emerald-400 text-[18px]">verified</span>
                      Actual Execution Log
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5">Actual Pickup Completed</label>
                        <input
                          type="text"
                          value={selectedOrder.status !== 'Scheduled' ? `${selectedOrder.scheduledDate} 08:45 AM` : 'Pending Dispatch'}
                          readOnly
                          className={`w-full px-3 py-2 rounded-xl border font-mono text-xs font-bold ${
                            selectedOrder.status !== 'Scheduled' ? 'text-emerald-400' : 'text-slate-400'
                          } ${darkMode ? 'bg-slate-900/60 border-white/10' : 'bg-slate-50 border-slate-300'}`}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5">Actual Delivery Completed</label>
                        <input
                          type="text"
                          value={selectedOrder.status === 'Completed' ? `${selectedOrder.scheduledDate} 11:30 AM` : 'En Route / Pending'}
                          readOnly
                          className={`w-full px-3 py-2 rounded-xl border font-mono text-xs ${
                            selectedOrder.status === 'Completed' ? 'text-emerald-400 font-bold' : 'text-slate-400'
                          } ${darkMode ? 'bg-slate-900/60 border-white/10' : 'bg-slate-50 border-slate-300'}`}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5">Handling Remarks</label>
                      <p className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                        darkMode ? 'bg-slate-900/60 border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}>
                        Driver reported zero transit bottlenecks along South Luzon Expressway corridor. Gate pass confirmed and cargo secure.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Shipper & Consignee Tab */}
              {activeTab === 'parties' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                  <div className={`space-y-3.5 p-4 rounded-xl border ${
                    darkMode ? 'bg-blue-500/5 border-blue-500/20' : 'bg-blue-50/50 border-blue-200'
                  }`}>
                    <h4 className="font-bold text-blue-400 text-sm flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">upload</span>
                      Shipper Details
                    </h4>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-mono uppercase tracking-wider mb-0.5">Company Name</span>
                      <strong className="text-sm tracking-tight">{selectedOrder.shipper}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-mono uppercase tracking-wider mb-0.5">Terminal Address</span>
                      <p className="text-slate-300">{selectedOrder.shipperAddress || 'South Harbor Customs Zone, Port Area, Manila'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-mono uppercase tracking-wider mb-0.5">Contact / Phone</span>
                      <p className="text-slate-300">{selectedOrder.shipperContact || 'Mr. Manuel Santos &bull; +63 2 8527 1100'}</p>
                    </div>
                  </div>

                  <div className={`space-y-3.5 p-4 rounded-xl border ${
                    darkMode ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50/50 border-emerald-200'
                  }`}>
                    <h4 className="font-bold text-emerald-400 text-sm flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">download</span>
                      Consignee Details
                    </h4>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-mono uppercase tracking-wider mb-0.5">Company Name</span>
                      <strong className="text-sm tracking-tight">{selectedOrder.consignee}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-mono uppercase tracking-wider mb-0.5">Delivery Address</span>
                      <p className="text-slate-300">{selectedOrder.consigneeAddress || 'Laguna Technopark Phase 3, Santa Rosa, Laguna'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-mono uppercase tracking-wider mb-0.5">Contact / Phone</span>
                      <p className="text-slate-300">{selectedOrder.consigneeContact || 'Engr. Teresa Reyes &bull; +63 49 541 2000'}</p>
                    </div>
                  </div>

                  <div className={`space-y-3.5 p-4 rounded-xl border ${
                    darkMode ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50/50 border-amber-200'
                  }`}>
                    <h4 className="font-bold text-amber-400 text-sm flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">domain</span>
                      Third Party / Bill-To
                    </h4>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-mono uppercase tracking-wider mb-0.5">Billing Entity</span>
                      <strong className="text-sm tracking-tight">{selectedOrder.thirdParty || 'Kornet Logistics Direct Billing'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-mono uppercase tracking-wider mb-0.5">Account Terms</span>
                      <p className="text-slate-300">Net 30 Days &bull; Credit Line Approved</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. Additional Information Tab */}
              {activeTab === 'additional' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  <div className="space-y-4">
                    <h4 className="font-bold border-b border-white/10 pb-2 text-sm flex items-center gap-2">
                      <span className="material-symbols-outlined text-blue-400 text-[18px]">checklist</span>
                      Pickup Instructions & Marks
                    </h4>
                    <div>
                      <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5">Pickup / Loading Instructions</label>
                      <textarea
                        rows={3}
                        readOnly
                        value="Present Delivery Permit at Gate 2. Driver must wear standard PPE (hard hat, vest, steel toe shoes). Pre-check cargo tie-downs."
                        className={`w-full px-3 py-2 rounded-xl border text-xs leading-relaxed ${
                          darkMode ? 'bg-slate-900/60 border-white/10 text-slate-300' : 'bg-slate-50 border-slate-300 text-slate-700'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5">Marks and Numbers</label>
                      <input
                        type="text"
                        readOnly
                        value="KNET-MNL-2026 / 1-12 / FRAGILE ELECTRONIC"
                        className={`w-full px-3 py-2 rounded-xl border font-mono text-xs ${
                          darkMode ? 'bg-slate-900/60 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold border-b border-white/10 pb-2 text-sm flex items-center gap-2">
                      <span className="material-symbols-outlined text-indigo-400 text-[18px]">receipt</span>
                      Purchase Order & Trailer Specs
                    </h4>
                    <div>
                      <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5">PO Numbers</label>
                      <input
                        type="text"
                        readOnly
                        value="PO-991204, PO-991205"
                        className={`w-full px-3 py-2 rounded-xl border font-mono font-bold text-xs ${
                          darkMode ? 'bg-slate-900/60 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5">Trailer #</label>
                        <input
                          type="text"
                          readOnly
                          value="TR-8812"
                          className={`w-full px-3 py-2 rounded-xl border font-mono text-xs ${
                            darkMode ? 'bg-slate-900/60 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5">Bolt Seal #</label>
                        <input
                          type="text"
                          readOnly
                          value="SL-994102"
                          className={`w-full px-3 py-2 rounded-xl border font-mono font-bold text-blue-400 text-xs ${
                            darkMode ? 'bg-slate-900/60 border-white/10' : 'bg-slate-50 border-slate-300'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. Cargo Details & W/R Tab */}
              {activeTab === 'cargo' && (
                <div className="space-y-4 text-xs">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-sm tracking-tight">
                        Cargo Manifest Lines (Warehouse Receipt Linked)
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono">
                        Physical cargo package lines, dimensional measurements, weight, and hazmat ratings.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowLinkingModal(true)}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-900/30 transition-all active:scale-[0.98]"
                    >
                      <span className="material-symbols-outlined text-[16px]">add_link</span>
                      Link Additional Cargo / VIN
                    </button>
                  </div>

                  <div className={`overflow-x-auto border rounded-2xl ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
                    <table className="w-full text-left">
                      <thead className={`border-b text-[10px] font-mono uppercase tracking-wider ${
                        darkMode ? 'bg-slate-900/80 border-white/10 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}>
                        <tr>
                          <th className="py-3 px-4">Cargo Type</th>
                          <th className="py-3 px-4">Qty</th>
                          <th className="py-3 px-4">Dimensions (L x W x H)</th>
                          <th className="py-3 px-4">Unit Wt (lbs)</th>
                          <th className="py-3 px-4">Total Wt (lbs)</th>
                          <th className="py-3 px-4">Cube (cbf)</th>
                          <th className="py-3 px-4">Location / Bin</th>
                          <th className="py-3 px-4">Hazmat Rating</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${darkMode ? 'divide-white/5' : 'divide-slate-200'}`}>
                        {selectedOrder.cargoDetails.map((c, idx) => (
                          <tr key={idx} className={`transition-colors ${darkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                            <td className="py-3 px-4">
                              <span className="font-bold block text-xs">{c.cargoType}</span>
                              <span className="text-[10px] text-slate-400">{c.materialDescription}</span>
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-blue-400">{c.qty} Pcs</td>
                            <td className="py-3 px-4 font-mono text-slate-300">
                              {c.length}" x {c.width}" x {c.height}"
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-300">{c.unitWeight}</td>
                            <td className="py-3 px-4 font-mono font-bold text-white">{c.totalWeight}</td>
                            <td className="py-3 px-4 font-mono text-slate-300">{c.cubic}</td>
                            <td className="py-3 px-4 font-mono text-emerald-400 font-bold">{c.location} / {c.bin}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono uppercase font-bold border ${
                                c.hazardous
                                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                  : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                              }`}>
                                {c.hazardous ? 'HAZARDOUS' : 'NON-HAZ'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 6. Dock Receipt Tab */}
              {activeTab === 'dock' && (
                <div className="space-y-4 text-xs">
                  <div className="flex justify-between items-center border-b border-white/10 pb-3">
                    <div>
                      <h4 className="font-bold text-sm tracking-tight">
                        Official Dock Receipt & Driver Handover (DR # {selectedOrder.dockReceiptNo || 'DR-2026-081'})
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono">
                        Inbound warehouse receipt verification with condition check and driver sign-off.
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        openPrintModal({
                          type: 'DOCK_RECEIPT',
                          title: `Official Dock Receipt - ${selectedOrder.orderNo}`,
                          data: selectedOrder
                        })
                      }
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-[0.98]"
                    >
                      <span className="material-symbols-outlined text-[16px]">print</span>
                      Print Official Dock Receipt Form
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className={`p-4 rounded-xl border space-y-2 ${
                      darkMode ? 'bg-slate-900/60 border-white/10' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">Received By (Terminal Agent)</span>
                      <strong className="block text-sm">Carlos Mendoza (Dock Super)</strong>
                      <span className="text-[10px] font-mono text-slate-400 block">Date: {selectedOrder.scheduledDate} 08:30 AM</span>
                    </div>

                    <div className={`p-4 rounded-xl border space-y-2 ${
                      darkMode ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'
                    }`}>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 block">Condition on Arrival</span>
                      <strong className="block text-sm text-emerald-400">&check; Sound & Clean - No Exceptions</strong>
                      <span className="text-[10px] text-slate-400 block">All 12 pallets stretch wrapped intact.</span>
                    </div>

                    <div className={`p-4 rounded-xl border space-y-2 ${
                      darkMode ? 'bg-blue-500/5 border-blue-500/20' : 'bg-blue-50 border-blue-200'
                    }`}>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 block">Driver Acknowledgment</span>
                      <strong className="block text-sm text-blue-400">{selectedOrder.driver}</strong>
                      <span className="text-[10px] text-slate-400 block">Digital POD signature verified &bull; On File</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
            Select a P/D order to view route and cargo details
          </div>
        )}
      </div>

      {/* New P/D Order Modal (Window #3) */}
      {isNewOrderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`w-full max-w-3xl rounded-2xl border shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] backdrop-blur-2xl ${
            darkMode ? 'bg-[#0f172a]/95 border-white/10 text-white shadow-black/80' : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-300'
          }`}>
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500" />

            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <span className="material-symbols-outlined text-xl">local_shipping</span>
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight">New Domestic P/D Cartage Order</h3>
                  <p className="text-[11px] text-slate-400 font-mono">Cartage Dispatch Entry & Warehouse Receipt Assignment</p>
                </div>
              </div>
              <button
                onClick={handleCloseNewOrder}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">Order Type</label>
                  <select
                    value={newOrder.type}
                    onChange={(e) => setNewOrder({ ...newOrder, type: e.target.value as any })}
                    className={`w-full px-3 py-2 rounded-xl border font-bold text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 ${
                      darkMode ? 'bg-slate-900/80 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="Pickup">Pickup Cartage</option>
                    <option value="Delivery">Final Delivery</option>
                    <option value="Xdock">Cross-Dock (Xdock)</option>
                    <option value="Exchange">Equipment Exchange</option>
                    <option value="Quote">Rate Quotation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">Warehouse Depot Hub</label>
                  <select
                    value={newOrder.warehouse}
                    onChange={(e) => setNewOrder({ ...newOrder, warehouse: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border font-bold text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 ${
                      darkMode ? 'bg-slate-900/80 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="Manila Port Terminal Hub">Manila Port Terminal Hub</option>
                    <option value="Cebu Logistics Depot">Cebu Logistics Depot</option>
                    <option value="Davao CFS Cargo Center">Davao CFS Cargo Center</option>
                    <option value="Subic Freeport Zone Terminal">Subic Freeport Zone Terminal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">Cartage Fee ($)</label>
                  <input
                    type="number"
                    value={newOrder.amount}
                    onChange={(e) => setNewOrder({ ...newOrder, amount: parseFloat(e.target.value) || 0 })}
                    className={`w-full px-3 py-2 rounded-xl border font-mono font-bold text-emerald-400 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 ${
                      darkMode ? 'bg-slate-900/80 border-white/10' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className={`space-y-2.5 p-3.5 rounded-xl border ${
                  darkMode ? 'bg-slate-900/60 border-white/10' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className="font-mono text-[10px] uppercase font-bold text-blue-400 block">Shipper Details</span>
                  <input
                    type="text"
                    placeholder="Shipper Company Name *"
                    required
                    value={newOrder.shipper}
                    onChange={(e) => setNewOrder({ ...newOrder, shipper: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500/50 ${
                      darkMode ? 'bg-slate-900/80 border-white/10 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                  <input
                    type="text"
                    placeholder="Shipper Terminal Address"
                    value={newOrder.shipperAddress}
                    onChange={(e) => setNewOrder({ ...newOrder, shipperAddress: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/50 ${
                      darkMode ? 'bg-slate-900/80 border-white/10 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                  <input
                    type="text"
                    placeholder="Contact Person & Mobile"
                    value={newOrder.shipperContact}
                    onChange={(e) => setNewOrder({ ...newOrder, shipperContact: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/50 ${
                      darkMode ? 'bg-slate-900/80 border-white/10 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div className={`space-y-2.5 p-3.5 rounded-xl border ${
                  darkMode ? 'bg-slate-900/60 border-white/10' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className="font-mono text-[10px] uppercase font-bold text-emerald-400 block">Consignee Details</span>
                  <input
                    type="text"
                    placeholder="Consignee Company Name *"
                    required
                    value={newOrder.consignee}
                    onChange={(e) => setNewOrder({ ...newOrder, consignee: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500/50 ${
                      darkMode ? 'bg-slate-900/80 border-white/10 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                  <input
                    type="text"
                    placeholder="Consignee Facility Address"
                    value={newOrder.consigneeAddress}
                    onChange={(e) => setNewOrder({ ...newOrder, consigneeAddress: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 ${
                      darkMode ? 'bg-slate-900/80 border-white/10 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                  <input
                    type="text"
                    placeholder="Contact Person & Phone"
                    value={newOrder.consigneeContact}
                    onChange={(e) => setNewOrder({ ...newOrder, consigneeContact: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 ${
                      darkMode ? 'bg-slate-900/80 border-white/10 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">Origin Location</label>
                  <input
                    type="text"
                    value={newOrder.origin}
                    onChange={(e) => setNewOrder({ ...newOrder, origin: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500/50 ${
                      darkMode ? 'bg-slate-900/80 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">Destination Hub</label>
                  <input
                    type="text"
                    value={newOrder.destination}
                    onChange={(e) => setNewOrder({ ...newOrder, destination: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500/50 ${
                      darkMode ? 'bg-slate-900/80 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">Assigned Driver</label>
                  <input
                    type="text"
                    value={newOrder.driver}
                    onChange={(e) => setNewOrder({ ...newOrder, driver: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500/50 ${
                      darkMode ? 'bg-slate-900/80 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleCloseNewOrder}
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
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  Save & Stage P/D Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Linking Modal (Window #3.1 - Search / Browse / Scan Cargo or Vehicle) */}
      {showLinkingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`w-full max-w-xl rounded-2xl border shadow-2xl relative overflow-hidden flex flex-col backdrop-blur-2xl ${
            darkMode ? 'bg-[#0f172a]/95 border-white/10 text-white shadow-black/80' : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-300'
          }`}>
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500" />

            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <span className="material-symbols-outlined text-xl">link</span>
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight">Cargo & Vehicle Linking Dialog</h3>
                  <p className="text-[11px] text-slate-400 font-mono">Cross-link Warehouse Receipt inventory or VIN staging</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowLinkingModal(false)
                  setLinkingStatus(null)
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* Tab: Cargo vs Vehicle */}
              <div className="flex p-1 gap-1 rounded-xl bg-black/20 border border-white/10">
                <button
                  onClick={() => {
                    setLinkingTab('cargo')
                    setLinkingStatus(null)
                  }}
                  className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all ${
                    linkingTab === 'cargo'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Cargo Manifest (Warehouse Receipt)
                </button>
                <button
                  onClick={() => {
                    setLinkingTab('vehicle')
                    setLinkingStatus(null)
                  }}
                  className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all ${
                    linkingTab === 'vehicle'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Vehicle Asset (VIN Inventory)
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                  {linkingTab === 'cargo' ? 'Enter Warehouse Receipt # (WR #):' : 'Enter 17-Digit Vehicle VIN #:'}
                </label>
                <input
                  type="text"
                  placeholder={linkingTab === 'cargo' ? 'e.g. WR-2026-0041' : 'e.g. 1HGCR2F83HA129048'}
                  value={linkingInput}
                  onChange={(e) => setLinkingInput(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border font-mono font-bold text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/50 ${
                    darkMode ? 'bg-slate-900/80 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              {/* Linking Methods */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                <button
                  onClick={() => handleLinkingAction('search')}
                  className={`p-3 rounded-xl border font-bold flex flex-col items-center gap-1.5 transition-all active:scale-[0.98] ${
                    darkMode ? 'border-white/10 hover:border-blue-500/50 bg-slate-900/60' : 'border-slate-200 hover:border-blue-500 bg-slate-50'
                  }`}
                >
                  <span className="material-symbols-outlined text-blue-400">search</span>
                  <span className="text-xs">1. Search</span>
                  <span className="text-[10px] text-slate-400 font-mono">By Manual Entry</span>
                </button>

                <button
                  onClick={() => handleLinkingAction('browse')}
                  className={`p-3 rounded-xl border font-bold flex flex-col items-center gap-1.5 transition-all active:scale-[0.98] ${
                    darkMode ? 'border-white/10 hover:border-amber-500/50 bg-slate-900/60' : 'border-slate-200 hover:border-amber-500 bg-slate-50'
                  }`}
                >
                  <span className="material-symbols-outlined text-amber-400">travel_explore</span>
                  <span className="text-xs">2. Browse</span>
                  <span className="text-[10px] text-slate-400 font-mono">Active Staging</span>
                </button>

                <button
                  onClick={() => handleLinkingAction('scan')}
                  className={`p-3 rounded-xl border font-bold flex flex-col items-center gap-1.5 transition-all active:scale-[0.98] ${
                    darkMode ? 'border-white/10 hover:border-emerald-500/50 bg-slate-900/60' : 'border-slate-200 hover:border-emerald-500 bg-slate-50'
                  }`}
                >
                  <span className="material-symbols-outlined text-emerald-400">barcode_scanner</span>
                  <span className="text-xs">3. Scan</span>
                  <span className="text-[10px] text-slate-400 font-mono">Optical Device</span>
                </button>
              </div>

              {linkingStatus && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>
                  <span>{linkingStatus}</span>
                </div>
              )}
            </div>

            <div className="px-6 py-3.5 border-t border-white/10 flex justify-end">
              <button
                onClick={() => {
                  setShowLinkingModal(false)
                  setLinkingStatus(null)
                }}
                className={`px-4 py-2 rounded-xl font-semibold transition-all border ${
                  darkMode ? 'border-white/10 text-slate-300 hover:bg-white/5' : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Close & Return
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reports Dialog (Windows #4, #5, #6, #7, #8) */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`w-full max-w-2xl rounded-2xl border shadow-2xl relative overflow-hidden flex flex-col backdrop-blur-2xl ${
            darkMode ? 'bg-[#0f172a]/95 border-white/10 text-white shadow-black/80' : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-300'
          }`}>
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <span className="material-symbols-outlined text-xl">print</span>
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight">Pickup & Delivery Reports Generator</h3>
                  <p className="text-[11px] text-slate-400 font-mono">Generate SLA compliance and drayage audit forms</p>
                </div>
              </div>
              <button
                onClick={() => setShowReportModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div
                  onClick={() => setShowReportModal('summary')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    showReportModal === 'summary'
                      ? 'border-blue-500/50 bg-blue-500/15 text-blue-400 font-bold'
                      : darkMode ? 'border-white/10 hover:bg-white/5' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="material-symbols-outlined block mb-1.5 text-blue-400">table_chart</span>
                  <span className="block text-xs font-bold">2b. P/D Orders Report</span>
                  <span className="text-[10px] text-slate-400 block font-mono mt-0.5">Date range dispatch list</span>
                </div>

                <div
                  onClick={() => setShowReportModal('ontime')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    showReportModal === 'ontime'
                      ? 'border-blue-500/50 bg-blue-500/15 text-blue-400 font-bold'
                      : darkMode ? 'border-white/10 hover:bg-white/5' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="material-symbols-outlined block mb-1.5 text-amber-400">timer</span>
                  <span className="block text-xs font-bold">2c. On-Time Report</span>
                  <span className="text-[10px] text-slate-400 block font-mono mt-0.5">Carrier SLA compliance</span>
                </div>

                <div
                  onClick={() => setShowReportModal('details')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    showReportModal === 'details'
                      ? 'border-blue-500/50 bg-blue-500/15 text-blue-400 font-bold'
                      : darkMode ? 'border-white/10 hover:bg-white/5' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="material-symbols-outlined block mb-1.5 text-emerald-400">receipt_long</span>
                  <span className="block text-xs font-bold">2d. Cargo Details Report</span>
                  <span className="text-[10px] text-slate-400 block font-mono mt-0.5">Pieces & volume audit</span>
                </div>
              </div>

              {/* Report Preview */}
              <div className={`p-4 rounded-xl border space-y-3 font-mono ${
                darkMode ? 'bg-slate-900/60 border-white/10' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="text-center pb-2 border-b border-white/10">
                  <h4 className="font-bold tracking-tight">KORNET EXPRESS FREIGHT & CARGO SERVICES</h4>
                  <span className="text-[10px] text-slate-400">
                    {showReportModal === 'summary'
                      ? 'DOMESTIC PICKUP & DELIVERY DISPATCH REPORT'
                      : showReportModal === 'ontime'
                      ? 'ON-TIME DELIVERY PERFORMANCE AUDIT (98.4% SLA)'
                      : 'CARGO COMMODITY & PALLET WEIGHT DISTRIBUTION'}
                  </span>
                </div>

                <div className="text-[11px] space-y-1.5 text-slate-300">
                  <div className="flex justify-between">
                    <span>PERIOD: CURRENT FISCAL MONTH</span>
                    <span>TOTAL ORDERS: {pdOrders.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DISPATCH HUBS: MANILA / CEBU / DAVAO</span>
                    <span className="text-emerald-400 font-bold">CARTAGE REVENUE: ${pdOrders.reduce((a, b) => a + b.amount, 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 border-t border-white/10 flex justify-end gap-2.5">
              <button
                onClick={() => setShowReportModal(null)}
                className={`px-4 py-2 rounded-xl font-semibold transition-all border ${
                  darkMode ? 'border-white/10 text-slate-300 hover:bg-white/5' : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Close
              </button>
              <button
                onClick={() => {
                  window.print()
                  setShowReportModal(null)
                }}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold shadow-lg shadow-blue-900/30 flex items-center gap-1.5 transition-all active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-[16px]">print</span>
                Print Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
