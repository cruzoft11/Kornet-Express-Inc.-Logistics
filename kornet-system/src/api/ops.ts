import { apiDelete, apiGet, apiPatch, apiPost } from './client'

export type WorkspaceMode = 'OCEAN_EXPORT' | 'OCEAN_IMPORT' | 'AIR_EXPORT' | 'AIR_IMPORT' | 'DOMESTIC'
export type ApiList<T> = { data: T[]; total: number; page: number; pageSize: number }
export type LookupOption = { id: string; code?: string; label: string; description?: string; raw?: Record<string, unknown> }

export type ChargeLine = {
  id?: string
  quoteId?: string | null
  shipmentId?: string | null
  billingCode: string
  description: string
  chargeSide?: string
  freightTerm?: string
  billParty?: string
  billToPartyId?: string | null
  unit: string
  qty: number
  rate: number
  minAmount?: number
  currency: string
  exchangeRate: number
  amount?: number
  amountPhp?: number
  vatClass?: string
  vatAmountPhp?: number
  showOnDoc?: boolean
  costVendorPartyId?: string | null
  costQty?: number
  costRate?: number
  costCurrency?: string
  costExchangeRate?: number
  costAmount?: number
  costAmountPhp?: number
  billStatus?: string
  costStatus?: string
  status?: string
  source?: string
  sortOrder?: number
  notes?: string
  version?: number
}

export type CargoLine = {
  id?: string
  shipmentId?: string | null
  quoteId?: string | null
  transportDocId?: string | null
  containerId?: string | null
  lineNo: number
  pieces: number
  packageType: string
  description: string
  marks?: string
  hsCode?: string
  lengthCm: number
  widthCm: number
  heightCm: number
  grossKg: number
  cbm?: number
  volumetricKg?: number
  chargeableKg?: number
  rateClass?: string
  commodityItemNo?: string
  unNumber?: string
  hazardous?: boolean
  version?: number
}

export type ContainerLine = {
  id?: string
  shipmentId: string
  transportDocId?: string | null
  equipmentType: string
  containerNo: string
  sealNo?: string
  sealNo2?: string
  tareKg?: number
  maxPayloadKg?: number
  maxCbm?: number
  pieces?: number
  grossKg?: number
  cbm?: number
  vgmKg?: number
  temperatureC?: number | null
  ventSetting?: string
  hazmat?: boolean
  unNumbers?: string
  status?: string
  version?: number
}

export type TransportDoc = {
  id?: string
  shipmentId: string
  docType: string
  docClass: string
  docNo?: string
  parentDocId?: string | null
  freightTerm?: string
  issuePlace?: string
  issueDate?: string | null
  onBoardDate?: string | null
  numberOfOriginals?: number
  releaseType?: string
  shipperName?: string
  shipperAddress?: string
  consigneeName?: string
  consigneeAddress?: string
  notifyName?: string
  notifyAddress?: string
  agentName?: string
  agentAddress?: string
  pol?: string
  pod?: string
  toByFirstCarrier?: string
  transfers?: string
  handlingInfo?: string
  accountingInfo?: string
  wtValPC?: string
  otherPC?: string
  declaredValueCarriage?: number
  declaredValueCustoms?: number
  amountInsurance?: number
  sci?: string
  status?: string
  version?: number
}

export type Quote = {
  id: string
  quoteNo: string
  date?: string
  validUntil?: string | null
  status: string
  mode: string
  direction?: string
  freightTerm?: string
  customerPartyId?: string | null
  contact?: string
  placeOfReceipt?: string
  pol?: string
  transshipment?: string
  pod?: string
  finalDestination?: string
  carrierPartyId?: string | null
  serviceLevel?: string
  incoterm?: string
  currency?: string
  exchangeRate?: number
  declaredValue?: number
  insuredValue?: number
  commodity?: string
  notes?: string
  convertedShipmentId?: string | null
  version?: number
  cargoLines?: CargoLine[]
  charges?: ChargeLine[]
  createdAt?: string
  updatedAt?: string
}

