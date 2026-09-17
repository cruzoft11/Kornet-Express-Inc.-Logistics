import { useState, useEffect } from 'react'
import { useSettingsStore } from '../stores/settingsStore'
import { useAuthStore } from '../stores/authStore'

interface AnnouncementDetail {
  id: number
  authorUsername: string
  title: string
  body: string
  imageData: string | null
  priority: string
  createdAtUtc: string
  reactionCount: number
  reactedByMe: boolean
  reactedBy: { username: string; reactionType: string; createdAtUtc: string }[]
}

interface Props {
  announcementId: number
  onClose: () => void
}

export default function AnnouncementModal({ announcementId, onClose }: Props) {
  const darkMode = useSettingsStore(s => s.darkMode)
  const { accessToken } = useAuthStore()
  const [detail, setDetail] = useState<AnnouncementDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [likeAnimating, setLikeAnimating] = useState(false)

  const headers = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
  })

  useEffect(() => {
    fetchDetail()
  }, [announcementId])

  const fetchDetail = async () => {
    try {
      const res = await fetch(`/api/command-center/announcements/${announcementId}`, { headers: headers() })
      if (res.ok) {
        const json = await res.json()
        setDetail(json.data)
      }
    } catch {} finally { setLoading(false) }
  }

  const handleReact = async () => {
    if (!detail) return
    setLikeAnimating(true)
    try {
      await fetch(`/api/command-center/announcements/${announcementId}/react`, {
        method: 'POST',
        headers: headers(),
      })
      await fetchDetail()
    } catch {} finally {
      setTimeout(() => setLikeAnimating(false), 600)
    }
  }

  const fmt = (utc: string) => {
    const s = utc.endsWith('Z') ? utc : `${utc}Z`
    return new Intl.DateTimeFormat('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
    }).format(new Date(s))
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-md" onClick={onClose}>
      <div
        className={`rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto custom-scrollbar ${darkMode ? 'bg-[#1e293b] border border-gray-700' : 'bg-white'}`}
        onClick={e => e.stopPropagation()}
      >
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : detail ? (
          <>
            {/* Header */}
            <div className={`sticky top-0 z-10 px-6 py-4 border-b flex items-center justify-between ${darkMode ? 'bg-[#1e293b] border-gray-700' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center gap-3">
                {detail.priority === 'urgent' && (
                  <span className="text-red-500 text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-red-500/15">URGENT</span>
                )}
                <span className={`material-symbols-outlined text-primary text-[24px]`}>campaign</span>
                <span className={`text-[10px] uppercase tracking-widest font-bold ${darkMode ? 'text-gray-500' : 'text-slate-400'}`}>Announcement</span>
              </div>
              <button onClick={onClose} className={`p-2 rounded-xl transition-colors ${darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-slate-100 text-slate-400'}`}>
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              <div>
                <h2 className={`font-headline text-xl font-bold leading-tight ${darkMode ? 'text-gray-100' : 'text-slate-900'}`}>{detail.title}</h2>
                <div className={`flex items-center gap-3 mt-2 text-xs ${darkMode ? 'text-gray-500' : 'text-slate-400'}`}>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">person</span>
                    {detail.authorUsername}
                  </span>
                  <span>·</span>
                  <span>{fmt(detail.createdAtUtc)}</span>
                </div>
              </div>

              {/* Image */}
              {detail.imageData && (
                <div className="rounded-xl overflow-hidden border border-outline-variant/20 shadow-lg">
                  <img src={detail.imageData} alt="Announcement" className="w-full object-contain max-h-[400px]" />
                </div>
              )}

              {/* Text body */}
              <div className={`text-sm leading-relaxed whitespace-pre-wrap ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                {detail.body}
              </div>

              {/* Reaction section */}
              <div className={`border-t pt-5 ${darkMode ? 'border-gray-700' : 'border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <button
                    onClick={handleReact}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
                      detail.reactedByMe
                        ? 'bg-red-500/15 text-red-500 hover:bg-red-500/25'
                        : (darkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-red-400' : 'bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500')
                    } ${likeAnimating ? 'scale-110' : ''}`}
                  >
                    <span className={`material-symbols-outlined text-[20px] transition-transform ${likeAnimating ? 'animate-bounce' : ''}`}
                      style={{ fontVariationSettings: detail.reactedByMe ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      favorite
                    </span>
                    {detail.reactedByMe ? 'Liked' : 'Like'}
                  </button>
                  <span className={`text-sm font-bold ${darkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                    {detail.reactionCount} {detail.reactionCount === 1 ? 'like' : 'likes'}
                  </span>
                </div>

                {/* Who liked */}
                {detail.reactedBy.length > 0 && (
                  <div className={`mt-3 flex flex-wrap gap-2`}>
                    {detail.reactedBy.map(r => (
                      <span key={r.username}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-slate-100 text-slate-600'}`}
                      >
                        <span className="material-symbols-outlined text-red-400 text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                        {r.username}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="p-6 text-center">
            <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-slate-400'}`}>Announcement not found.</p>
          </div>
        )}
      </div>
    </div>
  )
}
