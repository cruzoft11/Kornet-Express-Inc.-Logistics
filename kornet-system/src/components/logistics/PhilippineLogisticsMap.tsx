import { useState } from 'react'
import { useLogisticsStore, KORNET_BRANCHES, PhilippineBranch } from '../../stores/logisticsStore'
import { useSettingsStore } from '../../stores/settingsStore'
import PhilippineLeafletMap from './PhilippineLeafletMap'

interface MapPin {
  branch: PhilippineBranch
  svgX: number
  svgY: number
  type: 'air' | 'sea' | 'land' | 'hq'
}

const BRANCH_PINS: MapPin[] = [
  { branch: KORNET_BRANCHES[0], svgX: 250, svgY: 280, type: 'hq' }, // Manila
  { branch: KORNET_BRANCHES[1], svgX: 215, svgY: 270, type: 'sea' }, // Bataan
  { branch: KORNET_BRANCHES[2], svgX: 235, svgY: 230, type: 'air' }, // Clark
  { branch: KORNET_BRANCHES[3], svgX: 430, svgY: 480, type: 'sea' }, // Cebu
  { branch: KORNET_BRANCHES[4], svgX: 470, svgY: 710, type: 'sea' }, // Davao
  { branch: KORNET_BRANCHES[5], svgX: 410, svgY: 630, type: 'sea' }, // CDO
]

