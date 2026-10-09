import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as maplibregl from 'maplibre-gl'
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  Anchor,
  Check,
  CircleDollarSign,
  Compass,
  Layers3,
  Moon,
  Mountain,
  Plane,
  Radio,
  RefreshCw,
  Search,
  Ship,
  Sun,
  X,
} from 'lucide-react'
import {
  acceptCustomerGeocode,
  getFinancialMapData,
  getMapReferences,
  getTrackingSnapshot,
  linkMapAsset,
  previewCustomerGeocode,
  searchMapShipments,
  updateMapLocation,
  type FinancialMapData,
  type MapAirport,
  type MapAsset,
  type MapFinancialPoint,
  type MapPort,
} from '@/api/map'
import { useAuthStore } from '@/stores/authStore'
import { formatDate, formatMoney } from '@/lib/format'

type Theme = 'light' | 'dark'
type FeedMode = 'live' | 'simulated'
type Metric = 'sales' | 'collections'
type Selection =
  | { kind: 'asset'; value: MapAsset }
  | { kind: 'airport'; value: MapAirport }
  | { kind: 'port'; value: MapPort }
  | { kind: 'customer'; value: Omit<MapFinancialPoint, 'latitude' | 'longitude'> & { latitude: number | null; longitude: number | null } }
type PointProperties = Record<string, string | number | null>
type MapFeatureCollection = GeoJSON.FeatureCollection<GeoJSON.Geometry, PointProperties>

const STYLES: Record<Theme, string> = {
  light: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/dark',
}
const TERRAIN_TILES = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'

function Switch({ active, children, onClick, disabled = false }: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition ${
        active
          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
          : 'border-border bg-card text-foreground hover:bg-muted'
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {children}
    </button>
  )
}

function ProviderStatus({ title, state }: {
  title: string
  state?: { status: string; message: string; updatedAt?: string; coverage?: string[] }
}) {
  if (!state) return null
  const color = state.status === 'live' ? 'bg-emerald-500' : state.status === 'simulated' ? 'bg-amber-500' : 'bg-slate-400'
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className={`mt-1.5 size-2 shrink-0 rounded-full ${color}`} />
      <div className="min-w-0">
        <div className="font-semibold">{title} · {state.status.toUpperCase()}</div>
        <div className="text-muted-foreground">{state.message}</div>
        {state.coverage?.length ? <div className="mt-0.5 text-muted-foreground">Coverage queried: {state.coverage.join(', ')}</div> : null}
      </div>
    </div>
  )
}

function LocationEditor({ latitude, longitude, saving, onSave }: {
  latitude: number | null
  longitude: number | null
  saving: boolean
  onSave: (latitude: number | null, longitude: number | null) => void
}) {
  const [lat, setLat] = useState(latitude === null ? '' : String(latitude))
  const [lon, setLon] = useState(longitude === null ? '' : String(longitude))
  const [error, setError] = useState('')

  function submit(clear = false) {
    if (clear) {
      setError('')
      onSave(null, null)
      return
    }
    const parsedLat = Number(lat)
    const parsedLon = Number(lon)
    if (!lat.trim() || !lon.trim() || !Number.isFinite(parsedLat) || !Number.isFinite(parsedLon)
      || parsedLat < -90 || parsedLat > 90 || parsedLon < -180 || parsedLon > 180) {
      setError('Enter a valid latitude and longitude.')
      return
    }
    setError('')
    onSave(parsedLat, parsedLon)
  }

  return (
    <div className="mt-4 space-y-2 rounded-xl border bg-muted/40 p-3">
      <p className="text-xs font-semibold">Verified map location</p>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[11px] text-muted-foreground">Latitude
          <input value={lat} onChange={(event) => setLat(event.target.value)} inputMode="decimal" className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm text-foreground" />
        </label>
        <label className="text-[11px] text-muted-foreground">Longitude
          <input value={lon} onChange={(event) => setLon(event.target.value)} inputMode="decimal" className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm text-foreground" />
        </label>
      </div>
      {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
      <div className="flex gap-2">
        <button type="button" disabled={saving} onClick={() => submit()} className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50">Save verified point</button>
        {(latitude !== null || longitude !== null) ? <button type="button" disabled={saving} onClick={() => submit(true)} className="rounded-md border px-3 py-1.5 text-xs disabled:opacity-50">Clear</button> : null}
      </div>
    </div>
  )
}

function featureCollection(airports: MapAirport[], ports: MapPort[], assets: MapAsset[], finance?: FinancialMapData, metric: Metric = 'sales'): { points: MapFeatureCollection; lines: MapFeatureCollection } {
  const features: MapFeatureCollection['features'] = []
  const lineFeatures: MapFeatureCollection['features'] = []

  for (const airport of airports) {
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [airport.longitude, airport.latitude] },
      properties: { id: airport.code, kind: 'airport', label: airport.code, title: airport.name },
    })
  }
  for (const port of ports) {
    if (port.latitude === null || port.longitude === null) continue
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [port.longitude, port.latitude] },
      properties: { id: port.id, kind: 'port', label: port.code, title: port.name },
    })
  }
  for (const asset of assets) {
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [asset.longitude, asset.latitude] },
      properties: { id: asset.id, kind: asset.type, label: asset.type === 'aircraft' ? '✈' : '●', title: asset.name },
    })
    if (asset.track.length > 1) {
      lineFeatures.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: asset.track },
        properties: { id: asset.id, kind: asset.type, title: asset.name },
      })
    }
  }
  for (const customer of finance?.points ?? []) {
    const amount = metric === 'sales' ? customer.sales : customer.cashCollected
    if (amount <= 0) continue
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [customer.longitude, customer.latitude] },
      properties: {
        id: customer.partyId,
        kind: 'customer',
        label: customer.name,
        title: customer.name,
        value: amount,
      },
    })
  }
  return {
    points: { type: 'FeatureCollection', features },
    lines: { type: 'FeatureCollection', features: lineFeatures },
  }
}

