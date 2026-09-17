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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl shadow-2xl w-full max-w-4xl border border-slate-300 dark:border-slate-800 overflow-hidden flex flex-col">
        {/* Header Bar */}
        <div className="px-5 py-3 bg-slate-800 text-white flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-400">format_list_bulleted</span>
            <span className="font-bold text-sm tracking-wide">Ocean Shipping Manifest Processing</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintManifest}
              disabled={!currentShipment}
              className={`px-3 py-1 rounded text-white text-xs font-bold flex items-center gap-1 shadow-sm ${
                currentShipment ? 'bg-emerald-600 hover:bg-emerald-500 cursor-pointer' : 'bg-slate-600 opacity-50 cursor-not-allowed'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              Save and Print Manifest
            </button>
            <button
              onClick={() => setModalOpen('manifest', false)}
              className="p-1 rounded text-slate-300 hover:text-white"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        {!currentShipment ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-3">
              <span className="material-symbols-outlined text-3xl">inventory_2</span>
            </div>
            <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">No Ocean Shipments Staged</h4>
            <p className="text-xs text-slate-500 max-w-md mt-1 mb-5">
              There are currently no active ocean freight bookings or bills of lading in the operational staging queue. Create an Ocean Booking first to generate shipping manifests.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setModalOpen('manifest', false)
                  setModalOpen('newBooking', true)
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-500 transition-colors shadow-sm"
              >
                Create Ocean Booking
              </button>
              <button
                onClick={() => setModalOpen('manifest', false)}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Manifest Loading Parameters */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">File # / Booking</label>
                <select
                  value={selectedFile || currentShipment.fileNo}
                  onChange={(e) => setSelectedFile(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono font-bold"
                >
                  {shipments.map((s) => (
                    <option key={s.fileNo} value={s.fileNo}>
                      {s.fileNo} ({s.blOrAwbNo || 'No BL'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">Port of Discharge / Destination</label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">Weight Unit</label>
                <div className="flex gap-2">
                  <select
                    value={weightUnit}
                    onChange={(e) => setWeightUnit(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-bold"
                  >
                    <option value="KGS">KGS (Metric Kilograms)</option>
                    <option value="LBS">LBS (Imperial Pounds)</option>
                  </select>
                  <button
                    onClick={() => setIsLoaded(true)}
                    className="px-4 py-1.5 rounded bg-blue-600 text-white font-bold text-xs hover:bg-blue-500 shadow-sm whitespace-nowrap"
                  >
                    Load
                  </button>
                </div>
              </div>
            </div>

            {/* Manifest Entries Grid */}
            <div className="p-4 overflow-x-auto flex-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase text-[10px] font-bold">
                    <th className="py-2 px-3">BL #</th>
                    <th className="py-2 px-3">Destination</th>
                    <th className="py-2 px-3">Shipper</th>
                    <th className="py-2 px-3">Consignee</th>
                    <th className="py-2 px-3">Container #</th>
                    <th className="py-2 px-3">Pieces</th>
                    <th className="py-2 px-3">Act. Weight ({weightUnit})</th>
                    <th className="py-2 px-3">Volume (CBM)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                  {isLoaded && (
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-2.5 px-3 font-bold text-blue-600 dark:text-blue-400">{currentShipment.blOrAwbNo || 'Pending'}</td>
                      <td className="py-2.5 px-3 font-sans text-slate-700 dark:text-slate-300">{currentShipment.destination || destination}</td>
                      <td className="py-2.5 px-3 font-sans font-semibold text-slate-900 dark:text-white">{currentShipment.shipper || 'N/A'}</td>
                      <td className="py-2.5 px-3 font-sans text-slate-700 dark:text-slate-300">{currentShipment.consignee || 'N/A'}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">{currentShipment.containerNo || 'MSKU-992144-8'}</td>
                      <td className="py-2.5 px-3 font-bold">{currentShipment.pieces || 0} PKG</td>
                      <td className="py-2.5 px-3 font-bold">
                        {weightUnit === 'KGS'
                          ? (currentShipment.weightKg || 0).toLocaleString()
                          : Math.round((currentShipment.weightKg || 0) * 2.20462).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-bold">{(currentShipment.volumeCbm || 0).toFixed(2)} CBM</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals Bar */}
            <div className="p-4 bg-slate-100 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4 text-xs font-mono font-bold">
              <div className="text-slate-600 dark:text-slate-400">
                TOTAL PIECES: <span className="text-slate-900 dark:text-white">{currentShipment.pieces || 0}</span>
              </div>
              <div className="text-slate-600 dark:text-slate-400">
                TOTAL WEIGHT: <span className="text-slate-900 dark:text-white">{(currentShipment.weightKg || 0).toLocaleString()} KGS ({Math.round((currentShipment.weightKg || 0) * 2.20462).toLocaleString()} LBS)</span>
              </div>
              <div className="text-slate-600 dark:text-slate-400">
                TOTAL VOLUME: <span className="text-slate-900 dark:text-white">{(currentShipment.volumeCbm || 0).toFixed(2)} CBM</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
