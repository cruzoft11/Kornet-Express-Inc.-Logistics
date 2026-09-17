import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind class names intelligently, resolving conflicts.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format a number as Philippine Peso currency. */
export function formatPHP(value: number | null | undefined): string {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

/** Format a number with thousands separators. */
export function formatNumber(value: number | null | undefined, decimals = 2): string {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0
  return new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n)
}

/** Format an ISO date string into a readable date. */
export function formatDate(iso: string | Date | null | undefined): string {
  if (!iso) return '—'
  const d = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: '2-digit' })
}

/** Format an ISO date string into date + time. */
export function formatDateTime(iso: string | Date | null | undefined): string {
  if (!iso) return '—'
  const d = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Generate a short pseudo-random id for client-side optimistic entities. */
export function shortId(prefix = ''): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase()
  return prefix ? `${prefix}-${rand}` : rand
}
