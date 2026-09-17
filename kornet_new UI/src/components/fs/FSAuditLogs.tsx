import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import PageHeader from '../PageHeader'

interface AuditLog {
  id: number
  username: string | null
  eventType: string
  resource: string
  success: boolean
  ipAddress: string | null
  details: string | null
  createdAtUtc: string
}

function humanizeResource(resource: string): string {
  if (!resource) return '—'
  const r = resource.replace(/^\/api\/(fs|admin|auth|health|payroll)\//, '')
  const map: Record<string, string> = {
    'login': 'Sign In', 'logout': 'Sign Out', 'refresh': 'Session Refresh',
    'checkmas': 'Check Disbursement', 'checkvou': 'Check Vouchers',
    'cashrcpt': 'Cash Receipts', 'salebook': 'Sales Book',
    'purcbook': 'Purchase Book', 'journals': 'Journal Vouchers',
    'adjstmnt': 'Adjustments', 'accounts': 'Chart of Accounts',
    'posting': 'Post Transactions', 'month-end': 'Month-End Processing',
    'audit-logs': 'Audit Logs', 'users': 'User Management',
    'backup': 'Database Backup', 'seed': 'Database Seed',
  }
  for (const [key, label] of Object.entries(map)) {
    if (r.includes(key)) return label
  }
  return r.split('/')[0] || resource
}

function humanizeDetail(_eventType: string, detail: string | null, success: boolean): string {
  if (!detail) return success ? 'Completed successfully' : 'Operation failed'
  const d = detail.trim()
  // Strip SQL queries
  if (d.includes('SELECT ') || d.includes('INSERT ') || d.includes('UPDATE ') || d.includes('DELETE ')) {
    return success ? 'Database operation completed' : 'Database operation failed'
  }
  // Known messages
  if (d.includes('Unknown or inactive user')) return 'Unknown or inactive username entered'
  if (d.includes('Invalid password')) return 'Incorrect password entered'
  if (d.includes('Locked out')) return 'Account locked due to too many failed attempts'
  // If it's already short and readable, return as-is
  if (d.length <= 100 && !d.includes('{') && !d.includes('[')) return d
  // Truncate very long technical text
  return d.substring(0, 80) + '…'
}

function toCsv(rows: AuditLog[]): string {
  const header = ['ID', 'Username', 'EventType', 'Resource', 'Success', 'IP', 'Details', 'CreatedAtUtc']
  const body = rows.map((r) => [
    r.id,
    r.username ?? '',
    r.eventType,
    r.resource,
    r.success ? 'Yes' : 'No',
    r.ipAddress ?? '',
    (r.details ?? '').split('"').join('""'),
    r.createdAtUtc
  ])

  const lines = [header, ...body].map((cols) => cols.map((c) => `"${String(c)}"`).join(','))
  return lines.join('\n')
}

export default function FSAuditLogs() {
  const [rows, setRows] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [username, setUsername] = useState('')
  const [eventType, setEventType] = useState('')
  const [resultFilter, setResultFilter] = useState<'all' | 'success' | 'failed'>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [total, setTotal] = useState(0)

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize])

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const params: Record<string, string | number | boolean> = { page, pageSize }
      if (username.trim()) params.username = username.trim()
      if (eventType.trim()) params.eventType = eventType.trim()
      if (resultFilter === 'success') params.success = true
      if (resultFilter === 'failed') params.success = false
      if (from) params.from = new Date(`${from}T00:00:00`).toISOString()
      if (to) params.to = new Date(`${to}T23:59:59`).toISOString()

      const resp = await axios.get('/api/admin/audit-logs', { params })
      setRows(resp.data?.data ?? [])
      setTotal(resp.data?.total ?? 0)
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setError('') // not authenticated — silently show empty table
      } else {
        setError(err.response?.data?.error ?? err.message ?? 'Failed to load audit logs')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [page, pageSize])

  const exportCsv = () => {
    const csv = toCsv(rows)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `audit_logs_page_${page}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-6 max-w-[1200px]">
      <PageHeader
        breadcrumb="ADMINISTRATION / AUDIT LOGS"
        title="Audit Logs"
        subtitle="Filter security and data operation events with quick export."
        actions={
          <button onClick={exportCsv} disabled={rows.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-surface-container text-on-surface rounded-lg text-sm font-bold shadow-sm hover:bg-surface-container-high transition-colors disabled:opacity-50">
            <span className="material-symbols-outlined text-[16px]">download</span> Export CSV
          </button>
        }
      />

      {/* Filter Bar */}
      <div className="bg-white border border-outline-variant/15 rounded-2xl shadow-sm p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[120px]">
            <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/60 mb-1">Username</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="All users..."
              className="w-full px-3 py-2 border border-outline-variant/20 rounded-lg text-sm bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/60 mb-1">Event Type</label>
            <input type="text" value={eventType} onChange={e => setEventType(e.target.value)} placeholder="e.g. LOGIN"
              className="w-full px-3 py-2 border border-outline-variant/20 rounded-lg text-sm bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="w-[140px]">
            <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/60 mb-1">Result</label>
            <select value={resultFilter} onChange={e => setResultFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-outline-variant/20 rounded-lg text-sm bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="all">All Results</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div className="w-[140px]">
            <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/60 mb-1">From Date</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="w-full px-3 py-2 border border-outline-variant/20 rounded-lg text-sm bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="w-[140px]">
            <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/60 mb-1">To Date</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              className="w-full px-3 py-2 border border-outline-variant/20 rounded-lg text-sm bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <button onClick={() => { setPage(1); void loadData() }}
            className="px-5 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-sm hover:bg-primary/90 transition-colors h-[38px]">
            Filter
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <span className="material-symbols-outlined text-[18px]">error</span> {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-outline-variant/15 rounded-2xl shadow-sm flex flex-col overflow-hidden">
        <div className="px-5 py-3 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-lowest">
          <span className="text-sm font-bold text-on-surface">{total} <span className="text-on-surface-variant font-normal">total log(s)</span></span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-surface-container-highest text-[10px] uppercase font-bold text-on-surface-variant/60 tracking-widest">
              <tr>
                <th className="px-5 py-3 rounded-tl-lg">When (UTC)</th>
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">Event</th>
                <th className="px-5 py-3">Resource</th>
                <th className="px-5 py-3">Result</th>
                <th className="px-5 py-3">IP</th>
                <th className="px-5 py-3 rounded-tr-lg">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-on-surface-variant/50">
                    <div className="flex items-center justify-center animate-pulse">
                      <span className="material-symbols-outlined animate-spin mr-2">sync</span>Loading…
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center text-on-surface-variant/40">
                    <span className="material-symbols-outlined text-4xl mb-2">history_toggle_off</span>
                    <p>No logs found matching your filters.</p>
                  </td>
                </tr>
              ) : rows.map((r, i) => (
                <tr key={r.id} className={`hover:bg-primary/5 transition-colors ${i % 2 === 0 ? '' : 'bg-surface-container-lowest/30'}`}>
                  <td className="px-5 py-3 text-on-surface-variant whitespace-nowrap">{new Date(r.createdAtUtc).toLocaleString()}</td>
                  <td className="px-5 py-3 font-medium text-on-surface">{r.username ?? 'system'}</td>
                  <td className="px-5 py-3 text-on-surface-variant">{r.eventType}</td>
                  <td className="px-5 py-3 text-on-surface-variant">{humanizeResource(r.resource)}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${r.success ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                      {r.success ? 'Success' : 'Failed'}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-on-surface-variant">{r.ipAddress ?? '—'}</td>
                  <td className="px-5 py-3 text-on-surface-variant truncate max-w-[260px]" title={r.details ?? ''}>{humanizeDetail(r.eventType, r.details, r.success)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Details */}
        <div className="px-5 py-3 border-t border-outline-variant/10 flex items-center justify-between bg-surface-container-lowest">
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
              className="p-1.5 rounded-lg border border-outline-variant/20 text-on-surface-variant hover:bg-surface-container disabled:opacity-30 transition-colors">
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <span className="text-sm text-on-surface-variant font-medium mx-2">Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
              className="p-1.5 rounded-lg border border-outline-variant/20 text-on-surface-variant hover:bg-surface-container disabled:opacity-30 transition-colors">
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-on-surface-variant uppercase tracking-wider font-bold">Rows</span>
            <select value={pageSize} onChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setPage(1) }}
              className="px-2 py-1 border border-outline-variant/20 rounded-md text-sm bg-white focus:outline-none">
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}
