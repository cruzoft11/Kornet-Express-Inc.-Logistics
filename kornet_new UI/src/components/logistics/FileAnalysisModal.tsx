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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="liquid-glass-card border border-white/15 text-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] backdrop-blur-2xl relative">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-white/5">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-cyan-400">
                <span className="material-symbols-outlined text-lg">verified</span>
              </div>
              <h3 className="font-bold text-base text-white tracking-wide">
                File Analysis &amp; Margin Verification Report
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Logisuite Pre-Accounting Audit Gate &bull; File: <strong className="text-white font-mono">{shipment.fileNo}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
          {/* Shipment Snapshot */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-white/5 border border-white/10 rounded-2xl text-xs backdrop-blur-md">
            <div>
              <span className="text-slate-400 block text-[11px]">Shipment Type</span>
              <strong className="text-white font-semibold">{shipment.type}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Booking / BL #</span>
              <strong className="text-cyan-300 font-mono">{shipment.blOrAwbNo || shipment.bookingNo}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Vessel / Carrier</span>
              <strong className="text-white">{shipment.vesselOrFlight}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Current Status</span>
              <span className={`inline-block px-2 py-0.5 rounded-lg font-bold uppercase text-[10px] border ${
                shipment.status === 'Closed' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' :
                shipment.status === 'Transferred' ? 'bg-purple-500/20 border-purple-500/30 text-purple-300' :
                'bg-blue-500/20 border-blue-500/30 text-blue-300'
              }`}>
                {shipment.status}
              </span>
            </div>
          </div>

          {/* Financial Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
              <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider block">
                Total Billing (Revenue)
              </span>
              <div className="text-2xl font-black text-white font-mono mt-1">
                ${totalBilling.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">{shipment.billingLines.length} Customer Charge(s)</span>
            </div>

            <div className="p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
              <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block">
                Total Vendor Costs (AP)
              </span>
              <div className="text-2xl font-black text-amber-300 font-mono mt-1">
                ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">{shipment.costLines.length} Carrier/Vendor Charge(s)</span>
            </div>

            <div className={`p-4 rounded-2xl border backdrop-blur-md ${
              isHealthy
                ? 'border-emerald-500/30 bg-emerald-500/10'
                : 'border-rose-500/30 bg-rose-500/10'
            }`}>
              <span className={`text-[11px] font-semibold uppercase tracking-wider block ${isHealthy ? 'text-emerald-400' : 'text-rose-400'}`}>
                Gross Profit Margin
              </span>
              <div className={`text-2xl font-black mt-1 font-mono ${isHealthy ? 'text-emerald-300' : 'text-rose-300'}`}>
                ${grossProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="text-sm font-semibold ml-2">({marginPct.toFixed(1)}%)</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">Target Threshold: &ge; 15.0%</span>
            </div>
          </div>

          {/* Detailed Dual-Ledger Table */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Billing Lines */}
            <div className="border border-white/10 rounded-2xl p-4 bg-black/30 backdrop-blur-md">
              <div className="font-bold text-white mb-3 flex items-center justify-between">
                <span>Customer Invoicing (AR)</span>
                <span className="text-cyan-400 font-semibold">{shipment.shipper}</span>
              </div>
              <div className="space-y-2">
                {shipment.billingLines.map((b) => (
                  <div key={b.id} className="flex justify-between items-center py-1.5 border-b border-white/5">
                    <div>
                      <span className="font-bold font-mono text-cyan-300">[{b.code}]</span> <span className="text-slate-200">{b.desc}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">GL Acct: {b.glAccount} &bull; {b.prepaidOrCollect}</span>
                    </div>
                    <span className="font-bold font-mono text-white">${b.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Cost Lines */}
            <div className="border border-white/10 rounded-2xl p-4 bg-black/30 backdrop-blur-md">
              <div className="font-bold text-white mb-3 flex items-center justify-between">
                <span>Vendor Freight Costs (AP)</span>
                <span className="text-amber-400 font-semibold">Carrier Payables</span>
              </div>
              <div className="space-y-2">
                {shipment.costLines.map((c) => (
                  <div key={c.id} className="flex justify-between items-center py-1.5 border-b border-white/5">
                    <div>
                      <span className="font-bold font-mono text-amber-300">[{c.code}]</span> <span className="text-slate-200">{c.desc}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">Vendor: {c.vendor} &bull; GL: {c.glAccount}</span>
                    </div>
                    <span className="font-bold font-mono text-white">${c.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-white/10 flex justify-between items-center bg-white/5">
          <div className="text-xs text-slate-400">
            {shipment.status === 'Open' ? (
              <span>* File must be closed before transferring to Accounting Bridge.</span>
            ) : shipment.status === 'Closed' ? (
              <span className="text-emerald-400 font-semibold">&check; File is closed and verified. Ready for Bridge transfer.</span>
            ) : (
              <span className="text-purple-400 font-semibold">&check; File has already been transferred to Bridge.</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold border border-white/15 text-slate-300 hover:text-white hover:bg-white/10 transition-all"
            >
              Cancel
            </button>

            {shipment.status === 'Open' && (
              <button
                onClick={handleCloseFile}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/30 border border-amber-400/40 flex items-center gap-1.5 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">lock</span>
                Close File &amp; Lock Rates
              </button>
            )}

            {shipment.status === 'Closed' && (
              <button
                onClick={handleTransferToBridge}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/30 border border-blue-400/40 flex items-center gap-1.5 transition-all active:scale-95"
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
