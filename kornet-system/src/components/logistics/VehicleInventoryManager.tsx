import { useState } from 'react'
import { useLogisticsStore, Vehicle } from '../../stores/logisticsStore'
import { useRequireIntegration } from '../../hooks/useRequireIntegration'

export default function VehicleInventoryManager() {
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
    <div className="stitch-module-surface flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans">
      {/* Top Action Bar: VIN Decoding & Staging */}
      <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 flex-1 max-w-xl">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-2 text-slate-400 text-[18px]">
              qr_code_scanner
            </span>
            <input
              type="text"
              placeholder="Enter 17-digit VIN (e.g. 1G1YY22U965108291, WAUZZZF27NA019284)..."
              value={vinInput}
              onChange={(e) => setVinInput(e.target.value.toUpperCase())}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleDecode}
            disabled={isDecoding}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">
              {isDecoding ? 'sync' : 'barcode_reader'}
            </span>
            {isDecoding ? 'Decoding...' : '1-Click VIN Decode'}
          </button>
        </div>

        {decodedData && (
          <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-950/40 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-900 animate-fadeIn">
            <span className="text-xs text-blue-900 dark:text-blue-200 font-bold">
              Decoded: {decodedData.year} {decodedData.make} {decodedData.model} ({decodedData.bodyType})
            </span>
            <button
              onClick={handleCreateVehicle}
              className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm"
            >
              + Ingest into Inventory
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-bold">Filter:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-xs"
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
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Vehicles Master List */}
        <div className="w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col overflow-y-auto">
          <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-[11px] font-bold text-slate-500 uppercase tracking-wider flex justify-between">
            <span>Vehicle Inventory Records</span>
            <span className="font-mono text-blue-600">{filteredVehicles.length}</span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredVehicles.map((v) => {
              const isSelected = v.id === selectedVehicle?.id
              return (
                <div
                  key={v.id}
                  onClick={() => setSelectedVehicleId(v.id)}
                  className={`p-3.5 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-50/80 dark:bg-blue-950/40 border-l-4 border-blue-600'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <span className="font-bold text-xs text-slate-900 dark:text-white block">
                        {v.year} {v.make} {v.model}
                      </span>
                      <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400">
                        {v.vin}
                      </span>
                    </div>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                        v.status === 'Hold' || v.customsTitleRejected
                          ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 animate-pulse'
                          : v.status === 'Ready to Ship'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : v.status === 'Pre-Loaded' || v.status === 'Loaded'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      }`}
                    >
                      {v.customsTitleRejected ? 'CUSTOMS HOLD' : v.status}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
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
          <div className="flex-1 flex flex-col overflow-y-auto p-6 space-y-6">
            {/* Header Summary Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="flex flex-wrap justify-between items-start gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">
                      {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                      {selectedVehicle.bodyType}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase ${
                        selectedVehicle.status === 'Hold' || selectedVehicle.customsTitleRejected
                          ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}
                    >
                      {selectedVehicle.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-mono font-bold">
                    VIN: <span className="text-blue-600 dark:text-blue-400">{selectedVehicle.vin}</span> &bull; WR #: <strong>{selectedVehicle.warehouseReceiptNo || 'NOT ISSUED'}</strong>
                  </p>
                </div>

                {/* Lifecycle Actions */}
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  {selectedVehicle.status === 'Expected' && (
                    <button
                      onClick={() => inspectVehicle(selectedVehicle.id)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">verified</span>
                      Inspect & Issue WR#
                    </button>
                  )}

                  {selectedVehicle.status === 'Received' && (
                    <button
                      onClick={() => forceReadyToShip(selectedVehicle.id)}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      Force "Ready to Ship"
                    </button>
                  )}

                  <button
                    onClick={() => toggleCustomsHold(selectedVehicle.id, !selectedVehicle.customsTitleRejected)}
                    className={`px-3 py-1.5 rounded-lg font-bold shadow-sm flex items-center gap-1 ${
                      selectedVehicle.customsTitleRejected
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-red-600 text-white hover:bg-red-700'
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
                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">qr_code_2</span>
                    Print Staging Label
                  </button>
                </div>
              </div>

              {/* Status Warning Alerts */}
              {selectedVehicle.customsTitleRejected && (
                <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 text-xs flex items-center gap-2 font-bold">
                  <span className="material-symbols-outlined text-lg">error</span>
                  <span>
                    CUSTOMS TITLE REJECTION ACTIVE: Vehicle title flagged by US CBP. Cascading hold blocks export container {selectedVehicle.assignedContainerNo || 'assignment'}!
                  </span>
                </div>
              )}

              {/* Snapshot Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Engine & Trim</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedVehicle.trim || 'Standard'} &bull; {selectedVehicle.engine || 'V6/V8'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Exterior Color</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedVehicle.color}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Title Clearance</span>
                  <span className={`font-bold ${selectedVehicle.titleStatus === 'Received' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {selectedVehicle.titleStatus} ({selectedVehicle.titleState || 'CA'})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Assigned Container</span>
                  <span className="font-mono font-bold text-blue-600">
                    {selectedVehicle.assignedContainerNo || 'Unassigned (Staged)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="border-b border-slate-200 dark:border-slate-800 flex gap-4 text-xs">
              <button
                onClick={() => setActiveTab('specs')}
                className={`pb-2.5 font-bold border-b-2 flex items-center gap-1.5 ${
                  activeTab === 'specs'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">fact_check</span>
                NHTSA Specifications & Inspection
              </button>
              <button
                onClick={() => setActiveTab('docs')}
                className={`pb-2.5 font-bold border-b-2 flex items-center gap-1.5 ${
                  activeTab === 'docs'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">description</span>
                Title & Lien Documents
              </button>
              <button
                onClick={() => setActiveTab('location')}
                className={`pb-2.5 font-bold border-b-2 flex items-center gap-1.5 ${
                  activeTab === 'location'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">warehouse</span>
                Warehouse Location & Dims
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`pb-2.5 font-bold border-b-2 flex items-center gap-1.5 ${
                  activeTab === 'history'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">history</span>
                Vehicle Audit History ({selectedVehicle.history?.length || 0})
              </button>
            </div>

            {/* Tab 1: Specs & Inspection */}
            {activeTab === 'specs' && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 text-xs">
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                  Vehicle Condition & Physical Inspection Details
                </h4>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Inspection #</span>
                    <strong className="text-slate-900 dark:text-white font-mono">{selectedVehicle.inspectionNo || 'INSP-PENDING'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Inspection Date</span>
                    <strong className="text-slate-900 dark:text-white">{selectedVehicle.inspectionDate || 'Not Inspected'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Inspector Name</span>
                    <strong className="text-slate-900 dark:text-white">{selectedVehicle.inspector || 'Danilo Cruz (ASE)'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Physical Condition</span>
                    <strong className="text-emerald-600">{selectedVehicle.condition || 'Grade 4.8 / Clean'}</strong>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-2">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Key Inventory Details</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{selectedVehicle.keys || '2 Key FOBs accounted for.'}</p>
                </div>
              </div>
            )}

            {/* Tab 2: Title & Lien Documents */}
            {activeTab === 'docs' && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 text-xs">
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                  DMV Title & Bank Lien Verification
                </h4>

                <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Certificate of Title #</span>
                    <strong className="font-mono text-slate-900 dark:text-white">{selectedVehicle.titleNo || 'CA-TITLE-99410291'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">State / Jurisdiction</span>
                    <strong className="text-slate-900 dark:text-white">{selectedVehicle.titleState || 'California (CA)'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Date Received</span>
                    <strong className="text-slate-900 dark:text-white">{selectedVehicle.titleReceivedDate || '2026-09-04'}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20">
                    <span className="font-bold text-emerald-800 dark:text-emerald-300 block">Bank Lien Release:</span>
                    <span className="text-[11px] text-slate-600 dark:text-slate-400">
                      {selectedVehicle.lienReleaseCleared ? '✓ Cleared - No outstanding security interests' : '⚠ Outstanding Lien - Awaiting Payoff'}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20">
                    <span className="font-bold text-blue-800 dark:text-blue-300 block">Customs Clearance Status:</span>
                    <span className="text-[11px] text-slate-600 dark:text-slate-400">
                      {selectedVehicle.customsTitleRejected ? '❌ REJECTED - Customs Hold' : '✓ Cleared for Export Manifest'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Location & Dimensions */}
            {activeTab === 'location' && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 text-xs">
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                  Yard Location, Staging & Cube Metrics
                </h4>

                <div className="grid grid-cols-4 gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Length (Inches)</span>
                    <strong className="text-slate-900 dark:text-white">{selectedVehicle.lengthInches || 182.3} in</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Width (Inches)</span>
                    <strong className="text-slate-900 dark:text-white">{selectedVehicle.widthInches || 76.1} in</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Height (Inches)</span>
                    <strong className="text-slate-900 dark:text-white">{selectedVehicle.heightInches || 48.6} in</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Cubic Feet</span>
                    <strong className="text-blue-600">{selectedVehicle.cubicFeet || 390.5} CFT</strong>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex justify-between items-center">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Assigned Staging Yard</span>
                    <strong className="text-sm text-slate-900 dark:text-white">{selectedVehicle.warehouseLocation} &bull; {selectedVehicle.whseBin || 'BIN-A04'}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Unit Weight</span>
                    <strong className="text-sm text-slate-900 dark:text-white">{selectedVehicle.unitWeightLbs?.toLocaleString() || '3,366'} LBS</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: History Audit Trail */}
            {activeTab === 'history' && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3 text-xs">
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                  Chronological Status History Trail
                </h4>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                        <th className="py-2">Status</th>
                        <th className="py-2">Date</th>
                        <th className="py-2">Time</th>
                        <th className="py-2">User</th>
                        <th className="py-2">Comments</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                      {selectedVehicle.history?.map((h, i) => (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 font-bold text-blue-600">{h.status}</td>
                          <td className="py-2.5 text-slate-500">{h.date}</td>
                          <td className="py-2.5 text-slate-500">{h.time}</td>
                          <td className="py-2.5 font-bold text-slate-800 dark:text-slate-200">{h.user}</td>
                          <td className="py-2.5 font-sans text-slate-600 dark:text-slate-400">{h.comments}</td>
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