export default function PhilippineLogisticsMap() {
  const { dispatchRoutes, setActiveModule, setActiveRibbonTab } = useLogisticsStore()
  const darkMode = useSettingsStore((s) => s.darkMode)

  const [selectedBranch, setSelectedBranch] = useState<PhilippineBranch>(KORNET_BRANCHES[0])
  const [activeLayer, setActiveLayer] = useState<'all' | 'sea' | 'air' | 'land'>('all')
  const [mapMode, setMapMode] = useState<'leaflet' | 'vector'>('leaflet')

  const activeBranchDispatches = dispatchRoutes.filter(
    (d) => d.originBranch.includes(selectedBranch.code) || d.destBranch.includes(selectedBranch.code)
  )

  return (
    <div className={`flex-1 flex flex-col overflow-hidden select-none font-body ${darkMode ? 'bg-[#0a0f1d] text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Header Bar */}
      <div className={`px-6 py-3 border-b flex items-center justify-between ${darkMode ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-sm shadow-sm">
            <span className="material-symbols-outlined text-[18px]">map</span>
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">Kornet Express Nationwide Logistics Map</h1>
            <p className="text-[11px] text-slate-500">
              Air, Sea & Land Inter-Island Network &bull; 6 Strategic Hubs across Luzon, Visayas & Mindanao
            </p>
          </div>
        </div>

        {/* Map Mode & Corridor Layer Toggles */}
        <div className="flex items-center gap-3">
          {/* Mode Switcher */}
          <div className={`p-0.5 rounded-lg border flex items-center text-xs ${
            darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-200/80 border-slate-300'
          }`}>
            <button
              onClick={() => setMapMode('leaflet')}
              className={`px-2.5 py-1 rounded-md font-bold transition-all flex items-center gap-1 ${
                mapMode === 'leaflet'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">public</span>
              Interactive Tiles
            </button>
            <button
              onClick={() => setMapMode('vector')}
              className={`px-2.5 py-1 rounded-md font-bold transition-all flex items-center gap-1 ${
                mapMode === 'vector'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">polyline</span>
              Vector
            </button>
          </div>

          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700" />

          {/* Corridor Layer Toggles */}
          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => setActiveLayer('all')}
              className={`px-3 py-1 rounded-md font-bold transition-all ${
                activeLayer === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              All Corridors
            </button>
            <button
              onClick={() => setActiveLayer('sea')}
              className={`px-3 py-1 rounded-md font-bold transition-all flex items-center gap-1 ${
                activeLayer === 'sea'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">directions_boat</span> Sea Lanes
            </button>
            <button
              onClick={() => setActiveLayer('air')}
              className={`px-3 py-1 rounded-md font-bold transition-all flex items-center gap-1 ${
                activeLayer === 'air'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">flight</span> Air Corridors
            </button>
            <button
              onClick={() => setActiveLayer('land')}
              className={`px-3 py-1 rounded-md font-bold transition-all flex items-center gap-1 ${
                activeLayer === 'land'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">local_shipping</span> Land Cartage
            </button>
          </div>
        </div>
      </div>

      {/* Main Map & Hub Details Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Map View (Interactive Leaflet or Stylized Vector) */}
        {mapMode === 'leaflet' ? (
          <div className="flex-1 relative flex overflow-hidden">
            <PhilippineLeafletMap
              selectedBranch={selectedBranch}
              onSelectBranch={setSelectedBranch}
              activeLayer={activeLayer}
            />
          </div>
        ) : (
          <div className={`flex-1 relative flex items-center justify-center p-4 overflow-hidden ${darkMode ? 'bg-[#080d19]' : 'bg-slate-100'}`}>
            <svg
              viewBox="0 0 700 850"
              className="w-full h-full max-h-[750px] object-contain drop-shadow-md select-none"
            >
            {/* Philippine Archipelago Outlines / Stylized Silhouettes */}
            <g fill={darkMode ? '#1e293b' : '#cbd5e1'} stroke={darkMode ? '#334155' : '#94a3b8'} strokeWidth="1.5">
              {/* Luzon Island Silhouette */}
              <path d="M 180 120 Q 220 70 280 90 Q 320 130 300 190 L 260 210 Q 280 250 290 300 Q 330 340 370 360 Q 380 400 350 430 Q 300 400 280 340 L 240 330 Q 200 330 190 270 Q 170 220 190 170 Z" />
              {/* Palawan Island */}
              <path d="M 120 400 Q 160 480 210 560 L 195 570 Q 140 490 105 410 Z" />
              {/* Mindoro */}
              <path d="M 210 350 Q 240 350 250 390 Q 230 420 205 400 Z" />
              {/* Panay & Negros (Western Visayas) */}
              <path d="M 310 450 Q 350 440 360 490 Q 340 540 310 520 Z" />
              {/* Cebu Island */}
              <path d="M 415 440 Q 440 470 435 520 L 420 515 Q 425 470 410 445 Z" />
              {/* Leyte & Samar (Eastern Visayas) */}
              <path d="M 430 370 Q 480 390 470 450 Q 440 460 430 420 Z" />
              {/* Mindanao Island */}
              <path d="M 330 590 Q 450 560 520 620 Q 540 700 480 760 Q 420 780 370 730 Q 330 680 360 630 Z" />
            </g>

            {/* Logistics Corridors Vectors */}
            {/* Sea Lanes */}
            {(activeLayer === 'all' || activeLayer === 'sea') && (
              <g stroke="#06b6d4" strokeWidth="2.5" strokeDasharray="6,4" fill="none" opacity="0.8">
                {/* Manila to Cebu */}
                <path d="M 250 280 Q 350 380 430 480" />
                {/* Cebu to Cagayan De Oro */}
                <path d="M 430 480 L 410 630" />
                {/* Cebu to Davao */}
                <path d="M 430 480 Q 480 580 470 710" />
                {/* Manila to Bataan Harbor */}
                <path d="M 250 280 L 215 270" />
              </g>
            )}

            {/* Air Corridors */}
            {(activeLayer === 'all' || activeLayer === 'air') && (
              <g stroke="#6366f1" strokeWidth="2.5" strokeDasharray="4,6" fill="none" opacity="0.85">
                {/* Clark to Cebu */}
                <path d="M 235 230 Q 340 350 430 480" />
                {/* Clark to Davao */}
                <path d="M 235 230 Q 380 460 470 710" />
              </g>
            )}

            {/* Land Transportation Arteries */}
            {(activeLayer === 'all' || activeLayer === 'land') && (
              <g stroke="#f59e0b" strokeWidth="3" fill="none" opacity="0.9">
                {/* Manila <-> Clark (NLEX) */}
                <path d="M 250 280 L 235 230" />
                {/* Clark <-> Bataan (SCTEX) */}
                <path d="M 235 230 L 215 270" />
                {/* CDO <-> Davao Highway */}
                <path d="M 410 630 L 470 710" />
              </g>
            )}

            {/* Branch Hub Interactive Pins */}
            {BRANCH_PINS.map((pin) => {
              const isSelected = selectedBranch.id === pin.branch.id
              return (
                <g
                  key={pin.branch.id}
                  transform={`translate(${pin.svgX}, ${pin.svgY})`}
                  onClick={() => setSelectedBranch(pin.branch)}
                  className="cursor-pointer group"
                >
                  {/* Ping Animation on Selected */}
                  {isSelected && (
                    <circle
                      r="18"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2"
                      className="animate-ping opacity-75 origin-center"
                    />
                  )}
                  {/* Pin Base Circle */}
                  <circle
                    r={isSelected ? '12' : '9'}
                    fill={
                      pin.type === 'hq'
                        ? '#2563eb'
                        : pin.type === 'air'
                        ? '#4f46e5'
                        : '#059669'
                    }
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="transition-all group-hover:scale-125"
                  />
                  {/* Branch Code Label */}
                  <rect
                    x="-20"
                    y="-28"
                    width="40"
                    height="16"
                    rx="4"
                    fill={darkMode ? '#0f172a' : '#ffffff'}
                    stroke={isSelected ? '#3b82f6' : '#94a3b8'}
                    strokeWidth={isSelected ? '1.5' : '1'}
                    className="shadow-sm"
                  />
                  <text
                    x="0"
                    y="-16"
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="bold"
                    fill={darkMode ? '#ffffff' : '#0f172a'}
                  >
                    {pin.branch.code}
                  </text>
                </g>
              )
            })}
          </svg>

          {/* Map Legend */}
          <div className={`absolute bottom-4 left-4 p-3 rounded-xl border backdrop-blur-md shadow-lg text-[11px] space-y-1.5 ${
            darkMode ? 'bg-[#0f172a]/90 border-slate-700' : 'bg-white/90 border-slate-200'
          }`}>
            <div className="font-bold text-xs mb-1">Kornet Network Key</div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              <span>Headquarters (Manila South Harbor)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
              <span>Air Cargo Depot (Clark CRK)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
              <span>Seaport Terminals (Bataan, Cebu, Davao, CDO)</span>
            </div>
          </div>
        </div>
      )}

        {/* Right Info Drawer: Selected Hub Details */}
        <div className={`w-full lg:w-96 border-l p-6 flex flex-col justify-between overflow-y-auto ${
          darkMode ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-[10px] font-black uppercase tracking-wider">
                {selectedBranch.code} &bull; {selectedBranch.type}
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight mb-1">{selectedBranch.name}</h2>
            <p className="text-xs text-slate-500 mb-4">{selectedBranch.address}</p>

            <div className={`p-4 rounded-xl border space-y-2.5 text-xs mb-6 ${
              darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex justify-between">
                <span className="text-slate-500">City / Province:</span>
                <span className="font-bold">{selectedBranch.city}, {selectedBranch.province}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Dispatch Hotline:</span>
                <span className="font-mono font-bold text-blue-500">{selectedBranch.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Facility Type:</span>
                <span className="font-bold">{selectedBranch.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Operating Status:</span>
                <span className="font-bold text-emerald-500 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  24/7 Live Operations
                </span>
              </div>
            </div>

            {/* Branch Dispatches */}
            <div className="mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Active Dispatches for {selectedBranch.code} ({activeBranchDispatches.length})
              </h3>
              {activeBranchDispatches.length === 0 ? (
                <div className="text-xs text-slate-400 italic p-3 text-center border border-dashed rounded-lg">
                  No active route dispatches running through this terminal.
                </div>
              ) : (
                <div className="space-y-2">
                  {activeBranchDispatches.map((r) => (
                    <div key={r.id} className={`p-2.5 rounded-lg border text-xs ${
                      darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-100 border-slate-200'
                    }`}>
                      <div className="flex justify-between font-bold">
                        <span>{r.dispatchNo}</span>
                        <span className="text-blue-500">{r.status}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Driver: {r.driverName} ({r.vehiclePlate})
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Hub Selector Grid */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Switch Regional Hub
              </h3>
              <div className="grid grid-cols-3 gap-1.5">
                {KORNET_BRANCHES.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBranch(b)}
                    className={`py-2 px-1 rounded-lg border text-center font-bold text-xs transition-all ${
                      selectedBranch.id === b.id
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {b.code}
                    <div className="text-[9px] font-normal opacity-70 truncate">{b.city}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-6 border-t dark:border-slate-800 mt-6">
            <button
              onClick={() => {
                setActiveModule('fleet')
                setActiveRibbonTab('Fleet')
              }}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">alt_route</span>
              Open Fleet & Dispatch Control Center
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
