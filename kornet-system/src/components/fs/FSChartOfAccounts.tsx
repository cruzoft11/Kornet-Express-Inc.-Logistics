import { useState, useEffect } from 'react'
import axios from 'axios'
import PageHeader from '../PageHeader'
import { useDebounce } from '../../hooks/useDebounce'

interface Account {
  acctCode: string
  acctDesc: string
  openBal: number
  curDebit: number
  curCredit: number
  glReport: string
  glEffect: string
  formula: string
  initialize: boolean
  schedule?: string | null
}

const ACCOUNT_GROUPS = [
  { key: 'asset', label: 'Asset', icon: 'account_balance' },
  { key: 'liability', label: 'Liability', icon: 'payments' },
  { key: 'equity', label: 'Equity', icon: 'pie_chart' },
  { key: 'revenue', label: 'Revenue', icon: 'trending_up' },
  { key: 'expense', label: 'Expense', icon: 'receipt_long' },
]

// Categorize by account code prefix, matching the original PRG system:
// 1xxx = Asset, 2xxx = Liability, 3xxx = Equity, 4xxx = Revenue, 5xxx+ = Expense
function getGroup(a: Account): string {
  const code = (a.acctCode || '').trim()
  const first = code.charAt(0)
  if (first === '1') return 'asset'
  if (first === '2') return 'liability'
  if (first === '3') return 'equity'
  if (first === '4') return 'revenue'
  return 'expense' // 5xxx and above
}

function fmt(n: number) {
  return n.toLocaleString('en-PH', { minimumFractionDigits: 2 })
}

