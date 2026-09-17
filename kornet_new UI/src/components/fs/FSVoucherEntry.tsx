import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import axios from 'axios'
import { useFsUnsavedStore } from '../../stores/fsUnsavedStore'
import { useDebounce } from '../../hooks/useDebounce'

// --- Types ---
interface CheckMaster {
  id: number
  jJvNo: string
  jCkNo: string
  jDate: string
  jPayTo: string | null
  jCkAmt: number
  jDesc: string | null
  bankNo: number
  supNo: number
}

interface CheckLine {
  id: number
  jCkNo: string
  acctCode: string
  jCkAmt: number
  jDOrC: 'D' | 'C'
}

interface AccountLookup {
  acctCode: string
  acctDesc: string
}

interface BankLookup { id: number; bankNo: number; bankName: string }
interface SupplierLookup { id: number; supNo: number; supName: string }

interface FSVoucherEntryProps {
  type: 'current' | 'advance'
}

const API_BASE = '/api/fs'

function mapMaster(raw: any): CheckMaster {
  return {
    id:     raw.id ?? 0,
    jJvNo:  raw.jJvNo ?? raw.j_jv_no ?? '',
    jCkNo:  raw.jCkNo ?? raw.j_ck_no ?? '',
    jDate:  raw.jDate ?? raw.j_date ?? '',
    jPayTo: raw.jPayTo ?? raw.j_pay_to ?? '',
    jCkAmt: parseFloat(raw.jCkAmt ?? raw.j_ck_amt ?? 0),
    jDesc:  raw.jDesc ?? raw.j_desc ?? '',
    bankNo: raw.bankNo ?? raw.bank_no ?? 0,
    supNo:  raw.supNo ?? raw.sup_no ?? 0
  }
}

