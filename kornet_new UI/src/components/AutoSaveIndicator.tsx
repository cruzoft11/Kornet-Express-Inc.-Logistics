import { useSavingStore } from '../stores/savingStore'
import { useSettingsStore } from '../stores/settingsStore'

export default function AutoSaveIndicator() {
  const status = useSavingStore(s => s.status)
  const darkMode = useSettingsStore(s => s.darkMode)

  const renderStatus = () => {
    switch (status) {
      case 'typing':
        return (
          <div className="flex items-center gap-1.5 text-amber-500 font-medium animate-pulse">
            <span className="material-symbols-outlined text-[16px] animate-[bounce_1.2s_infinite]">cloud_upload</span>
            <span className="text-[11px] tracking-wide">Typing...</span>
          </div>
        )
      case 'saving':
        return (
          <div className="flex items-center gap-1.5 text-blue-500 font-medium">
            <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
            <span className="text-[11px] tracking-wide">Saving changes...</span>
          </div>
        )
      case 'saved':
        return (
          <div className="flex items-center gap-1.5 text-emerald-500 font-semibold animate-[fadeIn_0.3s_ease-out]">
            <span className="material-symbols-outlined text-[16px] font-bold">cloud_done</span>
            <span className="text-[11px] tracking-wide">All changes saved to cloud</span>
          </div>
        )
      case 'idle':
      default:
        return (
          <div className={`flex items-center gap-1.5 opacity-60 ${darkMode ? 'text-gray-400' : 'text-slate-500'}`}>
            <span className="material-symbols-outlined text-[16px]">cloud</span>
            <span className="text-[11px] tracking-wide">Document synced</span>
          </div>
        )
    }
  }

  return (
    <div className={`flex items-center justify-start w-[210px] h-7 px-3.5 rounded-full border transition-all duration-300 ${
      status === 'typing' 
        ? `${darkMode ? 'bg-amber-950/20 border-amber-800/40' : 'bg-amber-50 border-amber-200'}`
        : status === 'saving'
          ? `${darkMode ? 'bg-blue-950/20 border-blue-800/40' : 'bg-blue-50 border-blue-200'}`
          : status === 'saved'
            ? `${darkMode ? 'bg-emerald-950/20 border-emerald-800/40' : 'bg-emerald-50 border-emerald-200'}`
            : `${darkMode ? 'bg-gray-800/20 border-gray-700/40' : 'bg-slate-50 border-slate-200/50'}`
    }`}>
      {renderStatus()}
    </div>
  )
}
