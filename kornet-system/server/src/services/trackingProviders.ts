import WebSocket from 'ws'

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

export interface ProviderState {
  status: 'live' | 'waiting' | 'disabled' | 'unavailable' | 'simulated'
  message: string
  updatedAt?: string
  coverage?: string[]
}

export interface TrackingSnapshot {
  assets: MapAsset[]
  sources: { aircraft: ProviderState; vessels: ProviderState }
}

type JsonRecord = Record<string, unknown>
type FlightResult = { assets: MapAsset[]; state: ProviderState }

const PHILIPPINES = { south: 4.4, west: 116.8, north: 21.5, east: 126.8 }
const AIRCRAFT_REGIONS = [
  { name: 'Luzon / Manila', latitude: 14.5086, longitude: 121.02, radiusNm: 250 },
  { name: 'Visayas / Cebu', latitude: 10.3093, longitude: 123.9797, radiusNm: 250 },
  { name: 'Mindanao / Davao', latitude: 7.1255, longitude: 125.646, radiusNm: 220 },
]
const MAX_TRACK_POINTS = 40
const AIRCRAFT_CACHE_MS = 45_000
const VESSEL_STALE_MS = 15 * 60_000

const aircraftTracks = new Map<string, Array<[number, number]>>()
const vesselAssets = new Map<string, MapAsset>()
let aircraftCache: { expiresAt: number; promise: Promise<FlightResult> } | undefined
let vesselSocket: WebSocket | undefined
let vesselRetry: NodeJS.Timeout | undefined
let vesselRetryDelayMs = 2_000
let vesselLastMessageAt: Date | undefined
let vesselError: string | undefined
let vesselStarted = false

function record(value: unknown): JsonRecord | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as JsonRecord : undefined
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

function isPhilippinePosition(latitude: number, longitude: number) {
  return latitude >= PHILIPPINES.south && latitude <= PHILIPPINES.north
    && longitude >= PHILIPPINES.west && longitude <= PHILIPPINES.east
}

function addTrackPoint(cache: Map<string, Array<[number, number]>>, id: string, latitude: number, longitude: number) {
  const points = cache.get(id) ?? []
  const previous = points[points.length - 1]
  if (!previous || Math.abs(previous[0] - longitude) > 0.005 || Math.abs(previous[1] - latitude) > 0.005) {
    points.push([longitude, latitude])
    if (points.length > MAX_TRACK_POINTS) points.splice(0, points.length - MAX_TRACK_POINTS)
  }
  cache.set(id, points)
  return points
}

function parseAircraft(value: unknown): MapAsset | undefined {
  const row = record(value)
  if (!row) return undefined
  const externalId = stringValue(row.hex)?.toLowerCase()
  const latitude = numberValue(row.lat)
  const longitude = numberValue(row.lon)
  if (!externalId || latitude === undefined || longitude === undefined || !isPhilippinePosition(latitude, longitude)) return undefined

  const positionAgeSeconds = numberValue(row.seen_pos) ?? 0
  if (positionAgeSeconds > 900) return undefined
  const track = addTrackPoint(aircraftTracks, externalId, latitude, longitude)
  const flight = stringValue(row.flight)?.trim()
  const altitude = row.alt_baro === 'ground' ? undefined : numberValue(row.alt_baro)

  return {
    id: `adsb:${externalId}`,
    externalId,
    provider: 'adsb.lol',
    type: 'aircraft',
    name: flight || `Aircraft ${externalId.toUpperCase()}`,
    callsign: flight,
    registration: stringValue(row.r),
    model: stringValue(row.t),
    latitude,
    longitude,
    speedKnots: numberValue(row.gs),
    headingDegrees: numberValue(row.track),
    altitudeFeet: altitude,
    observedAt: new Date(Date.now() - positionAgeSeconds * 1_000).toISOString(),
    track: [...track],
  }
}

async function fetchAircraftRegion(region: (typeof AIRCRAFT_REGIONS)[number]): Promise<unknown> {
  const url = `https://api.adsb.lol/v2/point/${region.latitude}/${region.longitude}/${region.radiusNm}`
  const response = await fetch(url, {
    headers: { accept: 'application/json', 'user-agent': 'KornetExpressTracking/1.0' },
    signal: AbortSignal.timeout(7_000),
  })
  if (!response.ok) throw new Error(`ADSB.lol returned HTTP ${response.status} for ${region.name}`)
  return response.json()
}