export type Shipment = {
  id: string
  fileNo: string
  mode: string
  direction: string
  fileType?: string
  loadType?: string
  status: string
  division?: string
  quoteId?: string | null
  bookingNo?: string
  carrierBookingRef?: string
  customerRef?: string
  freightTerm?: string
  incoterm?: string
  carrierPartyId?: string | null
  vessel?: string
  voyage?: string
  flightNo?: string
  placeOfReceipt?: string
  polCode?: string
  transshipCode?: string
  podCode?: string
  placeOfDelivery?: string
  finalDestination?: string
  etd?: string | null
  eta?: string | null
  atd?: string | null
  ata?: string | null
  docCutoff?: string | null
  cargoCutoff?: string | null
  shipperPartyId?: string | null
  consigneePartyId?: string | null
  notifyPartyId?: string | null
  agentPartyId?: string | null
  brokerPartyId?: string | null
  forwardingAgentPartyId?: string | null
  billToPartyId?: string | null
  coloaderPartyId?: string | null
  countryOfOrigin?: string
  commodity?: string
  hsCode?: string
  marksNumbers?: string
  goodsDescription?: string
  declaredValue?: number
  insuredValue?: number
  currency?: string
  exchangeRate?: number
  totalPieces?: number
  totalGrossKg?: number
  totalCbm?: number
  totalVolumetricKg?: number
  totalChargeableKg?: number
  totalWmTons?: number
  entryNo?: string
  entryDate?: string | null
  itNo?: string
  itDate?: string | null
  itPort?: string
  goNo?: string
  goDate?: string | null
  availableDate?: string | null
  freeTimeExpires?: string | null
  cargoLocationPartyId?: string | null
  customsStatus?: string
  remarks?: string
  closedAt?: string | null
  marginOverrideReason?: string
  reopenReason?: string
  shipperName?: string
  shipperAddress?: string
  consigneeName?: string
  consigneeAddress?: string
  notifyName?: string
  notifyAddress?: string
  version?: number
  cargoLines?: CargoLine[]
  containers?: ContainerLine[]
  transportDocs?: TransportDoc[]
  charges?: ChargeLine[]
  createdAt?: string
  updatedAt?: string
}

export type StatusEvent = { id: string; entityType: string; entityId: string; code: string; subStatus?: string; location?: string; eventAt?: string; notes?: string; isPublic?: boolean; source?: string; createdAt?: string }
export type CloseCheck = { ok: boolean; blockers: string[]; warnings: string[] }
export type DocumentPayload = { kind: string; company?: Record<string, unknown>; settings?: Record<string, unknown>; ports?: Record<string, unknown>[]; shipment: Shipment; cargo: CargoLine[]; containers: ContainerLine[]; charges: ChargeLine[]; generatedAt: string }

export function shipmentModeParts(mode: WorkspaceMode): { mode: string; direction: string; label: string; path: string } {
  const map: Record<WorkspaceMode, { mode: string; direction: string; label: string; path: string }> = {
    OCEAN_EXPORT: { mode: 'OCEAN', direction: 'EXPORT', label: 'Ocean Export', path: '/logistics/ocean-export' },
    OCEAN_IMPORT: { mode: 'OCEAN', direction: 'IMPORT', label: 'Ocean Import', path: '/logistics/ocean-import' },
    AIR_EXPORT: { mode: 'AIR', direction: 'EXPORT', label: 'Air Export', path: '/logistics/air-export' },
    AIR_IMPORT: { mode: 'AIR', direction: 'IMPORT', label: 'Air Import', path: '/logistics/air-import' },
    DOMESTIC: { mode: 'DOMESTIC', direction: 'DOMESTIC', label: 'Domestic', path: '/logistics/domestic' },
  }
  return map[mode]
}

function qs(params: Record<string, unknown>) {
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    sp.set(key, String(value))
  })
  const text = sp.toString()
  return text ? `?${text}` : ''
}

