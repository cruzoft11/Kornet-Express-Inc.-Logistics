import { useEffect } from 'react'
import { useIntegrationsStore, IntegrationStatus } from '../../stores/integrationsStore'

const CATEGORY_ICON: Record<string, string> = {
  hardware: 'cable',
  printing: 'print',
  government: 'account_balance',
  carrier: 'local_shipping',
  other: 'extension',
}

const STATUS_META: Record<IntegrationStatus, { label: string; dot: string; text: string }> = {
  connected: { label: 'Connected', dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
  disconnected: { label: 'Disconnected', dot: 'bg-slate-400', text: 'text-slate-500 dark:text-slate-400' },
  error: { label: 'Error', dot: 'bg-red-500', text: 'text-red-600 dark:text-red-400' },
}

export default function IntegrationsSettings() {
  const settingsOpen = useIntegrationsStore((s) => s.settingsOpen)
  const closeSettings = useIntegrationsStore((s) => s.closeSettings)
  const items = useIntegrationsStore((s) => s.items)
  const loading = useIntegrationsStore((s) => s.loading)
  const fetchIntegrations = useIntegrationsStore((s) => s.fetchIntegrations)
  const setStatus = useIntegrationsStore((s) => s.setStatus)

  useEffect(() => {
    if (settingsOpen) void fetchIntegrations()
  }, [settingsOpen, fetchIntegrations])

  if (!settingsOpen) return null

  const toggle = async (key: string, current: IntegrationStatus) => {
    const next: IntegrationStatus = current === 'connected' ? 'disconnected' : 'connected'
    try {
      await setStatus(key, next)
    } catch {
      alert('Could not update this integration. Please try again.')
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={closeSettings}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-500">hub</span>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-sm">Integrations &amp; Hardware</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Connect devices and services before using dependent features.
              </p>
            </div>
          </div>
          <button
            onClick={closeSettings}
            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {loading && items.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-slate-500">Loading integrations…</div>
          )}
          {items.map((it) => {
            const meta = STATUS_META[it.status]
            const isOn = it.status === 'connected'
            return (
              <div key={it.key} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="material-symbols-outlined text-slate-400 text-[20px]">
                    {CATEGORY_ICON[it.category] ?? CATEGORY_ICON.other}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate">{it.name}</p>
                    <p className={`flex items-center gap-1.5 text-[11px] font-medium ${meta.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                      {meta.label}
                      <span className="text-slate-400 dark:text-slate-500 font-normal">· {it.category}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => void toggle(it.key, it.status)}
                  className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                    isOn ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                  title={isOn ? 'Disconnect' : 'Connect'}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      isOn ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            )
          })}
        </div>

        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
          <button
            onClick={closeSettings}
            className="w-full py-2 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
