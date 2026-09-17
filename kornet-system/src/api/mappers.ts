// Mapping helpers between backend models (src/api/types.ts)
// and the UI/store models (src/stores/logisticsStore.ts).
import type {
  Shipment as ApiShipment,
  BillingLine as ApiBillingLine,
  CostLine as ApiCostLine,
  Vehicle as ApiVehicle,
  PdOrder as ApiPdOrder,
  Driver as ApiDriver,
  FleetVehicle as ApiFleetVehicle,
  DispatchRoute as ApiDispatchRoute,
  CheckDisbursement as ApiCheckDisbursement,
  BridgeItem as ApiBridgeItem,
  TrackingItem as ApiTrackingItem,
  WebAccount as ApiWebAccount,
} from './types'
import type {
  Shipment as StoreShipment,
  BillingLine as StoreBillingLine,
  CostLine as StoreCostLine,
  Vehicle as StoreVehicle,
  PDOrder as StorePDOrder,
  Driver as StoreDriver,
  FleetVehicle as StoreFleetVehicle,
  DispatchRoute as StoreDispatchRoute,
  CheckDisbursement as StoreCheckDisbursement,
  BridgeStagingItem as StoreBridgeStagingItem,
  TrackingItem as StoreTrackingItem,
  CustomerWebAccount as StoreCustomerWebAccount,
} from '../stores/logisticsStore'

const rid = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

// ─── Shipment Line items ──────────────────────────────────────
function apiBillingToStore(b: ApiBillingLine): StoreBillingLine {
  return {
    id: rid('b'),
    code: b.code ?? '',
    desc: b.description ?? '',
    amount: Number(b.amount ?? 0),
    prepaidOrCollect: 'Prepaid',
    customer: '',
    glAccount: '',
    rate: b.rate,
    qty: b.qty,
  }
}

function storeBillingToApi(b: StoreBillingLine): ApiBillingLine {
  return {
    code: b.code,
    description: b.desc,
    qty: b.qty,
    rate: b.rate,
    amount: Number(b.amount ?? 0),
    taxable: /vat/i.test(b.code ?? '') ? false : true,
  }
}

function apiCostToStore(c: ApiCostLine): StoreCostLine {
  return {
    id: rid('c'),
    code: c.code ?? '',
    desc: c.description ?? '',
    amount: Number(c.amount ?? 0),
    vendor: c.vendor ?? '',
    vendorId: '',
    glAccount: '',
  }
}

function storeCostToApi(c: StoreCostLine): ApiCostLine {
  return {
    code: c.code,
    description: c.desc,
    vendor: c.vendor,
    amount: Number(c.amount ?? 0),
  }
}

function typeToModeDirection(type: StoreShipment['type']): { mode: 'ocean' | 'air'; direction: string } {
  const isAir = type.startsWith('Air')
  const direction = type.endsWith('Import') ? 'Import' : 'Export'
  return { mode: isAir ? 'air' : 'ocean', direction }
}

function modeDirectionToType(mode: string, direction: string): StoreShipment['type'] {
  const head = mode === 'air' ? 'Air' : 'Ocean'
  const tail = /import/i.test(direction) ? 'Import' : 'Export'
  return `${head} ${tail}` as StoreShipment['type']
}

function normalizeStatus(status: string): StoreShipment['status'] {
  const s = (status || '').toLowerCase()
  if (s.includes('transfer')) return 'Transferred'
  if (s.includes('close')) return 'Closed'
  return 'Open'
}

