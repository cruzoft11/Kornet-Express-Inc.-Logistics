import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MouseEvent as ReactMouseEvent } from 'react'

export type ThemePreference = 'system' | 'light' | 'dark'
export type DensityPreference = 'comfortable' | 'compact'

interface SettingsState {
  theme: ThemePreference
  density: DensityPreference
  darkMode: boolean
  profilePhoto: string | null
  displayName: string
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD'
  numberFormat: 'en-US' | 'en-PH'
  showStatusBar: boolean
  compactSidebar: boolean
  setTheme: (theme: ThemePreference) => void
  toggleTheme: (event?: MouseEvent | ReactMouseEvent<HTMLElement>) => void
  toggleDarkMode: () => void
  setDarkMode: (v: boolean) => void
  setDensity: (density: DensityPreference) => void
  setProfilePhoto: (photo: string | null) => void
  setDisplayName: (name: string) => void
  setDateFormat: (fmt: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD') => void
  setNumberFormat: (fmt: 'en-US' | 'en-PH') => void
  setShowStatusBar: (v: boolean) => void
  setCompactSidebar: (v: boolean) => void
  syncStorageForUser: (username: string) => Promise<void>
}

function getPerUserStorageKey(): string {
  try {
    const raw = localStorage.getItem('auth-storage') || localStorage.getItem('kornet-auth-storage')
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: { user?: { username?: string } } }
      const username = parsed?.state?.user?.username
      if (username) return `settings-storage-${username}`
    }
  } catch { /* ignore */ }
  return 'settings-storage'
}

function systemDark() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyTheme(theme: ThemePreference, density: DensityPreference) {
  if (typeof document === 'undefined') return
  const dark = theme === 'dark' || (theme === 'system' && systemDark())
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  document.documentElement.dataset.density = density
}

function animateThemeChange(run: () => void, event?: MouseEvent | ReactMouseEvent<HTMLElement>) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } }
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!doc.startViewTransition || prefersReduced) {
    run()
    return
  }
  const x = event && 'clientX' in event ? event.clientX : window.innerWidth - 48
  const y = event && 'clientY' in event ? event.clientY : 32
  const endRadius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
  const transition = doc.startViewTransition(run)
  void transition.ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`] },
      { duration: 180, easing: 'cubic-bezier(.22,1,.36,1)', pseudoElement: '::view-transition-new(root)' },
    )
  })
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      density: 'comfortable',
      darkMode: systemDark(),
      profilePhoto: null,
      displayName: '',
      dateFormat: 'DD/MM/YYYY',
      numberFormat: 'en-PH',
      showStatusBar: true,
      compactSidebar: false,
      setTheme: (theme) => set((s) => { applyTheme(theme, s.density); return { theme, darkMode: theme === 'dark' || (theme === 'system' && systemDark()) } }),
      toggleTheme: (event) => animateThemeChange(() => {
        const next = get().darkMode ? 'light' : 'dark'
        get().setTheme(next)
      }, event),
      toggleDarkMode: () => get().toggleTheme(),
      setDarkMode: (v) => get().setTheme(v ? 'dark' : 'light'),
      setDensity: (density) => set((s) => { applyTheme(s.theme, density); return { density } }),
      setProfilePhoto: (photo) => set({ profilePhoto: photo }),
      setDisplayName: (name) => set({ displayName: name }),
      setDateFormat: (fmt) => set({ dateFormat: fmt }),
      setNumberFormat: (fmt) => set({ numberFormat: fmt }),
      setShowStatusBar: (v) => set({ showStatusBar: v }),
      setCompactSidebar: (v) => set({ compactSidebar: v }),
      syncStorageForUser: async (username: string) => {
        useSettingsStore.persist.setOptions({ name: `settings-storage-${username}` })
        await useSettingsStore.persist.rehydrate()
      },
    }),
    {
      name: getPerUserStorageKey(),
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme, state.density)
      },
    },
  ),
)

if (typeof window !== 'undefined') {
  applyTheme(useSettingsStore.getState().theme, useSettingsStore.getState().density)
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const state = useSettingsStore.getState()
    if (state.theme === 'system') state.setTheme('system')
  })
}
