import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import { useFsUnsavedStore } from '../../stores/fsUnsavedStore'
import PageHeader from '../PageHeader'

// --- Types ---
interface JournalRecord {
  id: number
  jJvNo: string
  jDate: string
  acctCode: string
  jCkAmt: number
  jDOrC: 'D' | 'C'
}

interface AccountLookup {
  acctCode: string
  acctDesc: string
}

// --- Constants ---
const API_BASE = '/api/fs'

const JOURNAL_TITLES: Record<string, string> = {
  receipt:    'Cash Receipts',
  sales:      'Sales Book Journals',
  general:    'Journal Vouchers',
  purchase:   'Purchase Book Journals',
  adjustment: 'Adjustments'
}

const ENDPOINT_MAP: Record<string, string> = {
  receipt:    'receipts',
  sales:      'sales',
  general:    'general',
  purchase:   'purchase',
  adjustment: 'adjustments'
}

const PREFIX_MAP: Record<string, string> = {
  receipt:    'CR',
  sales:      'SB',
  general:    'JV',
  purchase:   'PB',
  adjustment: 'AJ'
}

const REFNO_LABEL_MAP: Record<string, string> = {
  receipt:    'CR No.',
  sales:      'SB No.',
  general:    'JV No.',
  purchase:   'PB No.',
  adjustment: 'AJ No.'
}

function mapRecord(raw: any): JournalRecord {
  return {
    id:       raw.id ?? 0,
    jJvNo:    raw.jJvNo ?? raw.j_jv_no ?? '',
    jDate:    raw.jDate ?? raw.j_date ?? '',
    acctCode: raw.acctCode ?? raw.acct_code ?? '',
    jCkAmt:   parseFloat(raw.jCkAmt ?? raw.j_ck_amt ?? 0),
    jDOrC:    (raw.jDOrC ?? raw.jdOrC ?? raw.j_d_or_c ?? 'D') as 'D' | 'C'
  }
}

function toInputDate(d: string): string {
  if (!d) return new Date().toISOString().split('T')[0]
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return new Date().toISOString().split('T')[0]
  return dt.toISOString().split('T')[0]
}

function displayDate(d: string): string {
  if (!d) return ''
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' })
}

const today = new Date().toISOString().split('T')[0]

type RowState = { jJvNo: string; jDate: string; acctCode: string; debit: string; credit: string }

