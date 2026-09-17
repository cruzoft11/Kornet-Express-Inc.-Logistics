import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Compass,
  Ship,
  Waves,
  Plane,
  PlaneTakeoff,
  PlaneLanding,
  Car,
  Truck,
  Send,
  MapPin,
  Landmark,
  Search,
  Sliders,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Radio
} from 'lucide-react'
import { useLogisticsStore } from '../../stores/logisticsStore'

export default function LogisticsSidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    sidebarCollapsed,
    toggleSidebar,
    bridgeQueue,
    vehicles,
    pdOrders,
    dispatchRoutes,
    shipments,
    setActiveModule
  } = useLogisticsStore()

  const pendingBridgeCount = bridgeQueue.filter((b) => b.status !== 'Posted').length
  const holdVehiclesCount = vehicles.filter((v) => v.status === 'Hold' || v.customsTitleRejected).length
  const pendingPdCount = pdOrders.filter((o) => o.status !== 'Completed').length
  const activeDispatchCount = dispatchRoutes.filter((r) => r.status === 'In Transit').length

  const oceanExportCount = shipments.filter((s) => s.type === 'Ocean Export').length
  const oceanImportCount = shipments.filter((s) => s.type === 'Ocean Import').length
  const airExportCount = shipments.filter((s) => s.type === 'Air Export').length
  const airImportCount = shipments.filter((s) => s.type === 'Air Import').length

  // Calculate live multimodal TEU sum
  const totalTeu = shipments.reduce((sum, s) => {
    const teu = s.teu || (s.containers ? s.containers.length : 1)
    return sum + (Number(teu) || 1)
  }, 0)

  const navItems = [
    {
      id: 'overview',
      path: '/logistics/overview',
      module: 'overview' as const,
      label: 'Global Matrix',
      icon: Compass,
      badge: null,
      badgeColor: ''
    },
    {
      id: 'ocean-export',
      path: '/logistics/ocean-export',
      module: 'ocean-export' as const,
      label: 'Ocean Export',
      icon: Waves,
      badge: oceanExportCount,
      badgeColor: 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
    },
    {
      id: 'ocean-import',
      path: '/logistics/ocean-import',
      module: 'ocean-import' as const,
      label: 'Ocean Import',
      icon: Ship,
      badge: oceanImportCount,
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
    },
    {
      id: 'air-export',
      path: '/logistics/air-export',
      module: 'air-export' as const,
      label: 'Air Export IATA',
      icon: PlaneTakeoff,
      badge: airExportCount,
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30'
    },
    {
      id: 'air-import',
      path: '/logistics/air-import',
      module: 'air-import' as const,
      label: 'Air Import IATA',
      icon: PlaneLanding,
      badge: airImportCount,
      badgeColor: 'bg-sky-500/20 text-sky-300 border border-sky-400/30'
    },
    {
      id: 'vehicles',
      path: '/logistics/vehicles',
      module: 'vehicles' as const,
      label: 'Vehicle Staging',
      icon: Car,
      badge: holdVehiclesCount > 0 ? `${holdVehiclesCount} Hold` : null,
      badgeColor: 'bg-red-500/25 text-red-300 border border-red-500/40'
    },
    {
      id: 'pd-orders',
      path: '/logistics/pd-orders',
      module: 'pd' as const,
      label: 'Drayage / P&D',
      icon: Truck,
      badge: pendingPdCount > 0 ? pendingPdCount : null,
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
    },
    {
      id: 'fleet',
      path: '/logistics/fleet',
      module: 'fleet' as const,
      label: 'Fleet Telematics',
      icon: Send,
      badge: activeDispatchCount > 0 ? `${activeDispatchCount} Active` : null,
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
    },
    {
      id: 'map',
      path: '/logistics/map',
      module: 'map' as const,
      label: 'Nautical & Air Map',
      icon: MapPin,
      badge: null,
      badgeColor: ''
    },
    {
      id: 'accounting-bridge',
      path: '/logistics/accounting-bridge',
      module: 'bridge' as const,
      label: 'GL Accounting Bridge',
      icon: Landmark,
      badge: pendingBridgeCount > 0 ? pendingBridgeCount : null,
      badgeColor: 'bg-rose-500/25 text-rose-300 border border-rose-500/40'
    },
    {
      id: 'tracking',
      path: '/logistics/tracking',
      module: 'tracking' as const,
      label: 'Milestone Tracking',
      icon: Search,
      badge: null,
      badgeColor: ''
    },
    {
      id: 'rates-maintenance',
      path: '/logistics/rates-maintenance',
      module: 'rates' as const,
      label: 'Rates & Tariffs',
      icon: Sliders,
      badge: 'FX Live',
      badgeColor: 'bg-teal-500/20 text-teal-300 border border-teal-400/30'
    }
  ]

  const handleNavClick = (item: (typeof navItems)[number]) => {
    setActiveModule(item.module)
    navigate(item.path)
  }

  return (
    <aside
      className={`relative border-r border-white/10 bg-[#061426]/75 backdrop-blur-2xl transition-all duration-300 flex flex-col justify-between select-none shadow-[12px_0_32px_rgba(2,14,33,0.45)] z-30 ${
        sidebarCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* ══ Top Section: Fleet Telemetry Mini-Gauge & Modules List ══ */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Multimodal Fleet Gauge (Stitch Sidebar Header) */}
        {!sidebarCollapsed ? (
          <div className="p-3 m-3 rounded-xl liquid-glass-subtle border border-white/10 flex flex-col gap-1.5 shadow-sm">
            <div className="flex items-center justify-between text-[10px] font-mono text-[#c3c6d7] uppercase tracking-wider">
              <span>Active Multimodal Fleet</span>
              <button
                type="button"
                onClick={toggleSidebar}
                className="p-0.5 rounded text-slate-400 hover:text-white transition-colors"
                title="Collapse sidebar"
              >
                <ChevronLeft size={14} />
              </button>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-sm font-bold text-white tracking-tight">
                {totalTeu > 0 ? totalTeu : '1,248'} <span className="text-[10px] text-blue-400 font-normal">TEU</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-medium">+4.2% MoM</span>
            </div>
            <div className="w-full bg-[#020e21] h-1.5 rounded-full overflow-hidden p-[1px] border border-white/5">
              <div
                className="bg-gradient-to-r from-blue-600 to-blue-400 h-full rounded-full shadow-[0_0_8px_rgba(37,99,235,0.7)]"
                style={{ width: '74%' }}
              />
            </div>
          </div>
        ) : (
          <div className="py-3 flex justify-center border-b border-white/10">
            <button
              type="button"
              onClick={toggleSidebar}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Expand sidebar"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Navigation Item Matrix */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1 custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive =
              location.pathname === item.path ||
              (item.path === '/logistics/overview' && (location.pathname === '/logistics' || location.pathname === '/logistics/')) ||
              (item.path === '/logistics/ocean-export' && location.pathname.includes('ocean-export')) ||
              (item.path === '/logistics/ocean-import' && location.pathname.includes('ocean-import')) ||
              (item.path === '/logistics/air-export' && location.pathname.includes('air-export')) ||
              (item.path === '/logistics/air-import' && location.pathname.includes('air-import'))

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item)}
                className={`w-full relative flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all group ${
                  isActive
                    ? 'nav-active-pill text-white font-bold shadow-[0_0_18px_rgba(37,99,235,0.45)]'
                    : 'text-[#c3c6d7] hover:bg-white/5 hover:text-white'
                }`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebarActivePill"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 -z-10"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <Icon
                  className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-white' : 'text-blue-400/80 group-hover:text-blue-300'
                  }`}
                />
                {!sidebarCollapsed && (
                  <div className="flex-1 flex items-center justify-between truncate">
                    <span className="truncate">{item.label}</span>
                    {item.badge !== null && (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ══ Bottom Section: Security Status & FS Gateway ══ */}
      <div className="p-3 border-t border-white/10 flex flex-col gap-2 bg-[#061426]/90">
        {!sidebarCollapsed && (
          <div className="p-2 rounded-xl bg-[#020e21]/80 border border-white/10 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[9px] uppercase font-mono text-[#c3c6d7]/70">Security Protocol</span>
              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
                TLS 1.3 ENCRYPTED
              </span>
            </div>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
        )}

        {/* Jump to Financial Statements */}
        <button
          type="button"
          onClick={() => navigate('/fs/reports/trial-balance')}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-emerald-500/30 bg-emerald-950/30 hover:bg-emerald-900/40 text-xs font-semibold text-emerald-200 transition-all ${
            sidebarCollapsed ? 'justify-center' : ''
          }`}
          title="Open Financial Statements & GL Ledger"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          {!sidebarCollapsed && (
            <div className="flex-1 text-left truncate">
              <span className="block text-[11px] font-bold text-white truncate">FS Ledger &amp; Balance</span>
              <span className="block text-[9px] text-emerald-400/80 font-mono">Trial Balance &bull; CDV</span>
            </div>
          )}
        </button>

        {!sidebarCollapsed && (
          <div className="flex items-center justify-between text-[9px] font-mono text-[#c3c6d7]/50 px-1">
            <span>PORT: USLAX-99</span>
            <span>NODE: SEC-ALPHA</span>
          </div>
        )}
      </div>
    </aside>
  )
}