export const opsApi = {
  listQuotes: (params: Record<string, unknown> = {}) => apiGet<ApiList<Quote>>(`/quotes${qs({ include: 'relations', pageSize: 200, ...params })}`),
  getQuote: (id: string) => apiGet<Quote>(`/quotes/${id}?include=relations`),
  createQuote: (body: Partial<Quote>) => apiPost<Quote>('/quotes', body),
  updateQuote: (id: string, body: Partial<Quote>) => apiPatch<Quote>(`/quotes/${id}`, body),
  deleteQuote: (id: string) => apiDelete(`/quotes/${id}`),
  convertQuote: (id: string) => apiPost<Shipment>(`/quotes/${id}/convert`),

  listShipments: (params: Record<string, unknown> = {}) => apiGet<ApiList<Shipment>>(`/shipments${qs({ include: 'relations', pageSize: 200, sort: '-updatedAt', ...params })}`),
  getShipment: (id: string) => apiGet<Shipment>(`/shipments/${id}?include=relations`),
  createShipment: (body: Partial<Shipment>) => apiPost<Shipment>('/shipments', body),
  updateShipment: (id: string, body: Partial<Shipment>) => apiPatch<Shipment>(`/shipments/${id}`, body),
  cloneShipment: (id: string) => apiPost<Shipment>(`/shipments/${id}/clone`),
  applyTariffs: (id: string) => apiPost<{ data: ChargeLine[] }>(`/shipments/${id}/apply-tariffs`),
  closeCheck: (id: string) => apiGet<CloseCheck>(`/shipments/${id}/close-check`),
  closeShipment: (id: string, overrideReason?: string) => apiPost<Shipment>(`/shipments/${id}/close`, { overrideReason }),
  reopenShipment: (id: string, reason: string) => apiPost<Shipment>(`/shipments/${id}/reopen`, { reason }),
  setShipmentStatus: (id: string, status: string, code = status, notes?: string) => apiPost<{ shipment: Shipment; event: StatusEvent }>(`/shipments/${id}/status`, { status, code, notes, isPublic: true }),
  generateInvoices: (id: string) => apiPost<unknown>(`/shipments/${id}/invoice`),
  generateApBills: (id: string) => apiPost<unknown>(`/shipments/${id}/ap-bills`),
  documentPayload: (id: string, kind: string) => apiGet<DocumentPayload>(`/shipments/${id}/documents/${kind}`),

  createCargoLine: (body: Partial<CargoLine>) => apiPost<CargoLine>('/cargo-lines', body),
  updateCargoLine: (id: string, body: Partial<CargoLine>) => apiPatch<CargoLine>(`/cargo-lines/${id}`, body),
  deleteCargoLine: (id: string) => apiDelete(`/cargo-lines/${id}`),
  createContainer: (body: Partial<ContainerLine>) => apiPost<ContainerLine>('/containers', body),
  updateContainer: (id: string, body: Partial<ContainerLine>) => apiPatch<ContainerLine>(`/containers/${id}`, body),
  deleteContainer: (id: string) => apiDelete(`/containers/${id}`),
  createCharge: (body: Partial<ChargeLine>) => apiPost<ChargeLine>('/charges', body),
  updateCharge: (id: string, body: Partial<ChargeLine>) => apiPatch<ChargeLine>(`/charges/${id}`, body),
  deleteCharge: (id: string) => apiDelete(`/charges/${id}`),
  createTransportDoc: (body: Partial<TransportDoc>) => apiPost<TransportDoc>('/transport-docs', body),
  updateTransportDoc: (id: string, body: Partial<TransportDoc>) => apiPatch<TransportDoc>(`/transport-docs/${id}`, body),
  deleteTransportDoc: (id: string) => apiDelete(`/transport-docs/${id}`),
  issueTransportDoc: (id: string) => apiPost<TransportDoc>(`/transport-docs/${id}/issue`),
  listStatusEvents: (entityType: string, entityId: string) => apiGet<ApiList<StatusEvent>>(`/status-events${qs({ entityType, entityId, q: entityId, pageSize: 100, sort: '-eventAt' })}`),
  createStatusEvent: (body: Partial<StatusEvent>) => apiPost<StatusEvent>('/status-events', body),

  lookupParties: async (q = '', role?: string): Promise<LookupOption[]> => {
    const res = await apiGet<ApiList<Record<string, unknown>>>(`/parties${qs({ q, pageSize: 20 })}`)
    return res.data
      .filter((row) => !role || row[role] !== false)
      .map((row) => ({ id: String(row.id), code: String(row.code ?? ''), label: String(row.name ?? row.code ?? ''), description: [row.code, row.address].filter(Boolean).join(' · '), raw: row }))
  },
  lookupPorts: async (q = '', kind?: string): Promise<LookupOption[]> => {
    const res = await apiGet<ApiList<Record<string, unknown>>>(`/ports${qs({ q, pageSize: 30 })}`)
    return res.data
      .filter((row) => !kind || String(row.kind ?? row.type ?? '').toUpperCase() === kind)
      .map((row) => ({ id: String(row.code ?? row.id), code: String(row.code ?? ''), label: `${String(row.code ?? '')} — ${String(row.name ?? '')}`, description: [row.unlocode, row.iata, row.country].filter(Boolean).join(' · '), raw: row }))
  },
  lookupBillingCodes: async (q = ''): Promise<LookupOption[]> => {
    const res = await apiGet<ApiList<Record<string, unknown>>>(`/billing-codes${qs({ q, pageSize: 30 })}`)
    return res.data.map((row) => ({ id: String(row.code ?? row.id), code: String(row.code ?? ''), label: `${String(row.code ?? '')} — ${String(row.description ?? '')}`, description: [row.defaultUnit, row.currency, row.vatClass].filter(Boolean).join(' · '), raw: row }))
  },
}