// ─── Shipment: API <-> store ──────────────────────────────────
export function apiShipmentToStore(a: ApiShipment): StoreShipment {
  return {
    id: a.id,
    fileNo: a.fileNo,
    type: modeDirectionToType(a.mode, a.direction),
    bookingNo: a.bookingNo ?? '',
    blOrAwbNo: a.blAwbNo ?? '',
    status: normalizeStatus(a.status),
    shipper: a.shipperName ?? '',
    consignee: a.consigneeName ?? '',
    notifyParty: a.notifyParty ?? undefined,
    origin: a.originPort ?? '',
    destination: a.destinationPort ?? '',
    portOfLoading: a.originPort ?? undefined,
    portOfDischarge: a.destinationPort ?? undefined,
    vesselOrFlight: a.vesselOrFlight ?? '',
    voyageOrFlightNo: a.voyageOrFlightNo ?? '',
    etd: a.etd ?? undefined,
    eta: a.eta ?? undefined,
    pieces: Number(a.packages ?? 0),
    weightKg: Number(a.grossWeightKg ?? 0),
    volumeCbm: Number(a.volumeCbm ?? 0),
    chargeableWeightKg: a.chargeableWeight ? Number(a.chargeableWeight) : undefined,
    containerNo: a.containerNo ?? undefined,
    equipmentType: a.containerType ?? undefined,
    natureOfGoods: a.commodity ?? undefined,
    comments: a.remarks ?? undefined,
    billingLines: Array.isArray(a.billingLines) ? a.billingLines.map(apiBillingToStore) : [],
    costLines: Array.isArray(a.costLines) ? a.costLines.map(apiCostToStore) : [],
  }
}

export function storeShipmentToApiInput(s: StoreShipment): Record<string, unknown> {
  const { mode, direction } = typeToModeDirection(s.type)
  return {
    fileNo: s.fileNo,
    mode,
    direction,
    status: s.status,
    bookingNo: s.bookingNo || null,
    blAwbNo: s.blOrAwbNo || null,
    shipperName: s.shipper || null,
    consigneeName: s.consignee || null,
    notifyParty: s.notifyParty || null,
    originPort: s.portOfLoading || s.origin || null,
    destinationPort: s.portOfDischarge || s.destination || null,
    vesselOrFlight: s.vesselOrFlight || null,
    voyageOrFlightNo: s.voyageOrFlightNo || null,
    etd: s.etd || null,
    eta: s.eta || null,
    containerNo: s.containerNo || null,
    containerType: s.equipmentType || null,
    commodity: s.natureOfGoods || null,
    packages: s.pieces ?? 0,
    grossWeightKg: s.weightKg ?? 0,
    volumeCbm: s.volumeCbm ?? 0,
    chargeableWeight: s.chargeableWeightKg ?? 0,
    remarks: s.comments || null,
    billingLines: (s.billingLines ?? []).map(storeBillingToApi),
    costLines: (s.costLines ?? []).map(storeCostToApi),
  }
}

// ─── Vehicle: API <-> store ───────────────────────────────────
export function apiVehicleToStore(a: ApiVehicle): StoreVehicle {
  return {
    id: a.id,
    vin: a.vin,
    year: Number(a.year ?? 0),
    make: a.make ?? '',
    model: a.model ?? '',
    trim: '',
    bodyType: a.bodyClass ?? '',
    color: a.color ?? '',
    engine: a.engine ?? undefined,
    status: (a.status as StoreVehicle['status']) || 'Expected',
    titleStatus: (a.titleStatus as StoreVehicle['titleStatus']) || 'Pending',
    shipper: a.shipperName ?? '',
    consignee: a.consigneeName ?? '',
    warehouseLocation: a.warehouse ?? '',
    customsTitleRejected: Boolean(a.customsHold),
    lienReleaseCleared: Boolean(a.lienReleaseCleared),
    tentativeCleared: false,
    history: Array.isArray(a.history)
      ? (a.history as any[]).map((h) => ({
          status: String(h.status || 'Updated'),
          date: String(h.date || ''),
          time: String(h.time || ''),
          user: String(h.user || ''),
          comments: String(h.comments || ''),
        }))
      : [],
  }
}

