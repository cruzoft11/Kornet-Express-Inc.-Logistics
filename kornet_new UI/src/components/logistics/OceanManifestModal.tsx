import { useState } from 'react'
import { useLogisticsStore } from '../../stores/logisticsStore'

export default function OceanManifestModal() {
  const { modalOpen, setModalOpen, shipments, openPrintModal, addAuditLog } = useLogisticsStore()

  const [selectedFile, setSelectedFile] = useState('')
  const [destination, setDestination] = useState('Port of Manila, Philippines')
  const [weightUnit, setWeightUnit] = useState<'LBS' | 'KGS'>('KGS')
  const [isLoaded, setIsLoaded] = useState(true)

  if (!modalOpen.manifest) return null

  const currentShipment = (selectedFile ? shipments.find((s) => s.fileNo === selectedFile) : null) || shipments[0]

  const handlePrintManifest = () => {
    if (!currentShipment) {
      alert('No shipment available to print manifest.')
      return
    }

    addAuditLog({
      user: 'OFFICE',
      module: 'Ocean Export',
      action: 'Print Ocean Manifest',
      referenceNo: currentShipment.blOrAwbNo || currentShipment.fileNo,
      details: `Generated Ocean Manifest for Vessel ${currentShipment.vesselOrFlight || 'N/A'} (${currentShipment.destination || 'N/A'})`
    })

    openPrintModal({
      type: 'MANIFEST',
      title: `Ocean Shipping Manifest - Vessel ${currentShipment.vesselOrFlight || 'N/A'}`,
      data: currentShipment
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="liquid-glass-card border border-white/15 text-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col backdrop-blur-2xl relative">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header Bar */}
        <div className="px-6 py-4 bg-white/5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-cyan-400">
              <span className="material-symbols-outlined text-lg">format_list_bulleted</span>
            </div>
            <span className="font-bold text-sm tracking-wide text-white">Ocean Shipping Manifest Processing</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePrintManifest}
              disabled={!currentShipment}
              className={`px-4 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 shadow-lg transition-all active:scale-95 ${
                currentShipment
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/30 border border-emerald-400/40 cursor-pointer'
                  : 'bg-white/10 border border-white/10 opacity-50 cursor-not-allowed'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              <span>Save &amp; Print Manifest</span>
            </button>
            <button
              onClick={() => setModalOpen('manifest', false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        {!currentShipment ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-cyan-400 mb-3 shadow-inner">
              <span className="material-symbols-outlined text-3xl">inventory_2</span>
            </div>
            <h4 className="text-base font-bold text-white">No Ocean Shipments Staged</h4>
            <p className="text-xs text-slate-400 max-w-md mt-1 mb-5">
              There are currently no active ocean freight bookings or bills of lading in the operational staging queue. Create an Ocean Booking first to generate shipping manifests.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => {
                  setModalOpen('manifest', false)
                  setModalOpen('newBooking', true)
                }}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-white font-bold text-xs transition-all shadow-lg shadow-blue-600/30 border border-blue-400/40"
              >
                Create Ocean Booking
              </button>
              <button
                onClick={() => setModalOpen('manifest', false)}
                className="px-4 py-2 rounded-xl border border-white/15 text-slate-300 font-bold text-xs hover:bg-white/10 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Manifest Loading Parameters */}
            <div className="p-5 bg-black/20 border-b border-white/10 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="font-bold text-slate-300 block mb-1">File # / Booking</label>
                <select
                  value={selectedFile || currentShipment.fileNo}
                  onChange={(e) => setSelectedFile(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-white/15 bg-black/40 text-white font-mono font-bold outline-none focus:border-cyan-400"
                >
                  {shipments.map((s) => (
                    <option key={s.fileNo} value={s.fileNo} className="bg-slate-900 text-white">
                      {s.fileNo} ({s.blOrAwbNo || 'No BL'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Port of Discharge / Destination</label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-white/15 bg-black/40 text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Weight Unit</label>
                <div className="flex gap-2">
                  <select
                    value={weightUnit}
                    onChange={(e) => setWeightUnit(e.target.value as any)}
                    className="w-full px-3 py-1.5 rounded-xl border border-white/15 bg-black/40 text-white font-bold outline-none focus:border-cyan-400"
                  >
                    <option value="KGS" className="bg-slate-900 text-white">KGS (Metric Kilograms)</option>
                    <option value="LBS" className="bg-slate-900 text-white">LBS (Imperial Pounds)</option>
                  </select>
                  <button
                    onClick={() => setIsLoaded(true)}
                    className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-white font-bold text-xs shadow-md border border-blue-400/40 whitespace-nowrap active:scale-95 transition-all"
                  >
                    Load
                  </button>
                </div>
              </div>
            </div>

            {/* Manifest Entries Grid */}
            <div className="p-4 overflow-x-auto flex-1 custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5 text-slate-400 uppercase text-[10px] font-bold">
                    <th className="py-3 px-3">BL #</th>
                    <th className="py-3 px-3">Destination</th>
                    <th className="py-3 px-3">Shipper</th>
                    <th className="py-3 px-3">Consignee</th>
                    <th className="py-3 px-3">Container #</th>
                    <th className="py-3 px-3">Pieces</th>
                    <th className="py-3 px-3">Act. Weight ({weightUnit})</th>
                    <th className="py-3 px-3">Volume (CBM)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                  {isLoaded && (
                    <tr className="hover:bg-white/[0.04] transition-colors">
                      <td className="py-3 px-3 font-bold text-cyan-400">{currentShipment.blOrAwbNo || 'Pending'}</td>
                      <td className="py-3 px-3 font-sans text-slate-300">{currentShipment.destination || destination}</td>
                      <td className="py-3 px-3 font-sans font-semibold text-white">{currentShipment.shipper || 'N/A'}</td>
                      <td className="py-3 px-3 font-sans text-slate-300">{currentShipment.consignee || 'N/A'}</td>
                      <td className="py-3 px-3 font-mono font-bold text-white">{currentShipment.containerNo || 'MSKU-992144-8'}</td>
                      <td className="py-3 px-3 font-bold text-slate-200">{currentShipment.pieces || 0} PKG</td>
                      <td className="py-3 px-3 font-bold text-cyan-300">
                        {weightUnit === 'KGS'
                          ? (currentShipment.weightKg || 0).toLocaleString()
                          : Math.round((currentShipment.weightKg || 0) * 2.20462).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-200">{(currentShipment.volumeCbm || 0).toFixed(2)} CBM</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals Bar */}
            <div className="p-4 bg-black/30 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs font-mono font-bold">
              <div className="text-slate-400">
                TOTAL PIECES: <span className="text-white">{currentShipment.pieces || 0}</span>
              </div>
              <div className="text-slate-400">
                TOTAL WEIGHT: <span className="text-cyan-300">{(currentShipment.weightKg || 0).toLocaleString()} KGS ({Math.round((currentShipment.weightKg || 0) * 2.20462).toLocaleString()} LBS)</span>
              </div>
              <div className="text-slate-400">
                TOTAL VOLUME: <span className="text-white">{(currentShipment.volumeCbm || 0).toFixed(2)} CBM</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