function mapLine(raw: any): CheckLine {
  return {
    id:       raw.id ?? 0,
    jCkNo:    raw.jCkNo ?? raw.j_ck_no ?? '',
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

const EMPTY_MASTER = {
  jJvNo: '', jCkNo: '', jDate: new Date().toISOString().split('T')[0],
  jPayTo: '', jDesc: '', bankNo: 0, supNo: 0
}
type LineRowState = { acctCode: string; debit: string; credit: string }
const EMPTY_LINE_ROW: LineRowState = { acctCode: '', debit: '', credit: '' }

// =============================================================================
export default function FSVoucherEntry({ type }: FSVoucherEntryProps) {
  const title = type === 'advance' ? 'Enter Advance CDB' : 'Check Disbursement Voucher Entry'

  // Masters list and navigation
  const [masters, setMasters] = useState<CheckMaster[]>([])
  const [currentMasterIdx, setCurrentMasterIdx] = useState(0)
  const [lines, setLines] = useState<CheckLine[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState({ text: '', type: 'info', field: '' })
  
  const showMsg = (text: string, type = 'info', field = '') => {
    if (!text) { setMessage({ text: '', type: 'info', field: '' }); return; }
    const inferredType = type === 'info' && /error|failed|unable|required|invalid|missing|not balanced/i.test(text) ? 'error' : (type === 'info' ? 'success' : type);
    setMessage({ text, type: inferredType, field });
  }

  useEffect(() => {
    if (message.text) {
      if (message.field) {
        const el = document.getElementById('input_' + message.field);
        if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.focus(); }
      }
      const timer = setTimeout(() => setMessage({ text: '', type: 'info', field: '' }), 4500);
      return () => clearTimeout(timer);
    }
  }, [message]);


  // Mode: 'view' | 'addMaster' | 'editMaster'
  const [mode, setMode] = useState<'view' | 'addMaster' | 'editMaster'>('view')
  const [saving, setSaving] = useState(false)

  // Master form
  const [masterForm, setMasterForm] = useState(EMPTY_MASTER)
  const [showCheckNo, setShowCheckNo] = useState(false)
  const [systemPeriod, setSystemPeriod] = useState<{ begDate: string; endDate: string } | null>(null)

  // Inline line editing
  const [editingLineId, setEditingLineId] = useState<number | null>(null)
  const [editLineRow, setEditLineRow] = useState<LineRowState>(EMPTY_LINE_ROW)
  const [addLineRow, setAddLineRow] = useState<LineRowState>(EMPTY_LINE_ROW)

  // Account browse target ('line-add' or 'line-edit')
  const [acctBrowseTarget, setAcctBrowseTarget] = useState<'line-add' | 'line-edit'>('line-add')

  // Find — multi-mode search
  const [showFind, setShowFind] = useState(false)
  const [findJv, setFindJv]     = useState('')
  const [findMode, setFindMode] = useState<'cdv' | 'check' | 'date' | 'payee'>('cdv')
  const [findCk, setFindCk]     = useState('')
  const [findDate, setFindDate] = useState('')
  const [findPayee, setFindPayee] = useState('')

  const debouncedFindJv = useDebounce(findJv, 500)
  const debouncedFindCk = useDebounce(findCk, 500)
  const debouncedFindPayee = useDebounce(findPayee, 500)
  const [showAcctBrowse, setShowAcctBrowse] = useState(false)
  const [accounts, setAccounts] = useState<AccountLookup[]>([])
  const [banks, setBanks] = useState<BankLookup[]>([])
  const [suppliers, setSuppliers] = useState<SupplierLookup[]>([])

  // Unbalanced checks (for QUIT validation)
  const [unbalancedChecks, setUnbalancedChecks] = useState<{ ckNo: string; balance: number }[]>([])
  const [showUnbalanced, setShowUnbalanced] = useState(false)
  const [showPostingPreview, setShowPostingPreview] = useState(false)
  const [showRecycleBin, setShowRecycleBin] = useState(false)
  const [deletedMasters, setDeletedMasters] = useState<CheckMaster[]>([])
  const [showClone, setShowClone] = useState(false)
  const [cloneJvNo, setCloneJvNo] = useState('')
  const [cloneCkNo, setCloneCkNo] = useState('')
  const [cloneDate, setCloneDate] = useState(new Date().toISOString().split('T')[0])
  const setHasUnsavedChanges = useFsUnsavedStore((state) => state.setHasUnsavedChanges)

  // Current master
  const currentMaster = masters[currentMasterIdx] ?? null

  // Derived: total debit and credit for current lines
  const totalDebit  = lines.reduce((s, l) => s + (l.jDOrC === 'D' ? l.jCkAmt : 0), 0)
  const totalCredit = lines.reduce((s, l) => s + (l.jDOrC === 'C' ? l.jCkAmt : 0), 0)
  const isLineBalanced = Math.abs(totalDebit - totalCredit) < 0.01
  const accountLookup = useMemo(() => new Map(accounts.map((a) => [a.acctCode.toUpperCase(), a.acctDesc])), [accounts])

  // ---- Data Loading ----
  // Track the current check number so we can restore position after reloading masters
  const currentCkNoRef = useRef<string>('')
  useEffect(() => {
    currentCkNoRef.current = currentMaster?.jCkNo ?? ''
  }, [currentMasterIdx, masters])

  useEffect(() => {
    if (currentMaster && mode === 'view') {
      setTimeout(() => {
        document.getElementById('input_lineAcct')?.focus()
      }, 100)
    }
  }, [currentMaster, mode])

  const loadMasters = useCallback(async () => {
    const preserveCkNo = currentCkNoRef.current
    setIsLoading(true)
    try {
      const resp = await axios.get(`${API_BASE}/vouchers/masters`, { params: { type } })
      const data: CheckMaster[] = (resp.data?.data ?? []).map(mapMaster)
      setMasters(data)
      // Restore position: find the same check in the refreshed list
      if (preserveCkNo) {
        const restoredIdx = data.findIndex(m => m.jCkNo === preserveCkNo)
        if (restoredIdx >= 0) {
          setCurrentMasterIdx(restoredIdx)
        } else {
          // Check was deleted or not found — clamp to valid range
          setCurrentMasterIdx(prev => Math.min(prev, Math.max(0, data.length - 1)))
        }
      } else {
        setCurrentMasterIdx(0)
      }
      showMsg('')
      return data
    } catch (err: any) {
      const status = err?.response?.status ?? 0
      if (status !== 401 && status !== 404) {
        showMsg(`Error loading checks: ${err.message}`)
      }
      return []
    } finally {
      setIsLoading(false)
    }
  }, [type])

  const loadLines = useCallback(async (ckNo: string) => {
    if (!ckNo) { setLines([]); return }
    try {
      const resp = await axios.get(`${API_BASE}/vouchers/lines/${encodeURIComponent(ckNo)}`)
      setLines((resp.data?.data ?? []).map(mapLine))
    } catch {
      setLines([])
    }
  }, [])

  const loadUnbalanced = useCallback(async () => {
    try {
      const resp = await axios.get(`${API_BASE}/vouchers/unbalanced`, { params: { type } })
      const data = resp.data?.data ?? []
      setUnbalancedChecks(data.map((u: any) => ({
        ckNo: u.jCkNo ?? u.checkNo ?? u.ckNo ?? '',
        balance: parseFloat(u.balance ?? u.outOfBalance ?? 0)
      })))
    } catch {
      setUnbalancedChecks([])
    }
  }, [type])

  // Preload accounts, banks, and suppliers lists on mount
  useEffect(() => {
    axios.get(`${API_BASE}/system-info`).then(resp => {
      if (resp.data) {
        setSystemPeriod({
          begDate: resp.data.begDate || resp.data.BegDate || '',
          endDate: resp.data.endDate || resp.data.EndDate || ''
        })
      }
    }).catch(() => {})

    if (accounts.length === 0) {
      axios.get(`${API_BASE}/accounts`).then(resp => {
        setAccounts((resp.data?.data ?? []).map((a: any) => ({
          acctCode: a.acctCode ?? a.acct_code,
          acctDesc: a.acctDesc ?? a.acct_desc
        })))
      }).catch(() => {})
    }
    if (banks.length === 0) {
      axios.get(`${API_BASE}/banks`).then(resp => setBanks(resp.data?.data ?? [])).catch(()=>{})
    }
    if (suppliers.length === 0) {
      axios.get(`${API_BASE}/suppliers`).then(resp => setSuppliers(resp.data?.data ?? [])).catch(()=>{})
    }
  }, [])

  useEffect(() => {
    void (async () => {
      const data = await loadMasters()
      if (data.length > 0) await loadLines(data[0].jCkNo)
      await loadUnbalanced()
    })()
  }, [loadMasters, loadLines, loadUnbalanced])

  // Show toast when unbalanced checks detected after loading
  useEffect(() => {
    if (unbalancedChecks.length > 0) {
      showMsg(`⚠ ${unbalancedChecks.length} unbalanced check(s) detected. Click Quit to review.`, 'error')
    }
  }, [unbalancedChecks])

  // When current master changes, reload its lines
  useEffect(() => {
    if (currentMaster) void loadLines(currentMaster.jCkNo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMasterIdx])

  useEffect(() => {
    const hasDraft =
      mode !== 'view' ||
      !!addLineRow.acctCode.trim() || !!addLineRow.debit.trim() || !!addLineRow.credit.trim() ||
      !!editLineRow.acctCode.trim() || !!editLineRow.debit.trim() || !!editLineRow.credit.trim()

    setHasUnsavedChanges(hasDraft || editingLineId !== null)

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasDraft && editingLineId === null) return
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      setHasUnsavedChanges(false)
    }
  }, [mode, addLineRow, editLineRow, editingLineId, setHasUnsavedChanges])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (event.ctrlKey && key === 's') {
        event.preventDefault()
        if (mode === 'addMaster') {
          void handleSaveMaster()
        } else if (mode === 'editMaster') {
          void handleUpdateMaster()
        } else if (editingLineId !== null) {
          void handleUpdateLine()
        } else {
          void handleSaveAddLine()
        }
      }
      if (event.ctrlKey && key === 'f') {
        event.preventDefault()
        setShowFind(true)
      }
      if (event.altKey && event.key === 'ArrowLeft') {
        event.preventDefault()
        void handlePrevCDV()
      }
      if (event.altKey && event.key === 'ArrowRight') {
        event.preventDefault()
        void handleNextCDV()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mode, editingLineId, currentMasterIdx, masters.length, addLineRow, editLineRow, masterForm])

  // ---- Navigation ----
  const handleNextCDV = async () => {
    if (masters.length === 0) { showMsg('No records in file.'); return }
    if (currentMasterIdx >= masters.length - 1) {
      showMsg('Last record in file!')
    } else {
      setCurrentMasterIdx(i => i + 1)
      showMsg('')
    }
  }

  const handlePrevCDV = async () => {
    if (masters.length === 0) { showMsg('No records in file.'); return }
    if (currentMasterIdx <= 0) {
      showMsg('First record in file!')
    } else {
      setCurrentMasterIdx(i => i - 1)
      showMsg('')
    }
  }

  // ---- FIND ----
  const handleFind = async () => {
    if (findMode === 'cdv') {
      if (!findJv.trim()) { showMsg('Enter a CDV number'); return }
      try {
        const resp = await axios.get(`${API_BASE}/vouchers/checkmaster/jv/${encodeURIComponent(findJv.trim())}`)
        const found = mapMaster(resp.data?.data ?? resp.data)
        const idx = masters.findIndex(m => m.jJvNo === found.jJvNo)
        if (idx >= 0) setCurrentMasterIdx(idx)
        else await loadMasters()
        showMsg(`Found CDV: ${found.jJvNo}`)
      } catch {
        showMsg(`CDV "${findJv}" not found.`, 'error')
      }
    } else if (findMode === 'check') {
      if (!findCk.trim()) { showMsg('Enter a Check number'); return }
      const target = findCk.trim().toUpperCase()
      const idx = masters.findIndex(m => m.jCkNo.toUpperCase() === target)
      if (idx >= 0) { setCurrentMasterIdx(idx); showMsg(`Found check: ${masters[idx].jCkNo}`) }
      else {
        // Soft-seek: find first check >= target
        const softIdx = masters.findIndex(m => m.jCkNo.toUpperCase() >= target)
        if (softIdx >= 0) { setCurrentMasterIdx(softIdx); showMsg(`Nearest check: ${masters[softIdx].jCkNo}`) }
        else showMsg(`Check "${findCk}" not found.`, 'error')
      }
    } else if (findMode === 'date') {
      if (!findDate) { showMsg('Select a date'); return }
      const target = new Date(findDate).getTime()
      const idx = masters.findIndex(m => new Date(m.jDate).getTime() >= target)
      if (idx >= 0) { setCurrentMasterIdx(idx); showMsg(`Found: ${masters[idx].jCkNo} — ${displayDate(masters[idx].jDate)}`) }
      else showMsg(`No check found with date ≥ ${findDate}`, 'error')
    } else if (findMode === 'payee') {
      if (!findPayee.trim()) { showMsg('Enter a payee name'); return }
      const target = findPayee.trim().toLowerCase()
      const idx = masters.findIndex(m => (m.jPayTo || '').toLowerCase().includes(target))
      if (idx >= 0) { setCurrentMasterIdx(idx); showMsg(`Found: ${masters[idx].jCkNo} — ${masters[idx].jPayTo}`) }
      else showMsg(`No check found with payee containing "${findPayee}"`, 'error')
    }
    setShowFind(false)
    setFindJv(''); setFindCk(''); setFindDate(''); setFindPayee('')
  }
  // Auto-search for Debounced Search Inputs
  useEffect(() => {
    if (showFind) {
      if (findMode === 'cdv' && debouncedFindJv) handleFind()
      else if (findMode === 'check' && debouncedFindCk) handleFind()
      else if (findMode === 'payee' && debouncedFindPayee) handleFind()
    }
  }, [debouncedFindJv, debouncedFindCk, debouncedFindPayee])

  // ---- ADD master ----
  const handleAddMaster = () => {
    // Find the highest numeric suffix from existing CDV numbers to properly increment
    const maxJvNum = masters.reduce((max, m) => {
      const match = m.jJvNo.match(/(\d+)$/)
      return match ? Math.max(max, parseInt(match[1], 10)) : max
    }, 0)
    const maxCkNum = masters.reduce((max, m) => {
      const match = m.jCkNo.match(/(\d+)$/)
      return match ? Math.max(max, parseInt(match[1], 10)) : max
    }, 0)
    const nextNum = Math.max(maxJvNum, maxCkNum) + 1
    const prefix = type === 'advance' ? 'ADV' : 'CDV'
    const newJv  = `${prefix}${String(nextNum).padStart(5, '0')}`
    const newCk  = newJv  // Per PRG convention: Check# defaults to same as CDV#
    setMasterForm({ ...EMPTY_MASTER, jJvNo: newJv, jCkNo: newCk })
    setMode('addMaster')
    showMsg('')
  }

  const handleSaveMaster = async () => {
    if (!masterForm.jJvNo.trim()) { showMsg('CDV No. is required'); return }
    const finalCkNo = showCheckNo ? masterForm.jCkNo.trim() : masterForm.jJvNo.trim()
    if (!finalCkNo) { showMsg('Check No. is required'); return }
    if (!masterForm.jPayTo?.trim()) { showMsg('Payee is required', 'error', 'masterPayee'); return }

    if (systemPeriod) {
      const checkDateStr = masterForm.jDate.split('T')[0]
      const periodEndDateStr = systemPeriod.endDate.split('T')[0]
      if (type === 'current' && checkDateStr > periodEndDateStr) {
        showMsg(`Check date ${checkDateStr} is in a future period. Please enter future-dated vouchers in the 'Enter Advance CDB' screen.`, 'error', 'jDate')
        return
      }
      if (type === 'advance' && checkDateStr <= periodEndDateStr) {
        showMsg(`Check date ${checkDateStr} must be in a future period (after ${periodEndDateStr}) for Advance CDVs.`, 'error', 'jDate')
        return
      }
    }
    setSaving(true)
    try {
      // Explicit-hold: every Advance CDV MUST carry the ADV marker so month-end holds it
      // indefinitely (never auto-deleted, never auto-transferred) and posting skips it until
      // the accountant runs Transfer Advance CDV. The accountant does NOT type "ADV" — the
      // system stamps it here regardless of what they enter for the check/CDV number. The
      // prefix is stripped automatically on transfer, turning it back into a regular check.
      const ensureAdv = (v: string) => {
        const t = v.trim()
        return t.toUpperCase().startsWith('ADV') ? t : `ADV${t}`
      }
      const jvForSave = type === 'advance' ? ensureAdv(masterForm.jJvNo) : masterForm.jJvNo.trim()
      const ckForSave = type === 'advance' ? ensureAdv(finalCkNo) : finalCkNo
      const payload = {
        jJvNo: jvForSave,
        jCkNo: ckForSave,
        jDate: masterForm.jDate,
        jPayTo: masterForm.jPayTo,
        jDesc: masterForm.jDesc,
        jCkAmt: 0,  // Will be recomputed from lines
        bankNo: 0,
        supNo: 0
      }
      const resp = await axios.post(`${API_BASE}/vouchers/masters`, payload)
      const created = mapMaster(resp.data?.data ?? resp.data)
      const newMasters = [...masters, created]
      setMasters(newMasters)
      setCurrentMasterIdx(newMasters.length - 1)
      setLines([])
      setAddLineRow(EMPTY_LINE_ROW)
      setMode('view')
      showMsg(`Check ${created.jCkNo} created. Add line items below.`)
    } catch (err: any) {
      showMsg(`Save failed: ${err.response?.data?.error ?? err.message}`)
    } finally {
      setSaving(false)
    }
  }

  // ---- ADD line (inline add row) ----
  const handleSaveAddLine = async () => {
    if (!currentMaster) { showMsg('No check selected'); return }
    if (!addLineRow.acctCode.trim()) { showMsg('Account Code is required', 'error', 'lineAcct'); return }
    // Accept manually typed codes — validate case-insensitively
    const typedCode = addLineRow.acctCode.trim().toUpperCase()
    if (accounts.length > 0 && !accountLookup.has(typedCode)) {
      // Try partial/fuzzy match before rejecting
      const partial = accounts.find(a => a.acctCode.toUpperCase().startsWith(typedCode))
      if (!partial) { showMsg(`Account code "${typedCode}" not found. Use the browse button (…) to see available codes.`, 'error', 'lineAcct'); return }
    }
    const dv = parseFloat(addLineRow.debit  || '0')
    const cv = parseFloat(addLineRow.credit || '0')
    if (dv === 0 && cv === 0) { showMsg('Enter either a Debit or Credit amount'); return }
    if (dv > 0 && cv > 0)    { showMsg('Only one of Debit or Credit can be filled'); return }
    setSaving(true)
    try {
      const payload = {
        jCkNo:    currentMaster.jCkNo,
        acctCode: typedCode,
        jCkAmt:   dv > 0 ? dv : cv,
        jDOrC:    dv > 0 ? 'D' : 'C'
      }
      const resp = await axios.post(`${API_BASE}/vouchers/lines`, payload)
      const created = mapLine(resp.data?.data ?? resp.data)
      setLines(prev => [...prev, created])
      setAddLineRow(EMPTY_LINE_ROW)
      await loadMasters()
      await loadUnbalanced()
      showMsg(`Line added: ${created.acctCode}`)
      // Refocus the account input to keep scroll position
      requestAnimationFrame(() => {
        const el = document.getElementById('input_lineAcct')
        if (el) el.focus()
      })
    } catch (err: any) {
      showMsg(`Unable to save line item: ${err.response?.data?.error ?? err.message}`)
    } finally {
      setSaving(false)
    }
  }

  // ---- EDIT line (inline) ----
  const startEditLine = (line: CheckLine) => {
    setEditingLineId(line.id)
    setEditLineRow({
      acctCode: line.acctCode,
      debit:    line.jDOrC === 'D' ? String(line.jCkAmt) : '',
      credit:   line.jDOrC === 'C' ? String(line.jCkAmt) : '',
    })
  }

  const cancelEditLine = () => setEditingLineId(null)

  const handleUpdateLine = async () => {
    if (editingLineId === null) return
    const targetLine = lines.find(l => l.id === editingLineId)
    if (!targetLine) return
    if (!editLineRow.acctCode.trim()) { showMsg('Account Code is required', 'error', 'lineAcct'); return }
    const editCode = editLineRow.acctCode.trim().toUpperCase()
    if (accounts.length > 0 && !accountLookup.has(editCode)) {
      const partial = accounts.find(a => a.acctCode.toUpperCase().startsWith(editCode))
      if (!partial) { showMsg(`Account code "${editCode}" not found.`, 'error', 'lineAcct'); return }
    }
    const dv = parseFloat(editLineRow.debit  || '0')
    const cv = parseFloat(editLineRow.credit || '0')
    if (dv === 0 && cv === 0) { showMsg('Enter either a Debit or Credit amount'); return }
    if (dv > 0 && cv > 0)    { showMsg('Only one of Debit or Credit can be filled'); return }
    setSaving(true)
    try {
      const payload = {
        jCkNo:    targetLine.jCkNo,
        acctCode: editLineRow.acctCode.toUpperCase(),
        jCkAmt:   dv > 0 ? dv : cv,
        jDOrC:    dv > 0 ? 'D' : 'C'
      }
      const resp = await axios.put(`${API_BASE}/vouchers/lines/${targetLine.id}`, payload)
      const updated = mapLine(resp.data?.data ?? resp.data)
      setLines(prev => prev.map(l => l.id === editingLineId ? updated : l))
      setEditingLineId(null)
      await loadMasters()
      await loadUnbalanced()
      showMsg('Line updated.')
    } catch (err: any) {
      showMsg(`Unable to update line item: ${err.response?.data?.error ?? err.message}`)
    } finally {
      setSaving(false)
    }
  }

  // ---- EDIT master ----
  const handleEditMaster = () => {
    if (!currentMaster) { showMsg('No check selected'); return }
    setMasterForm({
      jJvNo:  currentMaster.jJvNo,
      jCkNo:  currentMaster.jCkNo,
      jDate:  toInputDate(currentMaster.jDate),
      jPayTo: currentMaster.jPayTo ?? '',
      jDesc:  currentMaster.jDesc ?? '',
      bankNo: currentMaster.bankNo,
      supNo:  currentMaster.supNo
    })
    setMode('editMaster')
    showMsg('')
  }

  const handleUpdateMaster = async () => {
    if (!currentMaster) return
    const finalCkNo = showCheckNo ? masterForm.jCkNo.trim() : masterForm.jJvNo.trim()
    if (systemPeriod) {
      const checkDateStr = masterForm.jDate.split('T')[0]
      const periodEndDateStr = systemPeriod.endDate.split('T')[0]
      if (type === 'current' && checkDateStr > periodEndDateStr) {
        showMsg(`Check date ${checkDateStr} is in a future period. Please enter future-dated vouchers in the 'Enter Advance CDB' screen.`, 'error', 'jDate')
        return
      }
      if (type === 'advance' && checkDateStr <= periodEndDateStr) {
        showMsg(`Check date ${checkDateStr} must be in a future period (after ${periodEndDateStr}) for Advance CDVs.`, 'error', 'jDate')
        return
      }
    }
    setSaving(true)
    try {
      const payload = {
        jJvNo:  masterForm.jJvNo,
        jCkNo:  finalCkNo,
        jDate:  masterForm.jDate,
        jPayTo: masterForm.jPayTo,
        jDesc:  masterForm.jDesc,
        jCkAmt: currentMaster.jCkAmt,
        bankNo:  0,
        supNo:   0
      }
      const resp = await axios.put(`${API_BASE}/vouchers/masters/${encodeURIComponent(currentMaster.jCkNo)}`, payload)
      const updated = mapMaster(resp.data?.data ?? resp.data)
      const newMasters = masters.map((m, i) => i === currentMasterIdx ? updated : m)
      setMasters(newMasters)
      setMode('view')
      showMsg('Check updated.')
    } catch (err: any) {
      showMsg(`Update failed: ${err.response?.data?.error ?? err.message}`)
    } finally {
      setSaving(false)
    }
  }

  // ---- DELETE ----
  const handleDeleteCheck = async () => {
    if (!currentMaster) { showMsg('No check selected'); return }
    if (!window.confirm(`Delete check ${currentMaster.jCkNo}?\nThis will delete the master and ALL line items.`)) return
    try {
      await axios.delete(`${API_BASE}/vouchers/masters/${encodeURIComponent(currentMaster.jCkNo)}`)
      const newMasters = masters.filter((_, i) => i !== currentMasterIdx)
      setMasters(newMasters)
      setCurrentMasterIdx(Math.max(0, Math.min(currentMasterIdx, newMasters.length - 1)))
      setLines([])
      if (newMasters.length > 0) {
        await loadLines(newMasters[Math.max(0, currentMasterIdx - 1)]?.jCkNo ?? '')
      }
      await loadUnbalanced()
      showMsg('Check moved to recycle bin.')
    } catch (err: any) {
      showMsg(`Delete failed: ${err.message}`)
    }
  }

  // ---- DELETE line (inline) ----
  const handleDeleteLine = async (line: CheckLine) => {
    if (!window.confirm(`Delete line: ${line.acctCode}  ${line.jDOrC === 'D' ? 'Debit' : 'Credit'}: ${line.jCkAmt.toFixed(2)}?`)) return
    try {
      await axios.delete(`${API_BASE}/vouchers/lines/${line.id}`)
      setLines(prev => prev.filter(l => l.id !== line.id))
      if (editingLineId === line.id) setEditingLineId(null)
      await loadMasters()
      await loadUnbalanced()
      showMsg('Line moved to recycle bin.')
    } catch (err: any) {
      showMsg(`Delete failed: ${err.message}`)
    }
  }

  // ---- QUIT (check unbalanced) ----
  const handleQuit = async () => {
    if (mode !== 'view') {
      setMode('view')
      showMsg('')
      return
    }
    await loadUnbalanced()
    if (unbalancedChecks.length > 0) {
      setShowUnbalanced(true)
      return
    }
    setShowPostingPreview(true)
  }

  // ---- Account browse ----
  const openAcctBrowse = async (target: 'line-add' | 'line-edit') => {
    setAcctBrowseTarget(target)
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

  const loadDeletedChecks = async () => {
    try {
      const resp = await axios.get(`${API_BASE}/vouchers/deleted`)
      setDeletedMasters((resp.data?.checks ?? []).map(mapMaster))
    } catch {
      setDeletedMasters([])
    }
  }

  const restoreCheck = async (checkNo: string) => {
    try {
      await axios.post(`${API_BASE}/vouchers/restore/master/${encodeURIComponent(checkNo)}`)
      showMsg(`Check ${checkNo} restored.`)
      await loadDeletedChecks()
      await loadMasters()
    } catch (err: any) {
      showMsg(err.response?.data?.message ?? 'Unable to restore selected check.')
    }
  }

  const cloneCurrentCheck = async () => {
    if (!currentMaster) { showMsg('No check selected to clone.'); return }
    if (!cloneJvNo.trim() || !cloneCkNo.trim()) { showMsg('Please provide new CDV and check numbers.'); return }
    try {
      await axios.post(`${API_BASE}/vouchers/clone/${encodeURIComponent(currentMaster.jCkNo)}`, null, {
        params: {
          newJvNo: cloneJvNo.trim().toUpperCase(),
          newCkNo: cloneCkNo.trim().toUpperCase(),
          newDate: cloneDate
        }
      })
      setShowClone(false)
      showMsg(`Cloned ${currentMaster.jCkNo} to ${cloneCkNo.trim().toUpperCase()}.`)
      await loadMasters()
    } catch (err: any) {
      showMsg(err.response?.data?.error ?? err.response?.data?.message ?? 'Unable to clone selected check.')
    }
  }

  // ============================
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
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/50 mb-1.5">
            DATA ENTRY / {title.toUpperCase()}
          </div>
          <h1 className="text-2xl font-headline font-bold text-on-surface tracking-tight">{title}</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Check {masters.length === 0 ? '0' : currentMasterIdx + 1} of {masters.length}
            {lines.length > 0 && ` · ${lines.length} line${lines.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>⚡ Logistics Bridge Live</span>
            <span className="text-[10px] opacity-75 font-normal">| Auto-sync active</span>
          </div>
          {lines.length > 0 && (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border ${
              isLineBalanced
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              <span className="material-symbols-outlined text-[14px]">{isLineBalanced ? 'check_circle' : 'warning'}</span>
              {isLineBalanced ? 'Balanced' : `Off by ${Math.abs(totalDebit - totalCredit).toFixed(2)}`}
            </span>
          )}
        </div>
      </div>

      {/* ── Sticky Toolbar ── */}
      <div className="sticky top-0 z-30 mb-3 bg-surface/95 backdrop-blur-sm border border-outline-variant/40 rounded-xl shadow-md px-4 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button onClick={handleAddMaster} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary/90 transition-colors shadow-sm">
            <span className="material-symbols-outlined text-[16px]">add</span> Add
          </button>
          <button onClick={handleEditMaster} disabled={!currentMaster} className="flex items-center gap-1.5 px-3 py-1.5 text-on-surface-variant hover:bg-surface-container-low hover:text-primary rounded-lg text-xs font-bold transition-colors disabled:opacity-40">
            <span className="material-symbols-outlined text-[16px]">edit</span> Edit
          </button>
          <button onClick={() => { setFindJv(''); setShowFind(true) }} className="flex items-center gap-1.5 px-3 py-1.5 text-on-surface-variant hover:bg-surface-container-low hover:text-primary rounded-lg text-xs font-bold transition-colors">
            <span className="material-symbols-outlined text-[16px]">search</span> Find
          </button>
          <button onClick={() => { setCloneJvNo(''); setCloneCkNo(''); setCloneDate(new Date().toISOString().split('T')[0]); setShowClone(true) }} disabled={!currentMaster} className="flex items-center gap-1.5 px-3 py-1.5 text-on-surface-variant hover:bg-surface-container-low hover:text-primary rounded-lg text-xs font-bold transition-colors disabled:opacity-40">
            <span className="material-symbols-outlined text-[16px]">file_copy</span> Clone
          </button>
          <div className="w-px h-5 bg-outline-variant/30 mx-0.5" />
          <button onClick={() => { void loadDeletedChecks(); setShowRecycleBin(true) }} className="flex items-center gap-1.5 px-3 py-1.5 text-on-surface-variant hover:bg-surface-container-low hover:text-red-600 rounded-lg text-xs font-bold transition-colors">
            <span className="material-symbols-outlined text-[16px]">delete_sweep</span> Bin
          </button>
          <div className="w-px h-5 bg-outline-variant/30 mx-0.5" />
          <button onClick={handlePrevCDV} disabled={masters.length === 0} className="flex items-center gap-1 px-2 py-1.5 text-on-surface-variant hover:bg-surface-container-low rounded-lg text-xs font-bold transition-colors disabled:opacity-40" title="Alt+Left">
            <span className="material-symbols-outlined text-[16px]">chevron_left</span> Prev
          </button>
          <button onClick={handleNextCDV} disabled={masters.length === 0} className="flex items-center gap-1 px-2 py-1.5 text-on-surface-variant hover:bg-surface-container-low rounded-lg text-xs font-bold transition-colors disabled:opacity-40" title="Alt+Right">
            Next <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
          <div className="w-px h-5 bg-outline-variant/30 mx-0.5" />
          <button onClick={handleDeleteCheck} disabled={!currentMaster} className="flex items-center gap-1.5 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg text-xs font-bold transition-colors disabled:opacity-40">
            <span className="material-symbols-outlined text-[16px]">delete</span> Delete
          </button>
        </div>
        <button onClick={handleQuit} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all border ${
          unbalancedChecks.length > 0
            ? 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100'
            : 'bg-surface-container text-on-surface-variant border-outline-variant/30 hover:bg-surface-container-high'
        }`}>
          <span className="material-symbols-outlined text-[16px]">logout</span>
          Quit {unbalancedChecks.length > 0 && `(${unbalancedChecks.length} unbal.⚠)`}
        </button>
      </div>

      {/* ── VIEW MODE ── */}
      {mode === 'view' && (
        <>
          {/* Compact voucher header strip */}
          {currentMaster ? (
            <div className="bg-surface border border-outline-variant/30 rounded-xl shadow-sm overflow-hidden mb-3">
              <div className="px-4 py-2.5 flex flex-wrap items-center gap-x-6 gap-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/50">CDV</span>
                  <span className="font-mono text-sm font-bold text-on-surface">{currentMaster.jJvNo}</span>
                </div>
                {currentMaster.jCkNo !== currentMaster.jJvNo && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/50">CK#</span>
                    <span className="font-mono text-sm font-bold text-primary">{currentMaster.jCkNo}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/50">DATE</span>
                  <span className="text-sm text-on-surface">{displayDate(currentMaster.jDate)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/50">AMT</span>
                  <span className="font-mono text-sm font-bold text-on-surface">{currentMaster.jCkAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex-1 min-w-[200px] flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/50">PAYEE</span>
                  <span className="text-sm text-on-surface truncate">{currentMaster.jPayTo || '—'}</span>
                </div>
                {currentMaster.jDesc && (
                  <div className="w-full flex items-center gap-2 pt-1 border-t border-outline-variant/10">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/50">PARTICULARS</span>
                    <span className="text-sm text-on-surface-variant">{currentMaster.jDesc}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-surface border border-outline-variant/30 rounded-xl shadow-sm p-8 text-center mb-3">
              <span className="material-symbols-outlined text-3xl text-on-surface-variant/30 mb-2">description</span>
              <p className="text-on-surface-variant font-medium text-sm">No vouchers in file{type === 'advance' ? ' (Advance CDB)' : ''}.</p>
              <p className="text-on-surface-variant/60 text-xs mt-1">Click <strong>Add</strong> to enter the first check.</p>
            </div>
          )}

          {/* Distribution lines table */}
          {currentMaster && (
            <div className="bg-surface border border-outline-variant/30 rounded-xl shadow-sm overflow-hidden mb-3">
              <div className="bg-surface-container-low/50 px-4 py-2 border-b border-outline-variant/20 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">table_chart</span> Account Distribution — CDV# {currentMaster.jCkNo}
                </h3>
                {!isLineBalanced && lines.length > 0 && (
                  <span className="text-xs font-bold text-red-600 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">warning</span> UNBALANCED
                  </span>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]" style={{ minWidth: '500px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr className="bg-surface-container-low">
                      <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-on-surface-variant border-b-2 border-outline-variant/40 border-r border-outline-variant/30" style={{ width: '160px' }}>Acct Code</th>
                      <th className="px-3 py-2 text-right text-[11px] font-bold uppercase tracking-wider text-blue-700 border-b-2 border-outline-variant/40 border-r border-outline-variant/30">Debit</th>
                      <th className="px-3 py-2 text-right text-[11px] font-bold uppercase tracking-wider text-pink-700 border-b-2 border-outline-variant/40 border-r border-outline-variant/30">Credit</th>
                      <th className="px-3 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-on-surface-variant border-b-2 border-outline-variant/40" style={{ width: '80px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, idx) => editingLineId === line.id ? (
                      <tr key={line.id} className="bg-amber-50/80">
                        <td className="px-3 py-1.5">
                          <div className="flex gap-1">
                            <input className="flex-1 px-2 py-1 text-[13px] border border-amber-300 rounded bg-surface-container-lowest font-mono uppercase outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                              value={editLineRow.acctCode} list="voucher-account-list"
                              onChange={e => setEditLineRow(x => ({ ...x, acctCode: e.target.value.toUpperCase() }))}
                              maxLength={4} onKeyDown={e => { if (e.key === 'Enter') void handleUpdateLine() }} autoFocus />
                            <button type="button" onClick={() => openAcctBrowse('line-edit')}
                              className="px-1.5 py-1 text-[11px] border border-outline-variant/30 rounded bg-surface-container-low hover:bg-surface-container flex-shrink-0 transition-colors">…</button>
                          </div>
                        </td>
                        <td className="px-3 py-1.5">
                          <input type="number" className={`w-full px-2 py-1 text-[13px] text-right border rounded font-mono outline-none focus:ring-1 focus:ring-primary/20 ${editLineRow.debit ? 'border-blue-300 bg-blue-50/50 dark:bg-blue-900/20 focus:border-blue-400' : 'border-amber-300 dark:border-amber-700/50 bg-surface-container-lowest focus:border-primary'}`}
                            placeholder="Debit" value={editLineRow.debit}
                            onFocus={() => setEditLineRow(x => ({ ...x, credit: '' }))}
                            onChange={e => setEditLineRow(x => ({ ...x, debit: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') void handleUpdateLine() }} />
                        </td>
                        <td className="px-3 py-1.5">
                          <input type="number" className={`w-full px-2 py-1 text-[13px] text-right border rounded font-mono outline-none focus:ring-1 focus:ring-primary/20 ${editLineRow.credit ? 'border-pink-300 bg-pink-50/50 dark:bg-pink-900/20 focus:border-pink-400' : 'border-amber-300 dark:border-amber-700/50 bg-surface-container-lowest focus:border-primary'}`}
                            placeholder="Credit" value={editLineRow.credit}
                            onFocus={() => setEditLineRow(x => ({ ...x, debit: '' }))}
                            onChange={e => setEditLineRow(x => ({ ...x, credit: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') void handleUpdateLine() }} />
                        </td>
                        <td className="px-3 py-1.5">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => void handleUpdateLine()} disabled={saving} title="Save"
                              className="w-7 h-7 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-colors disabled:opacity-50">
                              <span className="material-symbols-outlined text-[16px]">check</span></button>
                            <button onClick={cancelEditLine} title="Cancel"
                              className="w-7 h-7 rounded-md bg-surface-container-high hover:bg-surface-dim text-on-surface-variant flex items-center justify-center transition-colors">
                              <span className="material-symbols-outlined text-[16px]">close</span></button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={line.id} className={`cursor-pointer hover:bg-surface-container-lowest/80 transition-colors ${idx % 2 === 1 ? 'bg-surface-container-low/30' : ''}`} onDoubleClick={() => startEditLine(line)}>
                        <td className="px-3 py-2 border-b border-outline-variant/40 border-r border-outline-variant/40">
                          <span className="font-mono text-[13px] font-semibold text-on-surface">{line.acctCode}</span>
                          {accountLookup.has(line.acctCode.toUpperCase()) && (
                            <span className="ml-2 text-[11px] text-on-surface-variant/60">{accountLookup.get(line.acctCode.toUpperCase())}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-[13px] text-blue-700 font-medium border-b border-outline-variant/40 border-r border-outline-variant/40">
                          {line.jDOrC === 'D' ? line.jCkAmt.toLocaleString('en-US', { minimumFractionDigits: 2 }) : ''}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-[13px] text-pink-700 font-medium border-b border-outline-variant/40 border-r border-outline-variant/40">
                          {line.jDOrC === 'C' ? line.jCkAmt.toLocaleString('en-US', { minimumFractionDigits: 2 }) : ''}
                        </td>
                        <td className="px-3 py-2 border-b border-outline-variant/40">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => startEditLine(line)} title="Edit"
                              className="w-7 h-7 rounded-md bg-surface-container hover:bg-surface-container-high text-on-surface-variant flex items-center justify-center transition-colors border border-outline-variant/20">
                              <span className="material-symbols-outlined text-[15px]">edit</span></button>
                            <button onClick={() => void handleDeleteLine(line)} disabled={saving} title="Delete"
                              className="w-7 h-7 rounded-md bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition-colors border border-red-200/50">
                              <span className="material-symbols-outlined text-[15px]">delete</span></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {/* Add row */}
                    <tr className="bg-emerald-50/60 border-t-2 border-dashed border-emerald-300/60">
                      <td className="px-3 py-1.5">
                        <div className="flex gap-1">
                          <input className="flex-1 px-2 py-1 text-[13px] border border-emerald-300 rounded bg-surface-container-lowest font-mono uppercase outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
                            placeholder="ACCT" id="input_lineAcct" value={addLineRow.acctCode} list="voucher-account-list"
                            onChange={e => setAddLineRow(x => ({ ...x, acctCode: e.target.value.toUpperCase() }))}
                            maxLength={4} onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                document.getElementById('input_lineDebit')?.focus();
                              }
                            }} />
                          <button type="button" onClick={() => openAcctBrowse('line-add')}
                            className="px-1.5 py-1 text-[11px] border border-emerald-300 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-700 flex-shrink-0 transition-colors">…</button>
                        </div>
                      </td>
                      <td className="px-3 py-1.5">
                        <input type="number" className={`w-full px-2 py-1 text-[13px] text-right border rounded font-mono outline-none focus:ring-1 focus:ring-emerald-200 ${addLineRow.debit ? 'border-blue-300 bg-blue-50/30 dark:bg-blue-900/20 focus:border-blue-400' : 'border-emerald-300 dark:border-emerald-700/50 bg-surface-container-lowest focus:border-emerald-500'}`}
                          placeholder="Debit" id="input_lineDebit" value={addLineRow.debit}
                          onFocus={() => setAddLineRow(x => ({ ...x, credit: '' }))}
                          onChange={e => setAddLineRow(x => ({ ...x, debit: e.target.value }))}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (addLineRow.debit.trim()) {
                                void handleSaveAddLine();
                              } else {
                                document.getElementById('input_lineCredit')?.focus();
                              }
                            }
                          }} />
                      </td>
                      <td className="px-3 py-1.5">
                        <input type="number" className={`w-full px-2 py-1 text-[13px] text-right border rounded font-mono outline-none focus:ring-1 focus:ring-emerald-200 ${addLineRow.credit ? 'border-pink-300 bg-pink-50/30 dark:bg-pink-900/20 focus:border-pink-400' : 'border-emerald-300 dark:border-emerald-700/50 bg-surface-container-lowest focus:border-emerald-500'}`}
                          placeholder="Credit" id="input_lineCredit" value={addLineRow.credit}
                          onFocus={() => setAddLineRow(x => ({ ...x, debit: '' }))}
                          onChange={e => setAddLineRow(x => ({ ...x, credit: e.target.value }))}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              void handleSaveAddLine();
                            }
                          }} />
                      </td>
                      <td className="px-3 py-1.5">
                        <button onClick={() => void handleSaveAddLine()} disabled={saving}
                          className="w-full py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">add</span> Add
                        </button>
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-outline-variant/40 bg-surface-container-low/50 font-bold">
                      <td className="px-3 py-2.5 text-[12px] uppercase tracking-wider text-on-surface-variant">Totals</td>
                      <td className="px-3 py-2.5 text-right font-mono text-[13px] text-blue-700 font-bold">{totalDebit.toFixed(2)}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-[13px] text-pink-700 font-bold">{totalCredit.toFixed(2)}</td>
                      <td className="px-3 py-2.5 text-center">
                        {lines.length > 0 && (isLineBalanced
                          ? <span className="text-emerald-600 text-xs font-bold">✓</span>
                          : <span className="text-red-600 text-xs font-bold">⚠ {(totalDebit - totalCredit).toFixed(2)}</span>
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="bg-surface-container-low/50 px-4 py-2 border-t border-outline-variant/20 flex justify-between items-center">
                <div className="text-[11px] text-on-surface-variant/70 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px]">info</span>
                  Double-click row to edit · Debit auto-clears Credit
                </div>
                <div className="text-[10px] font-mono text-on-surface-variant/50 tracking-wider uppercase hidden md:block">
                  Ctrl+S: Save | Alt+←/→: Navigate CDVs
                </div>
              </div>
              <datalist id="voucher-account-list">
                {accounts.map((a) => (
                  <option key={a.acctCode} value={a.acctCode}>{a.acctDesc}</option>
                ))}
              </datalist>
            </div>
          )}
        </>
      )}

      {/* ── ADD MASTER FORM ── */}
      {mode === 'addMaster' && (
        <div className="bg-surface border border-outline-variant/30 rounded-xl shadow-sm overflow-hidden">
          <div className="bg-surface-container-low/50 px-5 py-3 border-b border-outline-variant/20">
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">add_circle</span> Add New Check — Enter Header Details
            </h3>
          </div>
          <div className="p-6 grid grid-cols-2 gap-5">
            <div className="col-span-2 flex items-center gap-2 mb-1">
              <input 
                type="checkbox" 
                id="toggle-check-no" 
                checked={showCheckNo} 
                onChange={e => {
                  const checked = e.target.checked
                  setShowCheckNo(checked)
                  if (!checked) {
                    setMasterForm(f => ({ ...f, jCkNo: f.jJvNo }))
                  }
                }}
                className="rounded border-outline-variant/30 text-primary focus:ring-primary/20 w-4 h-4 cursor-pointer"
              />
              <label htmlFor="toggle-check-no" className="text-xs font-semibold text-on-surface-variant cursor-pointer select-none">
                Enable Check Number Field (Check No. defaults to CDV No. when disabled)
              </label>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/60 mb-1.5">CDV No. <span className="text-red-500">*</span></label>
              <input type="text" id="input_jJvNo" className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg bg-surface-container-lowest text-on-surface font-mono uppercase outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                value={masterForm.jJvNo} onChange={e => setMasterForm(f => ({ ...f, jJvNo: e.target.value.toUpperCase(), jCkNo: showCheckNo ? f.jCkNo : e.target.value.toUpperCase() }))} maxLength={8} autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (showCheckNo) {
                      document.getElementById('input_jCkNo')?.focus();
                    } else {
                      document.getElementById('input_jDate')?.focus();
                    }
                  }
                }} />
            </div>
            {showCheckNo ? (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/60 mb-1.5">Check No. <span className="text-red-500">*</span></label>
                <input type="text" id="input_jCkNo" className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg bg-surface-container-lowest text-on-surface font-mono uppercase outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                  value={masterForm.jCkNo} onChange={e => setMasterForm(f => ({ ...f, jCkNo: e.target.value.toUpperCase() }))} maxLength={8}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      document.getElementById('input_jDate')?.focus();
                    }
                  }} />
              </div>
            ) : (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/60 mb-1.5">Date <span className="text-red-500">*</span></label>
                <input type="date" id="input_jDate" className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg bg-surface-container-lowest outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                  value={masterForm.jDate} onChange={e => setMasterForm(f => ({ ...f, jDate: e.target.value }))}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      document.getElementById('input_jPayTo')?.focus();
                    }
                  }} />
              </div>
            )}
            {showCheckNo && (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/60 mb-1.5">Date <span className="text-red-500">*</span></label>
                <input type="date" id="input_jDate" className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg bg-surface-container-lowest outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                  value={masterForm.jDate} onChange={e => setMasterForm(f => ({ ...f, jDate: e.target.value }))}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      document.getElementById('input_jPayTo')?.focus();
                    }
                  }} />
              </div>
            )}
            <div className="col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/60 mb-1.5">Pay To (Payee) <span className="text-red-500">*</span></label>
              <input type="text" id="input_jPayTo" className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg bg-surface-container-lowest outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                value={masterForm.jPayTo ?? ''} onChange={e => setMasterForm(f => ({ ...f, jPayTo: e.target.value }))} maxLength={100}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    document.getElementById('input_jDesc')?.focus();
                  }
                }} />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/60 mb-1.5">Particulars</label>
              <textarea id="input_jDesc" className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg bg-surface-container-lowest outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 resize-none"
                rows={2} value={masterForm.jDesc ?? ''} onChange={e => setMasterForm(f => ({ ...f, jDesc: e.target.value }))}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleSaveMaster();
                  }
                }} />
            </div>
          </div>
          <div className="px-6 pb-6 flex gap-3">
            <button className="px-6 py-2.5 bg-primary text-white rounded-lg font-bold text-sm shadow-sm hover:bg-primary/90 transition-all" onClick={handleSaveMaster} disabled={saving}>
              {saving ? 'Saving...' : 'Next: Add Lines'}
            </button>
            <button className="px-6 py-2.5 text-on-surface-variant border border-outline-variant/30 rounded-lg font-bold text-sm hover:bg-surface-container transition-colors" onClick={() => { setMode('view'); showMsg('') }} disabled={saving}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── EDIT MASTER FORM ── */}
      {mode === 'editMaster' && (
        <div className="bg-surface border border-outline-variant/30 rounded-xl shadow-sm overflow-hidden">
          <div className="bg-surface-container-low/50 px-5 py-3 border-b border-outline-variant/20">
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">edit_note</span> Edit Check Header
            </h3>
          </div>
          <div className="p-6 grid grid-cols-2 gap-5">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/60 mb-1.5">CDV No.</label>
              <input type="text" className="w-full px-3 py-2 border border-outline-variant/20 rounded-lg bg-surface-container-low text-on-surface-variant font-mono" value={masterForm.jJvNo} disabled />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/60 mb-1.5">Check No.</label>
              <input type="text" className="w-full px-3 py-2 border border-outline-variant/20 rounded-lg bg-surface-container-low text-on-surface-variant font-mono" value={masterForm.jCkNo} disabled />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/60 mb-1.5">Date</label>
              <input type="date" className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg bg-surface-container-lowest outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                value={masterForm.jDate} onChange={e => setMasterForm(f => ({ ...f, jDate: e.target.value }))} autoFocus />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/60 mb-1.5">Pay To (Payee)</label>
              <input type="text" className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg bg-surface-container-lowest outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                value={masterForm.jPayTo ?? ''} onChange={e => setMasterForm(f => ({ ...f, jPayTo: e.target.value }))} maxLength={100} />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/60 mb-1.5">Particulars</label>
              <textarea className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg bg-surface-container-lowest outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 resize-none"
                rows={2} value={masterForm.jDesc ?? ''} onChange={e => setMasterForm(f => ({ ...f, jDesc: e.target.value }))} />
            </div>
          </div>
          <div className="px-6 pb-6 flex gap-3">
            <button className="px-6 py-2.5 bg-primary text-white rounded-lg font-bold text-sm shadow-sm hover:bg-primary/90 transition-all" onClick={handleUpdateMaster} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button className="px-6 py-2.5 text-on-surface-variant border border-outline-variant/30 rounded-lg font-bold text-sm hover:bg-surface-container transition-colors" onClick={() => { setMode('view'); showMsg('') }} disabled={saving}>Cancel</button>
          </div>
        </div>
      )}

      {/* ══════ MODALS ══════ */}

      {/* Find Dialog */}
      {showFind && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowFind(false)}>
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-[440px] overflow-hidden animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-outline-variant/20 flex items-center justify-between">
              <h3 className="font-headline font-bold text-lg text-on-surface">Find Check</h3>
              <button onClick={() => setShowFind(false)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container-high transition-colors"><span className="material-symbols-outlined text-[20px]">close</span></button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              {/* Search mode tabs */}
              <div className="flex gap-1 bg-surface-container-low rounded-lg p-1">
                {[
                  { mode: 'cdv' as const, label: 'CDV No.', icon: 'tag' },
                  { mode: 'check' as const, label: 'Check No.', icon: 'numbers' },
                  { mode: 'date' as const, label: 'Date', icon: 'calendar_today' },
                  { mode: 'payee' as const, label: 'Payee', icon: 'person' },
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

              {/* Search input based on mode */}
              {findMode === 'cdv' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">CDV Number</label>
                  <input type="text" className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg bg-surface-container-lowest font-mono uppercase outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                    value={findJv} onChange={e => setFindJv(e.target.value.toUpperCase())} maxLength={8} autoFocus
                    placeholder="e.g. CDV00001"
                    onKeyDown={e => { if (e.key === 'Enter') handleFind() }} />
                  <p className="text-[11px] text-on-surface-variant/50 mt-1">Searches by CDV/JV reference number</p>
                </div>
              )}
              {findMode === 'check' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">Check Number</label>
                  <input type="text" className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg bg-surface-container-lowest font-mono uppercase outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                    value={findCk} onChange={e => setFindCk(e.target.value.toUpperCase())} maxLength={10} autoFocus
                    placeholder="e.g. CK00001"
                    onKeyDown={e => { if (e.key === 'Enter') handleFind() }} />
                  <p className="text-[11px] text-on-surface-variant/50 mt-1">Exact match or soft-seek to nearest</p>
                </div>
              )}
              {findMode === 'date' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">Date</label>
                  <input type="date" className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg bg-surface-container-lowest outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                    value={findDate} onChange={e => setFindDate(e.target.value)} autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') handleFind() }} />
                  <p className="text-[11px] text-on-surface-variant/50 mt-1">Finds first check with date ≥ selected</p>
                </div>
              )}
              {findMode === 'payee' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">Payee Name</label>
                  <input type="text" className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg bg-surface-container-lowest outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                    value={findPayee} onChange={e => setFindPayee(e.target.value)} autoFocus
                    placeholder="Search payee name..."
                    onKeyDown={e => { if (e.key === 'Enter') handleFind() }} />
                  <p className="text-[11px] text-on-surface-variant/50 mt-1">Partial match on Pay To field</p>
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

      {/* Account Browse Dialog */}
      {showAcctBrowse && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAcctBrowse(false)}>
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-[480px] max-h-[70vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-outline-variant/20 flex items-center justify-between flex-shrink-0">
              <h3 className="font-headline font-bold text-lg text-on-surface">Select Account</h3>
              <button onClick={() => setShowAcctBrowse(false)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container-high transition-colors"><span className="material-symbols-outlined text-[20px]">close</span></button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {accounts.length === 0
                ? <div className="p-8 text-center text-on-surface-variant/50 italic">Loading accounts…</div>
                : (
                  <table className="w-full text-[13px]">
                    <thead className="bg-surface-container-low sticky top-0"><tr><th className="px-4 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Code</th><th className="px-4 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Description</th></tr></thead>
                    <tbody className="divide-y divide-outline-variant/10">
                      {accounts.map(a => (
                        <tr key={a.acctCode} className="cursor-pointer hover:bg-primary/5 transition-colors" onClick={() => {
                          if (acctBrowseTarget === 'line-add') setAddLineRow(x => ({ ...x, acctCode: a.acctCode }))
                          else setEditLineRow(x => ({ ...x, acctCode: a.acctCode }))
                          setShowAcctBrowse(false)
                        }}>
                          <td className="px-4 py-2 font-mono font-bold text-primary">{a.acctCode}</td>
                          <td className="px-4 py-2 text-on-surface-variant">{a.acctDesc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Posting Preview Dialog */}
      {showPostingPreview && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowPostingPreview(false)}>
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-[400px] overflow-hidden animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-outline-variant/20"><h3 className="font-headline font-bold text-lg text-on-surface">Posting Preview</h3></div>
            <div className="p-6 flex flex-col gap-4">
              <p className="text-sm text-on-surface-variant">Review this voucher before exiting.</p>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-outline-variant/10">
                  <tr><td className="py-2 text-on-surface-variant">Total Debit</td><td className="py-2 text-right font-mono font-bold">{totalDebit.toFixed(2)}</td></tr>
                  <tr><td className="py-2 text-on-surface-variant">Total Credit</td><td className="py-2 text-right font-mono font-bold">{totalCredit.toFixed(2)}</td></tr>
                  <tr><td className="py-2 text-on-surface-variant">Variance</td><td className={`py-2 text-right font-mono font-bold ${isLineBalanced ? 'text-emerald-600' : 'text-red-600'}`}>{(totalDebit - totalCredit).toFixed(2)}</td></tr>
                </tbody>
              </table>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setShowPostingPreview(false)} className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors">Back</button>
                <button onClick={() => window.history.back()} disabled={!isLineBalanced} className="px-5 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 shadow-sm transition-all disabled:opacity-50">Confirm Exit</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clone Dialog */}
      {showClone && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowClone(false)}>
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-[420px] overflow-hidden animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-outline-variant/20 flex items-center justify-between">
              <h3 className="font-headline font-bold text-lg text-on-surface">Clone Voucher</h3>
              <button onClick={() => setShowClone(false)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container-high transition-colors"><span className="material-symbols-outlined text-[20px]">close</span></button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div><label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">New CDV No.</label><input className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg bg-surface-container-lowest font-mono uppercase outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" value={cloneJvNo} onChange={e => setCloneJvNo(e.target.value.toUpperCase())} /></div>
              <div><label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">New Check No.</label><input className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg bg-surface-container-lowest font-mono uppercase outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" value={cloneCkNo} onChange={e => setCloneCkNo(e.target.value.toUpperCase())} /></div>
              <div><label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">Date</label><input type="date" className="w-full px-3 py-2 border border-outline-variant/30 rounded-lg bg-surface-container-lowest outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" value={cloneDate} onChange={e => setCloneDate(e.target.value)} /></div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setShowClone(false)} className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors">Cancel</button>
                <button onClick={() => void cloneCurrentCheck()} className="px-5 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 shadow-sm transition-all">Clone</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recycle Bin Dialog */}
      {showRecycleBin && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowRecycleBin(false)}>
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-[800px] max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-outline-variant/20 flex items-center justify-between flex-shrink-0">
              <h3 className="font-headline font-bold text-lg text-red-600 flex items-center gap-2"><span className="material-symbols-outlined">delete</span> Deleted Vouchers</h3>
              <button onClick={() => setShowRecycleBin(false)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container-high transition-colors"><span className="material-symbols-outlined text-[20px]">close</span></button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-[13px]">
                <thead className="bg-surface-container-low sticky top-0"><tr><th className="px-4 py-2 text-left text-[11px] font-bold uppercase tracking-wider">CDV</th><th className="px-4 py-2 text-left text-[11px] font-bold uppercase tracking-wider">Check</th><th className="px-4 py-2 text-left text-[11px] font-bold uppercase tracking-wider">Date</th><th className="px-4 py-2 text-left text-[11px] font-bold uppercase tracking-wider">Payee</th><th className="px-4 py-2 text-right text-[11px] font-bold uppercase tracking-wider">Amount</th><th className="px-4 py-2 text-center text-[11px] font-bold uppercase tracking-wider">Action</th></tr></thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {deletedMasters.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-on-surface-variant/50 italic">No deleted vouchers found</td></tr>
                  ) : deletedMasters.map((m) => (
                    <tr key={m.id} className="hover:bg-surface-container-lowest transition-colors">
                      <td className="px-4 py-2 font-mono">{m.jJvNo}</td><td className="px-4 py-2 font-mono">{m.jCkNo}</td><td className="px-4 py-2">{displayDate(m.jDate)}</td><td className="px-4 py-2">{m.jPayTo}</td>
                      <td className="px-4 py-2 text-right font-mono">{m.jCkAmt.toFixed(2)}</td>
                      <td className="px-4 py-2 text-center"><button onClick={() => void restoreCheck(m.jCkNo)} className="text-primary hover:bg-primary/10 px-3 py-1 rounded-md font-bold text-xs transition-colors">Restore</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Unbalanced Checks Dialog */}
      {showUnbalanced && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowUnbalanced(false)}>
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-[520px] overflow-hidden animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-red-200 bg-red-50">
              <h3 className="font-headline font-bold text-lg text-red-700 flex items-center gap-2"><span className="material-symbols-outlined">warning</span> Unbalanced Checks</h3>
              <p className="text-xs text-red-600/80 mt-0.5">Click "Navigate" to jump to the problematic voucher.</p>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <p className="text-sm text-red-700 font-medium">Cannot exit: the following check(s) have unbalanced amounts. Please resolve before quitting.</p>
              <table className="w-full text-sm">
                <thead><tr>
                  <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-on-surface-variant border-b border-outline-variant/20">Check No.</th>
                  <th className="px-3 py-2 text-right text-[11px] font-bold uppercase tracking-wider text-red-600 border-b border-outline-variant/20">Out of Balance</th>
                  <th className="px-3 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-on-surface-variant border-b border-outline-variant/20" style={{ width: '90px' }}>Action</th>
                </tr></thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {unbalancedChecks.map(u => (
                    <tr key={u.ckNo} className="hover:bg-red-50/50">
                      <td className="px-3 py-2 font-mono font-medium">{u.ckNo}</td>
                      <td className="px-3 py-2 text-right text-red-600 font-mono font-bold">{u.balance.toFixed(2)}</td>
                      <td className="px-3 py-2 text-center">
                        <button onClick={() => {
                          const idx = masters.findIndex(m => m.jCkNo === u.ckNo)
                          if (idx >= 0) {
                            setCurrentMasterIdx(idx)
                            setShowUnbalanced(false)
                            showMsg(`Navigated to unbalanced check: ${u.ckNo}`, 'error')
                          }
                        }} className="px-3 py-1 bg-primary text-white text-xs font-bold rounded-md hover:bg-primary/90 transition-colors">
                          Navigate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-end pt-2">
                <button onClick={() => setShowUnbalanced(false)} className="px-5 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 shadow-sm transition-all">OK — Return to Fix</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {message.text && (
        <div className={`fixed bottom-6 right-6 z-[100] px-5 py-3.5 rounded-xl border text-sm font-semibold shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 ${
          message.type === 'error'
            ? 'bg-red-600 text-white border-red-700'
            : message.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-700'
              : 'bg-surface text-on-surface border-outline-variant/30 shadow-lg'
        }`}>
          <span className="material-symbols-outlined text-[18px]">
            {message.type === 'error' ? 'error' : message.type === 'success' ? 'check_circle' : 'info'}
          </span>
          {message.text}
          <button type="button" onClick={() => setMessage({ text: '', type: 'info', field: '' })} className="ml-3 opacity-70 hover:opacity-100 transition-opacity">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}
    </div>
  )
}
