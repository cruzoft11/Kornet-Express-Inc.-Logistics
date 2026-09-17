import { useState } from 'react'
import {
  useLogisticsStore,
  TrackingMilestone,
  CustomerWebAccount
} from '../../stores/logisticsStore'
import { useSettingsStore } from '../../stores/settingsStore'

export default function CustomerTrackingPortal() {
  const darkMode = useSettingsStore((s) => s.darkMode)
  const {
    shipments,
    vehicles,
    pdOrders,
    trackingItems,
    webAccounts,
    updateTrackingStatus,
    createWebAccount,
    addAuditLog
  } = useLogisticsStore()

  // Main View Mode: 'portal' (Public Live Tracking) | 'status_update' (Web Status Update - Window #2) | 'accounts' (Web Access Mgmt - Window #3)
  const [activeTab, setActiveTab] = useState<'portal' | 'status_update' | 'accounts'>('portal')

  // Public Portal Tracking Search
  const [query, setQuery] = useState('')
  const [activeTracking, setActiveTracking] = useState<any>(null)

  // Web Status Update Form State (Window #2 from Web_Status_Pick-up_Delivery.pdf)
  const [selectedRefType, setSelectedRefType] = useState<'PD' | 'Ocean' | 'Air'>('PD')
  const [selectedRefNo, setSelectedRefNo] = useState(pdOrders[0]?.orderNo || '')
  const [newStatus, setNewStatus] = useState('Cargo In Warehouse')
  const [newSubStatus, setNewSubStatus] = useState('Staged on Bay 4 - Ready for Dispatch')
  const [statusDescription, setStatusDescription] = useState('Cargo received at terminal hub and scanned with barcode verification.')
  const [attachmentName, setAttachmentName] = useState('')
  const [showStatusReportModal, setShowStatusReportModal] = useState(false)

  // Web Account Creation Form State (Window #3 from Quick_Customers_Tracking_Access.pdf)
  const [showNewAccountModal, setShowNewAccountModal] = useState(false)
  const [newAccount, setNewAccount] = useState<CustomerWebAccount>({
    id: `acc-${Date.now()}`,
    accountNo: '',
    customerName: '',
    userId: '',
    passwordHash: '',
    isAgent: false,
    permissions: {
      canViewTracking: true,
      canDownloadPOD: true,
      canUploadDocs: true,
      canViewInvoices: true,
      tradeShowMgmt: 'None',
      poMgmt: 'Standard'
    }
  })

  // Lookup target order/shipment based on selected ref
  const currentTarget =
    selectedRefType === 'PD'
      ? pdOrders.find((p) => p.orderNo === selectedRefNo) || pdOrders[0]
      : selectedRefType === 'Ocean'
      ? shipments.find((s) => s.type.startsWith('Ocean') && s.fileNo === selectedRefNo) || shipments[0]
      : shipments.find((s) => s.type.startsWith('Air') && s.fileNo === selectedRefNo) || shipments[1]

  const currentTrackingRecord = trackingItems.find(
    (t) => t.refNo === selectedRefNo || (currentTarget && t.refNo === (currentTarget as any).orderNo || t.refNo === (currentTarget as any).fileNo)
  )

  const handleSearch = () => {
    if (!query) return
    const q = query.trim().toLowerCase()

    // 1. Match Tracking Items
    const trackFound = trackingItems.find(
      (t) =>
        t.refNo.toLowerCase() === q ||
        t.shipper.toLowerCase().includes(q) ||
        t.consignee.toLowerCase().includes(q)
    )
    if (trackFound) {
      setActiveTracking({ type: 'tracking', data: trackFound })
      return
    }

    // 2. Match Shipments
    const ship = shipments.find(
      (s) =>
        s.fileNo.toLowerCase() === q ||
        s.bookingNo.toLowerCase() === q ||
        s.blOrAwbNo.toLowerCase() === q ||
        (s.containerNo && s.containerNo.toLowerCase() === q)
    )
    if (ship) {
      setActiveTracking({ type: 'shipment', data: ship })
      return
    }

    // 3. Match P/D Orders
    const pd = pdOrders.find((p) => p.orderNo.toLowerCase() === q || p.barcode.toLowerCase() === q)
    if (pd) {
      setActiveTracking({ type: 'pd', data: pd })
      return
    }

    // 4. Match Vehicles
    const veh = vehicles.find((v) => v.vin.toLowerCase() === q || v.warehouseReceiptNo?.toLowerCase() === q)
    if (veh) {
      setActiveTracking({ type: 'vehicle', data: veh })
      return
    }

    alert(`No freight record or shipment found matching '${query}'. Try searching 'KN-OE-2026-0891' or 'PD-2026-001'.`)
  }

  const handleUpdateWebStatus = (e: React.FormEvent) => {
    e.preventDefault()
    const targetNo = selectedRefNo || (currentTarget as any)?.orderNo || (currentTarget as any)?.fileNo
    if (!targetNo) return

    const attachments = attachmentName
      ? [
          {
            id: `att-${Date.now()}`,
            name: attachmentName,
            size: '1.4 MB',
            type: 'application/pdf',
            uploadDate: new Date().toISOString().split('T')[0]
          }
        ]
      : undefined

    updateTrackingStatus(
      targetNo,
      newStatus,
      newSubStatus,
      statusDescription,
      'KORNET_DISPATCH_WEB',
      attachments
    )

    addAuditLog({
      module: 'Web Status',
      action: 'Status Update',
      referenceNo: targetNo,
      user: 'KORNET_DISPATCH_WEB',
      details: `Updated Web Status to [${newStatus} / ${newSubStatus}] for client portal`
    })

    setAttachmentName('')
    alert(`Web Status updated successfully for ${targetNo}! Client tracking portal refreshed.`)
  }

  const handleSaveWebAccount = (e: React.FormEvent) => {
    e.preventDefault()
    createWebAccount(newAccount)
    setShowNewAccountModal(false)
    addAuditLog({
      module: 'Customer Tracking',
      action: 'Create Web Account',
      referenceNo: newAccount.accountNo,
      user: 'SYS_ADMIN',
      details: `Created portal login for ${newAccount.customerName} (User ID: ${newAccount.userId})`
    })
    alert(`Web Tracking Account ${newAccount.accountNo} created for ${newAccount.customerName}. Login credentials active.`)
  }

  // Display Item for Public Portal
  const displayData = activeTracking?.data || shipments[0]

  return (
    <div className={`stitch-module-surface flex-1 flex flex-col overflow-hidden relative ${
      darkMode ? 'bg-[#061426] text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Ambient background light orbs */}
      <div className="absolute top-[-10%] left-[20%] w-[500px] h-[350px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none -z-0 animate-pulse" />
      <div className="absolute bottom-[-10%] right-[10%] w-[450px] h-[350px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -z-0" />

      {/* Top Section Tabs & Mode Switcher */}
      <div className={`px-6 py-3 border-b backdrop-blur-xl relative z-20 flex flex-wrap items-center justify-between gap-4 ${
        darkMode ? 'bg-[#0b192c]/80 border-white/10' : 'bg-white/85 border-slate-200 shadow-sm'
      }`}>
        <div className={`flex items-center gap-1 p-1 rounded-2xl text-xs font-bold ${
          darkMode ? 'bg-white/5 border border-white/10' : 'bg-slate-100'
        }`}>
          <button
            onClick={() => setActiveTab('portal')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all font-semibold ${
              activeTab === 'portal'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 border border-blue-400/30'
                : darkMode ? 'text-slate-300 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">travel_explore</span>
            <span>Public Client Tracking Portal</span>
          </button>

          <button
            onClick={() => setActiveTab('status_update')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all font-semibold ${
              activeTab === 'status_update'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 border border-blue-400/30'
                : darkMode ? 'text-slate-300 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">update</span>
            <span>1. Tracking Status Update</span>
          </button>

          <button
            onClick={() => setActiveTab('accounts')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all font-semibold ${
              activeTab === 'accounts'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 border border-blue-400/30'
                : darkMode ? 'text-slate-300 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">manage_accounts</span>
            <span>2. Customer Web Accounts Access</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowStatusReportModal(true)}
            className={`px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
              darkMode
                ? 'border-white/15 bg-white/5 hover:bg-white/10 text-slate-200'
                : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-700 shadow-sm'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">summarize</span>
            <span>Web Status Report</span>
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 relative z-10">
        {/* ========================================================
            TAB 1: PUBLIC CLIENT TRACKING PORTAL
        ======================================================== */}
        {activeTab === 'portal' && (
          <div className="space-y-6">
            {/* Tracking Search Hero Banner */}
            <div className={`rounded-3xl p-8 shadow-2xl relative overflow-hidden backdrop-blur-2xl border ${
              darkMode ? 'liquid-glass-card border-white/10' : 'bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white border-blue-800'
            }`}>
              <div className="absolute top-[-20%] right-[-10%] w-[350px] h-[350px] bg-blue-500/20 rounded-full blur-3xl pointer-events-none -z-0" />
              <div className="relative z-10 max-w-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30">
                    Kornet Express Live Cargo Visibility
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    24/7 Real-Time Cloud Sync
                  </span>
                </div>
                <h2 className="text-3xl font-black tracking-tight text-white">Track Your Cargo & Consignment</h2>
                <p className="text-xs text-blue-200/90 leading-relaxed">
                  Enter your Ocean B/L number, Air Waybill, Container number, Domestic P/D Order #, or 17-digit VIN to inspect live GPS milestones, clearance status, and digital Proof of Delivery (POD).
                </p>

                <div className="flex items-center gap-2.5 pt-2 max-w-lg">
                  <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-3.5 top-3 text-slate-400 text-[20px]">
                      search
                    </span>
                    <input
                      type="text"
                      placeholder="e.g. KN-OE-2026-0891, PD-2026-001, MSKU-992144-8..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className={`w-full pl-10 pr-4 py-3 rounded-2xl text-xs font-mono font-bold transition-all shadow-inner border focus:outline-none focus:ring-2 focus:ring-blue-400/50 ${
                        darkMode
                          ? 'bg-white/10 text-white placeholder-slate-400 border-white/15'
                          : 'bg-white text-slate-900 placeholder-slate-400 border-slate-200'
                      }`}
                    />
                  </div>
                  <button
                    onClick={handleSearch}
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 border border-blue-400/40 transition-all flex items-center gap-1.5 hover:scale-105"
                  >
                    <span>Track</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Tracking Result Card */}
            {displayData && (
              <div className={`rounded-3xl p-6 border shadow-2xl backdrop-blur-2xl space-y-6 ${
                darkMode ? 'liquid-glass-card border-white/10' : 'bg-white/90 border-slate-200 shadow-xl'
              }`}>
                <div className={`flex flex-wrap justify-between items-start gap-4 pb-4 border-b ${
                  darkMode ? 'border-white/10' : 'border-slate-200'
                }`}>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-2xl font-black text-blue-400 font-mono">
                        {displayData.fileNo || displayData.orderNo || displayData.refNo || displayData.vin}
                      </h3>
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase tracking-wider">
                        {displayData.type || displayData.refType || 'Freight Shipment'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Shipper: <strong className={darkMode ? 'text-slate-200' : 'text-slate-800'}>{displayData.shipper}</strong> &bull; Consignee:{' '}
                      <strong className={darkMode ? 'text-slate-200' : 'text-slate-800'}>{displayData.consignee}</strong>
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Current Live Status</span>
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 uppercase inline-block mt-1">
                      {displayData.status === 'Transferred'
                        ? 'Departed Terminal - In Transit'
                        : displayData.status === 'Completed'
                        ? 'Delivered with POD'
                        : 'Cargo In Warehouse'}
                    </span>
                  </div>
                </div>

                {/* Milestone Stepper (1 to 6) */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Live Milestone Progression
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                    {[
                      { step: 1, title: 'Booking Received', date: 'Sep 02, 2026', done: true },
                      { step: 2, title: 'Cargo in Warehouse', date: 'Sep 04, 2026', done: true },
                      { step: 3, title: 'Customs Cleared', date: 'Sep 06, 2026', done: true },
                      {
                        step: 4,
                        title: 'Departed Terminal',
                        date: 'Sep 08, 2026',
                        done: displayData.status === 'Transferred' || displayData.status === 'Completed'
                      },
                      {
                        step: 5,
                        title: 'Out for Delivery',
                        date: 'Sep 10, 2026',
                        done: displayData.status === 'In Transit' || displayData.status === 'Completed'
                      },
                      {
                        step: 6,
                        title: 'Delivered (POD)',
                        date: displayData.status === 'Completed' ? 'Sep 10, 2026' : 'Est. Sep 12',
                        done: displayData.status === 'Completed'
                      }
                    ].map((m) => (
                      <div
                        key={m.step}
                        className={`p-3.5 rounded-2xl border text-xs flex flex-col justify-between transition-all ${
                          m.done
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                            : darkMode
                            ? 'bg-white/5 border-white/10 text-slate-400'
                            : 'bg-slate-50 border-slate-200 text-slate-400'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5 mb-1 font-bold">
                            <span
                              className={`material-symbols-outlined text-[16px] ${
                                m.done ? 'text-emerald-400' : 'text-slate-500'
                              }`}
                            >
                              {m.done ? 'check_circle' : 'radio_button_unchecked'}
                            </span>
                            <span className="truncate">{m.title}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block pl-5 font-mono">{m.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Milestone History Log Table */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Chronological Milestone History Log
                  </h4>
                  <div className={`overflow-x-auto rounded-2xl border ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
                    <table className="w-full text-left text-xs">
                      <thead className={`text-[10px] uppercase font-mono font-bold tracking-wider ${
                        darkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-50 text-slate-500'
                      }`}>
                        <tr>
                          <th className="py-3 px-4">Date & Time</th>
                          <th className="py-3 px-4">Web Status</th>
                          <th className="py-3 px-4">Sub-Status</th>
                          <th className="py-3 px-4">Description / Location</th>
                          <th className="py-3 px-4">Updated By</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y font-mono text-[11px] ${darkMode ? 'divide-white/5' : 'divide-slate-100'}`}>
                        {(currentTrackingRecord?.history || [
                          {
                            id: '1',
                            date: '2026-09-08',
                            time: '14:20',
                            status: 'Departed Terminal',
                            subStatus: 'Vessel Underway',
                            description: 'Vessel CMA CGM Magellan departed Port of Manila en route to Singapore Hub.',
                            updatedBy: 'MANILA_DOCS'
                          },
                          {
                            id: '2',
                            date: '2026-09-06',
                            time: '10:15',
                            status: 'Customs Cleared',
                            subStatus: 'Title Released',
                            description: 'BOC Single Administrative Document (SAD) clearance approved without inspection hold.',
                            updatedBy: 'CUSTOMS_BROKER'
                          },
                          {
                            id: '3',
                            date: '2026-09-04',
                            time: '09:00',
                            status: 'Cargo In Warehouse',
                            subStatus: 'Staged on Bay 4',
                            description: 'Cargo received intact at Kornet Express South Harbor Hub. Dock receipt signed.',
                            updatedBy: 'WH_SUPER'
                          }
                        ]).map((h: TrackingMilestone) => (
                          <tr key={h.id} className={`transition-colors ${darkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                            <td className="py-3 px-4 text-slate-400">{h.date} {h.time}</td>
                            <td className="py-3 px-4 font-bold text-blue-400">{h.status}</td>
                            <td className={`py-3 px-4 font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{h.subStatus}</td>
                            <td className="py-3 px-4 text-slate-400 font-sans">{h.description}</td>
                            <td className="py-3 px-4 text-slate-400">{h.updatedBy}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* POD & Document Download Section */}
                <div className={`pt-4 border-t flex flex-wrap justify-between items-center gap-4 text-xs ${
                  darkMode ? 'border-white/10' : 'border-slate-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
                      <span className="material-symbols-outlined text-blue-400 text-xl">verified</span>
                    </div>
                    <div>
                      <strong className={`block ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        Official Proof of Delivery (POD) & Documentation
                      </strong>
                      <span className="text-[11px] text-slate-400">
                        Stamped Bill of Lading, Dock Receipts, and Cargo Photos available for verified account holders.
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => alert('Official Proof of Delivery (POD) and Inspection Photos downloaded.')}
                    className={`px-4 py-2 rounded-xl font-bold text-xs shadow-md flex items-center gap-1.5 transition-all ${
                      darkMode
                        ? 'bg-white/10 hover:bg-white/15 text-white border border-white/15'
                        : 'bg-slate-800 hover:bg-slate-700 text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">download</span>
                    <span>Download POD Package</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 2: TRACKING STATUS UPDATE (Window #2)
        ======================================================== */}
        {activeTab === 'status_update' && (
          <div className={`rounded-3xl p-6 border shadow-2xl backdrop-blur-2xl space-y-6 ${
            darkMode ? 'liquid-glass-card border-white/10' : 'bg-white/90 border-slate-200 shadow-xl'
          }`}>
            <div className={`pb-4 border-b ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-blue-400 text-xl">edit_notifications</span>
                </div>
                <h3 className={`text-lg font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  1. Tracking Status Update Form (Window #2)
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Direct operator entry to update web status, sub-status, attachments, and customer notification logs matching LogiSuite Window #2.
              </p>
            </div>

            <form onSubmit={handleUpdateWebStatus} className="space-y-6 text-xs">
              {/* Reference Selection */}
              <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-2xl border ${
                darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
              }`}>
                <div>
                  <label className="font-bold text-slate-400 block mb-1.5">Module Category</label>
                  <select
                    value={selectedRefType}
                    onChange={(e) => setSelectedRefType(e.target.value as any)}
                    className={`w-full px-3 py-2 rounded-xl border font-bold transition-all ${
                      darkMode ? 'bg-white/5 border-white/15 text-white' : 'bg-white border-slate-300'
                    }`}
                  >
                    <option value="PD" className={darkMode ? 'bg-slate-900 text-white' : ''}>Domestic Pickup & Delivery (P/D)</option>
                    <option value="Ocean" className={darkMode ? 'bg-slate-900 text-white' : ''}>Ocean Export / Import Freight</option>
                    <option value="Air" className={darkMode ? 'bg-slate-900 text-white' : ''}>Air Freight Cargo</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-400 block mb-1.5">
                    Select Order / File #
                  </label>
                  <select
                    value={selectedRefNo}
                    onChange={(e) => setSelectedRefNo(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border font-mono font-bold text-blue-400 transition-all ${
                      darkMode ? 'bg-white/5 border-white/15' : 'bg-white border-slate-300'
                    }`}
                  >
                    {selectedRefType === 'PD' &&
                      pdOrders.map((p) => (
                        <option key={p.id} value={p.orderNo} className={darkMode ? 'bg-slate-900 text-white' : ''}>
                          {p.orderNo} - {p.consignee} ({p.type})
                        </option>
                      ))}
                    {selectedRefType === 'Ocean' &&
                      shipments
                        .filter((s) => s.type.startsWith('Ocean'))
                        .map((s) => (
                          <option key={s.fileNo} value={s.fileNo} className={darkMode ? 'bg-slate-900 text-white' : ''}>
                            {s.fileNo} - {s.consignee} ({s.type})
                          </option>
                        ))}
                    {selectedRefType === 'Air' &&
                      shipments
                        .filter((s) => s.type.startsWith('Air'))
                        .map((s) => (
                          <option key={s.fileNo} value={s.fileNo} className={darkMode ? 'bg-slate-900 text-white' : ''}>
                            {s.fileNo} - {s.consignee} ({s.type})
                          </option>
                        ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-400 block mb-1.5">Date of Notice</label>
                  <input
                    type="date"
                    readOnly
                    value={new Date().toISOString().split('T')[0]}
                    className={`w-full px-3 py-2 rounded-xl border font-semibold ${
                      darkMode ? 'bg-white/5 border-white/15 text-slate-300' : 'bg-slate-100 border-slate-300'
                    }`}
                  />
                </div>
              </div>

              {/* Transaction Details (Auto-filled Window #2) */}
              {currentTarget && (
                <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl border ${
                  darkMode ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50/40 border-slate-200'
                }`}>
                  <div>
                    <span className="text-[10px] text-blue-400 uppercase font-bold tracking-wider block">Shipper</span>
                    <strong className={darkMode ? 'text-white' : 'text-slate-800'}>{(currentTarget as any).shipper}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-blue-400 uppercase font-bold tracking-wider block">Consignee</span>
                    <strong className={darkMode ? 'text-white' : 'text-slate-800'}>{(currentTarget as any).consignee}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-blue-400 uppercase font-bold tracking-wider block">Origin</span>
                    <span className={`font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{(currentTarget as any).origin}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-blue-400 uppercase font-bold tracking-wider block">Destination</span>
                    <span className={`font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{(currentTarget as any).destination}</span>
                  </div>
                </div>
              )}

              {/* Web Status & Sub Status (Window #2 Field 3) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-400 block mb-1.5">
                    Web Status Milestone
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl border font-bold text-blue-400 transition-all ${
                      darkMode ? 'bg-white/5 border-white/15' : 'bg-white border-slate-300'
                    }`}
                  >
                    <option value="Booking Created" className={darkMode ? 'bg-slate-900 text-white' : ''}>1. Booking Created / Scheduled</option>
                    <option value="Cargo In Warehouse" className={darkMode ? 'bg-slate-900 text-white' : ''}>2. Cargo In Warehouse / Staged</option>
                    <option value="Customs Cleared" className={darkMode ? 'bg-slate-900 text-white' : ''}>3. Customs Clearance Approved</option>
                    <option value="Departed Terminal" className={darkMode ? 'bg-slate-900 text-white' : ''}>4. Vessel / Flight / Truck Departed</option>
                    <option value="In Transit" className={darkMode ? 'bg-slate-900 text-white' : ''}>5. In Transit to Destination Terminal</option>
                    <option value="Out for Delivery" className={darkMode ? 'bg-slate-900 text-white' : ''}>6. Out for Final Delivery</option>
                    <option value="Delivered with POD" className={darkMode ? 'bg-slate-900 text-white' : ''}>7. Delivered & POD Signed</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-400 block mb-1.5">
                    Sub-Status / Operational Condition
                  </label>
                  <input
                    type="text"
                    value={newSubStatus}
                    onChange={(e) => setNewSubStatus(e.target.value)}
                    placeholder="e.g. Cleared BOC Customs, Staged Bay 3, Signed by Receiving Super"
                    className={`w-full px-3 py-2.5 rounded-xl border font-semibold transition-all ${
                      darkMode ? 'bg-white/5 border-white/15 text-white placeholder-slate-500' : 'bg-white border-slate-300'
                    }`}
                  />
                </div>
              </div>

              {/* Description & Attachments (Window #2 Field 4) */}
              <div>
                <label className="font-bold text-slate-400 block mb-1.5">
                  Public Status Description / Notice to Client
                </label>
                <textarea
                  rows={3}
                  value={statusDescription}
                  onChange={(e) => setStatusDescription(e.target.value)}
                  className={`w-full px-3 py-2.5 rounded-xl border transition-all ${
                    darkMode ? 'bg-white/5 border-white/15 text-white placeholder-slate-500' : 'bg-white border-slate-300'
                  }`}
                />
              </div>

              <div>
                <label className="font-bold text-slate-400 block mb-1.5">
                  Attach File / POD Document
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Signed_Delivery_Receipt_POD.pdf or Customs_Clearance_Notice.pdf"
                    value={attachmentName}
                    onChange={(e) => setAttachmentName(e.target.value)}
                    className={`flex-1 px-3 py-2.5 rounded-xl border font-mono text-xs transition-all ${
                      darkMode ? 'bg-white/5 border-white/15 text-white placeholder-slate-500' : 'bg-white border-slate-300'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setAttachmentName(`POD_Receipt_${selectedRefNo}.pdf`)}
                    className={`px-4 py-2.5 rounded-xl border font-bold transition-all ${
                      darkMode ? 'border-white/15 bg-white/5 hover:bg-white/10 text-slate-200' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    Simulate Upload POD
                  </button>
                </div>
              </div>

              {/* Submit Button (Window #2 Field 5) */}
              <div className={`flex justify-end gap-3 pt-4 border-t ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 border border-blue-400/40 flex items-center gap-1.5 transition-all hover:scale-105"
                >
                  <span className="material-symbols-outlined text-[16px]">sync</span>
                  <span>Update Web Status & Publish Notice</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================
            TAB 3: CUSTOMER WEB ACCOUNTS ACCESS (Window #3 & #3b)
        ======================================================== */}
        {activeTab === 'accounts' && (
          <div className={`rounded-3xl p-6 border shadow-2xl backdrop-blur-2xl space-y-6 ${
            darkMode ? 'liquid-glass-card border-white/10' : 'bg-white/90 border-slate-200 shadow-xl'
          }`}>
            <div className={`flex flex-wrap justify-between items-center gap-4 pb-4 border-b ${
              darkMode ? 'border-white/10' : 'border-slate-200'
            }`}>
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
                    <span className="material-symbols-outlined text-indigo-400 text-xl">vpn_key</span>
                  </div>
                  <h3 className={`text-lg font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    2. Customer Tracking Web Accounts Access (Window #3)
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Provision client web account numbers, authentication credentials, and functional permissions for the public tracking portal.
                </p>
              </div>

              <button
                onClick={() => setShowNewAccountModal(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 border border-emerald-400/40 flex items-center gap-1.5 transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">person_add</span>
                <span>Create Web Account (New User)</span>
              </button>
            </div>

            {/* Accounts Table */}
            <div className={`overflow-x-auto rounded-2xl border ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
              <table className="w-full text-left text-xs">
                <thead className={`text-[10px] uppercase font-mono font-bold tracking-wider ${
                  darkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-50 text-slate-500'
                }`}>
                  <tr>
                    <th className="py-3 px-4">Web Account #</th>
                    <th className="py-3 px-4">Customer Name</th>
                    <th className="py-3 px-4">User ID</th>
                    <th className="py-3 px-4">Role / Type</th>
                    <th className="py-3 px-4">Permissions</th>
                    <th className="py-3 px-4">PO Management</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className={`divide-y text-[11px] ${darkMode ? 'divide-white/5' : 'divide-slate-100'}`}>
                  {webAccounts.map((acc) => (
                    <tr key={acc.id} className={`transition-colors ${darkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                      <td className="py-3 px-4 font-mono font-bold text-blue-400">{acc.accountNo}</td>
                      <td className={`py-3 px-4 font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{acc.customerName}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">{acc.userId}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            acc.isAgent
                              ? 'bg-purple-500/20 text-purple-300 border-purple-400/30'
                              : 'bg-white/10 text-slate-300 border-white/15'
                          }`}
                        >
                          {acc.isAgent ? 'Field Agent (Can Enter POD)' : 'Customer Client'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        Tracking, POD Download, Invoices
                      </td>
                      <td className={`py-3 px-4 font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                        {acc.permissions.poMgmt}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                          Active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* New Web Account Modal (Window #3b from Quick_Customers_Tracking_Access.pdf) */}
      {showNewAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`w-full max-w-xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col backdrop-blur-2xl ${
            darkMode ? 'liquid-glass-card border-white/15 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`px-6 py-4 border-b flex justify-between items-center ${
              darkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-900 text-white'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-emerald-400 text-lg">person_add</span>
                </div>
                <h3 className="font-black text-sm">Create Tracking User Access (Window #3b)</h3>
              </div>
              <button
                onClick={() => setShowNewAccountModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveWebAccount} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-400 block mb-1.5">Web Account #</label>
                  <input
                    type="text"
                    required
                    value={newAccount.accountNo}
                    onChange={(e) => setNewAccount({ ...newAccount, accountNo: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border font-mono font-bold transition-all ${
                      darkMode ? 'bg-white/5 border-white/15 text-white' : 'bg-white border-slate-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-400 block mb-1.5">Customer Name</label>
                  <input
                    type="text"
                    required
                    value={newAccount.customerName}
                    onChange={(e) => setNewAccount({ ...newAccount, customerName: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border font-bold transition-all ${
                      darkMode ? 'bg-white/5 border-white/15 text-white' : 'bg-white border-slate-300'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-400 block mb-1.5">User ID</label>
                  <input
                    type="text"
                    required
                    value={newAccount.userId}
                    onChange={(e) => setNewAccount({ ...newAccount, userId: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border font-mono transition-all ${
                      darkMode ? 'bg-white/5 border-white/15 text-white' : 'bg-white border-slate-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-400 block mb-1.5">Password</label>
                  <input
                    type="password"
                    required
                    value={newAccount.passwordHash}
                    onChange={(e) => setNewAccount({ ...newAccount, passwordHash: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border transition-all ${
                      darkMode ? 'bg-white/5 border-white/15 text-white' : 'bg-white border-slate-300'
                    }`}
                  />
                </div>
              </div>

              {/* Agent Checkbox (Field 4 in Guide) */}
              <div className={`p-3.5 rounded-2xl border flex items-start gap-2.5 ${
                darkMode ? 'bg-purple-950/30 border-purple-900/50 text-purple-200' : 'bg-purple-50 border-purple-200 text-purple-900'
              }`}>
                <input
                  type="checkbox"
                  id="agentBox"
                  checked={newAccount.isAgent}
                  onChange={(e) => setNewAccount({ ...newAccount, isAgent: e.target.checked })}
                  className="mt-1 rounded text-purple-600"
                />
                <label htmlFor="agentBox" className="font-bold cursor-pointer">
                  <span>Authorize as Field Agent</span>
                  <span className="block text-[10px] text-purple-300/80 font-normal mt-0.5">
                    When checked, this user is permitted to enter Proof of Delivery (POD) signatures and update physical cargo status directly from mobile.
                  </span>
                </label>
              </div>

              {/* Available Options & Permissions (Field 5 in Guide) */}
              <div className="space-y-2">
                <span className="font-bold text-slate-400 block">Available Permissions:</span>
                <div className="grid grid-cols-2 gap-2">
                  <label className={`flex items-center gap-2 font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    <input
                      type="checkbox"
                      checked={newAccount.permissions.canViewTracking}
                      onChange={(e) =>
                        setNewAccount({
                          ...newAccount,
                          permissions: { ...newAccount.permissions, canViewTracking: e.target.checked }
                        })
                      }
                      className="rounded text-blue-500"
                    />
                    <span>View Live Tracking</span>
                  </label>
                  <label className={`flex items-center gap-2 font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    <input
                      type="checkbox"
                      checked={newAccount.permissions.canDownloadPOD}
                      onChange={(e) =>
                        setNewAccount({
                          ...newAccount,
                          permissions: { ...newAccount.permissions, canDownloadPOD: e.target.checked }
                        })
                      }
                      className="rounded text-blue-500"
                    />
                    <span>Download POD Receipts</span>
                  </label>
                  <label className={`flex items-center gap-2 font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    <input
                      type="checkbox"
                      checked={newAccount.permissions.canUploadDocs}
                      onChange={(e) =>
                        setNewAccount({
                          ...newAccount,
                          permissions: { ...newAccount.permissions, canUploadDocs: e.target.checked }
                        })
                      }
                      className="rounded text-blue-500"
                    />
                    <span>Upload Documents</span>
                  </label>
                  <label className={`flex items-center gap-2 font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    <input
                      type="checkbox"
                      checked={newAccount.permissions.canViewInvoices}
                      onChange={(e) =>
                        setNewAccount({
                          ...newAccount,
                          permissions: { ...newAccount.permissions, canViewInvoices: e.target.checked }
                        })
                      }
                      className="rounded text-blue-500"
                    />
                    <span>View Freight Invoices</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="font-bold text-slate-400 block mb-1.5">Trade Show Mgmt</label>
                  <select
                    value={newAccount.permissions.tradeShowMgmt}
                    onChange={(e) =>
                      setNewAccount({
                        ...newAccount,
                        permissions: { ...newAccount.permissions, tradeShowMgmt: e.target.value as any }
                      })
                    }
                    className={`w-full px-3 py-2 rounded-xl border ${
                      darkMode ? 'bg-white/5 border-white/15 text-white' : 'bg-white border-slate-300'
                    }`}
                  >
                    <option value="None" className={darkMode ? 'bg-slate-900 text-white' : ''}>None</option>
                    <option value="Carrier" className={darkMode ? 'bg-slate-900 text-white' : ''}>Carrier</option>
                    <option value="Show Management" className={darkMode ? 'bg-slate-900 text-white' : ''}>Show Management</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-400 block mb-1.5">PO Management</label>
                  <select
                    value={newAccount.permissions.poMgmt}
                    onChange={(e) =>
                      setNewAccount({
                        ...newAccount,
                        permissions: { ...newAccount.permissions, poMgmt: e.target.value as any }
                      })
                    }
                    className={`w-full px-3 py-2 rounded-xl border ${
                      darkMode ? 'bg-white/5 border-white/15 text-white' : 'bg-white border-slate-300'
                    }`}
                  >
                    <option value="None" className={darkMode ? 'bg-slate-900 text-white' : ''}>None</option>
                    <option value="Standard" className={darkMode ? 'bg-slate-900 text-white' : ''}>Standard</option>
                    <option value="Container" className={darkMode ? 'bg-slate-900 text-white' : ''}>Container</option>
                  </select>
                </div>
              </div>

              <div className={`flex justify-end gap-2 pt-4 border-t ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
                <button
                  type="button"
                  onClick={() => setShowNewAccountModal(false)}
                  className={`px-4 py-2 rounded-xl border font-bold transition-all ${
                    darkMode ? 'border-white/15 hover:bg-white/10 text-slate-300' : 'border-slate-300 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold shadow-lg shadow-blue-600/30 border border-blue-400/40 flex items-center gap-1.5 transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  <span>Save & Authorize Web Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Web Status Activity Report (Window #4 from Web_Status_Pick-up_Delivery.pdf) */}
      {showStatusReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col backdrop-blur-2xl ${
            darkMode ? 'liquid-glass-card border-white/15 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`px-6 py-4 border-b flex justify-between items-center ${
              darkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-900 text-white'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-blue-400 text-lg">summarize</span>
                </div>
                <h3 className="font-black text-sm">Tracking Status Activity Report (Window #4)</h3>
              </div>
              <button
                onClick={() => setShowStatusReportModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs font-mono">
              <div className={`text-center pb-3 border-b ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
                <h4 className={`font-black text-base tracking-wider ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  KORNET EXPRESS FREIGHT SERVICES
                </h4>
                <span className="text-[10px] text-slate-400 tracking-wider block mt-0.5">
                  WEB STATUS NOTIFICATIONS & CLIENT TRACKING REPORT
                </span>
              </div>

              <div className="space-y-2 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">REPORT DATE: {new Date().toLocaleDateString()}</span>
                  <span className="text-slate-400">TOTAL NOTIFICATIONS: 42</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">DISPATCHED WEB NOTICES: 100% SENT</span>
                  <span className="text-slate-400">ACTIVE TRACKING SESSIONS: 18</span>
                </div>
              </div>

              <div className={`p-4 rounded-2xl border space-y-1 ${
                darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className={`font-bold block ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Recent Web Push Events:</span>
                <p className="text-slate-400">&bull; KN-OE-2026-0891: [Departed Terminal - Vessel Underway] sent to client portal.</p>
                <p className="text-slate-400">&bull; PD-2026-001: [In Transit - Out for Delivery] SMS & Web notification fired.</p>
                <p className="text-slate-400">&bull; KN-AE-2026-0412: [Customs Cleared] NAIA terminal gate pass generated.</p>
              </div>
            </div>

            <div className={`px-6 py-3 border-t flex justify-end gap-2 text-xs ${
              darkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'
            }`}>
              <button
                onClick={() => setShowStatusReportModal(false)}
                className={`px-4 py-2 rounded-xl border font-bold transition-all ${
                  darkMode ? 'border-white/15 hover:bg-white/10 text-slate-300' : 'border-slate-300 text-slate-700'
                }`}
              >
                Close
              </button>
              <button
                onClick={() => {
                  window.print()
                  setShowStatusReportModal(false)
                }}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold flex items-center gap-1.5 shadow-lg shadow-blue-600/30 border border-blue-400/40"
              >
                <span className="material-symbols-outlined text-[16px]">print</span>
                <span>Print Report</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
