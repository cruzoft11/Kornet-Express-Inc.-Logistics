import { useEffect, useState, useCallback, Fragment } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import PageHeader from '../PageHeader'
import {
  exportTableCSV,    exportFinancialCSV,
  exportTableXLSX,   exportFinancialXLSX,
  exportTablePDF,    exportFinancialPDF,
  exportVouchersPDF,
  type ExportCol,    type FinSection,
} from '../../utils/exportUtils'
import { readSelectedCompanyName } from '../../utils/companyContext'

const API_BASE = '/api/fs'

// --- Report title map -------------------------------------------------------
const reportTitles: Record<string, string> = {
  'cdv':                  'Check Disbursement Register (Detailed)',
  'cds':                  'Check Disbursement Register (Summary)',
  'receipts':             'Cash Receipts Transactions',
  'sales':                'Sales Book Journals',
  'journals':             'Journal Vouchers',
  'purchase':             'Purchase Book Journals',
  'adjustments':          'Adjustments',
  'trial-balance-detail': 'Detailed Trial Balance',
  'trial-balance':        'Trial Balance',
  'income-statement':     'Income Statement',
  'balance-sheet':        'Balance Sheet',
  'coa':                  'Chart of Accounts',
  'groups':               'Account Groupings',
  'schedules':            'Subsidiary Schedule Groups',
  'subsidiary-schedule':  'Subsidiary Schedule of Balance Sheet'
}

// --- Types ------------------------------------------------------------------
interface JournalRow {
  id: number
  jJvNo: string; jDate: string; acctCode: string; jCkAmt: number; jDOrC: string
}
interface VoucherMaster {
  id: number
  jJvNo: string; jCkNo: string; jDate: string; jPayTo: string | null
  jCkAmt: number; jDesc: string | null; supNo?: string | number; bankNo?: string | number
}
interface VoucherLine {
  id: number
  jCkNo: string; acctCode: string; jCkAmt: number; jDOrC: string
}
interface AccountRow {
  id: number
  acctCode: string; acctDesc: string; openBal: number; curDebit: number
  curCredit: number; endBal: number; glReport: string | null; glEffect: string | null; formula: string
}
interface GroupCodeRow   { id: number; glReport: string; glEffect: string; glHead: string | null }
interface ScheduleRow    { id: number; glHead: string; acctCode: string; acctDesc: string | null }

// --- Data mappers -----------------------------------------------------------
function mapJournal(r: Record<string, unknown>): JournalRow {
  return {
    id: (r.id as number) ?? 0,
    jJvNo:    String(r.jJvNo    ?? r.j_jv_no    ?? ''),
    jDate:    String(r.jDate    ?? r.j_date      ?? ''),
    acctCode: String(r.acctCode ?? r.acct_code   ?? ''),
    jCkAmt:   parseFloat(String(r.jCkAmt ?? r.j_ck_amt ?? 0)),
    jDOrC:    String(r.jDOrC    ?? r.jdOrC ?? r.j_d_or_c ?? 'D'),
  }
}
function mapVoucherMaster(r: Record<string, unknown>): VoucherMaster {
  return {
    id: (r.id as number) ?? 0,
    jJvNo:  String(r.jJvNo  ?? r.j_jv_no  ?? ''),
    jCkNo:  String(r.jCkNo  ?? r.j_ck_no  ?? ''),
    jDate:  String(r.jDate  ?? r.j_date    ?? ''),
    jPayTo: r.jPayTo  != null ? String(r.jPayTo)  : (r.j_pay_to != null ? String(r.j_pay_to) : ''),
    jCkAmt: parseFloat(String(r.jCkAmt ?? r.j_ck_amt ?? 0)),
    jDesc:  r.jDesc != null ? String(r.jDesc) : (r.j_desc != null ? String(r.j_desc) : ''),
    supNo:  (r.supNo  ?? r.sup_no)  as string | number | undefined,
    bankNo: (r.bankNo ?? r.bank_no) as string | number | undefined,
  }
}
function mapVoucherLine(r: Record<string, unknown>): VoucherLine {
  return {
    id: (r.id as number) ?? 0,
    jCkNo:    String(r.jCkNo    ?? r.j_ck_no    ?? ''),
    acctCode: String(r.acctCode ?? r.acct_code   ?? ''),
    jCkAmt:   parseFloat(String(r.jCkAmt ?? r.j_ck_amt ?? 0)),
    jDOrC:    String(r.jDOrC    ?? r.j_d_or_c ?? 'D'),
  }
}
function mapAccount(r: Record<string, unknown>): AccountRow {
  return {
    id: (r.id as number) ?? 0,
    acctCode:  String(r.acctCode  ?? r.acct_code  ?? ''),
    acctDesc:  String(r.acctDesc  ?? r.acct_desc  ?? ''),
    openBal:   parseFloat(String(r.openBal   ?? r.open_bal   ?? 0)),
    curDebit:  parseFloat(String(r.curDebit  ?? r.cur_debit  ?? 0)),
    curCredit: parseFloat(String(r.curCredit ?? r.cur_credit ?? 0)),
    endBal:    parseFloat(String(r.endBal    ?? r.end_bal    ?? 0)),
    glReport:  r.glReport != null ? String(r.glReport) : (r.gl_report != null ? String(r.gl_report) : null),
    glEffect:  r.glEffect != null ? String(r.glEffect) : (r.gl_effect != null ? String(r.gl_effect) : null),
    formula:   String(r.formula ?? 'DC'),
  }
}

