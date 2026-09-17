import { useEffect, useRef, useState } from 'react'
import { KORNET_BRANCHES, PhilippineBranch } from '../../stores/logisticsStore'
import { useSettingsStore } from '../../stores/settingsStore'

declare const L: any

interface BranchGeoPin {
  branch: PhilippineBranch
  lat: number
  lng: number
  type: 'hq' | 'air' | 'sea'
  activeTrucks: number
  dailyThroughput: string
}

export const BRANCH_GEOS: BranchGeoPin[] = [
  { branch: KORNET_BRANCHES[0], lat: 14.5828, lng: 120.9634, type: 'hq',  activeTrucks: 14, dailyThroughput: '1,450 TEU' }, // Manila South Harbor
  { branch: KORNET_BRANCHES[1], lat: 14.4333, lng: 120.4900, type: 'sea', activeTrucks: 6,  dailyThroughput: '380 TEU' },   // Bataan Mariveles
  { branch: KORNET_BRANCHES[2], lat: 15.1859, lng: 120.5596, type: 'air', activeTrucks: 8,  dailyThroughput: '185 MT Air' },// Clark Airport Hub
  { branch: KORNET_BRANCHES[3], lat: 10.3065, lng: 123.9061, type: 'sea', activeTrucks: 11, dailyThroughput: '890 TEU' },   // Cebu Port Authority
  { branch: KORNET_BRANCHES[4], lat: 7.1278,  lng: 125.6601, type: 'sea', activeTrucks: 9,  dailyThroughput: '620 TEU' },   // Davao Sasa Port
  { branch: KORNET_BRANCHES[5], lat: 8.5028,  lng: 124.6608, type: 'sea', activeTrucks: 7,  dailyThroughput: '440 TEU' },   // Cagayan De Oro Port
]

// Real Philippine Expressway & National Highway Corridors (Strictly on Land)
const LAND_ROUTES: [number, number][][] = [
  // 1. NLEX: Manila South Harbor -> Harbor Link -> Balintawak -> Bocaue -> San Fernando -> Angeles -> Clark
  [
    [14.5828, 120.9634],
    [14.6467, 120.9658],
    [14.6581, 121.0028],
    [14.7986, 120.9325],
    [15.0345, 120.6865],
    [15.1500, 120.5900],
    [15.1859, 120.5596]
  ],
  // 2. SCTEX & Roman Superhighway: Clark -> Dinalupihan -> Hermosa -> Balanga -> Mariveles Freeport
  [
    [15.1859, 120.5596],
    [14.8780, 120.4570],
    [14.8320, 120.5050],
    [14.6800, 120.5400],
    [14.4333, 120.4900]
  ],
  // 3. Mindanao Sayre Highway: Cagayan de Oro Port -> Puerto -> Manolo Fortich -> Malaybalay -> Maramag -> Calinan -> Davao Sasa
  [
    [8.5028, 124.6608],
    [8.4800, 124.7200],
    [8.3650, 124.8650],
    [8.1550, 125.1280],
    [7.7580, 125.0050],
    [7.7300, 125.1000],
    [7.1850, 125.4550],
    [7.1278, 125.6601]
  ]
]

// Real Philippine Maritime Nautical Lanes (Strictly Navigable Waters)
const SEA_LANES: [number, number][][] = [
  // 1. Manila -> Verde Island Passage -> Sibuyan Sea -> Jintotolo Channel -> Visayan Sea -> Cebu Port
  [
    [14.5700, 120.9400],
    [14.3800, 120.6000],
    [13.5500, 121.0500],
    [12.8000, 121.9000],
    [12.2000, 122.8000],
    [11.8500, 123.2000],
    [11.3500, 123.6500],
    [10.3500, 123.9300],
    [10.3065, 123.9061]
  ],
  // 2. Cebu Port -> Bohol Strait -> Bohol Sea -> Macajalar Bay -> Cagayan de Oro Port
  [
    [10.2500, 123.9100],
    [9.9500, 123.8000],
    [9.5500, 123.7500],
    [9.0000, 124.3000],
    [8.5800, 124.6500],
    [8.5028, 124.6608]
  ],
  // 3. Manila South Harbor -> Manila Bay Fairway -> Mariveles Bataan
  [
    [14.5828, 120.9634],
    [14.5300, 120.7500],
    [14.4333, 120.4900]
  ]
]

