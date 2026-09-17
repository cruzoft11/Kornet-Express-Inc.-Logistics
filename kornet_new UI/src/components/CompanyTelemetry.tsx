import { useState, useEffect } from 'react'
import axios from 'axios'
import { useSettingsStore } from '../stores/settingsStore'

interface CompanyTelemetryProps {
  companyCode: string
  onClose?: () => void
}

interface StatsData {
  code: string
  name: string
  counts: {
    accounts: number
    checks: number
    vouchers: number
    journals: number
    pournals: number
    schedules: number
    adjustments: number
    cashReceipts: number
    salesBook: number
    purchaseBook: number
    payMaster: number
    payTimecards: number
    banks: number
    suppliers: number
  }
  accountTypes: Array<{ type: string; count: number }>
}

export default function CompanyTelemetry({ companyCode, onClose }: CompanyTelemetryProps) {
  const darkMode = useSettingsStore(s => s.darkMode)
  const [data, setData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const fetchStats = async () => {
      setLoading(true)
      setError('')
      try {
        const token = localStorage.getItem('auth-storage')
        let headers = {}
        if (token) {
          try {
            const parsed = JSON.parse(token)
            const accessToken = parsed?.state?.accessToken
            if (accessToken) {
              headers = { Authorization: `Bearer ${accessToken}` }
            }
          } catch (e) {
            console.error('Error parsing auth token for telemetry request:', e)
          }
        }

        const res = await axios.get(`/api/companies/${companyCode}/stats`, { headers })
        if (active) {
          setData(res.data)
        }
      } catch (err: any) {
        if (active) {
          setError(err?.response?.data?.message || 'Failed to load telemetry stats.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    fetchStats()
    return () => {
      active = false
    }
  }, [companyCode])

  if (loading) {
    return (
      <div className="py-20 flex flex-col justify-center items-center gap-4">
        <div className="w-12 h-12 rounded-full border-t-2 border-primary animate-spin"></div>
        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-slate-500'}`}>Loading database telemetry...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-12 px-6 text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-[32px]">error</span>
        </div>
        <h4 className="font-headline font-bold text-lg text-red-500 mb-2">Telemetry Error</h4>
        <p className={`text-sm max-w-md mx-auto mb-6 ${darkMode ? 'text-gray-400' : 'text-slate-600'}`}>{error}</p>
        {onClose && (
          <button onClick={onClose} className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-xl text-sm transition-all">
            Dismiss
          </button>
        )}
      </div>
    )
  }

  if (!data) return null

  // Calculate totals
  const totalFsRecords = Object.entries(data.counts)
    .filter(([key]) => !key.startsWith('pay'))
    .reduce((sum, [_, val]) => sum + val, 0)

  const totalPayRecords = Object.entries(data.counts)
    .filter(([key]) => key.startsWith('pay'))
    .reduce((sum, [_, val]) => sum + val, 0)



  // SVG Pie chart calculation
  const totalAccounts = data.accountTypes.reduce((sum, item) => sum + item.count, 0)
  let cumulativeAngle = 0
  const colors = [
    '#3b82f6', // Blue
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#64748b', // Slate
    '#06b6d4', // Cyan
  ]

  const pieSlices = data.accountTypes.map((item, idx) => {
    if (totalAccounts === 0) return null
    const percentage = item.count / totalAccounts
    const angle = percentage * 360
    const startAngle = cumulativeAngle
    const endAngle = cumulativeAngle + angle
    cumulativeAngle += angle

    // Polar to Cartesian
    const x1 = 100 + 80 * Math.cos((startAngle - 90) * Math.PI / 180)
    const y1 = 100 + 80 * Math.sin((startAngle - 90) * Math.PI / 180)
    const x2 = 100 + 80 * Math.cos((endAngle - 90) * Math.PI / 180)
    const y2 = 100 + 80 * Math.sin((endAngle - 90) * Math.PI / 180)

    const largeArcFlag = angle > 180 ? 1 : 0
    const pathData = `M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArcFlag} 1 ${x2} ${y2} Z`

    return {
      path: pathData,
      color: colors[idx % colors.length],
      label: item.type,
      count: item.count,
      percent: Math.round(percentage * 100)
    }
  }).filter(Boolean)

  // Bar chart configurations
  const barMetrics = [
    { label: 'Check Vouchers', count: data.counts.vouchers, color: 'bg-blue-500' },
    { label: 'Check Mas', count: data.counts.checks, color: 'bg-cyan-500' },
    { label: 'Journals', count: data.counts.journals, color: 'bg-violet-500' },
    { label: 'Purchases (POU)', count: data.counts.pournals, color: 'bg-fuchsia-500' },
    { label: 'Cash Receipts', count: data.counts.cashReceipts, color: 'bg-emerald-500' },
    { label: 'Adjustments', count: data.counts.adjustments, color: 'bg-amber-500' }
  ]
  const maxBarVal = Math.max(...barMetrics.map(b => b.count), 1)

  return (
    <div className="space-y-6">
      
      {/* Header Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-5 rounded-2xl border transition-all ${darkMode ? 'bg-slate-800/40 border-slate-700 hover:border-slate-600' : 'bg-slate-50 border-slate-200 hover:shadow-sm'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-slate-500'}`}>Total Accounts</span>
            <span className="material-symbols-outlined text-blue-500">account_tree</span>
          </div>
          <h2 className="text-3xl font-headline font-bold text-on-surface">{data.counts.accounts}</h2>
          <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-slate-400'}`}>Defined Chart of Accounts</p>
        </div>

        <div className={`p-5 rounded-2xl border transition-all ${darkMode ? 'bg-slate-800/40 border-slate-700 hover:border-slate-600' : 'bg-slate-50 border-slate-200 hover:shadow-sm'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-slate-500'}`}>FS Ledger Records</span>
            <span className="material-symbols-outlined text-purple-500">receipt_long</span>
          </div>
          <h2 className="text-3xl font-headline font-bold text-on-surface">{totalFsRecords}</h2>
          <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-slate-400'}`}>Transactions, Vouchers & setup</p>
        </div>

        <div className={`p-5 rounded-2xl border transition-all ${darkMode ? 'bg-slate-800/40 border-slate-700 hover:border-slate-600' : 'bg-slate-50 border-slate-200 hover:shadow-sm'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-slate-500'}`}>Payroll Records</span>
            <span className="material-symbols-outlined text-emerald-500">badge</span>
          </div>
          <h2 className="text-3xl font-headline font-bold text-on-surface">{totalPayRecords}</h2>
          <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-slate-400'}`}>Master files & timecards</p>
        </div>
      </div>

      {/* Grid: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* SVG Pie Chart: Account Types */}
        <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-[#0f172a]/50 border-slate-800' : 'bg-white border-slate-200'}`}>
          <h3 className="font-bold text-sm uppercase tracking-wider mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-blue-500 animate-pulse">donut_large</span>
            Accounts Breakdown ({totalAccounts})
          </h3>
          
          {totalAccounts === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-xs text-slate-500">No chart accounts seeded yet.</div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <svg width="180" height="180" viewBox="0 0 200 200" className="flex-shrink-0 animate-fade-in">
                <circle cx="100" cy="100" r="82" fill="none" stroke={darkMode ? '#1e293b' : '#f1f5f9'} strokeWidth="16" />
                {pieSlices.map((slice, i) => (
                  <path
                    key={i}
                    d={slice!.path}
                    fill={slice!.color}
                    className="transition-all duration-300 hover:opacity-85 cursor-pointer"
                  >
                    <title>{`${slice!.label}: ${slice!.count} (${slice!.percent}%)`}</title>
                  </path>
                ))}
                <circle cx="100" cy="100" r="50" fill={darkMode ? '#0f172a' : '#ffffff'} />
                <text x="100" y="98" textAnchor="middle" className={`font-headline text-lg font-bold ${darkMode ? 'fill-white' : 'fill-slate-900'}`}>{totalAccounts}</text>
                <text x="100" y="115" textAnchor="middle" className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'fill-gray-500' : 'fill-slate-400'}`}>Accts</text>
              </svg>
              
              <div className="flex-1 space-y-2 w-full text-xs">
                {pieSlices.map((slice, i) => (
                  <div key={i} className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-500/5">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: slice!.color }} />
                      <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>{slice!.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-semibold">{slice!.count}</span>
                      <span className={`w-10 text-right font-mono font-bold ${darkMode ? 'text-gray-500' : 'text-slate-400'}`}>{slice!.percent}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Custom HTML/CSS Bar Chart: Transaction volumes */}
        <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-[#0f172a]/50 border-slate-800' : 'bg-white border-slate-200'}`}>
          <h3 className="font-bold text-sm uppercase tracking-wider mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-purple-500">bar_chart</span>
            Transaction Ledger Distribution
          </h3>

          <div className="space-y-4 py-2">
            {barMetrics.map((item, idx) => {
              const pct = (item.count / maxBarVal) * 100
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className={darkMode ? 'text-gray-300' : 'text-slate-700'}>{item.label}</span>
                    <span className="font-mono text-primary font-bold">{item.count}</span>
                  </div>
                  <div className={`w-full h-3 rounded-full overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    <div
                      className={`h-full rounded-full ${item.color} transition-all duration-700 ease-out`}
                      style={{ width: `${Math.max(pct, item.count > 0 ? 3 : 0)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>

      {/* Database breakdown Table */}
      <div className={`p-6 rounded-2xl border ${darkMode ? 'bg-[#0f172a]/50 border-slate-800' : 'bg-white border-slate-200'}`}>
        <h3 className="font-bold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-emerald-500">grid_on</span>
          Database Entity Telemetry
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className={`border-b ${darkMode ? 'border-gray-800 text-gray-400' : 'border-slate-100 text-slate-500'} font-bold`}>
                <th className="py-3 px-4 uppercase tracking-wider">Module / Table</th>
                <th className="py-3 px-4 uppercase tracking-wider">Purpose</th>
                <th className="py-3 px-4 uppercase tracking-wider text-right">Row Count</th>
                <th className="py-3 px-4 uppercase tracking-wider text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-inherit">
              {[
                { module: 'Financial Statements', name: 'fs_accounts', purpose: 'Chart of Accounts & balances', count: data.counts.accounts },
                { module: 'Financial Statements', name: 'fs_checkmas', purpose: 'Check disbursement master index', count: data.counts.checks },
                { module: 'Financial Statements', name: 'fs_checkvou', purpose: 'Check voucher ledger lines', count: data.counts.vouchers },
                { module: 'Financial Statements', name: 'fs_journals', purpose: 'General journal entries', count: data.counts.journals },
                { module: 'Financial Statements', name: 'fs_pournals', purpose: 'Purchase & adjustment lines', count: data.counts.pournals },
                { module: 'Financial Statements', name: 'fs_schedule', purpose: 'Account schedules & categories', count: data.counts.schedules },
                { module: 'Financial Statements', name: 'fs_banks', purpose: 'Configured active banking profiles', count: data.counts.banks },
                { module: 'Financial Statements', name: 'fs_supplier', purpose: 'Active supplier profiles', count: data.counts.suppliers },
                { module: 'Payroll System', name: 'pay_master', purpose: 'Employee profiles & metadata', count: data.counts.payMaster },
                { module: 'Payroll System', name: 'pay_tmcard', purpose: 'Timecard & attendance logs', count: data.counts.payTimecards }
              ].map((row, i) => (
                <tr key={i} className={`hover:bg-slate-500/5 ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                  <td className="py-3 px-4 font-mono font-semibold">
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${row.module === 'Payroll System' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                    {row.name}
                  </td>
                  <td className={`py-3 px-4 ${darkMode ? 'text-gray-400' : 'text-slate-500'}`}>{row.purpose}</td>
                  <td className="py-3 px-4 font-mono font-bold text-right">{row.count}</td>
                  <td className="py-3 px-4 text-right">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${row.count > 0 ? (darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600') : (darkMode ? 'bg-slate-800 text-gray-500' : 'bg-slate-100 text-slate-400')}`}>
                      {row.count > 0 ? 'Active Data' : 'Empty'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
