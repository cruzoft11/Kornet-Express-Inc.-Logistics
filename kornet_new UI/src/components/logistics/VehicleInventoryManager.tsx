import { useState } from 'react'
import { useLogisticsStore, Vehicle } from '../../stores/logisticsStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { useRequireIntegration } from '../../hooks/useRequireIntegration'

export default function VehicleInventoryManager() {
  const darkMode = useSettingsStore((s) => s.darkMode)
  const {
    vehicles,
    createVehicle,
    decodeVin,
    inspectVehicle,
    toggleCustomsHold,
    forceReadyToShip,
    openPrintModal
  } = useLogisticsStore()
  const requireIntegration = useRequireIntegration()

  const [vinInput, setVinInput] = useState('')
  const [isDecoding, setIsDecoding] = useState(false)
  const [decodedData, setDecodedData] = useState<any>(null)
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(vehicles[0]?.id || '')
  const [activeTab, setActiveTab] = useState<'specs' | 'docs' | 'location' | 'history'>('specs')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0]

  const handleDecode = async () => {
    if (!vinInput || vinInput.length < 11) {
      window.alert('Please enter a valid VIN (11 to 17 characters).')
      return
    }
    setIsDecoding(true)
    const res = await decodeVin(vinInput)
    setDecodedData(res)
    setIsDecoding(false)
  }

  const handleCreateVehicle = () => {
    if (!decodedData || !vinInput) return
    const newV: Vehicle = {
      id: `v-${Date.now()}`,
      vin: vinInput.toUpperCase(),
      year: decodedData.year,
      make: decodedData.make,
      model: decodedData.model,
      trim: 'Standard Edition',
      bodyType: decodedData.bodyType,
      color: 'Monochrome Silver',
      engine: decodedData.engine || 'Standard Powertrain',
      condition: 'New Arrival / Pending Inspection',
      keys: '2 FOB Keys',
      status: 'Expected',
      titleStatus: 'Pending',
      lienReleaseCleared: false,
      tentativeCleared: false,
      customsTitleRejected: false,
      shipper: 'Global Auto Logistics LLC',
      consignee: 'VIP Pacific Distributors Manila',
      warehouseLocation: 'Carson Staging Yard',
      whseBin: 'BAY-STG-01',
      lengthInches: 190,
      widthInches: 75,
      heightInches: 60,
      unitWeightLbs: 3800,
      cubicFeet: 494.8,
      history: [
        {
          status: 'Expected',
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          user: 'OFFICE',
          comments: `Intake order created via NHTSA VIN decode (${decodedData.year} ${decodedData.make} ${decodedData.model})`
        }
      ]
    }
    createVehicle(newV)
    setSelectedVehicleId(newV.id)
    setVinInput('')
    setDecodedData(null)
  }

  const filteredVehicles = vehicles.filter((v) => {
    if (statusFilter === 'ALL') return true
    return v.status === statusFilter
  })

  return (
    <div className={`stitch-module-surface flex-1 flex flex-col overflow-hidden relative font-sans ${
      darkMode ? 'bg-[#0b1120] text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Ambient background light orbs */}
      <div className="orb-float-1 absolute -top-24 -left-24 w-96 h-96 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />
      <div className="orb-float-2 absolute -bottom-32 right-1/4 w-[28rem] h-[28rem] rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />

      {/* Top Action Bar: VIN Decoding & Staging */}
      <div className={`px-6 py-3 border-b flex flex-wrap items-center justify-between gap-4 text-xs z-20 backdrop-blur-xl ${
        darkMode ? 'bg-[#0f172a]/80 border-white/10' : 'bg-white/80 border-slate-200'
      }`}>
        <div className="flex items-center gap-2.5 flex-1 max-w-xl">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">
              qr_code_scanner
            </span>
            <input
              type="text"
              placeholder="Enter 17-digit VIN (e.g. 1G1YY22U965108291, WAUZZZF27NA019284)..."
              value={vinInput}
              onChange={(e) => setVinInput(e.target.value.toUpperCase())}
              className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs font-mono font-bold uppercase focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all ${
                darkMode ? 'bg-slate-900/80 border-white/10 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-800'
              }`}
            />
          </div>
          <button
            onClick={handleDecode}
            disabled={isDecoding}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-900/30 flex items-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-[16px] ${isDecoding ? 'animate-spin' : ''}`}>
              {isDecoding ? 'sync' : 'barcode_reader'}
            </span>
            {isDecoding ? 'Decoding...' : '1-Click VIN Decode'}
          </button>
        </div>

        {decodedData && (
          <div className="flex items-center gap-3 bg-blue-500/10 px-3.5 py-1.5 rounded-xl border border-blue-500/20 animate-fadeIn">
            <span className="text-xs text-blue-400 font-mono font-bold">
              Decoded: {decodedData.year} {decodedData.make} {decodedData.model} ({decodedData.bodyType})
            </span>
            <button
              onClick={handleCreateVehicle}
              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm flex items-center gap-1 transition-all active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[14px]">add</span>
              Ingest into Inventory
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-[10px] font-mono uppercase tracking-wider">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`px-3 py-2 rounded-xl border font-semibold text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/50 ${
              darkMode ? 'bg-slate-900/80 border-white/10 text-slate-300' : 'bg-white border-slate-300 text-slate-700'
            }`}
          >
            <option value="ALL">All Statuses ({vehicles.length})</option>
            <option value="Expected">Expected</option>
            <option value="Received">Received</option>
            <option value="Ready to Ship">Ready to Ship</option>
            <option value="Pre-Loaded">Pre-Loaded</option>
            <option value="Loaded">Loaded</option>
            <option value="Hold">Customs Hold</option>
          </select>
        </div>
      </div>

      {/* Main Split View */}
      <div className="flex-1 flex overflow-hidden z-10">
        {/* Left: Vehicles Master List */}
        <div className={`w-84 border-r flex flex-col overflow-y-auto backdrop-blur-xl ${
          darkMode ? 'bg-slate-900/40 border-white/10' : 'bg-white/60 border-slate-200'
        }`}>
          <div className={`p-3.5 border-b text-[10px] font-mono uppercase tracking-wider flex justify-between items-center ${
            darkMode ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-500'
          }`}>
            <span className="font-bold">Vehicle Inventory ({filteredVehicles.length})</span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">VIN Staging</span>
          </div>

          <div className="p-2 space-y-1.5 overflow-y-auto">
            {filteredVehicles.map((v) => {
              const isSelected = v.id === selectedVehicle?.id
              return (
                <div
                  key={v.id}
                  onClick={() => setSelectedVehicleId(v.id)}
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
                  <div className="flex justify-between items-start mb-1.5">
                    <div>
                      <span className="font-bold text-xs tracking-tight block">
                        {v.year} {v.make} {v.model}
                      </span>
                      <span className="text-[10px] font-mono text-blue-400">
                        {v.vin}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-mono uppercase font-bold border ${
                        v.status === 'Hold' || v.customsTitleRejected
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse'
                          : v.status === 'Ready to Ship'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : v.status === 'Pre-Loaded' || v.status === 'Loaded'
                          ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      }`}
                    >
                      {v.customsTitleRejected ? 'CUSTOMS HOLD' : v.status}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mt-1">
                    <span>{v.warehouseReceiptNo || 'Pending WR'}</span>
                    <span>{v.warehouseLocation}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: Vehicle Detail Workspace */}
        {selectedVehicle && (
          <div className="flex-1 flex flex-col overflow-y-auto p-6 space-y-5">
            {/* Header Summary Card */}
            <div className={`rounded-2xl p-6 border shadow-2xl relative overflow-hidden backdrop-blur-2xl ${
              darkMode ? 'bg-[#0f172a]/90 border-white/10 text-white' : 'bg-white/95 border-slate-200 text-slate-900'
            }`}>
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500" />

              <div className="flex flex-wrap justify-between items-start gap-4 pb-5 border-b border-white/10">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-black font-mono tracking-tight">
                      {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {selectedVehicle.bodyType}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono uppercase border ${
                        selectedVehicle.status === 'Hold' || selectedVehicle.customsTitleRejected
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}
                    >
                      {selectedVehicle.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5 font-mono">
                    VIN: <span className="text-blue-400 font-bold">{selectedVehicle.vin}</span> &bull; WR #: <strong className={darkMode ? 'text-white' : 'text-slate-900'}>{selectedVehicle.warehouseReceiptNo || 'NOT ISSUED'}</strong>
                  </p>
                </div>

                {/* Lifecycle Actions */}
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  {selectedVehicle.status === 'Expected' && (
                    <button
                      onClick={() => inspectVehicle(selectedVehicle.id)}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-md shadow-emerald-900/30 flex items-center gap-1.5 transition-all active:scale-[0.98]"
                    >
                      <span className="material-symbols-outlined text-[16px]">verified</span>
                      Inspect & Issue WR#
                    </button>
                  )}

                  {selectedVehicle.status === 'Received' && (
                    <button
                      onClick={() => forceReadyToShip(selectedVehicle.id)}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold shadow-md shadow-blue-900/30 flex items-center gap-1.5 transition-all active:scale-[0.98]"
                    >
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      Force "Ready to Ship"
                    </button>
                  )}

                  <button
                    onClick={() => toggleCustomsHold(selectedVehicle.id, !selectedVehicle.customsTitleRejected)}
                    className={`px-3.5 py-2 rounded-xl font-bold text-xs shadow-md flex items-center gap-1.5 transition-all active:scale-[0.98] ${
                      selectedVehicle.customsTitleRejected
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-rose-600 hover:bg-rose-500 text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">gavel</span>
                    {selectedVehicle.customsTitleRejected ? 'Clear Customs Hold' : 'Trigger Customs Rejection'}
                  </button>

                  <button
                    onClick={() => {
                      if (!requireIntegration('label-printer', 'Label / Waybill Printer')) return
                      openPrintModal({
                        type: 'BARCODE_LABELS',
                        title: `Vehicle Inventory Staging Barcode — VIN ${selectedVehicle.vin}`,
                        data: selectedVehicle
                      })
                    }}
                    className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all active:scale-[0.98] ${
                      darkMode ? 'border-white/10 text-slate-200 hover:bg-white/5' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">qr_code_2</span>
                    Print Staging Label
                  </button>
                </div>
              </div>

              {/* Status Warning Alerts */}
              {selectedVehicle.customsTitleRejected && (
                <div className="mt-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2.5 font-bold">
                  <span className="material-symbols-outlined text-rose-400 text-xl">error</span>
                  <span>
                    CUSTOMS TITLE REJECTION ACTIVE: Vehicle title flagged by US CBP. Cascading hold blocks export container {selectedVehicle.assignedContainerNo || 'assignment'}!
                  </span>
                </div>
              )}

              {/* Snapshot Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 text-xs">
                <div className={`p-3 rounded-xl border ${darkMode ? 'bg-slate-900/60 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-slate-400 block text-[10px] font-mono uppercase tracking-wider mb-1">Engine & Trim</span>
                  <span className="font-semibold">{selectedVehicle.trim || 'Standard'} &bull; {selectedVehicle.engine || 'V6/V8'}</span>
                </div>
                <div className={`p-3 rounded-xl border ${darkMode ? 'bg-slate-900/60 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-slate-400 block text-[10px] font-mono uppercase tracking-wider mb-1">Exterior Color</span>
                  <span className="font-semibold">{selectedVehicle.color}</span>
                </div>
                <div className={`p-3 rounded-xl border ${darkMode ? 'bg-slate-900/60 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-slate-400 block text-[10px] font-mono uppercase tracking-wider mb-1">Title Clearance</span>
                  <span className={`font-mono font-bold ${selectedVehicle.titleStatus === 'Received' ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {selectedVehicle.titleStatus} ({selectedVehicle.titleState || 'CA'})
                  </span>
                </div>
                <div className={`p-3 rounded-xl border ${darkMode ? 'bg-slate-900/60 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-slate-400 block text-[10px] font-mono uppercase tracking-wider mb-1">Assigned Container</span>
                  <span className="font-mono font-bold text-blue-400">
                    {selectedVehicle.assignedContainerNo || 'Unassigned (Staged)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className={`flex p-1.5 gap-1.5 rounded-2xl border backdrop-blur-xl ${
              darkMode ? 'bg-[#0f172a]/80 border-white/10' : 'bg-white/80 border-slate-200'
            }`}>
              {[
                { id: 'specs', label: 'NHTSA Specs & Inspection', icon: 'fact_check' },
                { id: 'docs', label: 'Title & Lien Documents', icon: 'description' },
                { id: 'location', label: 'Warehouse Location & Dims', icon: 'warehouse' },
                { id: 'history', label: `Audit History (${selectedVehicle.history?.length || 0})`, icon: 'history' }
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

            {/* Tab 1: Specs & Inspection */}
            {activeTab === 'specs' && (
              <div className={`rounded-2xl p-6 border shadow-2xl backdrop-blur-2xl space-y-4 text-xs ${
                darkMode ? 'bg-[#0f172a]/90 border-white/10 text-white' : 'bg-white/95 border-slate-200 text-slate-900'
              }`}>
                <h4 className="font-bold text-sm tracking-tight flex items-center gap-2 border-b border-white/10 pb-2">
                  <span className="material-symbols-outlined text-blue-400 text-[18px]">verified</span>
                  Vehicle Condition & Physical Inspection Details
                </h4>

                <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl border ${
                  darkMode ? 'bg-slate-900/60 border-white/5' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-mono uppercase tracking-wider mb-1">Inspection #</span>
                    <strong className="font-mono">{selectedVehicle.inspectionNo || 'INSP-PENDING'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-mono uppercase tracking-wider mb-1">Inspection Date</span>
                    <strong className="font-mono">{selectedVehicle.inspectionDate || 'Not Inspected'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-mono uppercase tracking-wider mb-1">Inspector Name</span>
                    <strong>{selectedVehicle.inspector || 'Danilo Cruz (ASE)'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-mono uppercase tracking-wider mb-1">Physical Condition</span>
                    <strong className="text-emerald-400">{selectedVehicle.condition || 'Grade 4.8 / Clean'}</strong>
                  </div>
                </div>

                <div className={`p-4 rounded-xl border space-y-1.5 ${
                  darkMode ? 'bg-slate-900/60 border-white/5' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className="text-slate-400 block text-[10px] font-mono uppercase tracking-wider">Key Inventory Details</span>
                  <p className="font-semibold">{selectedVehicle.keys || '2 Key FOBs accounted for in lockbox.'}</p>
                </div>
              </div>
            )}

            {/* Tab 2: Title & Lien Documents */}
            {activeTab === 'docs' && (
              <div className={`rounded-2xl p-6 border shadow-2xl backdrop-blur-2xl space-y-4 text-xs ${
                darkMode ? 'bg-[#0f172a]/90 border-white/10 text-white' : 'bg-white/95 border-slate-200 text-slate-900'
              }`}>
                <h4 className="font-bold text-sm tracking-tight flex items-center gap-2 border-b border-white/10 pb-2">
                  <span className="material-symbols-outlined text-indigo-400 text-[18px]">policy</span>
                  DMV Title & Bank Lien Verification
                </h4>

                <div className={`grid grid-cols-3 gap-4 p-4 rounded-xl border ${
                  darkMode ? 'bg-slate-900/60 border-white/5' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-mono uppercase tracking-wider mb-1">Certificate of Title #</span>
                    <strong className="font-mono text-blue-400">{selectedVehicle.titleNo || 'CA-TITLE-99410291'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-mono uppercase tracking-wider mb-1">State Jurisdiction</span>
                    <strong>{selectedVehicle.titleState || 'California (CA)'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-mono uppercase tracking-wider mb-1">Date Received</span>
                    <strong className="font-mono">{selectedVehicle.titleReceivedDate || '2026-09-04'}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-4 rounded-xl border ${
                    darkMode ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'
                  }`}>
                    <span className="font-mono text-[10px] uppercase tracking-wider font-bold text-emerald-400 block mb-1">Bank Lien Release</span>
                    <span className="text-xs">
                      {selectedVehicle.lienReleaseCleared ? '✓ Cleared - No outstanding security interests' : '⚠ Outstanding Lien - Awaiting Payoff'}
                    </span>
                  </div>
                  <div className={`p-4 rounded-xl border ${
                    darkMode ? 'bg-blue-500/5 border-blue-500/20' : 'bg-blue-50 border-blue-200'
                  }`}>
                    <span className="font-mono text-[10px] uppercase tracking-wider font-bold text-blue-400 block mb-1">Customs Clearance Status</span>
                    <span className="text-xs">
                      {selectedVehicle.customsTitleRejected ? '❌ REJECTED - Customs Hold' : '✓ Cleared for Export Manifest'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Location & Dimensions */}
            {activeTab === 'location' && (
              <div className={`rounded-2xl p-6 border shadow-2xl backdrop-blur-2xl space-y-4 text-xs ${
                darkMode ? 'bg-[#0f172a]/90 border-white/10 text-white' : 'bg-white/95 border-slate-200 text-slate-900'
              }`}>
                <h4 className="font-bold text-sm tracking-tight flex items-center gap-2 border-b border-white/10 pb-2">
                  <span className="material-symbols-outlined text-blue-400 text-[18px]">square_foot</span>
                  Yard Location, Staging & Cube Metrics
                </h4>

                <div className={`grid grid-cols-4 gap-4 p-4 rounded-xl border ${
                  darkMode ? 'bg-slate-900/60 border-white/5' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-mono uppercase tracking-wider mb-1">Length (Inches)</span>
                    <strong className="font-mono text-sm">{selectedVehicle.lengthInches || 182.3} in</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-mono uppercase tracking-wider mb-1">Width (Inches)</span>
                    <strong className="font-mono text-sm">{selectedVehicle.widthInches || 76.1} in</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-mono uppercase tracking-wider mb-1">Height (Inches)</span>
                    <strong className="font-mono text-sm">{selectedVehicle.heightInches || 48.6} in</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-mono uppercase tracking-wider mb-1">Cubic Feet</span>
                    <strong className="font-mono text-sm text-blue-400">{selectedVehicle.cubicFeet || 390.5} CFT</strong>
                  </div>
                </div>

                <div className={`p-4 rounded-xl border flex justify-between items-center ${
                  darkMode ? 'bg-slate-900/60 border-white/5' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-mono uppercase tracking-wider mb-1">Assigned Staging Yard</span>
                    <strong className="text-sm">{selectedVehicle.warehouseLocation} &bull; {selectedVehicle.whseBin || 'BIN-A04'}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px] font-mono uppercase tracking-wider mb-1">Unit Weight</span>
                    <strong className="text-sm font-mono text-emerald-400">{selectedVehicle.unitWeightLbs?.toLocaleString() || '3,366'} LBS</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: History Audit Trail */}
            {activeTab === 'history' && (
              <div className={`rounded-2xl p-6 border shadow-2xl backdrop-blur-2xl space-y-4 text-xs ${
                darkMode ? 'bg-[#0f172a]/90 border-white/10 text-white' : 'bg-white/95 border-slate-200 text-slate-900'
              }`}>
                <h4 className="font-bold text-sm tracking-tight flex items-center gap-2 border-b border-white/10 pb-2">
                  <span className="material-symbols-outlined text-amber-400 text-[18px]">history</span>
                  Chronological Status History Audit Trail
                </h4>

                <div className={`overflow-x-auto border rounded-2xl ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
                  <table className="w-full text-left text-xs">
                    <thead className={`border-b text-[10px] font-mono uppercase tracking-wider ${
                      darkMode ? 'bg-slate-900/80 border-white/10 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}>
                      <tr>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Time</th>
                        <th className="py-3 px-4">User</th>
                        <th className="py-3 px-4">Comments</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y font-mono text-[11px] ${darkMode ? 'divide-white/5' : 'divide-slate-200'}`}>
                      {selectedVehicle.history?.map((h, i) => (
                        <tr key={i} className={`transition-colors ${darkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                          <td className="py-3 px-4 font-bold text-blue-400">{h.status}</td>
                          <td className="py-3 px-4 text-slate-400">{h.date}</td>
                          <td className="py-3 px-4 text-slate-400">{h.time}</td>
                          <td className="py-3 px-4 font-bold text-slate-200">{h.user}</td>
                          <td className="py-3 px-4 font-sans text-slate-300">{h.comments}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
