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
  connected: { label: 'Connected', dot: 'bg-emerald-400 shadow-sm shadow-emerald-500/50', text: 'text-emerald-400' },
  disconnected: { label: 'Disconnected', dot: 'bg-slate-500', text: 'text-slate-400' },
  error: { label: 'Error', dot: 'bg-red-400 shadow-sm shadow-red-500/50', text: 'text-red-400' },
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
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={closeSettings}
    >
      <div
        className="w-full max-w-lg liquid-glass-card border border-white/15 text-white rounded-3xl shadow-2xl overflow-hidden backdrop-blur-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-400">
              <span className="material-symbols-outlined text-[20px]">hub</span>
            </div>
            <div>
              <h2 className="font-bold text-white text-sm tracking-wide">Integrations &amp; Hardware</h2>
              <p className="text-[11px] text-slate-400">
                Connect devices and services before using dependent features.
              </p>
            </div>
          </div>
          <button
            onClick={closeSettings}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto divide-y divide-white/5 custom-scrollbar p-2">
          {loading && items.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-slate-400 font-mono">Loading integrations…</div>
          )}
          {items.map((it) => {
            const meta = STATUS_META[it.status]
            const isOn = it.status === 'connected'
            return (
              <div key={it.key} className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl hover:bg-white/[0.04] transition-all">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-300">
                    <span className="material-symbols-outlined text-[18px]">
                      {CATEGORY_ICON[it.category] ?? CATEGORY_ICON.other}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-white text-sm truncate">{it.name}</p>
                    <p className={`flex items-center gap-1.5 text-[11px] font-medium ${meta.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                      {meta.label}
                      <span className="text-slate-400 font-normal">· {it.category}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => void toggle(it.key, it.status)}
                  className={`relative w-12 h-6 rounded-full transition-all flex-shrink-0 border ${
                    isOn ? 'bg-emerald-500/80 border-emerald-400/50 shadow-lg shadow-emerald-500/20' : 'bg-white/10 border-white/15'
                  }`}
                  title={isOn ? 'Disconnect' : 'Connect'}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${
                      isOn ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            )
          })}
        </div>

        <div className="px-6 py-4 border-t border-white/10 bg-white/5 flex justify-end">
          <button
            onClick={closeSettings}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 border border-blue-400/40 transition-all active:scale-98"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
