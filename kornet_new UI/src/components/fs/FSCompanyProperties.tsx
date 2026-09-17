import { useCompanyStore } from '../../stores/companyStore'
import { useSettingsStore } from '../../stores/settingsStore'
import CompanyTelemetry from '../CompanyTelemetry'

export default function FSCompanyProperties() {
  const selectedCompanyCode = useCompanyStore((state) => state.selectedCompanyCode)
  const darkMode = useSettingsStore((state) => state.darkMode)

  if (!selectedCompanyCode) {
    return (
      <div className={`p-8 text-center ${darkMode ? 'text-gray-400' : 'text-slate-600'}`}>
        <span className="material-symbols-outlined text-[48px] text-gray-500 mb-2">domain_disabled</span>
        <p className="text-sm font-semibold">No company selected.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-end pb-4 border-b border-inherit">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Administration</span>
          <h2 className="font-headline text-3xl font-bold tracking-tight mb-1">Company Properties & Stats</h2>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-slate-500'}`}>
            Database telemetry breakdown and analytics for company code: <span className="font-mono font-bold uppercase">{selectedCompanyCode}</span>
          </p>
        </div>
      </div>

      <CompanyTelemetry companyCode={selectedCompanyCode} />
    </div>
  )
}
