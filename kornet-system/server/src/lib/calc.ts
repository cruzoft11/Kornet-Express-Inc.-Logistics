export type ChargeUnit = 'PER_SHPT' | 'PER_BL' | 'PER_AWB' | 'PER_FILE' | 'PER_CNTR' | 'PER_KG' | 'PER_CBM' | 'PER_WM' | 'PER_PC' | 'PER_UNIT' | 'PCT' | 'MANUAL';

export function round2(value: number): number {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

export function cbm(lengthCm = 0, widthCm = 0, heightCm = 0, pcs = 1): number {
  return round2((lengthCm * widthCm * heightCm * pcs) / 1_000_000);
}

export function airVolumetricKg(lengthCm = 0, widthCm = 0, heightCm = 0, pcs = 1): number {
  return round2((lengthCm * widthCm * heightCm * pcs) / 6000);
}

export function courierVolumetricKg(lengthCm = 0, widthCm = 0, heightCm = 0, pcs = 1): number {
  return round2((lengthCm * widthCm * heightCm * pcs) / 5000);
}

export function airChargeableKg(grossKg = 0, volumetricKg = 0): number {
  return Math.ceil(Math.max(grossKg, volumetricKg) * 2) / 2;
}

export function oceanWmTons(grossKg = 0, volumeCbm = 0): number {
  return round2(Math.max(1, grossKg / 1000, volumeCbm));
}

export interface ChargeQtyContext {
  containerCount?: number;
  chargeableKg?: number;
  cbm?: number;
  wmTons?: number;
  pieces?: number;
  units?: number;
  percentBase?: number;
}

export function deriveChargeQty(unit: ChargeUnit | string, context: ChargeQtyContext = {}): number {
  switch (unit) {
    case 'PER_SHPT':
    case 'PER_BL':
    case 'PER_AWB':
    case 'PER_FILE':
      return 1;
    case 'PER_CNTR':
      return context.containerCount ?? 0;
    case 'PER_KG':
      return context.chargeableKg ?? 0;
    case 'PER_CBM':
      return context.cbm ?? 0;
    case 'PER_WM':
      return context.wmTons ?? 0;
    case 'PER_PC':
      return context.pieces ?? 0;
    case 'PER_UNIT':
      return context.units ?? 0;
    case 'PCT':
      return (context.percentBase ?? 0) / 100;
    default:
      return context.units ?? 1;
  }
}

export function chargeAmount(qty = 0, rate = 0, minAmount = 0): number {
  return round2(Math.max(qty * rate, minAmount || 0));
}

export function vatAmount(amountPhp = 0, vatClass = 'VATABLE', vatRate = 12): number {
  return vatClass === 'VATABLE' ? round2(amountPhp * (vatRate / 100)) : 0;
}

export function fileMarginPct(revenuePhp = 0, costPhp = 0): number {
  return revenuePhp > 0 ? round2(((revenuePhp - costPhp) / revenuePhp) * 100) : 0;
}