async function queryAircraft(): Promise<FlightResult> {
  const responses = await Promise.allSettled(AIRCRAFT_REGIONS.map(async (region) => ({
    region,
    body: await fetchAircraftRegion(region),
  })))
  const assets = new Map<string, MapAsset>()
  const coverage: string[] = []
  const failures: string[] = []

  for (const response of responses) {
    if (response.status === 'rejected') {
      failures.push(response.reason instanceof Error ? response.reason.message : 'Aircraft provider request failed')
      continue
    }
    coverage.push(response.value.region.name)
    const body = record(response.value.body)
    const rows = Array.isArray(body?.ac) ? body.ac : []
    for (const row of rows) {
      const asset = parseAircraft(row)
      if (asset) assets.set(asset.externalId, asset)
    }
  }

  const now = new Date().toISOString()
  const state: ProviderState = coverage.length
    ? {
        status: 'live',
        message: failures.length
          ? `Partial live coverage; ${failures.length} regional request(s) failed.`
          : 'Live aircraft observations received. Aircraft type does not establish cargo status.',
        updatedAt: now,
        coverage,
      }
    : {
        status: 'unavailable',
        message: failures.join('; ') || 'Aircraft provider returned no regional responses.',
        updatedAt: now,
      }

  return { assets: [...assets.values()], state }
}

function getAircraft(): Promise<FlightResult> {
  const now = Date.now()
  if (aircraftCache && aircraftCache.expiresAt > now) return aircraftCache.promise
  const promise = queryAircraft()
  aircraftCache = { expiresAt: now + AIRCRAFT_CACHE_MS, promise }
  return promise
}

function receiveVesselMessage(data: WebSocket.RawData) {
  let payload: unknown
  try {
    payload = JSON.parse(data.toString())
  } catch (error) {
    console.warn('[tracking] Ignored invalid OpenSeaFeed message:', error)
    return
  }

  const outer = record(payload)
  const metadata = record(outer?.MetaData)
  const message = record(outer?.Message)
  const position = record(message?.PositionReport) ?? record(message?.StandardClassBPositionReport)
  if (!outer || !metadata || !position) return

  const externalId = stringValue(metadata.MMSI) ?? stringValue(metadata.mmsi)
  const latitude = numberValue(position.Latitude) ?? numberValue(position.latitude)
  const longitude = numberValue(position.Longitude) ?? numberValue(position.longitude)
  if (!externalId || latitude === undefined || longitude === undefined || !isPhilippinePosition(latitude, longitude)) return

  vesselLastMessageAt = new Date()
  vesselError = undefined
  const track = addTrackPointForVessel(externalId, latitude, longitude)
  const name = stringValue(metadata.ShipName) ?? stringValue(metadata.shipName) ?? `Vessel ${externalId}`
  const destination = stringValue(position.Destination) ?? stringValue(metadata.Destination)
  const eta = stringValue(position.ETA) ?? stringValue(metadata.ETA)
  vesselAssets.set(externalId, {
    id: `openseafeed:${externalId}`,
    externalId,
    provider: 'OpenSeaFeed',
    type: 'vessel',
    name,
    latitude,
    longitude,
    observedAt: vesselLastMessageAt.toISOString(),
    track,
    model: stringValue(metadata.ShipType) ?? stringValue(metadata.shipType),
    speedKnots: numberValue(position.Sog) ?? numberValue(position.SOG),
    headingDegrees: numberValue(position.Cog) ?? numberValue(position.COG) ?? numberValue(position.TrueHeading),
    destination,
    eta,
    status: stringValue(position.NavigationalStatus) ?? stringValue(position.Status),
  })
}

const vesselTracks = new Map<string, Array<[number, number]>>()

function addTrackPointForVessel(id: string, latitude: number, longitude: number) {
  return [...addTrackPoint(vesselTracks, id, latitude, longitude)]
}

