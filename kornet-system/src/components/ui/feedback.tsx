import { forwardRef } from 'react'
import { AlertCircle, CheckCircle2, Clock, Info, Loader2 } from 'lucide-react'
import { Toaster as SonnerToaster } from 'sonner'
import { cn } from '@/lib/cn'

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return <kbd className={cn('inline-flex min-w-5 items-center justify-center rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] font-semibold text-muted-foreground shadow-xs', className)}>{children}</kbd>
}

export type StatusTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent'
const toneClasses: Record<StatusTone, string> = {
  neutral: 'bg-muted text-muted-foreground border-border',
  success: 'bg-success/12 text-success border-success/25',
  warning: 'bg-warning/14 text-warning border-warning/30',
  danger: 'bg-destructive/12 text-destructive border-destructive/25',
  info: 'bg-info/12 text-info border-info/25',
  accent: 'bg-accent/12 text-accent border-accent/25',
}
const statusTone: Record<string, StatusTone> = {
  DRAFT: 'neutral', SENT: 'info', ACCEPTED: 'success', REJECTED: 'danger', EXPIRED: 'warning', CONVERTED: 'success',
  BOOKED: 'info', LOADED: 'info', IN_TRANSIT: 'info', ARRIVED: 'warning', CLEARED: 'success', DELIVERED: 'success', CLOSED: 'neutral', CANCELLED: 'danger',
  OPEN: 'info', INVOICED: 'success', BILLED: 'success', POSTED: 'success', PARTIAL: 'warning', PAID: 'success', VOID: 'danger',
  APPROVED: 'success', PRINTED: 'info', RECEIVED: 'info', INSPECTED: 'info', HOLD: 'danger', READY: 'success', RELEASED: 'success', SHIPPED: 'success',
}
export function StatusPill({ status, tone, className }: { status: string; tone?: StatusTone; className?: string }) {
  const normalized = status.toUpperCase().replace(/[ -]/g, '_')
  return <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tabular-nums', toneClasses[tone ?? statusTone[normalized] ?? 'neutral'], className)}>{status.replace(/_/g, ' ')}</span>
}
export const Badge = StatusPill

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('relative overflow-hidden rounded-md bg-muted', className)}><div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/35 to-transparent dark:via-white/8" /></div>
}

export function EmptyState({ icon, title, description, action }: { icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode }) {
  return <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed bg-card p-8 text-center"><div className="mb-3 rounded-full bg-muted p-3 text-muted-foreground">{icon ?? <Info className="size-6" />}</div><h3 className="text-base font-semibold text-balance">{title}</h3>{description && <p className="mt-1 max-w-md text-sm text-muted-foreground text-pretty">{description}</p>}{action && <div className="mt-5">{action}</div>}</div>
}

export function Toast() { return <SonnerToaster position="top-right" richColors closeButton toastOptions={{ className: 'font-sans' }} /> }

export function Timeline({ items }: { items: { id: string; title: string; time?: string; tone?: StatusTone; description?: string }[] }) {
  return <ol className="space-y-4">{items.map((item, i) => <li key={item.id} className="relative pl-8"><span className={cn('absolute left-0 top-0.5 flex size-5 items-center justify-center rounded-full border bg-background', toneClasses[item.tone ?? 'neutral'])}>{item.tone === 'success' ? <CheckCircle2 className="size-3" /> : item.tone === 'danger' ? <AlertCircle className="size-3" /> : <Clock className="size-3" />}</span>{i < items.length - 1 && <span className="absolute left-2.5 top-6 h-[calc(100%+0.5rem)] w-px bg-border" />}<div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">{item.title}</p>{item.time && <time className="font-mono text-xs text-muted-foreground">{item.time}</time>}</div>{item.description && <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>}</li>)}</ol>
}

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return <ol className="flex flex-wrap items-center gap-2">{steps.map((s, i) => <li key={s} className="flex items-center gap-2"><span className={cn('flex size-7 items-center justify-center rounded-full border text-xs font-bold', i < current ? 'bg-success text-success-foreground border-success' : i === current ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground')}>{i + 1}</span><span className={cn('text-sm font-medium', i <= current ? 'text-foreground' : 'text-muted-foreground')}>{s}</span>{i < steps.length - 1 && <span className="h-px w-8 bg-border" />}</li>)}</ol>
}

export const LoadingSpinner = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => <div ref={ref} role="status" className={cn('inline-flex items-center gap-2 text-sm text-muted-foreground', className)} {...props}><Loader2 className="size-4 animate-spin" />Loading…</div>)
LoadingSpinner.displayName = 'LoadingSpinner'
