import { useState, useEffect } from 'react'
import { useLogisticsStore } from '../../stores/logisticsStore'
import { RefreshCw, Check, DollarSign, Tag, ShieldCheck, TrendingUp, Sparkles } from 'lucide-react'

const DEFAULT_BILLING_CODES = [
  { code: 'OFR', description: 'Ocean Freight Rate (W/M or FCL)', glAccount: '4010', defaultRate: 2400, taxable: true },
  { code: 'AFR', description: 'Air Freight Cargo Rate (per Chargeable KG)', glAccount: '4011', defaultRate: 350, taxable: true },
  { code: 'THC', description: 'Terminal Handling Charge (PPA / Port Operator)', glAccount: '5010', defaultRate: 4500, taxable: true },
  { code: 'DOC', description: 'Documentation & Bill of Lading Processing Fee', glAccount: '4030', defaultRate: 1500, taxable: true },
  { code: 'BRK', description: 'Customs Brokerage & Clearance Fee', glAccount: '4040', defaultRate: 3500, taxable: true },
  { code: 'ARR', description: 'Arrastre Charge (Manila Harbor / PPA)', glAccount: '5011', defaultRate: 2800, taxable: true },
  { code: 'WHF', description: 'Wharfage Dues & Berth Fees', glAccount: '5012', defaultRate: 1850, taxable: true },
  { code: 'TRK', description: 'Domestic Cartage & Trucking Delivery Fee', glAccount: '4060', defaultRate: 14500, taxable: true },
  { code: 'HND', description: 'Airport Ramp & Terminal Handling Fee', glAccount: '5020', defaultRate: 2200, taxable: true },
  { code: 'STG', description: 'Storage & CFS Warehousing (per day)', glAccount: '4080', defaultRate: 950, taxable: true },
  { code: 'INS', description: 'Marine & Cargo Insurance Premium', glAccount: '4090', defaultRate: 1200, taxable: false },
  { code: 'DEM', description: 'Demurrage & Detention Charge', glAccount: '4091', defaultRate: 3200, taxable: true },
]

