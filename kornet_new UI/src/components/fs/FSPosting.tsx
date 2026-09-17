import { useState, useEffect } from 'react'
import axios from 'axios'
import PageHeader from '../PageHeader'

interface SystemInfo {
  currentMonth: number
  currentYear: number
  begDate: string | null
  endDate: string | null
  unpostedChecks: number
  unpostedCashReceipts: number
  unpostedSalesBook: number
  unpostedJournals: number
  unpostedPurchaseBook: number
  unpostedAdjustments: number
  totalUnposted: number
}

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export default function FSPosting() {
  const API_BASE = '/api/fs'
  const [posting, setPosting] = useState(false)
  const [resultMessage, setResultMessage] = useState('')
  const [resultSuccess, setResultSuccess] = useState(false)
  const [sysInfo, setSysInfo] = useState<SystemInfo | null>(null)
  const [loadingInfo, setLoadingInfo] = useState(true)
  const [recordsPosted, setRecordsPosted] = useState(0)

  // Custom UI states
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4500)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const loadSystemInfo = async () => {
    setLoadingInfo(true)
    try {
      const resp = await axios.get(`${API_BASE}/system-info`)
      setSysInfo(resp.data?.data ?? resp.data)
    } catch {
      setSysInfo(null)
    } finally {
      setLoadingInfo(false)
    }
  }

  useEffect(() => {
    void loadSystemInfo()
  }, [])

  const initiatePost = () => {
    if (!sysInfo) return
    if (sysInfo.totalUnposted === 0) {
      setToast({ text: "No transactions to post for the current period.", type: 'info' })
      return
    }
    setShowConfirmModal(true)
  }

  const handlePost = async () => {
    if (!sysInfo) return
    setShowConfirmModal(false)
    setPosting(true)
    setResultMessage('')

    try {
      const resp = await axios.post(`${API_BASE}/posting`)
      setRecordsPosted(resp.data.recordsPosted ?? 0)
      setResultSuccess(true)
      setResultMessage(resp.data.message || 'Posting completed successfully.')
      setToast({ text: 'Records successfully posted to ledger.', type: 'success' })
      await loadSystemInfo()  // Refresh counts after posting
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.Error || err.message || 'Posting failed.'
      setResultSuccess(false)
      setResultMessage(msg)
      setToast({ text: msg, type: 'error' })
    } finally {
      setPosting(false)
    }
  }

  const periodLabel = sysInfo
    ? `${MONTH_NAMES[sysInfo.currentMonth]} ${sysInfo.currentYear}`
    : '—'

  const STATS = [
    { label: 'Disbursement Vouchers', val: sysInfo?.unpostedChecks ?? 0 },
    { label: 'Cash Receipts', val: sysInfo?.unpostedCashReceipts ?? 0 },
    { label: 'Sales Book Journals', val: sysInfo?.unpostedSalesBook ?? 0 },
    { label: 'Journal Vouchers', val: sysInfo?.unpostedJournals ?? 0 },
    { label: 'Purchase Book Journals', val: sysInfo?.unpostedPurchaseBook ?? 0 },
    { label: 'Adjustments', val: sysInfo?.unpostedAdjustments ?? 0 },
  ]

  return (
    <div className="flex flex-col gap-6 max-w-[1000px] mx-auto w-full">
      <PageHeader
        breadcrumb="PROCESSING / POSTING"
        title="Post All Transactions"
        subtitle="Apply unposted journal entries to the core ledger accounts"
      />

      {/* Toast Notification */}
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
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && sysInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="max-w-md w-full bg-surface-container-lowest rounded-3xl shadow-2xl overflow-hidden border border-outline-variant/30 animate-in slide-in-from-bottom-4 duration-300">
            <div className="p-8">
              <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-3xl">publish</span>
              </div>
              <h2 className="text-2xl font-headline font-bold text-on-surface mb-3 tracking-tight">Post All Transactions?</h2>
              <p className="text-on-surface-variant text-sm leading-relaxed mb-6">
                This action will move all temporary unposted entries into the posted permanent ledger and recalculate all Chart of Account ending balances.
              </p>
              
              <div className="bg-surface-container/50 px-4 py-3 rounded-xl flex items-center justify-between mb-8">
                <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Pending Records</span>
                <span className="font-mono text-lg font-black text-primary">{sysInfo.totalUnposted}</span>
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-3 px-4 rounded-xl font-bold tracking-wide text-sm bg-transparent border border-outline-variant/30 hover:bg-surface-container transition-colors"
                >
                  CANCEL
                </button>
                <button 
                  onClick={handlePost}
                  className="flex-1 py-3 px-4 rounded-xl font-bold tracking-wide text-sm bg-primary text-on-primary hover:bg-primary/90 shadow-md hover:shadow-lg hover:-translate-y-0.5 border border-primary/20 transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">done_all</span>
                  CONFIRM
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {resultMessage && (
        <div className={`px-5 py-4 rounded-xl border-l-4 font-bold text-sm shadow-sm flex items-center justify-between transition-all animate-in fade-in slide-in-from-top-2 ${
          resultSuccess
            ? 'bg-emerald-50 text-emerald-800 border-emerald-500'
            : 'bg-error-container text-on-error-container border-error'
        }`}>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[20px]">
              {resultSuccess ? 'check_circle' : 'error'}
            </span>
            <span>
              {resultSuccess
                ? `✓ ${resultMessage} (${recordsPosted} records applied to ledger)`
                : `✗ ${resultMessage}`}
            </span>
          </div>
          <button onClick={() => setResultMessage('')} className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* Main Content Card */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl shadow-sm overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Panel: Actions & Description */}
        <div className="flex-1 p-8 bg-surface-container-lowest flex flex-col justify-center">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-4">
              <span className="material-symbols-outlined text-3xl">publish</span>
            </div>
            <h2 className="font-headline text-2xl font-bold text-on-surface tracking-tight mb-2">Execute Ledger Posting</h2>
            <p className="text-on-surface-variant text-sm leading-relaxed max-w-sm">
              Commits all finalized but unposted journal line items into the Chart of Accounts, recalculating period-to-date and year-to-date balances. This transaction process is comprehensive and updates the permanent ledger.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-auto">
            <button
              className={`flex-1 py-3.5 px-6 rounded-xl font-bold tracking-wide text-sm flex items-center justify-center gap-2 shadow-sm transition-all ${
                posting || loadingInfo || (sysInfo && sysInfo.totalUnposted === 0)
                  ? 'bg-surface-container-high text-on-surface-variant/50 cursor-not-allowed border-none'
                  : 'bg-gradient-to-br from-primary to-primary-container text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 border border-primary/20'
              }`}
              onClick={initiatePost}
              disabled={posting || loadingInfo || (sysInfo ? sysInfo.totalUnposted === 0 : false)}
            >
              {posting ? (
                <><span className="material-symbols-outlined text-[18px] animate-spin">sync</span> POSTING IN PROGRESS...</>
              ) : (
                <><span className="material-symbols-outlined text-[18px]">done_all</span> POST TRANSACTIONS</>
              )}
            </button>
            <button 
              className="py-3.5 px-4 rounded-xl font-bold tracking-wide text-sm flex items-center justify-center bg-transparent border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors whitespace-nowrap"
              onClick={loadSystemInfo} 
              disabled={posting || loadingInfo}
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
            </button>
          </div>
        </div>

        {/* Right Panel: Data Preview */}
        <div className="flex-1 bg-surface-container-low border-l border-outline-variant/30 p-8 flex flex-col">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-outline-variant/20">
            <h3 className="font-headline font-bold text-sm tracking-[0.1em] text-on-surface-variant uppercase flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">summarize</span> Pre-Posting Summary
            </h3>
            {loadingInfo ? (
               <span className="text-xs font-mono bg-surface-container font-bold px-2 py-1 rounded w-16 h-6 animate-pulse"></span>
            ) : (
              <span className="text-xs font-mono font-bold bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-md tracking-wider">
                {periodLabel}
              </span>
            )}
          </div>

          <div className="flex-1 space-y-3">
            {loadingInfo ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 bg-surface-container/50 rounded-lg animate-pulse"></div>
              ))
            ) : sysInfo ? (
              <table className="w-full text-sm">
                <tbody className="divide-y divide-outline-variant/10">
                  {STATS.map((s) => (
                    <tr key={s.label} className="group hover:bg-surface-container transition-colors">
                      <td className="py-2.5 pr-4 text-on-surface-variant font-medium group-hover:text-on-surface transition-colors">{s.label}</td>
                      <td className="py-2.5 pl-4 text-right">
                        {s.val > 0 
                          ? <span className="font-mono font-bold text-primary">{s.val}</span>
                          : <span className="font-mono text-on-surface-variant/50">0</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="pt-4 pb-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant border-t border-outline-variant/20 mt-2">Total Unposted</td>
                    <td className="pt-4 pb-2 text-right border-t border-outline-variant/20 mt-2">
                      <span className={`font-mono font-black text-lg ${sysInfo.totalUnposted > 0 ? 'text-primary' : 'text-emerald-600'}`}>
                        {sysInfo.totalUnposted}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-on-surface-variant/50 gap-2">
                <span className="material-symbols-outlined text-3xl">cloud_off</span>
                <p className="text-sm font-medium">Unable to connect to financial server</p>
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  )
}