export function storeVehicleToApiInput(v: StoreVehicle): Record<string, unknown> {
  return {
    vin: v.vin,
    year: v.year,
    make: v.make,
    model: v.model,
    bodyClass: v.bodyType,
    color: v.color,
    engine: v.engine || null,
    status: v.status,
    titleStatus: v.titleStatus,
    shipperName: v.shipper || null,
    consigneeName: v.consignee || null,
    warehouse: v.warehouseLocation || null,
    customsHold: Boolean(v.customsTitleRejected),
    lienReleaseCleared: Boolean(v.lienReleaseCleared),
    history: v.history || [],
  }
}

// ─── PDOrder: API <-> store ───────────────────────────────────
export function apiPdOrderToStore(a: ApiPdOrder): StorePDOrder {
  return {
    id: a.id,
    orderNo: a.orderNo,
    type: (a.type as StorePDOrder['type']) || 'Pickup',
    division: a.division ?? '',
    warehouse: a.warehouse ?? '',
    shipper: a.shipperName ?? '',
    consignee: a.consigneeName ?? '',
    origin: a.originAddr ?? '',
    destination: a.destAddr ?? '',
    status: (a.status as StorePDOrder['status']) || 'Scheduled',
    scheduledDate: a.scheduledAt ? a.scheduledAt.split('T')[0] : '',
    driver: a.driverName ?? '',
    barcode: a.barcode ?? a.orderNo,
    amount: 0,
    linkedWR: a.wrNo ?? undefined,
    cargoDetails: Array.isArray(a.cargoItems)
      ? a.cargoItems.map((c) => ({
          cargoType: c.description || '',
          qty: c.qty ?? 1,
          length: 0,
          width: 0,
          height: 0,
          unitWeight: c.weightKg ?? 0,
          totalWeight: c.weightKg ?? 0,
          cubic: c.volumeCbm ?? 0,
          location: '',
          bin: '',
          materialDescription: c.description || '',
          hazardous: false,
        }))
      : [],
  }
}

export function storePdOrderToApiInput(o: StorePDOrder): Record<string, unknown> {
  return {
    orderNo: o.orderNo,
    barcode: o.barcode || o.orderNo,
    status: o.status,
    type: o.type,
    shipperName: o.shipper || null,
    consigneeName: o.consignee || null,
    originAddr: o.origin || null,
    destAddr: o.destination || null,
    warehouse: o.warehouse || null,
    division: o.division || null,
    driverName: o.driver || null,
    driverPlate: null,
    equipment: o.equipmentType || null,
    scheduledAt: o.scheduledDate ? new Date(o.scheduledDate).toISOString() : null,
    cargoItems: (o.cargoDetails || []).map((c) => ({
      description: c.materialDescription || c.cargoType,
      qty: c.qty,
      weightKg: c.totalWeight,
      volumeCbm: c.cubic,
    })),
    wrNo: o.linkedWR || null,
  }
}

// ─── Driver: API <-> store ────────────────────────────────────
export function apiDriverToStore(a: ApiDriver): StoreDriver {
  return {
    id: a.id,
    code: `DRV-${a.id.slice(-4).toUpperCase()}`,
    name: a.name,
    licenseNo: a.licenseNo ?? '',
    phone: a.phone ?? '',
    branch: '',
    status: (a.status as StoreDriver['status']) || 'Available',
    assignedVehiclePlate: a.plateHint ?? undefined,
  }
}

export function storeDriverToApiInput(d: StoreDriver): Record<string, unknown> {
  return {
    name: d.name,
    licenseNo: d.licenseNo || null,
    phone: d.phone || null,
    plateHint: d.assignedVehiclePlate || null,
    status: d.status,
  }
}

