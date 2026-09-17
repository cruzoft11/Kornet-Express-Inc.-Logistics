import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import { useFsUnsavedStore } from '../../stores/fsUnsavedStore'

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

// Auto-generated reference number prefix per journal type
// Original Clipper field is called "REFERENCE" (space(8)) — user typed freely.
// Each type is stored in its own separate table, so there is no cross-type collision;
// these prefixes are just a convenience suggestion to distinguish entries visually.
const PREFIX_MAP: Record<string, string> = {
  receipt:    'CR',   // Cash Receipt
  sales:      'SB',   // Sales Book
  general:    'JV',   // Journal Voucher
  purchase:   'PB',   // Purchase Book
  adjustment: 'AJ'    // Adjustment
}

// Column header label for the reference number column
const REFNO_LABEL_MAP: Record<string, string> = {
  receipt:    'CR No.',
  sales:      'SB No.',
  general:    'JV No.',
  purchase:   'PB No.',
  adjustment: 'AJ No.'
}

// Camel-case key from API response to our JournalRecord
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

// Format date string to YYYY-MM-DD for input[type=date]
function toInputDate(d: string): string {
  if (!d) return new Date().toISOString().split('T')[0]
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return new Date().toISOString().split('T')[0]
  return dt.toISOString().split('T')[0]
}

// Format date for display
function displayDate(d: string): string {
  if (!d) return ''
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' })
}

const today = new Date().toISOString().split('T')[0]

type RowState = { jJvNo: string; jDate: string; acctCode: string; debit: string; credit: string }

