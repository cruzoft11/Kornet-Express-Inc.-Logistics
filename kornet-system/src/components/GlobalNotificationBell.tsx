import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useSettingsStore } from '../stores/settingsStore'
import AnnouncementModal from './AnnouncementModal'

interface ServerAnnouncement {
  id: number
  authorUsername: string
  title: string
  body: string
  imageData: string | null
  priority: string
  createdAtUtc: string
  reactionCount: number
  reactedByMe: boolean
  reactedBy: string[]
}

export default function GlobalNotificationBell() {
  const { user, accessToken } = useAuthStore()
  const darkMode = useSettingsStore(s => s.darkMode)

  const [showNotifPanel, setShowNotifPanel] = useState(false)
  const [announcements, setAnnouncements] = useState<ServerAnnouncement[]>([])
  const [readIds, setReadIds] = useState<Set<number>>(() => {
    try { 
      const key = `read-announcements-${user?.username || 'anonymous'}`
      return new Set(JSON.parse(localStorage.getItem(key) || '[]')) 
    } catch { return new Set() }
  })
  const [openAnnouncementId, setOpenAnnouncementId] = useState<number | null>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  const fetchAnnouncements = useCallback(async () => {
    if (!accessToken) return
    try {
      const res = await fetch('/api/command-center/my-announcements', {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      if (res.ok) {
        const json = await res.json()
        setAnnouncements(json.data || [])
      }
    } catch {}
  }, [accessToken])

  useEffect(() => {
    fetchAnnouncements()
    const interval = setInterval(fetchAnnouncements, 30000)
    return () => clearInterval(interval)
  }, [fetchAnnouncements])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifPanel(false)
      }
    }
    if (showNotifPanel) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showNotifPanel])

  const markAsRead = (id: number) => {
    setReadIds(prev => {
      const next = new Set(prev)
      next.add(id)
      const key = `read-announcements-${user?.username || 'anonymous'}`
      localStorage.setItem(key, JSON.stringify([...next]))
      return next
    })
  }

  const markAllAsRead = () => {
    const allIds = announcements.map(a => a.id)
    setReadIds(new Set(allIds))
    const key = `read-announcements-${user?.username || 'anonymous'}`
    localStorage.setItem(key, JSON.stringify(allIds))
  }

  const unreadCount = announcements.filter(a => !readIds.has(a.id)).length

  const formatTimeAgo = (iso: string) => {
    const s = iso.endsWith('Z') ? iso : `${iso}Z`
    const diff = Date.now() - new Date(s).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <div className="relative" ref={notifRef}>
      <style>{`
        @keyframes bell-ring {
          0% { transform: rotate(0deg); }
          10% { transform: rotate(14deg); }
          20% { transform: rotate(-12deg); }
          30% { transform: rotate(10deg); }
          40% { transform: rotate(-8deg); }
          50% { transform: rotate(6deg); }
          60% { transform: rotate(-4deg); }
          70% { transform: rotate(2deg); }
          80% { transform: rotate(-1deg); }
          90% { transform: rotate(0deg); }
          100% { transform: rotate(0deg); }
        }
        .bell-animate {
          animation: bell-ring 1.2s ease-in-out infinite;
          animation-delay: 2s;
        }
      `}</style>
      <button 
        onClick={() => setShowNotifPanel(!showNotifPanel)}
        className={`relative transition-colors ${darkMode ? 'text-gray-300 hover:text-primary' : 'text-on-surface-variant hover:text-primary'}`}
      >
        <span className={`material-symbols-outlined text-[22px] ${unreadCount > 0 ? 'bell-animate' : ''}`}>notifications</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-error rounded-full border-2 border-surface flex items-center justify-center text-[9px] font-bold text-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showNotifPanel && (
        <div className={`absolute right-0 top-[calc(100%+8px)] w-[400px] rounded-xl shadow-2xl border z-50 overflow-hidden ${darkMode ? 'bg-[#1e2a4a] border-gray-600' : 'bg-white border-outline-variant/20'}`}>
          <div className={`px-4 py-3 border-b flex items-center justify-between ${darkMode ? 'border-gray-600' : 'border-outline-variant/10'}`}>
            <h4 className={`font-headline font-bold text-sm ${darkMode ? 'text-gray-100' : 'text-on-surface'}`}>Notifications</h4>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="text-[11px] text-primary font-semibold hover:underline">Mark all read</button>
              )}
            </div>
          </div>
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            {announcements.length === 0 ? (
              <div className={`px-4 py-8 text-center text-sm ${darkMode ? 'text-gray-500' : 'text-on-surface-variant/50'}`}>
                <span className="material-symbols-outlined text-[32px] mb-2 block opacity-40">notifications_off</span>
                No notifications yet
              </div>
            ) : (
              announcements.map((a) => {
                const isRead = readIds.has(a.id)
                return (
                  <div 
                    key={a.id} 
                    className={`px-4 py-3 border-b last:border-0 flex gap-3 group transition-colors cursor-pointer
                      ${isRead 
                        ? (darkMode ? 'border-gray-700 opacity-60' : 'border-outline-variant/5 opacity-60') 
                        : (darkMode ? 'border-gray-700 bg-blue-900/20' : 'border-outline-variant/5 bg-primary/[0.03]')}`}
                    onClick={() => { markAsRead(a.id); setOpenAnnouncementId(a.id); setShowNotifPanel(false) }}
                  >
                    <span className={`material-symbols-outlined text-[20px] mt-0.5 shrink-0 ${a.priority === 'urgent' ? 'text-red-500' : 'text-primary'}`}>
                      {a.priority === 'urgent' ? 'priority_high' : 'campaign'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-[13px] font-semibold leading-tight ${darkMode ? 'text-gray-100' : 'text-on-surface'}`}>{a.title}</p>
                        <span className={`text-[10px] shrink-0 ${darkMode ? 'text-gray-500' : 'text-on-surface-variant/50'}`}>{formatTimeAgo(a.createdAtUtc)}</span>
                      </div>
                      <p className={`text-xs mt-0.5 leading-relaxed line-clamp-2 ${darkMode ? 'text-gray-400' : 'text-on-surface-variant/70'}`}>{a.body}</p>
                      <div className={`flex items-center gap-3 mt-1.5 text-[10px] ${darkMode ? 'text-gray-500' : 'text-on-surface-variant/40'}`}>
                        <span>By {a.authorUsername}</span>
                        {a.reactionCount > 0 && (
                          <span className="flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-red-400 text-[11px]" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                            {a.reactionCount}
                          </span>
                        )}
                      </div>
                    </div>
                    {!isRead && <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {openAnnouncementId !== null && openAnnouncementId > 0 && (
        <AnnouncementModal
          announcementId={openAnnouncementId}
          onClose={() => { setOpenAnnouncementId(null); fetchAnnouncements() }}
        />
      )}
    </div>
  )
}
