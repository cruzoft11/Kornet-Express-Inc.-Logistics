import { Shipment, useLogisticsStore } from '../../stores/logisticsStore'

interface FileAnalysisModalProps {
  shipment?: Shipment
  onClose?: () => void
}

export default function FileAnalysisModal({ shipment: propShipment, onClose: propOnClose }: FileAnalysisModalProps = {}) {
  const { modalOpen, setModalOpen, selectedFileNo, shipments, closeShipment, transferToBridge } = useLogisticsStore()

  if (!modalOpen.fileAnalysis && !propShipment) return null

  const shipment = propShipment || shipments.find((s) => s.fileNo === selectedFileNo) || shipments[0]
  if (!shipment) return null

  const onClose = () => {
    if (propOnClose) propOnClose()
    setModalOpen('fileAnalysis', false)
  }

  const totalBilling = shipment.billingLines.reduce((sum, b) => sum + b.amount, 0)
  const totalCost = shipment.costLines.reduce((sum, c) => sum + c.amount, 0)
  const grossProfit = totalBilling - totalCost
  const marginPct = totalBilling > 0 ? (grossProfit / totalBilling) * 100 : 0
  const isHealthy = grossProfit > 0 && marginPct >= 15

  const handleCloseFile = () => {
    const success = closeShipment(shipment.fileNo)
    if (success) {
      window.alert(`Shipment ${shipment.fileNo} has been verified and marked CLOSED. Rates are now locked from operational changes.`)
    }
  }

  const handleTransferToBridge = () => {
    const success = transferToBridge(shipment.fileNo)
    if (success) {
      window.alert(`Shipment ${shipment.fileNo} successfully transferred to the Accounting Bridge! You can now review it in the Accounting Bridge tab.`)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">verified</span>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                File Analysis & Margin Verification Report
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Logisuite Pre-Accounting Audit Gate &bull; File: <strong>{shipment.fileNo}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Shipment Snapshot */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-100 dark:bg-slate-800/60 rounded-xl text-xs">
            <div>
              <span className="text-slate-500 block">Shipment Type</span>
              <strong className="text-slate-800 dark:text-slate-200">{shipment.type}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Booking / BL #</span>
              <strong className="text-slate-800 dark:text-slate-200">{shipment.blOrAwbNo || shipment.bookingNo}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Vessel / Carrier</span>
              <strong className="text-slate-800 dark:text-slate-200">{shipment.vesselOrFlight}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Current Status</span>
              <span className={`inline-block px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                shipment.status === 'Closed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300' :
                shipment.status === 'Transferred' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300' :
                'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300'
              }`}>
                {shipment.status}
              </span>
            </div>
          </div>

          {/* Financial Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20">
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider block">
                Total Billing (Revenue)
              </span>
              <div className="text-2xl font-black text-blue-950 dark:text-blue-200 mt-1">
                ${totalBilling.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">{shipment.billingLines.length} Customer Charge(s)</span>
            </div>

            <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20">
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">
                Total Vendor Costs (AP)
              </span>
              <div className="text-2xl font-black text-amber-950 dark:text-amber-200 mt-1">
                ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">{shipment.costLines.length} Carrier/Vendor Charge(s)</span>
            </div>

            <div className={`p-4 rounded-xl border ${
              isHealthy
                ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20'
                : 'border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20'
            }`}>
              <span className={`text-xs font-semibold uppercase tracking-wider block ${isHealthy ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                Gross Profit Margin
              </span>
              <div className={`text-2xl font-black mt-1 ${isHealthy ? 'text-emerald-950 dark:text-emerald-200' : 'text-red-950 dark:text-red-200'}`}>
                ${grossProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="text-sm font-semibold ml-2">({marginPct.toFixed(1)}%)</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">Target Threshold: &ge; 15.0%</span>
            </div>
          </div>

          {/* Detailed Dual-Ledger Table */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Billing Lines */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-white dark:bg-slate-900">
              <div className="font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center justify-between">
                <span>Customer Invoicing (AR)</span>
                <span className="text-blue-600 font-semibold">{shipment.shipper}</span>
              </div>
              <div className="space-y-1.5">
                {shipment.billingLines.map((b) => (
                  <div key={b.id} className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/60">
                    <div>
                      <span className="font-bold text-slate-700 dark:text-slate-300">[{b.code}]</span> {b.desc}
                      <span className="text-[10px] text-slate-400 block">GL Acct: {b.glAccount} &bull; {b.prepaidOrCollect}</span>
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white">${b.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Cost Lines */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-white dark:bg-slate-900">
              <div className="font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center justify-between">
                <span>Vendor Freight Costs (AP)</span>
                <span className="text-amber-600 font-semibold">Carrier Payables</span>
              </div>
              <div className="space-y-1.5">
                {shipment.costLines.map((c) => (
                  <div key={c.id} className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800/60">
                    <div>
                      <span className="font-bold text-slate-700 dark:text-slate-300">[{c.code}]</span> {c.desc}
                      <span className="text-[10px] text-slate-400 block">Vendor: {c.vendor} &bull; GL: {c.glAccount}</span>
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white">${c.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
          <div className="text-xs text-slate-500">
            {shipment.status === 'Open' ? (
              <span>* File must be closed before transferring to Accounting Bridge.</span>
            ) : shipment.status === 'Closed' ? (
              <span className="text-emerald-600 font-semibold">&check; File is closed and verified. Ready for Bridge transfer.</span>
            ) : (
              <span className="text-purple-600 font-semibold">&check; File has already been transferred to Bridge.</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>

            {shipment.status === 'Open' && (
              <button
                onClick={handleCloseFile}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">lock</span>
                Close File & Lock Rates
              </button>
            )}

            {shipment.status === 'Closed' && (
              <button
                onClick={handleTransferToBridge}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">hub</span>
                Transfer to Accounting Bridge
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