const cellInput = (accentColor: string, filled = false): React.CSSProperties => ({
  width: '100%',
  padding: '4px 6px',
  fontSize: '13px',
  border: `1px solid ${accentColor}`,
  borderRadius: '3px',
  outline: 'none',
  boxSizing: 'border-box',
  background: filled ? (accentColor === '#93c5fd' ? '#eff6ff' : accentColor === '#f9a8d4' ? '#fdf2f8' : '#fff') : undefined,
  textAlign: 'right' as const,
})

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

  // Find dialog
  const [showFind, setShowFind] = useState(false)
  const [findDate, setFindDate] = useState('')

  const accountLookup = useMemo(() => new Map(accounts.map((a) => [a.acctCode.toUpperCase(), a.acctDesc])), [accounts])

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
      const nextJv = `${refPrefix}${String(data.length + 1).padStart(5, '0')}`
      setAddRow(r => ({ ...r, jJvNo: r.jJvNo || nextJv }))
      setMessage('')
    } catch (err: any) {
      setMessage(`Error loading records: ${err.message}`)
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
    if (!accountLookup.has(addRow.acctCode.trim().toUpperCase())) { setMessage('Please choose a valid account code from the list.'); return }
    const dv = parseFloat(addRow.debit  || '0')
    const cv = parseFloat(addRow.credit || '0')
    if (dv === 0 && cv === 0) { setMessage('Enter either a Debit or Credit amount'); return }
    if (dv > 0 && cv > 0)    { setMessage('Only one of Debit or Credit can be filled'); return }
    setSaving(true)
    try {
      const payload = {
        jJvNo:    addRow.jJvNo.trim() || `${refPrefix}${String(records.length + 1).padStart(5, '0')}`,
        jDate:    addRow.jDate,
        acctCode: addRow.acctCode.toUpperCase(),
        jCkAmt:   dv > 0 ? dv : cv,
        jDOrC:    dv > 0 ? 'D' : 'C'
      }
      const resp = await axios.post(`${API_BASE}/journals/${endpoint}`, payload)
      const created = mapRecord(resp.data?.data ?? resp.data)
      setRecords(prev => [...prev, created])
      setAddRow(r => ({ ...r, acctCode: '', debit: '', credit: '' }))
      setMessage(`Added: ${created.jJvNo} / ${created.acctCode}`)
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
    if (!accountLookup.has(editRow.acctCode.trim().toUpperCase())) { setMessage('Please choose a valid account code from the list.'); return }
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
    if (!findDate) { setMessage('Please select a date'); return }
    const target = new Date(findDate).getTime()
    const found = [...records]
      .sort((a, b) => new Date(a.jDate).getTime() - new Date(b.jDate).getTime())
      .find(r => new Date(r.jDate).getTime() >= target)
    setMessage(found ? `Found: ${found.jJvNo} — ${displayDate(found.jDate)}` : `No record with date ≥ ${findDate}`)
    setShowFind(false)
    setFindDate('')
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
    return <div className="card"><h2>{title}</h2><p style={{ color: '#00bb00' }}>Loading...</p></div>
  }

  return (
    <div className="card">
      {/* â”€â”€ Header â”€â”€ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div>
          <h2 style={{ margin: 0 }}>{title}</h2>
          <p className="subtitle" style={{ margin: '3px 0 0' }}>A_EDTJNL.PRG — {records.length} record{records.length !== 1 ? 's' : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={() => { setCloneFromRef(addRow.jJvNo || ''); setCloneToRef(''); setCloneDate(today); setShowClone(true) }}>CLONE</button>
          <button className="btn btn-secondary" onClick={() => { void loadDeletedRows(); setShowRecycleBin(true) }}>RECYCLE BIN</button>
          <button className="btn btn-secondary" onClick={() => { setFindDate(''); setShowFind(true) }}>FIND</button>
          <button
            className="btn btn-secondary"
            onClick={handleQuit}
            style={{ background: isBalanced ? undefined : '#fee2e2', borderColor: isBalanced ? undefined : '#dc2626' }}
          >QUIT {!isBalanced && '⚠'}</button>
        </div>
      </div>

      {/* â”€â”€ Status message â”€â”€ */}
      {message && (
        <div style={{
          padding: '7px 12px', marginBottom: '10px',
          border: `1px solid ${message.includes('Error') || message.includes('failed') ? '#cc0000' : '#00cc00'}`,
          backgroundColor: message.includes('Error') || message.includes('failed') ? '#ffebee' : '#e8f5e9',
          color: message.includes('Error') || message.includes('failed') ? '#8b0000' : '#1b5e20',
          borderRadius: '4px', fontSize: '13px'
        }}>
          {message}
        </div>
      )}

      {/* â”€â”€ Unbalanced warning â”€â”€ */}
      {records.length > 0 && !isBalanced && (
        <div style={{ padding: '7px 12px', marginBottom: '10px', border: '1px solid #dc2626', backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: '4px', fontWeight: 'bold', fontSize: '13px' }}>
          ⚠ UNBALANCED — Debit {totalDebit.toFixed(2)} ≠ Credit {totalCredit.toFixed(2)} (off by {Math.abs(totalDebit - totalCredit).toFixed(2)})
        </div>
      )}

      {/* â”€â”€ Main inline table â”€â”€ */}
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table" style={{ fontSize: '13px', tableLayout: 'fixed', width: '100%', minWidth: '620px' }}>
          <colgroup>
            <col style={{ width: '90px' }} />
            <col style={{ width: '108px' }} />
            <col />
            <col style={{ width: '140px' }} />
            <col style={{ width: '140px' }} />
            <col style={{ width: '72px' }} />
          </colgroup>
          <thead>
            <tr>
              <th>{refLabel}</th>
              <th>Date</th>
              <th>Account Code</th>
              <th style={{ textAlign: 'right', color: '#1e40af' }}>Debit</th>
              <th style={{ textAlign: 'right', color: '#9d174d' }}>Credit</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {records.map(r => editingId === r.id ? (
              /* â”€â”€ EDIT ROW â”€â”€ */
              <tr key={r.id} style={{ background: '#fffbeb' }}>
                <td style={{ padding: '4px 6px' }}>
                  <input style={{ ...cellInput('#f59e0b'), textAlign: 'left' }} value={editRow.jJvNo}
                    onChange={e => setEditRow(x => ({ ...x, jJvNo: e.target.value.toUpperCase() }))} maxLength={8} />
                </td>
                <td style={{ padding: '4px 6px' }}>
                  <input type="date" style={{ ...cellInput('#f59e0b'), padding: '3px 4px', textAlign: 'left' }} value={editRow.jDate}
                    onChange={e => setEditRow(x => ({ ...x, jDate: e.target.value }))} />
                </td>
                <td style={{ padding: '4px 6px' }}>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input style={{ ...cellInput('#f59e0b'), textAlign: 'left', flex: 1 }} value={editRow.acctCode}
                      list="journal-account-list"
                      onChange={e => setEditRow(x => ({ ...x, acctCode: e.target.value.toUpperCase() }))} maxLength={4} placeholder="0000" />
                    <button type="button" onClick={() => openAcctBrowse('edit')}
                      style={{ padding: '3px 6px', fontSize: '11px', cursor: 'pointer', border: '1px solid #ddd', borderRadius: '3px', background: '#f9fafb', flexShrink: 0 }}>…</button>
                  </div>
                </td>
                <td style={{ padding: '4px 6px' }}>
                  <input type="number" style={cellInput('#93c5fd', !!editRow.debit)} value={editRow.debit} placeholder="Debit"
                    onFocus={() => setEditRow(x => ({ ...x, credit: '' }))}
                    onChange={e => setEditRow(x => ({ ...x, debit: e.target.value }))}
                    step="0.01" min="0" />
                </td>
                <td style={{ padding: '4px 6px' }}>
                  <input type="number" style={cellInput('#f9a8d4', !!editRow.credit)} value={editRow.credit} placeholder="Credit"
                    onFocus={() => setEditRow(x => ({ ...x, debit: '' }))}
                    onChange={e => setEditRow(x => ({ ...x, credit: e.target.value }))}
                    step="0.01" min="0" />
                </td>
                <td style={{ padding: '4px 6px' }}>
                  <div style={{ display: 'flex', gap: '3px' }}>
                    <button onClick={handleSaveEdit} disabled={saving} title="Save"
                      style={{ padding: '3px 7px', fontSize: '12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>✓</button>
                    <button onClick={cancelEdit} title="Cancel"
                      style={{ padding: '3px 7px', fontSize: '12px', background: '#6b7280', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>✕</button>
                  </div>
                </td>
              </tr>
            ) : (
              /* â”€â”€ DATA ROW â”€â”€ */
              <tr key={r.id} onDoubleClick={() => startEdit(r)} style={{ cursor: 'default' }}>
                <td style={{ fontFamily: 'monospace' }}>{r.jJvNo}</td>
                <td>{displayDate(r.jDate)}</td>
                <td style={{ fontFamily: 'monospace' }}>{r.acctCode}</td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#1e40af' }}>
                  {r.jDOrC === 'D' ? r.jCkAmt.toLocaleString('en-US', { minimumFractionDigits: 2 }) : ''}
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#9d174d' }}>
                  {r.jDOrC === 'C' ? r.jCkAmt.toLocaleString('en-US', { minimumFractionDigits: 2 }) : ''}
                </td>
                <td style={{ padding: '4px 6px' }}>
                  <div style={{ display: 'flex', gap: '3px' }}>
                    <button onClick={() => startEdit(r)} title="Edit"
                      style={{ padding: '2px 6px', fontSize: '12px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '3px', cursor: 'pointer' }}>✎</button>
                    <button onClick={() => handleDelete(r)} title="Delete"
                      style={{ padding: '2px 6px', fontSize: '12px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '3px', cursor: 'pointer', color: '#dc2626' }}>✕</button>
                  </div>
                </td>
              </tr>
            ))}

            {/* â”€â”€ ADD ROW (always visible, green tint) â”€â”€ */}
            <tr style={{ background: '#f0fdf4', borderTop: '2px dashed #86efac' }}>
              <td style={{ padding: '5px 6px' }}>
                <input style={{ ...cellInput('#86efac'), textAlign: 'left' }} value={addRow.jJvNo} placeholder="JV#"
                  onChange={e => setAddRow(x => ({ ...x, jJvNo: e.target.value.toUpperCase() }))} maxLength={8} />
              </td>
              <td style={{ padding: '5px 6px' }}>
                <input type="date" style={{ ...cellInput('#86efac'), padding: '3px 4px', textAlign: 'left' }} value={addRow.jDate}
                  onChange={e => setAddRow(x => ({ ...x, jDate: e.target.value }))} />
              </td>
              <td style={{ padding: '5px 6px' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <input style={{ ...cellInput('#86efac'), textAlign: 'left', flex: 1 }} value={addRow.acctCode} placeholder="Acct"
                    list="journal-account-list"
                    onChange={e => setAddRow(x => ({ ...x, acctCode: e.target.value.toUpperCase() }))} maxLength={4}
                    onKeyDown={e => { if (e.key === 'Enter') void handleSaveAdd() }} />
                  <button type="button" onClick={() => openAcctBrowse('add')}
                    style={{ padding: '3px 6px', fontSize: '11px', cursor: 'pointer', border: '1px solid #86efac', borderRadius: '3px', background: '#dcfce7', flexShrink: 0 }}>…</button>
                </div>
              </td>
              <td style={{ padding: '5px 6px' }}>
                <input type="number" style={{ ...cellInput('#86efac'), background: addRow.debit ? '#eff6ff' : '#f0fdf4' }}
                  value={addRow.debit} placeholder="Debit"
                  onFocus={() => setAddRow(x => ({ ...x, credit: '' }))}
                  onChange={e => setAddRow(x => ({ ...x, debit: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') void handleSaveAdd() }} step="0.01" min="0" />
              </td>
              <td style={{ padding: '5px 6px' }}>
                <input type="number" style={{ ...cellInput('#86efac'), background: addRow.credit ? '#fdf2f8' : '#f0fdf4' }}
                  value={addRow.credit} placeholder="Credit"
                  onFocus={() => setAddRow(x => ({ ...x, debit: '' }))}
                  onChange={e => setAddRow(x => ({ ...x, credit: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') void handleSaveAdd() }} step="0.01" min="0" />
              </td>
              <td style={{ padding: '5px 6px' }}>
                <button onClick={handleSaveAdd} disabled={saving}
                  style={{ padding: '4px 8px', fontSize: '12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '3px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                  {saving ? '…' : '+ Add'}
                </button>
              </td>
            </tr>
          </tbody>

          {/* â”€â”€ TOTALS footer â”€â”€ */}
          {records.length > 0 && (
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--border)', fontWeight: 'bold', background: 'var(--background)' }}>
                <td colSpan={3} style={{ padding: '6px 8px' }}>
                  TOTALS
                  {isBalanced
                    ? <span style={{ marginLeft: '10px', fontSize: '11px', color: '#16a34a', fontWeight: 'normal' }}>✓ Balanced</span>
                    : <span style={{ marginLeft: '10px', fontSize: '11px', color: '#dc2626', fontWeight: 'normal' }}>✗ Off by {Math.abs(totalDebit - totalCredit).toFixed(2)}</span>
                  }
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#1e40af', padding: '6px 8px' }}>
                  {totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#9d174d', padding: '6px 8px' }}>
                  {totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
        Double-click any row to edit inline. Fill the green row to add new entries (press Enter to save). Shortcuts: Ctrl+S save, Ctrl+F find, Esc cancel edit.
      </p>
      <p style={{ fontSize: '12px', color: '#0f172a', marginTop: '4px' }}>
        Projected totals with current draft: Debit {projectedDebit.toFixed(2)} | Credit {projectedCredit.toFixed(2)} | Variance {(projectedDebit - projectedCredit).toFixed(2)}
      </p>
      <datalist id="journal-account-list">
        {accounts.map((a) => (
          <option key={a.acctCode} value={a.acctCode}>{a.acctDesc}</option>
        ))}
      </datalist>

      {/* â”€â”€ FIND Dialog â”€â”€ */}
      {showFind && (
        <div className="modal-overlay" onClick={() => setShowFind(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Find by Date</h3>
              <button className="modal-close" onClick={() => setShowFind(false)}>—</button>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>Finds first record with date ≥ selected date.</p>
            <div className="form-group">
              <label className="form-label">Date:</label>
              <input type="date" className="form-input" value={findDate} onChange={e => setFindDate(e.target.value)} autoFocus
                onKeyDown={e => { if (e.key === 'Enter') handleFind() }} />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button className="btn btn-secondary" onClick={() => setShowFind(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleFind}>Find</button>
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€ Account Browse Dialog â”€â”€ */}
      {showAcctBrowse && (
        <div className="modal-overlay" onClick={() => setShowAcctBrowse(false)}>
          <div className="modal" style={{ maxWidth: '460px', maxHeight: '70vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Select Account</h3>
              <button className="modal-close" onClick={() => setShowAcctBrowse(false)}>—</button>
            </div>
            {accounts.length === 0
              ? <p style={{ color: 'var(--text-secondary)' }}>Loading accounts...</p>
              : (
                <table className="data-table" style={{ fontSize: '13px' }}>
                  <thead><tr><th>Code</th><th>Description</th></tr></thead>
                  <tbody>
                    {accounts.map(a => (
                      <tr key={a.acctCode} style={{ cursor: 'pointer' }} onClick={() => {
                        if (acctTarget === 'add') setAddRow(x => ({ ...x, acctCode: a.acctCode }))
                        else setEditRow(x => ({ ...x, acctCode: a.acctCode }))
                        setShowAcctBrowse(false)
                      }}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{a.acctCode}</td>
                        <td>{a.acctDesc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            }
          </div>
        </div>
      )}

      {showClone && (
        <div className="modal-overlay" onClick={() => setShowClone(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Clone Transaction</h3>
              <button className="modal-close" onClick={() => setShowClone(false)}>—</button>
            </div>
            <div className="form-group">
              <label className="form-label">Source Ref</label>
              <input className="form-input" value={cloneFromRef} onChange={e => setCloneFromRef(e.target.value.toUpperCase())} />
            </div>
            <div className="form-group">
              <label className="form-label">New Ref</label>
              <input className="form-input" value={cloneToRef} onChange={e => setCloneToRef(e.target.value.toUpperCase())} />
            </div>
            <div className="form-group">
              <label className="form-label">Posting Date</label>
              <input type="date" className="form-input" value={cloneDate} onChange={e => setCloneDate(e.target.value)} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-secondary" onClick={() => setShowClone(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => void handleClone()}>Clone</button>
            </div>
          </div>
        </div>
      )}

      {showRecycleBin && (
        <div className="modal-overlay" onClick={() => setShowRecycleBin(false)}>
          <div className="modal" style={{ maxWidth: '760px', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Recycle Bin</h3>
              <button className="modal-close" onClick={() => setShowRecycleBin(false)}>—</button>
            </div>
            <table className="data-table" style={{ fontSize: 12 }}>
              <thead><tr><th>Ref</th><th>Date</th><th>Acct</th><th style={{ textAlign: 'right' }}>Amt</th><th>D/C</th><th></th></tr></thead>
              <tbody>
                {deletedRows.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center' }}>No deleted entries found.</td></tr>
                ) : deletedRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.jJvNo}</td>
                    <td>{displayDate(row.jDate)}</td>
                    <td>{row.acctCode}</td>
                    <td style={{ textAlign: 'right' }}>{row.jCkAmt.toFixed(2)}</td>
                    <td>{row.jDOrC}</td>
                    <td><button className="btn btn-secondary" onClick={() => void handleRestore(row.id)}>Restore</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
