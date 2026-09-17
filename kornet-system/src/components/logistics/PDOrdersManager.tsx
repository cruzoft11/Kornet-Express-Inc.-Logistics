import { useState } from 'react'
import { useLogisticsStore, PDOrder } from '../../stores/logisticsStore'

export default function PDOrdersManager() {
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
    <div className="stitch-module-surface flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Top Action & Search Bar (Window #1 & #2) */}
      <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Barcode Scanner & Search */}
        <div className="flex items-center gap-2 flex-1 max-w-lg">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-2 text-slate-400 text-[18px]">
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
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleSimulateScan}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm flex items-center gap-1"
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
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300"
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
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300"
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
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">add_circle</span>
            New P/D Order
          </button>

          <button
            onClick={() => setShowLinkingModal(true)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">link</span>
            Link Cargo / VIN
          </button>

          <button
            onClick={() => setShowReportModal('summary')}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">description</span>
            P/D Reports
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Orders List (Window #2) */}
        <div className="w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col overflow-y-auto">
          <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-[11px] font-bold text-slate-500 uppercase tracking-wider flex justify-between items-center">
            <span>Domestic Cartage Orders ({filteredOrders.length})</span>
            <span className="text-[10px] text-blue-600 font-bold">Kornet Express</span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredOrders.map((o) => (
              <div
                key={o.id}
                onClick={() => setSelectedOrderId(o.id)}
                className={`p-3.5 cursor-pointer transition-colors ${
                  o.id === selectedOrder?.id
                    ? 'bg-blue-50/90 dark:bg-blue-950/40 border-l-4 border-blue-600'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-xs text-slate-900 dark:text-white font-mono">{o.orderNo}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                      o.status === 'Completed'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : o.status === 'In Transit'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                    }`}
                  >
                    {o.status}
                  </span>
                </div>
                <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">
                  <span className="text-blue-600 font-bold">{o.type.toUpperCase()}:</span> {o.consignee}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                  <span className="truncate max-w-[140px]">{o.origin} &rarr; {o.destination}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">${o.amount.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Detailed Order View with Tabs (Window #3) */}
        {selectedOrder ? (
          <div className="flex-1 flex flex-col overflow-y-auto p-6 space-y-4">
            {/* Header Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="flex flex-wrap justify-between items-start gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                      {selectedOrder.orderNo}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                      {selectedOrder.type} Order
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      Warehouse: <strong className="text-slate-700 dark:text-slate-300">{selectedOrder.warehouse}</strong>
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Origin: <strong>{selectedOrder.origin}</strong> &bull; Destination: <strong>{selectedOrder.destination}</strong> &bull; Scheduled: <strong>{selectedOrder.scheduledDate}</strong>
                  </p>
                </div>

                {/* Operations Toolbar */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleCreateWR}
                    title="Generate official Warehouse Receipt from cargo lines"
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">warehouse</span>
                    Create W/R
                  </button>

                  <button
                    onClick={handlePickCargo}
                    title="Confirm physical cargo handover and advance status"
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-sm flex items-center gap-1"
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
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs shadow-sm flex items-center gap-1"
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
                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">qr_code_2</span>
                    Labels
                  </button>

                  <button
                    onClick={handleTransferToBridge}
                    title="Stage cartage freight fee to the Accounting Bridge"
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">hub</span>
                    Transfer to Acct Bridge
                  </button>
                </div>
              </div>

              {/* Quick Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Assigned Driver</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedOrder.driver}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Appointment Time</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedOrder.appointmentTime || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Cartage Freight Fee</span>
                  <strong className="text-blue-600 font-mono text-sm">${selectedOrder.amount.toFixed(2)}</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Barcode Tracking</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedOrder.barcode}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Linked Warehouse Receipt</span>
                  <span className="font-mono font-bold text-indigo-600">{selectedOrder.linkedWR || 'Pending Generation'}</span>
                </div>
              </div>
            </div>

            {/* Tab Navigation (Window #3 Tabs) */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-t-xl px-4 pt-2 gap-2 text-xs font-bold">
              {[
                { id: 'shipment', label: 'Shipment & Carrier', icon: 'local_shipping' },
                { id: 'times', label: 'Times & Handling', icon: 'schedule' },
                { id: 'parties', label: 'Shipper & Consignee', icon: 'group' },
                { id: 'additional', label: 'Additional Information', icon: 'info' },
                { id: 'cargo', label: 'Cargo Details & W/R', icon: 'inventory_2' },
                { id: 'dock', label: 'Dock Receipt', icon: 'fact_check' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 border-b-2 flex items-center gap-1.5 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-slate-50 dark:bg-slate-800/60 rounded-t'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Body */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-b-2xl p-6 shadow-sm">
              {/* 1. Shipment & Carrier Tab */}
              {activeTab === 'shipment' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                  <div className="space-y-4">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 border-b pb-1 text-sm">
                      Reference & Dispatch Numbers
                    </h4>
                    <div>
                      <label className="text-slate-500 font-semibold block mb-1">PRO #</label>
                      <input
                        type="text"
                        value={selectedOrder.proNo || 'PRO-88129'}
                        readOnly
                        className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 font-semibold block mb-1">Quote # Reference</label>
                      <input
                        type="text"
                        value={selectedOrder.quoteNo || 'QT-2026-0042'}
                        readOnly
                        className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 font-semibold block mb-1">Shipping Instruction (SI #)</label>
                      <input
                        type="text"
                        value={selectedOrder.siNo || 'SI-7739'}
                        readOnly
                        className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 border-b pb-1 text-sm">
                      Equipment & Route
                    </h4>
                    <div>
                      <label className="text-slate-500 font-semibold block mb-1">Equipment Type</label>
                      <input
                        type="text"
                        value={selectedOrder.equipmentType || '40ft Skeletal Chassis Trailer'}
                        readOnly
                        className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 font-semibold block mb-1">Route & Corridor</label>
                      <input
                        type="text"
                        value={selectedOrder.route || 'SLEX Southbound Express Highway'}
                        readOnly
                        className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 font-semibold block mb-1">Declared Value ($)</label>
                      <input
                        type="text"
                        value={`$${(selectedOrder.declaredValue || 25000).toLocaleString()}`}
                        readOnly
                        className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-emerald-600"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 border-b pb-1 text-sm">
                      Financial Summary
                    </h4>
                    <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Cartage Base Rate:</span>
                        <strong className="font-mono text-slate-800 dark:text-slate-200">$280.00</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Fuel & Toll Surcharge:</span>
                        <strong className="font-mono text-slate-800 dark:text-slate-200">$40.00</strong>
                      </div>
                      <div className="border-t border-blue-200 dark:border-blue-900 pt-2 flex justify-between text-sm font-black">
                        <span className="text-blue-900 dark:text-blue-200">Total Cartage Charge:</span>
                        <span className="text-blue-600 font-mono">${selectedOrder.amount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Times & Handling Tab */}
              {activeTab === 'times' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  <div className="space-y-4">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 border-b pb-1 text-sm">
                      Target & Scheduled Timeline
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-slate-500 font-semibold block mb-1">Ready Date</label>
                        <input
                          type="date"
                          value={selectedOrder.scheduledDate}
                          readOnly
                          className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                        />
                      </div>
                      <div>
                        <label className="text-slate-500 font-semibold block mb-1">Ready Time</label>
                        <input
                          type="text"
                          value="08:00 AM"
                          readOnly
                          className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-slate-500 font-semibold block mb-1">Appointment Date</label>
                        <input
                          type="date"
                          value={selectedOrder.scheduledDate}
                          readOnly
                          className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                        />
                      </div>
                      <div>
                        <label className="text-slate-500 font-semibold block mb-1">Appointment Time</label>
                        <input
                          type="text"
                          value={selectedOrder.appointmentTime || '09:00 AM'}
                          readOnly
                          className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 border-b pb-1 text-sm">
                      Actual Execution Log
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-slate-500 font-semibold block mb-1">Actual Pickup Completed</label>
                        <input
                          type="text"
                          value={selectedOrder.status !== 'Scheduled' ? `${selectedOrder.scheduledDate} 08:45 AM` : 'Pending Dispatch'}
                          readOnly
                          className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-emerald-600 font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-slate-500 font-semibold block mb-1">Actual Delivery Completed</label>
                        <input
                          type="text"
                          value={selectedOrder.status === 'Completed' ? `${selectedOrder.scheduledDate} 11:30 AM` : 'En Route / Pending'}
                          readOnly
                          className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-slate-500 font-semibold block mb-1">Handling Remarks</label>
                      <p className="p-3 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs">
                        Driver reported zero transit bottlenecks along South Luzon Expressway corridor. Gate pass confirmed.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Shipper & Consignee Tab */}
              {activeTab === 'parties' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                  <div className="space-y-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                    <h4 className="font-bold text-blue-600 text-sm flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">upload</span>
                      Shipper Details
                    </h4>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Company Name</span>
                      <strong className="text-slate-800 dark:text-slate-100">{selectedOrder.shipper}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Address</span>
                      <p className="text-slate-600 dark:text-slate-300">{selectedOrder.shipperAddress || 'South Harbor Customs Zone, Port Area, Manila'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Contact / Phone</span>
                      <p className="text-slate-600 dark:text-slate-300">{selectedOrder.shipperContact || 'Mr. Manuel Santos &bull; +63 2 8527 1100'}</p>
                    </div>
                  </div>

                  <div className="space-y-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                    <h4 className="font-bold text-emerald-600 text-sm flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">download</span>
                      Consignee Details
                    </h4>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Company Name</span>
                      <strong className="text-slate-800 dark:text-slate-100">{selectedOrder.consignee}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Address</span>
                      <p className="text-slate-600 dark:text-slate-300">{selectedOrder.consigneeAddress || 'Laguna Technopark Phase 3, Santa Rosa, Laguna'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Contact / Phone</span>
                      <p className="text-slate-600 dark:text-slate-300">{selectedOrder.consigneeContact || 'Engr. Teresa Reyes &bull; +63 49 541 2000'}</p>
                    </div>
                  </div>

                  <div className="space-y-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                    <h4 className="font-bold text-amber-600 text-sm flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">domain</span>
                      Third Party / Bill-To
                    </h4>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Billing Entity</span>
                      <strong className="text-slate-800 dark:text-slate-100">{selectedOrder.thirdParty || 'Kornet Logistics Direct Billing'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Account Terms</span>
                      <p className="text-slate-600 dark:text-slate-300">Net 30 Days &bull; Credit Line Approved</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. Additional Information Tab */}
              {activeTab === 'additional' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  <div className="space-y-4">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 border-b pb-1 text-sm">
                      Pickup Instructions & Marks
                    </h4>
                    <div>
                      <label className="text-slate-500 font-semibold block mb-1">Pickup / Loading Instructions</label>
                      <textarea
                        rows={3}
                        readOnly
                        value="Present Delivery Permit at Gate 2. Driver must wear standard PPE (hard hat, vest, steel toe shoes). Pre-check cargo tie-downs."
                        className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 font-semibold block mb-1">Marks and Numbers</label>
                      <input
                        type="text"
                        readOnly
                        value="KNET-MNL-2026 / 1-12 / FRAGILE ELECTRONIC"
                        className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 border-b pb-1 text-sm">
                      Purchase Order & Trailer Specs
                    </h4>
                    <div>
                      <label className="text-slate-500 font-semibold block mb-1">PO Numbers</label>
                      <input
                        type="text"
                        readOnly
                        value="PO-991204, PO-991205"
                        className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-slate-500 font-semibold block mb-1">Trailer #</label>
                        <input
                          type="text"
                          readOnly
                          value="TR-8812"
                          className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-slate-500 font-semibold block mb-1">Bolt Seal #</label>
                        <input
                          type="text"
                          readOnly
                          value="SL-994102"
                          className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-blue-600"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. Cargo Details & W/R Tab (Fig 1.a, 1.b, Fig 2) */}
              {activeTab === 'cargo' && (
                <div className="space-y-4 text-xs">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                        Cargo Details (Warehouse Receipt Linked)
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Physical cargo package lines, dimensional measurements, weight, and hazmat ratings.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowLinkingModal(true)}
                      className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[16px]">add_link</span>
                      Link Additional Cargo / VIN
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500 text-[10px] uppercase font-bold">
                        <tr>
                          <th className="py-2.5 px-3">Cargo Type</th>
                          <th className="py-2.5 px-3">Qty</th>
                          <th className="py-2.5 px-3">Dimensions (L x W x H)</th>
                          <th className="py-2.5 px-3">Unit Wt (lbs)</th>
                          <th className="py-2.5 px-3">Total Wt (lbs)</th>
                          <th className="py-2.5 px-3">Cube (cbf)</th>
                          <th className="py-2.5 px-3">Location / Bin</th>
                          <th className="py-2.5 px-3">Hazmat?</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {selectedOrder.cargoDetails.map((c, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 px-3">
                              <span className="font-bold text-slate-900 dark:text-white block">{c.cargoType}</span>
                              <span className="text-[10px] text-slate-400">{c.materialDescription}</span>
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-blue-600">{c.qty} Pcs</td>
                            <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300">
                              {c.length}" x {c.width}" x {c.height}"
                            </td>
                            <td className="py-2.5 px-3 font-mono">{c.unitWeight}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">{c.totalWeight}</td>
                            <td className="py-2.5 px-3 font-mono">{c.cubic}</td>
                            <td className="py-2.5 px-3 font-mono text-emerald-600 font-bold">{c.location} / {c.bin}</td>
                            <td className="py-2.5 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                c.hazardous ? 'bg-red-100 text-red-800 font-black' : 'bg-slate-100 text-slate-600'
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

              {/* 6. Dock Receipt Tab (Fig 3) */}
              {activeTab === 'dock' && (
                <div className="space-y-4 text-xs">
                  <div className="flex justify-between items-center border-b pb-2">
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                        Official Dock Receipt & Driver Handover (DR # {selectedOrder.dockReceiptNo || 'DR-2026-081'})
                      </h4>
                      <p className="text-[11px] text-slate-500">
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
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[16px]">print</span>
                      Print Official Dock Receipt Form
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Received By (Terminal Agent)</span>
                      <strong className="text-slate-800 dark:text-slate-100 block">Carlos Mendoza (Dock Super)</strong>
                      <span className="text-[10px] text-slate-500 block">Date: {selectedOrder.scheduledDate} 08:30 AM</span>
                    </div>

                    <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-900/50 space-y-2">
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase block">Condition on Arrival</span>
                      <strong className="text-emerald-900 dark:text-emerald-200 block text-sm">&check; Sound & Clean - No Exceptions</strong>
                      <span className="text-[10px] text-emerald-600 block">All 12 pallets stretch wrapped intact.</span>
                    </div>

                    <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-900/50 space-y-2">
                      <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase block">Driver Acknowledgment</span>
                      <strong className="text-blue-900 dark:text-blue-200 block text-sm">{selectedOrder.driver}</strong>
                      <span className="text-[10px] text-blue-600 block">Digital POD signature verified &bull; On File</span>
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-400">local_shipping</span>
                <h3 className="font-black text-sm">New Domestic P/D Order Entry (Window #3)</h3>
              </div>
              <button
                onClick={handleCloseNewOrder}
                className="text-slate-400 hover:text-white"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">Order Type</label>
                  <select
                    value={newOrder.type}
                    onChange={(e) => setNewOrder({ ...newOrder, type: e.target.value as any })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  >
                    <option value="Pickup">Pickup</option>
                    <option value="Delivery">Delivery</option>
                    <option value="Xdock">Cross-Dock (Xdock)</option>
                    <option value="Exchange">Exchange</option>
                    <option value="Quote">Quote</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">Warehouse Hub</label>
                  <select
                    value={newOrder.warehouse}
                    onChange={(e) => setNewOrder({ ...newOrder, warehouse: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  >
                    <option value="Manila Port Terminal Hub">Manila Port Terminal Hub</option>
                    <option value="Cebu Logistics Depot">Cebu Logistics Depot</option>
                    <option value="Davao CFS Cargo Center">Davao CFS Cargo Center</option>
                    <option value="Subic Freeport Zone Terminal">Subic Freeport Zone Terminal</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">Cartage Fee ($)</label>
                  <input
                    type="number"
                    value={newOrder.amount}
                    onChange={(e) => setNewOrder({ ...newOrder, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block">Shipper Details</span>
                  <input
                    type="text"
                    placeholder="Shipper Company Name *"
                    required
                    value={newOrder.shipper}
                    onChange={(e) => setNewOrder({ ...newOrder, shipper: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                  />
                  <input
                    type="text"
                    placeholder="Shipper Full Address"
                    value={newOrder.shipperAddress}
                    onChange={(e) => setNewOrder({ ...newOrder, shipperAddress: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <input
                    type="text"
                    placeholder="Contact Person & Phone"
                    value={newOrder.shipperContact}
                    onChange={(e) => setNewOrder({ ...newOrder, shipperContact: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>

                <div className="space-y-2 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block">Consignee Details</span>
                  <input
                    type="text"
                    placeholder="Consignee Company Name *"
                    required
                    value={newOrder.consignee}
                    onChange={(e) => setNewOrder({ ...newOrder, consignee: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                  />
                  <input
                    type="text"
                    placeholder="Consignee Full Address"
                    value={newOrder.consigneeAddress}
                    onChange={(e) => setNewOrder({ ...newOrder, consigneeAddress: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <input
                    type="text"
                    placeholder="Contact Person & Phone"
                    value={newOrder.consigneeContact}
                    onChange={(e) => setNewOrder({ ...newOrder, consigneeContact: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">Origin Location</label>
                  <input
                    type="text"
                    value={newOrder.origin}
                    onChange={(e) => setNewOrder({ ...newOrder, origin: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">Destination Location</label>
                  <input
                    type="text"
                    value={newOrder.destination}
                    onChange={(e) => setNewOrder({ ...newOrder, destination: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">Assigned Driver</label>
                  <input
                    type="text"
                    value={newOrder.driver}
                    onChange={(e) => setNewOrder({ ...newOrder, driver: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewOrderModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  Save & Generate P/D Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Linking Modal (Window #3.1 - Search / Browse / Scan Cargo or Vehicle) */}
      {showLinkingModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400">link</span>
                <h3 className="font-black text-sm">Cargo & Vehicle Linking Dialog (Window #3.1)</h3>
              </div>
              <button
                onClick={() => {
                  setShowLinkingModal(false)
                  setLinkingStatus(null)
                }}
                className="text-slate-400 hover:text-white"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* Tab: Cargo vs Vehicle */}
              <div className="flex border-b border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => {
                    setLinkingTab('cargo')
                    setLinkingStatus(null)
                  }}
                  className={`px-4 py-2 font-bold border-b-2 transition-colors ${
                    linkingTab === 'cargo'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500'
                  }`}
                >
                  Cargo Tab (Warehouse Receipt)
                </button>
                <button
                  onClick={() => {
                    setLinkingTab('vehicle')
                    setLinkingStatus(null)
                  }}
                  className={`px-4 py-2 font-bold border-b-2 transition-colors ${
                    linkingTab === 'vehicle'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500'
                  }`}
                >
                  Vehicle Tab (VIN Inventory)
                </button>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {linkingTab === 'cargo' ? 'Enter Warehouse Receipt # (WR #):' : 'Enter 17-Digit Vehicle VIN #:'}
                </label>
                <input
                  type="text"
                  placeholder={linkingTab === 'cargo' ? 'e.g. WR-2026-0041' : 'e.g. 1HGCR2F83HA129048'}
                  value={linkingInput}
                  onChange={(e) => setLinkingInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                />
              </div>

              {/* Linking Methods (Buttons 1, 2, 3 in Guide) */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                <button
                  onClick={() => handleLinkingAction('search')}
                  className="p-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:border-blue-500 bg-slate-50 dark:bg-slate-800/60 font-bold flex flex-col items-center gap-1"
                >
                  <span className="material-symbols-outlined text-blue-600">search</span>
                  <span>1. Search</span>
                  <span className="text-[10px] text-slate-400 font-normal">By Manual Entry</span>
                </button>

                <button
                  onClick={() => handleLinkingAction('browse')}
                  className="p-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:border-blue-500 bg-slate-50 dark:bg-slate-800/60 font-bold flex flex-col items-center gap-1"
                >
                  <span className="material-symbols-outlined text-amber-600">travel_explore</span>
                  <span>2. Browse</span>
                  <span className="text-[10px] text-slate-400 font-normal">From Active List</span>
                </button>

                <button
                  onClick={() => handleLinkingAction('scan')}
                  className="p-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:border-blue-500 bg-slate-50 dark:bg-slate-800/60 font-bold flex flex-col items-center gap-1"
                >
                  <span className="material-symbols-outlined text-emerald-600">barcode_scanner</span>
                  <span>3. Scan</span>
                  <span className="text-[10px] text-slate-400 font-normal">Physical Device</span>
                </button>
              </div>

              {linkingStatus && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
                  <span>{linkingStatus}</span>
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex justify-end">
              <button
                onClick={() => {
                  setShowLinkingModal(false)
                  setLinkingStatus(null)
                }}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold"
              >
                Close & Return
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reports Dialog (Windows #4, #5, #6, #7, #8) */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-400">print</span>
                <h3 className="font-black text-sm">Pickup & Delivery Reports Generator (Window #4)</h3>
              </div>
              <button
                onClick={() => setShowReportModal(null)}
                className="text-slate-400 hover:text-white"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div
                  onClick={() => setShowReportModal('summary')}
                  className={`p-3 rounded-xl border cursor-pointer ${
                    showReportModal === 'summary'
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 font-bold text-blue-600'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="material-symbols-outlined block mb-1">table_chart</span>
                  <span>2b. P/D Orders Report</span>
                  <span className="text-[10px] text-slate-400 block font-normal">Date range dispatch list</span>
                </div>

                <div
                  onClick={() => setShowReportModal('ontime')}
                  className={`p-3 rounded-xl border cursor-pointer ${
                    showReportModal === 'ontime'
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 font-bold text-blue-600'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="material-symbols-outlined block mb-1">timer</span>
                  <span>2c. On-Time Report</span>
                  <span className="text-[10px] text-slate-400 block font-normal">Carrier SLA compliance</span>
                </div>

                <div
                  onClick={() => setShowReportModal('details')}
                  className={`p-3 rounded-xl border cursor-pointer ${
                    showReportModal === 'details'
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 font-bold text-blue-600'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="material-symbols-outlined block mb-1">receipt_long</span>
                  <span>2d. Cargo Details Report</span>
                  <span className="text-[10px] text-slate-400 block font-normal">Pieces & volume audit</span>
                </div>
              </div>

              {/* Report Preview */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 font-mono">
                <div className="text-center pb-2 border-b border-slate-200 dark:border-slate-700">
                  <h4 className="font-black text-slate-900 dark:text-white">KORNET EXPRESS FREIGHT & CARGO SERVICES</h4>
                  <span className="text-[10px] text-slate-500">
                    {showReportModal === 'summary'
                      ? 'DOMESTIC PICKUP & DELIVERY DISPATCH REPORT'
                      : showReportModal === 'ontime'
                      ? 'ON-TIME DELIVERY PERFORMANCE AUDIT (98.4% SLA)'
                      : 'CARGO COMMODITY & PALLET WEIGHT DISTRIBUTION'}
                  </span>
                </div>

                <div className="text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span>PERIOD: CURRENT FISCAL MONTH</span>
                    <span>TOTAL ORDERS: {pdOrders.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DISPATCH HUBS: MANILA / CEBU / DAVAO</span>
                    <span>TOTAL CARTAGE REVENUE: ${pdOrders.reduce((a, b) => a + b.amount, 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex justify-end gap-2">
              <button
                onClick={() => setShowReportModal(null)}
                className="px-4 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold"
              >
                Close
              </button>
              <button
                onClick={() => {
                  window.print()
                  setShowReportModal(null)
                }}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-1"
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
