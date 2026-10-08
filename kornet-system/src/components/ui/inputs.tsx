import { forwardRef, useMemo, useState } from 'react'
import { CalendarDays, ChevronDown, Search, X } from 'lucide-react'
import * as SelectPrimitive from '@radix-ui/react-select'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import * as SwitchPrimitive from '@radix-ui/react-switch'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { cn } from '@/lib/cn'
import { parseDdMmYyyy, toInputDate } from '@/lib/format'

const control = 'h-[var(--density-control)] w-full rounded-md border border-border/90 bg-background px-3 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground/75 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { leftIcon?: React.ReactNode; rightSlot?: React.ReactNode }
export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, leftIcon, rightSlot, ...props }, ref) => (
  <div className="relative w-full">
    {leftIcon && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{leftIcon}</span>}
    <input ref={ref} className={cn(control, leftIcon && 'pl-9', rightSlot && 'pr-10', className)} {...props} />
    {rightSlot && <span className="absolute right-2 top-1/2 -translate-y-1/2">{rightSlot}</span>}
  </div>
))
Input.displayName = 'Input'

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(control, 'min-h-24 py-2 leading-6', className)} {...props} />
))
Textarea.displayName = 'Textarea'

export interface NumberInputProps extends Omit<InputProps, 'onChange'> { value?: number | string; step?: number; onValueChange?: (value: number) => void }
export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(({ value, step = 1, onValueChange, onKeyDown, className, ...props }, ref) => (
  <Input
    ref={ref}
    inputMode="decimal"
    value={value ?? ''}
    className={cn('text-right font-mono tabular-nums', className)}
    onChange={(e) => onValueChange?.(Number(e.target.value.replace(/,/g, '')))}
    onKeyDown={(e) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault()
        const next = Number(value || 0) + (e.key === 'ArrowUp' ? step : -step)
        onValueChange?.(next)
      }
      onKeyDown?.(e)
    }}
    {...props}
  />
))
NumberInput.displayName = 'NumberInput'

export interface MoneyInputProps extends NumberInputProps { currency?: string }
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(({ currency = 'PHP', onBlur, ...props }, ref) => (
  <NumberInput ref={ref} leftIcon={<span className="font-mono text-xs font-semibold text-muted-foreground">{currency}</span>} step={0.01} onBlur={onBlur} {...props} />
))
MoneyInput.displayName = 'MoneyInput'

export interface DateInputProps extends Omit<InputProps, 'value' | 'onChange'> { value?: string; onValueChange?: (isoDate: string) => void }
export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(({ value, onValueChange, onKeyDown, ...props }, ref) => {
  const [text, setText] = useState(value ?? '')
  const apply = (raw: string) => {
    if (raw.toLowerCase() === 't') return onValueChange?.(toInputDate(new Date()))
    const plus = raw.match(/^\+(\d+)$/)
    if (plus) { const d = new Date(); d.setDate(d.getDate() + Number(plus[1])); return onValueChange?.(toInputDate(d)) }
    const parsed = parseDdMmYyyy(raw)
    if (parsed) onValueChange?.(toInputDate(parsed))
  }
  return <Input ref={ref} value={text} placeholder="dd/mm/yyyy" leftIcon={<CalendarDays className="size-4" />} onChange={(e) => setText(e.target.value)} onBlur={() => apply(text)} onKeyDown={(e) => { if (e.key === 'Enter') apply(text); onKeyDown?.(e) }} {...props} />
})
DateInput.displayName = 'DateInput'

