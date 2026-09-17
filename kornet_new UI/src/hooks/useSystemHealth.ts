import { useState, useEffect, useCallback, useRef } from 'react'

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown'
  uptimeSeconds: number
  timestamp: string
  checks: {
    database: { status: string; latencyMs: number }
    diskUsage: { dbFileSizeBytes: number; dbFileSizeMb: number }
    runtime: { memoryMb: number; gcGen0: number; gcGen1: number; gcGen2: number }
  }
}

export interface TelemetryData {
  activeSessionCount: number
  totalUsers: number
  totalCompanies: number
  tableRowCounts: Record<string, number>
  recentAuditEvents: number
  recentLogs: {
    id: number
    username: string | null
    eventType: string
    resource: string
    success: boolean
    ipAddress: string | null
    details: string | null
    createdAtUtc: string
  }[]
}

export function useSystemHealth(pollIntervalMs = 30000) {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [latencyMs, setLatencyMs] = useState<number>(0)
  const [latencyHistory, setLatencyHistory] = useState<number[]>([])
  const [memoryHistory, setMemoryHistory] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const mountedRef = useRef(true)

  const fetchHealth = useCallback(async () => {
    const start = performance.now()
    try {
      const resp = await fetch('/api/health')
      const elapsed = Math.round(performance.now() - start)
      if (!mountedRef.current) return
      
      if (resp.ok) {
        const data = await resp.json() as HealthStatus
        setHealth(data)
        setLatencyMs(elapsed)
        setLatencyHistory(prev => [...prev.slice(-29), elapsed])
        setMemoryHistory(prev => [...prev.slice(-29), data.checks.runtime.memoryMb])
      } else {
        setHealth(prev => prev ? { ...prev, status: 'degraded' } : null)
        setLatencyMs(elapsed)
      }
    } catch {
      if (!mountedRef.current) return
      setHealth(prev => prev ? { ...prev, status: 'unhealthy' } : { 
        status: 'unhealthy', uptimeSeconds: 0, timestamp: new Date().toISOString(),
        checks: {
          database: { status: 'unreachable', latencyMs: -1 },
          diskUsage: { dbFileSizeBytes: 0, dbFileSizeMb: 0 },
          runtime: { memoryMb: 0, gcGen0: 0, gcGen1: 0, gcGen2: 0 }
        }
      })
      setLatencyMs(-1)
    } finally {
      if (mountedRef.current) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    fetchHealth()
    const interval = setInterval(fetchHealth, pollIntervalMs)
    return () => {
      mountedRef.current = false
      clearInterval(interval)
    }
  }, [fetchHealth, pollIntervalMs])

  return { health, latencyMs, latencyHistory, memoryHistory, isLoading, refetch: fetchHealth }
}

export function useSystemTelemetry(pollIntervalMs = 10000) {
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null)
  const [sessionHistory, setSessionHistory] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const mountedRef = useRef(true)

  const fetchTelemetry = useCallback(async () => {
    try {
      const now = new Date()
      // Construct local midnight string
      const localMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      
      const resp = await fetch(`/api/health/telemetry?localMidnight=${encodeURIComponent(localMidnight)}`)
      if (!mountedRef.current) return
      if (resp.ok) {
        const data = await resp.json() as TelemetryData
        setTelemetry(data)
        setSessionHistory(prev => [...prev.slice(-29), data.activeSessionCount])
      }
    } catch {
      // silent
    } finally {
      if (mountedRef.current) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    fetchTelemetry()
    const interval = setInterval(fetchTelemetry, pollIntervalMs)
    return () => {
      mountedRef.current = false
      clearInterval(interval)
    }
  }, [fetchTelemetry, pollIntervalMs])

  return { telemetry, sessionHistory, isLoading, refetch: fetchTelemetry }
}
