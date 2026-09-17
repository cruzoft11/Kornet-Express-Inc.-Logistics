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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="liquid-glass-card border border-white/15 text-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh] backdrop-blur-2xl relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Ribbon Header bar */}
        <div className="bg-white/5 p-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-cyan-400">
              <span className="material-symbols-outlined text-lg">view_in_ar</span>
            </div>
            <div>
              <h2 className="font-bold text-sm tracking-wide text-white">Loading Guide Container Details &amp; Stuffing Guide</h2>
              <p className="text-[11px] text-slate-400">Guide #{guide?.guideNo} &bull; Booking #{guide?.bookingNo}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleSave}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-lg shadow-emerald-600/20 border border-emerald-400/30 transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">save</span>
              Save &amp; Close
            </button>
            <button
              onClick={handleSendSED}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-white text-xs font-bold flex items-center gap-1 shadow-lg shadow-blue-600/20 border border-blue-400/30 transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">send</span>
              Send SED to AESDirect...
            </button>
            <button
              onClick={() => openPrintModal({ type: 'BOL', title: 'Container Stuffing Manifest', data: { ...guide, containerNo, sealNo } })}
              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center gap-1 border border-white/15 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              Print Guide
            </button>
            <button
              onClick={() => setModalOpen('containerStuffing', false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
          {/* Top Form Fields */}
          <div className="bg-black/20 p-5 rounded-2xl border border-white/10 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-300 block mb-1">Equipment Type</label>
              <select
                value={equipmentType}
                onChange={(e) => setEquipmentType(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-white/15 bg-black/40 text-white font-semibold outline-none focus:border-cyan-400"
              >
                <option value="40ft High Cube (40HC)" className="bg-slate-900 text-white">40ft High Cube (40HC)</option>
                <option value="20ft Standard Dry (20GP)" className="bg-slate-900 text-white">20ft Standard Dry (20GP)</option>
                <option value="40ft Standard Dry (40GP)" className="bg-slate-900 text-white">40ft Standard Dry (40GP)</option>
                <option value="40ft Refrigerated (Reefer)" className="bg-slate-900 text-white">40ft Refrigerated (Reefer)</option>
                <option value="45ft High Cube Dry" className="bg-slate-900 text-white">45ft High Cube Dry</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">Equipment / Container #</label>
              <input
                type="text"
                value={containerNo}
                onChange={(e) => setContainerNo(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-white/15 bg-black/40 font-mono font-bold text-cyan-400 outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">Seal #</label>
              <input
                type="text"
                value={sealNo}
                onChange={(e) => setSealNo(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-white/15 bg-black/40 text-white font-mono font-bold outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">Work / Order #</label>
              <input
                type="text"
                value={orderNo}
                onChange={(e) => setOrderNo(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-white/15 bg-black/40 text-white font-mono font-bold outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">Container Load Status</label>
              <select
                value={loadStatus}
                onChange={(e) => setLoadStatus(e.target.value as any)}
                className="w-full px-3 py-1.5 rounded-xl border border-white/15 bg-black/40 font-bold text-emerald-400 outline-none focus:border-cyan-400"
              >
                <option value="Empty" className="bg-slate-900 text-white">Empty</option>
                <option value="Loading" className="bg-slate-900 text-white">Loading in Progress</option>
                <option value="Loaded" className="bg-slate-900 text-white">Loaded &amp; Verified</option>
                <option value="Sealed" className="bg-slate-900 text-white">Sealed &amp; Gate Ready</option>
              </select>
            </div>

            <div className="md:col-span-4">
              <label className="font-bold text-slate-300 block mb-1">Comments / Stuffing Instructions</label>
              <textarea
                rows={2}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-white/15 bg-black/40 text-white text-xs outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {/* Warehouse Receipts Linking Section */}
          <div className="bg-white/5 p-5 rounded-2xl border border-white/10 backdrop-blur-md">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-cyan-400 text-lg">inventory_2</span>
                <h3 className="font-bold text-xs uppercase tracking-wider text-white">
                  Linked Warehouse Receipts &amp; Staged Cargo ({selectedWRs.length})
                </h3>
              </div>
              <button
                onClick={() => setShowWRLookup(!showWRLookup)}
                className="px-3.5 py-1.5 rounded-xl bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 font-bold text-xs flex items-center gap-1.5 border border-cyan-500/30 transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">search</span>
                {showWRLookup ? 'Close WR Browser' : 'Load Warehouse Receipts...'}
              </button>
            </div>

            {/* WR Lookup Modal Dropdown */}
            {showWRLookup && (
              <div className="mb-4 p-4 rounded-2xl bg-black/40 border border-white/15">
                <p className="text-xs font-bold text-cyan-300 mb-2">
                  Select available Warehouse Receipts to load into container {containerNo}:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto custom-scrollbar">
                  {availableVehicles.map((v) => {
                    const isLinked = selectedWRs.includes(v.warehouseReceiptNo || '')
                    return (
                      <div
                        key={v.id}
                        onClick={() => handleLinkWR(v.warehouseReceiptNo || '', v.id)}
                        className={`p-3 rounded-xl border cursor-pointer text-xs flex items-center justify-between transition-all ${
                          isLinked
                            ? 'bg-blue-600/40 text-white border-cyan-400 shadow-md shadow-blue-500/20'
                            : 'bg-white/5 border-white/10 hover:border-white/20 text-slate-300'
                        }`}
                      >
                        <div>
                          <span className="font-bold block text-white">{v.warehouseReceiptNo} &bull; {v.year} {v.make} {v.model}</span>
                          <span className="text-[10px] text-slate-400 font-mono">VIN: {v.vin} &bull; {v.warehouseLocation}</span>
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
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/20">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 uppercase text-[10px] font-bold bg-white/5">
                    <th className="py-2.5 px-3">WR #</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Cargo Description / VIN</th>
                    <th className="py-2.5 px-3">Shipper</th>
                    <th className="py-2.5 px-3">Weight (Lbs)</th>
                    <th className="py-2.5 px-3">Stowage Position</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                  {linkedVehicleDetails.map((v, i) => (
                    <tr key={v.id} className="hover:bg-white/[0.04] transition-colors">
                      <td className="py-2.5 px-3 font-bold text-cyan-400">{v.warehouseReceiptNo}</td>
                      <td className="py-2.5 px-3 text-slate-400">{v.receivedDate}</td>
                      <td className="py-2.5 px-3 font-sans">
                        <span className="font-bold text-white block">{v.year} {v.make} {v.model}</span>
                        <span className="text-[10px] text-slate-400 font-mono">VIN: {v.vin}</span>
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-300">{v.shipper}</td>
                      <td className="py-2.5 px-3 font-bold text-white">{(v.unitWeightLbs || 3500).toLocaleString()}</td>
                      <td className="py-2.5 px-3 font-sans text-slate-300">Floor Bay 0{i + 1} (Chocked &amp; Strapped)</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
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
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex justify-between items-center text-xs font-bold mb-2">
                <span className="text-slate-300">
                  Weight Utilization: <span className="font-mono text-white">{totalLoadedWeight.toLocaleString()} / {maxWeightLbs.toLocaleString()} Lbs ({weightPercent}%)</span>
                </span>
                <span className="text-emerald-400 font-mono">
                  {maxWeightLbs - totalLoadedWeight > 0 ? `${(maxWeightLbs - totalLoadedWeight).toLocaleString()} Lbs Payload Remaining` : 'Capacity Reached'}
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-black/40 border border-white/10 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    weightPercent > 90 ? 'bg-rose-500' : weightPercent > 70 ? 'bg-amber-500' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${weightPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Hazardous Materials & Temperature Control Dual Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Hazardous Materials */}
            <div className="bg-white/5 p-5 rounded-2xl border border-white/10 text-xs backdrop-blur-md">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-amber-400">warning</span>
                <h4 className="font-bold uppercase tracking-wider text-white">
                  Hazardous Materials (IMDG Code)
                </h4>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold text-slate-400 block mb-1">UN Number</label>
                    <input
                      type="text"
                      value={unNo}
                      onChange={(e) => setUnNo(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-white/15 bg-black/40 font-mono font-bold text-white outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-400 block mb-1">Emergency Contact</label>
                    <input
                      type="text"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-white/15 bg-black/40 text-white outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-semibold text-slate-400 block mb-1">Hazmat Description</label>
                  <input
                    type="text"
                    value={hazmatDesc}
                    onChange={(e) => setHazmatDesc(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-white/15 bg-black/40 text-white text-xs outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-400 block mb-1">Emergency Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-white/15 bg-black/40 text-white font-mono outline-none focus:border-cyan-400"
                  />
                </div>
              </div>
            </div>

            {/* Temperature & Reefer Control */}
            <div className="bg-white/5 p-5 rounded-2xl border border-white/10 text-xs backdrop-blur-md">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-cyan-400">thermostat</span>
                <h4 className="font-bold uppercase tracking-wider text-white">
                  Temperature &amp; Ventilation Control
                </h4>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold text-slate-400 block mb-1">Set Temperature</label>
                    <div className="flex">
                      <input
                        type="number"
                        value={temp}
                        onChange={(e) => setTemp(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-l-xl border border-white/15 bg-black/40 font-bold text-white outline-none focus:border-cyan-400"
                      />
                      <button
                        onClick={() => setTempUnit(tempUnit === 'F' ? 'C' : 'F')}
                        className="px-3 bg-white/10 border border-l-0 border-white/15 rounded-r-xl font-bold text-white hover:bg-white/15"
                      >
                        &deg;{tempUnit}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-400 block mb-1">Vent Setting</label>
                    <select
                      value={ventSetting}
                      onChange={(e) => setVentSetting(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-white/15 bg-black/40 text-white outline-none focus:border-cyan-400"
                    >
                      <option value="Closed" className="bg-slate-900 text-white">Closed (0 CMH)</option>
                      <option value="20% Open" className="bg-slate-900 text-white">20% Open (15 CMH)</option>
                      <option value="50% Open" className="bg-slate-900 text-white">50% Open</option>
                      <option value="100% Fully Open" className="bg-slate-900 text-white">100% Fully Open</option>
                    </select>
                  </div>
                </div>
                <div className="p-3 bg-black/20 rounded-xl border border-white/10 text-slate-400 text-[11px]">
                  &check; Reefer compressor setpoint maintained between 60&deg;{tempUnit} and 85&deg;{tempUnit}. Continuous telemetry enabled.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white/5 border-t border-white/10 flex justify-end gap-2.5">
          <button
            onClick={() => setModalOpen('containerStuffing', false)}
            className="px-4 py-2 rounded-xl border border-white/15 text-slate-300 text-xs font-semibold hover:bg-white/10 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 border border-blue-400/40 flex items-center gap-1.5 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[16px]">check</span>
            OK &amp; Save Stuffing Guide
          </button>
        </div>
      </div>
    </div>
  )
}