// -----------------------------------------------------------------------
export default function FSJournalEntry() {
  const { type } = useParams<{ type: string }>()
  const journalType = type ?? 'general'
  const endpoint = ENDPOINT_MAP[journalType] ?? 'general'
  const title = JOURNAL_TITLES[journalType] ?? 'Journal Entry'
  const refPrefix = PREFIX_MAP[journalType] ?? 'JV'
  const refLabel  = REFNO_LABEL_MAP[journalType] ?? 'Ref. No.'

  const [records, setRecords] = useState<JournalRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [showRecycleBin, setShowRecycleBin] = useState(false)
  const [deletedRows, setDeletedRows] = useState<JournalRecord[]>([])
  const [showClone, setShowClone] = useState(false)
  const [cloneFromRef, setCloneFromRef] = useState('')
  const [cloneToRef, setCloneToRef] = useState('')
  const [cloneDate, setCloneDate] = useState(today)
  const setHasUnsavedChanges = useFsUnsavedStore((state) => state.setHasUnsavedChanges)

  // Inline editing state
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editRow, setEditRow] = useState<RowState>({ jJvNo: '', jDate: today, acctCode: '', debit: '', credit: '' })

  // Add row (always visible at bottom of table)
  const [addRow, setAddRow] = useState<RowState>({ jJvNo: '', jDate: today, acctCode: '', debit: '', credit: '' })

  // Account browse
  const [showAcctBrowse, setShowAcctBrowse] = useState(false)
  const [accounts, setAccounts] = useState<AccountLookup[]>([])
  const [acctTarget, setAcctTarget] = useState<'add' | 'edit'>('add')

  // Find dialog — multi-mode search
  const [showFind, setShowFind] = useState(false)
  const [findDate, setFindDate] = useState('')
  const [findMode, setFindMode] = useState<'ref' | 'date' | 'acct' | 'amount'>('ref')
  const [findRef, setFindRef] = useState('')
  const [findAcct, setFindAcct] = useState('')
  const [findAmt, setFindAmt] = useState('')

  // Toast system
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null)

  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (!text) { setToast(null); return }
    const inferredType = type === 'info' && /error|failed|unable|required|invalid|missing|cannot/i.test(text) ? 'error' as const : type
    setToast({ text, type: inferredType })
  }, [])

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4500)
      return () => clearTimeout(timer)
    }
  }, [toast])

  // Sync old setMessage calls to toast
  useEffect(() => {
    if (message) showToast(message)
  }, [message, showToast])

  const accountLookup = useMemo(() => new Map(accounts.map((a) => [a.acctCode.toUpperCase(), a.acctDesc])), [accounts])

  // Preload accounts list on mount so typed codes work
  useEffect(() => {
    if (accounts.length === 0) {
      axios.get(`${API_BASE}/accounts`).then(resp => {
        setAccounts((resp.data?.data ?? []).map((a: any) => ({
          acctCode: a.acctCode ?? a.acct_code,
          acctDesc: a.acctDesc ?? a.acct_desc
        })))
      }).catch(() => {})
    }
  }, [])

  // Derived totals
  const totalDebit  = records.reduce((s, r) => s + (r.jDOrC === 'D' ? r.jCkAmt : 0), 0)
  const totalCredit = records.reduce((s, r) => s + (r.jDOrC === 'C' ? r.jCkAmt : 0), 0)
  const isBalanced  = Math.abs(totalDebit - totalCredit) < 0.01
  const addPendingDebit = parseFloat(addRow.debit || '0')
  const addPendingCredit = parseFloat(addRow.credit || '0')
  const projectedDebit = totalDebit + (Number.isFinite(addPendingDebit) ? addPendingDebit : 0)
  const projectedCredit = totalCredit + (Number.isFinite(addPendingCredit) ? addPendingCredit : 0)

  // ---- Data loading ----
  const loadRecords = useCallback(async () => {
    setIsLoading(true)
    try {
      const resp = await axios.get(`${API_BASE}/journals/${endpoint}`)
      const data: JournalRecord[] = (resp.data?.data ?? resp.data ?? []).map(mapRecord)
      setRecords(data)
      // Find the highest numeric suffix from existing ref numbers
      const maxNum = data.reduce((max, r) => {
        const match = r.jJvNo.match(/(\d+)$/)
        return match ? Math.max(max, parseInt(match[1], 10)) : max
      }, 0)
      const nextJv = `${refPrefix}${String(maxNum + 1).padStart(5, '0')}`
      setAddRow(r => ({ ...r, jJvNo: r.jJvNo || nextJv }))
      setMessage('')
    } catch (err: any) {
      const status = err?.response?.status ?? 0
      if (status !== 401 && status !== 404) {
        setMessage(`Error loading records: ${err.message}`)
      }
    } finally {
      setIsLoading(false)
    }
  }, [endpoint])

  useEffect(() => {
    setRecords([])
    setEditingId(null)
    setMessage('')
    setAddRow({ jJvNo: '', jDate: today, acctCode: '', debit: '', credit: '' })
    void loadRecords()
  }, [loadRecords])

  useEffect(() => {
    const hasDraft =
      !!addRow.acctCode.trim() || !!addRow.debit.trim() || !!addRow.credit.trim() ||
      !!editRow.acctCode.trim() || !!editRow.debit.trim() || !!editRow.credit.trim()
    setHasUnsavedChanges(hasDraft || editingId !== null)

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasDraft && editingId === null) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      setHasUnsavedChanges(false)
    }
  }, [addRow, editRow, editingId, setHasUnsavedChanges])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (event.ctrlKey && key === 's') {
        event.preventDefault()
        if (editingId !== null) {
          void handleSaveEdit()
        } else {
          void handleSaveAdd()
        }
      }
      if (event.ctrlKey && key === 'f') {
        event.preventDefault()
        setShowFind(true)
      }
      if (event.key === 'Escape' && editingId !== null) {
        cancelEdit()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [editingId, addRow, editRow])

  const loadDeletedRows = async () => {
    try {
      const resp = await axios.get(`${API_BASE}/journals/deleted/${endpoint}`)
      setDeletedRows((resp.data?.data ?? []).map(mapRecord))
    } catch {
      setDeletedRows([])
    }
  }

  // ---- Account browse ----
  const openAcctBrowse = async (target: 'add' | 'edit') => {
    setAcctTarget(target)
    if (accounts.length === 0) {
      try {
        const resp = await axios.get(`${API_BASE}/accounts`)
        setAccounts((resp.data?.data ?? []).map((a: any) => ({
          acctCode: a.acctCode ?? a.acct_code,
          acctDesc: a.acctDesc ?? a.acct_desc
        })))
      } catch { /* ignore */ }
    }
    setShowAcctBrowse(true)
  }

  // ---- ADD ROW ----
  const handleSaveAdd = async () => {
    if (!addRow.acctCode.trim()) { setMessage('Account Code is required'); return }
    // Accept manually typed codes - case-insensitive match
    const typedCode = addRow.acctCode.trim().toUpperCase()
    if (accounts.length > 0 && !accountLookup.has(typedCode)) {
      const partial = accounts.find(a => a.acctCode.toUpperCase().startsWith(typedCode))
      if (!partial) { setMessage(`Account code "${typedCode}" not found. Use the browse button (…) to see available codes.`); return }
    }
    const dv = parseFloat(addRow.debit  || '0')
    const cv = parseFloat(addRow.credit || '0')
    if (dv === 0 && cv === 0) { setMessage('Enter either a Debit or Credit amount'); return }
    if (dv > 0 && cv > 0)    { setMessage('Only one of Debit or Credit can be filled'); return }
    setSaving(true)
    try {
      const payload = {
        jJvNo:    addRow.jJvNo.trim() || (() => {
          const maxNum = records.reduce((max, r) => {
            const match = r.jJvNo.match(/(\d+)$/)
            return match ? Math.max(max, parseInt(match[1], 10)) : max
          }, 0)
          return `${refPrefix}${String(maxNum + 1).padStart(5, '0')}`
        })(),
        jDate:    addRow.jDate,
        acctCode: typedCode,
        jCkAmt:   dv > 0 ? dv : cv,
        jDOrC:    dv > 0 ? 'D' : 'C'
      }
      const resp = await axios.post(`${API_BASE}/journals/${endpoint}`, payload)
      const created = mapRecord(resp.data?.data ?? resp.data)
      setRecords(prev => [...prev, created])
      setAddRow(r => ({ ...r, acctCode: '', debit: '', credit: '' }))
      setMessage(`Added: ${created.jJvNo} / ${created.acctCode}`)
      // Refocus account input to preserve scroll position
      requestAnimationFrame(() => {
        const el = document.getElementById('input_addAcct')
        if (el) el.focus()
      })
    } catch (err: any) {
      setMessage(`Unable to save this entry: ${err.response?.data?.error ?? err.message}`)
    } finally {
      setSaving(false)
    }
  }

  // ---- EDIT ROW ----
  const startEdit = (r: JournalRecord) => {
    setEditingId(r.id)
    setEditRow({
      jJvNo:    r.jJvNo,
      jDate:    toInputDate(r.jDate),
      acctCode: r.acctCode,
      debit:    r.jDOrC === 'D' ? String(r.jCkAmt) : '',
      credit:   r.jDOrC === 'C' ? String(r.jCkAmt) : '',
    })
  }

  const cancelEdit = () => setEditingId(null)

  const handleSaveEdit = async () => {
    if (editingId === null) return
    if (!editRow.acctCode.trim()) { setMessage('Account Code is required'); return }
    const editCode = editRow.acctCode.trim().toUpperCase()
    if (accounts.length > 0 && !accountLookup.has(editCode)) {
      const partial = accounts.find(a => a.acctCode.toUpperCase().startsWith(editCode))
      if (!partial) { setMessage(`Account code "${editCode}" not found.`); return }
    }
    const dv = parseFloat(editRow.debit  || '0')
    const cv = parseFloat(editRow.credit || '0')
    if (dv === 0 && cv === 0) { setMessage('Enter either a Debit or Credit amount'); return }
    if (dv > 0 && cv > 0)    { setMessage('Only one of Debit or Credit can be filled'); return }
    setSaving(true)
    try {
      const payload = {
        jJvNo:    editRow.jJvNo,
        jDate:    editRow.jDate,
        acctCode: editRow.acctCode.toUpperCase(),
        jCkAmt:   dv > 0 ? dv : cv,
        jDOrC:    dv > 0 ? 'D' : 'C'
      }
      const resp = await axios.put(`${API_BASE}/journals/${endpoint}/${editingId}`, payload)
      const updated = mapRecord(resp.data?.data ?? resp.data)
      setRecords(prev => prev.map(r => r.id === editingId ? updated : r))
      setEditingId(null)
      setMessage('Row updated.')
    } catch (err: any) {
      setMessage(`Unable to update this entry: ${err.response?.data?.error ?? err.message}`)
    } finally {
      setSaving(false)
    }
  }

  // ---- DELETE ----
  const handleDelete = async (r: JournalRecord) => {
    if (!window.confirm(
      `Delete this row?\nJV: ${r.jJvNo}  Acct: ${r.acctCode}  ${r.jDOrC === 'D' ? 'Debit' : 'Credit'}: ${r.jCkAmt.toFixed(2)}`
    )) return
    try {
      await axios.delete(`${API_BASE}/journals/${endpoint}/${r.id}`)
      setRecords(prev => prev.filter(x => x.id !== r.id))
      if (editingId === r.id) setEditingId(null)
      setMessage('Row moved to recycle bin.')
    } catch (err: any) {
      setMessage(`Delete failed: ${err.message}`)
    }
  }

  const handleRestore = async (id: number) => {
    try {
      await axios.post(`${API_BASE}/journals/${endpoint}/restore/${id}`)
      setMessage('Entry restored successfully.')
      await loadDeletedRows()
      await loadRecords()
    } catch (err: any) {
      setMessage(err.response?.data?.message ?? 'Unable to restore selected entry.')
    }
  }

  const handleClone = async () => {
    if (!cloneFromRef.trim() || !cloneToRef.trim()) {
      setMessage('Please enter both source and target reference numbers for clone.')
      return
    }
    try {
      await axios.post(`${API_BASE}/journals/${endpoint}/clone/${encodeURIComponent(cloneFromRef.trim())}`, null, {
        params: {
          newJvNo: cloneToRef.trim().toUpperCase(),
          newDate: cloneDate
        }
      })
      setShowClone(false)
      setMessage(`Cloned ${cloneFromRef.trim().toUpperCase()} to ${cloneToRef.trim().toUpperCase()}.`)
      await loadRecords()
    } catch (err: any) {
      setMessage(err.response?.data?.error ?? err.response?.data?.message ?? 'Unable to clone transaction.')
    }
  }

  // ---- FIND ----
  const handleFind = () => {
    if (findMode === 'ref') {
      if (!findRef.trim()) { setMessage('Enter a reference number'); return }
      const target = findRef.trim().toUpperCase()
      const idx = records.findIndex(r => r.jJvNo.toUpperCase() === target)
      if (idx >= 0) { setMessage(`Found: ${records[idx].jJvNo}`); document.getElementById(`row-${records[idx].id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }
      else {
        const softIdx = records.findIndex(r => r.jJvNo.toUpperCase() >= target)
        if (softIdx >= 0) { setMessage(`Nearest: ${records[softIdx].jJvNo}`); document.getElementById(`row-${records[softIdx].id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }
        else setMessage(`Reference "${findRef}" not found.`)
      }
    } else if (findMode === 'date') {
      if (!findDate) { setMessage('Please select a date'); return }
      const target = new Date(findDate).getTime()
      const found = records.find(r => new Date(r.jDate).getTime() >= target)
      if (found) { setMessage(`Found: ${found.jJvNo} — ${displayDate(found.jDate)}`); document.getElementById(`row-${found.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }
      else setMessage(`No record with date ≥ ${findDate}`)
    } else if (findMode === 'acct') {
      if (!findAcct.trim()) { setMessage('Enter an account code'); return }
      const target = findAcct.trim().toUpperCase()
      const found = records.find(r => r.acctCode.toUpperCase() === target || r.acctCode.toUpperCase().startsWith(target))
      if (found) { setMessage(`Found: ${found.jJvNo} / ${found.acctCode}`); document.getElementById(`row-${found.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }
      else setMessage(`No record with account code "${findAcct}"`)
    } else if (findMode === 'amount') {
      if (!findAmt.trim()) { setMessage('Enter an amount'); return }
      const target = parseFloat(findAmt)
      if (isNaN(target)) { setMessage('Invalid amount'); return }
      const found = records.find(r => Math.abs(r.jCkAmt - target) < 0.01)
      if (found) { setMessage(`Found: ${found.jJvNo} / ${found.acctCode} — ${found.jCkAmt.toFixed(2)}`); document.getElementById(`row-${found.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }
      else setMessage(`No record with amount ${target.toFixed(2)}`)
    }
    setShowFind(false)
    setFindRef(''); setFindDate(''); setFindAcct(''); setFindAmt('')
  }

  // ---- QUIT ----
  const handleQuit = () => {
    if (!isBalanced) {
      alert(
        `UNBALANCED — Cannot quit!\n` +
        `Total Debit:  ${totalDebit.toFixed(2)}\n` +
        `Total Credit: ${totalCredit.toFixed(2)}\n` +
        `Out of balance: ${(totalDebit - totalCredit).toFixed(2)}`
      )
      return
    }
    window.history.back()
  }

  // ---- Render ----
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 max-w-[1200px] mx-auto w-full animate-pulse">
        <div className="h-8 w-48 bg-surface-container rounded" />
        <div className="h-6 w-80 bg-surface-container rounded" />
        <div className="h-[400px] bg-surface-container-low rounded-xl" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0 max-w-[1200px] mx-auto w-full pb-20">
      {/* ── Page Header ── */}
      <PageHeader
        breadcrumb={`DATA ENTRY / ${title.toUpperCase()}`}
        title={title}
        subtitle={`${records.length} record${records.length !== 1 ? 's' : ''} · Double-click any row to edit inline`}
        actions={
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border ${
              isBalanced
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              <span className="material-symbols-outlined text-[14px]">{isBalanced ? 'check_circle' : 'warning'}</span>
              {isBalanced ? 'Balanced' : `Off by ${Math.abs(totalDebit - totalCredit).toFixed(2)}`}
            </span>
          </div>
        }
      />

      {/* ── Unbalanced Warning Banner ── */}
      {records.length > 0 && !isBalanced && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-800 text-sm font-semibold animate-in fade-in slide-in-from-top-2">
          <span className="material-symbols-outlined text-[20px] text-red-600">error</span>
          <span>UNBALANCED — Debit {totalDebit.toFixed(2)} ≠ Credit {totalCredit.toFixed(2)} (variance: {Math.abs(totalDebit - totalCredit).toFixed(2)})</span>
        </div>
      )}

      <div className="sticky top-0 z-30 mb-3 bg-surface/95 backdrop-blur-sm border border-outline-variant/40 rounded-xl shadow-md px-4 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button onClick={() => { setCloneFromRef(addRow.jJvNo || ''); setCloneToRef(''); setCloneDate(today); setShowClone(true) }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-on-surface-variant hover:bg-surface-container-low hover:text-primary rounded-lg text-xs font-bold transition-colors">
            <span className="material-symbols-outlined text-[16px]">file_copy</span> Clone
          </button>
          <button onClick={() => { setFindDate(''); setShowFind(true) }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-on-surface-variant hover:bg-surface-container-low hover:text-primary rounded-lg text-xs font-bold transition-colors">
            <span className="material-symbols-outlined text-[16px]">search</span> Find
          </button>
          <div className="w-px h-5 bg-outline-variant/30 mx-0.5" />
          <button onClick={() => { void loadDeletedRows(); setShowRecycleBin(true) }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-on-surface-variant hover:bg-surface-container-low hover:text-red-600 rounded-lg text-xs font-bold transition-colors">
            <span className="material-symbols-outlined text-[16px]">delete_sweep</span> Bin
          </button>
        </div>
        <button onClick={handleQuit}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all border ${
            !isBalanced
              ? 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100'
              : 'bg-surface-container text-on-surface-variant border-outline-variant/30 hover:bg-surface-container-high hover:text-on-surface'
          }`}>
          <span className="material-symbols-outlined text-[16px]">logout</span>
          Quit {!isBalanced && '⚠'}
        </button>
      </div>

      {/* ── Main Data Table ── */}
      <div className="bg-surface border border-outline-variant/30 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]" style={{ minWidth: '680px', borderCollapse: 'collapse' }}>
            <colgroup>
              <col style={{ width: '100px' }} />
              <col style={{ width: '115px' }} />
              <col />
              <col style={{ width: '140px' }} />
              <col style={{ width: '140px' }} />
              <col style={{ width: '80px' }} />
            </colgroup>
            <thead>
              <tr className="bg-surface-container-low">
                <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-on-surface-variant border-b-2 border-outline-variant/40 border-r border-outline-variant/30">{refLabel}</th>
                <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-on-surface-variant border-b-2 border-outline-variant/40 border-r border-outline-variant/30">Date</th>
                <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-on-surface-variant border-b-2 border-outline-variant/40 border-r border-outline-variant/30">Account Code</th>
                <th className="px-3 py-2 text-right text-[11px] font-bold uppercase tracking-wider text-blue-700 border-b-2 border-outline-variant/40 border-r border-outline-variant/30">Debit</th>
                <th className="px-3 py-2 text-right text-[11px] font-bold uppercase tracking-wider text-pink-700 border-b-2 border-outline-variant/40 border-r border-outline-variant/30">Credit</th>
                <th className="px-3 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-on-surface-variant border-b-2 border-outline-variant/40">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, idx) => editingId === r.id ? (
                /* ── EDIT ROW ── */
                <tr key={r.id} className="bg-amber-50/80">
                  <td className="px-3 py-1.5">
                    <input className="w-full px-2 py-1 text-[13px] border border-amber-300 rounded bg-surface-container-lowest font-mono uppercase outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                      value={editRow.jJvNo} onChange={e => setEditRow(x => ({ ...x, jJvNo: e.target.value.toUpperCase() }))} maxLength={8} />
                  </td>
                  <td className="px-3 py-1.5">
                    <input type="date" className="w-full px-2 py-1 text-[13px] border border-amber-300 rounded bg-surface-container-lowest outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                      value={editRow.jDate} onChange={e => setEditRow(x => ({ ...x, jDate: e.target.value }))} />
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="flex gap-1">
                      <input className="flex-1 px-2 py-1 text-[13px] border border-amber-300 rounded bg-surface-container-lowest font-mono uppercase outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                        value={editRow.acctCode} list="journal-account-list"
                        onChange={e => setEditRow(x => ({ ...x, acctCode: e.target.value.toUpperCase() }))} maxLength={4} placeholder="0000" />
                      <button type="button" onClick={() => openAcctBrowse('edit')}
                        className="px-1.5 py-1 text-[11px] border border-outline-variant/30 rounded bg-surface-container-low hover:bg-surface-container text-on-surface-variant flex-shrink-0 transition-colors">…</button>
                    </div>
                  </td>
                  <td className="px-3 py-1.5">
                    <input type="number" className={`w-full px-2 py-1 text-[13px] text-right border rounded font-mono outline-none focus:ring-1 focus:ring-primary/20 ${editRow.debit ? 'border-blue-300 bg-blue-50/50 dark:bg-blue-900/20 focus:border-blue-400' : 'border-amber-300 dark:border-amber-700/50 bg-surface-container-lowest focus:border-primary'}`}
                      value={editRow.debit} placeholder="Debit"
                      onFocus={() => setEditRow(x => ({ ...x, credit: '' }))}
                      onChange={e => setEditRow(x => ({ ...x, debit: e.target.value }))}
                      step="0.01" min="0" />
                  </td>
                  <td className="px-3 py-1.5">
                    <input type="number" className={`w-full px-2 py-1 text-[13px] text-right border rounded font-mono outline-none focus:ring-1 focus:ring-primary/20 ${editRow.credit ? 'border-pink-300 bg-pink-50/50 dark:bg-pink-900/20 focus:border-pink-400' : 'border-amber-300 dark:border-amber-700/50 bg-surface-container-lowest focus:border-primary'}`}
                      value={editRow.credit} placeholder="Credit"
                      onFocus={() => setEditRow(x => ({ ...x, debit: '' }))}
                      onChange={e => setEditRow(x => ({ ...x, credit: e.target.value }))}
                      step="0.01" min="0" />
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={handleSaveEdit} disabled={saving} title="Save (Ctrl+S)"
                        className="w-7 h-7 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-colors disabled:opacity-50">
                        <span className="material-symbols-outlined text-[16px]">check</span>
                      </button>
                      <button onClick={cancelEdit} title="Cancel (Esc)"
                        className="w-7 h-7 rounded-md bg-surface-container-high hover:bg-surface-dim text-on-surface-variant flex items-center justify-center transition-colors">
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                /* ── DATA ROW ── */
                <tr key={r.id} id={`row-${r.id}`} onDoubleClick={() => startEdit(r)}
                  className={`cursor-default hover:bg-surface-container-lowest/80 transition-colors ${idx % 2 === 1 ? 'bg-surface-container-low/30' : ''}`}>
                  <td className="px-3 py-2 font-mono text-[13px] font-medium text-on-surface border-b border-outline-variant/40 border-r border-outline-variant/40">{r.jJvNo}</td>
                  <td className="px-3 py-2 text-[13px] text-on-surface-variant border-b border-outline-variant/40 border-r border-outline-variant/40">{displayDate(r.jDate)}</td>
                  <td className="px-3 py-2 border-b border-outline-variant/40 border-r border-outline-variant/40">
                    <span className="font-mono text-[13px] font-semibold text-on-surface">{r.acctCode}</span>
                    {accountLookup.has(r.acctCode.toUpperCase()) && (
                      <span className="ml-2 text-[11px] text-on-surface-variant/60">{accountLookup.get(r.acctCode.toUpperCase())}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[13px] text-blue-700 font-medium border-b border-outline-variant/40 border-r border-outline-variant/40">
                    {r.jDOrC === 'D' ? r.jCkAmt.toLocaleString('en-US', { minimumFractionDigits: 2 }) : ''}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[13px] text-pink-700 font-medium border-b border-outline-variant/40 border-r border-outline-variant/40">
                    {r.jDOrC === 'C' ? r.jCkAmt.toLocaleString('en-US', { minimumFractionDigits: 2 }) : ''}
                  </td>
                  <td className="px-3 py-2 border-b border-outline-variant/40">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => startEdit(r)} title="Edit"
                        className="w-7 h-7 rounded-md bg-surface-container hover:bg-surface-container-high text-on-surface-variant flex items-center justify-center transition-colors border border-outline-variant/20">
                        <span className="material-symbols-outlined text-[15px]">edit</span>
                      </button>
                      <button onClick={() => handleDelete(r)} title="Delete"
                        className="w-7 h-7 rounded-md bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition-colors border border-red-200/50">
                        <span className="material-symbols-outlined text-[15px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {/* ── ADD ROW (always visible, green tint) ── */}
              <tr className="bg-emerald-50/60 border-t-2 border-dashed border-emerald-300/60">
                <td className="px-3 py-1.5">
                  <input className="w-full px-2 py-1 text-[13px] border border-emerald-300 rounded bg-surface-container-lowest font-mono uppercase outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
                    value={addRow.jJvNo} placeholder="REF#"
                    onChange={e => setAddRow(x => ({ ...x, jJvNo: e.target.value.toUpperCase() }))} maxLength={8} />
                </td>
                <td className="px-3 py-1.5">
                  <input type="date" className="w-full px-2 py-1 text-[13px] border border-emerald-300 rounded bg-surface-container-lowest outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
                    value={addRow.jDate}
                    onChange={e => setAddRow(x => ({ ...x, jDate: e.target.value }))} />
                </td>
                <td className="px-3 py-1.5">
                  <div className="flex gap-1">
                    <input className="flex-1 px-2 py-1 text-[13px] border border-emerald-300 rounded bg-surface-container-lowest font-mono uppercase outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
                      value={addRow.acctCode} placeholder="Acct" id="input_addAcct"
                      list="journal-account-list"
                      onChange={e => setAddRow(x => ({ ...x, acctCode: e.target.value.toUpperCase() }))} maxLength={4}
                      onKeyDown={e => { if (e.key === 'Enter') void handleSaveAdd() }} />
                    <button type="button" onClick={() => openAcctBrowse('add')}
                      className="px-1.5 py-1 text-[11px] border border-emerald-300 dark:border-emerald-700/50 rounded bg-emerald-100 dark:bg-emerald-900/30 hover:bg-emerald-200 dark:hover:bg-emerald-800/40 text-emerald-700 dark:text-emerald-400 flex-shrink-0 transition-colors">…</button>
                  </div>
                </td>
                <td className="px-3 py-1.5">
                  <input type="number" className={`w-full px-2 py-1 text-[13px] text-right border rounded font-mono outline-none focus:ring-1 focus:ring-emerald-200 ${addRow.debit ? 'border-blue-300 bg-blue-50/30 dark:bg-blue-900/20 focus:border-blue-400' : 'border-emerald-300 dark:border-emerald-700/50 bg-surface-container-lowest focus:border-emerald-500'}`}
                    value={addRow.debit} placeholder="Debit"
                    onFocus={() => setAddRow(x => ({ ...x, credit: '' }))}
                    onChange={e => setAddRow(x => ({ ...x, debit: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') void handleSaveAdd() }} step="0.01" min="0" />
                </td>
                <td className="px-3 py-1.5">
                  <input type="number" className={`w-full px-2 py-1 text-[13px] text-right border rounded font-mono outline-none focus:ring-1 focus:ring-emerald-200 ${addRow.credit ? 'border-pink-300 bg-pink-50/30 dark:bg-pink-900/20 focus:border-pink-400' : 'border-emerald-300 dark:border-emerald-700/50 bg-surface-container-lowest focus:border-emerald-500'}`}
                    value={addRow.credit} placeholder="Credit"
                    onFocus={() => setAddRow(x => ({ ...x, debit: '' }))}
                    onChange={e => setAddRow(x => ({ ...x, credit: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') void handleSaveAdd() }} step="0.01" min="0" />
                </td>
                <td className="px-3 py-1.5">
                  <button onClick={handleSaveAdd} disabled={saving}
                    className="w-full py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">add</span> Add
                  </button>
                </td>
              </tr>
            </tbody>

            {/* ── TOTALS Footer ── */}
            {records.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-outline-variant/40 bg-surface-container-low/50 font-bold">
                  <td colSpan={3} className="px-3 py-2.5 text-[12px] uppercase tracking-wider text-on-surface-variant">
                    Totals
                    {isBalanced
                      ? <span className="ml-3 text-emerald-600 font-normal normal-case tracking-normal">✓ Balanced</span>
                      : <span className="ml-3 text-red-600 font-normal normal-case tracking-normal">✗ Off by {Math.abs(totalDebit - totalCredit).toFixed(2)}</span>
                    }
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-[13px] text-blue-700 font-bold">
                    {totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-[13px] text-pink-700 font-bold">
                    {totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* ── Table Footer Info Strip ── */}
        <div className="bg-surface-container-low/50 px-4 py-2 border-t border-outline-variant/20 flex flex-wrap justify-between items-center gap-2">
          <div className="text-[11px] text-on-surface-variant/70 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">info</span>
            Double-click row to edit · Type in Debit to auto-clear Credit
          </div>
          <div className="text-[10px] font-mono text-on-surface-variant/50 tracking-wider uppercase hidden md:block">
            Ctrl+S: Save | Esc: Cancel | Ctrl+F: Find
          </div>
        </div>
      </div>

      {/* ── Projected Totals ── */}
      {(addRow.debit || addRow.credit) && (
        <div className="mt-2 px-4 py-2 bg-surface-container-low/50 border border-outline-variant/20 rounded-lg text-[12px] text-on-surface-variant flex items-center gap-2">
          <span className="material-symbols-outlined text-[14px]">calculate</span>
          Projected: Debit <span className="font-mono font-bold text-blue-700">{projectedDebit.toFixed(2)}</span> · Credit <span className="font-mono font-bold text-pink-700">{projectedCredit.toFixed(2)}</span> · Variance <span className={`font-mono font-bold ${Math.abs(projectedDebit - projectedCredit) < 0.01 ? 'text-emerald-600' : 'text-red-600'}`}>{(projectedDebit - projectedCredit).toFixed(2)}</span>
        </div>
      )}

      <datalist id="journal-account-list">
        {accounts.map((a) => (
          <option key={a.acctCode} value={a.acctCode}>{a.acctDesc}</option>
        ))}
      </datalist>

      {/* ══════ MODALS ══════ */}

      {/* ── FIND Dialog ── */}
      {showFind && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowFind(false)}>
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-[440px] overflow-hidden animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-outline-variant/20 flex items-center justify-between">
              <h3 className="font-headline font-bold text-lg text-on-surface">Find Record</h3>
              <button onClick={() => setShowFind(false)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container-high transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              {/* Search mode tabs */}
              <div className="flex gap-1 bg-surface-container-low rounded-lg p-1">
                {[
                  { mode: 'ref' as const, label: 'Ref #', icon: 'tag' },
                  { mode: 'date' as const, label: 'Date', icon: 'calendar_today' },
                  { mode: 'acct' as const, label: 'Account', icon: 'account_tree' },
                  { mode: 'amount' as const, label: 'Amount', icon: 'payments' },
                ].map(t => (
                  <button key={t.mode} onClick={() => setFindMode(t.mode)}
                    className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-xs font-bold transition-all ${
                      findMode === t.mode
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-on-surface-variant hover:bg-surface-container'
                    }`}>
                    <span className="material-symbols-outlined text-[14px]">{t.icon}</span> {t.label}
                  </button>
                ))}
              </div>

              {findMode === 'ref' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">{refLabel}</label>
                  <input type="text" className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg bg-surface-container-lowest font-mono uppercase outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                    value={findRef} onChange={e => setFindRef(e.target.value.toUpperCase())} maxLength={10} autoFocus
                    placeholder={`e.g. ${refPrefix}00001`}
                    onKeyDown={e => { if (e.key === 'Enter') handleFind() }} />
                  <p className="text-[11px] text-on-surface-variant/50 mt-1">Exact match or soft-seek to nearest</p>
                </div>
              )}
              {findMode === 'date' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">Date</label>
                  <input type="date" className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg bg-surface-container-lowest text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                    value={findDate} onChange={e => setFindDate(e.target.value)} autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') handleFind() }} />
                  <p className="text-[11px] text-on-surface-variant/50 mt-1">Finds first record with date ≥ selected</p>
                </div>
              )}
              {findMode === 'acct' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">Account Code</label>
                  <input type="text" className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg bg-surface-container-lowest font-mono uppercase outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                    value={findAcct} onChange={e => setFindAcct(e.target.value.toUpperCase())} maxLength={4} autoFocus
                    placeholder="e.g. 1110"
                    onKeyDown={e => { if (e.key === 'Enter') handleFind() }} />
                  <p className="text-[11px] text-on-surface-variant/50 mt-1">Finds first row with matching account</p>
                </div>
              )}
              {findMode === 'amount' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">Amount</label>
                  <input type="number" step="0.01" className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg bg-surface-container-lowest font-mono outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                    value={findAmt} onChange={e => setFindAmt(e.target.value)} autoFocus
                    placeholder="e.g. 1500.00"
                    onKeyDown={e => { if (e.key === 'Enter') handleFind() }} />
                  <p className="text-[11px] text-on-surface-variant/50 mt-1">Finds first row with this exact amount</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setShowFind(false)} className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors">Cancel</button>
                <button onClick={handleFind} className="px-5 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 shadow-sm transition-all">Find</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Account Browse Dialog ── */}
      {showAcctBrowse && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAcctBrowse(false)}>
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-[480px] max-h-[70vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-outline-variant/20 flex items-center justify-between flex-shrink-0">
              <h3 className="font-headline font-bold text-lg text-on-surface">Select Account</h3>
              <button onClick={() => setShowAcctBrowse(false)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container-high transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {accounts.length === 0
                ? <div className="p-8 text-center text-on-surface-variant/50 italic">Loading accounts…</div>
                : (
                  <table className="w-full text-[13px]">
                    <thead className="bg-surface-container-low sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Code</th>
                        <th className="px-4 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10">
                      {accounts.map(a => (
                        <tr key={a.acctCode} className="cursor-pointer hover:bg-primary/5 transition-colors" onClick={() => {
                          if (acctTarget === 'add') setAddRow(x => ({ ...x, acctCode: a.acctCode }))
                          else setEditRow(x => ({ ...x, acctCode: a.acctCode }))
                          setShowAcctBrowse(false)
                        }}>
                          <td className="px-4 py-2 font-mono font-bold text-primary">{a.acctCode}</td>
                          <td className="px-4 py-2 text-on-surface-variant">{a.acctDesc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              }
            </div>
          </div>
        </div>
      )}

      {/* ── Clone Dialog ── */}
      {showClone && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowClone(false)}>
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-[420px] overflow-hidden animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-outline-variant/20 flex items-center justify-between">
              <h3 className="font-headline font-bold text-lg text-on-surface">Clone Transaction</h3>
              <button onClick={() => setShowClone(false)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container-high transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">Source Ref</label>
                <input className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg bg-surface-container-lowest font-mono text-sm uppercase outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                  value={cloneFromRef} onChange={e => setCloneFromRef(e.target.value.toUpperCase())} />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">New Ref</label>
                <input className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg bg-surface-container-lowest font-mono text-sm uppercase outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                  value={cloneToRef} onChange={e => setCloneToRef(e.target.value.toUpperCase())} />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">Posting Date</label>
                <input type="date" className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg bg-surface-container-lowest outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                  value={cloneDate} onChange={e => setCloneDate(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setShowClone(false)} className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors">Cancel</button>
                <button onClick={() => void handleClone()} className="px-5 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 shadow-sm transition-all">Clone</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Recycle Bin Dialog ── */}
      {showRecycleBin && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowRecycleBin(false)}>
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-[800px] max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-outline-variant/20 flex items-center justify-between flex-shrink-0">
              <h3 className="font-headline font-bold text-lg text-red-600 flex items-center gap-2">
                <span className="material-symbols-outlined">delete</span> Recycle Bin
              </h3>
              <button onClick={() => setShowRecycleBin(false)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container-high transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-[13px]">
                <thead className="bg-surface-container-low sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Ref</th>
                    <th className="px-4 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Date</th>
                    <th className="px-4 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Acct</th>
                    <th className="px-4 py-2 text-right text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Amount</th>
                    <th className="px-4 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">D/C</th>
                    <th className="px-4 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {deletedRows.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-on-surface-variant/50 italic">No deleted entries found</td></tr>
                  ) : deletedRows.map((row) => (
                    <tr key={row.id} className="hover:bg-surface-container-lowest transition-colors">
                      <td className="px-4 py-2 font-mono uppercase font-medium">{row.jJvNo}</td>
                      <td className="px-4 py-2 text-on-surface-variant">{displayDate(row.jDate)}</td>
                      <td className="px-4 py-2 font-mono font-medium">{row.acctCode}</td>
                      <td className="px-4 py-2 text-right font-mono">{row.jCkAmt.toFixed(2)}</td>
                      <td className="px-4 py-2 text-center font-mono">{row.jDOrC}</td>
                      <td className="px-4 py-2 text-center">
                        <button onClick={() => void handleRestore(row.id)}
                          className="text-primary hover:bg-primary/10 px-3 py-1 rounded-md font-bold text-xs transition-colors">Restore</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast Notification ── */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[100] px-5 py-3.5 rounded-xl border text-sm font-semibold shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 ${
          toast.type === 'error'
            ? 'bg-red-600 text-white border-red-700'
            : toast.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-700'
              : 'bg-surface text-on-surface border-outline-variant/30 shadow-lg'
        }`}>
          <span className="material-symbols-outlined text-[18px]">
            {toast.type === 'error' ? 'error' : toast.type === 'success' ? 'check_circle' : 'info'}
          </span>
          {toast.text}
          <button type="button" onClick={() => setToast(null)} className="ml-3 opacity-70 hover:opacity-100 transition-opacity">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}
    </div>
  )
}
