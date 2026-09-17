import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useLogisticsStore } from '../../stores/logisticsStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { useSavingStore } from '../../stores/savingStore'
import { useIntegrationsStore } from '../../stores/integrationsStore'
import { useAuthStore } from '../../stores/authStore'

export default function LogisticsHeader() {
  const navigate = useNavigate()
  const location = useLocation()
  const isFS = location.pathname.startsWith('/fs')

  const {
    activeModule,
    setActiveModule,
    setActiveSubView,
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    setModalOpen,
    openPrintModal,
    openContainerStuffingModal,
    selectedFileNo,
    setSelectedFileNo,
    shipments,
    vehicles,
    pdOrders,
    checks,
    bridgeQueue,
    closeShipment,
    duplicateShipment,
    deleteShipment,
    addAuditLog,
    setActiveTerminal,
    selectedBranchCode,
    setSelectedBranchCode
  } = useLogisticsStore()

  const { darkMode, setDarkMode } = useSettingsStore()
  const logout = useAuthStore((state) => state.logout)
  const isSaving = useSavingStore((s) => s.status === 'saving')
  const openIntegrations = useIntegrationsStore((s) => s.openSettings)

  // Toast / Status Message State
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  void showToast


  const currentShipment = shipments.find((s) => s.fileNo === selectedFileNo) || shipments[0]
  const pendingBridgeCount = bridgeQueue.filter((b) => b.status !== 'Posted').length
  const holdVehiclesCount = vehicles.filter((v) => v.status === 'Hold' || v.customsTitleRejected).length

  // Quick Action Handlers
  const handlePrimaryNew = () => {
    if (isFS) {
      navigate('/fs/voucher')
      showToast('Opened Cash Disbursement (CDV) Voucher Entry')
      return
    }

    if (activeModule === 'ocean') {
      setModalOpen('newBooking', true)
    } else if (activeModule === 'air') {
      setModalOpen('newAirwaybill', true)
    } else if (activeModule === 'fleet') {
      setModalOpen('newDispatchRoute', true)
    } else if (activeModule === 'vehicles') {
      setModalOpen('newVehicle', true)
    } else if (activeModule === 'pd') {
      setModalOpen('newPDOrder', true)
    } else if (activeModule === 'bridge') {
      setModalOpen('newCheck', true)
    } else if (activeModule === 'map') {
      setModalOpen('newDispatchRoute', true)
    }
  }

  const handleCopyRecord = () => {
    if (!currentShipment) {
      showToast('No active file selected to duplicate.')
      return
    }
    const cloned = duplicateShipment(currentShipment.fileNo)
    if (cloned) {
      showToast(`Record duplicated as ${cloned.fileNo}!`)
    }
  }

  const handleDeleteRecord = () => {
    if (!currentShipment) {
      showToast('No active file selected to delete.')
      return
    }
    const confirmed = window.confirm(
      `Delete and archive shipment ${currentShipment.fileNo}?\n\nThis will remove it from active operational staging.`
    )
    if (confirmed) {
      deleteShipment(currentShipment.fileNo)
      showToast(`Shipment ${currentShipment.fileNo} archived.`)
    }
  }

  const handleRefreshData = () => {
    setSearchTerm('')
    setFilterStatus('ALL')
    if (shipments.length > 0) {
      setSelectedFileNo(shipments[0].fileNo)
    }
    addAuditLog({
      user: 'OFFICE',
      module: 'System',
      action: 'Refresh Sync',
      referenceNo: 'ALL',
      details: 'Synchronized operational records and recalculated live ledger margins'
    })
    showToast('Data tables synchronized.')
  }

  const handlePrintCurrent = () => {
    if (isFS) {
      navigate('/fs/reports/trial-balance')
      showToast('Loading Trial Balance Report...')
      return
    }

    if (activeModule === 'ocean') {
      openPrintModal({
        type: 'BOL',
        title: `Export Ocean Bill of Lading — ${currentShipment?.blOrAwbNo || 'BL'}`,
        data: currentShipment
      })
    } else if (activeModule === 'air') {
      openPrintModal({
        type: 'AWB',
        title: `IATA Air Waybill — ${currentShipment?.blOrAwbNo || 'AWB'}`,
        data: currentShipment
      })
    } else if (activeModule === 'pd') {
      const order = pdOrders[0]
      if (!order) {
        showToast('No Cartage P/D orders available to print.')
        return
      }
      openPrintModal({
        type: 'DOCK_RECEIPT',
        title: `Domestic Dock & Cartage Receipt — ${order.orderNo}`,
        data: order
      })
    } else if (activeModule === 'vehicles') {
      const vehicle = vehicles[0]
      if (!vehicle) {
        showToast('No vehicles available in inventory to print.')
        return
      }
      openPrintModal({
        type: 'BARCODE_LABELS',
        title: `Vehicle Inventory Staging Label — ${vehicle.vin}`,
        data: vehicle
      })
    } else if (activeModule === 'bridge') {
      const chk = checks[0]
      if (!chk) {
        showToast('No check disbursements available to print.')
        return
      }
      openPrintModal({
        type: 'CHECK_VOUCHER',
        title: `Cash Disbursement Check Voucher #${chk.checkNo}`,
        data: chk
      })
    } else if (activeModule === 'fleet') {
      const route = useLogisticsStore.getState().dispatchRoutes[0]
      if (!route) {
        showToast('No dispatch route available to print.')
        return
      }
      openPrintModal({
        type: 'DOCK_RECEIPT',
        title: 'Proof of Delivery (POD) Dispatch Manifest',
        data: route
      })
    }
  }

  const handleCloseActiveFile = () => {
    if (!currentShipment) return
    const success = closeShipment(currentShipment.fileNo)
    if (success) {
      showToast(`Shipment ${currentShipment.fileNo} locked and verified.`)
    }
  }

  const handleLogout = async () => {
    await logout()
  }

  const terminalOptions = [
    { code: 'ALL', name: 'All Terminals (Consolidated Nationwide)' },
    { code: 'MNL', name: 'Manila South Harbor HQ (MNL)' },
    { code: 'BTN', name: 'Bataan Freeport Hub (BTN)' },
    { code: 'CRK', name: 'Clark International Airport Hub (CRK)' },
    { code: 'CEB', name: 'Cebu Pier Logistics Depot (CEB)' },
    { code: 'DVO', name: 'Davao Sasa Wharf Hub (DVO)' },
    { code: 'CDO', name: 'Cagayan De Oro Macabalan Port (CDO)' },
  ]

  // Breadcrumb text based on current location
  const getBreadcrumb = () => {
    if (isFS) {
      if (location.pathname.startsWith('/fs/voucher')) return 'Financial Statements › Cash Disbursement (CDV)'
      if (location.pathname.startsWith('/fs/journal/receipt')) return 'Financial Statements › Cash Receipts Journal'
      if (location.pathname.startsWith('/fs/journal/sales')) return 'Financial Statements › Sales Book Journals'
      if (location.pathname.startsWith('/fs/reports/trial-balance')) return 'Financial Statements › Live Trial Balance'
      if (location.pathname.startsWith('/fs/reports/balance-sheet')) return 'Financial Statements › Balance Sheet'
      if (location.pathname.startsWith('/fs/reports/income-statement')) return 'Financial Statements › Income Statement (P&L)'
      if (location.pathname.startsWith('/fs/posting')) return 'Financial Statements › Transaction Posting'
      if (location.pathname.startsWith('/fs/month-end')) return 'Financial Statements › Month-End Closing'
      if (location.pathname.startsWith('/fs/chart-of-accounts')) return 'Financial Statements › Chart of Accounts'
      return 'Financial Statements › Fiscal Narrative Overview'
    }

    if (location.pathname.includes('ocean-export')) return 'Operations › Ocean Export Freight'
    if (location.pathname.includes('ocean-import')) return 'Operations › Ocean Import Freight'
    if (location.pathname.includes('air-export')) return 'Operations › Air Export Cargo'
    if (location.pathname.includes('air-import')) return 'Operations › Air Import Cargo'
    if (location.pathname.includes('rates-maintenance')) return 'Operations › System Rates & Maintenance'
    if (location.pathname.includes('vehicles')) return 'Operations › Vehicle Staging & Inspection'
    if (location.pathname.includes('pd-orders')) return 'Operations › Domestic Cartage P/D'
    if (location.pathname.includes('fleet')) return 'Operations › Fleet & Dispatch'
    if (location.pathname.includes('map')) return 'Operations › Nationwide Network Map'
    if (location.pathname.includes('accounting-bridge')) return 'Operations › Accounting Bridge'
    if (location.pathname.includes('tracking')) return 'Operations › Client Tracking'
    return 'Operations › Operations Overview'
  }

  return (
    <header className="border-b border-white/10 liquid-glass shadow-[0_12px_40px_rgba(2,14,33,0.65)] select-none relative z-30">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-[#0e1c2f]/95 text-white border border-blue-400 shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-200">
          <span className="material-symbols-outlined text-blue-400 text-[18px]">info</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ══ Top VisionOS Header: Brand, Navigation Pills & Controls ══ */}
      <div className="px-4 lg:px-6 py-2 bg-[#061426]/80 backdrop-blur-xl flex items-center justify-between border-b border-white/10 text-xs gap-3">
        {/* Brand & Terminal Station */}
        <div className="flex items-center gap-4 min-w-max">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/logistics/overview')}>
            <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden shadow-[0_0_12px_rgba(37,99,235,0.4)]">
              <img src="/brand/kornet-express-logo.png" alt="Kornet Express, Inc." className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold tracking-tight text-white text-sm">KORNET EXPRESS</span>
                <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono text-[10px] uppercase tracking-wider border border-blue-400/25">
                  v4.8 LTS
                </span>
              </div>
              <span className="text-[10px] uppercase tracking-widest text-[#c3c6d7]/70 font-mono">
                powered by iSupplyTech
              </span>
            </div>
          </div>

          {/* Operating Terminal Station Selector */}
          <div className="hidden xl:flex items-center gap-1.5 pl-3 border-l border-white/10 text-[11px] text-[#c3c6d7]">
            <span className="material-symbols-outlined text-[15px] text-blue-400">location_on</span>
            <select
              value={selectedBranchCode}
              onChange={(e) => {
                const code = e.target.value
                setSelectedBranchCode(code)
                const opt = terminalOptions.find((t) => t.code === code)
                setActiveTerminal(opt?.name || 'All Terminals')
                showToast(`Terminal Scope: ${opt?.name || code}`)
              }}
              className="bg-[#020e21]/80 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-mono font-medium focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer"
            >
              {terminalOptions.map((t) => (
                <option key={t.code} value={t.code} className="bg-[#0e1c2f] text-white">{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Central Stitch Navigation Pills */}
        <nav className="hidden 2xl:flex items-center gap-1 bg-[#020e21]/70 p-1 rounded-full border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
          {[
            { id: 'overview', label: 'Cartographic Cockpit', path: '/logistics/overview' },
            { id: 'ocean-export', label: 'Ocean Freight', path: '/logistics/ocean-export' },
            { id: 'air-export', label: 'Air & IATA', path: '/logistics/air-export' },
            { id: 'fleet', label: 'Inland Drayage', path: '/logistics/fleet' },
            { id: 'accounting-bridge', label: 'Accounting Bridge', path: '/logistics/accounting-bridge' },
          ].map((tab) => {
            const isActive = location.pathname.includes(tab.id) || (tab.id === 'overview' && (location.pathname === '/logistics' || location.pathname === '/logistics/'))
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => navigate(tab.path)}
                className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all ${
                  isActive
                    ? 'nav-active-pill text-white shadow-[0_0_14px_rgba(37,99,235,0.5)]'
                    : 'text-[#c3c6d7] hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </nav>

        {/* Right Status Controls */}
        <div className="flex items-center gap-3">
          {/* Live FS Sync Online Badge with ping dot */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-[#020e21]/80 border border-white/10 text-[11px] font-mono">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
            </span>
            <span className="text-[#c3c6d7]">FS SYNC: <strong className="text-emerald-400">ONLINE</strong></span>
          </div>

          {/* Cloud Auto-Save */}
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-[#c3c6d7] font-mono">
            {isSaving ? (
              <span className="text-amber-400 flex items-center gap-1 animate-pulse">
                <span className="material-symbols-outlined text-[14px]">sync</span>
                Syncing...
              </span>
            ) : (
              <span className="text-emerald-400/90 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">cloud_done</span>
                Synced
              </span>
            )}
          </div>

          {/* Integrations & Diagnostics Modal Trigger */}
          <button
            onClick={openIntegrations}
            className="p-1.5 rounded-lg liquid-glass-subtle text-[#c3c6d7] hover:text-white transition-colors"
            title="Integrations & Hardware Devices"
          >
            <span className="material-symbols-outlined text-[16px]">hub</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-1.5 rounded-lg liquid-glass-subtle text-[#c3c6d7] hover:text-white transition-colors"
            title="Toggle theme appearance"
          >
            <span className="material-symbols-outlined text-[16px]">
              {darkMode ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

          {/* User Profile Badge (Capt. D. Vance) */}
          <div className="flex items-center gap-2 pl-2 border-l border-white/10">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center font-bold text-xs border border-white/20 shadow-md">
                DV
              </div>
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#061426]" />
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="font-mono text-[11px] font-bold text-white tracking-tight leading-none">CAPT. D. VANCE</span>
              <span className="text-[9px] font-medium text-blue-400 leading-tight">Global Ops Controller</span>
            </div>
          </div>

          {/* Sign Out */}
          <button
            type="button"
            onClick={() => void handleLogout()}
            title="Sign out of Kornet Express"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 transition-colors"
          >
            <span className="material-symbols-outlined text-[15px]">logout</span>
            <span className="hidden sm:inline text-[11px] font-semibold">Sign out</span>
          </button>
        </div>
      </div>

      {/* ══ Action Ribbon Bar: Context-Sensitive Operational Commands ══ */}
      <div className="kornet-logistics-actionbar px-4 lg:px-6 py-2 bg-[#0b192c]/85 backdrop-blur-md border-b border-white/10 flex items-center justify-between gap-3 text-xs min-h-[48px] overflow-x-auto">
        {/* Left Side: Context-Sensitive Action Tools */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* 1. Primary Action Button (Dynamically Labeled and Colored per Module) */}
          <button
            onClick={handlePrimaryNew}
            title="Create New Record for Active Workspace"
            className={`px-3 py-1.5 rounded-xl text-white font-bold flex items-center gap-1.5 shadow-[0_0_16px_rgba(37,99,235,0.4)] border border-white/20 transition-all text-xs cursor-pointer ${
              isFS
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600'
                : activeModule === 'air'
                ? 'bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-500 hover:to-sky-600'
                : activeModule === 'vehicles'
                ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600'
                : activeModule === 'pd'
                ? 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600'
                : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">add_box</span>
            <span>
              {isFS
                ? '+ New CDV Voucher'
                : activeModule === 'ocean'
                ? '+ New Ocean Booking'
                : activeModule === 'air'
                ? '+ New Air Waybill'
                : activeModule === 'fleet'
                ? '+ New Dispatch Route'
                : activeModule === 'vehicles'
                ? '+ Add Vehicle'
                : activeModule === 'pd'
                ? '+ New P/D Order'
                : activeModule === 'bridge'
                ? '+ Issue Check'
                : '+ New Entry'}
            </span>
          </button>

          {/* 2. Contextual Secondary Actions */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-300 dark:border-slate-800">
            {/* === FS FINANCIAL STATEMENTS ACTIONS === */}
            {isFS && (
              <>
                <button
                  onClick={() => navigate('/fs/journal/receipt')}
                  title="Cash Receipts Journal"
                  className="px-2.5 py-1 rounded bg-white hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px] text-emerald-500">payments</span>
                  <span>Receipts</span>
                </button>
                <button
                  onClick={() => navigate('/fs/journal/sales')}
                  title="Sales Book Journals"
                  className="px-2.5 py-1 rounded bg-white hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px] text-emerald-500">sell</span>
                  <span>Sales Book</span>
                </button>
                <button
                  onClick={() => navigate('/fs/reports/trial-balance')}
                  title="Live Trial Balance Statement"
                  className="px-2.5 py-1 rounded bg-white hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px] text-emerald-500">balance</span>
                  <span>Trial Balance</span>
                </button>
                <button
                  onClick={() => navigate('/fs/reports/balance-sheet')}
                  title="Balance Sheet Statement"
                  className="px-2.5 py-1 rounded bg-white hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px] text-emerald-500">account_balance</span>
                  <span>Balance Sheet</span>
                </button>
                <button
                  onClick={() => navigate('/fs/posting')}
                  title="Post Transactions to General Ledger"
                  className="px-2.5 py-1 rounded bg-white hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px] text-emerald-500">publish</span>
                  <span>Post All</span>
                </button>
                <button
                  onClick={() => navigate('/fs/chart-of-accounts')}
                  title="Chart of Accounts Master List"
                  className="px-2.5 py-1 rounded bg-white hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px] text-emerald-500">format_list_numbered</span>
                  <span>COA</span>
                </button>
              </>
            )}

            {/* === OCEAN FREIGHT ACTIONS === */}
            {!isFS && activeModule === 'ocean' && (
              <>
                <button
                  onClick={handlePrintCurrent}
                  title="Print Official Ocean Bill of Lading"
                  className="px-2.5 py-1 rounded bg-white hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px] text-blue-500">print</span>
                  <span>Print BOL</span>
                </button>
                <button
                  onClick={() => setModalOpen('sedFiling', true)}
                  title="Bureau of Customs (BOC) e2m Gateway"
                  className="px-2.5 py-1 rounded bg-white hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px] text-indigo-500">verified_user</span>
                  <span>BOC e2m</span>
                </button>
                <button
                  onClick={() => setModalOpen('manifest', true)}
                  title="Ocean Cargo Manifest"
                  className="px-2.5 py-1 rounded bg-white hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px] text-blue-500">table_rows</span>
                  <span>Manifest</span>
                </button>
                <button
                  onClick={() => openContainerStuffingModal('CS-2026-0891')}
                  title="Container Stuffing Guide"
                  className="px-2.5 py-1 rounded bg-white hover:bg-amber-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px] text-amber-500">view_in_ar</span>
                  <span>Stuffing</span>
                </button>
                <button
                  onClick={() => setModalOpen('newCharge', true)}
                  title="Add Dual-Ledger Billing / Cost Charge"
                  className="px-2.5 py-1 rounded bg-white hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px] text-emerald-500">add_card</span>
                  <span>Add Charge</span>
                </button>
                <button
                  onClick={() => setModalOpen('fileAnalysis', true)}
                  title="Pre-Audit File Margin Check"
                  className="px-2.5 py-1 rounded bg-white hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px] text-blue-500">verified</span>
                  <span>Pre-Audit</span>
                </button>
                <button
                  onClick={handleCopyRecord}
                  title="Duplicate Active File"
                  className="px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px]">content_copy</span>
                </button>
                <button
                  onClick={handleCloseActiveFile}
                  title="Lock & Close File"
                  className="px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px]">lock</span>
                </button>
                <button
                  onClick={handleDeleteRecord}
                  title="Archive File"
                  className="p-1 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-500 rounded transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px]">delete</span>
                </button>
              </>
            )}

            {/* === AIR FREIGHT ACTIONS === */}
            {!isFS && activeModule === 'air' && (
              <>
                <button
                  onClick={handlePrintCurrent}
                  title="Print IATA Air Waybill"
                  className="px-2.5 py-1 rounded bg-white hover:bg-sky-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px] text-sky-500">print</span>
                  <span>Print IATA AWB</span>
                </button>
                <button
                  onClick={() => setModalOpen('sedFiling', true)}
                  title="BOC e2m Air Clearance"
                  className="px-2.5 py-1 rounded bg-white hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px] text-indigo-500">verified_user</span>
                  <span>BOC e2m</span>
                </button>
                <button
                  onClick={() => setModalOpen('manifest', true)}
                  title="Flight Manifest"
                  className="px-2.5 py-1 rounded bg-white hover:bg-sky-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px] text-sky-500">table_rows</span>
                  <span>Manifest</span>
                </button>
                <button
                  onClick={() => setModalOpen('newCharge', true)}
                  title="Add Air Freight Charge"
                  className="px-2.5 py-1 rounded bg-white hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px] text-emerald-500">add_card</span>
                  <span>Add Charge</span>
                </button>
                <button
                  onClick={() => setModalOpen('fileAnalysis', true)}
                  title="Pre-Audit Flight Margin"
                  className="px-2.5 py-1 rounded bg-white hover:bg-sky-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px] text-sky-500">verified</span>
                  <span>Pre-Audit</span>
                </button>
              </>
            )}

            {/* === FLEET & DISPATCH ACTIONS === */}
            {!isFS && activeModule === 'fleet' && (
              <>
                <button
                  onClick={() => setModalOpen('newVehicle', true)}
                  title="Add Fleet Vehicle Asset"
                  className="px-2.5 py-1 rounded bg-white hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px] text-indigo-500">local_shipping</span>
                  <span>+ Vehicle Asset</span>
                </button>
                <button
                  onClick={() => setModalOpen('newDriver', true)}
                  title="Register Commercial Driver"
                  className="px-2.5 py-1 rounded bg-white hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px] text-emerald-500">badge</span>
                  <span>+ Register Driver</span>
                </button>
                <button
                  onClick={handlePrintCurrent}
                  title="Print Dispatch Manifest & POD Slip"
                  className="px-2.5 py-1 rounded bg-white hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px] text-blue-500">print</span>
                  <span>Print POD Slip</span>
                </button>
                <button
                  onClick={() => setActiveModule('map')}
                  title="Switch to Philippine Corridors Map"
                  className="px-2.5 py-1 rounded bg-white hover:bg-teal-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px] text-teal-500">map</span>
                  <span>Corridors Map</span>
                </button>
              </>
            )}

            {/* === VEHICLE INVENTORY ACTIONS === */}
            {!isFS && activeModule === 'vehicles' && (
              <>
                <button
                  onClick={() =>
                    openPrintModal({
                      type: 'BARCODE_LABELS',
                      title: 'Philippine Standard Vehicle Inventory Staging Label',
                      data: vehicles[0] || {
                        vin: '1HGCR2F83HA129048',
                        make: 'Honda',
                        model: 'Accord Touring',
                        year: 2024,
                        destination: 'Manila South Harbor CFS'
                      }
                    })
                  }
                  title="Print Vehicle Barcode Staging Labels"
                  className="px-2.5 py-1 rounded bg-white hover:bg-cyan-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px] text-cyan-500">qr_code_2</span>
                  <span>Print Staging Labels</span>
                </button>
                <button
                  onClick={() => {
                    setActiveSubView('specs')
                    showToast('Switched to NHTSA VIN Engine')
                  }}
                  title="NHTSA VIN Decoder Engine"
                  className="px-2.5 py-1 rounded bg-white hover:bg-cyan-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px] text-cyan-500">directions_car</span>
                  <span>VIN Decoder</span>
                </button>
                <button
                  onClick={() => {
                    setActiveSubView('docs')
                    showToast('Switched to Title Clearance & Customs Holds')
                  }}
                  className="relative px-2.5 py-1 rounded bg-white hover:bg-cyan-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px] text-cyan-500">gavel</span>
                  <span>Title Clearance</span>
                  {holdVehiclesCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-red-500 text-white">
                      {holdVehiclesCount}
                    </span>
                  )}
                </button>
              </>
            )}

            {/* === PICKUP & DELIVERY CARTAGE ACTIONS === */}
            {!isFS && activeModule === 'pd' && (
              <>
                <button
                  onClick={handlePrintCurrent}
                  title="Print Dock & Cartage Receipt"
                  className="px-2.5 py-1 rounded bg-white hover:bg-amber-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px] text-amber-500">receipt_long</span>
                  <span>Print Dock Receipt</span>
                </button>
                <button
                  onClick={() => {
                    setActiveSubView('times')
                    showToast('Switched to Dispatch Board')
                  }}
                  title="Dispatch Board Schedule"
                  className="px-2.5 py-1 rounded bg-white hover:bg-amber-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px] text-amber-500">schedule</span>
                  <span>Dispatch Board</span>
                </button>
              </>
            )}

            {/* === NATIONWIDE MAP ACTIONS === */}
            {!isFS && activeModule === 'map' && (
              <>
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('reset-map-view'))
                    showToast('Map centered on Philippine Archipelago')
                  }}
                  title="Center Map on Philippine Archipelago"
                  className="px-2.5 py-1 rounded bg-white hover:bg-teal-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px] text-teal-500">center_focus_strong</span>
                  <span>Center Philippines</span>
                </button>
                <button
                  onClick={() => setActiveModule('fleet')}
                  title="View Active Fleet Dispatches"
                  className="px-2.5 py-1 rounded bg-white hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px] text-blue-500">alt_route</span>
                  <span>Fleet Dispatches</span>
                </button>
              </>
            )}

            {/* === ACCOUNTING BRIDGE ACTIONS === */}
            {!isFS && activeModule === 'bridge' && (
              <>
                <button
                  onClick={() => {
                    setActiveSubView('staged')
                    showToast('Viewing Staged Queue')
                  }}
                  className="px-2.5 py-1 rounded bg-white hover:bg-purple-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px] text-purple-500">hub</span>
                  <span>Staged Queue</span>
                  {pendingBridgeCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-500 text-white">
                      {pendingBridgeCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => {
                    setActiveSubView('trial')
                    showToast('Trial Post Simulation active')
                  }}
                  className="px-2.5 py-1 rounded bg-white hover:bg-purple-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px] text-purple-500">fact_check</span>
                  <span>Trial Post</span>
                </button>
                <button
                  onClick={() => {
                    setActiveSubView('checks')
                    showToast('Viewing Checks Register')
                  }}
                  className="px-2.5 py-1 rounded bg-white hover:bg-purple-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px] text-purple-500">payments</span>
                  <span>Check Register</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right Side: Global Search, Status Filter, Refresh & Core Utilities */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Universal Search Input */}
          <div className="flex items-center relative">
            <span className="material-symbols-outlined absolute left-2.5 text-blue-400 text-[14px]">search</span>
            <input
              type="text"
              placeholder="Search file, ref, B/L, VIN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-7 py-1 w-44 lg:w-56 rounded-xl input-glass text-xs font-mono placeholder-slate-500 focus:w-64 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 p-0.5 text-slate-400 hover:text-white"
              >
                <span className="material-symbols-outlined text-[13px]">close</span>
              </button>
            )}
          </div>

          {/* Quick Status Filter Dropdown */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2.5 py-1 rounded-xl input-glass text-xs font-mono cursor-pointer outline-none text-white"
          >
            <option value="ALL" className="bg-[#0e1c2f]">All Status</option>
            <option value="Open" className="bg-[#0e1c2f]">Open</option>
            <option value="Closed" className="bg-[#0e1c2f]">Closed</option>
            <option value="Hold" className="bg-[#0e1c2f]">On Hold</option>
          </select>

          {/* Refresh Synchronizer */}
          <button
            onClick={handleRefreshData}
            title="Refresh & Synchronize Operational Tables"
            className="p-1.5 rounded-xl liquid-glass-subtle text-[#c3c6d7] hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[15px]">refresh</span>
          </button>

          {/* Document Attachments Modal Trigger */}
          <button
            onClick={() => setModalOpen('attachments', true)}
            title="Upload / View Document Attachments"
            className="p-1.5 rounded-xl liquid-glass-subtle text-violet-400 hover:text-violet-300 transition-colors"
          >
            <span className="material-symbols-outlined text-[15px]">attach_file</span>
          </button>

          {/* Audit Trail Modal Trigger */}
          <button
            onClick={() => setModalOpen('auditLog', true)}
            title="View Security & Transaction Audit Trail"
            className="p-1.5 rounded-xl liquid-glass-subtle text-amber-400 hover:text-amber-300 transition-colors"
          >
            <span className="material-symbols-outlined text-[15px]">security</span>
          </button>
        </div>
      </div>
    </header>
  )
}
