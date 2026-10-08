import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Search } from 'lucide-react'
import { Combobox, FormField, Input, Select, StatusPill } from '@/components/ui'
import type { LookupOption } from '@/api/ops'
import { cn } from '@/lib/cn'
import { formatMoney, formatNumber } from '@/lib/format'

export function OptionsSelect({ value, options, onChange, placeholder }: { value?: string; options: string[]; onChange: (v: string) => void; placeholder?: string }) {
  return <Select value={value || undefined} onValueChange={onChange} options={options.map((item) => ({ value: item, label: item.replace(/_/g, ' ') }))} placeholder={placeholder} />
}

export function LookupField({ label, value, display, onChange, loader, role, required, hint }: { label: string; value?: string | null; display?: string; onChange: (id: string, item?: LookupOption) => void; loader: (q: string, role?: string) => Promise<LookupOption[]>; role?: string; required?: boolean; hint?: string }) {
  const [items, setItems] = useState<LookupOption[]>([])
  const [error, setError] = useState('')
  useEffect(() => {
    let live = true
    loader('', role).then((rows) => { if (live) setItems(rows) }).catch((err: unknown) => setError(err instanceof Error ? err.message : 'Lookup failed'))
    return () => { live = false }
  }, [loader, role])
  return <FormField label={label} required={required} hint={hint} error={error}><Combobox items={items} value={display || value || ''} placeholder={`Find ${label.toLowerCase()}…`} onSelect={(item) => onChange(item.id, item)} onQueryChange={(q) => loader(q, role).then(setItems).catch(() => setError('Lookup failed'))} /></FormField>
}

export function SearchBox({ value, onChange, placeholder = 'Search…' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} leftIcon={<Search className="size-4" />} className="w-80" />
}

export function MoneyValue({ value, currency = 'PHP', className }: { value?: number | null; currency?: string; className?: string }) {
  return <span className={cn('font-mono tabular-nums', className)}>{formatMoney(value ?? 0, currency)}</span>
}

export function NumberValue({ value, suffix, className }: { value?: number | null; suffix?: string; className?: string }) {
  return <span className={cn('font-mono tabular-nums', className)}>{formatNumber(value ?? 0)}{suffix ? ` ${suffix}` : ''}</span>
}

export function MarginBadge({ bill, cost }: { bill: number; cost: number }) {
  const margin = bill > 0 ? ((bill - cost) / bill) * 100 : 0
  const tone = margin < 0 ? 'danger' : margin < 15 ? 'warning' : 'success'
  return <StatusPill status={`${formatNumber(margin)}% margin`} tone={tone} />
}

export function WarningText({ children }: { children?: string }) {
  if (!children) return null
  return <p className="mt-1 inline-flex items-center gap-1 text-xs text-warning"><AlertTriangle className="size-3" />{children}</p>
}

export function useDebouncedValue(value: string, delay = 250) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(id)
  }, [delay, value])
  return debounced
}

export function useDirtySnapshot<T>(value: T) {
  const [snapshot, setSnapshot] = useState(() => JSON.stringify(value))
  const current = useMemo(() => JSON.stringify(value), [value])
  const markClean = useCallback((next: T) => setSnapshot(JSON.stringify(next)), [])
  return { dirty: current !== snapshot, markClean }
}

