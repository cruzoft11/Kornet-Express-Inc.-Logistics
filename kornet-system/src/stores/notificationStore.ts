import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Notification {
  id: string
  type: 'info' | 'warning' | 'error' | 'support'
  title: string
  message: string
  from?: string
  timestamp: string
  read: boolean
}

interface NotificationState {
  notifications: Notification[]
  addNotification: (n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  removeNotification: (id: string) => void
  clearAll: () => void
  unreadCount: () => number
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      addNotification: (n) => set((state) => ({
        notifications: [
          {
            ...n,
            id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
            timestamp: new Date().toISOString(),
            read: false,
          },
          ...state.notifications,
        ].slice(0, 50) // keep max 50
      })),
      markAsRead: (id) => set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        ),
      })),
      markAllAsRead: () => set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
      })),
      removeNotification: (id) => set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      })),
      clearAll: () => set({ notifications: [] }),
      unreadCount: () => get().notifications.filter((n) => !n.read).length,
    }),
    { name: 'notification-storage' }
  )
)
