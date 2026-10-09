import { useSettingsStore } from '../../stores/settingsStore'

export default function FSCompanyProperties() {
  const darkMode = useSettingsStore((state) => state.darkMode)

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-end pb-4 border-b border-inherit">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Administration</span>
          <h2 className="font-headline text-3xl font-bold tracking-tight mb-1">Kornet Company Properties</h2>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-slate-500'}`}>
            Company identity and accounting configuration for Kornet Express.
          </p>
        </div>
      </div>
      <div className={`rounded-xl border p-5 ${darkMode ? 'border-gray-700 bg-gray-900/50' : 'border-slate-200 bg-white'}`}>
        <p className="font-semibold">Kornet Express Freight & Logistics</p>
        <p className="mt-1 text-sm text-muted-foreground">Company code: KORNET</p>
        <p className="mt-3 text-sm text-muted-foreground">Update tax, registration, and document identity details in Admin â†’ Settings.</p>
      </div>
    </div>
  )
}