// ─── FleetVehicle: API <-> store ──────────────────────────────
export function apiFleetVehicleToStore(a: ApiFleetVehicle): StoreFleetVehicle {
  const capacityParts = (a.capacity ?? '').match(/([\d.]+)\s*kg\s*\/\s*([\d.]+)\s*cbm/i)
  return {
    id: a.id,
    plateNo: a.plateNo,
    vehicleType: (a.type as StoreFleetVehicle['vehicleType']) || '10-Wheeler Wing Van',
    makeModel: a.make ?? '',
    capacityKg: capacityParts ? Number(capacityParts[1]) : 0,
    volumeCbm: capacityParts ? Number(capacityParts[2]) : 0,
    branch: '',
    status: (a.status as StoreFleetVehicle['status']) || 'Ready',
  }
}

export function storeFleetVehicleToApiInput(v: StoreFleetVehicle): Record<string, unknown> {
  return {
    plateNo: v.plateNo,
    type: v.vehicleType,
    make: v.makeModel,
    capacity: `${v.capacityKg} kg / ${v.volumeCbm} cbm`,
    status: v.status,
  }
}

// ─── DispatchRoute: API <-> store ─────────────────────────────
export function apiDispatchRouteToStore(a: ApiDispatchRoute): StoreDispatchRoute {
  return {
    id: a.id,
    dispatchNo: a.routeNo,
    originBranch: a.origin ?? '',
    destBranch: a.destination ?? '',
    waypoints: Array.isArray(a.stops) ? a.stops.map((s: any) => String(s.name || s)) : [],
    driverId: '',
    driverName: a.driverName ?? '',
    vehicleId: '',
    vehiclePlate: a.vehiclePlate ?? '',
    status: (a.stage as StoreDispatchRoute['status']) || 'Draft',
    cargoRef: a.cargoRef ?? '',
    orderType: 'Delivery',
    podSignature: a.podSignature ?? undefined,
    podReceiverName: a.podSignedBy ?? undefined,
    podDeliveredAt: a.podSignedAt ?? undefined,
    createdAt: a.createdAt || new Date().toISOString(),
  }
}

export function storeDispatchRouteToApiInput(r: StoreDispatchRoute): Record<string, unknown> {
  return {
    routeNo: r.dispatchNo,
    stage: r.status,
    origin: r.originBranch,
    destination: r.destBranch,
    driverName: r.driverName,
    vehiclePlate: r.vehiclePlate,
    cargoRef: r.cargoRef,
    podSignature: r.podSignature || null,
    podSignedBy: r.podReceiverName || null,
    podSignedAt: r.podDeliveredAt || null,
    stops: r.waypoints.map((w) => ({ name: w })),
  }
}

// ─── CheckDisbursement: API <-> store ─────────────────────────
export function apiCheckToStore(a: ApiCheckDisbursement): StoreCheckDisbursement {
  const checkDate = a.createdAt ? a.createdAt.split('T')[0] : ''
  return {
    id: a.id,
    checkNo: a.checkNo,
    checkType: 'COMPUTER',
    paymentType: 'PAYMENT',
    date: checkDate,
    glPeriod: checkDate ? `${checkDate.slice(5, 7)}-${checkDate.slice(0, 4)}` : '',
    status: (a.status?.toUpperCase() as StoreCheckDisbursement['status']) || 'OPEN',
    vendor: a.payee ?? '',
    amount: Number(a.amount ?? 0),
    isVoucher: true,
    bankName: a.bank ?? '',
    currency: a.currency ?? 'PHP',
    exchangeRate: 1,
    reference: a.memo ?? '',
    comments: a.memo ?? '',
    jeNo: a.jeNo ?? undefined,
    invoicesApplied: [],
  }
}

export function storeCheckToApiInput(c: StoreCheckDisbursement): Record<string, unknown> {
  return {
    checkNo: c.checkNo,
    status: c.status,
    payee: c.vendor,
    bank: c.bankName,
    amount: c.amount,
    currency: c.currency,
    memo: c.comments || c.reference,
    jeNo: c.jeNo || null,
  }
}