export interface SelectOption { value: string; label: string; disabled?: boolean }
export function Select({ value, onValueChange, options, placeholder = 'Select…', className, 'aria-label': ariaLabel }: { value?: string; onValueChange?: (v: string) => void; options: SelectOption[]; placeholder?: string; className?: string; 'aria-label'?: string }) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
      <SelectPrimitive.Trigger aria-label={ariaLabel ?? placeholder} className={cn(control, 'flex items-center justify-between text-left', className)}>
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon><ChevronDown className="size-4 text-muted-foreground" /></SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content className="z-modal overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-xl">
          <SelectPrimitive.Viewport className="p-1">
            {options.map((o) => <SelectPrimitive.Item key={o.value} value={o.value} disabled={o.disabled} className="relative flex h-9 cursor-pointer select-none items-center rounded-md px-3 text-sm outline-none transition-colors data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary dark:data-[highlighted]:bg-primary/20 dark:data-[highlighted]:text-white data-[disabled]:opacity-50"><SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText></SelectPrimitive.Item>)}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}

export interface LookupItem { id: string; label: string; description?: string }
export function Combobox({ items, value, onSelect, placeholder = 'Search…', onQueryChange, createLabel }: { items: LookupItem[]; value?: string; onSelect?: (item: LookupItem) => void; placeholder?: string; onQueryChange?: (q: string) => void; createLabel?: string }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => items.filter((i) => `${i.label} ${i.description ?? ''}`.toLowerCase().includes(query.toLowerCase())).slice(0, 8), [items, query])
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild><button type="button" className={cn(control, 'flex items-center justify-between text-left')}><span className={cn(!value && 'text-muted-foreground')}>{value || placeholder}</span><ChevronDown className="size-4 text-muted-foreground" /></button></PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal><PopoverPrimitive.Content align="start" className="z-modal w-[min(28rem,calc(100vw-2rem))] rounded-lg border bg-popover p-2 shadow-xl">
        <Input autoFocus leftIcon={<Search className="size-4" />} value={query} placeholder={placeholder} onChange={(e) => { setQuery(e.target.value); onQueryChange?.(e.target.value) }} rightSlot={query ? <button aria-label="Clear" onClick={() => setQuery('')}><X className="size-4" /></button> : null} />
        <div className="mt-2 max-h-72 overflow-auto custom-scrollbar">
          {filtered.map((item) => <button key={item.id} type="button" className="w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 dark:hover:text-white focus:bg-primary/10" onClick={() => { onSelect?.(item); setOpen(false) }}><span className="font-medium">{item.label}</span>{item.description && <span className="block text-xs text-muted-foreground">{item.description}</span>}</button>)}
          {createLabel && <button type="button" className="mt-1 w-full rounded-md border border-dashed px-3 py-2 text-left text-sm text-secondary hover:bg-muted">{createLabel}</button>}
          {!filtered.length && <p className="px-3 py-6 text-center text-sm text-muted-foreground">No results.</p>}
        </div>
      </PopoverPrimitive.Content></PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

export const Checkbox = forwardRef<HTMLButtonElement, CheckboxPrimitive.CheckboxProps>(({ className, children, ...props }, ref) => (
  <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium select-none">
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        'peer flex size-4.5 shrink-0 items-center justify-center rounded border-2 border-slate-300 dark:border-slate-600 bg-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-white disabled:cursor-not-allowed disabled:opacity-50 hover:border-primary/70',
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-xs font-bold leading-none text-white">
        ✓
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
    {children}
  </label>
))
Checkbox.displayName = 'Checkbox'

export const Switch = forwardRef<HTMLButtonElement, SwitchPrimitive.SwitchProps>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-slate-300 dark:data-[state=unchecked]:bg-slate-700',
      className
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb
      className="pointer-events-none block size-5 rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ease-in-out data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
    />
  </SwitchPrimitive.Root>
))
Switch.displayName = 'Switch'

export function SegmentedControl({ value, onValueChange, options, label }: { value: string; onValueChange: (v: string) => void; options: SelectOption[]; label: string }) {
  return <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border bg-muted p-1">{options.map((o) => <button key={o.value} role="radio" aria-checked={value === o.value} type="button" onClick={() => onValueChange(o.value)} className={cn('rounded-md px-3 py-1.5 text-sm font-medium transition-colors', value === o.value ? 'bg-background shadow-xs text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground')}>{o.label}</button>)}</div>
}

export { control as controlClassName }