export default function FSChartOfAccounts() {
  const API_BASE = '/api/fs'
  const [accounts, setAccounts] = useState<Account[]>([])
  const [currentAccountIndex, setCurrentAccountIndex] = useState(0)
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [editMode, setEditMode] = useState<'add' | 'edit' | null>(null)
  const [showFindDialog, setShowFindDialog] = useState(false)
  const [findCode, setFindCode] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['asset']))
  const debouncedFindCode = useDebounce(findCode, 300)

  // Form state
  const [acctCode, setAcctCode] = useState('')
  const [acctDesc, setAcctDesc] = useState('')
  const [openBal, setOpenBal] = useState('0.00')
  const [curDebit, setCurDebit] = useState('0.00')
  const [curCredit, setCurCredit] = useState('0.00')
  const [glReport, setGlReport] = useState('')
  const [glEffect, setGlEffect] = useState('')
  const [formula, setFormula] = useState('DC')
  const [initialize, setInitialize] = useState(false)
  const [schedule, setSchedule] = useState('')
  const [scheduleGroups, setScheduleGroups] = useState<string[]>([])

  useEffect(() => { loadAllAccounts() }, [])
  useEffect(() => { loadScheduleGroups() }, [])
  useEffect(() => {
    if (accounts.length > 0 && currentAccountIndex >= 0 && currentAccountIndex < accounts.length) {
      displayAccount(accounts[currentAccountIndex])
    }
  }, [currentAccountIndex, accounts])

  const loadAllAccounts = async () => {
    setIsLoading(true)
    try {
      const res = await axios.get(`${API_BASE}/accounts`)
      const data = res.data?.data || res.data || []
      setAccounts(data)
      if (data.length > 0) { setCurrentAccountIndex(0); displayAccount(data[0]) }
    } catch (e: any) {
      const status = e?.response?.status ?? 0
      if (status !== 401 && status !== 404) {
        setMessage(`Error: ${e.message}`)
      }
    } finally { setIsLoading(false) }
  }

  // Distinct schedule groups (gl_head) already used in fs_schedule, for the picker.
  const loadScheduleGroups = async () => {
    try {
      const res = await axios.get(`${API_BASE}/subsidiary-groups`)
      const rows = res.data?.data ?? []
      const heads = Array.from(new Set(rows.map((r: any) => (r.glHead ?? r.gl_head ?? '').trim()).filter(Boolean))) as string[]
      setScheduleGroups(heads.sort((a, b) => a.localeCompare(b)))
    } catch { /* non-fatal */ }
  }

  const displayAccount = (a: Account) => {
    setAcctCode(a.acctCode || '')
    setAcctDesc(a.acctDesc || '')
    setOpenBal(parseFloat(String(a.openBal || 0)).toFixed(2))
    setCurDebit(parseFloat(String(a.curDebit || 0)).toFixed(2))
    setCurCredit(parseFloat(String(a.curCredit || 0)).toFixed(2))
    setGlReport(a.glReport || '')
    setGlEffect(a.glEffect || '')
    setFormula(a.formula || 'DC')
    setInitialize(a.initialize === true || (a.initialize as any) === 'Y')
    setSchedule(a.schedule || '')
  }

  const clearDisplay = () => {
    setAcctCode(''); setAcctDesc(''); setOpenBal('0.00')
    setCurDebit('0.00'); setCurCredit('0.00')
    setGlReport(''); setGlEffect(''); setFormula('DC'); setInitialize(false)
    setSchedule('')
  }

  const handleFind = async (codeToSearch: string) => {
    if (!codeToSearch.trim()) return
    try {
      const res = await axios.get(`${API_BASE}/accounts/navigation/seek/${codeToSearch}`)
      const account = res.data?.data
      if (account) {
        const idx = accounts.findIndex(a => a.acctCode === account.acctCode)
        if (idx >= 0) {
          setCurrentAccountIndex(idx)
          setSelectedGroup(getGroup(account))
          setExpandedGroups(prev => new Set([...prev, getGroup(account)]))
        }
      }
    } catch (e: any) { setMessage(`Find failed: ${e.message}`) }
  }

  // Auto-search when debounced string changes
  useEffect(() => {
    if (debouncedFindCode.trim()) {
      handleFind(debouncedFindCode)
    }
  }, [debouncedFindCode])

  const handleSave = async () => {
    if (!acctCode.trim()) { setMessage('Account Code is required'); return }
    if (!acctDesc.trim()) { setMessage('Account Description is required'); return }
    // A balance-sheet account with no schedule group won't appear in the Subsidiary
    // Schedule. Warn so it isn't silently omitted (this was the JIMI 1116 issue).
    if (glReport.trim().toUpperCase().startsWith('B') && !schedule.trim()) {
      const proceed = window.confirm(
        'This looks like a balance sheet account but no Subsidiary Schedule Group is set, ' +
        'so it will NOT appear in the Subsidiary Schedule.\n\nSave without a schedule group?')
      if (!proceed) return
    }
    const payload = {
      acctCode: acctCode.toUpperCase(), acctDesc,
      openBal: parseFloat(openBal) || 0, curDebit: parseFloat(curDebit) || 0,
      curCredit: parseFloat(curCredit) || 0, glReport: glReport.toUpperCase(),
      glEffect: glEffect.toUpperCase(), formula: formula.toUpperCase(), initialize,
      schedule: schedule.trim()
    }
    try {
      if (editMode === 'add') {
        const res = await axios.post(`${API_BASE}/accounts`, payload)
        setAccounts([...accounts, res.data?.data || payload as Account])
        setMessage(`Account ${payload.acctCode} added`)
      } else {
        await axios.put(`${API_BASE}/accounts/${acctCode}`, payload)
        setAccounts(accounts.map(a => a.acctCode === acctCode ? { ...a, ...payload } : a))
        setMessage(`Account ${payload.acctCode} updated`)
      }
      if (payload.schedule) loadScheduleGroups()
      setEditMode(null)
    } catch (e: any) { setMessage(`Error: ${e.response?.data?.message || e.message}`) }
  }

  const handleDelete = async () => {
    if (!acctCode || !window.confirm(`Delete account ${acctCode}?`)) return
    try {
      await axios.delete(`${API_BASE}/accounts/${acctCode}`)
      const updated = accounts.filter(a => a.acctCode !== acctCode)
      setAccounts(updated)
      if (updated.length > 0) setCurrentAccountIndex(Math.min(currentAccountIndex, updated.length - 1))
      else clearDisplay()
      setMessage(`Account ${acctCode} deleted`)
    } catch (e: any) { setMessage(`Error: ${e.message}`) }
  }

  const current = accounts[currentAccountIndex] || null
  const filteredAccounts = selectedGroup
    ? accounts.filter(a => getGroup(a) === selectedGroup)
    : accounts


  return (
    <div className="flex gap-0 h-full -mx-10 -my-10">
      {/* ── Left Account Tree ─────────────────────────────────── */}
      <div className="w-56 flex-shrink-0 bg-surface-container-low border-r border-outline-variant/15 flex flex-col overflow-y-auto">
        <div className="px-4 py-4 border-b border-outline-variant/10">
          <div className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/50">Accounts</div>
        </div>
        <nav className="flex-grow py-2">
          {ACCOUNT_GROUPS.map(group => {
            const groupAccounts = accounts.filter(a => getGroup(a) === group.key)
            const isExpanded = expandedGroups.has(group.key)
            const isSelected = selectedGroup === group.key
            return (
              <div key={group.key}>
                <button
                  onClick={() => {
                    setSelectedGroup(isSelected ? null : group.key)
                    setExpandedGroups(prev => {
                      const next = new Set(prev)
                      isExpanded ? next.delete(group.key) : next.add(group.key)
                      return next
                    })
                  }}
                  className={`w-full flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${isSelected ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container'}`}
                >
                  <span className="material-symbols-outlined text-[16px]">{group.icon}</span>
                  <span className="flex-grow text-left">{group.label}</span>
                  <span className="text-[10px] font-bold">{groupAccounts.length}</span>
                  <span className="material-symbols-outlined text-[12px]">{isExpanded ? 'expand_less' : 'expand_more'}</span>
                </button>
                {isExpanded && groupAccounts.slice(0, 8).map(a => (
                  <button
                    key={a.acctCode}
                    onClick={() => {
                      const idx = accounts.findIndex(acc => acc.acctCode === a.acctCode)
                      if (idx >= 0) { setCurrentAccountIndex(idx); setEditMode(null) }
                    }}
                    className={`w-full flex items-center gap-2 pl-9 pr-4 py-1.5 text-xs transition-colors ${acctCode === a.acctCode ? 'bg-primary text-white font-semibold' : 'text-on-surface-variant hover:bg-surface-container-highest'}`}
                  >
                    <span className="font-mono font-bold">{a.acctCode}</span>
                    <span className="truncate">{a.acctDesc}</span>
                  </button>
                ))}
                {isExpanded && groupAccounts.length > 8 && (
                  <div className="pl-9 py-1 text-[10px] text-on-surface-variant/40">+{groupAccounts.length - 8} more</div>
                )}
              </div>
            )
          })}
        </nav>
        <div className="px-4 py-3 border-t border-outline-variant/10">
          <button onClick={() => { clearDisplay(); setEditMode('add') }} className="w-full text-xs font-bold text-primary hover:text-primary/70 transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">add</span> New Account
          </button>
        </div>
      </div>

      {/* ── Right Content Area ─────────────────────────────────── */}
      <div className="flex-grow flex flex-col overflow-y-auto p-6">
        <PageHeader
          breadcrumb="FILE MAINTENANCE"
          title="Chart of Accounts"
          subtitle="Configure the hierarchical ledger structure for fiscal management, balance reporting, and financial statement generation."
          actions={
            <>
              {!editMode && (
                <>
                  <button onClick={() => setShowFindDialog(true)} className="flex items-center gap-1.5 px-3 py-2 border border-outline-variant/20 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors">
                    <span className="material-symbols-outlined text-[16px]">search</span> Find
                  </button>
                  <button onClick={() => { if (acctCode) setEditMode('edit') }} disabled={!acctCode} className="flex items-center gap-1.5 px-3 py-2 border border-outline-variant/20 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-40">
                    <span className="material-symbols-outlined text-[16px]">edit</span> Edit
                  </button>
                  <button onClick={handleDelete} disabled={!acctCode} className="flex items-center gap-1.5 px-3 py-2 border border-error/20 rounded-lg text-sm font-medium text-error hover:bg-error/5 transition-colors disabled:opacity-40">
                    <span className="material-symbols-outlined text-[16px]">delete</span> Delete
                  </button>
                  <button onClick={() => { clearDisplay(); setEditMode('add') }} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-sm hover:bg-primary/90 transition-colors">
                    <span className="material-symbols-outlined text-[16px]">add</span> New Account
                  </button>
                </>
              )}
              {editMode && (
                <>
                  <button onClick={() => { setEditMode(null); if (accounts.length > 0) displayAccount(accounts[currentAccountIndex]) }} className="px-4 py-2 border border-outline-variant/20 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleSave} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-sm hover:bg-primary/90 transition-colors">
                    Save Account
                  </button>
                </>
              )}
            </>
          }
        />

        {/* Status message */}
        {message && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm flex items-center gap-2 ${message.includes('Error') ? 'bg-error/10 text-error border border-error/20' : 'bg-[#3f89ff]/10 text-primary border border-primary/20'}`}>
            <span className="material-symbols-outlined text-[16px]">{message.includes('Error') ? 'error' : 'check_circle'}</span>
            {message}
          </div>
        )}

        {isLoading && (
          <div className="text-center py-12 text-on-surface-variant/60 text-sm animate-pulse">Loading accounts...</div>
        )}

        {!isLoading && accounts.length === 0 && !editMode && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <span className="material-symbols-outlined text-5xl text-on-surface-variant/20 mb-4">account_tree</span>
            <p className="font-semibold text-on-surface-variant">No accounts in system</p>
            <p className="text-sm text-on-surface-variant/60 mt-1 mb-4">Click New Account to create the first account</p>
            <button onClick={() => { clearDisplay(); setEditMode('add') }} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold">+ New Account</button>
          </div>
        )}

        {/* ── Main View: Two-column detail + metadata ─────────── */}
        {!editMode && current && (
          <div className="grid grid-cols-3 gap-6">
            {/* Left: Account form fields */}
            <div className="col-span-2 space-y-5">
              {/* Header fields */}
              <div className="bg-white rounded-2xl border border-outline-variant/15 shadow-sm p-5">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/60 mb-1.5">Account Code <span className="text-error">*</span></label>
                    <div className="px-3 py-2.5 bg-surface-container-highest rounded-lg text-sm font-mono font-bold text-on-surface border border-outline-variant/10">
                      {acctCode}
                    </div>
                    <div className="text-[10px] text-on-surface-variant/40 mt-1">Unique primary ledger identifier.</div>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/60 mb-1.5">Description <span className="text-error">*</span></label>
                    <div className="px-3 py-2.5 bg-surface-container-highest rounded-lg text-sm text-on-surface border border-outline-variant/10">
                      {acctDesc}
                    </div>
                  </div>
                </div>
                {/* Balances row */}
                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-outline-variant/10">
                  {[
                    { label: 'Opening Balance', val: fmt(parseFloat(openBal)) },
                    { label: 'Current Debit', val: fmt(parseFloat(curDebit)) },
                    { label: 'Current Credit', val: fmt(parseFloat(curCredit)) },
                  ].map(f => (
                    <div key={f.label} className="text-center p-3 bg-surface-container-low rounded-xl">
                      <div className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant/60 mb-1">{f.label}</div>
                      <div className="font-mono font-bold text-on-surface">{f.val}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Formula Logic + Report Mapping */}
              <div className="bg-white rounded-2xl border border-outline-variant/15 shadow-sm p-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/60 mb-1.5">Formula Logic</label>
                    <div className="px-3 py-2.5 bg-surface-container-highest rounded-lg text-sm font-medium border border-outline-variant/10">
                      {formula === 'DC' ? 'Debit - Credit (Standard Asset)' : 'Credit - Debit (Standard Liability)'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/60 mb-1.5">Report Mapping</label>
                    <div className="px-3 py-2.5 bg-surface-container-highest rounded-lg text-sm font-medium border border-outline-variant/10">
                      {glReport || '—'} {glEffect ? `/ ${glEffect}` : ''}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-on-surface-variant/60">
                  <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${initialize ? 'bg-primary border-primary' : 'border-outline-variant'}`}>
                    {initialize && <span className="material-symbols-outlined text-white text-[10px]">check</span>}
                  </span>
                  Initialize account for new period calculations
                </div>
              </div>

              {/* Accounts list table (paginated) */}
              {filteredAccounts.length > 0 && (
                <div className="bg-white rounded-2xl border border-outline-variant/15 shadow-sm overflow-hidden">
                  <div className="grid grid-cols-5 px-5 py-2.5 bg-surface-container-highest text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">
                    <span>Code</span><span>Description</span><span className="text-right">Open Bal</span><span className="text-right">Cur Debit</span><span className="text-right">Cur Credit</span>
                  </div>
                  <div className="max-h-[480px] overflow-y-auto custom-scrollbar">
                  {filteredAccounts.map((a) => (
                    <div key={a.acctCode}
                      onClick={() => { const idx = accounts.indexOf(a); if (idx >= 0) setCurrentAccountIndex(idx) }}
                      className={`grid grid-cols-5 px-5 py-3 border-t border-outline-variant/10 cursor-pointer transition-colors text-sm ${a.acctCode === acctCode ? 'bg-primary/5' : 'hover:bg-surface-container-lowest'}`}
                    >
                      <span className={`font-mono font-bold ${a.acctCode === acctCode ? 'text-primary' : ''}`}>{a.acctCode}</span>
                      <span className="text-on-surface-variant truncate">{a.acctDesc}</span>
                      <span className="text-right font-mono text-on-surface">{fmt(a.openBal || 0)}</span>
                      <span className="text-right font-mono text-on-surface">{fmt(a.curDebit || 0)}</span>
                      <span className="text-right font-mono text-on-surface">{fmt(a.curCredit || 0)}</span>
                    </div>
                  ))}
                  </div>
                  <div className="px-5 py-2 bg-surface-container-lowest border-t border-outline-variant/10 flex items-center justify-between">
                    <button 
                      onClick={() => {
                        const currentFilteredIdx = filteredAccounts.findIndex(a => a.acctCode === accounts[currentAccountIndex]?.acctCode);
                        if (currentFilteredIdx > 0) {
                          const target = filteredAccounts[currentFilteredIdx - 1];
                          const globalIdx = accounts.findIndex(a => a.acctCode === target.acctCode);
                          if (globalIdx >= 0) setCurrentAccountIndex(globalIdx);
                        }
                      }} 
                      disabled={filteredAccounts.findIndex(a => a.acctCode === accounts[currentAccountIndex]?.acctCode) <= 0}
                      className="text-xs font-bold text-on-surface-variant/60 hover:text-primary flex items-center gap-1 disabled:opacity-30 disabled:hover:text-on-surface-variant/60"
                    >
                      <span className="material-symbols-outlined text-[14px]">chevron_left</span> Prev
                    </button>
                    <span className="text-[10px] text-on-surface-variant/50">
                      {Math.max(0, filteredAccounts.findIndex(a => a.acctCode === accounts[currentAccountIndex]?.acctCode)) + 1} of {filteredAccounts.length}
                    </span>
                    <button 
                      onClick={() => {
                        const currentFilteredIdx = filteredAccounts.findIndex(a => a.acctCode === accounts[currentAccountIndex]?.acctCode);
                        if (currentFilteredIdx >= 0 && currentFilteredIdx < filteredAccounts.length - 1) {
                          const target = filteredAccounts[currentFilteredIdx + 1];
                          const globalIdx = accounts.findIndex(a => a.acctCode === target.acctCode);
                          if (globalIdx >= 0) setCurrentAccountIndex(globalIdx);
                        }
                      }} 
                      disabled={filteredAccounts.findIndex(a => a.acctCode === accounts[currentAccountIndex]?.acctCode) >= filteredAccounts.length - 1}
                      className="text-xs font-bold text-on-surface-variant/60 hover:text-primary flex items-center gap-1 disabled:opacity-30 disabled:hover:text-on-surface-variant/60"
                    >
                      Next <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right column: account detail info */}
            <div className="flex flex-col gap-4">
              {/* Real Account Info — fields from original PRG system only */}
              <div className="bg-white rounded-2xl border border-outline-variant/15 shadow-sm p-5">
                <h3 className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/60 mb-4">Account Info</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">GL Report Code</span>
                    <span className="font-mono font-bold text-on-surface">{glReport || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">GL Effect Code</span>
                    <span className="font-mono font-bold text-on-surface">{glEffect || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Formula</span>
                    <span className="font-mono font-bold text-on-surface">{formula || 'DC'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-on-surface-variant">Initialize on Close</span>
                    <span className={`px-2 py-0.5 text-[11px] font-bold rounded-full ${
                      initialize ? 'bg-emerald-100 text-emerald-800' : 'bg-surface-container text-on-surface-variant'
                    }`}>{initialize ? 'YES' : 'NO'}</span>
                  </div>
                </div>
              </div>

              {/* Balance summary card */}
              <div className="bg-[#05111E] rounded-2xl p-5 text-white">
                <h3 className="text-[10px] uppercase tracking-widest font-bold text-white/50 mb-4">Balance Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Opening Bal</span>
                    <span className="font-mono font-bold">{fmt(parseFloat(openBal))}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Current Debit</span>
                    <span className="font-mono font-bold text-[#3f89ff]">{fmt(parseFloat(curDebit))}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Current Credit</span>
                    <span className="font-mono font-bold text-[#3f89ff]">{fmt(parseFloat(curCredit))}</span>
                  </div>
                  <div className="border-t border-white/10 pt-2 flex justify-between text-sm font-bold">
                    <span className="text-white/60">End Balance</span>
                    <span className="font-mono">
                      {formula === 'DC'
                        ? fmt(parseFloat(openBal) + parseFloat(curDebit) - parseFloat(curCredit))
                        : fmt(parseFloat(openBal) + parseFloat(curCredit) - parseFloat(curDebit))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Edit / Add Form ─────────────────────────────────── */}
        {editMode && (
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2">
              <div className="bg-white rounded-2xl border border-outline-variant/15 shadow-sm p-6">
                <h3 className="text-sm font-bold text-on-surface mb-5">{editMode === 'add' ? 'New Account' : `Edit Account — ${acctCode}`}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/60 mb-1.5">Account Code <span className="text-error">*</span></label>
                    <input className="w-full px-3 py-2.5 border border-outline-variant/20 rounded-lg text-sm font-mono bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30" value={acctCode} onChange={e => setAcctCode(e.target.value.toUpperCase())} maxLength={4} disabled={editMode === 'edit'} placeholder="e.g. 1010" autoFocus />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/60 mb-1.5">Description <span className="text-error">*</span></label>
                    <input className="w-full px-3 py-2.5 border border-outline-variant/20 rounded-lg text-sm bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30" value={acctDesc} onChange={e => setAcctDesc(e.target.value)} maxLength={30} placeholder="Account description" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/60 mb-1.5">Opening Balance</label>
                    <input type="number" step="0.01" className="w-full px-3 py-2.5 border border-outline-variant/20 rounded-lg text-sm font-mono bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30" value={openBal} onChange={e => setOpenBal(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/60 mb-1.5">Report Code</label>
                    <input className="w-full px-3 py-2.5 border border-outline-variant/20 rounded-lg text-sm font-mono bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30" value={glReport} onChange={e => setGlReport(e.target.value.toUpperCase())} maxLength={4} placeholder="e.g. BS" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/60 mb-1.5">Effect Code</label>
                    <input className="w-full px-3 py-2.5 border border-outline-variant/20 rounded-lg text-sm font-mono bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30" value={glEffect} onChange={e => setGlEffect(e.target.value.toUpperCase())} maxLength={3} placeholder="e.g. DR" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/60 mb-1.5">Formula Logic <span className="text-error">*</span></label>
                    <select className="w-full px-3 py-2.5 border border-outline-variant/20 rounded-lg text-sm bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30" value={formula} onChange={e => setFormula(e.target.value)}>
                      <option value="DC">Debit - Credit (Standard Asset)</option>
                      <option value="CD">Credit - Debit (Standard Liability)</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/60 mb-1.5">Subsidiary Schedule Group</label>
                    <input list="sched-groups" className="w-full px-3 py-2.5 border border-outline-variant/20 rounded-lg text-sm bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30" value={schedule} onChange={e => setSchedule(e.target.value)} maxLength={30} placeholder="e.g. A. CASH IN BANK & ON HAND — pick or type a group" />
                    <datalist id="sched-groups">
                      {scheduleGroups.map(g => <option key={g} value={g} />)}
                    </datalist>
                    <p className="mt-1 text-[11px] text-on-surface-variant/70">Assign a group so this account shows in the Subsidiary Schedule. Leave blank if it doesn't belong in a schedule.</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm">
                  <input type="checkbox" id="init-chk" checked={initialize} onChange={e => setInitialize(e.target.checked)} className="rounded" />
                  <label htmlFor="init-chk" className="text-on-surface-variant cursor-pointer">Initialize account for new period calculations</label>
                </div>
              </div>
            </div>
            {/* side info panel */}
            <div className="bg-surface-container-low rounded-2xl border border-outline-variant/10 p-5">
              <h3 className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/60 mb-4">Field Guide</h3>
              <ul className="space-y-3 text-xs text-on-surface-variant leading-relaxed">
                <li><strong className="text-on-surface">Account Code</strong>: 4-char unique identifier (e.g. 1010)</li>
                <li><strong className="text-on-surface">Report Code</strong>: Maps account to financial report section (e.g. BS for Balance Sheet)</li>
                <li><strong className="text-on-source">Effect Code</strong>: Balance effect direction (DR/CR)</li>
                <li><strong className="text-on-surface">Formula DC</strong>: Debit minus Credit — standard for Asset accounts</li>
                <li><strong className="text-on-surface">Formula CD</strong>: Credit minus Debit — standard for Liability/Equity</li>
                <li><strong className="text-on-surface">Initialize</strong>: Reset balance at year-end close</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* ── Find Dialog ─────────────────────────────────────── */}
      {showFindDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowFindDialog(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-96" onClick={e => e.stopPropagation()}>
            <h2 className="font-headline font-bold text-lg text-on-surface mb-4">Find Account</h2>
            <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/60 mb-1.5">Account Code (Soft-Seek)</label>
            <input autoFocus className="w-full px-3 py-2.5 border border-outline-variant/20 rounded-lg text-sm font-mono bg-surface-container-lowest mb-4 focus:outline-none focus:ring-2 focus:ring-primary/30" value={findCode} onChange={e => setFindCode(e.target.value.toUpperCase())} maxLength={4} placeholder="Enter code (auto-searches)" />
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setShowFindDialog(false); setFindCode('') }} className="px-4 py-2 border border-outline-variant/20 rounded-lg text-sm text-on-surface-variant hover:bg-surface-container">Close</button>
              <button onClick={() => { handleFind(findCode); setShowFindDialog(false); setFindCode('') }} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90">Find</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
