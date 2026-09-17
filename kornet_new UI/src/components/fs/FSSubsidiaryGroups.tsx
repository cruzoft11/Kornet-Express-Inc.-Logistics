import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import PageHeader from '../PageHeader'

// A_EDTCOD.PRG — f_a_edtcod(m_which=4) — Schedule table
interface ScheduleEntry {
  id: number; glHead: string; acctCode: string; acctDesc: string | null
}
interface AccountLookup { acctCode: string; acctDesc: string }

const API_BASE = '/api/fs'
function mapItem(raw: any): ScheduleEntry {
  return { id: raw.id ?? 0, glHead: raw.glHead ?? raw.gl_head ?? '', acctCode: raw.acctCode ?? raw.acct_code ?? '', acctDesc: raw.acctDesc ?? raw.acct_desc ?? '' }
}
const EMPTY_FORM = { glHead: '', acctCode: '', acctDesc: '' }
const isErr = (m: string) => m.toLowerCase().includes('error') || m.toLowerCase().includes('fail') || m.toLowerCase().includes('invalid') || m.toLowerCase().includes('no record')

export default function FSSubsidiaryGroups() {
  const [records, setRecords] = useState<ScheduleEntry[]>([])
  const [idx, setIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [mode, setMode] = useState<'view' | 'add' | 'edit'>('view')
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [showFind, setShowFind] = useState(false)
  const [findVal, setFindVal] = useState('')
  const [showAccts, setShowAccts] = useState(false)
  const [accounts, setAccounts] = useState<AccountLookup[]>([])
  const [acctValidating, setAcctValidating] = useState(false)

  const current = records[idx] ?? null

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const r = await axios.get(`${API_BASE}/subsidiary-groups`)
      setRecords((r.data?.data ?? []).map(mapItem)); setIdx(0); setMessage('')
    } catch (e: any) { setMessage(`Error loading: ${e.message}`) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void loadAll() }, [loadAll])

  const loadAccounts = async () => {
    if (accounts.length > 0) { setShowAccts(true); return }
    try {
      const r = await axios.get(`${API_BASE}/accounts`)
      setAccounts((r.data?.data ?? []).map((a: any) => ({ acctCode: a.acctCode ?? a.acct_code, acctDesc: a.acctDesc ?? a.acct_desc })))
    } catch { /* ignore */ }
    setShowAccts(true)
  }

  const validateAcctCode = async (code: string) => {
    if (!code.trim()) { setForm(f => ({ ...f, acctDesc: '' })); return }
    setAcctValidating(true)
    try {
      const r = await axios.get(`${API_BASE}/accounts`)
      const all: AccountLookup[] = (r.data?.data ?? []).map((a: any) => ({ acctCode: a.acctCode ?? a.acct_code, acctDesc: a.acctDesc ?? a.acct_desc }))
      const found = all.find(a => a.acctCode.toUpperCase() === code.toUpperCase())
      if (found) { setForm(f => ({ ...f, acctCode: found.acctCode, acctDesc: found.acctDesc })); setMessage('') }
      else { setForm(f => ({ ...f, acctDesc: '' })); setMessage('Invalid Account Code!') }
    } catch { /* ignore */ } finally { setAcctValidating(false) }
  }

  const handleNext = () => { if (idx >= records.length - 1) { setMessage('This is the last record!'); return }; setIdx(i => i + 1); setMessage('') }
  const handlePrev = () => { if (idx <= 0) { setMessage('This is the first record!'); return }; setIdx(i => i - 1); setMessage('') }

  const handleFind = () => {
    const val = findVal.trim()
    const found = records.findIndex(r => r.glHead.toUpperCase() >= val.toUpperCase())
    if (found < 0) setMessage('There is no record beyond that code!')
    else { setIdx(found); setMessage('') }
    setShowFind(false); setFindVal('')
  }

  const handleAdd = () => { setForm(EMPTY_FORM); setMode('add'); setMessage('') }
  const handleSaveAdd = async () => {
    if (!form.glHead.trim()) { setMessage('Schedule Group is required'); return }
    if (!form.acctCode.trim()) { setMessage('Account Code is required'); return }
    setSaving(true)
    try {
      const r = await axios.post(`${API_BASE}/subsidiary-groups`, { glHead: form.glHead, acctCode: form.acctCode.toUpperCase(), acctDesc: form.acctDesc })
      const created = mapItem(r.data?.data ?? r.data)
      const newRecs = [...records, created].sort((a, b) => a.glHead.localeCompare(b.glHead) || a.acctCode.localeCompare(b.acctCode))
      setRecords(newRecs); setIdx(newRecs.findIndex(r2 => r2.id === created.id)); setMode('view'); setMessage('Record added.')
    } catch (e: any) { setMessage(`Save failed: ${e.response?.data?.error ?? e.message}`) }
    finally { setSaving(false) }
  }

  const handleEdit = () => { if (!current) { setMessage('No record selected'); return }; setForm({ glHead: current.glHead, acctCode: current.acctCode, acctDesc: current.acctDesc ?? '' }); setMode('edit'); setMessage('') }
  const handleSaveEdit = async () => {
    if (!current) return; setSaving(true)
    try {
      const r = await axios.put(`${API_BASE}/subsidiary-groups/${current.id}`, { glHead: form.glHead, acctCode: form.acctCode.toUpperCase(), acctDesc: form.acctDesc })
      const updated = mapItem(r.data?.data ?? r.data)
      setRecords(recs => recs.map((rc, i) => i === idx ? updated : rc)); setMode('view'); setMessage('Record updated.')
    } catch (e: any) { setMessage(`Update failed: ${e.response?.data?.error ?? e.message}`) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!current) { setMessage('No record selected'); return }
    if (!window.confirm(`Delete schedule entry ${current.glHead} / ${current.acctCode}?`)) return
    try {
      await axios.delete(`${API_BASE}/subsidiary-groups/${current.id}`)
      const newRecs = records.filter((_, i) => i !== idx)
      setRecords(newRecs); setIdx(Math.max(0, Math.min(idx, newRecs.length - 1))); setMessage('Record deleted.')
    } catch (e: any) { setMessage(`Delete failed: ${e.message}`) }
  }

  return (
    <div className="flex flex-col gap-6 max-w-[900px]">
      <PageHeader
        breadcrumb="MASTER FILES / SUBSIDIARY GROUPS"
        title="Subsidiary Groups"
        subtitle={`Schedule table (fs_schedule) · Record ${records.length === 0 ? 0 : idx + 1} of ${records.length}`}
        actions={mode === 'view' ? (
          <button onClick={handleAdd} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-sm hover:bg-primary/90 transition-colors">
            <span className="material-symbols-outlined text-[16px]">add</span> Add New
          </button>
        ) : undefined}
      />

      {loading && <div className="flex items-center gap-2 py-6 text-on-surface-variant/60 text-sm animate-pulse"><span className="material-symbols-outlined text-[18px] animate-spin">sync</span>Loading…</div>}

      {message && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border-l-4 text-sm font-medium ${isErr(message) ? 'bg-red-50 text-red-800 border-red-500' : 'bg-emerald-50 text-emerald-800 border-emerald-500'}`}>
          <span className="material-symbols-outlined text-[16px]">{isErr(message) ? 'error' : 'check_circle'}</span>
          {message}
          <button onClick={() => setMessage('')} className="ml-auto opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {mode === 'view' && (
        <div className="bg-white border border-outline-variant/15 rounded-2xl shadow-sm overflow-hidden">
          {current ? (
            <div className="grid grid-cols-3 gap-0 divide-x divide-outline-variant/10 border-b border-outline-variant/10">
              {[
                { label: 'Schedule Group', val: current.glHead, mono: false },
                { label: 'Account Code', val: current.acctCode, mono: true },
                { label: 'Description (auto-filled)', val: current.acctDesc || '—', mono: false },
              ].map(f => (
                <div key={f.label} className="px-6 py-5">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/50 mb-1">{f.label}</div>
                  <div className={`text-base font-bold text-on-surface ${f.mono ? 'font-mono text-primary' : ''}`}>{f.val}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-14 text-on-surface-variant/40">
              <span className="material-symbols-outlined text-4xl mb-2">account_tree</span>
              <p className="text-sm">No records. Click Add New to create the first entry.</p>
            </div>
          )}

          {records.length > 0 && (
            <div className="max-h-56 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-container-highest text-[10px] uppercase font-bold text-on-surface-variant/60 tracking-widest sticky top-0">
                  <tr>
                    <th className="px-5 py-2.5 text-left">Schedule Group</th>
                    <th className="px-5 py-2.5 text-left">Account Code</th>
                    <th className="px-5 py-2.5 text-left">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {records.map((r, i) => (
                    <tr key={r.id} onClick={() => { setIdx(i); setMessage('') }}
                      className={`cursor-pointer transition-colors hover:bg-primary/5 ${i === idx ? 'bg-primary/10' : ''}`}>
                      <td className="px-5 py-2.5 font-medium text-on-surface">{r.glHead}</td>
                      <td className="px-5 py-2.5 font-mono font-bold text-primary">{r.acctCode}</td>
                      <td className="px-5 py-2.5 text-on-surface-variant">{r.acctDesc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="px-5 py-3 border-t border-outline-variant/10 flex flex-wrap items-center gap-2 bg-surface-container-lowest">
            {[
              { label: 'ADD', icon: 'add', action: handleAdd, danger: false },
              { label: 'FIND', icon: 'search', action: () => { setFindVal(''); setShowFind(true) }, danger: false },
              { label: 'EDIT', icon: 'edit', action: handleEdit, disabled: !current, danger: false },
              { label: 'PREV', icon: 'chevron_left', action: handlePrev, disabled: records.length === 0, danger: false },
              { label: 'NEXT', icon: 'chevron_right', action: handleNext, disabled: records.length === 0, danger: false },
              { label: 'DELETE', icon: 'delete', action: handleDelete, disabled: !current, danger: true },
            ].map(b => (
              <button key={b.label} onClick={b.action} disabled={(b as any).disabled}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-40 ${b.danger ? 'border border-error/30 text-error hover:bg-error hover:text-white' : b.label === 'ADD' ? 'bg-primary text-white hover:bg-primary/90' : 'border border-outline-variant/20 text-on-surface-variant hover:bg-surface-container'}`}>
                <span className="material-symbols-outlined text-[14px]">{b.icon}</span> {b.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {(mode === 'add' || mode === 'edit') && (
        <div className="bg-white border border-outline-variant/15 rounded-2xl shadow-sm p-6">
          <h4 className="font-headline font-bold text-on-surface mb-5">{mode === 'add' ? 'Add New Schedule Entry' : 'Edit Schedule Entry'}</h4>
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div className="col-span-1">
              <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/60 mb-1">Schedule Group *</label>
              <input type="text" maxLength={30} autoFocus value={form.glHead}
                onChange={e => setForm(f => ({ ...f, glHead: e.target.value }))}
                className="w-full px-3 py-2 border border-outline-variant/20 rounded-lg text-sm bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/60 mb-1">Account Code *</label>
              <div className="flex gap-2">
                <input type="text" maxLength={4} value={form.acctCode}
                  onChange={e => setForm(f => ({ ...f, acctCode: e.target.value.toUpperCase() }))}
                  onBlur={e => void validateAcctCode(e.target.value)}
                  className="flex-1 w-0 px-3 py-2 border border-outline-variant/20 rounded-lg text-sm font-mono bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <button onClick={() => void loadAccounts()} className="px-3 py-2 border border-outline-variant/20 rounded-lg text-sm text-on-surface-variant hover:bg-surface-container transition-colors">…</button>
              </div>
              {acctValidating && <p className="text-[11px] text-on-surface-variant/60 mt-1">Validating…</p>}
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/60 mb-1">Description (auto-filled)</label>
              <input type="text" value={form.acctDesc} readOnly
                className="w-full px-3 py-2 border border-outline-variant/10 rounded-lg text-sm bg-surface-container/40 text-on-surface-variant" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={mode === 'add' ? handleSaveAdd : handleSaveEdit} disabled={saving}
              className="px-5 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 disabled:opacity-60 transition-colors">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => { setMode('view'); setMessage('') }} disabled={saving}
              className="px-4 py-2 border border-outline-variant/20 text-on-surface-variant rounded-lg text-sm font-medium hover:bg-surface-container transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* FIND Dialog */}
      {showFind && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowFind(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-80 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-headline font-bold text-on-surface mb-1">Find Schedule Entry</h3>
            <p className="text-xs text-on-surface-variant/60 mb-4">Soft-seek by Schedule Group name</p>
            <input type="text" maxLength={30} autoFocus value={findVal}
              onChange={e => setFindVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleFind() }}
              placeholder="Schedule Group…"
              className="w-full px-3 py-2 border border-outline-variant/20 rounded-lg text-sm bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30 mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setShowFind(false)} className="flex-1 px-3 py-2 border border-outline-variant/20 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors">Cancel</button>
              <button onClick={handleFind} className="flex-1 px-3 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors">Find</button>
            </div>
          </div>
        </div>
      )}

      {/* Account Browse Dialog */}
      {showAccts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowAccts(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-[420px] max-h-[60vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-outline-variant/10 flex items-center justify-between">
              <h3 className="font-headline font-bold text-on-surface">Select Account</h3>
              <button onClick={() => setShowAccts(false)} className="text-on-surface-variant/60 hover:text-on-surface"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="overflow-y-auto flex-grow">
              <table className="w-full text-sm">
                <thead className="bg-surface-container-highest text-[10px] uppercase font-bold text-on-surface-variant/60 tracking-widest sticky top-0">
                  <tr><th className="px-5 py-2.5 text-left">Code</th><th className="px-5 py-2.5 text-left">Description</th></tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {accounts.map(a => (
                    <tr key={a.acctCode} onClick={() => { setForm(f => ({ ...f, acctCode: a.acctCode, acctDesc: a.acctDesc })); setShowAccts(false); setMessage('') }}
                      className="cursor-pointer hover:bg-primary/5 transition-colors">
                      <td className="px-5 py-2.5 font-mono font-bold text-primary">{a.acctCode}</td>
                      <td className="px-5 py-2.5 text-on-surface">{a.acctDesc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
