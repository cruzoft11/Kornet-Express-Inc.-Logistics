import { api } from './client'

export interface MapAirport {
  code: string
  icao: string
  name: string
  municipality: string
  latitude: number
  longitude: number
  source: string
}

export interface MapPort {
  id: string
  code: string
  unlocode: string | null
  name: string
  country: string
  kind: string
  type: string
  iata: string | null
  latitude: number | null
  longitude: number | null
  locationSource: string | null
  approximate?: boolean
  editable?: boolean
}

export interface MapAsset {
  id: string
  externalId: string
  provider: 'adsb.lol' | 'OpenSeaFeed' | 'SIMULATED'
  type: 'aircraft' | 'vessel'
  name: string
  latitude: number
  longitude: number
  observedAt: string
  track: Array<[number, number]>
  callsign?: string
  registration?: string
  model?: string
  speedKnots?: number
  headingDegrees?: number
  altitudeFeet?: number
  origin?: string
  destination?: string
  eta?: string
  status?: string
  shipment?: { id: string; fileNo: string; status: string } | null
}

export interface MapProviderState {
  status: 'live' | 'waiting' | 'disabled' | 'unavailable' | 'simulated'
  message: string
  updatedAt?: string
  coverage?: string[]
}

export interface TrackingSnapshot {
  assets: MapAsset[]
  sources: { aircraft: MapProviderState; vessels: MapProviderState }
}

export interface MapFinancialPoint {
  partyId: string
  name: string
  latitude: number
  longitude: number
  locationSource: string | null
  sales: number
  cashCollected: number
  ewtWithheld: number
}

export interface UnmappedMapCustomer {
  partyId: string
  name: string
  sales: number
  cashCollected: number
  ewtWithheld: number
}

export interface FinancialMapData {
  period: '30d' | '90d' | 'ytd'
  from: string
  to: string
  metricDefinitions: Record<string, string>
  points: MapFinancialPoint[]
  unmappedCustomers: UnmappedMapCustomer[]
}

export interface MapShipment {
  id: string
  fileNo: string
  status: string
  mode: string
  vessel: string | null
  voyage: string | null
  flightNo: string | null
}

export async function getMapReferences() {
  const response = await api.get<{ airports: MapAirport[]; ports: MapPort[]; attribution: Record<string, string> }>('/map/references')
  return response.data
}

export async function getTrackingSnapshot(mode: 'live' | 'simulated') {
  const response = await api.get<TrackingSnapshot>('/map/assets', { params: mode === 'simulated' ? { mode } : undefined })
  return response.data
}

export async function getFinancialMapData(period: FinancialMapData['period']) {
  const response = await api.get<FinancialMapData>('/map/financial', { params: { period } })
  return response.data
}

export async function searchMapShipments(query: string) {
  const response = await api.get<{ data: MapShipment[] }>('/map/shipments', { params: { q: query } })
  return response.data.data
}

export async function linkMapAsset(input: {
  assetType: 'AIRCRAFT' | 'VESSEL'
  provider: 'adsb.lol' | 'OpenSeaFeed'
  externalId: string
  shipmentId: string
}) {
  const response = await api.post('/map/links', input)
  return response.data
}

export async function updateMapLocation(path: string, latitude: number | null, longitude: number | null) {
  const response = await api.patch(path, { latitude, longitude })
  return response.data
}

export async function previewCustomerGeocode(partyId: string) {
  const response = await api.post<{
    customerId: string
    previewId: string
    latitude: number
    longitude: number
    formatted: string
    confidence: number | null
    provider: string
    saved: false
  }>(`/map/customers/${partyId}/geocode-preview`)
  return response.data
}

export async function acceptCustomerGeocode(partyId: string, previewId: string) {
  const response = await api.post(`/map/customers/${partyId}/geocode-accept`, { previewId })
  return response.data
}
