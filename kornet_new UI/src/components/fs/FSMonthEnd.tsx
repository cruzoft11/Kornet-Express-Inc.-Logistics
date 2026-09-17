import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import PageHeader from '../PageHeader'

interface SystemInfo {
  currentMonth: number; currentYear: number
  begDate: string | null; endDate: string | null; totalUnposted: number
}

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

type ToastType = 'success' | 'error' | 'info' | 'warning'

export default function FSMonthEnd() {
  const API_BASE = '/api/fs'
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [sysInfo, setSysInfo] = useState<SystemInfo | null>(null)
  const [loadingInfo, setLoadingInfo] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [resultMessage, setResultMessage] = useState('')
  const [resultSuccess, setResultSuccess] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [processLog, setProcessLog] = useState<string[]>([])
  const [showFinalConfirm, setShowFinalConfirm] = useState(false)

  // Opt-in reminder: when ON, month-end shows a reminder to transfer next-period advance CDVs
  // first (advances are HELD and never auto-transferred). OFF by default.
  const ADV_REMINDER_KEY = 'fs.monthEnd.advanceReminder'
  const [advanceReminderOn, setAdvanceReminderOn] = useState<boolean>(() => {
    try { return localStorage.getItem(ADV_REMINDER_KEY) === 'on' } catch { return false }
  })
  const [heldAdvanceCount, setHeldAdvanceCount] = useState<number | null>(null)

  const toggleAdvanceReminder = useCallback(() => {
    setAdvanceReminderOn(prev => {
      const next = !prev
      try { localStorage.setItem(ADV_REMINDER_KEY, next ? 'on' : 'off') } catch { /* ignore */ }
      return next
    })
  }, [])

  const [toast, setToast] = useState<{ text: string; type: ToastType } | null>(null)

  const showToast = useCallback((text: string, type: ToastType = 'info') => {
    if (!text) { setToast(null); return }
    const inferredType = type === 'info' && /error|failed|unable|cannot/i.test(text) ? 'error' as const : type
    setToast({ text, type: inferredType })
  }, [])

  useEffect(() => {
    if (toast) {
      const ms = toast.type === 'error' ? 7000 : toast.type === 'warning' ? 6000 : 4500
      const timer = setTimeout(() => setToast(null), ms)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const addLog = useCallback((msg: string) => {
    setProcessLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])
  }, [])

  const loadSystemInfo = async () => {
    setLoadingInfo(true)
    setLoadError('')
    try {
      const resp = await axios.get(`${API_BASE}/system-info`)
      setSysInfo(resp.data)
    } catch (_err: any) {
      const now = new Date()
      setSysInfo({
        currentMonth: now.getMonth() + 1,
        currentYear: now.getFullYear(),
        begDate: `${now.getFullYear()}-01-01`,
        endDate: `${now.getFullYear()}-12-31`,
        unpostedChecks: 0,
        unpostedCashReceipts: 0,
        unpostedSalesBook: 0,
        unpostedJournals: 0,
        unpostedPurchaseBook: 0,
        unpostedAdjustments: 0,
        totalUnposted: 0,
      } as any)
      setLoadError('')
    } finally {
      setLoadingInfo(false)
    }
  }

  useEffect(() => { void loadSystemInfo() }, [])

  // When the reminder is enabled, load how many advance CDVs are currently held (future-dated),
  // so the confirmation can remind the accountant to transfer them first if intended.
  useEffect(() => {
    if (!advanceReminderOn) { setHeldAdvanceCount(null); return }
    let cancelled = false
    ;(async () => {
      try {
        const resp = await axios.get(`${API_BASE}/advance-checks`)
        if (!cancelled) setHeldAdvanceCount(Array.isArray(resp.data) ? resp.data.length : 0)
      } catch {
        if (!cancelled) setHeldAdvanceCount(null)
      }
    })()
    return () => { cancelled = true }
  }, [advanceReminderOn])


  const currentPeriodLabel = sysInfo ? `${MONTH_NAMES[sysInfo.currentMonth]} ${sysInfo.currentYear}` : '—'

  const preflightErrors: string[] = []
  if (sysInfo) {
    if (sysInfo.currentMonth < 1 || sysInfo.currentMonth > 12) {
      preflightErrors.push('Current month value is invalid. Check system configuration.')
    }
  }

  const handleStepOneConfirm = () => {
    if (!sysInfo) return
    const expected = `${sysInfo.currentMonth}/${sysInfo.currentYear}`
    if (confirmText.trim() !== expected) {
      showToast(`Period mismatch. Please type exactly: ${expected}`, 'warning')
      return
    }
    if (preflightErrors.length > 0) {
      showToast(preflightErrors[0], 'error')
      return
    }
    setStep(2)
    showToast('Period confirmed. Review details and proceed when ready.', 'info')
  }

  const handleConfirmAndClose = async () => {
    if (!sysInfo) return
    const expected = `${sysInfo.currentMonth}/${sysInfo.currentYear}`
    if (confirmText.trim() !== expected) {
      showToast(`Period mismatch. Type exactly: ${expected}`, 'error')
      return
    }
    // Show styled modal instead of window.confirm()
    setShowFinalConfirm(true)
  }

  const executePeriodClose = async () => {
    if (!sysInfo) return
    setShowFinalConfirm(false)
    setProcessing(true)
    setResultMessage('')
    setProcessLog([])

    addLog('Starting month-end processing...')
    addLog(`Closing period: ${currentPeriodLabel}`)

    try {
      addLog('Sending close request to server...')
      const resp = await axios.post(
        `${API_BASE}/month-end?year=${sysInfo.currentYear}&month=${sysInfo.currentMonth}`,
        null,
        { timeout: 120000 }
      )

      const msg = resp.data.message || 'Month-end processing completed successfully.'
      addLog(`Server response: ${msg}`)

      if (resp.data.accountsProcessed !== undefined) addLog(`Accounts processed: ${resp.data.accountsProcessed}`)
      if (resp.data.transactionsCleared !== undefined) addLog(`Transactions cleared: ${resp.data.transactionsCleared}`)
      if (resp.data.newMonth !== undefined && resp.data.newYear !== undefined) {
        addLog(`New period: ${MONTH_NAMES[resp.data.newMonth] || resp.data.newMonth} ${resp.data.newYear}`)
      }

      addLog('Month-end processing completed successfully.')
      setResultSuccess(true)
      setResultMessage(msg)
      setStep(3)
      showToast('Month-end close completed successfully!', 'success')

      await loadSystemInfo()
      window.dispatchEvent(new CustomEvent('fs-system-info-updated'))

    } catch (err: any) {
      const errMsg = err.response?.data?.error
        || err.response?.data?.Error
        || err.response?.data?.message
        || (err.code === 'ECONNABORTED' ? 'Request timed out. The server may still be processing — please check system info.' : null)
        || err.message
        || 'Month-end processing failed.'

      addLog(`ERROR: ${errMsg}`)

      if (err.response?.status === 400) addLog('Bad request — check that all prerequisites are met.')
      else if (err.response?.status === 409) addLog('Conflict — another process may already be running.')
      else if (err.response?.status === 500) addLog('Internal server error — check server logs for details.')
      else if (!err.response) addLog('No response from server — connection may have been lost.')

      setResultSuccess(false)
      setResultMessage(errMsg)
      showToast(`Month-end failed: ${errMsg}`, 'error')

      try { await loadSystemInfo() } catch { /* best effort */ }
    } finally {
      setProcessing(false)
    }
  }

  const isYearEnd = sysInfo?.currentMonth === 12
  const canProceed = preflightErrors.length === 0

  return (
    <div className="flex flex-col gap-6 max-w-[800px]">
      <PageHeader
        breadcrumb="ADMINISTRATION / MONTH-END PROCESSING"
        title="Month-End Processing"
        subtitle="Close the current fiscal period and roll all account balances forward (f_a_mntend)"
      />

      {/* Period info card */}
      <div className="bg-white border border-outline-variant/15 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">event</span>
            <h3 className="font-headline font-bold text-sm text-on-surface uppercase tracking-wide">Current Period Information</h3>
          </div>
          {!loadingInfo && (
            <button onClick={() => void loadSystemInfo()} className="text-xs text-primary hover:underline flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">refresh</span> Refresh
            </button>
          )}
        </div>

        {loadingInfo ? (
          <div className="flex items-center gap-2 px-6 py-6 text-on-surface-variant/60 text-sm animate-pulse">
            <span className="material-symbols-outlined text-[18px] animate-spin">sync</span> Loading system info…
          </div>
        ) : sysInfo ? (
          <div className="divide-y divide-outline-variant/10">
            {[
              { label: 'Period to Close', val: currentPeriodLabel, highlight: true },
              { label: 'Period Range', val: sysInfo.begDate ? `${new Date(sysInfo.begDate).toLocaleDateString()} – ${sysInfo.endDate ? new Date(sysInfo.endDate).toLocaleDateString() : '?'}` : '—' },
              {
                label: 'Unposted Transactions',
                val: String(sysInfo.totalUnposted),
                badge: sysInfo.totalUnposted > 0 ? 'warning' : 'success'
              },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between px-6 py-3.5">
                <span className="text-sm text-on-surface-variant">{row.label}</span>
                {row.badge ? (
                  <span className={`px-3 py-0.5 rounded-full text-[11px] font-bold ${row.badge === 'error' ? 'bg-error/10 text-error' : row.badge === 'warning' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'}`}>
                    {row.val}
                  </span>
                ) : (
                  <span className={`text-sm font-bold text-on-surface ${row.highlight ? 'text-primary text-base' : ''}`}>{row.val}</span>
                )}
              </div>
            ))}

            {isYearEnd && (
              <div className="flex items-start gap-3 mx-5 my-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
                <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">warning</span>
                <span><strong>YEAR-END CLOSE:</strong> This is December. Expense &amp; income accounts marked for initialization will be reset to zero.</span>
              </div>
            )}

            {preflightErrors.length > 0 && (
              <div className="px-5 py-3">
                {preflightErrors.map((err, i) => (
                  <div key={i} className="flex items-start gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-2 last:mb-0">
                    <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">block</span>
                    <span>{err}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="px-6 py-6 text-sm">
            <div className="flex items-start gap-2 text-red-600">
              <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
              <div>
                <p className="font-semibold">{loadError || 'Could not load system info.'}</p>
                <button onClick={() => void loadSystemInfo()} className="mt-2 text-xs text-primary hover:underline">Try again</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Advance CDV reminder toggle (opt-in, off by default) */}
      <div className="bg-white border border-outline-variant/15 rounded-2xl shadow-sm px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-[18px] text-on-surface-variant mt-0.5">notifications_active</span>
          <div>
            <div className="font-headline font-bold text-sm text-on-surface">Advance CDV transfer reminder</div>
            <p className="text-xs text-on-surface-variant/60 mt-0.5 max-w-md">
              When on, closing a period first reminds you to transfer any Advance CDVs dated for the
              next month. Advances are always held and are <strong>never</strong> transferred automatically.
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={advanceReminderOn}
          onClick={toggleAdvanceReminder}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${advanceReminderOn ? 'bg-primary' : 'bg-outline-variant/40'}`}
        >
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${advanceReminderOn ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>

      {/* Step wizard */}
      {step < 3 && sysInfo && !loadingInfo && (
        <div className="space-y-3">
          {/* Step 1 */}
          <div className={`bg-white border rounded-2xl shadow-sm overflow-hidden transition-all ${step === 1 ? 'border-primary/30' : 'border-outline-variant/15'}`}>
            <div className="flex gap-4 items-start p-5">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${step > 1 ? 'bg-emerald-500 text-white' : 'bg-primary text-white'}`}>
                {step > 1 ? <span className="material-symbols-outlined text-[18px]">check</span> : '1'}
              </div>
              <div className="flex-1">
                <div className="font-headline font-bold text-on-surface">Confirm Period</div>
                <p className="text-xs text-on-surface-variant/60 mt-0.5">Type the period to close in the format <code className="bg-surface-container-highest px-1 rounded">M/YYYY</code>, e.g. <code className="bg-surface-container-highest px-1 rounded">{sysInfo.currentMonth}/{sysInfo.currentYear}</code></p>
                {step === 1 && (
                  <div className="flex gap-3 mt-3">
                    <input type="text" value={confirmText} onChange={e => setConfirmText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleStepOneConfirm() }}
                      placeholder={`${sysInfo.currentMonth}/${sysInfo.currentYear}`}
                      className="w-36 px-3 py-2 border border-outline-variant/20 rounded-lg text-sm bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    <button onClick={handleStepOneConfirm}
                      disabled={!canProceed && confirmText.trim() === `${sysInfo.currentMonth}/${sysInfo.currentYear}`}
                      className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-60">Confirm</button>
                  </div>
                )}
                {step === 1 && !canProceed && (
                  <p className="text-xs text-error mt-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">warning</span>
                    Resolve the issues above before proceeding.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className={`bg-white border rounded-2xl shadow-sm overflow-hidden transition-all ${step === 2 ? 'border-primary/30' : 'border-outline-variant/15 opacity-60'}`}>
            <div className="flex gap-4 items-start p-5">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${step >= 2 ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant'}`}>
                2
              </div>
              <div className="flex-1">
                <div className="font-headline font-bold text-on-surface">Execute Month-End Close</div>
                <p className="text-xs text-on-surface-variant/60 mt-0.5">Roll balances forward, apply formula logic, and clear all transaction tables</p>
                {step === 2 && (
                  <div className="flex gap-3 mt-3">
                    <button onClick={handleConfirmAndClose} disabled={processing}
                      className="px-5 py-2 bg-error text-white rounded-lg text-sm font-bold hover:bg-error/90 disabled:opacity-60 transition-colors flex items-center gap-2">
                      <span className={`material-symbols-outlined text-[16px] ${processing ? 'animate-spin' : ''}`}>{processing ? 'sync' : 'lock_clock'}</span>
                      {processing ? 'Processing…' : 'Close Period Now'}
                    </button>
                    <button onClick={() => { setStep(1); showToast('Stepped back. Verify details before proceeding.', 'info') }} disabled={processing}
                      className="px-4 py-2 border border-outline-variant/20 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors">
                      ← Back
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Processing Log */}
      {processLog.length > 0 && (
        <div className="bg-white border border-outline-variant/15 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-3 border-b border-outline-variant/10 flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">terminal</span>
            <h4 className="font-headline font-bold text-xs text-on-surface uppercase tracking-wide">Processing Log</h4>
          </div>
          <div className="px-5 py-3 max-h-48 overflow-y-auto font-mono text-xs space-y-1">
            {processLog.map((line, i) => (
              <div key={i} className={`${line.includes('ERROR') ? 'text-red-600 font-bold' : line.includes('completed successfully') ? 'text-emerald-600 font-semibold' : 'text-on-surface-variant/80'}`}>
                {line}
              </div>
            ))}
            {processing && (
              <div className="text-primary animate-pulse flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] animate-spin">sync</span> Working…
              </div>
            )}
          </div>
        </div>
      )}

      {/* Result */}
      {(resultMessage || step === 3) && (
        <div className={`flex items-start gap-3 px-5 py-4 rounded-2xl border text-sm ${resultSuccess ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
          <span className="material-symbols-outlined text-[20px] shrink-0 mt-0.5">{resultSuccess ? 'check_circle' : 'error'}</span>
          <div>
            <p className="font-semibold">{resultSuccess ? 'Period Closed Successfully' : 'Processing Failed'}</p>
            <p className="mt-1 opacity-80">{resultMessage}</p>
          </div>
        </div>
      )}

      {step === 3 && (
        <button onClick={() => { setStep(1); setResultMessage(''); setConfirmText(''); setProcessLog([]) }}
          className="w-fit px-5 py-2 border border-outline-variant/20 text-on-surface-variant rounded-lg text-sm font-medium hover:bg-surface-container transition-colors">
          Start Another Close
        </button>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`flex items-center gap-3 px-5 py-3.5 rounded-full shadow-lg border text-sm font-bold tracking-wide backdrop-blur-md ${
            toast.type === 'error' ? 'bg-error/95 text-white border-error shadow-error/20' :
            toast.type === 'warning' ? 'bg-amber-500/95 text-white border-amber-600 shadow-amber-500/20' :
            toast.type === 'success' ? 'bg-emerald-600/95 text-white border-emerald-700 shadow-emerald-500/20' :
            'bg-surface-container-highest/95 text-on-surface border-outline-variant/30 shadow-black/10'
          }`}>
            <span className="material-symbols-outlined text-[18px]">
              {toast.type === 'error' ? 'error' : toast.type === 'warning' ? 'warning' : toast.type === 'success' ? 'check_circle' : 'info'}
            </span>
            <span>{toast.text}</span>
            <button type="button" onClick={() => setToast(null)} className="ml-3 opacity-70 hover:opacity-100 transition-opacity">
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Final Confirmation Modal ─────────────────────────────────────────── */}
      {showFinalConfirm && sysInfo && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Scrim */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => { setShowFinalConfirm(false); showToast('Month-end processing cancelled.', 'info') }}
          />
          {/* Card */}
          <div className="relative bg-white rounded-3xl shadow-2xl border border-outline-variant/20 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Red header */}
            <div className="bg-error px-6 pt-6 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[22px] text-white">lock_clock</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Irreversible Action</p>
                  <h2 className="text-white font-headline font-bold text-lg leading-tight">
                    Close {currentPeriodLabel}?
                  </h2>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-on-surface-variant">
                You are about to run <strong className="text-on-surface">Month-End Processing</strong> for{' '}
                <strong className="text-primary">{currentPeriodLabel}</strong>. This will:
              </p>

              <ul className="space-y-2.5">
                {[
                  { icon: 'trending_up', text: 'Roll all account balances forward' },
                  { icon: 'calculate', text: 'Apply DC/CD formula logic to all accounts' },
                  { icon: 'delete_sweep', text: 'Clear all current-period transaction tables' },
                  ...(isYearEnd ? [{ icon: 'restart_alt', text: 'Reset expense & income accounts (Year-End)' }] : []),
                ].map(item => (
                  <li key={item.icon} className="flex items-center gap-2.5 text-sm text-on-surface">
                    <span className="material-symbols-outlined text-[16px] text-on-surface-variant/60 shrink-0">{item.icon}</span>
                    {item.text}
                  </li>
                ))}
              </ul>

              <div className="flex items-start gap-2.5 px-4 py-3 bg-error/5 border border-error/20 rounded-xl">
                <span className="material-symbols-outlined text-[16px] text-error shrink-0 mt-0.5">warning</span>
                <p className="text-xs text-error font-semibold leading-relaxed">
                  This action cannot be undone. Advance CDVs for the current period will be preserved.
                </p>
              </div>

              {advanceReminderOn && (
                <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <span className="material-symbols-outlined text-[16px] text-amber-700 shrink-0 mt-0.5">notifications_active</span>
                  <p className="text-xs text-amber-800 font-semibold leading-relaxed">
                    Reminder: Advance CDVs are <strong>held</strong> and are never transferred
                    automatically.{heldAdvanceCount !== null && heldAdvanceCount > 0
                      ? ` You currently have ${heldAdvanceCount} advance CDV${heldAdvanceCount === 1 ? '' : 's'} on hold.`
                      : ''}{' '}
                    If any are dated for the next month and should be brought into the new period,
                    run <strong>Transfer Advance CDV</strong> before closing.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 flex gap-3 justify-end">
              <button
                onClick={() => { setShowFinalConfirm(false); showToast('Month-end processing cancelled.', 'info') }}
                className="px-5 py-2.5 rounded-xl border border-outline-variant/25 text-sm font-semibold text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executePeriodClose}
                className="px-5 py-2.5 rounded-xl bg-error text-white text-sm font-bold hover:bg-error/90 active:scale-[0.98] transition-all flex items-center gap-2 shadow-sm shadow-error/30"
              >
                <span className="material-symbols-outlined text-[16px]">lock_clock</span>
                Yes, Close Period
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
