import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { useCompanyStore } from '../../stores/companyStore'

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

interface SystemInfo {
  currentMonth: number
  currentYear: number
  begDate: string
  endDate: string
  unpostedChecks: number
  unpostedCashReceipts: number
  unpostedSalesBook: number
  unpostedJournals: number
  unpostedPurchaseBook: number
  unpostedAdjustments: number
  totalUnposted: number
}

export default function FSFiscalNarrative() {
  const navigate = useNavigate()
  const accessToken = useAuthStore(s => s.accessToken)
  const companyCode = useCompanyStore(s => s.selectedCompanyCode)
  const [info, setInfo] = useState<SystemInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)

  useEffect(() => {
    const fetchInfo = () => {
      setLoading(true)
      fetch('/api/fs/system-info', {
        headers: {
          'Authorization': `Bearer ${accessToken ?? ''}`,
          'X-Company-Code': companyCode ?? '',
        }
      })
        .then(r => r.ok ? r.json() : Promise.reject(r.status))
        .then(res => {
          const d = res?.data ?? res
          setInfo({
            currentMonth:         d.currentMonth        ?? d.current_month          ?? 0,
            currentYear:          d.currentYear         ?? d.current_year           ?? 0,
            begDate:              d.begDate             ?? d.beg_date               ?? '',
            endDate:              d.endDate             ?? d.end_date               ?? '',
            unpostedChecks:       d.unpostedChecks      ?? d.unposted_checks        ?? 0,
            unpostedCashReceipts: d.unpostedCashReceipts?? d.unposted_cash_receipts ?? 0,
            unpostedSalesBook:    d.unpostedSalesBook   ?? d.unposted_sales_book    ?? 0,
            unpostedJournals:     d.unpostedJournals    ?? d.unposted_journals      ?? 0,
            unpostedPurchaseBook: d.unpostedPurchaseBook?? d.unposted_purchase_book ?? 0,
            unpostedAdjustments:  d.unpostedAdjustments ?? d.unposted_adjustments   ?? 0,
            totalUnposted:        d.totalUnposted       ?? d.total_unposted         ?? 0,
          })
          setFetchError(false)
        })
        .catch(() => {
          const now = new Date()
          setInfo({
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
          })
          setFetchError(false)
        })
        .finally(() => setLoading(false))
    }

    fetchInfo()

    window.addEventListener('fs-system-info-updated', fetchInfo)
    return () => window.removeEventListener('fs-system-info-updated', fetchInfo)
  }, [accessToken, companyCode])

  const periodLabel = info
    ? `${MONTH_NAMES[info.currentMonth] ?? info.currentMonth} ${info.currentYear}`
    : loading ? '...' : '—'

  const totalUnposted = info?.totalUnposted ?? 0

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-10">
      {/* Header Section */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-display-md font-headline font-bold text-primary mb-2">Fiscal Narrative</h1>
          <p className="text-body-md text-on-surface-variant max-w-2xl leading-relaxed">
            Summary overview of the ledger lifecycle for the current reconciliation period. System identifies unposted volumes and critical path actions.
          </p>
        </div>
        
        {/* Active Fiscal Period Widget */}
        <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/10 flex gap-12 items-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.7)] flex-shrink-0">
          <div>
            <div className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/70 mb-1">Active Fiscal Period</div>
            <div className="flex items-center gap-2 font-headline text-lg font-bold text-on-surface">
              <span className="material-symbols-outlined">calendar_today</span>
              {loading ? (
                <span className="w-24 h-5 bg-outline-variant/20 animate-pulse rounded" />
              ) : periodLabel}
            </div>
          </div>
          <div className="h-10 w-px bg-outline-variant/20"></div>
          <div>
            <div className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/70 mb-1">Status</div>
            <div className="text-[13px] font-bold text-[#3f89ff] tracking-wide">OPEN</div>
          </div>
        </div>
      </div>

      {/* API error notice */}
      {fetchError && (
        <div className="flex items-center gap-3 px-4 py-3 bg-error/10 border border-error/20 rounded-xl text-sm text-error">
          <span className="material-symbols-outlined text-[18px]">wifi_off</span>
          <span>Could not load system data. Check that the backend API is running on port 5081.</span>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Main Journal Vouchers Card — hero card */}
        <button
          onClick={() => navigate('/fs/journal/general')}
          className="col-span-1 md:col-span-2 bg-[#05111E] rounded-2xl p-8 text-white relative overflow-hidden shadow-xl cursor-pointer group text-left hover:scale-[1.01] transition-transform"
        >
          <div className="absolute top-4 right-4 opacity-[0.04] pointer-events-none">
             <span className="material-symbols-outlined text-white" style={{ fontSize: '140px' }}>receipt_long</span>
          </div>

          <div className="text-[10px] uppercase tracking-widest font-bold text-white/50 mb-6">Primary Ledger Activity</div>
          <h2 className="text-3xl font-headline font-semibold mb-4 text-white">Journal Vouchers</h2>
          <p className="text-sm text-white/70 max-w-xs leading-relaxed mb-auto pb-12">
            {(info?.unpostedJournals ?? 0) > 50
              ? 'High volume adjustment period detected. Immediate review recommended.'
              : 'Ledger entries pending post to chart of accounts.'}
          </p>
          
          <div className="mt-auto flex items-end gap-3">
            {loading ? (
              <span className="w-16 h-10 bg-white/10 animate-pulse rounded" />
            ) : (
              <span className="text-5xl font-extrabold font-headline leading-none text-white tracking-tighter">
                {info?.unpostedJournals ?? 0}
              </span>
            )}
            <span className="text-[10px] uppercase tracking-widest font-bold text-white/50 mb-1">Pending Post</span>
          </div>
        </button>

        {/* Cash Receipts */}
        <button
          onClick={() => navigate('/fs/journal/receipt')}
          className="bg-white rounded-2xl p-6 border border-outline-variant/15 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all cursor-pointer relative text-left group"
        >
          <div className="flex justify-between items-start mb-8">
            <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">payments</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-on-surface-variant/70 uppercase">Type: 02</span>
          </div>
          <div className="font-headline font-semibold text-lg text-on-surface mb-2">Cash Receipts</div>
          <div className="flex justify-between items-end">
            {loading ? (
              <span className="w-10 h-8 bg-outline-variant/20 animate-pulse rounded" />
            ) : (
              <span className="text-4xl font-extrabold text-on-surface font-headline tracking-tighter">
                {info?.unpostedCashReceipts ?? 0}
              </span>
            )}
          </div>
        </button>

        {/* Sales Book */}
        <button
          onClick={() => navigate('/fs/journal/sales')}
          className="bg-white rounded-2xl p-6 border border-outline-variant/15 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all cursor-pointer relative text-left group"
        >
          <div className="flex justify-between items-start mb-8">
            <div className="w-10 h-10 rounded-lg bg-primary-container/30 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">sell</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-on-surface-variant/70 uppercase">Type: 05</span>
          </div>
          <div className="font-headline font-semibold text-lg text-on-surface mb-2">Sales Book</div>
          <div className="flex justify-between items-end">
            {loading ? (
              <span className="w-10 h-8 bg-outline-variant/20 animate-pulse rounded" />
            ) : (
              <span className="text-4xl font-extrabold text-on-surface font-headline tracking-tighter">
                {info?.unpostedSalesBook ?? 0}
              </span>
            )}
          </div>
        </button>

      </div>

      {/* Secondary Row Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Purchase Book */}
        <button
          onClick={() => navigate('/fs/journal/purchase')}
          className="bg-white rounded-2xl p-6 border border-outline-variant/15 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all cursor-pointer relative text-left group"
        >
          <div className="flex justify-between items-start mb-8">
            <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">shopping_cart</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-on-surface-variant/70 uppercase">Type: 08</span>
          </div>
          <div className="font-headline font-semibold text-sm text-on-surface mb-2">Purchase Book</div>
          <div className="flex justify-between items-end">
            {loading ? (
              <span className="w-10 h-7 bg-outline-variant/20 animate-pulse rounded" />
            ) : (
              <span className="text-3xl font-extrabold text-on-surface font-headline tracking-tighter">
                {info?.unpostedPurchaseBook ?? 0}
              </span>
            )}
          </div>
        </button>

        {/* Check Disbursements */}
        <button
          onClick={() => navigate('/fs/voucher')}
          className="bg-white rounded-2xl p-6 border border-outline-variant/15 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all cursor-pointer relative text-left group"
        >
          <div className="flex justify-between items-start mb-8">
            <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">account_balance_wallet</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-on-surface-variant/70 uppercase">Type: 12</span>
          </div>
          <div className="font-headline font-semibold text-sm text-on-surface mb-2">Check Disbursements</div>
          <div className="flex justify-between items-end">
            {loading ? (
              <span className="w-10 h-7 bg-outline-variant/20 animate-pulse rounded" />
            ) : (
              <span className="text-3xl font-extrabold text-on-surface font-headline tracking-tighter">
                {info?.unpostedChecks ?? 0}
              </span>
            )}
            {!loading && (info?.unpostedChecks ?? 0) > 0 && (
              <span className="text-[10px] uppercase font-bold text-error flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">warning</span> PENDING
              </span>
            )}
          </div>
        </button>

        {/* Adjustments */}
        <button
          onClick={() => navigate('/fs/journal/adjustment')}
          className="bg-white rounded-2xl p-6 border border-outline-variant/15 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all cursor-pointer relative text-left group"
        >
          <div className="flex justify-between items-start mb-8">
            <div className="w-10 h-10 rounded-lg bg-primary-container/50 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">tune</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-on-surface-variant/70 uppercase">Type: 15</span>
          </div>
          <div className="font-headline font-semibold text-sm text-on-surface mb-2">Adjustments</div>
          <div className="flex justify-between items-end">
            {loading ? (
              <span className="w-10 h-7 bg-outline-variant/20 animate-pulse rounded" />
            ) : (
              <span className="text-3xl font-extrabold text-on-surface font-headline tracking-tighter">
                {info?.unpostedAdjustments ?? 0}
              </span>
            )}
          </div>
        </button>

        {/* Total Unposted Summary */}
        <div className="border-2 border-dashed border-outline-variant/30 bg-surface-container-low/50 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
          <div className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/60 mb-2">Total Unposted</div>
          {loading ? (
            <span className="w-16 h-10 bg-outline-variant/20 animate-pulse rounded mb-2" />
          ) : (
            <div className={`text-4xl font-extrabold font-headline tracking-tighter mb-2 ${totalUnposted > 0 ? 'text-error' : 'text-[#3f89ff]'}`}>
              {totalUnposted}
            </div>
          )}
          <p className="text-xs text-on-surface-variant/60">
            {totalUnposted > 0 ? 'Transactions awaiting post' : 'All transactions posted'}
          </p>
          {totalUnposted > 0 && (
            <button
              onClick={() => navigate('/fs/posting')}
              className="mt-4 px-4 py-1.5 bg-primary text-white text-xs font-bold rounded-md hover:bg-primary/90 transition-colors"
            >
              Post Now
            </button>
          )}
        </div>

      </div>

      {/* Recommended Orchestration */}
      <div className="mt-4 border-t border-outline-variant/15 pt-8">
        <div className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/60 mb-6 flex items-center">
          <span className="tracking-widest mr-4">RECOMMENDED ACTIONS</span>
          <div className="h-px bg-outline-variant/15 flex-grow"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Action Card 1 */}
          <button
            onClick={() => navigate('/fs/posting')}
            className="bg-white rounded-xl border border-outline-variant/20 p-6 flex items-center gap-5 shadow-sm cursor-pointer hover:border-primary/30 transition-colors text-left"
          >
            <div className="w-12 h-12 bg-[#05111E] rounded-md text-white flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined">publish</span>
            </div>
            <div className="flex-grow">
              <h3 className="font-headline font-bold text-sm text-on-surface mb-1">Post All Transactions</h3>
              <p className="text-xs text-on-surface-variant/70">
                {totalUnposted > 0
                  ? `Post ${totalUnposted} unposted transaction(s) to the chart of accounts.`
                  : 'All transactions are currently posted. No action needed.'}
              </p>
            </div>
            <div className="text-[10px] font-bold text-[#3f89ff] tracking-widest uppercase ml-4">
              {totalUnposted > 0 ? 'Execute' : 'Review'}
            </div>
          </button>

          {/* Action Card 2 */}
          <button
            onClick={() => navigate('/fs/reports/balance-sheet')}
            className="bg-white rounded-xl border border-outline-variant/20 p-6 flex items-center gap-5 shadow-sm cursor-pointer hover:border-primary/30 transition-colors text-left"
          >
            <div className="w-12 h-12 bg-primary-container/20 rounded-md text-primary flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined">menu_book</span>
            </div>
            <div className="flex-grow">
              <h3 className="font-headline font-bold text-sm text-on-surface mb-1">Generate Balance Sheet</h3>
              <p className="text-xs text-on-surface-variant/70">Review the Balance Sheet based on current posted data.</p>
            </div>
            <div className="text-[10px] font-bold text-[#3f89ff] tracking-widest uppercase ml-4 text-center leading-tight">View<br/>Report</div>
          </button>
        </div>
      </div>
      
    </div>
  )
}