export function LogisticsMapPage() {
  const role = useAuthStore((state) => state.user?.role ?? 'viewer')
  const canViewFinancial = ['accountant', 'accounting', 'manager', 'admin', 'superadmin'].includes(role)
  const canManageLocations = ['manager', 'admin', 'superadmin'].includes(role)
  const canLinkAssets = ['operator', 'operations', 'manager', 'admin', 'superadmin'].includes(role)
  const queryClient = useQueryClient()
  const [theme, setTheme] = useState<Theme>(() => document.documentElement.classList.contains('dark') ? 'dark' : 'light')
  const [feedMode, setFeedMode] = useState<FeedMode>('live')
  const [terrain, setTerrain] = useState(false)
  const [showAirports, setShowAirports] = useState(true)
  const [showPorts, setShowPorts] = useState(true)
  const [showAssets, setShowAssets] = useState(true)
  const [showFinancial, setShowFinancial] = useState(false)
  const [metric, setMetric] = useState<Metric>('sales')
  const [period, setPeriod] = useState<FinancialMapData['period']>('30d')
  const [selection, setSelection] = useState<Selection | null>(null)
  const [shipmentSearch, setShipmentSearch] = useState('')
  const [geocodePreview, setGeocodePreview] = useState<Awaited<ReturnType<typeof previewCustomerGeocode>> | null>(null)
  const [mapError, setMapError] = useState('')
  const [mapReady, setMapReady] = useState(false)
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<MapLibreMap | null>(null)
  const layerData = useRef<{ points: MapFeatureCollection; lines: MapFeatureCollection }>({
    points: { type: 'FeatureCollection', features: [] },
    lines: { type: 'FeatureCollection', features: [] },
  })
  const layerOptions = useRef({ terrain, showAirports, showPorts, showAssets, showFinancial })
  const itemData = useRef({ airports: [] as MapAirport[], ports: [] as MapPort[], assets: [] as MapAsset[], customers: [] as MapFinancialPoint[] })
  const selectionSetter = useRef(setSelection)

  const referenceQuery = useQuery({ queryKey: ['map-references'], queryFn: getMapReferences })
  const assetQuery = useQuery({
    queryKey: ['map-assets', feedMode],
    queryFn: () => getTrackingSnapshot(feedMode),
    refetchInterval: feedMode === 'live' ? 30_000 : false,
  })
  const financeQuery = useQuery({
    queryKey: ['map-financial', period],
    queryFn: () => getFinancialMapData(period),
    enabled: showFinancial && canViewFinancial,
    refetchInterval: showFinancial ? 60_000 : false,
  })
  const shipmentQuery = useQuery({
    queryKey: ['map-shipments', shipmentSearch],
    queryFn: () => searchMapShipments(shipmentSearch),
    enabled: selection?.kind === 'asset' && canLinkAssets && shipmentSearch.trim().length >= 2,
  })
  const locationMutation = useMutation({
    mutationFn: ({ path, latitude, longitude }: { path: string; latitude: number | null; longitude: number | null }) => updateMapLocation(path, latitude, longitude),
    onSuccess: async () => {
      setGeocodePreview(null)
      setSelection(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['map-references'] }),
        queryClient.invalidateQueries({ queryKey: ['map-financial'] }),
      ])
    },
  })
  const geocodeMutation = useMutation({
    mutationFn: (partyId: string) => previewCustomerGeocode(partyId),
    onSuccess: (data) => setGeocodePreview(data),
  })
  const acceptGeocodeMutation = useMutation({
    mutationFn: ({ partyId, previewId }: { partyId: string; previewId: string }) => acceptCustomerGeocode(partyId, previewId),
    onSuccess: async () => {
      setGeocodePreview(null)
      await queryClient.invalidateQueries({ queryKey: ['map-financial'] })
    },
  })
  const linkMutation = useMutation({
    mutationFn: ({ asset, shipmentId }: { asset: MapAsset; shipmentId: string }) => linkMapAsset({
      assetType: asset.type === 'aircraft' ? 'AIRCRAFT' : 'VESSEL',
      provider: asset.provider as 'adsb.lol' | 'OpenSeaFeed',
      externalId: asset.externalId,
      shipmentId,
    }),
    onSuccess: async () => {
      setShipmentSearch('')
      setSelection(null)
      await queryClient.invalidateQueries({ queryKey: ['map-assets'] })
    },
  })

  const airports = referenceQuery.data?.airports ?? []
  const ports = referenceQuery.data?.ports ?? []
  const assets = assetQuery.data?.assets ?? []
  const finance = financeQuery.data
  const unmappedPorts = ports.filter((port) => port.latitude === null || port.longitude === null)
  const mappedPorts = ports.filter((port) => port.latitude !== null && port.longitude !== null)
  const airportCount = airports.length
  const mappedCustomerCount = finance?.points.length ?? 0
  const planeCount = assets.filter((asset) => asset.type === 'aircraft').length
  const vesselCount = assets.filter((asset) => asset.type === 'vessel').length

  const geoData = useMemo(
    () => featureCollection(airports, ports, showAssets ? assets : [], showFinancial && canViewFinancial ? finance : undefined, metric),
    [airports, ports, assets, finance, showAssets, showFinancial, canViewFinancial, metric],
  )

  layerData.current = geoData
  layerOptions.current = { terrain, showAirports, showPorts, showAssets, showFinancial }
  itemData.current = { airports, ports, assets, customers: finance?.points ?? [] }
  selectionSetter.current = setSelection

  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: STYLES[theme],
      center: [122.2, 12.5],
      zoom: 5.2,
      minZoom: 3,
      maxZoom: 16,
      attributionControl: false,
    })
    mapInstance.current = map
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right')
    map.addControl(new maplibregl.AttributionControl({
      compact: true,
      customAttribution: ['© OpenStreetMap contributors', '© OpenFreeMap', 'Elevation: AWS Open Data / NASA SRTM'],
    }), 'bottom-right')

    const addDataLayers = () => {
      if (!map.getSource('tracking-points')) {
        map.addSource('tracking-points', { type: 'geojson', data: layerData.current.points })
        map.addSource('tracking-lines', { type: 'geojson', data: layerData.current.lines })
        map.addSource('terrain-dem', {
          type: 'raster-dem',
          tiles: [TERRAIN_TILES],
          tileSize: 256,
          maxzoom: 15,
          encoding: 'terrarium',
        })
      }
      if (!map.getLayer('terrain-hillshade')) {
        map.addLayer({
          id: 'terrain-hillshade',
          type: 'hillshade',
          source: 'terrain-dem',
          layout: { visibility: layerOptions.current.terrain ? 'visible' : 'none' },
          paint: { 'hillshade-exaggeration': 0.35, 'hillshade-shadow-color': '#243447', 'hillshade-highlight-color': '#d9e5ee' },
        })
      }
      if (!map.getLayer('tracking-lines')) {
        map.addLayer({
          id: 'tracking-lines',
          type: 'line',
          source: 'tracking-lines',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': ['match', ['get', 'kind'], 'aircraft', '#2563eb', 'vessel', '#0f766e', '#f97316'],
            'line-width': 3,
            'line-opacity': 0.8,
          },
        })
        map.addLayer({
          id: 'airport-points',
          type: 'circle',
          source: 'tracking-points',
          filter: ['==', ['get', 'kind'], 'airport'],
          paint: { 'circle-radius': 4, 'circle-color': '#ffffff', 'circle-stroke-color': '#2563eb', 'circle-stroke-width': 2 },
        })
        map.addLayer({
          id: 'port-points',
          type: 'circle',
          source: 'tracking-points',
          filter: ['==', ['get', 'kind'], 'port'],
          paint: { 'circle-radius': 6, 'circle-color': '#f59e0b', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1.5 },
        })
        map.addLayer({
          id: 'asset-points',
          type: 'circle',
          source: 'tracking-points',
          filter: ['in', ['get', 'kind'], ['literal', ['aircraft', 'vessel']]],
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 6, 9, 10],
            'circle-color': ['match', ['get', 'kind'], 'aircraft', '#2563eb', 'vessel', '#0f766e', '#64748b'],
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2,
          },
        })
        map.addLayer({
          id: 'customer-points',
          type: 'circle',
          source: 'tracking-points',
          filter: ['==', ['get', 'kind'], 'customer'],
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['get', 'value'], 0, 5, 100000, 16, 1000000, 24],
            'circle-color': metric === 'sales' ? '#7c3aed' : '#ea580c',
            'circle-opacity': 0.7,
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 1.5,
          },
        })
        map.addLayer({
          id: 'place-labels',
          type: 'symbol',
          source: 'tracking-points',
          filter: ['in', ['get', 'kind'], ['literal', ['airport', 'port']]],
          minzoom: 6,
          layout: {
            'text-field': ['get', 'label'],
            'text-size': 10,
            'text-offset': [0, 1.2],
            'text-anchor': 'top',
            'text-allow-overlap': false,
          },
          paint: { 'text-color': theme === 'dark' ? '#f8fafc' : '#0f172a', 'text-halo-color': theme === 'dark' ? '#0f172a' : '#ffffff', 'text-halo-width': 1.2 },
        })
      }
      map.setLayoutProperty('airport-points', 'visibility', layerOptions.current.showAirports ? 'visible' : 'none')
      map.setLayoutProperty('port-points', 'visibility', layerOptions.current.showPorts ? 'visible' : 'none')
      map.setLayoutProperty('asset-points', 'visibility', layerOptions.current.showAssets ? 'visible' : 'none')
      map.setLayoutProperty('tracking-lines', 'visibility', layerOptions.current.showAssets ? 'visible' : 'none')
      map.setLayoutProperty('customer-points', 'visibility', layerOptions.current.showFinancial ? 'visible' : 'none')
      map.setLayoutProperty('terrain-hillshade', 'visibility', layerOptions.current.terrain ? 'visible' : 'none')
      ;(map.getSource('tracking-points') as GeoJSONSource).setData(layerData.current.points)
      ;(map.getSource('tracking-lines') as GeoJSONSource).setData(layerData.current.lines)
      setMapReady(true)
    }

    map.on('load', addDataLayers)
    map.on('style.load', addDataLayers)
    map.on('error', (event: any) => {
      if (event.error instanceof Error) setMapError(event.error.message)
    })
    map.on('click', (event: any) => {
      const visibleLayers = ['asset-points', 'airport-points', 'port-points', 'customer-points'].filter((layer) => map.getLayer(layer))
      const feature = map.queryRenderedFeatures(event.point, { layers: visibleLayers })[0]
      if (!feature?.properties) return
      const kind = String(feature.properties.kind)
      const id = String(feature.properties.id)
      const current = itemData.current
      if (kind === 'aircraft' || kind === 'vessel') {
        const asset = current.assets.find((item) => item.id === id)
        if (asset) selectionSetter.current({ kind: 'asset', value: asset })
      } else if (kind === 'airport') {
        const airport = current.airports.find((item) => item.code === id)
        if (airport) selectionSetter.current({ kind: 'airport', value: airport })
      } else if (kind === 'port') {
        const port = current.ports.find((item) => item.id === id)
        if (port) selectionSetter.current({ kind: 'port', value: port })
      } else if (kind === 'customer') {
        const customer = current.customers.find((item) => item.partyId === id)
        if (customer) selectionSetter.current({ kind: 'customer', value: customer })
      }
    })
    map.on('mousemove', (event: any) => {
      if (!map.isStyleLoaded()) return
      const hoverLayers = ['asset-points', 'airport-points', 'port-points', 'customer-points'].filter((layer) => map.getLayer(layer))
      const hovered = hoverLayers.length ? map.queryRenderedFeatures(event.point, { layers: hoverLayers }).length > 0 : false
      map.getCanvas().style.cursor = hovered ? 'pointer' : ''
    })
    map.on('mouseout', () => { map.getCanvas().style.cursor = '' })

    return () => {
      map.remove()
      mapInstance.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapInstance.current
    if (!map || map.getStyle().sprite === undefined) return
    map.setStyle(STYLES[theme])
  }, [theme])

  useEffect(() => {
    const map = mapInstance.current
    if (!map || !mapReady || !map.isStyleLoaded()) return
    const points = map.getSource('tracking-points') as GeoJSONSource | undefined
    const lines = map.getSource('tracking-lines') as GeoJSONSource | undefined
    points?.setData(geoData.points)
    lines?.setData(geoData.lines)
    if (map.getLayer('customer-points')) {
      map.setPaintProperty('customer-points', 'circle-color', metric === 'sales' ? '#7c3aed' : '#ea580c')
    }
  }, [geoData, mapReady, metric])

  useEffect(() => {
    const map = mapInstance.current
    if (!map || !mapReady || !map.isStyleLoaded()) return
    for (const [id, visible] of [
      ['airport-points', showAirports],
      ['port-points', showPorts],
      ['asset-points', showAssets],
      ['tracking-lines', showAssets],
      ['customer-points', showFinancial],
      ['terrain-hillshade', terrain],
    ] as const) {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none')
    }
  }, [showAirports, showPorts, showAssets, showFinancial, terrain, mapReady])

  function saveSelectedLocation(latitude: number | null, longitude: number | null) {
    if (selection?.kind === 'customer') {
      locationMutation.mutate({ path: `/map/customers/${selection.value.partyId}/location`, latitude, longitude })
    } else if (selection?.kind === 'port') {
      locationMutation.mutate({ path: `/map/ports/${selection.value.id}/location`, latitude, longitude })
    }
  }

  function currentSelectionTitle() {
    if (!selection) return ''
    if (selection.kind === 'asset') return selection.value.name
    if (selection.kind === 'airport') return selection.value.name
    if (selection.kind === 'port') return selection.value.name
    return selection.value.name
  }

  const assetResults = shipmentQuery.data ?? []
  const sourceError = assetQuery.isError ? 'Live tracking request failed. Retry the source query; simulated points will not be substituted.' : ''

  return (
    <main className="space-y-5 p-1">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Operations · Live data with explicit provenance</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Philippines Logistics Map</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Aircraft and vessel observations, verified logistics locations, and restricted customer telemetry in one operational view.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Switch active={feedMode === 'live'} onClick={() => { setFeedMode('live'); setSelection(null) }}><Radio className="size-4" />Live feeds</Switch>
          <Switch active={feedMode === 'simulated'} onClick={() => { setFeedMode('simulated'); setSelection(null) }}><Compass className="size-4" />Demo simulation</Switch>
          <button type="button" title="Refresh live feeds" onClick={() => void assetQuery.refetch()} className="inline-flex size-9 items-center justify-center rounded-lg border bg-card hover:bg-muted"><RefreshCw className="size-4" /></button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border bg-card p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Plane className="size-4" />Aircraft observed</div><div className="mt-2 text-2xl font-bold">{planeCount}</div></div>
        <div className="rounded-xl border bg-card p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Ship className="size-4" />Vessels observed</div><div className="mt-2 text-2xl font-bold">{vesselCount}</div></div>
        <div className="rounded-xl border bg-card p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Plane className="size-4" />Airport references</div><div className="mt-2 text-2xl font-bold">{airportCount}</div></div>
        <div className="rounded-xl border bg-card p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><CircleDollarSign className="size-4" />Mapped customers</div><div className="mt-2 text-2xl font-bold">{showFinancial && canViewFinancial ? mappedCustomerCount : '—'}</div></div>
      </section>

      {feedMode === 'simulated' ? (
        <div role="status" className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          <strong>SIMULATION MODE.</strong> Every aircraft, vessel, position, route, and voyage shown in this mode is illustrative and is not a live Kornet shipment or feed.
        </div>
      ) : null}
      {sourceError ? <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">{sourceError} <button type="button" className="ml-2 underline" onClick={() => void assetQuery.refetch()}>Retry</button></div> : null}
      {referenceQuery.isError ? <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">Map location references could not be loaded. <button type="button" className="underline" onClick={() => void referenceQuery.refetch()}>Retry</button></div> : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-3">
            <div className="flex flex-wrap gap-2">
              <Switch active={showAirports} onClick={() => setShowAirports((value) => !value)}><Plane className="size-4" />Airports</Switch>
              <Switch active={showPorts} onClick={() => setShowPorts((value) => !value)}><Anchor className="size-4" />Ports</Switch>
              <Switch active={showAssets} onClick={() => setShowAssets((value) => !value)}><Radio className="size-4" />Moving assets</Switch>
              <Switch active={showFinancial} disabled={!canViewFinancial} onClick={() => setShowFinancial((value) => !value)}><CircleDollarSign className="size-4" />Customer telemetry</Switch>
              <Switch active={terrain} onClick={() => setTerrain((value) => !value)}><Mountain className="size-4" />Terrain</Switch>
            </div>
            <div className="flex gap-2">
              <Switch active={theme === 'light'} onClick={() => setTheme('light')}><Sun className="size-4" />Light</Switch>
              <Switch active={theme === 'dark'} onClick={() => setTheme('dark')}><Moon className="size-4" />Dark</Switch>
            </div>
          </div>
          {showFinancial && canViewFinancial ? (
            <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 px-3 py-2">
              <span className="text-xs font-semibold text-muted-foreground">Customer metric</span>
              <Switch active={metric === 'sales'} onClick={() => setMetric('sales')}>Posted sales</Switch>
              <Switch active={metric === 'collections'} onClick={() => setMetric('collections')}>Applied cash</Switch>
              <select value={period} onChange={(event) => setPeriod(event.target.value as FinancialMapData['period'])} className="h-9 rounded-lg border bg-background px-2 text-xs">
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="ytd">Year to date</option>
              </select>
              <span className="text-[11px] text-muted-foreground">EWT is excluded from cash and shown separately.</span>
            </div>
          ) : null}
          {!canViewFinancial ? <p className="border-b bg-muted/30 px-3 py-2 text-xs text-muted-foreground">Customer and financial layers are restricted to accounting, management, and administrator roles.</p> : null}
          <div className="relative">
            <div ref={mapContainer} className="h-[620px] min-h-[440px] w-full bg-slate-100 dark:bg-slate-900" aria-label="Interactive Philippines logistics map" />
            {!mapReady && !mapError ? <div className="absolute inset-0 flex items-center justify-center bg-background/70 text-sm text-muted-foreground">Loading map tiles…</div> : null}
            {mapError ? <div role="alert" className="absolute left-3 right-3 top-3 rounded-lg border border-destructive/40 bg-background/95 p-3 text-xs text-destructive">Map tiles reported an error: {mapError}</div> : null}
            <div className="absolute bottom-4 left-3 flex flex-wrap gap-2 rounded-lg border bg-background/90 p-2 text-[10px] shadow">
              <span className="flex items-center gap-1"><i className="size-2 rounded-full bg-blue-600" />Aircraft</span>
              <span className="flex items-center gap-1"><i className="size-2 rounded-full bg-teal-700" />Vessel</span>
              <span className="flex items-center gap-1"><i className="size-2 rounded-full bg-amber-500" />Port</span>
              <span className="flex items-center gap-1"><i className="size-2 rounded-full border-2 border-blue-600 bg-white" />Airport</span>
              {showFinancial ? <span className="flex items-center gap-1"><i className={`size-2 rounded-full ${metric === 'sales' ? 'bg-violet-600' : 'bg-orange-600'}`} />Customer value intensity</span> : null}
            </div>
            <div className="absolute right-3 top-3 flex items-center gap-2 rounded-lg border bg-background/90 px-3 py-2 text-[10px] text-muted-foreground">
              <Layers3 className="size-3.5" />OpenStreetMap data · OpenFreeMap tiles
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{selection ? selection.kind : 'Source health'}</p>
                <h2 className="mt-1 text-lg font-bold">{selection ? currentSelectionTitle() : 'Tracking feeds'}</h2>
              </div>
              {selection ? <button type="button" aria-label="Close details" onClick={() => { setSelection(null); setGeocodePreview(null) }} className="rounded-md p-1 hover:bg-muted"><X className="size-4" /></button> : null}
            </div>
            {!selection ? (
              <div className="mt-4 space-y-4">
                <ProviderStatus title="Aircraft · ADSB.lol" state={assetQuery.data?.sources.aircraft} />
                <ProviderStatus title="Vessels · OpenSeaFeed AIS" state={assetQuery.data?.sources.vessels} />
                <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                  Live position feeds do not prove an aircraft is cargo or that an asset carries a Kornet shipment. A track line is drawn only from positions actually observed by the feed since this server started.
                </div>
                <p className="text-[11px] text-muted-foreground">Positions refresh every 30 seconds. Air-feed regions are queried around Luzon, Visayas, and Mindanao; this is not guaranteed full-island coverage.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-3 text-sm">
                {selection.kind === 'asset' ? (
                  <>
                    <div className={`rounded-lg px-3 py-2 text-xs font-bold ${selection.value.provider === 'SIMULATED' ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100' : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100'}`}>
                      {selection.value.provider === 'SIMULATED' ? 'SIMULATED · illustrative data' : `LIVE SOURCE · ${selection.value.provider}`}
                    </div>
                    <Detail label="Identifier" value={selection.value.externalId} />
                    <Detail label="Call sign" value={selection.value.callsign ?? 'Not provided by source'} />
                    <Detail label="Registration / type" value={[selection.value.registration, selection.value.model].filter(Boolean).join(' · ') || 'Not provided by source'} />
                    <Detail label="Origin" value={selection.value.origin ?? 'Not available in this position feed'} />
                    <Detail label="Destination" value={selection.value.destination ?? 'Not available in this position feed'} />
                    <Detail label="Speed" value={selection.value.speedKnots === undefined ? '—' : `${selection.value.speedKnots.toFixed(1)} kn`} />
                    <Detail label="Heading" value={selection.value.headingDegrees === undefined ? '—' : `${Math.round(selection.value.headingDegrees)}°`} />
                    {selection.value.altitudeFeet !== undefined ? <Detail label="Altitude" value={`${Math.round(selection.value.altitudeFeet).toLocaleString()} ft`} /> : null}
                    {selection.value.eta ? <Detail label="Reported ETA" value={selection.value.eta} /> : null}
                    <Detail label="Position observed" value={formatDate(selection.value.observedAt)} />
                    <Detail label="Shipment association" value={selection.value.shipment ? `${selection.value.shipment.fileNo} · ${selection.value.shipment.status}` : 'Not associated'} />
                    <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">The path shown is a short in-memory history of received positions, not a planned route or navigation service.</p>
                    {canLinkAssets && selection.value.provider !== 'SIMULATED' && !selection.value.shipment ? (
                      <div className="space-y-2 border-t pt-3">
                        <label className="block text-xs font-semibold">Confirm shipment association
                          <div className="relative mt-1">
                            <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
                            <input value={shipmentSearch} onChange={(event) => setShipmentSearch(event.target.value)} placeholder="Search file, flight, vessel…" className="w-full rounded-md border bg-background py-2 pl-8 pr-2 text-xs" />
                          </div>
                        </label>
                        {shipmentQuery.isLoading ? <p className="text-xs text-muted-foreground">Searching shipments…</p> : null}
                        {shipmentQuery.isError ? <p role="alert" className="text-xs text-destructive">Shipment search failed.</p> : null}
                        <div className="max-h-36 space-y-1 overflow-auto">
                          {assetResults.map((shipment) => (
                            <button key={shipment.id} type="button" onClick={() => linkMutation.mutate({ asset: selection.value, shipmentId: shipment.id })} disabled={linkMutation.isPending} className="flex w-full items-center justify-between rounded-md border p-2 text-left text-xs hover:bg-muted disabled:opacity-50">
                              <span className="font-semibold">{shipment.fileNo} · {shipment.mode}</span><span className="text-muted-foreground">{shipment.status}</span>
                            </button>
                          ))}
                        </div>
                        {linkMutation.isError ? <p role="alert" className="text-xs text-destructive">Association could not be saved. Check whether this asset is already linked.</p> : null}
                      </div>
                    ) : null}
                  </>
                ) : null}
                {selection.kind === 'airport' ? (
                  <>
                    <Detail label="IATA / local code" value={selection.value.code} />
                    <Detail label="ICAO code" value={selection.value.icao} />
                    <Detail label="Municipality" value={selection.value.municipality} />
                    <Detail label="Coordinates" value={`${selection.value.latitude.toFixed(5)}, ${selection.value.longitude.toFixed(5)}`} />
                    <Detail label="Reference" value={selection.value.source} />
                  </>
                ) : null}
                {selection.kind === 'port' ? (
                  <>
                    <Detail label="Code / UNLOCODE" value={[selection.value.code, selection.value.unlocode].filter(Boolean).join(' · ')} />
                    <Detail label="Country / type" value={`${selection.value.country} · ${selection.value.kind}`} />
                    <Detail label="Coordinates" value={selection.value.latitude === null || selection.value.longitude === null ? 'Not configured' : `${selection.value.latitude.toFixed(5)}, ${selection.value.longitude.toFixed(5)}`} />
                    <Detail label="Location source" value={selection.value.locationSource ?? 'Not verified'} />
                    {selection.value.approximate ? <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-100">Approximate port-area reference, not a terminal or berth position. Verify the exact facility coordinates before operational use.</p> : null}
                    {canManageLocations && selection.value.editable ? <LocationEditor latitude={selection.value.latitude} longitude={selection.value.longitude} saving={locationMutation.isPending} onSave={saveSelectedLocation} /> : null}
                  </>
                ) : null}
                {selection.kind === 'customer' ? (
                  <>
                    <Detail label="Selected metric" value={metric === 'sales' ? formatMoney(selection.value.sales) : formatMoney(selection.value.cashCollected)} />
                    <Detail label="Posted sales" value={formatMoney(selection.value.sales)} />
                    <Detail label="Applied cash" value={formatMoney(selection.value.cashCollected)} />
                    <Detail label="EWT withheld (separate)" value={formatMoney(selection.value.ewtWithheld)} />
                    <Detail label="Location source" value={selection.value.locationSource ?? 'Not verified'} />
                    {canViewFinancial ? <LocationEditor latitude={selection.value.latitude} longitude={selection.value.longitude} saving={locationMutation.isPending} onSave={saveSelectedLocation} /> : null}
                    <div className="flex flex-wrap gap-2">
                      <button type="button" disabled={geocodeMutation.isPending} onClick={() => geocodeMutation.mutate(selection.value.partyId)} className="rounded-md border px-3 py-1.5 text-xs font-semibold disabled:opacity-50">{geocodeMutation.isPending ? 'Looking up…' : 'Preview geocoding'}</button>
                    </div>
                    {geocodeMutation.isError ? <p role="alert" className="text-xs text-destructive">{errorMessage(geocodeMutation.error, 'Geocoding is unavailable or has not been approved.')}</p> : null}
                    {geocodePreview?.customerId === selection.value.partyId ? (
                      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs">
                        <p className="font-semibold">Review Geoapify match · not saved</p>
                        <p className="mt-1">{geocodePreview.formatted || 'Provider returned coordinates without a formatted address.'}</p>
                        <p className="mt-1 font-mono">{geocodePreview.latitude.toFixed(5)}, {geocodePreview.longitude.toFixed(5)}{geocodePreview.confidence === null ? '' : ` · confidence ${Math.round(geocodePreview.confidence * 100)}%`}</p>
                        <button type="button" disabled={acceptGeocodeMutation.isPending} onClick={() => acceptGeocodeMutation.mutate({ partyId: selection.value.partyId, previewId: geocodePreview.previewId })} className="mt-2 inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 font-semibold text-primary-foreground disabled:opacity-50"><Check className="size-3.5" />Accept verified point</button>
                      </div>
                    ) : null}
                    {acceptGeocodeMutation.isError ? <p role="alert" className="text-xs text-destructive">The geocoding preview expired or could not be saved. Request a new preview.</p> : null}
                  </>
                ) : null}
              </div>
            )}
          </div>

          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <h3 className="text-sm font-bold">Reference coverage</h3>
            <p className="mt-1 text-xs text-muted-foreground">{mappedPorts.length} configured port locations · {unmappedPorts.length} ports need verified coordinates</p>
            {unmappedPorts.length ? (
              <div className="mt-3 max-h-36 space-y-1 overflow-auto">
                {unmappedPorts.slice(0, 8).map((port) => (
                  <button key={port.id} type="button" onClick={() => setSelection({ kind: 'port', value: port })} className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted">
                    <span>{port.name}</span><span className="text-muted-foreground">{port.code} · needs location</span>
                  </button>
                ))}
                {unmappedPorts.length > 8 ? <p className="px-2 text-[10px] text-muted-foreground">And {unmappedPorts.length - 8} more</p> : null}
              </div>
            ) : null}
            {referenceQuery.data?.attribution.airports ? <p className="mt-3 text-[10px] text-muted-foreground">{referenceQuery.data.attribution.airports}</p> : null}
            {referenceQuery.data?.attribution.ports ? <p className="mt-1 text-[10px] text-muted-foreground">{referenceQuery.data.attribution.ports}</p> : null}
          </div>

          {showFinancial && canViewFinancial ? (
            <div className="rounded-2xl border bg-card p-4 shadow-sm">
              <h3 className="text-sm font-bold">Customers awaiting a map point</h3>
              {financeQuery.isLoading ? <p className="mt-2 text-xs text-muted-foreground">Loading customer telemetry…</p> : null}
              {financeQuery.isError ? <p role="alert" className="mt-2 text-xs text-destructive">Financial telemetry could not be loaded. You may not have the required role.</p> : null}
              {finance?.unmappedCustomers.length ? (
                <div className="mt-3 max-h-52 space-y-1 overflow-auto">
                  {finance.unmappedCustomers.map((customer) => (
                    <button key={customer.partyId} type="button" onClick={() => {
                      setGeocodePreview(null)
                      setSelection({
                        kind: 'customer',
                        value: {
                          ...customer,
                          latitude: null,
                          longitude: null,
                          locationSource: null,
                        },
                      })
                    }} className="flex w-full items-center justify-between rounded-md border p-2 text-left text-xs hover:bg-muted">
                      <span className="min-w-0 truncate font-semibold">{customer.name}</span>
                      <span className="shrink-0 text-muted-foreground">{formatMoney(metric === 'sales' ? customer.sales : customer.cashCollected)}</span>
                    </button>
                  ))}
                </div>
              ) : <p className="mt-2 text-xs text-muted-foreground">All customers with activity in this period have a verified map point.</p>}
              {finance?.metricDefinitions ? <p className="mt-3 text-[10px] text-muted-foreground">{finance.metricDefinitions[metric === 'sales' ? 'sales' : 'cashCollected']} EWT is reported separately.</p> : null}
            </div>
          ) : null}
        </aside>
      </section>
    </main>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-3 border-b py-1.5 text-xs"><span className="text-muted-foreground">{label}</span><span className="max-w-[65%] text-right font-semibold">{value}</span></div>
}

function errorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { error?: string } } }).response
    if (response?.data?.error) return response.data.error
  }
  return fallback
}