// Real Philippine Civil Aviation Air Corridors
const AIR_CORRIDORS: [number, number][][] = [
  // 1. Clark (CRK) -> Manila Control -> Marinduque -> Sibuyan Airway -> Mactan-Cebu (CEB)
  [
    [15.1859, 120.5596],
    [14.5000, 121.1000],
    [13.3500, 121.8000],
    [12.5000, 122.3000],
    [11.5000, 122.9000],
    [10.3065, 123.9800]
  ],
  // 2. Clark (CRK) -> Polillo -> Legazpi -> Surigao -> Davao Airport (DVO)
  [
    [15.1859, 120.5596],
    [14.7000, 121.9000],
    [13.1500, 123.7000],
    [9.7500, 125.5000],
    [7.1278, 125.6601]
  ]
]

// Comprehensive Telemetric Sample Data
interface LiveAsset {
  id: string
  name: string
  type: 'truck' | 'ship' | 'plane'
  lat: number
  lng: number
  speed: string
  heading: string
  route: string
  status: string
  cargo: string
  operator: string
  telemetry: string
}

const LIVE_ASSETS: LiveAsset[] = [
  // Land Trucks (Strictly on Highways)
  {
    id: 'NCV-8921',
    name: 'Isuzu Giga 10-Wheeler Wing Van (NCV-8921)',
    type: 'truck',
    lat: 15.0345,
    lng: 120.6865,
    speed: '74 km/h',
    heading: '345° Northbound (NLEX)',
    route: 'Manila South Harbor → Clark International Airport',
    status: 'In Transit • On Schedule',
    cargo: '28 Pallets Semiconductor Microchips',
    operator: 'Danilo Ramos (Lic: N01-14-089122)',
    telemetry: 'OBD-II Online • Temp: 21.4°C • Fuel: 68%'
  },
  {
    id: 'NGK-7712',
    name: 'Fuso Canter 6-Wheeler Reefer (NGK-7712)',
    type: 'truck',
    lat: 14.6800,
    lng: 120.5400,
    speed: '58 km/h',
    heading: '185° Southbound (Roman Superhwy)',
    route: 'Clark Gateway → Mariveles Freeport Bataan',
    status: 'In Transit • Cold Chain Active',
    cargo: 'Cold-Chain Pharmaceuticals & Vaccines',
    operator: 'Rodolfo Santos (Lic: C02-18-004123)',
    telemetry: 'OBD-II Online • Temp: 4.2°C • Fuel: 82%'
  },
  {
    id: 'NBO-5120',
    name: 'Hino 500 Heavy Tractor Head (NBO-5120)',
    type: 'truck',
    lat: 8.1550,
    lng: 125.1280,
    speed: '52 km/h',
    heading: '160° Southbound (Sayre Highway)',
    route: 'Cagayan De Oro Port → Davao Sasa Port',
    status: 'In Transit • Mountain Pass',
    cargo: '24 MT Industrial Machinery Components',
    operator: 'Eduardo Magsaysay (Lic: N03-09-077411)',
    telemetry: 'OBD-II Online • Temp: 24.0°C • Fuel: 54%'
  },
  {
    id: 'CAP-1049',
    name: 'Isuzu Forward 6-Wheeler Box Truck (CAP-1049)',
    type: 'truck',
    lat: 14.7986,
    lng: 120.9325,
    speed: '68 km/h',
    heading: '310° Northbound (NLEX Bocaue)',
    route: 'Manila South Harbor → Subic Bay Freeport',
    status: 'In Transit • On Schedule',
    cargo: 'Consumer Packaged Goods (FMCG)',
    operator: 'Mateo Fernandez (Lic: C01-16-091244)',
    telemetry: 'OBD-II Online • Temp: 25.1°C • Fuel: 73%'
  },

  // Cargo Ships (Strictly Navigable Domestic Sea Channels)
  {
    id: 'MV-LORCON',
    name: 'MV Lorcon Manila (IMO: 9382104)',
    type: 'ship',
    lat: 13.5500,
    lng: 121.0500,
    speed: '15.4 Knots (28.5 km/h)',
    heading: '135° SE (Verde Island Passage)',
    route: 'Manila South Harbor → Cebu International Container Terminal',
    status: 'Underway by Engine • ETA Cebu 18:00',
    cargo: '420 TEU Domestic & Transshipment Cargo',
    operator: 'Capt. Roberto Dela Cruz • Lorenzo Shipping',
    telemetry: 'AIS Transponder Active • Draft: 8.2m • Wind: ENE 12 kts'
  },
  {
    id: 'MV-2GO',
    name: 'MV 2GO Masigla (IMO: 9245112)',
    type: 'ship',
    lat: 11.3500,
    lng: 123.6500,
    speed: '17.1 Knots (31.7 km/h)',
    heading: '160° SSE (Visayan Sea)',
    route: 'Cebu Port Authority → Cagayan De Oro Port',
    status: 'Underway by Engine • ETA CDO 06:30',
    cargo: '85 Rolling Cargo Units + 210 TEU Containers',
    operator: 'Capt. Nestor Alcantara • 2GO Freight',
    telemetry: 'AIS Transponder Active • Draft: 7.6m • Sea State: Moderate'
  },
  {
    id: 'MV-GOTHONG',
    name: 'MV Gothong Star 8 (IMO: 8910443)',
    type: 'ship',
    lat: 14.5300,
    lng: 120.7500,
    speed: '8.5 Knots (15.7 km/h)',
    heading: '260° WSW (Manila Bay Fairway)',
    route: 'Manila South Harbor → Mariveles Bataan Anchorage',
    status: 'Harbor Transit • Repositioning',
    cargo: '60 TEU Empty Container Repositioning',
    operator: 'Capt. Jaime Ocampo • Gothong Southern',
    telemetry: 'AIS Transponder Active • Draft: 4.8m'
  },

  // Cargo Planes (Strictly Civil Aviation Corridors)
  {
    id: 'PR-2814',
    name: 'PAL Cargo Airbus A321-200P2F (Flight PR-2814)',
    type: 'plane',
    lat: 12.5000,
    lng: 122.3000,
    speed: '435 Knots (805 km/h)',
    heading: '148° Cruise (Sibuyan Airway)',
    route: 'Clark International (CRK) → Mactan-Cebu (CEB)',
    status: 'In Flight • Cruising FL280 (28,000 FT)',
    cargo: '18.5 MT Time-Critical Electronic Components',
    operator: 'Capt. Adrian Mercado • Philippine Airlines Cargo',
    telemetry: 'ADS-B Broadcast Active • Squawk: 3214 • OAT: -38°C'
  },
  {
    id: '5J-563',
    name: 'Cebu Pacific Cargo ATR 72-600F (Flight 5J-563)',
    type: 'plane',
    lat: 14.7000,
    lng: 121.9000,
    speed: '280 Knots (518 km/h)',
    heading: '155° Climb (Polillo Corridor)',
    route: 'Clark International (CRK) → Davao Airport (DVO)',
    status: 'In Flight • Cruising FL180 (18,000 FT)',
    cargo: '6.2 MT Express E-Commerce & Perishables',
    operator: 'Capt. Leslie Tan • Cebu Pacific Cargo',
    telemetry: 'ADS-B Broadcast Active • Squawk: 4502 • OAT: -18°C'
  }
]

