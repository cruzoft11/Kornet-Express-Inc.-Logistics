import { useState } from 'react'
import { useLogisticsStore } from '../../stores/logisticsStore'

export default function ContainerStuffingModal() {
  const {
    modalOpen,
    setModalOpen,
    loadingGuides,
    vehicles,
    assignVehicleToContainer,
    openPrintModal,
    addAuditLog
  } = useLogisticsStore()

  const guide = loadingGuides[0]
  const container = guide?.containers[0]

  const [equipmentType, setEquipmentType] = useState(container?.equipmentType || '40ft High Cube (40HC)')
  const [containerNo, setContainerNo] = useState(container?.containerNo || 'MSKU-992144-8')
  const [sealNo, setSealNo] = useState(container?.sealNo || 'SL-884102')
  const [orderNo, setOrderNo] = useState(container?.orderNo || 'ORD-88190')
  const [loadStatus, setLoadStatus] = useState(container?.status || 'Loading')
  const [comments, setComments] = useState('Inspect vehicle tie-downs and battery disconnects prior to ocean transit.')
  
  // Selected WRs from warehouse
  const [selectedWRs, setSelectedWRs] = useState<string[]>(container?.warehouseReceipts || [])
  const [showWRLookup, setShowWRLookup] = useState(false)

  // Hazmat state
  const [unNo, setUnNo] = useState('UN3166')
  const [hazmatDesc, setHazmatDesc] = useState('Vehicle, flammable gas powered or liquid powered')
  const [contact, setContact] = useState('Chemtrec Emergency Dispatch')
  const [phone, setPhone] = useState('+1-800-424-9300')

  // Temperature state
  const [temp, setTemp] = useState('72')
  const [tempUnit, setTempUnit] = useState<'F' | 'C'>('F')
  const [ventSetting, setVentSetting] = useState('20% Open')

  if (!modalOpen.containerStuffing) return null

  const availableVehicles = vehicles.filter((v) => v.warehouseReceiptNo)

  const linkedVehicleDetails = vehicles.filter((v) => v.warehouseReceiptNo && selectedWRs.includes(v.warehouseReceiptNo))
  const totalLoadedWeight = linkedVehicleDetails.reduce((acc, v) => acc + (v.unitWeightLbs || 3500), 0)
  const maxWeightLbs = 58000
  const weightPercent = Math.min(100, Math.round((totalLoadedWeight / maxWeightLbs) * 100))

  const handleLinkWR = (wrNo: string, vehicleId: string) => {
    if (selectedWRs.includes(wrNo)) {
      setSelectedWRs(selectedWRs.filter((w) => w !== wrNo))
    } else {
      setSelectedWRs([...selectedWRs, wrNo])
      assignVehicleToContainer(vehicleId, containerNo)
    }
  }

  const handleSave = () => {
    addAuditLog({
      user: 'LOAD_MASTER',
      module: 'Loading Guide',
      action: 'Update Container Stuffing',
      referenceNo: containerNo,
      details: `Updated container ${containerNo} (Seal: ${sealNo}) with ${selectedWRs.length} Warehouse Receipts.`
    })
    setModalOpen('containerStuffing', false)
  }

  const handleSendSED = () => {
    window.alert(`AESDirect ITN generated successfully: X20260908${Math.floor(100000 + Math.random() * 900000)}. SED filed with US Census Bureau & CBP!`)
    addAuditLog({
      user: 'OFFICE',
      module: 'Ocean Export',
      action: 'Send SED to AESDirect',
      referenceNo: containerNo,
      details: `Electronic Export Information (EEI/SED) approved by AESDirect for container ${containerNo}`
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl shadow-2xl w-full max-w-5xl border border-slate-300 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Ribbon Header bar matching Cont. Window #5 */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-3 border-b border-blue-950 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-400 text-xl">view_in_ar</span>
            <div>
              <h2 className="font-bold text-sm tracking-wide">Loading Guide Container Details & Stuffing Guide</h2>
              <p className="text-[11px] text-blue-200">Guide #{guide?.guideNo} • Booking #{guide?.bookingNo}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={handleSave}
              className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">save</span>
              Save & Close
            </button>
            <button
              onClick={handleSendSED}
              className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">send</span>
              Send SED to AESDirect...
            </button>
            <button
              onClick={() => openPrintModal({ type: 'BOL', title: 'Container Stuffing Manifest', data: { ...guide, containerNo, sealNo } })}
              className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold flex items-center gap-1 shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              Print Guide
            </button>
            <button
              onClick={() => setModalOpen('containerStuffing', false)}
              className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Top Form Fields */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">Equipment Type</label>
              <select
                value={equipmentType}
                onChange={(e) => setEquipmentType(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-semibold"
              >
                <option value="40ft High Cube (40HC)">40ft High Cube (40HC)</option>
                <option value="20ft Standard Dry (20GP)">20ft Standard Dry (20GP)</option>
                <option value="40ft Standard Dry (40GP)">40ft Standard Dry (40GP)</option>
                <option value="40ft Refrigerated (Reefer)">40ft Refrigerated (Reefer)</option>
                <option value="45ft High Cube Dry">45ft High Cube Dry</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">Equipment / Container #</label>
              <input
                type="text"
                value={containerNo}
                onChange={(e) => setContainerNo(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-mono font-bold text-blue-600 dark:text-blue-400"
              />
            </div>

            <div>
              <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">Seal #</label>
              <input
                type="text"
                value={sealNo}
                onChange={(e) => setSealNo(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-mono font-bold"
              />
            </div>

            <div>
              <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">Work / Order #</label>
              <input
                type="text"
                value={orderNo}
                onChange={(e) => setOrderNo(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-mono font-bold"
              />
            </div>

            <div>
              <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">Container Load Status</label>
              <select
                value={loadStatus}
                onChange={(e) => setLoadStatus(e.target.value as any)}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-bold text-emerald-600"
              >
                <option value="Empty">Empty</option>
                <option value="Loading">Loading in Progress</option>
                <option value="Loaded">Loaded & Verified</option>
                <option value="Sealed">Sealed & Gate Ready</option>
              </select>
            </div>

            <div className="md:col-span-4">
              <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">Comments / Stuffing Instructions</label>
              <textarea
                rows={2}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs"
              />
            </div>
          </div>

          {/* Warehouse Receipts Linking Section */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600 text-lg">inventory_2</span>
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Linked Warehouse Receipts & Staged Cargo ({selectedWRs.length})
                </h3>
              </div>
              <button
                onClick={() => setShowWRLookup(!showWRLookup)}
                className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 font-bold text-xs flex items-center gap-1.5 border border-blue-200 dark:border-blue-800"
              >
                <span className="material-symbols-outlined text-[16px]">search</span>
                {showWRLookup ? 'Close WR Browser' : 'Load Warehouse Receipts...'}
              </button>
            </div>

            {/* WR Lookup Modal Dropdown */}
            {showWRLookup && (
              <div className="mb-4 p-4 rounded-lg bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                <p className="text-xs font-bold text-blue-900 dark:text-blue-300 mb-2">
                  Select available Warehouse Receipts to load into container {containerNo}:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {availableVehicles.map((v) => {
                    const isLinked = selectedWRs.includes(v.warehouseReceiptNo || '')
                    return (
                      <div
                        key={v.id}
                        onClick={() => handleLinkWR(v.warehouseReceiptNo || '', v.id)}
                        className={`p-2.5 rounded-lg border cursor-pointer text-xs flex items-center justify-between transition-colors ${
                          isLinked
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 hover:border-blue-400'
                        }`}
                      >
                        <div>
                          <span className="font-bold block">{v.warehouseReceiptNo} • {v.year} {v.make} {v.model}</span>
                          <span className="text-[10px] opacity-80">VIN: {v.vin} • {v.warehouseLocation}</span>
                        </div>
                        <span className="material-symbols-outlined text-[18px]">
                          {isLinked ? 'check_circle' : 'add_circle'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Linked Receipts Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase text-[10px] font-bold">
                    <th className="py-2 px-2.5">WR #</th>
                    <th className="py-2 px-2.5">Date</th>
                    <th className="py-2 px-2.5">Cargo Description / VIN</th>
                    <th className="py-2 px-2.5">Shipper</th>
                    <th className="py-2 px-2.5">Weight (Lbs)</th>
                    <th className="py-2 px-2.5">Stowage Position</th>
                    <th className="py-2 px-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-mono text-[11px]">
                  {linkedVehicleDetails.map((v, i) => (
                    <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="py-2 px-2.5 font-bold text-blue-600 dark:text-blue-400">{v.warehouseReceiptNo}</td>
                      <td className="py-2 px-2.5 text-slate-500">{v.receivedDate}</td>
                      <td className="py-2 px-2.5 font-sans">
                        <span className="font-bold text-slate-900 dark:text-white block">{v.year} {v.make} {v.model}</span>
                        <span className="text-[10px] text-slate-400 font-mono">VIN: {v.vin}</span>
                      </td>
                      <td className="py-2 px-2.5 font-sans text-slate-600 dark:text-slate-300">{v.shipper}</td>
                      <td className="py-2 px-2.5 font-bold">{(v.unitWeightLbs || 3500).toLocaleString()}</td>
                      <td className="py-2 px-2.5 font-sans">Floor Bay 0{i + 1} (Chocked & Strapped)</td>
                      <td className="py-2 px-2.5">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {v.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {linkedVehicleDetails.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400 font-sans">
                        No Warehouse Receipts linked. Click "Load Warehouse Receipts..." to select staged cargo.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Capacity Progress Bar */}
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                <span className="text-slate-600 dark:text-slate-300">
                  Weight Utilization: {totalLoadedWeight.toLocaleString()} / {maxWeightLbs.toLocaleString()} Lbs ({weightPercent}%)
                </span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  {maxWeightLbs - totalLoadedWeight > 0 ? `${(maxWeightLbs - totalLoadedWeight).toLocaleString()} Lbs Payload Remaining` : 'Capacity Reached'}
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    weightPercent > 90 ? 'bg-red-500' : weightPercent > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${weightPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Hazardous Materials & Temperature Control Dual Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Hazardous Materials */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm text-xs">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-amber-500">warning</span>
                <h4 className="font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Hazardous Materials (IMDG Code)
                </h4>
              </div>
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold text-slate-500 block mb-1">UN Number</label>
                    <input
                      type="text"
                      value={unNo}
                      onChange={(e) => setUnNo(e.target.value)}
                      className="w-full px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-500 block mb-1">Emergency Contact</label>
                    <input
                      type="text"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      className="w-full px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-semibold text-slate-500 block mb-1">Hazmat Description</label>
                  <input
                    type="text"
                    value={hazmatDesc}
                    onChange={(e) => setHazmatDesc(e.target.value)}
                    className="w-full px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-500 block mb-1">Emergency Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Temperature & Reefer Control */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm text-xs">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-blue-500">thermostat</span>
                <h4 className="font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Temperature & Ventilation Control
                </h4>
              </div>
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold text-slate-500 block mb-1">Set Temperature</label>
                    <div className="flex">
                      <input
                        type="number"
                        value={temp}
                        onChange={(e) => setTemp(e.target.value)}
                        className="w-full px-2.5 py-1 rounded-l border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-bold"
                      />
                      <button
                        onClick={() => setTempUnit(tempUnit === 'F' ? 'C' : 'F')}
                        className="px-3 bg-slate-200 dark:bg-slate-700 border border-l-0 border-slate-300 dark:border-slate-600 rounded-r font-bold"
                      >
                        °{tempUnit}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-500 block mb-1">Vent Setting</label>
                    <select
                      value={ventSetting}
                      onChange={(e) => setVentSetting(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"
                    >
                      <option value="Closed">Closed (0 CMH)</option>
                      <option value="20% Open">20% Open (15 CMH)</option>
                      <option value="50% Open">50% Open</option>
                      <option value="100% Fully Open">100% Fully Open</option>
                    </select>
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-[11px]">
                  ✓ Reefer compressor setpoint maintained between 60°{tempUnit} and 85°{tempUnit}. Continuous telemetry enabled.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-200 dark:bg-slate-800 border-t border-slate-300 dark:border-slate-700 flex justify-end gap-2">
          <button
            onClick={() => setModalOpen('containerStuffing', false)}
            className="px-4 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-300 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">check</span>
            OK & Save Stuffing Guide
          </button>
        </div>
      </div>
    </div>
  )
}
