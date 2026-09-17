import { useNavigate } from 'react-router-dom'
import { useSettingsStore } from '../stores/settingsStore'

export interface BreadcrumbSegment {
  label: string
  path?: string        // clickable if provided
  icon?: string        // material symbol name
}

interface BreadcrumbsProps {
  segments: BreadcrumbSegment[]
  className?: string
}

export default function Breadcrumbs({ segments, className = '' }: BreadcrumbsProps) {
  const navigate = useNavigate()
  const darkMode = useSettingsStore(s => s.darkMode)

  const allSegments: BreadcrumbSegment[] = [
    { label: 'Home', path: '/system-options', icon: 'home' },
    ...segments
  ]

  return (
    <nav className={`flex items-center gap-1.5 text-[12px] font-medium select-none ${className}`} aria-label="Breadcrumb">
      {allSegments.map((seg, i) => {
        const isLast = i === allSegments.length - 1
        const isClickable = !!seg.path && !isLast

        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && (
              <span className={`text-[10px] ${darkMode ? 'text-gray-600' : 'text-slate-300'}`}>›</span>
            )}
            {isClickable ? (
              <button
                onClick={() => navigate(seg.path!)}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-all hover:scale-[1.02] ${
                  darkMode
                    ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-500/10'
                    : 'text-slate-500 hover:text-primary hover:bg-primary/5'
                }`}
              >
                {seg.icon && (
                  <span className="material-symbols-outlined text-[14px]">{seg.icon}</span>
                )}
                {seg.label}
              </button>
            ) : (
              <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded font-semibold ${
                darkMode ? 'text-gray-200' : 'text-slate-800'
              }`}>
                {seg.icon && !isLast && (
                  <span className="material-symbols-outlined text-[14px]">{seg.icon}</span>
                )}
                {seg.label}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
