import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Role = 'superadmin' | 'manager' | 'operator' | 'accountant' | 'viewer'

export interface User {
  id: string
  username: string
  fullName: string
  email: string | null
  role: Role
  active: boolean
  canAccessFs: boolean
  canAccessPayroll: boolean
}

interface ApiUser {
  id: string
  username: string
  fullName: string
  email: string | null
  role: Role
  active: boolean
  canAccessFs: boolean
}

interface LoginPayload {
  user: ApiUser
  accessToken: string
  refreshToken: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  accessToken: string | null
  refreshToken: string | null
  isSessionLocked: boolean
  login: (username: string, password: string) => Promise<{ success: boolean; message: string }>
  refresh: () => Promise<string | null>
  logout: (redirect?: boolean) => Promise<void>
  lockSession: () => void
  unlockSession: (password: string) => Promise<{ success: boolean; message: string }>
}

function toUser(u: ApiUser): User {
  return {
    ...u,
    canAccessPayroll: false,
  }
}

const CLEARED = {
  user: null,
  isAuthenticated: false,
  accessToken: null,
  refreshToken: null,
  isSessionLocked: false,
} as const

// Shared single-flight refresh so concurrent 401s don't each consume (and revoke) the token.
let refreshInFlight: Promise<string | null> | null = null

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      isSessionLocked: false,

      login: async (username, password) => {
        const controller = new AbortController()
        const timeoutId = window.setTimeout(() => controller.abort(), 15000)
        let response: Response
        try {
          response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
            signal: controller.signal,
          })
        } catch {
          set({ ...CLEARED })
          return { success: false, message: 'Cannot reach the server. Please try again in a moment.' }
        } finally {
          window.clearTimeout(timeoutId)
        }

        if (!response.ok) {
          let message = 'Invalid username or password.'
          try {
            const err = (await response.json()) as { error?: string }
            if (err?.error) message = err.error
          } catch {
            if (response.status === 429) message = 'Too many attempts. Please wait a minute.'
            else if (response.status >= 500) message = 'Server error while signing in. Please try again.'
          }
          set({ ...CLEARED })
          return { success: false, message }
        }

        const data = (await response.json()) as LoginPayload
        set({
          user: toUser(data.user),
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          isAuthenticated: true,
          isSessionLocked: false,
        })
        return { success: true, message: 'Signed in.' }
      },

      refresh: async () => {
        if (refreshInFlight) return refreshInFlight
        refreshInFlight = (async () => {
          const { refreshToken } = get()
          if (!refreshToken) {
            set({ ...CLEARED })
            return null
          }
          try {
            const res = await fetch('/api/auth/refresh', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken }),
            })
            if (!res.ok) {
              set({ ...CLEARED })
              return null
            }
            const data = (await res.json()) as LoginPayload
            set({
              user: toUser(data.user),
              accessToken: data.accessToken,
              refreshToken: data.refreshToken,
              isAuthenticated: true,
            })
            return data.accessToken
          } catch {
            set({ ...CLEARED })
            return null
          } finally {
            refreshInFlight = null
          }
        })()
        return refreshInFlight
      },

      logout: async (redirect = true) => {
        const { refreshToken } = get()
        if (refreshToken) {
          try {
            await fetch('/api/auth/logout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken }),
            })
          } catch {
            /* ignore */
          }
        }
        set({ ...CLEARED })
        try {
          localStorage.removeItem('logistics-storage')
        } catch {
          /* ignore */
        }
        if (redirect) window.location.href = '/login'
      },

      lockSession: () => set({ isSessionLocked: true }),

      unlockSession: async (password) => {
        const { user } = get()
        if (!user) return { success: false, message: 'No active session.' }
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user.username, password }),
          })
          if (!res.ok) return { success: false, message: 'Incorrect password.' }
          const data = (await res.json()) as LoginPayload
          set({
            user: toUser(data.user),
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            isAuthenticated: true,
            isSessionLocked: false,
          })
          return { success: true, message: 'Session unlocked.' }
        } catch {
          return { success: false, message: 'Cannot reach the server.' }
        }
      },
    }),
    {
      name: 'kornet-auth-storage',
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<AuthState>
        const storedUser = persisted.user
        const user = storedUser
          ? {
              id: storedUser.id,
              username: storedUser.username,
              fullName: storedUser.fullName,
              email: storedUser.email,
              role: storedUser.role,
              active: storedUser.active,
              canAccessFs: storedUser.canAccessFs,
              canAccessPayroll: false,
            }
          : null
        return { ...currentState, ...persisted, user }
      },
      partialize: (s) => ({
        user: s.user,
        isAuthenticated: s.isAuthenticated,
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state.isSessionLocked = false
      },
    },
  ),
)