export default function RatesMaintenanceManager() {
  const { fxRates, fxLastUpdated, vatRate, setFxRates, setVatRate, fetchLiveFxRates } = useLogisticsStore()

  const [isFetching, setIsFetching] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [localRates, setLocalRates] = useState(fxRates)
  const [localVat, setLocalVat] = useState(vatRate * 100)
  const [billingCodes, setBillingCodes] = useState(DEFAULT_BILLING_CODES)
  const [editingCode, setEditingCode] = useState<string | null>(null)

  useEffect(() => {
    setLocalRates(fxRates)
  }, [fxRates])

  const handleRefreshFromApi = async () => {
    setIsFetching(true)
    await fetchLiveFxRates()
    setIsFetching(false)
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 2500)
  }

  const handleSaveAll = () => {
    setFxRates(localRates)
    setVatRate(localVat / 100)
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 2500)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden text-slate-100 font-sans">
      {/* Header Bar */}
      <div className="px-6 py-4 border-b border-white/10 bg-[#08192e]/80 backdrop-blur-2xl flex flex-wrap items-center justify-between gap-4 sticky top-0 z-20 shadow-md">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-black text-white tracking-tight">System Rates &amp; Tariffs Maintenance</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>Live FX &bull; Statutory VAT &bull; Tariffs</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Global currency exchange rates, Philippine BIR VAT calculation settings, and master billing charge codes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRefreshFromApi}
            disabled={isFetching}
            className="px-4 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-slate-200 font-bold text-xs flex items-center gap-2 transition-all disabled:opacity-50 shadow-sm backdrop-blur-md active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-cyan-400' : 'text-slate-300'}`} />
            <span>{isFetching ? 'Pulling Live API...' : 'Fetch Live FX Rates'}</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 border border-blue-400/40 flex items-center gap-2 transition-all active:scale-95"
          >
            {saveSuccess ? <Check className="w-4 h-4 text-emerald-300" /> : null}
            <span>{saveSuccess ? 'Changes Saved!' : 'Save All Settings'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Workspace */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {/* Currency Rates Section */}
        <section className="liquid-glass-card rounded-2xl border border-white/10 p-5 shadow-2xl backdrop-blur-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-wrap justify-between items-center pb-4 border-b border-white/10 gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-400 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-sm text-white tracking-wide">Multi-Currency Exchange Rates (vs PHP)</h2>
                <p className="text-[11px] text-slate-400">
                  Last updated:{' '}
                  <strong className="text-slate-200">{new Date(fxLastUpdated).toLocaleString()}</strong> &bull; Sourced from Open FX Treasury API
                </p>
              </div>
            </div>
            <span className="text-xs font-mono text-emerald-400 font-bold px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Base: PHP (Philippine Peso)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mt-5">
            {(
              [
                { code: 'USD', name: 'US Dollar', symbol: '$' },
                { code: 'EUR', name: 'Euro', symbol: '€' },
                { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
                { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
                { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
                { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
              ] as const
            ).map((curr) => (
              <div
                key={curr.code}
                className="p-3.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/[0.08] hover:border-blue-400/30 transition-all group backdrop-blur-md shadow-sm"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-mono font-black text-xs text-cyan-400 group-hover:text-cyan-300 transition-colors">
                    {curr.code}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
                    {curr.symbol}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 truncate mb-2">{curr.name}</div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-400">₱</span>
                  <input
                    type="number"
                    step="0.001"
                    value={localRates[curr.code] || 0}
                    onChange={(e) =>
                      setLocalRates({
                        ...localRates,
                        [curr.code]: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-2 py-1 rounded-lg border border-white/15 bg-black/40 font-mono font-bold text-xs text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Taxes & Regulatory Constants */}
        <section className="liquid-glass-card rounded-2xl border border-white/10 p-5 shadow-2xl backdrop-blur-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center gap-3 pb-4 border-b border-white/10">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/30 text-purple-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-white tracking-wide">Statutory Philippine Tax Rates (BIR)</h2>
              <p className="text-[11px] text-slate-400">
                Applicable to freight revenue, ancillary terminal charges, and customs brokerage documentation.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
            <div className="p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md hover:border-purple-400/30 transition-all">
              <label className="text-xs font-bold text-slate-200 block mb-1">
                Standard Value Added Tax (VAT)
              </label>
              <p className="text-[10px] text-slate-400 mb-3">Republic Act No. 9337 / TRAIN Law standard 12% rate.</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={localVat}
                  onChange={(e) => setLocalVat(parseFloat(e.target.value) || 0)}
                  className="w-24 px-3 py-1.5 rounded-lg border border-white/15 bg-black/40 font-mono font-bold text-sm text-white focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
                />
                <span className="text-xs font-bold text-slate-400">% (Percent)</span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md hover:border-purple-400/30 transition-all">
              <label className="text-xs font-bold text-slate-200 block mb-1">
                Withholding Tax on Subcontracted Trucking
              </label>
              <p className="text-[10px] text-slate-400 mb-3">Creditable Withholding Tax (EWT) on transport services.</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  defaultValue={2}
                  disabled
                  className="w-24 px-3 py-1.5 rounded-lg border border-white/10 bg-black/60 font-mono font-bold text-sm text-slate-400 cursor-not-allowed"
                />
                <span className="text-xs font-bold text-slate-400">% (BIR 2307 ATC: WC 150)</span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md hover:border-purple-400/30 transition-all">
              <label className="text-xs font-bold text-slate-200 block mb-1">
                Zero-Rated Export Freight Factor
              </label>
              <p className="text-[10px] text-slate-400 mb-3">International outbound carriage (Section 108 B-4 National Internal Revenue Code).</p>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-xs font-mono">
                  0% Zero-Rated
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Master Chart of Billing Codes & Tariffs */}
        <section className="liquid-glass-card rounded-2xl border border-white/10 p-5 shadow-2xl backdrop-blur-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex justify-between items-center pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-400 flex items-center justify-center">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-sm text-white tracking-wide">Master Billing Codes &amp; General Ledger Mapping</h2>
                <p className="text-[11px] text-slate-400">
                  Standard tariff rates and corresponding Chart of Accounts GL account codes used in Accounting Bridge &amp; CDV generation.
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto mt-4 rounded-xl border border-white/10 bg-black/20">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[11px] uppercase font-bold text-slate-400 bg-white/5">
                  <th className="py-3 px-3">Code</th>
                  <th className="py-3 px-3">Charge Description</th>
                  <th className="py-3 px-3">Chart of Accounts GL Code</th>
                  <th className="py-3 px-3 text-right">Default Standard Rate (PHP)</th>
                  <th className="py-3 px-3 text-center">VAT Taxable</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {billingCodes.map((item) => (
                  <tr key={item.code} className="hover:bg-white/[0.04] transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-cyan-400">{item.code}</td>
                    <td className="py-3 px-3 font-medium text-slate-200">{item.description}</td>
                    <td className="py-3 px-3">
                      {editingCode === item.code ? (
                        <input
                          type="text"
                          value={item.glAccount}
                          onChange={(e) =>
                            setBillingCodes(
                              billingCodes.map((b) => (b.code === item.code ? { ...b, glAccount: e.target.value } : b))
                            )
                          }
                          className="px-2 py-0.5 rounded border border-cyan-400 font-mono text-xs w-24 bg-black/50 text-white"
                        />
                      ) : (
                        <span className="font-mono text-slate-300 bg-white/5 border border-white/10 px-2 py-0.5 rounded">
                          {item.glAccount}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-white">
                      {editingCode === item.code ? (
                        <input
                          type="number"
                          value={item.defaultRate}
                          onChange={(e) =>
                            setBillingCodes(
                              billingCodes.map((b) =>
                                b.code === item.code ? { ...b, defaultRate: parseFloat(e.target.value) || 0 } : b
                              )
                            )
                          }
                          className="px-2 py-0.5 rounded border border-cyan-400 font-mono text-xs w-28 text-right bg-black/50 text-white"
                        />
                      ) : (
                        `₱ ${item.defaultRate.toLocaleString()}`
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          item.taxable
                            ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                            : 'bg-white/5 border border-white/10 text-slate-400'
                        }`}
                      >
                        {item.taxable ? '12% VAT' : 'Exempt'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => setEditingCode(editingCode === item.code ? null : item.code)}
                        className="px-2.5 py-1 rounded-lg border border-white/15 text-slate-300 hover:text-white hover:bg-white/10 font-bold text-[11px] transition-all"
                      >
                        {editingCode === item.code ? 'Done' : 'Edit'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
