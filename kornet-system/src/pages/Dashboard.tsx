import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useCompanyStore } from '../stores/companyStore'
import { useSettingsStore } from '../stores/settingsStore'
import { getCompanyNameByCode } from '../config/companies'
import Breadcrumbs from '../components/Breadcrumbs'

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const selectedCompanyCode = useCompanyStore((state) => state.selectedCompanyCode)
  const selectedCompanyName = getCompanyNameByCode(selectedCompanyCode)
  const darkMode = useSettingsStore((state) => state.darkMode)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className={`font-body min-h-screen flex flex-col relative overflow-hidden ${darkMode ? 'bg-[#0a0f1e] text-gray-100' : 'bg-slate-50/50 text-slate-900'}`}>
      {/* Abstract Background */}
      <div className={`absolute top-[10%] left-[-10%] w-[50%] h-[70%] rounded-full blur-[120px] -z-10 animate-pulse ${darkMode ? 'bg-blue-900/20 mix-blend-screen' : 'bg-blue-500/10 mix-blend-multiply'}`} style={{ animationDuration: '8s' }}></div>
      <div className={`absolute bottom-[0%] right-[-10%] w-[40%] h-[60%] rounded-full blur-[100px] -z-10 animate-pulse ${darkMode ? 'bg-emerald-900/15 mix-blend-screen' : 'bg-emerald-400/10 mix-blend-multiply'}`} style={{ animationDuration: '10s', animationDelay: '2s' }}></div>

      {/* Top Header */}
      <header className={`px-8 py-4 flex justify-between items-center w-full z-10 border-b backdrop-blur-md ${darkMode ? 'bg-[#0f172a]/80 border-gray-800' : 'bg-white/60 border-slate-200'}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black shadow-md">
            KE
          </div>
          <div>
            <h1 className={`text-lg font-bold tracking-tight ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>
              Kornet Express Freight & Logistics
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              All-in-One Logistics Operations & Financial Statements Platform &bull; Welcome, <strong>{user?.username || 'Operator'}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${darkMode ? 'bg-[#1e293b] border-gray-700 text-blue-400 font-bold' : 'bg-blue-50 border-blue-200 text-blue-700 font-bold'}`}>
            <span className="material-symbols-outlined text-[16px]">verified</span>
            {selectedCompanyName || 'Kornet Express Inc.'}
          </div>
          <button onClick={handleLogout} className="text-slate-500 hover:text-red-600 transition-colors flex items-center gap-1 font-medium">
            <span className="material-symbols-outlined text-[16px]">logout</span> Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-center p-6 sm:p-12 z-10">
        <div className="w-full max-w-5xl">
          <Breadcrumbs segments={[
            { label: selectedCompanyName || 'Kornet Express Inc.', icon: 'domain' },
            { label: 'System Selection' }
          ]} className="mb-6" />

          <div className="mb-10 text-center">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
              Kornet Express All-in-One Suite
            </span>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-2">
              Select Unified Operational Gateway
            </h2>
            <p className="text-sm text-slate-500 max-w-xl mx-auto mt-1">
              Seamlessly bridge international logistics shipments with your General Ledger and Financial Statements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Card 1: Logistics Operations */}
            <div 
              onClick={() => navigate('/logistics')}
              className={`group relative rounded-3xl p-8 flex flex-col h-full border transition-all duration-300 overflow-hidden shadow-md hover:shadow-2xl hover:-translate-y-1.5 cursor-pointer ${
                darkMode ? 'bg-[#1e293b] border-gray-700 hover:border-blue-500/50' : 'bg-white border-slate-200 hover:border-blue-500/40'
              }`}
            >
              <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/10 rounded-bl-[120px] -z-10 group-hover:scale-110 transition-transform duration-500"></div>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300 shadow-sm">
                <span className="material-symbols-outlined text-3xl">local_shipping</span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                Logistics Operations Suite
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                  Logisuite Parity
                </span>
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
                End-to-end operational execution for ocean/air forwarding, vehicle inventory with VIN decode, cartage P/D, and Accounting Bridge.
              </p>
              
              <ul className="space-y-3 mb-8 flex-grow text-xs font-semibold text-slate-700 dark:text-slate-300">
                {[
                  'Ocean Export/Import bookings, container stuffing & BOL',
                  'Air Export/Import with IATA AWB tracking',
                  'Vehicle inventory with 1-click VIN decoder & Customs hold cascading',
                  'Domestic Pickup & Delivery with barcode link & Dock receipts',
                  'Pre-audit File Analysis & automated Accounting Bridge staging'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-[16px] text-blue-600 mt-0.5">check_circle</span>
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-auto flex items-center gap-2 font-bold text-sm text-blue-600 dark:text-blue-400 group-hover:gap-3 transition-all">
                Launch Logistics App
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </div>
            </div>

            {/* Card 2: Financial Statements (FS) System */}
            <div 
              onClick={() => navigate('/fs')}
              className={`group relative rounded-3xl p-8 flex flex-col h-full border transition-all duration-300 overflow-hidden shadow-md hover:shadow-2xl hover:-translate-y-1.5 cursor-pointer ${
                darkMode ? 'bg-[#1e293b] border-gray-700 hover:border-emerald-500/50' : 'bg-white border-slate-200 hover:border-emerald-500/40'
              }`}
            >
              <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-bl-[120px] -z-10 group-hover:scale-110 transition-transform duration-500"></div>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300 shadow-sm">
                <span className="material-symbols-outlined text-3xl">account_balance</span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                Financial Statements (FS)
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                  Core Ledger
                </span>
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
                Full-ledger financial reporting, voucher processing, check disbursements, journal entries, and chart of accounts management.
              </p>
              
              <ul className="space-y-3 mb-8 flex-grow text-xs font-semibold text-slate-700 dark:text-slate-300">
                {[
                  'Check Disbursement Vouchers (CDV) & check printing',
                  'Cash Receipts, Sales Book & Purchase Book journals',
                  'Balance Sheet, Income Statement, Trial Balance & General Ledger',
                  'Transaction posting engine & Month-end closing',
                  'Suppliers, Banks, and Chart of Accounts master maintenance'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-[16px] text-emerald-600 mt-0.5">check_circle</span>
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-auto flex items-center gap-2 font-bold text-sm text-emerald-600 dark:text-emerald-400 group-hover:gap-3 transition-all">
                Open Financial Statements
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