// --- Formatting helpers -----------------------------------------------------
function fmt(n: number) { return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function fmtDate(d: string) {
  if (!d) return ''
  const dt = new Date(d)
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' })
}
function filterByDate<T extends { jDate: string }>(rows: T[], from: string, to: string): T[] {
  return rows.filter(r => {
    if (!r.jDate) return false
    const dt = new Date(r.jDate)
    if (isNaN(dt.getTime())) return false
    const d = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
    return d >= from && d <= to
  })
}

// --- Inline ExportBar -------------------------------------------------------
function ExportBar({ onCSV, onXLSX, onPDF, onPrintForms }: {
  onCSV: () => void; onXLSX: () => void; onPDF: () => void; onPrintForms?: () => void
}) {
  const [error, setError] = useState('')
  const wrap = (fn: () => void) => () => {
    try { setError(''); fn() }
    catch (e: any) { setError(e.message || String(e)) }
  }
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span className="form-label" style={{ margin: 0, alignSelf: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>EXPORT AS:</span>
        <button className="btn btn-secondary" style={{ padding: '4px 12px' }} onClick={wrap(onCSV)}>
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>download</span> CSV
        </button>
        <button className="btn btn-secondary" style={{ padding: '4px 12px' }} onClick={wrap(onXLSX)}>
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>download</span> XLSX
        </button>
        <button className="btn btn-secondary" style={{ padding: '4px 12px' }} onClick={wrap(onPDF)}>
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>print</span> PDF
        </button>
        {onPrintForms && (
          <>
            <div style={{ width: '1px', height: '16px', background: 'var(--border)', margin: '0 4px' }} />
            <button className="btn btn-primary" style={{ padding: '4px 12px' }} onClick={wrap(onPrintForms)}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>receipt_long</span> Print Vouchers
            </button>
          </>
        )}
      </div>
      {error && <div style={{ marginTop: '8px', color: '#dc2626', fontSize: '12px', fontWeight: 500 }}>Export Error: {error}</div>}
    </div>
  )
}

// ===========================================================================
// MAIN COMPONENT
// ===========================================================================
export default function FSReports() {
  const { reportType } = useParams<{ reportType: string }>()
  const reportTitle = reportTitles[reportType || ''] || 'Financial Report'

  const [dateFrom,  setDateFrom]     = useState('')
  const [dateTo,    setDateTo]       = useState('')
  const [periodBeg, setPeriodBeg]    = useState('')
  const [filterMode, setFilterMode]  = useState<'asOf' | 'range'>('asOf')
  const [periodLoaded, setPeriodLoaded] = useState(false)
  const [loading,   setLoading]      = useState(false)
  const [error,     setError]        = useState('')
  const [includeCheckNo, setIncludeCheckNo] = useState(false)
  const [includeSignatories, setIncludeSignatories] = useState(true)

  // Fetch the active period from system-info and use it as default date range
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await axios.get(`${API_BASE}/system-info`)
        if (cancelled) return
        const begDate = res.data?.BegDate ?? res.data?.begDate
        const endDate = res.data?.EndDate ?? res.data?.endDate
        if (begDate && endDate) {
          const beg = new Date(begDate)
          const end = new Date(endDate)
          const begStr = `${beg.getFullYear()}-${String(beg.getMonth() + 1).padStart(2, '0')}-${String(beg.getDate()).padStart(2, '0')}`
          const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`
          setPeriodBeg(begStr)
          setDateFrom(begStr)
          setDateTo(endStr)
        } else {
          // Fallback to current month if no system period
          const today = new Date()
          const begStr = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
          const endStr = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]
          setPeriodBeg(begStr)
          setDateFrom(begStr)
          setDateTo(endStr)
        }
      } catch {
        // Fallback to current month on error
        const today = new Date()
        const begStr = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
        const endStr = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]
        setPeriodBeg(begStr)
        setDateFrom(begStr)
        setDateTo(endStr)
      } finally {
        if (!cancelled) setPeriodLoaded(true)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const [journalRows,    setJournalRows]    = useState<JournalRow[]>([])
  const [voucherMasters, setVoucherMasters] = useState<VoucherMaster[]>([])
  const [voucherLines,   setVoucherLines]   = useState<VoucherLine[]>([])
  const [accountRows,    setAccountRows]    = useState<AccountRow[]>([])
  const [groupRows,      setGroupRows]      = useState<GroupCodeRow[]>([])
  const [schedRows,      setSchedRows]      = useState<ScheduleRow[]>([])
  const [financialData,  setFinancialData]  = useState<Record<string, unknown> | null>(null)
  const [acctDescMap,    setAcctDescMap]    = useState<Record<string, string>>({})

  // --- Customize Report filters ---
  const [showFilters, setShowFilters] = useState(false)
  // CDV filters
  const [filterCkNo, setFilterCkNo] = useState('')
  const [filterCdvNo, setFilterCdvNo] = useState('')
  const [filterPayee, setFilterPayee] = useState('')
  const [filterAcctCode, setFilterAcctCode] = useState('')
  const [printBuilderEnabled, setPrintBuilderEnabled] = useState(false)
  const [printBuilderPages, setPrintBuilderPages] = useState<(number|string)[]>([])
  // Journal filters
  const [filterRefNo, setFilterRefNo] = useState('')
  const [filterJournalAcct, setFilterJournalAcct] = useState('')
  const [filterMinAmt, setFilterMinAmt] = useState('')
  const [filterMaxAmt, setFilterMaxAmt] = useState('')
  const [filterDC, setFilterDC] = useState<'all'|'D'|'C'>('all')
  const [journalPickMode, setJournalPickMode] = useState(false)
  const [selectedJournalIds, setSelectedJournalIds] = useState<Set<number>>(new Set())

  const clearAllFilters = () => {
    setFilterCkNo(''); setFilterCdvNo(''); setFilterPayee(''); setFilterAcctCode('')
    setPrintBuilderEnabled(false); setPrintBuilderPages([])
    setFilterRefNo(''); setFilterJournalAcct(''); setFilterMinAmt(''); setFilterMaxAmt('')
    setFilterDC('all'); setJournalPickMode(false); setSelectedJournalIds(new Set())
  }

  // -------------------------------------------------------------------------
  // Fetch
  // -------------------------------------------------------------------------
  const fetchData = useCallback(async () => {
    if (!periodLoaded) return
    setLoading(true); setError('')
    setFinancialData(null)
    setJournalRows([])
    setAccountRows([])
    setGroupRows([])
    setSchedRows([])
    const type = reportType || ''
    try {
      if (type === 'trial-balance' || type === 'trial-balance-detail') {
        const params: Record<string, string | boolean> = {
          periodEnding: dateTo,
          detailed: type === 'trial-balance-detail'
        }
        if (filterMode === 'range') {
          params.dateFrom = dateFrom
        }
        const r = await axios.get(`${API_BASE}/reports/trial-balance`, {
          params
        })
        setFinancialData({ kind: 'trial-balance', ...(r.data as object) })
      } else if (type === 'income-statement') {
        const params: Record<string, string> = { periodEnding: dateTo }
        if (filterMode === 'range') {
          params.dateFrom = dateFrom
        }
        const r = await axios.get(`${API_BASE}/reports/income-statement`, { params })
        setFinancialData({ kind: 'income-statement', ...(r.data as object) })
      } else if (type === 'balance-sheet' || type === 'subsidiary-schedule') {
        const r = await axios.get(`${API_BASE}/reports/balance-sheet`, { params: { periodEnding: dateTo } })
        setFinancialData({ kind: type, ...(r.data as object) })
      } else if (['receipts','sales','journals','purchase','adjustments'].includes(type)) {
        const ep = type === 'receipts' ? 'receipts'
                 : type === 'sales'    ? 'sales'
                 : type === 'journals' ? 'general'
                 : type === 'purchase' ? 'purchase'
                 :                       'adjustments'
        const [r, acctR] = await Promise.all([
          axios.get(`${API_BASE}/journals/${ep}`),
          axios.get(`${API_BASE}/accounts`),
        ])
        const descMap: Record<string, string> = {}
        for (const a of (acctR.data?.data ?? [])) {
          const code = String((a as Record<string, unknown>).acctCode ?? (a as Record<string, unknown>).acct_code ?? '')
          const desc = String((a as Record<string, unknown>).acctDesc ?? (a as Record<string, unknown>).acct_desc ?? '')
          if (code) descMap[code] = desc
        }
        setAcctDescMap(descMap)
        setJournalRows(filterByDate((r.data?.data ?? []).map(mapJournal), dateFrom, dateTo))
      } else if (['cdv','cds','cds-code'].includes(type)) {
        const [mastersRes, linesRes, acctR] = await Promise.all([
          axios.get(`${API_BASE}/vouchers/masters`),
          axios.get(`${API_BASE}/vouchers/lines`),
          axios.get(`${API_BASE}/accounts`),
        ])
        const descMap: Record<string, string> = {}
        for (const a of (acctR.data?.data ?? [])) {
          const code = String((a as Record<string, unknown>).acctCode ?? (a as Record<string, unknown>).acct_code ?? '')
          const desc = String((a as Record<string, unknown>).acctDesc ?? (a as Record<string, unknown>).acct_desc ?? '')
          if (code) descMap[code] = desc
        }
        setAcctDescMap(descMap)
        const masters = filterByDate<VoucherMaster>(
          (mastersRes.data?.data ?? []).map(mapVoucherMaster), dateFrom, dateTo
        )
        const allLines: VoucherLine[] = (linesRes.data?.data ?? []).map(mapVoucherLine)
        setVoucherMasters(masters)
        setVoucherLines(allLines)
      } else if (type === 'coa') {
        const r = await axios.get(`${API_BASE}/accounts`)
        setAccountRows((r.data?.data ?? []).map(mapAccount))
      } else if (type === 'groups') {
        const r = await axios.get(`${API_BASE}/group-codes`)
        setGroupRows(r.data?.data ?? [])
      } else if (type === 'schedules') {
        const r = await axios.get(`${API_BASE}/subsidiary-groups`)
        setSchedRows(r.data?.data ?? [])
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string }; status?: number }; message?: string }
      const status = err.response?.status ?? 0
      if (status === 401 || status === 404) {
        setError('') // 401/404 = unauthenticated or not yet bridged — silently show empty table
      } else {
        setError(`Failed to load report data: ${err.response?.data?.message ?? err.message ?? 'Unknown error'}`)
      }
    } finally {
      setLoading(false)
    }
  }, [reportType, dateFrom, dateTo, periodLoaded])

  useEffect(() => { if (periodLoaded) void fetchData() }, [fetchData, periodLoaded])

  // -------------------------------------------------------------------------
  // Derived data
  // -------------------------------------------------------------------------
  const type            = reportType || ''
  const isTransactional = ['receipts','sales','journals','purchase','adjustments'].includes(type)
  const isVoucher       = ['cdv','cds','cds-code'].includes(type)
  const isFinancial     = ['trial-balance','trial-balance-detail','income-statement','balance-sheet','subsidiary-schedule'].includes(type)
  const isCodeFile      = ['coa','groups','schedules'].includes(type)
  const isSnapshotOnly  = ['trial-balance','trial-balance-detail','income-statement','balance-sheet','subsidiary-schedule'].includes(type)
  const showDateFilter  = isTransactional || isVoucher || isFinancial
  // The legacy FS reports are month-snapshot based rather than historical year-range reports.
  const rangeCapable    = isTransactional || isVoucher
  const effectiveMode: 'asOf' | 'range' = rangeCapable ? filterMode : 'asOf'
  const showCustomize   = isTransactional || isVoucher

  // --- Apply CDV filters ---
  const filteredMasters = voucherMasters.filter(m => {
    if (filterCkNo && !m.jCkNo.toLowerCase().includes(filterCkNo.toLowerCase())) return false
    if (filterCdvNo && !m.jJvNo.toLowerCase().includes(filterCdvNo.toLowerCase())) return false
    if (filterPayee && !(m.jPayTo ?? '').toLowerCase().includes(filterPayee.toLowerCase())) return false
    if (filterAcctCode) {
      const hasAcct = voucherLines.some(l => l.jCkNo === m.jCkNo && l.acctCode.toLowerCase().includes(filterAcctCode.toLowerCase()))
      if (!hasAcct) return false
    }
    return true
  })

  // --- Apply Journal filters ---
  const filteredJournalRows = journalRows.filter(r => {
    if (journalPickMode && selectedJournalIds.size > 0 && !selectedJournalIds.has(r.id)) return false
    if (filterRefNo && !r.jJvNo.toLowerCase().includes(filterRefNo.toLowerCase())) return false
    if (filterJournalAcct && !r.acctCode.toLowerCase().includes(filterJournalAcct.toLowerCase())) return false
    if (filterMinAmt && r.jCkAmt < parseFloat(filterMinAmt)) return false
    if (filterMaxAmt && r.jCkAmt > parseFloat(filterMaxAmt)) return false
    if (filterDC !== 'all' && r.jDOrC.toUpperCase() !== filterDC) return false
    return true
  })

  const activeFilterCount = (
    (filterCkNo ? 1 : 0) + (filterCdvNo ? 1 : 0) + (filterPayee ? 1 : 0) + (filterAcctCode ? 1 : 0) +
    (filterRefNo ? 1 : 0) + (filterJournalAcct ? 1 : 0) + (filterMinAmt ? 1 : 0) + (filterMaxAmt ? 1 : 0) +
    (filterDC !== 'all' ? 1 : 0) + (journalPickMode && selectedJournalIds.size > 0 ? 1 : 0)
  )

  const voucherTotal = filteredMasters.reduce((s, r) => s + r.jCkAmt, 0)

  const validCheckNos = new Set(filteredMasters.map(m => m.jCkNo))
  interface CodeGroup { acctCode: string; description: string; count: number; debit: number; credit: number }
  const byCode: Record<string, CodeGroup> = {}
  if (type === 'cds') {
    for (const line of voucherLines) {
      if (!validCheckNos.has(line.jCkNo)) continue
      if (!byCode[line.acctCode]) {
        byCode[line.acctCode] = {
          acctCode: line.acctCode,
          description: acctDescMap[line.acctCode] ?? '',
          count: 0, debit: 0, credit: 0
        }
      }
      byCode[line.acctCode].count++
      if (line.jDOrC.toUpperCase() === 'D') byCode[line.acctCode].debit  += line.jCkAmt
      else                                   byCode[line.acctCode].credit += line.jCkAmt
    }
  }
  const cdsCodeRows = Object.values(byCode).sort((a, b) => a.acctCode.localeCompare(b.acctCode))

  const totalDebit  = filteredJournalRows.reduce((s, r) => s + (r.jDOrC.toUpperCase() === 'D' ? r.jCkAmt : 0), 0)
  const totalCredit = filteredJournalRows.reduce((s, r) => s + (r.jDOrC.toUpperCase() === 'C' ? r.jCkAmt : 0), 0)

  const periodLabel = !showDateFilter
    ? `As of: ${new Date().toLocaleDateString()}`
    : (type === 'balance-sheet' || type === 'subsidiary-schedule')
      ? `As of active snapshot: ${fmtDate(dateTo)}`
      : effectiveMode === 'asOf'
      ? `As of: ${fmtDate(dateTo)}`
      : `Period: ${fmtDate(dateFrom)} \u2013 ${fmtDate(dateTo)}`

  // -------------------------------------------------------------------------
  // Export handlers
  // -------------------------------------------------------------------------
  const doExport = useCallback((format: 'csv' | 'xlsx' | 'pdf') => {
    const subtitle = periodLabel

    if (isTransactional) {
      const cols: ExportCol[] = [
        { header: 'Ln',          key: 'lnStr',     width: 6  },
        { header: 'Date',        key: 'jDateStr',  width: 14 },
        { header: 'Reference',   key: 'jJvNo',     width: 14 },
        { header: 'Description', key: 'acctDesc',  width: 34 },
        { header: 'Acct#',       key: 'acctCode',  width: 12 },
        { header: 'Debit',       key: 'debitStr',  width: 16, numeric: true },
        { header: 'Credit',      key: 'creditStr', width: 16, numeric: true },
      ]
      const rows = filteredJournalRows.map((r, idx) => ({
        lnStr: String(idx + 1), jDateStr: fmtDate(r.jDate), jJvNo: r.jJvNo,
        acctDesc: acctDescMap[r.acctCode] ?? '', acctCode: r.acctCode,
        debitStr:  r.jDOrC.toUpperCase() === 'D' ? fmt(r.jCkAmt) : '',
        creditStr: r.jDOrC.toUpperCase() === 'C' ? fmt(r.jCkAmt) : '',
      }))
      const footer = { lnStr: '', jDateStr: 'TOTALS', jJvNo: '', acctDesc: '', acctCode: '',
        debitStr: fmt(totalDebit), creditStr: fmt(totalCredit) }
      if (format === 'csv')  exportTableCSV(reportTitle, cols, rows)
      if (format === 'xlsx') exportTableXLSX(reportTitle, cols, rows)
      if (format === 'pdf')  exportTablePDF(reportTitle, subtitle, cols, rows, footer)
      return
    }

    if (type === 'cdv') {
      const cols: ExportCol[] = [
        { header: 'Date',        key: 'jDateStr',  width: 18 },
        { header: 'CDV No.',     key: 'jJvNo',     width: 15 },
        { header: 'Payee',       key: 'jPayTo',    width: 44 },
      ]
      if (includeCheckNo) {
        cols.push({ header: 'Check No.',   key: 'jCkNo',     width: 15 })
      }
      cols.push(
        { header: 'Debit',       key: 'debit',     width: 18, numeric: true },
        { header: 'Credit',      key: 'credit',    width: 18, numeric: true }
      )
      
      const rows: any[] = []
      filteredMasters.forEach(master => {
        const lines = voucherLines.filter(l => l.jCkNo === master.jCkNo)
        const linDebit  = lines.filter(l => l.jDOrC.toUpperCase() === 'D').reduce((s, l) => s + l.jCkAmt, 0)
        const linCredit = lines.filter(l => l.jDOrC.toUpperCase() === 'C').reduce((s, l) => s + l.jCkAmt, 0)

        // Master Row
        rows.push({
          jDateStr: fmtDate(master.jDate),
          jJvNo: master.jJvNo,
          jPayTo: master.jPayTo ?? '',
          jCkNo: includeCheckNo ? (master.jCkNo ?? '') : '',
          debit: '',
          credit: ''
        })

        // Detail Lines
        lines.forEach(l => {
          rows.push({
            jDateStr: '',
            jJvNo: '',
            jPayTo: `${l.acctCode}  ${acctDescMap[l.acctCode] ?? ''}`,
            jCkNo: '',
            debit: l.jDOrC.toUpperCase() === 'D' ? fmt(l.jCkAmt) : '',
            credit:  l.jDOrC.toUpperCase() === 'C' ? fmt(l.jCkAmt) : ''
          })
        })

        // Subtotals/Remarks Row
        rows.push({
          jDateStr: master.jDesc ? `Remarks: ${master.jDesc}` : '',
          jJvNo: '',
          jPayTo: 'Totals ->',
          jCkNo: '',
          debit: fmt(linDebit),
          credit: fmt(linCredit)
        })

        // Unbalanced Warning if any
        if (Math.abs(linDebit - linCredit) > 0.01) {
          rows.push({
            jDateStr: '', jJvNo: '',
            jPayTo: '*** WARNING: UNBALANCED ***',
            jCkNo: '', debit: '', credit: ''
          })
        }
      })

      if (format === 'csv')  exportTableCSV(reportTitle, cols, rows)
      if (format === 'xlsx') exportTableXLSX(reportTitle, cols, rows)
      if (format === 'pdf')  exportVouchersPDF(filteredMasters, voucherLines, readSelectedCompanyName(), acctDescMap, includeCheckNo, includeSignatories)
      return
    }

    if (type === 'cds') {
      const cols: ExportCol[] = [
        { header: 'Acct#',         key: 'acctCode',    width: 8  },
        { header: 'Description',   key: 'description', width: 32 },
        { header: '# of Records',  key: 'countStr',    width: 12, numeric: true },
        { header: 'Debit',         key: 'debitStr',    width: 18, numeric: true },
        { header: 'Credit',        key: 'creditStr',   width: 18, numeric: true },
      ]
      const rows = cdsCodeRows.map(g => ({
        acctCode: g.acctCode, description: g.description, countStr: String(g.count),
        debitStr: fmt(g.debit), creditStr: fmt(g.credit),
      }))
      const totD = cdsCodeRows.reduce((s, g) => s + g.debit, 0)
      const totC = cdsCodeRows.reduce((s, g) => s + g.credit, 0)
      const totN = cdsCodeRows.reduce((s, g) => s + g.count, 0)
      const footer = { acctCode: '', description: 'TOTAL', countStr: String(totN), debitStr: fmt(totD), creditStr: fmt(totC) }
      if (format === 'csv')  exportTableCSV(reportTitle, cols, rows)
      if (format === 'xlsx') exportTableXLSX(reportTitle, cols, rows)
      if (format === 'pdf')  exportTablePDF(reportTitle, subtitle, cols, rows, footer)
      return
    }

    if (type === 'trial-balance' || type === 'trial-balance-detail') {
      if (!financialData) return
      const lines = (financialData.lines as Record<string, unknown>[]) ?? []
      const cols: ExportCol[] = [
        { header: 'Code',           key: 'accountCode',        width: 14 },
        { header: 'Description',    key: 'accountDescription', width: 32 },
        { header: 'Open Balance',   key: 'openingBalStr',      width: 16, numeric: true },
        { header: 'Debit',          key: 'debitMovStr',        width: 16, numeric: true },
        { header: 'Credit',         key: 'creditMovStr',       width: 16, numeric: true },
        { header: 'Ending Balance', key: 'endingBalStr',       width: 16, numeric: true },
      ]
      const rows = lines.map(l => ({
        accountCode: l.accountCode, accountDescription: l.accountDescription,
        openingBalStr: fmt(parseFloat(String(l.openingBalance ?? 0))),
        debitMovStr:   fmt(parseFloat(String(l.debitMovement ?? 0))),
        creditMovStr:  fmt(parseFloat(String(l.creditMovement ?? 0))),
        endingBalStr:  fmt(parseFloat(String(l.endingBalance ?? 0))),
      }))
      const footer = { accountCode: 'TOTALS', accountDescription: '', openingBalStr: '',
        debitMovStr: fmt(parseFloat(String(financialData.totalDebit ?? 0))),
        creditMovStr: fmt(parseFloat(String(financialData.totalCredit ?? 0))), endingBalStr: '' }
      if (format === 'csv')  exportTableCSV(reportTitle, cols, rows)
      if (format === 'xlsx') exportTableXLSX(reportTitle, cols, rows)
      if (format === 'pdf')  exportTablePDF(reportTitle, subtitle, cols, rows, footer)
      return
    }

    if (type === 'income-statement') {
      if (!financialData) return
      const isCols: ExportCol[] = [
        { header: 'Acct#',       key: 'accountCode',        width: 10 },
        { header: 'Description', key: 'accountDescription', width: 34 },
        { header: 'This Month',  key: 'thisMonthStr',       width: 18, numeric: true },
        { header: 'Ratio',       key: 'ratioStr',           width: 8,  numeric: true },
        { header: 'To Date',     key: 'toDateStr',          width: 18, numeric: true },
        { header: 'Ratio',       key: 'ratioDateStr',       width: 8,  numeric: true },
      ]
      const mapIS = (ls: Record<string, unknown>[]) => ls.map(l => ({
        accountCode: l.accountCode, accountDescription: l.accountDescription,
        thisMonthStr: fmt(parseFloat(String(l.thisMonthAmount ?? 0))),
        ratioStr:     parseFloat(String(l.thisMonthRatio ?? 0)).toFixed(2),
        toDateStr:    fmt(parseFloat(String(l.toDateAmount ?? 0))),
        ratioDateStr: parseFloat(String(l.toDateRatio ?? 0)).toFixed(2),
      }))
      const sections: FinSection[] = [
        { heading: 'GROSS INCOME',         cols: isCols, rows: mapIS((financialData.incomeLines  as Record<string, unknown>[]) ?? []),
          totalRow: { accountCode: '', accountDescription: 'GROSS INCOME BEFORE MO.VAR:', thisMonthStr: fmt(parseFloat(String(financialData.grossIncome ?? 0))), ratioStr: parseFloat(String(financialData.grossIncomeRatio ?? 0)).toFixed(2), toDateStr: fmt(parseFloat(String(financialData.grossIncomeToDate ?? 0))), ratioDateStr: parseFloat(String(financialData.grossIncomeToDateRatio ?? 0)).toFixed(2) } },
        { heading: 'MFG OVERHEAD VARIANCE', cols: isCols, rows: mapIS((financialData.expenseLines as Record<string, unknown>[]) ?? []),
          totalRow: { accountCode: '', accountDescription: 'TOTAL MFG OVERHEAD VAR:',     thisMonthStr: fmt(parseFloat(String(financialData.totalExpenses ?? 0))),  ratioStr: parseFloat(String(financialData.totalExpensesRatio ?? 0)).toFixed(2), toDateStr: fmt(parseFloat(String(financialData.totalExpensesToDate ?? 0))), ratioDateStr: parseFloat(String(financialData.totalExpensesToDateRatio ?? 0)).toFixed(2) } },
        { heading: 'NET RESULT', cols: isCols, rows: [{ accountCode: '', accountDescription: 'TOTAL NET INCOME:', thisMonthStr: fmt(parseFloat(String(financialData.netIncome ?? 0))), ratioStr: parseFloat(String(financialData.netIncomeRatio ?? 0)).toFixed(2), toDateStr: fmt(parseFloat(String(financialData.netIncomeToDate ?? 0))), ratioDateStr: parseFloat(String(financialData.netIncomeToDateRatio ?? 0)).toFixed(2) }] },
      ]
      if (format === 'csv')  exportFinancialCSV(reportTitle, subtitle, sections)
      if (format === 'xlsx') exportFinancialXLSX(reportTitle, subtitle, sections)
      if (format === 'pdf')  exportFinancialPDF(reportTitle, subtitle, sections)
      return
    }

    if (type === 'balance-sheet') {
      if (!financialData) return
      const bsCols: ExportCol[] = [
        { header: 'Code',        key: 'accountCode', width: 14 },
        { header: 'Description', key: 'description', width: 36 },
        { header: 'Amount',      key: 'amountStr',   width: 18, numeric: true },
      ]
      const mapBS = (ls: Record<string, unknown>[]) => ls.map(l => ({
        accountCode: l.accountCode,
        description: l.description,
        amountStr: fmt(parseFloat(String(l.amount ?? 0))),
      }))
      const mkn = (k: string) => fmt(parseFloat(String(financialData[k] ?? 0)))
      const sections: FinSection[] = [
        { heading: 'CURRENT ASSETS',          cols: bsCols, rows: mapBS((financialData.currentAssets        as Record<string, unknown>[]) ?? []), totalRow: { accountCode: '', description: 'TOTAL CURRENT ASSETS',         amountStr: mkn('totalCurrentAssets') } },
        { heading: 'FIXED ASSETS',            cols: bsCols, rows: mapBS((financialData.fixedAssets          as Record<string, unknown>[]) ?? []), totalRow: { accountCode: '', description: 'TOTAL FIXED ASSETS',           amountStr: mkn('totalFixedAssets') } },
        { heading: 'OTHER ASSETS',            cols: bsCols, rows: mapBS((financialData.otherAssets          as Record<string, unknown>[]) ?? []), totalRow: { accountCode: '', description: 'TOTAL OTHER ASSETS',           amountStr: mkn('totalOtherAssets') } },
        { heading: 'TOTAL ASSETS SUMMARY',    cols: bsCols, rows: [], totalRow: { accountCode: '', description: 'TOTAL ASSETS',                    amountStr: mkn('totalAssets') } },
        { heading: 'CURRENT LIABILITIES',     cols: bsCols, rows: mapBS((financialData.currentLiabilities   as Record<string, unknown>[]) ?? []), totalRow: { accountCode: '', description: 'TOTAL CURRENT LIABILITIES',    amountStr: mkn('totalCurrentLiabilities') } },
        { heading: 'DEFERRED LIABILITIES',    cols: bsCols, rows: mapBS((financialData.deferredLiabilities  as Record<string, unknown>[]) ?? []), totalRow: { accountCode: '', description: 'TOTAL DEFERRED LIABILITIES',   amountStr: mkn('totalDeferredLiabilities') } },
        { heading: "STOCKHOLDER'S EQUITY",    cols: bsCols, rows: mapBS([...((financialData.capitalAccounts as Record<string, unknown>[]) ?? []), ...((financialData.earningsAccounts as Record<string, unknown>[]) ?? [])]), totalRow: { accountCode: '', description: 'TOTAL EQUITY',                 amountStr: mkn('totalEquity') } },
        { heading: 'TOTAL LIABILITY & EQUITY SUMMARY', cols: bsCols, rows: [], totalRow: { accountCode: '', description: 'TOTAL LIABILITY & EQUITY', amountStr: mkn('totalLiabilitiesAndEquity') } },
      ]
      if (format === 'csv')  exportFinancialCSV(reportTitle, subtitle, sections)
      if (format === 'xlsx') exportFinancialXLSX(reportTitle, subtitle, sections)
      if (format === 'pdf')  exportFinancialPDF(reportTitle, subtitle, sections)
      return
    }

    if (type === 'subsidiary-schedule') {
      if (!financialData) return
      const hsCols: ExportCol[] = [
        { header: 'Description', key: 'description', width: 44 },
        { header: 'Amount',      key: 'amountStr',   width: 22, numeric: true },
      ]
      const schedules = (financialData.subsidiarySchedules as any[]) ?? []
      const sections: FinSection[] = schedules.map(sec => ({
        heading: sec.glHead,
        cols: hsCols,
        rows: (sec.lines || []).map((l: any) => ({
          description: l.description,
          amountStr: fmt(parseFloat(String(l.amount ?? 0)))
        })),
        totalRow: { description: 'TOTAL', amountStr: fmt(parseFloat(String(sec.total ?? 0))) }
      }))

      if (format === 'csv')  exportFinancialCSV(reportTitle, subtitle, sections)
      if (format === 'xlsx') exportFinancialXLSX(reportTitle, subtitle, sections)
      if (format === 'pdf')  exportFinancialPDF(reportTitle, subtitle, sections)
      return
    }

    if (type === 'coa') {
      const cols: ExportCol[] = [
        { header: 'Acct#',        key: 'acctCode',  width: 8  },
        { header: 'Description',  key: 'acctDesc',  width: 32 },
        { header: 'Report Code',  key: 'glReport',  width: 12 },
        { header: 'Report Group', key: 'glEffect',  width: 12 },
        { header: 'Formula',      key: 'formula',   width: 10 },
      ]
      const rows = accountRows.map(r => ({
        acctCode: r.acctCode, acctDesc: r.acctDesc,
        glReport: r.glReport ?? '', glEffect: r.glEffect ?? '', formula: r.formula,
      }))
      if (format === 'csv')  exportTableCSV(reportTitle, cols, rows)
      if (format === 'xlsx') exportTableXLSX(reportTitle, cols, rows)
      if (format === 'pdf')  exportTablePDF(reportTitle, subtitle, cols, rows)
      return
    }

    if (type === 'groups') {
      const cols: ExportCol[] = [
        { header: 'Report Code', key: 'glReport', width: 14 },
        { header: 'Effect',      key: 'glEffect', width: 14 },
        { header: 'Description', key: 'glHead',   width: 36 },
      ]
      const rows = groupRows.map(r => ({ glReport: r.glReport, glEffect: r.glEffect, glHead: r.glHead ?? '' }))
      if (format === 'csv')  exportTableCSV(reportTitle, cols, rows)
      if (format === 'xlsx') exportTableXLSX(reportTitle, cols, rows)
      if (format === 'pdf')  exportTablePDF(reportTitle, subtitle, cols, rows)
      return
    }

    if (type === 'schedules') {
      const cols: ExportCol[] = [
        { header: 'Schedule Group', key: 'glHead',   width: 22 },
        { header: 'Account Code',   key: 'acctCode', width: 14 },
        { header: 'Description',    key: 'acctDesc', width: 36 },
      ]
      const rows = schedRows.map(r => ({ glHead: r.glHead, acctCode: r.acctCode, acctDesc: r.acctDesc ?? '' }))
      if (format === 'csv')  exportTableCSV(reportTitle, cols, rows)
      if (format === 'xlsx') exportTableXLSX(reportTitle, cols, rows)
      if (format === 'pdf')  exportTablePDF(reportTitle, subtitle, cols, rows)
    }
  }, [
    type, reportTitle, periodLabel,
    journalRows, voucherMasters, voucherLines, cdsCodeRows, acctDescMap,
    accountRows, groupRows, schedRows, financialData,
    totalDebit, totalCredit, voucherTotal, isTransactional,
  ])

  const hasData = !loading && (
    filteredJournalRows.length > 0 || filteredMasters.length > 0 ||
    accountRows.length > 0 || groupRows.length > 0 || schedRows.length > 0 ||
    financialData !== null
  )

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="flex flex-col gap-6 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-2">
      <PageHeader 
        breadcrumb="REPORTS & INQUIRIES" 
        title={reportTitle} 
        subtitle={`Generate, view, and export ${reportTitle}.`}
      />

      {/* Period controls */}
      {showDateFilter && !isSnapshotOnly && (
        <div style={{ background: 'var(--background)', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
          <div style={{ margin: '0 0 12px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
            Period
          </div>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            {rangeCapable && (
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Filter</label>
                <select
                  className="form-input"
                  value={effectiveMode}
                  onChange={e => {
                    const m = e.target.value as 'asOf' | 'range'
                    setFilterMode(m)
                    if (m === 'asOf') setDateFrom(periodBeg)
                  }}
                >
                  <option value="asOf">As of date</option>
                  <option value="range">Date range</option>
                </select>
              </div>
            )}
            {effectiveMode === 'range' ? (
              <>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Date From</label>
                  <input type="date" className="form-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Date To</label>
                  <input type="date" className="form-input" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                </div>
              </>
            ) : (
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">As of</label>
                <input
                  type="date"
                  className="form-input"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  disabled={type === 'balance-sheet' || type === 'subsidiary-schedule'}
                />
                {(type === 'balance-sheet' || type === 'subsidiary-schedule') && (
                  <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    This report follows the active fiscal snapshot and does not support historical year filtering.
                  </div>
                )}
              </div>
            )}
            <button className="btn btn-secondary" onClick={() => void fetchData()} disabled={loading}>
              {loading ? 'Loading...' : '\u21BA Refresh'}
            </button>
          </div>
        </div>
      )}

      {/* Customize Report Panel */}
      {showCustomize && (
        <div style={{ background: 'var(--background)', borderRadius: '8px', marginBottom: '20px', border: '1px solid var(--border)' }}>
          <button
            onClick={() => setShowFilters(prev => !prev)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px', background: 'transparent', border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'inherit'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>tune</span>
              Customize Report
              {activeFilterCount > 0 && (
                <span style={{
                  background: '#3b82f6', color: '#fff', fontSize: '10px', fontWeight: 800,
                  borderRadius: '10px', padding: '1px 7px', minWidth: '18px', textAlign: 'center'
                }}>{activeFilterCount}</span>
              )}
            </span>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', transition: 'transform 0.2s', transform: showFilters ? 'rotate(180deg)' : 'rotate(0)' }}>expand_more</span>
          </button>

          {showFilters && (
            <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)' }}>
              {/* CDV Filters */}
              {isVoucher && (
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end', paddingTop: '12px' }}>
                  <div className="form-group" style={{ margin: 0, minWidth: '140px' }}>
                    <label className="form-label">Check No.</label>
                    <input type="text" className="form-input" placeholder="e.g. 001234" value={filterCkNo} onChange={e => setFilterCkNo(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ margin: 0, minWidth: '140px' }}>
                    <label className="form-label">CDV No.</label>
                    <input type="text" className="form-input" placeholder="e.g. CDV-001" value={filterCdvNo} onChange={e => setFilterCdvNo(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ margin: 0, minWidth: '180px' }}>
                    <label className="form-label">Payee</label>
                    <input type="text" className="form-input" placeholder="Search payee..." value={filterPayee} onChange={e => setFilterPayee(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ margin: 0, minWidth: '140px' }}>
                    <label className="form-label">Account Code</label>
                    <input type="text" className="form-input" placeholder="e.g. 1010" value={filterAcctCode} onChange={e => setFilterAcctCode(e.target.value)} />
                  </div>
                  {activeFilterCount > 0 && (
                    <button className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: '11px' }} onClick={clearAllFilters}>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span> Clear All
                    </button>
                  )}
                </div>
              )}

              {isVoucher && (
                <div style={{ display: 'flex', gap: '16px', marginTop: '12px', padding: '8px 0', borderTop: '1px dashed var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input 
                      type="checkbox" 
                      id="reportIncludeCheckNo" 
                      checked={includeCheckNo} 
                      onChange={e => setIncludeCheckNo(e.target.checked)} 
                      style={{ cursor: 'pointer' }}
                    />
                    <label htmlFor="reportIncludeCheckNo" style={{ fontSize: '12px', fontWeight: 600, cursor: 'pointer', color: 'var(--text-primary)' }}>
                      Include Check Number
                    </label>
                  </div>
                  {type === 'cdv' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input 
                        type="checkbox" 
                        id="reportIncludeSignatories" 
                        checked={includeSignatories} 
                        onChange={e => setIncludeSignatories(e.target.checked)} 
                        style={{ cursor: 'pointer' }}
                      />
                      <label htmlFor="reportIncludeSignatories" style={{ fontSize: '12px', fontWeight: 600, cursor: 'pointer', color: 'var(--text-primary)' }}>
                        Include Signatories
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* Custom Print Builder */}
              {type === 'cdv' && printBuilderEnabled && (
                <div style={{ marginTop: '16px', padding: '12px', background: 'var(--surface-default)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      Stack CDVs directly to construct a customized PDF layout. Type Payee or CDV# to search, or use the dropdown.
                    </div>

                    <datalist id="cdv-options">
                      {voucherMasters.map(m => (
                        <option key={m.id} value={`${m.jJvNo} — ${m.jPayTo} (Check: ${m.jCkNo})`} />
                      ))}
                    </datalist>

                    {printBuilderPages.map((pageMasterId, idx) => {
                      const mMatch = typeof pageMasterId === 'number' ? voucherMasters.find(m => m.id === pageMasterId) : null
                      const displayVal = mMatch ? `${mMatch.jJvNo} — ${mMatch.jPayTo} (Check: ${mMatch.jCkNo})` : String(pageMasterId)
                      return (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--background)', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', width: '60px' }}>Page {idx + 1}</span>
                          <input 
                            className="form-input" 
                            style={{ flex: 1, padding: '4px 8px', fontSize: '13px', height: 'auto' }}
                            list="cdv-options"
                            placeholder="Type to search Payee, CDV, or Check No..."
                            value={displayVal}
                            onChange={e => {
                              const newPages = [...printBuilderPages]
                              const match = voucherMasters.find(m => `${m.jJvNo} — ${m.jPayTo} (Check: ${m.jCkNo})` === e.target.value)
                              newPages[idx] = match ? match.id : e.target.value
                              setPrintBuilderPages(newPages)
                            }}
                          />
                          <button 
                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                            onClick={() => {
                              const newPages = [...printBuilderPages]
                              newPages.splice(idx, 1)
                              setPrintBuilderPages(newPages)
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                          </button>
                        </div>
                      )
                    })}

                    <div style={{ marginTop: '4px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => setPrintBuilderPages([...printBuilderPages, voucherMasters[0]?.id || ''])}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span> Add Next Page
                      </button>
                      <button
                        className="btn btn-primary"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => {
                          const mastersToPrint = printBuilderPages
                            .map(v => typeof v === 'number' ? voucherMasters.find(m => m.id === v) : null)
                            .filter((m): m is VoucherMaster => Boolean(m))
                          if (mastersToPrint.length > 0) {
                            exportVouchersPDF(mastersToPrint, voucherLines, readSelectedCompanyName(), acctDescMap, includeCheckNo, includeSignatories)
                          }
                        }}
                        disabled={printBuilderPages.length === 0}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>print</span> Print Custom Document
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Journal Filters */}
              {isTransactional && (
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end', paddingTop: '12px' }}>
                  <div className="form-group" style={{ margin: 0, minWidth: '140px' }}>
                    <label className="form-label">Reference No.</label>
                    <input type="text" className="form-input" placeholder="e.g. JV-001" value={filterRefNo} onChange={e => setFilterRefNo(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ margin: 0, minWidth: '140px' }}>
                    <label className="form-label">Account Code</label>
                    <input type="text" className="form-input" placeholder="e.g. 1010" value={filterJournalAcct} onChange={e => setFilterJournalAcct(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ margin: 0, minWidth: '110px' }}>
                    <label className="form-label">Min Amount</label>
                    <input type="number" className="form-input" placeholder="0.00" value={filterMinAmt} onChange={e => setFilterMinAmt(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ margin: 0, minWidth: '110px' }}>
                    <label className="form-label">Max Amount</label>
                    <input type="number" className="form-input" placeholder="999999" value={filterMaxAmt} onChange={e => setFilterMaxAmt(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ margin: 0, minWidth: '100px' }}>
                    <label className="form-label">Type</label>
                    <select className="form-input" value={filterDC} onChange={e => setFilterDC(e.target.value as 'all'|'D'|'C')}>
                      <option value="all">All</option>
                      <option value="D">Debit Only</option>
                      <option value="C">Credit Only</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingBottom: '2px' }}>
                    <input type="checkbox" id="pickModeJournal" checked={journalPickMode} onChange={e => { setJournalPickMode(e.target.checked); if (!e.target.checked) setSelectedJournalIds(new Set()) }} />
                    <label htmlFor="pickModeJournal" style={{ fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Manual Pick</label>
                  </div>
                  {activeFilterCount > 0 && (
                    <button className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: '11px' }} onClick={clearAllFilters}>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span> Clear All
                    </button>
                  )}
                </div>
              )}

              {/* Filter summary */}
              {activeFilterCount > 0 && (
                <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: '4px' }}>filter_list</span>
                  Showing {isVoucher ? `${filteredMasters.length} of ${voucherMasters.length} voucher(s)` : `${filteredJournalRows.length} of ${journalRows.length} record(s)`} matching your filters.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <div style={{ padding: '10px', background: '#fee2e2', color: '#991b1b', borderRadius: '4px', marginBottom: '16px', fontSize: '13px' }}>
          {error}
        </div>
      )}
      {loading && <p style={{ color: 'var(--text-secondary)' }}>Loading report data\u2026</p>}

      {/* Export Toolbar */}
      {hasData && (
        <ExportBar
          onCSV={() => doExport('csv')}
          onXLSX={() => doExport('xlsx')}
          onPDF={() => doExport('pdf')}
        />
      )}

      {/* TRANSACTIONAL JOURNALS */}
      {!loading && isTransactional && (
        <div style={{ overflowX: 'auto' }}>
          <p className="subtitle" style={{ marginBottom: '8px' }}>
            {filteredJournalRows.length} record(s){filteredJournalRows.length !== journalRows.length ? ` (filtered from ${journalRows.length})` : ''} | {periodLabel}
          </p>
          <table className="data-table">
            <thead>
              <tr>
                {journalPickMode && <th style={{ width: '32px' }}>
                  <input type="checkbox" checked={filteredJournalRows.length > 0 && filteredJournalRows.every(r => selectedJournalIds.has(r.id))} onChange={e => {
                    if (e.target.checked) setSelectedJournalIds(new Set(filteredJournalRows.map(r => r.id)))
                    else setSelectedJournalIds(new Set())
                  }} />
                </th>}
                <th style={{ width: '44px' }}>Ln</th>
                <th>Date</th><th>Reference</th><th>Description</th>
                <th>Acct#</th>
                <th style={{ textAlign: 'right' }}>Debit</th>
                <th style={{ textAlign: 'right' }}>Credit</th>
              </tr>
            </thead>
            <tbody>
              {filteredJournalRows.length === 0 ? (
                <tr><td colSpan={journalPickMode ? 8 : 7} style={{ fontFamily: "'Consolas', monospace", padding: '8px 12px' }}>No records to print...</td></tr>
              ) : filteredJournalRows.map((r, idx) => (
                <tr key={r.id} style={journalPickMode && selectedJournalIds.has(r.id) ? { background: 'rgba(59,130,246,0.08)' } : undefined}>
                  {journalPickMode && (
                    <td style={{ width: '32px', textAlign: 'center' }}>
                      <input type="checkbox" checked={selectedJournalIds.has(r.id)} onChange={e => {
                        const next = new Set(selectedJournalIds)
                        if (e.target.checked) next.add(r.id); else next.delete(r.id)
                        setSelectedJournalIds(next)
                      }} />
                    </td>
                  )}
                  <td style={{ textAlign: 'right', fontFamily: "'Consolas', monospace" }}>{idx + 1}</td>
                  <td>{fmtDate(r.jDate)}</td>
                  <td style={{ fontFamily: "'Consolas', monospace" }}>{r.jJvNo}</td>
                  <td>{acctDescMap[r.acctCode] ?? ''}</td>
                  <td style={{ fontFamily: "'Consolas', monospace", fontWeight: 600 }}>{r.acctCode}</td>
                  <td style={{ textAlign: 'right', fontFamily: "'Consolas', monospace" }}>
                    {r.jDOrC.toUpperCase() === 'D' ? fmt(r.jCkAmt) : ''}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: "'Consolas', monospace" }}>
                    {r.jDOrC.toUpperCase() === 'C' ? fmt(r.jCkAmt) : ''}
                  </td>
                </tr>
              ))}
            </tbody>
            {filteredJournalRows.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={5} style={{ fontWeight: 700 }}>Totals</td>
                  <td style={{ textAlign: 'right', fontFamily: "'Consolas', monospace", fontWeight: 700 }}>{fmt(totalDebit)}</td>
                  <td style={{ textAlign: 'right', fontFamily: "'Consolas', monospace", fontWeight: 700 }}>{fmt(totalCredit)}</td>
                </tr>
                <tr>
                  <td colSpan={5} style={{ fontWeight: 700 }}>Balance</td>
                  <td colSpan={2} style={{ textAlign: 'right', fontFamily: "'Consolas', monospace", fontWeight: 700,
                    color: Math.abs(totalDebit - totalCredit) < 0.01 ? '#166534' : '#991b1b' }}>
                    {fmt(totalDebit - totalCredit)}
                    {Math.abs(totalDebit - totalCredit) < 0.01 && <span style={{ marginLeft: '8px', fontSize: '11px' }}>&#x2713; Balanced</span>}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* CDV REGISTER — tabular view matching A_REPVSM.PRG */}
      {!loading && type === 'cdv' && (
        <div style={{ overflowX: 'auto' }}>
          <p className="subtitle" style={{ marginBottom: '12px' }}>
            {filteredMasters.length} voucher(s){filteredMasters.length !== voucherMasters.length ? ` (filtered from ${voucherMasters.length})` : ''} | {periodLabel}
          </p>
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>CDV No.</th>
                <th>Payee</th>
                {includeCheckNo && <th>Check No.</th>}
                <th style={{ textAlign: 'right' }}>Debit</th>
                <th style={{ textAlign: 'right' }}>Credit</th>
              </tr>
            </thead>
            <tbody>
              {filteredMasters.length === 0 ? (
                <tr><td colSpan={includeCheckNo ? 6 : 5} style={{ fontFamily: "'Consolas', monospace" }}>No records matching filters...</td></tr>
              ) : filteredMasters.map(master => {
                const lines = voucherLines.filter(l => l.jCkNo === master.jCkNo)
                const linDebit  = lines.filter(l => l.jDOrC.toUpperCase() === 'D').reduce((s, l) => s + l.jCkAmt, 0)
                const linCredit = lines.filter(l => l.jDOrC.toUpperCase() === 'C').reduce((s, l) => s + l.jCkAmt, 0)
                return (
                  <Fragment key={master.id}>
                    {/* Master Header Row */}
                    <tr style={{ borderTop: '2px solid var(--border)' }}>
                      <td>{fmtDate(master.jDate)}</td>
                      <td style={{ fontFamily: "'Consolas', monospace", fontWeight: 600 }}>{master.jJvNo}</td>
                      <td style={{ fontWeight: 600 }}>{master.jPayTo}</td>
                      {includeCheckNo && <td style={{ fontFamily: "'Consolas', monospace" }}>{master.jCkNo}</td>}
                      <td></td>
                      <td></td>
                    </tr>
                    
                    {/* Detail Lines Area */}
                    {lines.map((l, li) => (
                      <tr key={`${master.id}-line-${li}`}>
                        <td colSpan={2}></td>
                        <td colSpan={includeCheckNo ? 2 : 1} style={{ padding: '4px 12px' }}>
                          <span style={{ fontFamily: "'Consolas', monospace", fontWeight: 600, marginRight: '8px' }}>{l.acctCode}</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{acctDescMap[l.acctCode] ?? ''}</span>
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: "'Consolas', monospace" }}>
                          {l.jDOrC.toUpperCase() === 'D' ? fmt(l.jCkAmt) : ''}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: "'Consolas', monospace" }}>
                          {l.jDOrC.toUpperCase() === 'C' ? fmt(l.jCkAmt) : ''}
                        </td>
                      </tr>
                    ))}

                    {/* Voucher Subtotal */}
                    <tr>
                      <td colSpan={2}>
                        {master.jDesc && (
                           <div style={{ color: 'var(--text-secondary)', fontSize: '11px', paddingLeft: '12px' }}>
                             <b>Remarks:</b> {master.jDesc}
                           </div>
                        )}
                      </td>
                      <td colSpan={includeCheckNo ? 2 : 1} style={{ textAlign: 'right', fontFamily: "'Consolas', monospace", color: 'var(--text-secondary)' }}>Totals &rarr;</td>
                      <td style={{ textAlign: 'right', fontFamily: "'Consolas', monospace", fontWeight: 600 }}>{fmt(linDebit)}</td>
                      <td style={{ textAlign: 'right', fontFamily: "'Consolas', monospace", fontWeight: 600 }}>{fmt(linCredit)}</td>
                    </tr>
                    
                    {/* Warning if unbalanced */}
                    {Math.abs(linDebit - linCredit) > 0.01 && (
                      <tr>
                        <td colSpan={2}></td>
                        <td colSpan={includeCheckNo ? 4 : 3} style={{ color: '#991b1b', fontWeight: 700, fontSize: '12px', padding: '4px 12px' }}>
                          ***** WARNING!!! TOTAL CREDIT IS NOT EQUAL TO TOTAL DEBIT! *****
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
            {filteredMasters.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={includeCheckNo ? 4 : 3} style={{ fontWeight: 700, fontSize: '14px', paddingTop: '16px' }}>GRAND TOTAL &rarr;</td>
                  <td style={{ textAlign: 'right', fontFamily: "'Consolas', monospace", fontWeight: 700, fontSize: '14px', paddingTop: '16px' }}>
                    {fmt(voucherMasters.reduce((s, m) => {
                      const lines = voucherLines.filter(l => l.jCkNo === m.jCkNo);
                      return s + lines.filter(l => l.jDOrC.toUpperCase() === 'D').reduce((s2, l) => s2 + l.jCkAmt, 0);
                    }, 0))}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: "'Consolas', monospace", fontWeight: 700, fontSize: '14px', paddingTop: '16px' }}>
                    {fmt(voucherMasters.reduce((s, m) => {
                      const lines = voucherLines.filter(l => l.jCkNo === m.jCkNo);
                      return s + lines.filter(l => l.jDOrC.toUpperCase() === 'C').reduce((s2, l) => s2 + l.jCkAmt, 0);
                    }, 0))}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* CDS BY CODE (per A_REPCDS.PRG) */}
      {!loading && type === 'cds' && (
        <div style={{ overflowX: 'auto' }}>
          <p className="subtitle" style={{ marginBottom: '8px' }}>
            {cdsCodeRows.length} account code(s) | {periodLabel}
          </p>
          <table className="data-table">
            <thead>
              <tr>
                <th>Acct#</th>
                <th>Description</th>
                <th style={{ textAlign: 'right' }}># of Records</th>
                <th style={{ textAlign: 'right' }}>Debit</th>
                <th style={{ textAlign: 'right' }}>Credit</th>
              </tr>
            </thead>
            <tbody>
              {cdsCodeRows.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No records found for this period.</td></tr>
              ) : cdsCodeRows.map(g => (
                <tr key={g.acctCode}>
                  <td style={{ fontFamily: "'Consolas', monospace", fontWeight: 600 }}>{g.acctCode}</td>
                  <td>{g.description}</td>
                  <td style={{ textAlign: 'right' }}>{g.count}</td>
                  <td style={{ textAlign: 'right', fontFamily: "'Consolas', monospace" }}>{fmt(g.debit)}</td>
                  <td style={{ textAlign: 'right', fontFamily: "'Consolas', monospace" }}>{fmt(g.credit)}</td>
                </tr>
              ))}
            </tbody>
            {cdsCodeRows.length > 0 && (() => {
              const totD = cdsCodeRows.reduce((s, g) => s + g.debit, 0)
              const totC = cdsCodeRows.reduce((s, g) => s + g.credit, 0)
              const totN = cdsCodeRows.reduce((s, g) => s + g.count, 0)
              return (
                <tfoot>
                  <tr>
                    <td colSpan={2} style={{ fontWeight: 700 }}>T O T A L S &rarr;</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{totN}</td>
                    <td style={{ textAlign: 'right', fontFamily: "'Consolas', monospace", fontWeight: 700 }}>{fmt(totD)}</td>
                    <td style={{ textAlign: 'right', fontFamily: "'Consolas', monospace", fontWeight: 700 }}>{fmt(totC)}</td>
                  </tr>
                </tfoot>
              )
            })()}
          </table>
        </div>
      )}

      {/* FINANCIAL STATEMENTS */}
      {!loading && isFinancial && financialData && (
        <FinancialStmtView data={financialData} />
      )}

      {/* COA (per A_REPCOD.PRG m_which=1) */}
      {!loading && type === 'coa' && (
        <div style={{ overflowX: 'auto' }}>
          <p className="subtitle" style={{ marginBottom: '8px' }}>{accountRows.length} account(s)</p>
          <table className="data-table">
            <thead>
              <tr>
                <th>Acct#</th><th>Description</th>
                <th>Report Code</th><th>Report Group</th><th>Formula</th>
              </tr>
            </thead>
            <tbody>
              {accountRows.map(r => (
                <tr key={r.id}>
                  <td style={{ fontFamily: "'Consolas', monospace", fontWeight: 600 }}>{r.acctCode}</td>
                  <td>{r.acctDesc}</td>
                  <td style={{ fontFamily: "'Consolas', monospace" }}>{r.glReport ?? ''}</td>
                  <td style={{ fontFamily: "'Consolas', monospace" }}>{r.glEffect ?? ''}</td>
                  <td style={{ fontFamily: "'Consolas', monospace" }}>{r.formula}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ACCOUNT GROUPINGS */}
      {!loading && type === 'groups' && (
        <div style={{ overflowX: 'auto' }}>
          <p className="subtitle" style={{ marginBottom: '8px' }}>{groupRows.length} group code(s)</p>
          <table className="data-table">
            <thead><tr><th>Report Code</th><th>Effect</th><th>Description</th></tr></thead>
            <tbody>
              {groupRows.map((r: GroupCodeRow) => (
                <tr key={r.id}>
                  <td style={{ fontFamily: "'Consolas', monospace", fontWeight: 600 }}>{r.glReport}</td>
                  <td style={{ fontFamily: "'Consolas', monospace" }}>{r.glEffect}</td>
                  <td>{r.glHead}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SUBSIDIARY SCHEDULES */}
      {!loading && type === 'schedules' && (
        <div style={{ overflowX: 'auto' }}>
          <p className="subtitle" style={{ marginBottom: '8px' }}>{schedRows.length} schedule entry(ies)</p>
          <table className="data-table">
            <thead><tr><th>Schedule Group</th><th>Account Code</th><th>Description</th></tr></thead>
            <tbody>
              {schedRows.map((r: ScheduleRow) => (
                <tr key={r.id}>
                  <td>{r.glHead}</td>
                  <td style={{ fontFamily: "'Consolas', monospace", fontWeight: 600 }}>{r.acctCode}</td>
                  <td>{r.acctDesc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && isCodeFile && accountRows.length === 0 && groupRows.length === 0 && schedRows.length === 0 && (
        <p style={{ color: 'var(--text-secondary)' }}>No data found.</p>
      )}
    </div>
  )
}

// ===========================================================================
// Financial Statement Sub-View
// ===========================================================================
function FinancialStmtView({ data }: { data: Record<string, unknown> }) {
  const kind = data.kind as string

  if (kind === 'trial-balance') {
    const lines = (data.lines as Record<string, unknown>[]) ?? []
    const isDetailed = Boolean(data.detailed)

    if (isDetailed) {
      // Detailed Trial Balance per A_REPDTB.PRG m_which=1
      // Format: Acct# + Description + Beg.Balance on first line,
      // then indented transaction rows (Date, Reference, Debit, Credit),
      // then Totals row if multiple transactions, then Ending Balance
      return (
        <div>
          <p className="subtitle" style={{ marginBottom: '8px' }}>
            Detailed Trial Balance for Period ending: {fmtDate(String(data.periodEnding ?? ''))}
            {' | '}
            {data.inBalance
              ? <span style={{ color: '#166534', fontWeight: 700 }}>&#x2713; In Balance</span>
              : <span style={{ color: '#991b1b', fontWeight: 700 }}>&#x26A0; OUT OF BALANCE</span>}
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>ACCT#</th><th>DESCRIPTION</th>
                  <th style={{ textAlign: 'right' }}>BEG.BALANCE</th>
                  <th>TRAN.DATE</th><th>REFERENCE</th>
                  <th style={{ textAlign: 'right' }}>DEBIT AMOUNT</th>
                  <th style={{ textAlign: 'right' }}>CREDIT AMOUNT</th>
                  <th style={{ textAlign: 'right' }}>ENDING BALANCE</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => {
                  const trans = (l.transactions as Record<string, unknown>[]) ?? []
                  const hasMulti = trans.length > 1
                  const totD = trans.reduce((s, t) => s + parseFloat(String(t.debitAmount ?? 0)), 0)
                  const totC = trans.reduce((s, t) => s + parseFloat(String(t.creditAmount ?? 0)), 0)
                  return (
                    <>
                      {/* Account header row */}
                      <tr key={`acct-${i}`} style={{ background: 'var(--panel-2)' }}>
                        <td style={{ fontFamily: "'Consolas', monospace", fontWeight: 600 }}>{String(l.accountCode ?? '')}</td>
                        <td>{String(l.accountDescription ?? '')}</td>
                        <td style={{ textAlign: 'right', fontFamily: "'Consolas', monospace" }}>{fmt(parseFloat(String(l.openingBalance ?? 0)))}</td>
                        <td colSpan={4} />
                        <td />
                      </tr>
                      {/* Transaction detail rows */}
                      {trans.map((t, ti) => (
                        <tr key={`trans-${i}-${ti}`}>
                          <td colSpan={3} />
                          <td style={{ paddingLeft: '20px', fontFamily: "'Consolas', monospace" }}>{fmtDate(String(t.transactionDate ?? ''))}</td>
                          <td style={{ fontFamily: "'Consolas', monospace" }}>{String(t.reference ?? '')}</td>
                          <td style={{ textAlign: 'right', fontFamily: "'Consolas', monospace" }}>
                            {parseFloat(String(t.debitAmount ?? 0)) > 0 ? fmt(parseFloat(String(t.debitAmount ?? 0))) : ''}
                          </td>
                          <td style={{ textAlign: 'right', fontFamily: "'Consolas', monospace" }}>
                            {parseFloat(String(t.creditAmount ?? 0)) > 0 ? fmt(parseFloat(String(t.creditAmount ?? 0))) : ''}
                          </td>
                          <td />
                        </tr>
                      ))}
                      {/* Totals row if multiple transactions */}
                      {hasMulti && (
                        <tr key={`tot-${i}`} style={{ fontStyle: 'italic' }}>
                          <td colSpan={5} style={{ textAlign: 'right', paddingRight: '10px', fontWeight: 700 }}>Totals &rarr;</td>
                          <td style={{ textAlign: 'right', fontFamily: "'Consolas', monospace", fontWeight: 700 }}>{fmt(totD)}</td>
                          <td style={{ textAlign: 'right', fontFamily: "'Consolas', monospace", fontWeight: 700 }}>{fmt(totC)}</td>
                          <td />
                        </tr>
                      )}
                      {/* Ending balance row with '*' marker */}
                      <tr key={`end-${i}`} style={{ borderBottom: '2px solid var(--border)' }}>
                        <td colSpan={7} />
                        <td style={{ textAlign: 'right', fontFamily: "'Consolas', monospace", fontWeight: 700 }}>
                          {fmt(parseFloat(String(l.endingBalance ?? 0)))} <span style={{ color: 'var(--text-secondary)' }}>*</span>
                        </td>
                      </tr>
                    </>
                  )
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} style={{ fontWeight: 700 }}>G.TOTALS &rarr;</td>
                  <td style={{ textAlign: 'right', fontFamily: "'Consolas', monospace", fontWeight: 700 }}>{fmt(parseFloat(String(data.totalDebit ?? 0)))}</td>
                  <td style={{ textAlign: 'right', fontFamily: "'Consolas', monospace", fontWeight: 700 }}>{fmt(parseFloat(String(data.totalCredit ?? 0)))}</td>
                  <td />
                </tr>
                {Math.abs(parseFloat(String(data.totalDebit ?? 0)) - parseFloat(String(data.totalCredit ?? 0))) > 0.01 && (
                  <tr>
                    <td colSpan={5} style={{ fontWeight: 700 }}>Balance &rarr;</td>
                    <td colSpan={3} style={{ textAlign: 'right', fontFamily: "'Consolas', monospace", fontWeight: 700 }}>
                      {fmt(parseFloat(String(data.totalDebit ?? 0)) - parseFloat(String(data.totalCredit ?? 0)))}
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
        </div>
      )
    }

    // Regular Trial Balance (not detailed)
    return (
      <div>
        <p className="subtitle" style={{ marginBottom: '8px' }}>
          Trial Balance for Period ending: {fmtDate(String(data.periodEnding ?? ''))}
          {' | '}
          {data.inBalance
            ? <span style={{ color: '#166534', fontWeight: 700 }}>&#x2713; In Balance</span>
            : <span style={{ color: '#991b1b', fontWeight: 700 }}>&#x26A0; OUT OF BALANCE</span>}
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>ACCT#</th><th>DESCRIPTION</th>
                <th style={{ textAlign: 'right' }}>BEG.BALANCE</th>
                <th style={{ textAlign: 'right' }}>DEBIT AMOUNT</th>
                <th style={{ textAlign: 'right' }}>CREDIT AMOUNT</th>
                <th style={{ textAlign: 'right' }}>ENDING BALANCE</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i}>
                  <td style={{ fontFamily: "'Consolas', monospace", fontWeight: 600 }}>{String(l.accountCode ?? '')}</td>
                  <td>{String(l.accountDescription ?? '')}</td>
                  <td style={{ textAlign: 'right', fontFamily: "'Consolas', monospace" }}>{fmt(parseFloat(String(l.openingBalance ?? 0)))}</td>
                  <td style={{ textAlign: 'right', fontFamily: "'Consolas', monospace" }}>{fmt(parseFloat(String(l.debitMovement ?? 0)))}</td>
                  <td style={{ textAlign: 'right', fontFamily: "'Consolas', monospace" }}>{fmt(parseFloat(String(l.creditMovement ?? 0)))}</td>
                  <td style={{ textAlign: 'right', fontFamily: "'Consolas', monospace", fontWeight: 700 }}>{fmt(parseFloat(String(l.endingBalance ?? 0)))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} style={{ fontWeight: 700 }}>G.TOTALS &rarr;</td>
                <td style={{ textAlign: 'right', fontFamily: "'Consolas', monospace", fontWeight: 700 }}>{fmt(parseFloat(String(data.totalDebit ?? 0)))}</td>
                <td style={{ textAlign: 'right', fontFamily: "'Consolas', monospace", fontWeight: 700 }}>{fmt(parseFloat(String(data.totalCredit ?? 0)))}</td>
                <td />
              </tr>
              {Math.abs(parseFloat(String(data.totalDebit ?? 0)) - parseFloat(String(data.totalCredit ?? 0))) > 0.01 && (
                <tr>
                  <td colSpan={3} style={{ fontWeight: 700 }}>Balance &rarr;</td>
                  <td colSpan={3} style={{ textAlign: 'right', fontFamily: "'Consolas', monospace", fontWeight: 700 }}>
                    {fmt(parseFloat(String(data.totalDebit ?? 0)) - parseFloat(String(data.totalCredit ?? 0)))}
                  </td>
                </tr>
              )}
            </tfoot>
          </table>
        </div>
      </div>
    )
  }

  if (kind === 'income-statement') {
    const incLines = (data.incomeLines  as Record<string, unknown>[]) ?? []
    const expLines = (data.expenseLines as Record<string, unknown>[]) ?? []
    const netAmt       = parseFloat(String(data.netIncome        ?? 0))
    const netDateAmt   = parseFloat(String(data.netIncomeToDate  ?? 0))
    const netRatio     = parseFloat(String(data.netIncomeRatio        ?? 0))
    const netRatioDate = parseFloat(String(data.netIncomeToDateRatio  ?? 0))
    const isHead = (
      <thead>
        <tr>
          <th>Acct#</th><th>Description</th>
          <th style={{ textAlign: 'right' }}>This Month</th>
          <th style={{ textAlign: 'right' }}>Ratio</th>
          <th style={{ textAlign: 'right' }}>To Date</th>
          <th style={{ textAlign: 'right' }}>Ratio</th>
        </tr>
      </thead>
    )
    const renderISLine = (l: Record<string, unknown>, i: number) => (
      <tr key={i}>
        <td style={{ fontFamily: "'Consolas', monospace", fontWeight: 600 }}>{String(l.accountCode ?? '')}</td>
        <td>{String(l.accountDescription ?? '')}</td>
        <td style={{ textAlign: 'right', fontFamily: "'Consolas', monospace" }}>{fmt(parseFloat(String(l.thisMonthAmount ?? 0)))}</td>
        <td style={{ textAlign: 'right', fontFamily: "'Consolas', monospace", color: 'var(--text-secondary)' }}>{parseFloat(String(l.thisMonthRatio ?? 0)).toFixed(2)}</td>
        <td style={{ textAlign: 'right', fontFamily: "'Consolas', monospace" }}>{fmt(parseFloat(String(l.toDateAmount ?? 0)))}</td>
        <td style={{ textAlign: 'right', fontFamily: "'Consolas', monospace", color: 'var(--text-secondary)' }}>{parseFloat(String(l.toDateRatio ?? 0)).toFixed(2)}</td>
      </tr>
    )
    return (
      <div>
        <p className="subtitle" style={{ marginBottom: '12px' }}>Period ending: {fmtDate(String(data.periodEnding ?? ''))}</p>

        <h4 style={{ fontWeight: 700, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>GROSS INCOME</h4>
        <div style={{ overflowX: 'auto', marginBottom: '4px' }}>
          <table className="data-table">
            {isHead}
            <tbody>
              {incLines.length === 0
                ? <tr><td colSpan={6} style={{ fontFamily: "'Consolas', monospace" }}>No records to print...</td></tr>
                : incLines.map((l, i) => renderISLine(l, i))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} style={{ fontWeight: 700 }}>GROSS INCOME BEFORE MO.VAR:</td>
                <td style={{ textAlign: 'right', fontFamily: "'Consolas', monospace", fontWeight: 700 }}>{fmt(parseFloat(String(data.grossIncome ?? 0)))}</td>
                <td style={{ textAlign: 'right', fontFamily: "'Consolas', monospace", color: 'var(--text-secondary)' }}>{parseFloat(String(data.grossIncomeRatio ?? 0)).toFixed(2)}</td>
                <td style={{ textAlign: 'right', fontFamily: "'Consolas', monospace", fontWeight: 700 }}>{fmt(parseFloat(String(data.grossIncomeToDate ?? 0)))}</td>
                <td style={{ textAlign: 'right', fontFamily: "'Consolas', monospace", color: 'var(--text-secondary)' }}>{parseFloat(String(data.grossIncomeToDateRatio ?? 0)).toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <h4 style={{ fontWeight: 700, marginBottom: '4px', marginTop: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>MFG OVERHEAD VARIANCE</h4>
        <div style={{ overflowX: 'auto', marginBottom: '4px' }}>
          <table className="data-table">
            {isHead}
            <tbody>
              {expLines.length === 0
                ? <tr><td colSpan={6} style={{ fontFamily: "'Consolas', monospace" }}>No records to print...</td></tr>
                : expLines.map((l, i) => renderISLine(l, i))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} style={{ fontWeight: 700 }}>TOTAL MFG OVERHEAD VAR:</td>
                <td style={{ textAlign: 'right', fontFamily: "'Consolas', monospace", fontWeight: 700 }}>{fmt(parseFloat(String(data.totalExpenses ?? 0)))}</td>
                <td style={{ textAlign: 'right', fontFamily: "'Consolas', monospace", color: 'var(--text-secondary)' }}>{parseFloat(String(data.totalExpensesRatio ?? 0)).toFixed(2)}</td>
                <td style={{ textAlign: 'right', fontFamily: "'Consolas', monospace", fontWeight: 700 }}>{fmt(parseFloat(String(data.totalExpensesToDate ?? 0)))}</td>
                <td style={{ textAlign: 'right', fontFamily: "'Consolas', monospace", color: 'var(--text-secondary)' }}>{parseFloat(String(data.totalExpensesToDateRatio ?? 0)).toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div style={{ overflowX: 'auto', marginTop: '4px' }}>
          <table className="data-table">
            <tbody>
              <tr>
                <td colSpan={2} style={{ fontWeight: 700, fontSize: '13px' }}>TOTAL NET INCOME:</td>
                <td style={{ textAlign: 'right', fontFamily: "'Consolas', monospace", fontWeight: 700, color: netAmt >= 0 ? '#166534' : '#991b1b' }}>{fmt(netAmt)}</td>
                <td style={{ textAlign: 'right', fontFamily: "'Consolas', monospace", color: 'var(--text-secondary)', fontWeight: 700 }}>{netRatio.toFixed(2)}</td>
                <td style={{ textAlign: 'right', fontFamily: "'Consolas', monospace", fontWeight: 700, color: netDateAmt >= 0 ? '#166534' : '#991b1b' }}>{fmt(netDateAmt)}</td>
                <td style={{ textAlign: 'right', fontFamily: "'Consolas', monospace", color: 'var(--text-secondary)', fontWeight: 700 }}>{netRatioDate.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (kind === 'balance-sheet') {
    const bsLine = (l: Record<string, unknown>, i: number) => (
      <tr key={i}>
        <td style={{ fontFamily: "'Consolas', monospace", fontWeight: 600 }}>{String(l.accountCode ?? '')}</td>
        <td>{String(l.description ?? '')}</td>
        <td style={{ textAlign: 'right', fontFamily: "'Consolas', monospace" }}>{fmt(parseFloat(String(l.amount ?? 0)))}</td>
      </tr>
    )
    const BsHead = () => (
      <thead><tr><th>Code</th><th>Description</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
    )
    const SubSection = ({ label, lines, total }: {
      label: string
      lines: Record<string, unknown>[]
      total: number
    }) => (
      <div style={{ marginBottom: '8px' }}>
        <p style={{ fontWeight: 700, margin: '12px 0 4px', fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{label}</p>
        <table className="data-table" style={{ marginBottom: 0 }}>
          <BsHead />
          <tbody>
            {lines.length === 0
              ? <tr><td colSpan={3} style={{ fontFamily: "'Consolas', monospace", color: 'var(--text-secondary)' }}>(none)</td></tr>
              : lines.map((l, i) => bsLine(l, i))}
          </tbody>
        </table>
        <div style={{ textAlign: 'right', fontFamily: "'Consolas', monospace", fontSize: '13px',
          borderTop: '1px solid var(--border)', padding: '4px 12px', fontWeight: 600 }}>
          TOTAL {label.toUpperCase()}: {fmt(total)}
        </div>
      </div>
    )
    const curAssets   = (data.currentAssets   as Record<string, unknown>[]) ?? []
    const fixAssets   = (data.fixedAssets     as Record<string, unknown>[]) ?? []
    const othAssets   = (data.otherAssets     as Record<string, unknown>[]) ?? []
    const curLiab     = (data.currentLiabilities   as Record<string, unknown>[]) ?? []
    const defLiab     = (data.deferredLiabilities  as Record<string, unknown>[]) ?? []
    const capAcct     = (data.capitalAccounts      as Record<string, unknown>[]) ?? []
    const earnAcct    = (data.earningsAccounts     as Record<string, unknown>[]) ?? []
    const mkn = (k: string) => parseFloat(String(data[k] ?? 0))
    return (
      <div>
        <p className="subtitle" style={{ marginBottom: '12px' }}>Period ending: {fmtDate(String(data.periodEnding ?? ''))}
          {data.inBalance
            ? <span style={{ marginLeft: '12px', color: '#166534', fontWeight: 700 }}>&#x2713; Balanced</span>
            : <span style={{ marginLeft: '12px', color: '#991b1b', fontWeight: 700 }}>&#x26A0; OUT OF BALANCE</span>}
        </p>

        <h4 style={{ fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>*** ASSETS ***</h4>
        <SubSection label="Current Assets"   lines={curAssets} total={mkn('totalCurrentAssets')} />
        <SubSection label="Fixed Assets"     lines={fixAssets} total={mkn('totalFixedAssets')} />
        <SubSection label="Other Assets"     lines={othAssets} total={mkn('totalOtherAssets')} />
        <div style={{ fontWeight: 700, textAlign: 'right', fontFamily: "'Consolas', monospace",
          borderTop: '2px solid var(--border)', padding: '6px 12px', marginBottom: '16px' }}>
          TOTAL ASSETS: {fmt(mkn('totalAssets'))}
        </div>

        <h4 style={{ fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>*** LIABILITIES &amp; EQUITY ***</h4>
        <p style={{ fontWeight: 700, margin: '0 0 4px', fontSize: '12px' }}>LIABILITIES:</p>
        <SubSection label="Current Liabilities"  lines={curLiab}  total={mkn('totalCurrentLiabilities')} />
        <SubSection label="Deferred Liabilities" lines={defLiab}  total={mkn('totalDeferredLiabilities')} />
        <div style={{ fontWeight: 700, textAlign: 'right', fontFamily: "'Consolas', monospace",
          borderTop: '1px solid var(--border)', padding: '4px 12px' }}>
          TOTAL LIABILITIES: {fmt(mkn('totalLiabilities'))}
        </div>

        <p style={{ fontWeight: 700, margin: '12px 0 4px', fontSize: '12px' }}>STOCKHOLDER&#39;S EQUITY:</p>
        <SubSection label="Paid-Up Capital" lines={capAcct}  total={mkn('totalCapital')} />
        <SubSection label="Earnings"        lines={earnAcct} total={mkn('totalEarnings')} />
        <div style={{ fontWeight: 700, textAlign: 'right', fontFamily: "'Consolas', monospace",
          borderTop: '1px solid var(--border)', padding: '4px 12px' }}>
          TOTAL EQUITY: {fmt(mkn('totalEquity'))}
        </div>

        <div style={{ fontWeight: 700, textAlign: 'right', fontFamily: "'Consolas', monospace",
          borderTop: '2px solid var(--border)', padding: '6px 12px', marginTop: '8px', fontSize: '14px' }}>
          TOTAL LIABILITY &amp; EQUITY: {fmt(mkn('totalLiabilitiesAndEquity'))}
        </div>

        {Array.isArray((data as any).subsidiarySchedules) && ((data as any).subsidiarySchedules as any[]).length > 0 && (
          <div style={{ marginTop: '32px' }}>
            <h4 style={{ fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>*** SUBSIDIARY SCHEDULE ***</h4>
            {(data.subsidiarySchedules as any[]).map((group, idx) => (
              <div key={idx} style={{ marginBottom: '16px' }}>
                <p style={{ fontWeight: 700, margin: '8px 0 4px', fontSize: '13px', color: 'var(--text-secondary)' }}>{group.glHead}</p>
                <table className="data-table" style={{ margin: 0 }}>
                  <tbody>
                    {group.lines.length === 0 ? (
                      <tr><td colSpan={2} style={{ fontFamily: "'Consolas', monospace", color: 'var(--text-secondary)' }}>(none)</td></tr>
                    ) : group.lines.map((l: any, i: number) => (
                      <tr key={i}>
                        <td style={{ paddingLeft: '24px' }}>{l.description}</td>
                        <td style={{ textAlign: 'right', fontFamily: "'Consolas', monospace", width: '150px' }}>{fmt(l.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {group.lines.length > 1 && (
                  <div style={{ textAlign: 'right', fontFamily: "'Consolas', monospace", fontSize: '13px',
                    borderTop: '1px solid var(--border)', padding: '4px 12px', fontWeight: 600 }}>
                    {fmt(group.total)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (kind === 'subsidiary-schedule') {
    const schedules = (data.subsidiarySchedules as any[]) ?? []
    return (
      <div>
        <p className="subtitle" style={{ marginBottom: '12px' }}>Period ending: {fmtDate(String(data.periodEnding ?? ''))}</p>
        
        {schedules.length === 0 ? (
           <p style={{ color: 'var(--text-secondary)' }}>No subsidiary schedules found for this period.</p>
        ) : (
          <div>
            {schedules.map((group, idx) => (
              <div key={idx} style={{ marginBottom: '24px' }}>
                <h5 style={{ fontWeight: 700, margin: '0 0 6px', fontSize: '14px', color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                  {group.glHead}
                </h5>
                <table className="data-table" style={{ margin: 0 }}>
                  <tbody>
                    {group.lines.length === 0 ? (
                      <tr><td colSpan={2} style={{ fontFamily: "'Consolas', monospace", color: 'var(--text-secondary)' }}>(none)</td></tr>
                    ) : group.lines.map((l: any, i: number) => (
                      <tr key={i}>
                        <td style={{ paddingLeft: '12px' }}>{l.description}</td>
                        <td style={{ textAlign: 'right', fontFamily: "'Consolas', monospace", width: '150px' }}>{fmt(l.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {group.lines.length > 1 && (
                  <div style={{ textAlign: 'right', fontFamily: "'Consolas', monospace", fontSize: '13px',
                    borderTop: '1px solid var(--border)', padding: '4px 12px', fontWeight: 600 }}>
                    TOTAL: {fmt(group.total)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return <p style={{ color: 'var(--text-secondary)' }}>Report data loaded.</p>
}