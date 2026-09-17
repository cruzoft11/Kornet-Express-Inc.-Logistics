import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import PageHeader from '../PageHeader'

// A_EDTCOD.PRG — f_a_edtcod(m_which=3) — Effects table
interface GroupCode {
  id: number; glReport: string; glEffect: string; glHead: string | null
}

const API_BASE = '/api/fs'
function mapItem(raw: any): GroupCode {
  return { id: raw.id ?? 0, glReport: raw.glReport ?? raw.gl_report ?? '', glEffect: raw.glEffect ?? raw.gl_effect ?? '', glHead: raw.glHead ?? raw.gl_head ?? '' }
}
const EMPTY_FORM = { glReport: '', glEffect: '', glHead: '' }

const isErr = (m: string) => m.toLowerCase().includes('error') || m.toLowerCase().includes('fail') || m.toLowerCase().includes('invalid') || m.toLowerCase().includes('no record')

export default function FSGroupCodes() {
  const [records, setRecords] = useState<GroupCode[]>([])
  const [idx, setIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [mode, setMode] = useState<'view' | 'add' | 'edit'>('view')
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [showFind, setShowFind] = useState(false)
  const [findVal, setFindVal] = useState('')

  const current = records[idx] ?? null

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const r = await axios.get(`${API_BASE}/group-codes`)
      const data: GroupCode[] = (r.data?.data ?? []).map(mapItem)
      setRecords(data); setIdx(0); setMessage('')
    } catch (e: any) { setMessage(`Error loading: ${e.message}`) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void loadAll() }, [loadAll])

  const handleNext = () => { if (idx >= records.length - 1) { setMessage('This is the last record!'); return }; setIdx(i => i + 1); setMessage('') }
  const handlePrev = () => { if (idx <= 0) { setMessage('This is the first record!'); return }; setIdx(i => i - 1); setMessage('') }

  const handleFind = () => {
    const val = findVal.toUpperCase().trim()
    const found = records.findIndex(r => r.glReport.toUpperCase() >= val)
    if (found < 0) setMessage('There is no record beyond that code!')
    else { setIdx(found); setMessage('') }
    setShowFind(false); setFindVal('')
  }

  const handleAdd = () => { setForm(EMPTY_FORM); setMode('add'); setMessage('') }
  const handleSaveAdd = async () => {
    if (!form.glReport.trim()) { setMessage('Report Code is required'); return }
    if (!form.glEffect.trim()) { setMessage('Effect is required'); return }
    setSaving(true)
    try {
      const r = await axios.post(`${API_BASE}/group-codes`, { glReport: form.glReport.toUpperCase(), glEffect: form.glEffect.toUpperCase(), glHead: form.glHead })
      const created = mapItem(r.data?.data ?? r.data)
      const newRecs = [...records, created].sort((a, b) => a.glReport.localeCompare(b.glReport) || a.glEffect.localeCompare(b.glEffect))
      setRecords(newRecs); setIdx(newRecs.findIndex(r2 => r2.id === created.id)); setMode('view'); setMessage('Record added.')
    } catch (e: any) { setMessage(`Save failed: ${e.response?.data?.error ?? e.message}`) }
    finally { setSaving(false) }
  }

  const handleEdit = () => { if (!current) { setMessage('No record selected'); return }; setForm({ glReport: current.glReport, glEffect: current.glEffect, glHead: current.glHead ?? '' }); setMode('edit'); setMessage('') }
  const handleSaveEdit = async () => {
    if (!current) return; setSaving(true)
    try {
      const r = await axios.put(`${API_BASE}/group-codes/${current.id}`, { glReport: form.glReport.toUpperCase(), glEffect: form.glEffect.toUpperCase(), glHead: form.glHead })
      const updated = mapItem(r.data?.data ?? r.data)
      setRecords(recs => recs.map((rc, i) => i === idx ? updated : rc)); setMode('view'); setMessage('Record updated.')
    } catch (e: any) { setMessage(`Update failed: ${e.response?.data?.error ?? e.message}`) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!current) { setMessage('No record selected'); return }
    if (!window.confirm(`Delete group code ${current.glReport} / ${current.glEffect}?`)) return
    try {
      await axios.delete(`${API_BASE}/group-codes/${current.id}`)
      const newRecs = records.filter((_, i) => i !== idx)
      setRecords(newRecs); setIdx(Math.max(0, Math.min(idx, newRecs.length - 1))); setMessage('Record deleted.')
    } catch (e: any) { setMessage(`Delete failed: ${e.message}`) }
  }

  return (
    <div className="flex flex-col gap-6 max-w-[900px]">
      <PageHeader
        breadcrumb="MASTER FILES / GROUP CODES"
        title="Group Codes"
        subtitle={`Effects table (fs_effects) · Record ${records.length === 0 ? 0 : idx + 1} of ${records.length}`}
        actions={
          mode === 'view' ? (
            <button onClick={handleAdd} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-sm hover:bg-primary/90 transition-colors">
              <span className="material-symbols-outlined text-[16px]">add</span> Add New
            </button>
          ) : undefined
        }
      />

      {loading && <div className="flex items-center gap-2 py-6 text-on-surface-variant/60 text-sm animate-pulse"><span className="material-symbols-outlined text-[18px] animate-spin">sync</span>Loading…</div>}

      {message && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border-l-4 text-sm font-medium ${isErr(message) ? 'bg-red-50 text-red-800 border-red-500' : 'bg-emerald-50 text-emerald-800 border-emerald-500'}`}>
          <span className="material-symbols-outlined text-[16px]">{isErr(message) ? 'error' : 'check_circle'}</span>
          {message}
          <button onClick={() => setMessage('')} className="ml-auto opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Current record display */}
      {mode === 'view' && (
        <div className="bg-white border border-outline-variant/15 rounded-2xl shadow-sm overflow-hidden">
          {/* Selected record header */}
          {current ? (
            <div className="grid grid-cols-3 gap-0 divide-x divide-outline-variant/10 border-b border-outline-variant/10">
              {[
                { label: 'Report Code', val: current.glReport, mono: true },
                { label: 'Effect', val: current.glEffect, mono: true },
                { label: 'Description', val: current.glHead || '—', mono: false },
              ].map(f => (
                <div key={f.label} className="px-6 py-5">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/50 mb-1">{f.label}</div>
                  <div className={`text-base font-bold text-on-surface ${f.mono ? 'font-mono' : ''}`}>{f.val}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-14 text-on-surface-variant/40">
              <span className="material-symbols-outlined text-4xl mb-2">category</span>
              <p className="text-sm">No records. Click Add New to create the first entry.</p>
            </div>
          )}

          {/* Table list */}
          {records.length > 0 && (
            <div className="max-h-56 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-container-highest text-[10px] uppercase font-bold text-on-surface-variant/60 tracking-widest sticky top-0">
                  <tr>
                    <th className="px-5 py-2.5 text-left">Report Code</th>
                    <th className="px-5 py-2.5 text-left">Effect</th>
                    <th className="px-5 py-2.5 text-left">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {records.map((r, i) => (
                    <tr key={r.id} onClick={() => { setIdx(i); setMessage('') }}
                      className={`cursor-pointer transition-colors hover:bg-primary/5 ${i === idx ? 'bg-primary/10' : ''}`}>
                      <td className="px-5 py-2.5 font-mono font-bold text-primary">{r.glReport}</td>
                      <td className="px-5 py-2.5 font-mono text-on-surface-variant">{r.glEffect}</td>
                      <td className="px-5 py-2.5 text-on-surface">{r.glHead}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Action bar */}
          <div className="px-5 py-3 border-t border-outline-variant/10 flex flex-wrap items-center gap-2 bg-surface-container-lowest">
            <button onClick={handleAdd} className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary/90 transition-colors">
              <span className="material-symbols-outlined text-[14px]">add</span> ADD
            </button>
            <button onClick={() => { setFindVal(''); setShowFind(true) }} className="flex items-center gap-1 px-3 py-1.5 border border-outline-variant/20 text-on-surface-variant rounded-lg text-xs font-bold hover:bg-surface-container transition-colors">
              <span className="material-symbols-outlined text-[14px]">search</span> FIND
            </button>
            <button onClick={handleEdit} disabled={!current} className="flex items-center gap-1 px-3 py-1.5 border border-outline-variant/20 text-on-surface-variant rounded-lg text-xs font-bold hover:bg-surface-container transition-colors disabled:opacity-40">
              <span className="material-symbols-outlined text-[14px]">edit</span> EDIT
            </button>
            <button onClick={handlePrev} disabled={records.length === 0} className="flex items-center gap-1 px-3 py-1.5 border border-outline-variant/20 text-on-surface-variant rounded-lg text-xs font-bold hover:bg-surface-container transition-colors disabled:opacity-40">
              <span className="material-symbols-outlined text-[14px]">chevron_left</span> PREV
            </button>
            <button onClick={handleNext} disabled={records.length === 0} className="flex items-center gap-1 px-3 py-1.5 border border-outline-variant/20 text-on-surface-variant rounded-lg text-xs font-bold hover:bg-surface-container transition-colors disabled:opacity-40">
              NEXT <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            </button>
            <button onClick={handleDelete} disabled={!current} className="flex items-center gap-1 px-3 py-1.5 border border-error/30 text-error rounded-lg text-xs font-bold hover:bg-error hover:text-white transition-colors disabled:opacity-40">
              <span className="material-symbols-outlined text-[14px]">delete</span> DELETE
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit form */}
      {(mode === 'add' || mode === 'edit') && (
        <div className="bg-white border border-outline-variant/15 rounded-2xl shadow-sm p-6">
          <h4 className="font-headline font-bold text-on-surface mb-5">{mode === 'add' ? 'Add New Group Code' : 'Edit Group Code'}</h4>
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/60 mb-1">Report Code *</label>
              <input type="text" maxLength={4} autoFocus value={form.glReport}
                onChange={e => setForm(f => ({ ...f, glReport: e.target.value.toUpperCase() }))}
                disabled={mode === 'edit'}
                className="w-full px-3 py-2 border border-outline-variant/20 rounded-lg text-sm font-mono bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/60 mb-1">Effect *</label>
              <input type="text" maxLength={3} value={form.glEffect}
                onChange={e => setForm(f => ({ ...f, glEffect: e.target.value.toUpperCase() }))}
                className="w-full px-3 py-2 border border-outline-variant/20 rounded-lg text-sm font-mono bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/60 mb-1">Description</label>
              <input type="text" maxLength={25} value={form.glHead ?? ''}
                onChange={e => setForm(f => ({ ...f, glHead: e.target.value }))}
                className="w-full px-3 py-2 border border-outline-variant/20 rounded-lg text-sm bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30" />
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
            <h3 className="font-headline font-bold text-on-surface mb-1">Find Group Code</h3>
            <p className="text-xs text-on-surface-variant/60 mb-4">Soft-seek: finds first record with Report Code ≥ entered value</p>
            <input type="text" maxLength={4} autoFocus value={findVal}
              onChange={e => setFindVal(e.target.value.toUpperCase())}
              onKeyDown={e => { if (e.key === 'Enter') handleFind() }}
              placeholder="Report Code…"
              className="w-full px-3 py-2 border border-outline-variant/20 rounded-lg text-sm font-mono bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30 mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setShowFind(false)} className="flex-1 px-3 py-2 border border-outline-variant/20 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors">Cancel</button>
              <button onClick={handleFind} className="flex-1 px-3 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors">Find</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