function connectVesselFeed() {
  if (process.env.OPENSEAFEED_ENABLED !== 'true' || process.env.OPENSEAFEED_TERMS_APPROVED !== 'true') return
  if (vesselSocket && (vesselSocket.readyState === WebSocket.OPEN || vesselSocket.readyState === WebSocket.CONNECTING)) return

  vesselSocket = new WebSocket('wss://stream.openseafeed.com/v1/stream', { handshakeTimeout: 10_000 })
  vesselSocket.on('open', () => {
    vesselRetryDelayMs = 2_000
    vesselError = undefined
    const subscription: Record<string, unknown> = {
      BoundingBoxes: [[[PHILIPPINES.south, PHILIPPINES.west], [PHILIPPINES.north, PHILIPPINES.east]]],
    }
    if (process.env.OPENSEAFEED_API_KEY) subscription.APIKey = process.env.OPENSEAFEED_API_KEY
    vesselSocket?.send(JSON.stringify(subscription))
    console.info('[tracking] OpenSeaFeed AIS stream connected for the Philippines region.')
  })
  vesselSocket.on('message', receiveVesselMessage)
  vesselSocket.on('error', (error: any) => {
    vesselError = error?.message || String(error)
    console.warn('[tracking] OpenSeaFeed connection error:', error?.message || error)
  })
  vesselSocket.on('close', (code: any) => {
    vesselSocket = undefined
    vesselError = `OpenSeaFeed disconnected (code ${code}).`
    console.warn(`[tracking] ${vesselError}`)
    vesselRetry = setTimeout(connectVesselFeed, vesselRetryDelayMs)
    vesselRetry.unref()
    vesselRetryDelayMs = Math.min(vesselRetryDelayMs * 2, 60_000)
  })
}

export function initializeTrackingProviders() {
  if (vesselStarted) return
  vesselStarted = true
  if (process.env.OPENSEAFEED_ENABLED === 'true' && process.env.OPENSEAFEED_TERMS_APPROVED === 'true') {
    connectVesselFeed()
  }
}

function vesselProviderState(): ProviderState {
  if (process.env.OPENSEAFEED_ENABLED !== 'true') {
    return { status: 'disabled', message: 'OpenSeaFeed is disabled. Enable only after reviewing its current display and retention terms.' }
  }
  if (process.env.OPENSEAFEED_TERMS_APPROVED !== 'true') {
    return { status: 'disabled', message: 'OpenSeaFeed awaits explicit terms approval; no vessel data is being requested.' }
  }
  if (vesselLastMessageAt && Date.now() - vesselLastMessageAt.getTime() < 60_000) {
    return { status: 'live', message: 'Live AIS positions received.', updatedAt: vesselLastMessageAt.toISOString(), coverage: ['Philippines bounding box'] }
  }
  if (vesselSocket?.readyState === WebSocket.OPEN) {
    return { status: 'waiting', message: 'AIS stream connected; waiting for a position in the subscribed region.', updatedAt: vesselLastMessageAt?.toISOString() }
  }
  return { status: 'unavailable', message: vesselError ?? 'AIS stream is not connected.', updatedAt: vesselLastMessageAt?.toISOString() }
}

export async function getLiveTrackingSnapshot(): Promise<TrackingSnapshot> {
  const [aircraft, now] = await Promise.all([getAircraft(), Promise.resolve(Date.now())])
  const vessels = [...vesselAssets.values()].filter((asset) => now - new Date(asset.observedAt).getTime() <= VESSEL_STALE_MS)
  return {
    assets: [...aircraft.assets, ...vessels],
    sources: { aircraft: aircraft.state, vessels: vesselProviderState() },
  }
}

export function getSimulatedTrackingSnapshot(): TrackingSnapshot {
  const now = new Date().toISOString()
  return {
    sources: {
      aircraft: { status: 'simulated', message: 'SIMULATED demo assets; not an external aircraft feed.', updatedAt: now },
      vessels: { status: 'simulated', message: 'SIMULATED demo assets; not an external AIS feed.', updatedAt: now },
    },
    assets: [
      {
        id: 'demo-aircraft-01',
        externalId: 'DEMO-AIR-01',
        provider: 'SIMULATED',
        type: 'aircraft',
        name: 'Demo cargo aircraft 01',
        callsign: 'DEMO01',
        model: 'Illustrative wide-body',
        latitude: 13.45,
        longitude: 120.72,
        observedAt: now,
        origin: 'Manila (illustrative)',
        destination: 'Cebu (illustrative)',
        track: [[121.02, 14.51], [120.87, 14.12], [120.72, 13.45]],
      },
      {
        id: 'demo-vessel-01',
        externalId: 'DEMO-VESSEL-01',
        provider: 'SIMULATED',
        type: 'vessel',
        name: 'Demo cargo vessel 01',
        model: 'Illustrative container ship',
        latitude: 12.05,
        longitude: 122.4,
        observedAt: now,
        origin: 'Manila (illustrative)',
        destination: 'Cebu (illustrative)',
        speedKnots: 12.4,
        headingDegrees: 145,
        track: [[120.96, 14.58], [121.35, 13.55], [122.4, 12.05]],
      },
    ],
  }
}