// ─── BridgeItem: API <-> store ────────────────────────────────
export function apiBridgeItemToStore(a: ApiBridgeItem): StoreBridgeStagingItem {
  return {
    id: a.id,
    sourceFileNo: a.sourceFileNo ?? a.refNo,
    sourceType: a.type.includes('AR') ? 'Ocean Export' : 'Ocean Import',
    customerOrVendor: a.party ?? '',
    docType: a.type.includes('AR') ? 'Invoice (AR)' : 'Payable Cost (AP)',
    billingOrCostCode: 'OFR',
    glAccount: a.glAccount ?? '',
    description: a.memo ?? '',
    amount: Number(a.debit || a.credit || 0),
    status: (a.status as StoreBridgeStagingItem['status']) || 'Staged',
    postedJvNo: undefined,
    postedAt: a.postedAt ?? undefined,
  }
}

export function storeBridgeItemToApiInput(b: StoreBridgeStagingItem): Record<string, unknown> {
  return {
    refNo: b.id,
    type: b.docType,
    status: b.status,
    sourceFileNo: b.sourceFileNo,
    party: b.customerOrVendor,
    glAccount: b.glAccount,
    debit: b.docType.includes('AR') ? b.amount : 0,
    credit: b.docType.includes('AP') ? b.amount : 0,
    currency: 'PHP',
    memo: b.description,
  }
}

// ─── TrackingItem: API <-> store ──────────────────────────────
export function apiTrackingToStore(a: ApiTrackingItem): StoreTrackingItem {
  return {
    id: a.id,
    refType: (a.refType as StoreTrackingItem['refType']) || 'Ocean BL',
    refNo: a.trackingNo,
    shipper: a.shipperName ?? '',
    consignee: a.consigneeName ?? '',
    origin: a.origin ?? '',
    destination: a.destination ?? '',
    scheduleDate: a.createdAt ? a.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
    currentStatus: a.status ?? 'In Transit',
    currentSubStatus: 'Live Tracking Updated',
    history: Array.isArray(a.milestones)
      ? (a.milestones as any[]).map((m: any) => ({
          id: rid('m'),
          date: m.at ? m.at.split('T')[0] : new Date().toISOString().split('T')[0],
          time: m.at ? new Date(m.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '12:00 PM',
          status: m.status || 'In Transit',
          subStatus: m.note || '',
          description: m.note || '',
          updatedBy: 'SYSTEM',
          location: m.location || '',
        }))
      : [],
    attachments: [],
  }
}

export function storeTrackingToApiInput(t: StoreTrackingItem): Record<string, unknown> {
  return {
    trackingNo: t.refNo,
    refType: t.refType,
    status: t.currentStatus,
    shipperName: t.shipper,
    consigneeName: t.consignee,
    origin: t.origin,
    destination: t.destination,
    milestones: t.history.map((h) => ({
      status: h.status,
      note: h.description,
      location: h.location,
      at: `${h.date}T${h.time}:00Z`,
    })),
  }
}

// ─── CustomerWebAccount: API <-> store ─────────────────────────
export function apiWebAccountToStore(a: ApiWebAccount): StoreCustomerWebAccount {
  return {
    id: a.id,
    accountNo: `ACC-${a.id.slice(-4).toUpperCase()}`,
    customerName: a.customerName,
    userId: a.username,
    passwordHash: '••••••••',
    isAgent: false,
    permissions: {
      canViewTracking: Boolean(a.canTrack),
      canDownloadPOD: Boolean(a.canDownloadPod),
      canUploadDocs: Boolean(a.canUploadDocs),
      canViewInvoices: Boolean(a.canViewInvoices),
      tradeShowMgmt: 'None',
      poMgmt: 'Standard',
    },
  }
}

export function storeWebAccountToApiInput(w: StoreCustomerWebAccount): Record<string, unknown> {
  return {
    customerName: w.customerName,
    username: w.userId,
    canTrack: w.permissions.canViewTracking,
    canDownloadPod: w.permissions.canDownloadPOD,
    canUploadDocs: w.permissions.canUploadDocs,
    canViewInvoices: w.permissions.canViewInvoices,
  }
}
