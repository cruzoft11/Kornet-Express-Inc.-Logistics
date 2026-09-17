import { useEffect, useRef, useCallback, useState } from 'react'
import { useAuthStore } from '../stores/authStore'

const WARNING_AT_MS = 4 * 60 * 1000       // Show warning at 4 minutes (240000ms)
const LOGOUT_AT_MS = 5 * 60 * 1000        // Logout at 5 minutes (300000ms)
const COUNTDOWN_SECONDS = Math.floor((LOGOUT_AT_MS - WARNING_AT_MS) / 1000) // 60 seconds

const STORAGE_KEY = 'accounting_last_activity_time'

export function useInactivityLogout() {
  const logout = useAuthStore((s) => s.logout)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isSessionLocked = useAuthStore((s) => s.isSessionLocked)
  const lockSession = useAuthStore((s) => s.lockSession)
  
  const checkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  
  const [showWarningToast, setShowWarningToast] = useState(false)
  const [secondsRemaining, setSecondsRemaining] = useState(COUNTDOWN_SECONDS)
  const [showWelcomeBack, setShowWelcomeBack] = useState(false)

  // Safely get last activity from localStorage or default to now
  const getLastActivityTime = (): number => {
    const val = localStorage.getItem(STORAGE_KEY)
    if (!val) {
      const now = Date.now()
      localStorage.setItem(STORAGE_KEY, String(now))
      return now
    }
    return parseInt(val, 10) || Date.now()
  }

  // Update activity timestamp in storage
  const updateActivityTime = useCallback(() => {
    if (!isAuthenticated || isSessionLocked) return
    const now = Date.now()
    localStorage.setItem(STORAGE_KEY, String(now))
  }, [isAuthenticated, isSessionLocked])

  // Reset the session warning toast and storage timestamp
  const dismissWarning = useCallback(() => {
    setShowWarningToast(false)
    setSecondsRemaining(COUNTDOWN_SECONDS)
    
    // Explicitly update last activity time to now
    updateActivityTime()
    
    // Show welcome back toast briefly
    setShowWelcomeBack(true)
    setTimeout(() => setShowWelcomeBack(false), 3000)
  }, [updateActivityTime])

  // Periodic checker logic (run every second)
  useEffect(() => {
    if (!isAuthenticated || isSessionLocked) {
      if (checkTimerRef.current) {
        clearInterval(checkTimerRef.current)
        checkTimerRef.current = null
      }
      setShowWarningToast(false)
      setShowWelcomeBack(false)
      return
    }

    // Set initial timestamp on mount/login
    localStorage.setItem(STORAGE_KEY, String(Date.now()))

    const runPeriodicCheck = () => {
      const lastActivity = getLastActivityTime()
      const elapsed = Date.now() - lastActivity

      if (elapsed >= LOGOUT_AT_MS) {
        // Time is completely up -> clear and logout
        if (checkTimerRef.current) {
          clearInterval(checkTimerRef.current)
          checkTimerRef.current = null
        }
        setShowWarningToast(false)
        lockSession()
      } else if (elapsed >= WARNING_AT_MS) {
        // In the warning window -> show toast and calculate exact seconds left dynamically
        setShowWarningToast(true)
        const secondsLeft = Math.max(0, Math.floor((LOGOUT_AT_MS - elapsed) / 1000))
        setSecondsRemaining(secondsLeft)
      } else {
        // Active session -> hide warning
        setShowWarningToast(false)
      }
    }

    // Run check immediately
    runPeriodicCheck()

    // Run periodic interval (resilient to browser/tab throttling because it evaluates real clock time)
    checkTimerRef.current = setInterval(runPeriodicCheck, 1000)

    // Activity event listeners to reset lastActivityTime in localStorage
    const onActivity = () => {
      // Don't auto-reset if the warning toast is showing (user must click "I'm still here")
      const lastActivity = getLastActivityTime()
      const elapsed = Date.now() - lastActivity
      if (elapsed < WARNING_AT_MS) {
        updateActivityTime()
      }
    }

    // Storage event listener to synchronize activity state across multiple tabs
    const onStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        runPeriodicCheck()
      }
    }

    const events = ['mousedown', 'keydown', 'mousemove', 'scroll', 'touchstart', 'click']
    events.forEach(e => window.addEventListener(e, onActivity, { passive: true }))
    window.addEventListener('storage', onStorageChange)
    document.addEventListener('visibilitychange', runPeriodicCheck)

    return () => {
      if (checkTimerRef.current) {
        clearInterval(checkTimerRef.current)
        checkTimerRef.current = null
      }
      events.forEach(e => window.removeEventListener(e, onActivity))
      window.removeEventListener('storage', onStorageChange)
      document.removeEventListener('visibilitychange', runPeriodicCheck)
    }
  }, [isAuthenticated, isSessionLocked, logout, updateActivityTime])

  return { 
    showWarningToast, 
    secondsRemaining, 
    showWelcomeBack, 
    dismissWarning 
  }
}
