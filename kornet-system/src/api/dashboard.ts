import { apiGet } from './client'

export interface DashboardSummary {
  filesByStatus?: Array<{ mode?: string; status: string; _count?: number | { _all?: number } }>
  activeFilesByMode?: Record<string, number>
  upcomingEtas?: Array<Record<string, unknown>>
  upcomingCutoffs?: Array<Record<string, unknown>>
  overdueInvoices?: Array<Record<string, unknown>>
  lowMarginFiles?: Array<Record<string, unknown>>
  unbilledCharges?: number
  invoicesOverdue?: number
  arOutstanding?: number
  arOverdue?: number
  arAging?: Record<string, number>
  apDueAmount?: number
  apDueThisWeek?: number
  bridgeQueue?: Array<{ status: string; _count?: number | { _all?: number } }>
  pdToday?: number
  mtd?: { revenue?: number; cost?: number; profit?: number; marginPct?: number }
  mtdByMode?: Array<{ mode: string; revenue: number; cost: number }>
  topCustomers?: Array<{ customer?: string; name?: string; amount?: number; revenue?: number }>
}

export async function getDashboardSummary() {
  return apiGet<DashboardSummary>('/dashboard/summary')
}
