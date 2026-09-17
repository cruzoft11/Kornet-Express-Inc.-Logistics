import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import PageHeader from '../PageHeader'

interface Bank {
  id: number; bankNo: number; bankName: string; bankAddr: string | null; bankAcct: string | null
}

const API_BASE = '/api/fs'
const EMPTY_FORM = { bankNo: 0, bankName: '', bankAddr: '', bankAcct: '' }
const isErr = (m: string) => m.toLowerCase().includes('error') || m.toLowerCase().includes('fail') || m.toLowerCase().includes('invalid') || m.toLowerCase().includes('no record')

export default function FSBanks() {
  const [records, setRecords] = useState<Bank[]>([])
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
      const r = await axios.get(`${API_BASE}/banks`)
      setRecords(r.data?.data ?? []); setIdx(0); setMessage('')
    } catch (e: any) { setMessage(`Error loading: ${e.message}`) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void loadAll() }, [loadAll])

  const handleNext = () => { if (idx >= records.length - 1) { setMessage('This is the last record!'); return }; setIdx(i => i + 1); setMessage('') }
  const handlePrev = () => { if (idx <= 0) { setMessage('This is the first record!'); return }; setIdx(i => i - 1); setMessage('') }

  const handleFind = () => {
    const val = findVal.trim().toUpperCase()
    const found = records.findIndex(r => r.bankName.toUpperCase().includes(val) || r.bankNo.toString() === val)
    if (found < 0) setMessage('Bank not found!')
    else { setIdx(found); setMessage('') }
    setShowFind(false); setFindVal('')
  }

  const handleAdd = () => { setForm(EMPTY_FORM); setMode('add'); setMessage('') }
  const handleSaveAdd = async () => {
    if (!form.bankName.trim()) { setMessage('Bank Name is required'); return }
    setSaving(true)
    try {
      const r = await axios.post(`${API_BASE}/banks`, form)
      const created = r.data?.data ?? r.data
      const newRecs = [...records, created].sort((a, b) => a.bankNo - b.bankNo)
      setRecords(newRecs); setIdx(newRecs.findIndex(r2 => r2.id === created.id)); setMode('view'); setMessage('Bank added.')
    } catch (e: any) { setMessage(`Save failed: ${e.response?.data?.error ?? e.message}`) }
    finally { setSaving(false) }
  }

  const handleEdit = () => { if (!current) { setMessage('No record selected'); return }; setForm({ bankNo: current.bankNo, bankName: current.bankName, bankAddr: current.bankAddr ?? '', bankAcct: current.bankAcct ?? '' }); setMode('edit'); setMessage('') }
  const handleSaveEdit = async () => {
    if (!current) return; setSaving(true)
    try {
      const r = await axios.put(`${API_BASE}/banks/${current.id}`, form)
      const updated = r.data?.data ?? r.data
      setRecords(recs => recs.map((rc, i) => i === idx ? updated : rc)); setMode('view'); setMessage('Bank updated.')
    } catch (e: any) { setMessage(`Update failed: ${e.response?.data?.error ?? e.message}`) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!current) { setMessage('No record selected'); return }
    if (!window.confirm(`Delete bank ${current.bankNo} - ${current.bankName}?`)) return
    try {
      await axios.delete(`${API_BASE}/banks/${current.id}`)
      const newRecs = records.filter((_, i) => i !== idx)
      setRecords(newRecs); setIdx(Math.max(0, Math.min(idx, newRecs.length - 1))); setMessage('Bank deleted.')
    } catch (e: any) { setMessage(`Delete failed: ${e.message}`) }
  }

  return (
    <div className="flex flex-col gap-6 max-w-[1000px]">
      <PageHeader
        breadcrumb="MASTER FILES / BANKS"
        title="Banks"
        subtitle={`Banks Maintenance · Record ${records.length === 0 ? 0 : idx + 1} of ${records.length}`}
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
        <div className="bg-white border border-outline-variant/15 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          {current ? (
            <div className="grid grid-cols-4 gap-0 divide-x divide-outline-variant/10 border-b border-outline-variant/10">
              {[
                { label: 'Bank No', val: current.bankNo, mono: true },
                { label: 'Bank Name', val: current.bankName, mono: false },
                { label: 'Address', val: current.bankAddr || '—', mono: false },
                { label: 'Account No', val: current.bankAcct || '—', mono: true },
              ].map(f => (
                <div key={f.label} className="px-6 py-5">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/50 mb-1">{f.label}</div>
                  <div className={`text-base font-bold text-on-surface ${f.mono ? 'font-mono text-primary' : ''} truncate`} title={f.val?.toString()}>{f.val}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-14 text-on-surface-variant/40">
              <span className="material-symbols-outlined text-4xl mb-2">account_balance</span>
              <p className="text-sm">No records. Click Add New to create the first entry.</p>
            </div>
          )}

          {/* Navigation / Actions Footer */}
          <div className="flex items-center justify-between px-6 py-4 bg-surface-container-highest/20">
            <div className="flex items-center gap-2">
              <button disabled={idx <= 0} onClick={handlePrev} className="px-4 py-2 border border-outline-variant/30 rounded-lg text-sm font-medium hover:bg-surface-variant disabled:opacity-30 transition-colors">
                <span className="material-symbols-outlined text-[14px] mr-1 align-middle">chevron_left</span>Prev
              </button>
              <button disabled={idx >= records.length - 1} onClick={handleNext} className="px-4 py-2 border border-outline-variant/30 rounded-lg text-sm font-medium hover:bg-surface-variant disabled:opacity-30 transition-colors">
                Next<span className="material-symbols-outlined text-[14px] ml-1 align-middle">chevron_right</span>
              </button>
              <button onClick={() => setShowFind(true)} className="ml-2 px-4 py-2 bg-surface-variant/50 text-on-surface border border-outline-variant/20 rounded-lg text-sm font-medium hover:bg-surface-variant transition-colors flex items-center gap-1.5 focus:ring-2 focus:ring-primary/20">
                <span className="material-symbols-outlined text-[16px]">search</span> Find
              </button>
            </div>
            {current && (
              <div className="flex items-center gap-3">
                <button onClick={handleEdit} className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">Edit</button>
                <button onClick={handleDelete} className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors">Delete</button>
              </div>
            )}
          </div>
        </div>
      )}

      {(mode === 'add' || mode === 'edit') && (
        <div className="bg-white border border-outline-variant/15 rounded-2xl shadow-sm p-6 max-w-2xl">
          <h2 className="text-lg font-bold text-on-surface mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">{mode === 'add' ? 'add_circle' : 'edit'}</span>
            {mode === 'add' ? 'Add New Bank' : `Edit Bank ${current?.bankNo}`}
          </h2>
          
          <div className="grid grid-cols-2 gap-5 mb-8">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-1.5 uppercase tracking-wider">Bank No</label>
              <input type="number" value={form.bankNo} onChange={e => setForm({ ...form, bankNo: parseInt(e.target.value) || 0 })} className="w-full h-11 px-4 border border-outline-variant/50 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-mono" />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-1.5 uppercase tracking-wider">Bank Name <span className="text-red-500">*</span></label>
              <input autoFocus type="text" value={form.bankName} onChange={e => setForm({ ...form, bankName: e.target.value })} className="w-full h-11 px-4 border border-outline-variant/50 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all uppercase" placeholder="e.g. BDO" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-on-surface-variant mb-1.5 uppercase tracking-wider">Address</label>
              <input type="text" value={form.bankAddr} onChange={e => setForm({ ...form, bankAddr: e.target.value })} className="w-full h-11 px-4 border border-outline-variant/50 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all uppercase" placeholder="e.g. MAKATI CITY" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-on-surface-variant mb-1.5 uppercase tracking-wider">Account No</label>
              <input type="text" value={form.bankAcct} onChange={e => setForm({ ...form, bankAcct: e.target.value })} className="w-full h-11 px-4 border border-outline-variant/50 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-mono" placeholder="e.g. 1234-5678-90" />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-outline-variant/10">
            <button onClick={mode === 'add' ? handleSaveAdd : handleSaveEdit} disabled={saving} className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2">
              {saving ? <span className="material-symbols-outlined text-[18px] animate-spin">sync</span> : <span className="material-symbols-outlined text-[18px]">save</span>}
              Save Record
            </button>
            <button onClick={() => setMode('view')} className="px-6 py-2.5 border border-outline-variant/30 font-bold rounded-xl hover:bg-surface-variant transition-colors text-on-surface-variant">Cancel</button>
          </div>
        </div>
      )}

      {/* Find Dialog */}
      {showFind && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-[400px] overflow-hidden">
            <div className="px-6 py-4 border-b border-outline-variant/10 bg-surface-container-highest/30 flex justify-between items-center">
              <h3 className="font-bold text-on-surface">Find Bank</h3>
              <button onClick={() => setShowFind(false)} className="text-on-surface-variant hover:text-on-surface">✕</button>
            </div>
            <div className="p-6">
              <label className="block text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-wider">Bank Name or No.</label>
              <input autoFocus type="text" value={findVal} onChange={e => setFindVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleFind()} className="w-full h-12 px-4 border-2 border-primary/20 rounded-xl focus:border-primary focus:ring-0 outline-none transition-all text-base file:uppercase uppercase" placeholder="Search..." />
              <div className="mt-6 flex gap-3 justify-end">
                <button onClick={() => setShowFind(false)} className="px-5 py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-variant rounded-lg transition-colors">Cancel</button>
                <button onClick={handleFind} className="px-5 py-2 text-sm font-bold bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-sm">Search</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
