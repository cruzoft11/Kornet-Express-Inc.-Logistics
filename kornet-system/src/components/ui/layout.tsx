import { useState } from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from './button'

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn('rounded-xl border bg-card text-card-foreground shadow-sm', className)} {...props} /> }
export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn('flex flex-col gap-1.5 p-5', className)} {...props} /> }
export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) { return <h3 className={cn('text-base font-semibold leading-none text-balance', className)} {...props} /> }
export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) { return <p className={cn('text-sm text-muted-foreground text-pretty', className)} {...props} /> }
export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn('p-5 pt-0', className)} {...props} /> }

export function StatCard({ label, value, delta, icon, sparkline }: { label: string; value: React.ReactNode; delta?: React.ReactNode; icon?: React.ReactNode; sparkline?: React.ReactNode }) {
  return <Card className="overflow-hidden"><CardHeader className="flex-row items-start justify-between pb-3"><div><CardDescription>{label}</CardDescription><CardTitle className="mt-2 font-mono text-2xl tabular-nums">{value}</CardTitle></div>{icon && <div className="rounded-lg bg-muted p-2 text-secondary">{icon}</div>}</CardHeader>{(delta || sparkline) && <CardContent className="flex items-end justify-between gap-3 text-sm">{delta && <span className="text-muted-foreground">{delta}</span>}{sparkline}</CardContent>}</Card>
}

export function FormField({ label, htmlFor, hint, error, required, children }: { label: string; htmlFor?: string; hint?: string; error?: string; required?: boolean; children: React.ReactNode }) {
  return <div className="grid gap-1.5"><label htmlFor={htmlFor} className="text-sm font-medium text-foreground">{label}{required && <span className="text-accent"> *</span>}</label>{children}{hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}{error && <p className="text-xs font-medium text-destructive" role="alert">{error}</p>}</div>
}

export function FormSection({ title, description, children, defaultOpen = true }: { title: string; description?: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return <section className="rounded-xl border bg-card"><button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"><span><span className="block font-semibold">{title}</span>{description && <span className="mt-1 block text-sm text-muted-foreground">{description}</span>}</span><ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} /></button>{open && <div className="grid gap-4 border-t p-5 md:grid-cols-2 xl:grid-cols-3">{children}</div>}</section>
}
export const Fieldset = FormSection

export function Tabs({ value, onValueChange, tabs }: { value: string; onValueChange: (v: string) => void; tabs: { value: string; label: string; content: React.ReactNode }[] }) {
  return <TabsPrimitive.Root value={value} onValueChange={onValueChange}><TabsPrimitive.List className="flex gap-1 border-b" aria-label="Tabs">{tabs.map((t, i) => <TabsPrimitive.Trigger key={t.value} value={t.value} className="relative px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors data-[state=active]:text-foreground">{t.label}<span className="ml-2 hidden font-mono text-[10px] text-muted-foreground sm:inline">Alt+{i + 1}</span><span className="absolute inset-x-2 bottom-[-1px] hidden h-0.5 rounded-full bg-secondary data-[state=active]:block" /></TabsPrimitive.Trigger>)}</TabsPrimitive.List>{tabs.map((t) => <TabsPrimitive.Content key={t.value} value={t.value} className="pt-4 focus:outline-none">{t.content}</TabsPrimitive.Content>)}</TabsPrimitive.Root>
}

export function PageHeader({ title, eyebrow, description, actions, primaryAction, breadcrumbs }: { title: string; eyebrow?: string; description?: string; actions?: React.ReactNode; primaryAction?: React.ReactNode; breadcrumbs?: React.ReactNode }) {
  return <header className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div>{breadcrumbs && <div className="mb-2">{breadcrumbs}</div>}{eyebrow && <p className="mb-1 font-mono text-xs font-semibold uppercase text-secondary">{eyebrow}</p>}<h1 className="text-2xl font-semibold tracking-[-0.02em] text-balance">{title}</h1>{description && <p className="mt-2 max-w-3xl text-sm text-muted-foreground text-pretty">{description}</p>}</div><div className="flex flex-wrap items-center gap-2">{actions}{primaryAction}</div></header>
}

export function Toolbar({ children, className }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn('mb-4 flex flex-wrap items-center gap-2 rounded-xl border bg-card p-2 shadow-xs', className)}>{children}</div> }
export const FilterBar = Toolbar

export function SplitView({ list, detail, className }: { list: React.ReactNode; detail: React.ReactNode; className?: string }) { return <div className={cn('grid min-h-[32rem] gap-4 lg:grid-cols-[minmax(20rem,28rem)_1fr]', className)}><div className="min-w-0">{list}</div><div className="min-w-0">{detail}</div></div> }
export function ModulePlaceholder({ title, description }: { title: string; description?: string }) { return <div className="flex h-full min-h-[28rem] items-center justify-center p-6"><div className="max-w-md text-center"><div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-muted text-secondary">⌁</div><h2 className="text-xl font-semibold">{title}</h2><p className="mt-2 text-sm text-muted-foreground">{description ?? 'This module is being rebuilt on the Kornet v2 component library. No placeholder business data is shown.'}</p><Button className="mt-5" variant="outline">Review workflow</Button></div></div> }
