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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl shadow-2xl w-full max-w-4xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-amber-400 text-xl">security</span>
            <div>
              <h2 className="font-bold text-sm tracking-wide">System Security Audit Log & Transaction Trail</h2>
              <p className="text-[11px] text-slate-400">Immutable chronological record of operational and financial actions</p>
            </div>
          </div>
          <button
            onClick={() => setModalOpen('auditLog', false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <span className="material-symbols-outlined text-slate-400 text-[18px]">search</span>
            <input
              type="text"
              placeholder="Search by Ref#, User, Details..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Filter Module:</span>
            <select
              value={filterModule}
              onChange={(e) => setFilterModule(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium outline-none"
            >
              <option value="ALL">All Modules</option>
              <option value="Ocean">Ocean Freight</option>
              <option value="Air">Air Freight</option>
              <option value="Vehicle">Vehicle Inventory</option>
              <option value="Pickup">Pickup & Delivery</option>
              <option value="Accounting">Accounting Bridge</option>
              <option value="Disbursement">Disbursements</option>
            </select>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="flex-1 overflow-y-auto p-4">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] font-bold">
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">User</th>
                <th className="py-2.5 px-3">Module</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Reference #</th>
                <th className="py-2.5 px-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-2 px-3 text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                  <td className="py-2 px-3 font-bold text-blue-600 dark:text-blue-400">{log.user}</td>
                  <td className="py-2 px-3 font-sans font-semibold text-slate-700 dark:text-slate-300">{log.module}</td>
                  <td className="py-2 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">{log.referenceNo}</td>
                  <td className="py-2 px-3 font-sans text-slate-600 dark:text-slate-400 max-w-xs truncate" title={log.details}>
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
