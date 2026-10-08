const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 })
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
const number = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 2 })
const weight = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 3 })
const dateFmt = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Manila' })

export function formatMoney(value: number | null | undefined, currency = 'PHP') {
  const amount = Number(value ?? 0)
  if (currency === 'USD') return usd.format(amount)
  if (currency === 'PHP') return peso.format(amount)
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency }).format(amount)
}

export function formatNumber(value: number | null | undefined) {
  return number.format(Number(value ?? 0))
}

export function formatWeightKg(value: number | null | undefined) {
  return `${weight.format(Number(value ?? 0))} kg`
}

export function formatCbm(value: number | null | undefined) {
  return `${weight.format(Number(value ?? 0))} cbm`
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return '—'
  const d = typeof value === 'string' ? new Date(value) : value
  return Number.isNaN(d.getTime()) ? '—' : dateFmt.format(d)
}

export function parseDdMmYyyy(value: string) {
  const m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]))
  return Number.isNaN(d.getTime()) ? null : d
}

export function toInputDate(value: Date) {
  return value.toISOString().slice(0, 10)
}
