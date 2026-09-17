import { useState } from 'react'
import { useLogisticsStore } from '../../stores/logisticsStore'

export default function AuditLogModal() {
  const { auditLogs, modalOpen, setModalOpen } = useLogisticsStore()
  const [filterModule, setFilterModule] = useState('ALL')
  const [search, setSearch] = useState('')

  if (!modalOpen.auditLog) return null

  const filteredLogs = auditLogs.filter((log) => {
    const matchesModule = filterModule === 'ALL' || log.module.toLowerCase().includes(filterModule.toLowerCase())
    const matchesSearch =
      search === '' ||
      log.referenceNo.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase()) ||
      log.user.toLowerCase().includes(search.toLowerCase())
    return matchesModule && matchesSearch
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="liquid-glass-card border border-white/15 text-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh] backdrop-blur-2xl relative">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="px-6 py-4 bg-white/5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">security</span>
            </div>
            <div>
              <h2 className="font-bold text-sm text-white tracking-wide">System Security Audit Log &amp; Transaction Trail</h2>
              <p className="text-[11px] text-slate-400">Immutable chronological record of operational and financial actions</p>
            </div>
          </div>
          <button
            onClick={() => setModalOpen('auditLog', false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="p-4 bg-black/20 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <span className="material-symbols-outlined text-slate-400 text-[18px]">search</span>
            <input
              type="text"
              placeholder="Search by Ref#, User, Details..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-white/15 bg-black/40 text-white placeholder-slate-500 text-xs focus:ring-1 focus:ring-amber-400 focus:border-amber-400 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Filter Module:</span>
            <select
              value={filterModule}
              onChange={(e) => setFilterModule(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-white/15 bg-black/40 text-white text-xs font-medium outline-none focus:border-amber-400"
            >
              <option value="ALL" className="bg-slate-900 text-white">All Modules</option>
              <option value="Ocean" className="bg-slate-900 text-white">Ocean Freight</option>
              <option value="Air" className="bg-slate-900 text-white">Air Freight</option>
              <option value="Vehicle" className="bg-slate-900 text-white">Vehicle Inventory</option>
              <option value="Pickup" className="bg-slate-900 text-white">Pickup & Delivery</option>
              <option value="Accounting" className="bg-slate-900 text-white">Accounting Bridge</option>
              <option value="Disbursement" className="bg-slate-900 text-white">Disbursements</option>
            </select>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 uppercase text-[10px] font-bold">
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">User</th>
                <th className="py-2.5 px-3">Module</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Reference #</th>
                <th className="py-2.5 px-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-[11px]">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-white/[0.04] transition-colors">
                  <td className="py-2 px-3 text-slate-400 whitespace-nowrap">{log.timestamp}</td>
                  <td className="py-2 px-3 font-bold text-cyan-400">{log.user}</td>
                  <td className="py-2 px-3 font-sans font-semibold text-slate-200">{log.module}</td>
                  <td className="py-2 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-white/10 border border-white/15 text-slate-200">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-bold text-white">{log.referenceNo}</td>
                  <td className="py-2 px-3 font-sans text-slate-300 max-w-xs truncate" title={log.details}>
                    {log.details}
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                    No matching audit log entries found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
