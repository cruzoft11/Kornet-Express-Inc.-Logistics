import { useMemo, useState } from 'react'
import { ArrowDownUp, Download, EyeOff, Search } from 'lucide-react'
import * as XLSX from 'xlsx'
import { cn } from '@/lib/cn'
import { Button } from './button'
import { Checkbox, Input } from './inputs'
import { EmptyState, Skeleton } from './feedback'

export interface DataGridColumn<T> {
  id: string
  header: string
  accessor?: keyof T | ((row: T) => React.ReactNode)
  cell?: (row: T) => React.ReactNode
  sortable?: boolean
  className?: string
  hidden?: boolean
}

export function exportRowsToExcel<T extends Record<string, unknown>>(rows: T[], filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Export')
  XLSX.writeFile(workbook, filename)
}

export function DataGrid<T extends { id?: string | number }>({ columns, data, loading, emptyTitle = 'No records found', density = 'comfortable', onRowSelect, getRowId }: { columns: DataGridColumn<T>[]; data: T[]; loading?: boolean; emptyTitle?: string; density?: 'comfortable' | 'compact'; onRowSelect?: (rows: T[]) => void; getRowId?: (row: T, index: number) => string | number }) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<{ id: string; dir: 'asc' | 'desc' } | null>(null)
  const [hidden, setHidden] = useState<string[]>(columns.filter((c) => c.hidden).map((c) => c.id))
  const [selected, setSelected] = useState<Set<string | number>>(new Set())
  const visibleColumns = columns.filter((c) => !hidden.includes(c.id))
  const rows = useMemo(() => {
    let next = data.filter((row) => JSON.stringify(row).toLowerCase().includes(query.toLowerCase()))
    if (sort) {
      const col = columns.find((c) => c.id === sort.id)
      next = [...next].sort((a, b) => String(readCell(a, col)).localeCompare(String(readCell(b, col))) * (sort.dir === 'asc' ? 1 : -1))
    }
    return next
  }, [data, query, sort, columns])
  const toggleRow = (row: T, index: number) => {
    const id = getRowId?.(row, index) ?? row.id ?? index
    const next = new Set(selected)
    if (next.has(id)) next.delete(id); else next.add(id)
    setSelected(next)
    onRowSelect?.(data.filter((r, i) => next.has(getRowId?.(r, i) ?? r.id ?? i)))
  }
  return <div className="w-full min-w-0 overflow-hidden rounded-xl border bg-card shadow-xs"><div className="flex flex-wrap items-center justify-between gap-2 border-b p-2 sm:p-3"><Input leftIcon={<Search className="size-4" />} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter rows…" className="w-full sm:w-72" /><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => exportRowsToExcel(rows as Record<string, unknown>[], 'kornet-export.xlsx')}><Download className="size-4" />Excel</Button><Button variant="ghost" size="sm" onClick={() => setHidden([])}><EyeOff className="size-4" />Columns</Button></div></div><div className="w-full max-h-[62vh] overflow-x-auto overflow-y-auto custom-scrollbar"><table className="w-full min-w-full border-collapse text-sm"><thead className="sticky top-0 z-sticky bg-muted/95 backdrop-blur"><tr><th className="w-10 px-3 py-2 text-left"><span className="sr-only">Select</span></th>{visibleColumns.map((col) => <th key={col.id} className={cn('whitespace-nowrap border-b px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground', col.className)}>{col.sortable ? <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => setSort((s) => ({ id: col.id, dir: s?.id === col.id && s.dir === 'asc' ? 'desc' : 'asc' }))}>{col.header}<ArrowDownUp className="size-3" /></button> : col.header}</th>)}</tr></thead><tbody>{loading ? Array.from({ length: 8 }).map((_, i) => <tr key={i}>{visibleColumns.map((c) => <td key={c.id} className="px-3 py-2"><Skeleton className="h-5" /></td>)}</tr>) : rows.map((row, i) => <tr key={String(getRowId?.(row, i) ?? row.id ?? i)} tabIndex={0} className="border-b outline-none transition-colors duration-100 hover:bg-muted/50 focus:bg-muted/70" onKeyDown={(e) => { if (e.key === 'Enter') toggleRow(row, i) }}><td className="px-3 py-1"><Checkbox checked={selected.has(getRowId?.(row, i) ?? row.id ?? i)} onCheckedChange={() => toggleRow(row, i)} aria-label="Select row" /></td>{visibleColumns.map((col) => <td key={col.id} className={cn('px-3 tabular-nums', density === 'compact' ? 'py-1.5' : 'py-2.5', col.className)}>{col.cell ? col.cell(row) : readCell(row, col)}</td>)}</tr>)}</tbody></table>{!loading && rows.length === 0 && <div className="p-6"><EmptyState title={emptyTitle} description="Adjust filters or create a new record when you are ready." /></div>}</div></div>
}
function readCell<T>(row: T, col?: DataGridColumn<T>) { if (!col) return ''; if (col.accessor instanceof Function) return col.accessor(row); if (col.accessor) return row[col.accessor] as React.ReactNode; return '' }

export interface EditableColumn<T> { id: keyof T & string; header: string; type?: 'text' | 'number' | 'money'; readOnly?: boolean; compute?: (row: T) => React.ReactNode }
export function EditableGrid<T extends Record<string, unknown>>({ columns, rows, onRowsChange, createRow, footer }: { columns: EditableColumn<T>[]; rows: T[]; onRowsChange: (rows: T[]) => void; createRow: () => T; footer?: React.ReactNode }) {
  const update = (r: number, key: keyof T, value: string) => { const next = rows.map((row, i) => i === r ? { ...row, [key]: value } : row); onRowsChange(next) }
  const addRow = () => onRowsChange([...rows, createRow()])
  const deleteRow = (index: number) => onRowsChange(rows.filter((_, i) => i !== index))
  return <div className="w-full min-w-0 overflow-hidden rounded-xl border bg-card shadow-xs"><div className="w-full overflow-x-auto overflow-y-auto custom-scrollbar"><table className="w-full min-w-full text-sm"><thead className="bg-muted/70"><tr>{columns.map((c) => <th key={c.id} className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">{c.header}</th>)}<th className="w-16" /></tr></thead><tbody>{rows.map((row, r) => <tr key={r} className="border-t transition-colors hover:bg-muted/30">{columns.map((c, ci) => <td key={c.id} className="p-1"><input className={cn('h-8 w-full rounded-md border-0 bg-transparent px-2 text-xs focus:bg-background focus:ring-2 focus:ring-ring/30 sm:h-9 sm:text-sm', (c.type === 'number' || c.type === 'money') && 'text-right font-mono tabular-nums')} value={String(c.compute ? c.compute(row) : row[c.id] ?? '')} readOnly={c.readOnly || !!c.compute} onChange={(e) => update(r, c.id, e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && r === rows.length - 1 && ci === columns.length - 1) addRow(); if (e.key === 'Delete' && e.ctrlKey) deleteRow(r) }} /></td>)}<td className="p-1"><Button type="button" variant="ghost" size="sm" onClick={() => deleteRow(r)}>Delete</Button></td></tr>)}</tbody>{footer && <tfoot className="border-t bg-muted/60"><tr><td colSpan={columns.length + 1} className="px-3 py-2">{footer}</td></tr></tfoot>}</table></div><div className="border-t p-2"><Button type="button" variant="outline" size="sm" onClick={addRow}>Add row</Button></div></div>
}
