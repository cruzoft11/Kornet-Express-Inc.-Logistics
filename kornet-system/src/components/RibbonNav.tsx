import { useState } from 'react'
import { useSettingsStore } from '../stores/settingsStore'

interface RibbonItem {
  label: string
  onClick: () => void
  disabled?: boolean
}

interface RibbonGroup {
  title: string
  items: RibbonItem[]
}

interface RibbonTab {
  id: string
  label: string
}

interface RibbonNavProps {
  tabs: RibbonTab[]
  groups: Record<string, RibbonGroup[]>
  activeTab: string
  onTabChange: (tabId: string) => void
}

export default function RibbonNav({ tabs, groups, activeTab, onTabChange }: RibbonNavProps) {
  const [selectedItemKey, setSelectedItemKey] = useState<string>('')
  const [bodyOpen, setBodyOpen] = useState(false)
  const darkMode = useSettingsStore((s) => s.darkMode)

  const handleItemClick = (item: RibbonItem, tabId: string, groupTitle: string) => {
    if (item.disabled) return
    setSelectedItemKey(`${tabId}:${groupTitle}:${item.label}`)
    setBodyOpen(false)
    item.onClick()
  }

  return (
    <div 
      className={`relative z-40 backdrop-blur-xl border-b shadow-sm ${darkMode ? 'bg-[#0f172a] border-gray-700' : 'bg-white/60 border-outline-variant/20'}`}
      onMouseLeave={() => setBodyOpen(false)}
    >
      {/* ── Tab strip ── */}
      <div 
        className="flex items-end px-6 pt-3 gap-2"
        onMouseEnter={() => setBodyOpen(true)}
      >
        {tabs.map(tab => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              className={`relative px-5 py-2.5 text-sm font-headline tracking-wide font-semibold rounded-t-lg transition-colors
                ${isActive 
                  ? `${darkMode ? 'text-blue-400 bg-[#1e293b] border-t border-x border-gray-600' : 'text-primary bg-white border-t border-x border-outline-variant/20'} pb-3` 
                  : `${darkMode ? 'text-gray-300 hover:text-white hover:bg-white/5' : 'text-on-surface-variant hover:text-on-surface hover:bg-black/5'}`}
              `}
              onMouseEnter={() => { setBodyOpen(true); onTabChange(tab.id) }}
              onClick={() => { onTabChange(tab.id); setBodyOpen(true) }}
            >
              {tab.label}
              {isActive && <div className={`absolute -bottom-px left-0 right-0 h-0.5 z-10 ${darkMode ? 'bg-[#1e293b]' : 'bg-white'}`} />}
            </button>
          )
        })}
      </div>

      {/* ── Mega-Menu Content panels ── */}
      <div 
        className={`absolute left-0 right-0 border-b shadow-lg overflow-hidden transition-all duration-300 origin-top
          ${darkMode ? 'bg-[#1e293b] border-gray-700' : 'bg-white border-outline-variant/20'}
          ${bodyOpen ? 'opacity-100 max-h-[400px] border-t-0' : 'opacity-0 max-h-0 pointer-events-none'}
        `}
      >
        <div className="px-6 py-5">
          {tabs.map(tab => (
            <div
              key={tab.id}
              className={`flex gap-8 transition-opacity duration-200 ${activeTab === tab.id ? 'opacity-100 block' : 'opacity-0 hidden'}`}
            >
              {(groups[tab.id] ?? []).map((group, idx) => (
                <div key={idx} className={`flex flex-col relative pr-8 after:content-[''] after:absolute after:right-0 after:top-2 after:bottom-2 after:w-px last:after:hidden last:pr-0 ${darkMode ? 'after:bg-gray-600' : 'after:bg-outline-variant/20'}`}>
                  <div className="flex flex-wrap gap-2 mb-4 max-w-[280px]">
                    {group.items.map((item, itemIdx) => {
                      const isSelected = selectedItemKey === `${tab.id}:${group.title}:${item.label}`
                      return (
                        <button
                          key={itemIdx}
                          className={`group flex items-center justify-center px-4 py-2 text-[13px] font-medium rounded-md transition-all border
                            ${isSelected 
                              ? 'bg-primary border-primary text-white shadow-md' 
                              : item.disabled 
                                ? `${darkMode ? 'bg-gray-800 border-gray-700 text-gray-600' : 'bg-surface-container-lowest border-outline-variant/10 text-outline-variant/50'} cursor-not-allowed opacity-60` 
                                : `${darkMode ? 'bg-[#253348] border-gray-600 text-gray-200 hover:border-blue-400/40 hover:bg-blue-500/10 hover:text-blue-300' : 'bg-surface-container-lowest border-outline-variant/20 text-on-surface hover:border-primary/40 hover:bg-primary/5 hover:text-primary'}`}
                          `}
                          onClick={() => handleItemClick(item, tab.id, group.title)}
                          disabled={item.disabled}
                          title={item.label}
                        >
                          {item.label}
                        </button>
                      )
                    })}
                  </div>
                  {/* Label at bottom */}
                  <div className={`mt-auto pt-2 text-[10px] font-bold tracking-widest uppercase text-center ${darkMode ? 'text-gray-400' : 'text-on-surface-variant/50'}`}>
                    {group.title}
                  </div>
                </div>
              ))}
              
              {!(groups[tab.id] ?? []).length && (
                <div className={`text-sm italic py-6 ${darkMode ? 'text-gray-400' : 'text-on-surface-variant'}`}>
                  No actions available for this tab.
                </div>
              )}
            </div>
          ))}
        </div>
        {/* Ribbon Footer Glow */}
        <div className={`h-1 w-full bg-gradient-to-r from-transparent to-transparent ${darkMode ? 'via-blue-500/20' : 'via-primary/10'}`}></div>
      </div>
    </div>
  )
}
