import { airChargeableKg, airVolumetricKg, cbm, chargeAmount, deriveChargeQty, fileMarginPct, oceanWmTons, round2 } from '@/lib/calc'
import type { CargoLine, ChargeLine, ContainerLine, Shipment, WorkspaceMode } from '@/api/ops'

export const STATUS_STEPS = ['BOOKED', 'DOCS_PENDING', 'READY_TO_LOAD', 'LOADED', 'DEPARTED', 'IN_TRANSIT', 'ARRIVED_AT_ORIGIN', 'ARRIVED', 'CUSTOMS_HOLD', 'CLEARED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CLOSED', 'CANCELLED']
export const QUOTE_STATUSES = ['DRAFT', 'FOR_REVIEW', 'SENT', 'FOLLOW_UP', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED', 'CANCELLED']
export const FREIGHT_TERMS = ['PREPAID', 'COLLECT', 'THIRD_PARTY', 'CHARGE_TO_CLIENT', 'PP_AND_ADD', 'CC_AND_ADD']
export const INCOTERMS = ['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP']
export const LOAD_TYPES = ['FCL', 'LCL', 'BREAKBULK', 'RORO', 'AIR_GENERAL', 'AIR_CHARTER', 'AIR_COURIER', 'LTL', 'FTL', 'MIXED']
export const EQUIPMENT_TYPES = ['20GP', '40GP', '40HC', '45HC', '20RF', '40RF', '20OT', '40OT', '20FR', '40FR', '20TK']
export const CHARGE_UNITS = ['PER_SHPT', 'PER_BL', 'PER_AWB', 'PER_FILE', 'PER_CNTR', 'PER_KG', 'PER_CBM', 'PER_WM', 'PER_PC', 'PER_UNIT', 'PER_TON', 'PER_RUN', 'PER_DAY', 'PCT', 'MANUAL']
export const VAT_CLASSES = ['VATABLE', 'ZERO_RATED', 'EXEMPT', 'NON_VAT_REIMBURSABLE', 'GOV_EXEMPT']

export function isAirMode(mode: WorkspaceMode | string) {
  return String(mode).includes('AIR')
}

export function isOceanMode(mode: WorkspaceMode | string) {
  return String(mode).includes('OCEAN')
}

export function toDateInput(value?: string | null) {
  return value ? value.slice(0, 10) : ''
}

export function fromDateInput(value: string) {
  return value ? new Date(`${value}T00:00:00`).toISOString() : null
}

export function newCargoLine(lineNo: number): CargoLine {
  return { lineNo, pieces: 1, packageType: 'PKG', description: '', marks: '', lengthCm: 0, widthCm: 0, heightCm: 0, grossKg: 0, cbm: 0, volumetricKg: 0, chargeableKg: 0 }
}

export function computeCargoLine(line: CargoLine, air: boolean): CargoLine {
  const pieces = Number(line.pieces || 0)
  const grossKg = Number(line.grossKg || 0)
  const volume = cbm(Number(line.lengthCm || 0), Number(line.widthCm || 0), Number(line.heightCm || 0), pieces)
  const volKg = airVolumetricKg(Number(line.lengthCm || 0), Number(line.widthCm || 0), Number(line.heightCm || 0), pieces)
  return { ...line, pieces, grossKg, cbm: volume, volumetricKg: volKg, chargeableKg: air ? airChargeableKg(grossKg, volKg) : oceanWmTons(grossKg, volume) }
}

export function cargoTotals(lines: CargoLine[], air: boolean) {
  return lines.map((line) => computeCargoLine(line, air)).reduce((acc, line) => ({
    pieces: acc.pieces + Number(line.pieces || 0),
    grossKg: round2(acc.grossKg + Number(line.grossKg || 0)),
    cbm: round2(acc.cbm + Number(line.cbm || 0)),
    volumetricKg: round2(acc.volumetricKg + Number(line.volumetricKg || 0)),
    chargeableKg: round2(acc.chargeableKg + Number(line.chargeableKg || 0)),
  }), { pieces: 0, grossKg: 0, cbm: 0, volumetricKg: 0, chargeableKg: 0 })
}

export function chargeContext(shipment: Partial<Shipment>, cargo: CargoLine[], containers: ContainerLine[], air: boolean) {
  const totals = cargoTotals(cargo, air)
  return {
    containerCount: containers.length,
    chargeableKg: air ? totals.chargeableKg : Number(shipment.totalChargeableKg || totals.grossKg),
    cbm: totals.cbm,
    wmTons: oceanWmTons(totals.grossKg, totals.cbm),
    pieces: totals.pieces,
    units: 1,
    percentBase: Number(shipment.declaredValue || 0),
  }
}

export function computeChargeLine(line: ChargeLine, shipment: Partial<Shipment>, cargo: CargoLine[], containers: ContainerLine[], air: boolean): ChargeLine {
  const context = chargeContext(shipment, cargo, containers, air)
  const qty = line.unit === 'MANUAL' ? Number(line.qty || 0) : deriveChargeQty(line.unit, context)
  const exchangeRate = Number(line.exchangeRate || 1) || 1
  const costExchangeRate = Number(line.costExchangeRate || exchangeRate) || 1
  const amount = chargeAmount(qty, Number(line.rate || 0), Number(line.minAmount || 0))
  const costQty = Number(line.costQty ?? qty)
  const costAmount = chargeAmount(costQty, Number(line.costRate || 0), 0)
  return { ...line, qty, exchangeRate, amount, amountPhp: round2(amount * exchangeRate), costQty, costExchangeRate, costAmount, costAmountPhp: round2(costAmount * costExchangeRate) }
}

export function financialTotals(charges: ChargeLine[]) {
  const bill = round2(charges.reduce((sum, line) => sum + Number(line.amountPhp ?? line.amount ?? 0), 0))
  const cost = round2(charges.reduce((sum, line) => sum + Number(line.costAmountPhp ?? line.costAmount ?? 0), 0))
  const profit = round2(bill - cost)
  return { bill, cost, profit, margin: fileMarginPct(bill, cost) }
}

export function validateIso6346(containerNo: string) {
  const value = containerNo.replace(/\s|-/g, '').toUpperCase()
  if (!value) return ''
  if (!/^[A-Z]{4}\d{7}$/.test(value)) return 'Use ISO 6346 format: ABCD1234567.'
  const map: Record<string, number> = {}
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach((letter, index) => {
    let v = index + 10
    while (String(v).includes('11') || v % 11 === 0) v += 1
    map[letter] = v
  })
  const chars = value.slice(0, 10).split('')
  const sum = chars.reduce((acc, char, index) => acc + (Number.isNaN(Number(char)) ? map[char] : Number(char)) * (2 ** index), 0)
  const check = sum % 11 % 10
  return check === Number(value[10]) ? '' : `Check digit should be ${check}.`
}

export function validateMawb(docNo: string) {
  const value = docNo.replace(/\D/g, '')
  if (!value) return ''
  if (!/^\d{11}$/.test(value)) return 'MAWB must be 11 digits.'
  const serial = Number(value.slice(3, 10))
  const check = serial % 7
  return check === Number(value[10]) ? '' : `Mod-7 check digit should be ${check}.`
}

export function apiErrorMessage(error: unknown) {
  const maybe = error as { response?: { data?: { message?: string; error?: string } }; message?: string }
  return maybe.response?.data?.message ?? maybe.response?.data?.error ?? maybe.message ?? 'Request failed.'
}
