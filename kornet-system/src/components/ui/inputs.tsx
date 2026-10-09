import { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
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

export interface DateInputProps extends Omit<InputProps, 'value' | 'onChange'> {
  value?: string | null
  onValueChange?: (isoDate: string) => void
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(({
  value,
  onValueChange,
  onChange,
  className,
  onClick,
  rightSlot,
  ...props
}, ref) => {
  // Normalize value to YYYY-MM-DD for native HTML5 date input
  const normalizedValue = useMemo(() => {
    if (!value) return ''
    if (typeof value === 'string') {
      if (value.includes('T')) return value.slice(0, 10)
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
      const parsed = parseDdMmYyyy(value)
      if (parsed) return toInputDate(parsed)
    }
    return String(value).slice(0, 10)
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    onValueChange?.(val)
    onChange?.(e)
  }

  const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
    try {
      e.currentTarget.showPicker?.()
    } catch {}
    onClick?.(e)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onValueChange?.('')
    if (onChange) {
      const syntheticEvent = {
        target: { value: '' },
      } as React.ChangeEvent<HTMLInputElement>
      onChange(syntheticEvent)
    }
  }

  const clearButton = normalizedValue && !props.disabled && !props.readOnly ? (
    <button
      type="button"
      onClick={handleClear}
      tabIndex={-1}
      title="Clear date"
      className="rounded p-0.5 text-muted-foreground/60 hover:bg-muted hover:text-foreground"
    >
      <X className="size-3.5" />
    </button>
  ) : null

  return (
    <Input
      ref={ref}
      type="date"
      value={normalizedValue}
      onChange={handleChange}
      onClick={handleClick}
      leftIcon={<CalendarDays className="size-4 text-muted-foreground" />}
      rightSlot={rightSlot || clearButton}
      className={cn(
        'cursor-pointer font-sans [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-70 hover:[&::-webkit-calendar-picker-indicator]:opacity-100',
        className,
      )}
      {...props}
    />
  )
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

/**
 * ComboSelect – searchable dropdown that also accepts free-text input.
 * The user can type anything; the typed value is accepted as-is even if it
 * doesn't match any preset option.  Preset options are filtered as you type.
 */
export interface ComboSelectProps {
  value?: string
  onValueChange?: (v: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
  'aria-label'?: string
}
export function ComboSelect({ value = '', onValueChange, options, placeholder = 'Select or type…', className, 'aria-label': ariaLabel }: ComboSelectProps) {
  const [open, setOpen] = useState(false)
  const [inputVal, setInputVal] = useState(value)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Keep input in sync with external value changes
  useEffect(() => { setInputVal(value) }, [value])

  const filtered = useMemo(() =>
    options.filter((o) => o.label.toLowerCase().includes(inputVal.toLowerCase()) || o.value.toLowerCase().includes(inputVal.toLowerCase())).slice(0, 20),
    [options, inputVal]
  )

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        onValueChange?.(inputVal)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, inputVal, onValueChange])

  const selectOption = (opt: SelectOption) => {
    setInputVal(opt.label)
    onValueChange?.(opt.value)
    setOpen(false)
  }

  const displayLabel = useMemo(() => {
    const match = options.find((o) => o.value === value)
    return match ? match.label : value
  }, [value, options])

  // Sync display label into input when closed
  useEffect(() => {
    if (!open) setInputVal(displayLabel)
  }, [open, displayLabel])

  return (
    <div ref={containerRef} className={cn('relative w-full', className)} aria-label={ariaLabel}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          placeholder={placeholder}
          className={cn(control, 'pr-9 cursor-text')}
          onFocus={() => { setInputVal(''); setOpen(true) }}
          onChange={(e) => { setInputVal(e.target.value); setOpen(true) }}
          onBlur={() => {
            // If the user typed something not in options, keep it as custom free text
            setTimeout(() => {
              if (!containerRef.current?.contains(document.activeElement)) {
                const match = options.find((o) => o.label.toLowerCase() === inputVal.toLowerCase())
                if (match) { onValueChange?.(match.value); setInputVal(match.label) }
                else { onValueChange?.(inputVal) }
                setOpen(false)
              }
            }, 150)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (filtered.length > 0) selectOption(filtered[0])
              else { onValueChange?.(inputVal); setOpen(false) }
            }
            if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur() }
          }}
        />
        <button
          type="button"
          tabIndex={-1}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          onClick={() => { setOpen((o) => !o); inputRef.current?.focus() }}
        >
          <ChevronDown className="size-4" />
        </button>
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-[200] mt-1 w-full rounded-lg border border-border bg-popover text-popover-foreground shadow-xl">
          <div className="max-h-60 overflow-auto p-1 custom-scrollbar">
            {filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); selectOption(o) }}
                className={cn(
                  'w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 dark:hover:text-white',
                  value === o.value && 'bg-primary/10 font-medium text-primary dark:bg-primary/20 dark:text-white'
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {open && filtered.length === 0 && inputVal && (
        <div className="absolute z-[200] mt-1 w-full rounded-lg border border-border bg-popover text-popover-foreground shadow-xl">
          <div className="p-2">
            <p className="px-2 py-1 text-xs text-muted-foreground">No preset match — press Enter to use "<span className="font-medium text-foreground">{inputVal}</span>"</p>
          </div>
        </div>
      )}
    </div>
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
  <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm font-medium select-none group">
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        'peer flex size-4.5 shrink-0 items-center justify-center rounded-md border-2 border-slate-300 dark:border-slate-600 bg-background transition-all duration-200 group-hover:border-primary/70 group-hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-white data-[state=checked]:shadow-xs disabled:cursor-not-allowed disabled:opacity-50 active:scale-95',
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-xs font-bold leading-none text-white transition-transform duration-150">
        ✓
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
    <span className="text-foreground transition-colors group-hover:text-foreground/90">{children}</span>
  </label>
))
Checkbox.displayName = 'Checkbox'

export const Switch = forwardRef<HTMLButtonElement, SwitchPrimitive.SwitchProps>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      'peer relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-slate-300 dark:border-slate-700/80 transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:shadow-[0_0_12px_rgba(7,85,143,0.35)] data-[state=unchecked]:bg-slate-200 dark:data-[state=unchecked]:bg-slate-800 hover:data-[state=unchecked]:bg-slate-300 dark:hover:data-[state=unchecked]:bg-slate-700 active:scale-[0.97]',
      className
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb
      className="pointer-events-none block size-5 rounded-full shadow-md transition-all duration-300 cubic-bezier(0.34, 1.25, 0.64, 1) data-[state=checked]:translate-x-[21px] data-[state=checked]:bg-white dark:data-[state=checked]:bg-white data-[state=checked]:shadow-[0_2px_6px_rgba(0,0,0,0.3)] data-[state=unchecked]:translate-x-[1px] data-[state=unchecked]:bg-slate-400 dark:data-[state=unchecked]:bg-slate-500"
    />
  </SwitchPrimitive.Root>
))
Switch.displayName = 'Switch'

export function SegmentedControl({ value, onValueChange, options, label }: { value: string; onValueChange: (v: string) => void; options: SelectOption[]; label: string }) {
  return <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border bg-muted p-1">{options.map((o) => <button key={o.value} role="radio" aria-checked={value === o.value} type="button" onClick={() => onValueChange(o.value)} className={cn('rounded-md px-3 py-1.5 text-sm font-medium transition-colors', value === o.value ? 'bg-background shadow-xs text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground')}>{o.label}</button>)}</div>
}

export { control as controlClassName }