interface PhilippineLeafletMapProps {
  selectedBranch: PhilippineBranch
  onSelectBranch: (branch: PhilippineBranch) => void
  activeLayer: 'all' | 'sea' | 'air' | 'land'
}

export default function PhilippineLeafletMap({
  selectedBranch,
  onSelectBranch,
  activeLayer,
}: PhilippineLeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<any>(null)
  const layerGroupRef = useRef<any>(null)
  const tileLayersRef = useRef<any[]>([])

  const darkMode = useSettingsStore((s) => s.darkMode)
  const [isLeafletReady, setIsLeafletReady] = useState(false)
  const [assetFilter, setAssetFilter] = useState<'all' | 'truck' | 'ship' | 'plane'>('all')
  const [selectedAsset, setSelectedAsset] = useState<LiveAsset | null>(null)

  // Ensure Leaflet library is available
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).L) {
      setIsLeafletReady(true)
      return
    }

    const interval = setInterval(() => {
      if ((window as any).L) {
        setIsLeafletReady(true)
        clearInterval(interval)
      }
    }, 80)

    return () => clearInterval(interval)
  }, [])

  // Listen for reset map view event from action bar
  useEffect(() => {
    const handleReset = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([12.8797, 121.7740], 6, { duration: 1.2 })
        setSelectedAsset(null)
      }
    }
    window.addEventListener('reset-map-view', handleReset)
    return () => window.removeEventListener('reset-map-view', handleReset)
  }, [])

  // Initialize Leaflet Map Instance
  useEffect(() => {
    if (!isLeafletReady || !mapContainerRef.current || mapInstanceRef.current) return

    const L = (window as any).L
    const phBounds = [
      [4.0, 115.0], // South-West Philippine maritime EEZ boundary
      [22.0, 129.0] // North-East boundary including Batanes
    ]

    const map = L.map(mapContainerRef.current, {
      center: [12.8797, 121.7740],
      zoom: 6,
      minZoom: 5,
      maxZoom: 16,
      maxBounds: phBounds,
      zoomControl: false,
      attributionControl: false
    })

    L.control.zoom({ position: 'topright' }).addTo(map)
    L.control
      .attribution({ position: 'bottomright', prefix: false })
      .addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> &copy; <a href="https://www.esri.com" target="_blank">Esri</a>')
      .addTo(map)

    mapInstanceRef.current = map
    layerGroupRef.current = L.layerGroup().addTo(map)

    return () => {
      map.remove()
      mapInstanceRef.current = null
      layerGroupRef.current = null
      tileLayersRef.current = []
    }
  }, [isLeafletReady])

  // Base Tile Layer Switcher: 100% Watermark-Free Tiles
  // Light Mode: OpenStreetMap Standard (Crisp high-contrast roads, towns, and ports)
  // Dark Mode: Esri Dark Gray Base + Reference Overlay (High-contrast white/cyan labels with zero watermark)
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !(window as any).L) return
    const L = (window as any).L

    // Remove old tile layers
    tileLayersRef.current.forEach((layer) => {
      map.removeLayer(layer)
    })
    tileLayersRef.current = []

    if (darkMode) {
      // 1. Dark Gray Canvas Base
      const baseLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 16,
          attribution: '&copy; Esri &copy; OpenStreetMap'
        }
      ).addTo(map)

      // 2. High-Contrast Reference Label Layer (Places all Philippine city & channel labels in bright contrast)
      const refLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 16,
          attribution: ''
        }
      ).addTo(map)

      tileLayersRef.current = [baseLayer, refLayer]
    } else {
      // Light Mode: OpenStreetMap Standard
      const streetLayer = L.tileLayer(
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors'
        }
      ).addTo(map)

      tileLayersRef.current = [streetLayer]
    }
  }, [darkMode, isLeafletReady])

  // Render High-Accuracy Routes, Hubs (Option 2), and Real Telemetry
  useEffect(() => {
    const map = mapInstanceRef.current
    const layerGroup = layerGroupRef.current
    if (!map || !layerGroup || !(window as any).L) return
    const L = (window as any).L

    layerGroup.clearLayers()

    // 1. Maritime Nautical Channels (Cyan glow line)
    if (activeLayer === 'all' || activeLayer === 'sea') {
      SEA_LANES.forEach((lane) => {
        L.polyline(lane, {
          color: darkMode ? '#38bdf8' : '#0284c7',
          weight: 3,
          dashArray: '8, 6',
          opacity: 0.85
        })
          .bindTooltip('Philippine Domestic Maritime Sea Lane (CAB/MARINA Compliant)', {
            sticky: true,
            className: darkMode ? 'leaflet-tooltip-dark' : 'leaflet-tooltip-light'
          })
          .addTo(layerGroup)
      })
    }

    // 2. Civil Aviation Corridors (Indigo / Purple dashed line)
    if (activeLayer === 'all' || activeLayer === 'air') {
      AIR_CORRIDORS.forEach((corridor) => {
        L.polyline(corridor, {
          color: darkMode ? '#a78bfa' : '#7c3aed',
          weight: 2.5,
          dashArray: '5, 8',
          opacity: 0.9
        })
          .bindTooltip('CAAP Domestic Air Freight Flight Corridor', {
            sticky: true,
            className: darkMode ? 'leaflet-tooltip-dark' : 'leaflet-tooltip-light'
          })
          .addTo(layerGroup)
      })
    }

    // 3. National Highways & Expressways (Amber solid line strictly on land)
    if (activeLayer === 'all' || activeLayer === 'land') {
      LAND_ROUTES.forEach((route) => {
        L.polyline(route, {
          color: darkMode ? '#fbbf24' : '#d97706',
          weight: 3.5,
          opacity: 0.95
        })
          .bindTooltip('Philippine National Expressway & Arterial Land Freight Corridor', {
            sticky: true,
            className: darkMode ? 'leaflet-tooltip-dark' : 'leaflet-tooltip-light'
          })
          .addTo(layerGroup)
      })
    }

    // 4. Strategic Hub Markers with Glowing Pins & High-Contrast Cards (Option 2)
    BRANCH_GEOS.forEach((pin) => {
      const isSelected = selectedBranch.id === pin.branch.id
      const pinColor =
        pin.type === 'hq'
          ? '#2563eb'
          : pin.type === 'air'
          ? '#4f46e5'
          : '#059669'

      const customHtml = `
        <div class="relative flex items-center justify-center cursor-pointer group" style="width: 44px; height: 44px;">
          ${
            isSelected
              ? `<div class="absolute inset-0 rounded-full animate-ping opacity-75" style="background-color: ${pinColor};"></div>`
              : `<div class="absolute inset-1 rounded-full opacity-30 group-hover:opacity-60 transition-opacity" style="background-color: ${pinColor};"></div>`
          }
          <div class="relative flex items-center justify-center w-9 h-9 rounded-full shadow-xl border-2 ${
            darkMode ? 'border-slate-800' : 'border-white'
          } transition-transform group-hover:scale-110" style="background-color: ${pinColor};">
            <span class="material-symbols-outlined text-white text-[19px]">
              ${pin.type === 'hq' ? 'home_work' : pin.type === 'air' ? 'flight' : 'directions_boat'}
            </span>
          </div>
          <div class="absolute -bottom-2 bg-slate-950 text-white font-mono text-[9px] font-black px-1.5 py-0.5 rounded shadow-lg border border-slate-700 leading-none">
            ${pin.branch.code}
          </div>
        </div>
      `

      const customIcon = L.divIcon({
        html: customHtml,
        className: 'custom-hub-marker',
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      })

      const marker = L.marker([pin.lat, pin.lng], { icon: customIcon }).addTo(layerGroup)

      marker.on('click', () => {
        onSelectBranch(pin.branch)
      })

      // High-contrast, clean card popup on hover/click (Option 2)
      const popupCard = `
        <div style="min-width: 210px; font-family: ui-sans-serif, system-ui, sans-serif; color: ${darkMode ? '#f8fafc' : '#0f172a'}; padding: 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-size: 13px; font-weight: 800; color: ${darkMode ? '#ffffff' : '#0f172a'};">${pin.branch.name}</span>
            <span style="font-size: 10px; font-weight: 800; background: ${pinColor}; color: white; padding: 2px 6px; border-radius: 6px;">${pin.branch.code}</span>
          </div>
          <div style="font-size: 11px; color: ${darkMode ? '#94a3b8' : '#64748b'}; margin-bottom: 6px;">
            ${pin.branch.city}, ${pin.branch.province}
          </div>
          <div style="background: ${darkMode ? 'rgba(30, 41, 59, 0.8)' : '#f1f5f9'}; border-radius: 8px; padding: 6px; font-size: 11px; margin-bottom: 6px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
              <span style="color: ${darkMode ? '#94a3b8' : '#64748b'};">Stationed Fleet:</span>
              <strong style="color: ${darkMode ? '#38bdf8' : '#0284c7'}; font-family: monospace;">${pin.activeTrucks} Trucks</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: ${darkMode ? '#94a3b8' : '#64748b'};">Daily Throughput:</span>
              <strong style="color: ${darkMode ? '#4ade80' : '#16a34a'}; font-family: monospace;">${pin.dailyThroughput}</strong>
            </div>
          </div>
          <div style="font-size: 10px; font-weight: 700; color: #10b981; display: flex; align-items: center; gap: 4px;">
            <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #10b981;"></span>
            24/7 OPERATIONAL • LIVE DISPATCH DISCONNECTED
          </div>
        </div>
      `

      marker.bindTooltip(popupCard, {
        direction: 'top',
        offset: [0, -22],
        className: darkMode ? 'leaflet-custom-dark-tooltip' : 'leaflet-custom-light-tooltip'
      })
    })

    // 5. Render Active Real-Time Vehicle Tracking (Trucks on Highways, Ships on Water, Planes in Air)
    const filteredAssets = LIVE_ASSETS.filter((a) => {
      if (assetFilter === 'all') return true
      return a.type === assetFilter
    })

    filteredAssets.forEach((asset) => {
      const isSelected = selectedAsset?.id === asset.id
      const isTruck = asset.type === 'truck'
      const isShip = asset.type === 'ship'

      const markerBg = isTruck ? '#10b981' : isShip ? '#0284c7' : '#7c3aed'
      const iconSymbol = isTruck ? 'local_shipping' : isShip ? 'directions_boat' : 'flight'

      const assetHtml = `
        <div class="relative flex items-center justify-center cursor-pointer group" style="width: 38px; height: 38px;">
          <div class="absolute inset-0 rounded-full animate-pulse opacity-40" style="background-color: ${markerBg};"></div>
          <div class="relative flex items-center justify-center w-8 h-8 rounded-full shadow-lg border-2 ${
            isSelected ? 'border-amber-400 scale-125' : darkMode ? 'border-slate-800' : 'border-white'
          } transition-all group-hover:scale-115" style="background-color: ${markerBg};">
            <span class="material-symbols-outlined text-white text-[16px]">
              ${iconSymbol}
            </span>
          </div>
          <div class="absolute -top-3.5 bg-slate-950 text-white font-mono text-[8px] font-black px-1.5 py-0.5 rounded shadow-md border border-slate-700 whitespace-nowrap">
            ${asset.id}
          </div>
        </div>
      `

      const assetIcon = L.divIcon({
        html: assetHtml,
        className: 'custom-live-asset-marker',
        iconSize: [38, 38],
        iconAnchor: [19, 19]
      })

      const marker = L.marker([asset.lat, asset.lng], { icon: assetIcon }).addTo(layerGroup)

      marker.on('click', () => {
        setSelectedAsset(asset)
      })

      const assetCard = `
        <div style="min-width: 240px; font-family: ui-sans-serif, system-ui, sans-serif; color: ${darkMode ? '#f8fafc' : '#0f172a'}; padding: 4px;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
            <span style="color: ${markerBg}; font-size: 16px;" class="material-symbols-outlined">${iconSymbol}</span>
            <span style="font-size: 12px; font-weight: 800; color: ${darkMode ? '#ffffff' : '#0f172a'};">${asset.name}</span>
          </div>
          <div style="font-size: 11px; color: ${darkMode ? '#cbd5e1' : '#475569'}; margin-bottom: 6px; font-weight: 600;">
            ${asset.route}
          </div>
          <div style="background: ${darkMode ? 'rgba(15, 23, 42, 0.9)' : '#f8fafc'}; border: 1px solid ${darkMode ? '#334155' : '#e2e8f0'}; border-radius: 8px; padding: 6px; font-size: 10px; margin-bottom: 6px; space-y: 2px;">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #94a3b8;">Speed / Heading:</span>
              <strong style="color: ${darkMode ? '#f8fafc' : '#0f172a'}; font-family: monospace;">${asset.speed} • ${asset.heading}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #94a3b8;">Cargo Manifest:</span>
              <strong style="color: ${darkMode ? '#38bdf8' : '#0284c7'};">${asset.cargo}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #94a3b8;">Operator:</span>
              <span style="color: #94a3b8;">${asset.operator}</span>
            </div>
            <div style="margin-top: 4px; padding-top: 4px; border-top: 1px dashed ${darkMode ? '#334155' : '#e2e8f0'}; color: #10b981; font-family: monospace; font-size: 9px;">
              ${asset.telemetry}
            </div>
          </div>
          <div style="font-size: 9px; font-weight: 700; color: #10b981; display: flex; align-items: center; gap: 4px;">
            <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #10b981;"></span>
            ${asset.status}
          </div>
        </div>
      `

      marker.bindTooltip(assetCard, {
        direction: 'top',
        offset: [0, -20],
        className: darkMode ? 'leaflet-custom-dark-tooltip' : 'leaflet-custom-light-tooltip'
      })
    })
  }, [selectedBranch, activeLayer, darkMode, assetFilter, selectedAsset, isLeafletReady])

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Interactive Quick Filter Toolbar overlay top-left */}
      <div className="absolute top-3 left-3 z-[400] flex items-center gap-1.5 p-1.5 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xl border border-slate-200 dark:border-slate-800 text-xs">
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 px-2 select-none flex items-center gap-1">
          <span className="material-symbols-outlined text-[15px] text-emerald-500">radar</span>
          Live GPS:
        </span>
        <button
          onClick={() => setAssetFilter('all')}
          className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
            assetFilter === 'all'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          All ({LIVE_ASSETS.length})
        </button>
        <button
          onClick={() => setAssetFilter('truck')}
          className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all ${
            assetFilter === 'truck'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
          }`}
        >
          <span className="material-symbols-outlined text-[14px]">local_shipping</span>
          <span>Trucks (4)</span>
        </button>
        <button
          onClick={() => setAssetFilter('ship')}
          className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all ${
            assetFilter === 'ship'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-950/40'
          }`}
        >
          <span className="material-symbols-outlined text-[14px]">directions_boat</span>
          <span>Ships (3)</span>
        </button>
        <button
          onClick={() => setAssetFilter('plane')}
          className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all ${
            assetFilter === 'plane'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-purple-50 dark:hover:bg-purple-950/40'
          }`}
        >
          <span className="material-symbols-outlined text-[14px]">flight</span>
          <span>Planes (2)</span>
        </button>
      </div>

      {/* Selected Asset Telematics Drawer overlay bottom-left */}
      {selectedAsset && (
        <div className="absolute bottom-4 left-4 z-[400] max-w-sm rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl border border-slate-200 dark:border-slate-800 p-4 animate-in fade-in slide-in-from-bottom-2 duration-200 text-xs">
          <div className="flex items-start justify-between gap-2 pb-2 border-b dark:border-slate-800 mb-2">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg text-white flex items-center justify-center font-bold"
                style={{
                  backgroundColor:
                    selectedAsset.type === 'truck'
                      ? '#10b981'
                      : selectedAsset.type === 'ship'
                      ? '#0284c7'
                      : '#7c3aed'
                }}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {selectedAsset.type === 'truck' ? 'local_shipping' : selectedAsset.type === 'ship' ? 'directions_boat' : 'flight'}
                </span>
              </div>
              <div>
                <h4 className="font-black text-slate-900 dark:text-white text-xs leading-tight">
                  {selectedAsset.name}
                </h4>
                <p className="text-[10px] text-slate-500 font-mono">{selectedAsset.id}</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedAsset(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div>
              <span className="text-slate-500">Route: </span>
              <strong className="text-slate-800 dark:text-slate-200">{selectedAsset.route}</strong>
            </div>
            <div className="grid grid-cols-2 gap-2 p-2 rounded-lg bg-slate-100 dark:bg-slate-800/60 font-mono text-[10px]">
              <div>
                <span className="text-slate-500 block">Velocity:</span>
                <strong className="text-emerald-600 dark:text-emerald-400">{selectedAsset.speed}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Heading:</span>
                <strong className="text-blue-600 dark:text-blue-400">{selectedAsset.heading}</strong>
              </div>
            </div>
            <div>
              <span className="text-slate-500">Cargo: </span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedAsset.cargo}</span>
            </div>
            <div>
              <span className="text-slate-500">In-Charge: </span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedAsset.operator}</span>
            </div>
            <div className="p-1.5 rounded bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-mono border border-emerald-200 dark:border-emerald-800/50">
              {selectedAsset.telemetry}
            </div>
          </div>
        </div>
      )}

      {/* Main Leaflet Map Container */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[480px]" />
    </div>
  )
}
