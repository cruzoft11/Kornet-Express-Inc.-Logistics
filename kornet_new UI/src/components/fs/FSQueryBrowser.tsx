import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import PageHeader from '../PageHeader'

type QueryType = 'accounts' | 'cdv' | 'receipt' | 'sales' | 'general' | 'purchase' | 'adjustment'

interface ColumnDef {
  key: string
  label: string
  align?: 'right' | 'left' | 'center'
  format?: (val: any) => string
  mono?: boolean
}

function fmtAmt(v: any): string {
  const n = parseFloat(v ?? 0)
  if (isNaN(n)) return '—'
  return n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(v: any): string {
  if (!v) return ''
  const dt = new Date(v)
  if (isNaN(dt.getTime())) return String(v)
  return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' })
}

const JOURNAL_COLS: ColumnDef[] = [
  { key: 'jDate',    label: 'Date',                 format: fmtDate },
  { key: 'jJvNo',    label: 'Reference',             mono: true },
  { key: 'acctCode', label: 'Acct#',                 mono: true },
  { key: 'jCkAmt',   label: 'Amount',    align: 'right', format: fmtAmt },
  { key: 'jDOrC',    label: 'Debit(D)/Credit(C)', align: 'center' },
]

const COLUMNS: Record<QueryType, ColumnDef[]> = {
  accounts: [
    { key: 'acctCode',  label: 'ACCT.CODE',   mono: true },
    { key: 'openBal',   label: 'OPEN.BAL.',   align: 'right', format: fmtAmt },
    { key: 'curDebit',  label: 'TTL.DEBIT',   align: 'right', format: fmtAmt },
    { key: 'curCredit', label: 'TTL.CREDIT',  align: 'right', format: fmtAmt },
    { key: 'endBal',    label: 'END.BAL.',    align: 'right', format: fmtAmt },
  ],
  cdv: [
    { key: 'jJvNo',  label: 'CDV NO.',     mono: true },
    { key: 'jCkNo',  label: 'CHECK NO.',   mono: true },
    { key: 'jCkAmt', label: 'CHK.AMT.',    align: 'right', format: fmtAmt },
    { key: 'jPayTo', label: 'PAYEE' },
    { key: 'jDesc',  label: 'EXPLANATION' },
  ],
  receipt:    JOURNAL_COLS,
  sales:      JOURNAL_COLS,
  general:    JOURNAL_COLS,
  purchase:   JOURNAL_COLS,
  adjustment: JOURNAL_COLS,
}

const TITLES: Record<QueryType, string> = {
  accounts:   'Chart of Accounts Query',
  cdv:        'Check Disbursement Vouchers Query',
  receipt:    'Cash Receipts Transactions',
  sales:      'Sales Book Journals',
  general:    'Journal Vouchers',
  purchase:   'Purchase Book Journals',
  adjustment: 'Adjustments',
}

const SEARCH_LABEL: Record<QueryType, string> = {
  accounts:   'Account Code',
  cdv:        'CDV No.',
  receipt:    'Search Ref',
  sales:      'Search Ref',
  general:    'Search Ref',
  purchase:   'Search Ref',
  adjustment: 'Search Ref',
}

export default function FSQueryBrowser() {
  const { queryType } = useParams<{ queryType: string }>()
  const qt = (queryType ?? 'accounts') as QueryType
  const columns  = COLUMNS[qt]     ?? JOURNAL_COLS
  const title    = TITLES[qt]      ?? 'Query'
  const searchLabel = SEARCH_LABEL[qt] ?? 'Search'

  const [filtered, setFiltered] = useState<any[]>([])
  const [search,   setSearch]   = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [includeDeleted, setIncludeDeleted] = useState(false)
  const [allPeriods, setAllPeriods] = useState(false)
  const [period, setPeriod] = useState<{ begDate: string; endDate: string } | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [total, setTotal] = useState(0)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')

  // Load the company's active fiscal period once, so browse views default to the
  // "live" month (mirrors the legacy Clipper behaviour).
  useEffect(() => {
    axios.get('/api/fs/system-info')
      .then(resp => {
        const beg = resp.data?.begDate ?? resp.data?.BegDate
        const end = resp.data?.endDate ?? resp.data?.EndDate
        if (beg && end) setPeriod({ begDate: String(beg).slice(0, 10), endDate: String(end).slice(0, 10) })
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true); setError(''); setSearch('')
    setAllPeriods(false)
    // Only the Check Disbursement (cdv) view defaults to the active fiscal period. The five
    // journal working-file views show every row by default (empty range) so imported entries
    // dated beyond the active month are still visible.
    const scoped = qt === 'cdv'
    setFromDate(scoped ? (period?.begDate ?? '') : '')
    setToDate(scoped ? (period?.endDate ?? '') : '')
    setIncludeDeleted(false); setPage(1); setFiltered([])
    setLoading(false)
  }, [qt, period])

  useEffect(() => {
    setLoading(true); setError('')
    axios.get(`/api/fs/query/${qt}`, {
      params: {
        search: search.trim() || undefined,
        from: allPeriods ? undefined : (fromDate || undefined),
        to: allPeriods ? undefined : (toDate || undefined),
        page, pageSize, includeDeleted,
        allPeriods: allPeriods || undefined,
      }
    }).then(resp => {
      const data = resp.data?.data ?? []
      setFiltered(data); setTotal(resp.data?.total ?? data.length)
    }).catch(e => {
      if (e?.response?.status === 401) {
        setError('') // not authenticated — silently show empty table
      } else {
        setError(e.response?.data?.error ?? e.message ?? 'Failed to load data')
      }
    }).finally(() => setLoading(false))
  }, [qt, search, fromDate, toDate, page, pageSize, includeDeleted, allPeriods])

  const getCellVal = (row: any, col: ColumnDef): string => {
    const raw = row[col.key]
    if (col.format) return col.format(raw)
    return raw == null ? '—' : String(raw)
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="flex flex-col gap-6 max-w-[1200px]">
      <PageHeader
        breadcrumb={`QUERY/REPORT / ${title.toUpperCase()}`}
        title={title}
        subtitle="Read-only view with server-side pagination and filtering."
      />

      {/* Filter Bar */}
      <div className="bg-white border border-outline-variant/15 rounded-2xl shadow-sm p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/60 mb-1">{searchLabel}</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant/50">search</span>
              <input type="text" value={search} onChange={e => { setPage(1); setSearch(e.target.value) }} placeholder="Type to seek..."
                className="w-full pl-9 pr-3 py-2 border border-outline-variant/20 rounded-lg text-sm bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <div className="w-[150px]">
            <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/60 mb-1">From Date</label>
            <input type="date" value={fromDate} disabled={allPeriods} onChange={e => { setPage(1); setAllPeriods(false); setFromDate(e.target.value) }}
              className="w-full px-3 py-2 border border-outline-variant/20 rounded-lg text-sm bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-40" />
          </div>
          <div className="w-[150px]">
            <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/60 mb-1">To Date</label>
            <input type="date" value={toDate} disabled={allPeriods} onChange={e => { setPage(1); setAllPeriods(false); setToDate(e.target.value) }}
              className="w-full px-3 py-2 border border-outline-variant/20 rounded-lg text-sm bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-40" />
          </div>
          {qt !== 'accounts' && (
            <label className="flex items-center gap-2 h-[38px] px-3 border border-outline-variant/20 rounded-lg bg-surface-container-lowest cursor-pointer hover:bg-surface-container transition-colors">
              <input type="checkbox" checked={allPeriods} onChange={e => {
                const on = e.target.checked
                setPage(1); setAllPeriods(on)
                if (on) { setFromDate(''); setToDate('') }
                else if (qt === 'cdv') { setFromDate(period?.begDate ?? ''); setToDate(period?.endDate ?? '') }
                else { setFromDate(''); setToDate('') }
              }} className="rounded border-outline-variant/30 text-primary focus:ring-primary" />
              <span className="text-sm font-medium text-on-surface-variant">All periods</span>
            </label>
          )}
          {qt !== 'accounts' && (
            <label className="flex items-center gap-2 h-[38px] px-3 border border-outline-variant/20 rounded-lg bg-surface-container-lowest cursor-pointer hover:bg-surface-container transition-colors">
              <input type="checkbox" checked={includeDeleted} onChange={e => { setPage(1); setIncludeDeleted(e.target.checked) }} className="rounded border-outline-variant/30 text-primary focus:ring-primary" />
              <span className="text-sm font-medium text-on-surface-variant">Include Deleted</span>
            </label>
          )}
          {search && (
            <button onClick={() => { setSearch(''); setPage(1) }} className="h-[38px] px-4 border border-outline-variant/20 rounded-lg text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-colors">
              Clear
            </button>
          )}
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
          <span className="text-sm font-bold text-on-surface">{total.toLocaleString()} <span className="text-on-surface-variant font-normal">record(s)</span></span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-surface-container-highest text-[10px] uppercase font-bold text-on-surface-variant/60 tracking-widest">
              <tr>
                {columns.map(col => (
                  <th key={col.key} className={`px-5 py-3 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}`}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="px-5 py-10 text-center text-on-surface-variant/50">
                    <div className="flex items-center justify-center animate-pulse">
                      <span className="material-symbols-outlined animate-spin mr-2">sync</span>Loading…
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-5 py-14 text-center text-on-surface-variant/40">
                    <span className="material-symbols-outlined text-4xl mb-2">search_off</span>
                    <p>No records found.</p>
                  </td>
                </tr>
              ) : filtered.map((row, i) => (
                <tr key={row.id ?? i} className={`hover:bg-primary/5 transition-colors ${i % 2 === 0 ? '' : 'bg-surface-container-lowest/30'}`}>
                  {columns.map(col => (
                    <td key={col.key} className={`px-5 py-3 ${
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''
                    } ${col.mono ? 'font-mono text-primary font-bold text-xs' : 'text-on-surface-variant'}`}>
                      {col.key === 'jCkAmt' || col.key === 'openBal' || col.key === 'curDebit' || col.key === 'curCredit' || col.key === 'endBal' ? (
                        <span className="text-emerald-700 font-semibold font-mono">₱{getCellVal(row, col)}</span>
                      ) : (
                        getCellVal(row, col)
                      )}
                    </td>
                  ))}
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
            <button disabled={page * pageSize >= total} onClick={() => setPage((p) => p + 1)}
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
