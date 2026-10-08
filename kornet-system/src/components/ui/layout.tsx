import { useState } from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from './button'

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('min-w-0 rounded-xl border bg-card text-card-foreground shadow-xs transition-all duration-150', className)} {...props} />
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1.5 p-4 sm:p-5', className)} {...props} />
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-base font-semibold leading-none text-balance tracking-tight', className)} {...props} />
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-muted-foreground text-pretty', className)} {...props} />
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('min-w-0 p-4 pt-0 sm:p-5 sm:pt-0', className)} {...props} />
}

export function StatCard({
  label,
  value,
  delta,
  icon,
  sparkline,
  className,
}: {
  label: string
  value: React.ReactNode
  delta?: React.ReactNode
  icon?: React.ReactNode
  sparkline?: React.ReactNode
  className?: string
}) {
  return (
    <Card className={cn('overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md', className)}>
      <CardHeader className="flex-row items-start justify-between pb-2 sm:pb-3">
        <div>
          <CardDescription className="text-xs font-medium uppercase tracking-wider">{label}</CardDescription>
          <CardTitle className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-foreground">{value}</CardTitle>
        </div>
        {icon && <div className="rounded-xl bg-muted/80 p-2.5 text-secondary shadow-2xs">{icon}</div>}
      </CardHeader>
      {(delta || sparkline) && (
        <CardContent className="flex items-end justify-between gap-3 text-sm">
          {delta && <span className="text-xs text-muted-foreground">{delta}</span>}
          {sparkline}
        </CardContent>
      )}
    </Card>
  )
}

export function FormField({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string
  htmlFor?: string
  hint?: string
  error?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('grid min-w-0 gap-1.5', className)}>
      <label htmlFor={htmlFor} className="truncate text-xs font-medium text-foreground sm:text-sm">
        {label}
        {required && <span className="text-accent font-bold"> *</span>}
      </label>
      {children}
      {hint && !error && <p className="truncate text-[11px] text-muted-foreground">{hint}</p>}
      {error && <p className="text-[11px] font-medium text-destructive" role="alert">{error}</p>}
    </div>
  )
}

export function FormSection({
  title,
  description,
  children,
  defaultOpen = true,
  className,
}: {
  title: string
  description?: string
  children: React.ReactNode
  defaultOpen?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className={cn('w-full min-w-0 overflow-hidden rounded-xl border bg-card/90 shadow-2xs transition-shadow duration-200 hover:shadow-xs', className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 sm:px-5 sm:py-3.5"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold tracking-tight text-foreground sm:text-base">{title}</span>
          {description && <span className="mt-0.5 block truncate text-xs text-muted-foreground">{description}</span>}
        </span>
        <ChevronDown className={cn('size-4 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="grid w-full min-w-0 gap-3 border-t p-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 sm:p-4">
          {children}
        </div>
      )}
    </section>
  )
}
export const Fieldset = FormSection

export function Tabs({
  value,
  onValueChange,
  tabs,
}: {
  value: string
  onValueChange: (v: string) => void
  tabs: { value: string; label: string; content: React.ReactNode }[]
}) {
  return (
    <TabsPrimitive.Root value={value} onValueChange={onValueChange} className="w-full min-w-0">
      <div className="relative w-full border-b pb-0.5">
        <TabsPrimitive.List
          className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap p-1 text-sm"
          aria-label="Tabs"
        >
          {tabs.map((t, i) => (
            <TabsPrimitive.Trigger
              key={t.value}
              value={t.value}
              className="relative shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground data-[state=active]:bg-primary/10 data-[state=active]:font-semibold data-[state=active]:text-primary sm:text-sm"
            >
              {t.label}
              <span className="ml-1.5 hidden font-mono text-[10px] opacity-50 xl:inline">
                Alt+{i + 1}
              </span>
            </TabsPrimitive.Trigger>
          ))}
        </TabsPrimitive.List>
      </div>
      {tabs.map((t) => (
        <TabsPrimitive.Content
          key={t.value}
          value={t.value}
          className="w-full min-w-0 pt-3 focus:outline-none sm:pt-4"
        >
          {t.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  )
}

export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
  primaryAction,
  breadcrumbs,
}: {
  title: string
  eyebrow?: string
  description?: string
  actions?: React.ReactNode
  primaryAction?: React.ReactNode
  breadcrumbs?: React.ReactNode
}) {
  return (
    <header className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between sm:mb-5 sm:gap-4">
      <div className="min-w-0 flex-1">
        {breadcrumbs && <div className="mb-1.5">{breadcrumbs}</div>}
        {eyebrow && (
          <p className="mb-1 font-mono text-[11px] font-semibold tracking-wider uppercase text-secondary">
            {eyebrow}
          </p>
        )}
        <h1 className="text-xl font-bold tracking-tight text-foreground text-balance sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-xs text-muted-foreground text-pretty sm:text-sm">{description}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">{actions}{primaryAction}</div>
    </header>
  )
}

export function Toolbar({ children, className }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mb-4 flex flex-wrap items-center gap-2 rounded-xl border bg-card/80 p-2 shadow-2xs backdrop-blur-xs', className)}>
      {children}
    </div>
  )
}
export const FilterBar = Toolbar

export function SplitView({ list, detail, className }: { list: React.ReactNode; detail: React.ReactNode; className?: string }) {
  return (
    <div className={cn('grid min-h-[32rem] min-w-0 gap-4 lg:grid-cols-[minmax(18rem,26rem)_1fr]', className)}>
      <div className="min-w-0 overflow-hidden">{list}</div>
      <div className="min-w-0 overflow-hidden">{detail}</div>
    </div>
  )
}

export function ModulePlaceholder({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex h-full min-h-[28rem] items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-muted text-secondary">
          ⌁
        </div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{description ?? 'This module is being rebuilt on the Kornet v2 component library.'}</p>
        <Button className="mt-5" variant="outline">Review workflow</Button>
      </div>
    </div>
  )
}
