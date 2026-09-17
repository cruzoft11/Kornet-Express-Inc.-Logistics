import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Waves,
  Ship,
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
  ChevronRight
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

  const navItems = [
    {
      id: 'overview',
      path: '/logistics/overview',
      module: 'overview' as const,
      label: 'Operations Overview',
      icon: LayoutDashboard,
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
      badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
    },
    {
      id: 'ocean-import',
      path: '/logistics/ocean-import',
      module: 'ocean-import' as const,
      label: 'Ocean Import',
      icon: Ship,
      badge: oceanImportCount,
      badgeColor: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300'
    },
    {
      id: 'air-export',
      path: '/logistics/air-export',
      module: 'air-export' as const,
      label: 'Air Export',
      icon: PlaneTakeoff,
      badge: airExportCount,
      badgeColor: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
    },
    {
      id: 'air-import',
      path: '/logistics/air-import',
      module: 'air-import' as const,
      label: 'Air Import',
      icon: PlaneLanding,
      badge: airImportCount,
      badgeColor: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
    },
    {
      id: 'vehicles',
      path: '/logistics/vehicles',
      module: 'vehicles' as const,
      label: 'Vehicle Inventory',
      icon: Car,
      badge: holdVehiclesCount > 0 ? `${holdVehiclesCount} Hold` : null,
      badgeColor: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
    },
    {
      id: 'pd-orders',
      path: '/logistics/pd-orders',
      module: 'pd' as const,
      label: 'P/D Cartage',
      icon: Truck,
      badge: pendingPdCount > 0 ? pendingPdCount : null,
      badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
    },
    {
      id: 'fleet',
      path: '/logistics/fleet',
      module: 'fleet' as const,
      label: 'Fleet & Dispatch',
      icon: Send,
      badge: activeDispatchCount > 0 ? activeDispatchCount : null,
      badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
    },
    {
      id: 'map',
      path: '/logistics/map',
      module: 'map' as const,
      label: 'Nationwide Map',
      icon: MapPin,
      badge: null,
      badgeColor: ''
    },
    {
      id: 'accounting-bridge',
      path: '/logistics/accounting-bridge',
      module: 'bridge' as const,
      label: 'Accounting Bridge',
      icon: Landmark,
      badge: pendingBridgeCount > 0 ? pendingBridgeCount : null,
      badgeColor: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
    },
    {
      id: 'tracking',
      path: '/logistics/tracking',
      module: 'tracking' as const,
      label: 'Tracking Portal',
      icon: Search,
      badge: null,
      badgeColor: ''
    },
    {
      id: 'rates-maintenance',
      path: '/logistics/rates-maintenance',
      module: 'rates' as const,
      label: 'Rates & Maintenance',
      icon: Sliders,
      badge: 'Live FX',
      badgeColor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
    }
  ]

  const handleNavClick = (item: (typeof navItems)[number]) => {
    setActiveModule(item.module)
    navigate(item.path)
  }

  return (
    <aside
      className={`relative border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-200 flex flex-col justify-between select-none ${
        sidebarCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Top Section: Brand & Modules List */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Collapse Toggle Bar */}
        <div className="flex items-center justify-between px-3.5 py-3 border-b border-slate-100 dark:border-slate-800">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black tracking-wider uppercase text-slate-500 font-mono">
                Logistics Modules
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mx-auto"
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Modules List */}
        <div className="flex-1 overflow-y-auto px-2 py-2.5 space-y-1">
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
                className={`w-full relative flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                  isActive
                    ? 'bg-blue-50/90 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-extrabold shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebarActivePill"
                    className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-blue-600 rounded-r-full"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
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

      {/* Bottom Switcher: Jump to FS Accounting */}
      <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
        <button
          type="button"
          onClick={() => navigate('/fs/reports/trial-balance')}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors shadow-sm"
          title="Open Financial Statements & General Ledger"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          {!sidebarCollapsed && (
            <div className="flex-1 text-left truncate">
              <span className="block text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
                FS Accounting Ledger
              </span>
              <span className="block text-[9px] text-slate-400 font-mono">Trial Balance &bull; CDV</span>
            </div>
          )}
        </button>
      </div>
    </aside>
  )
}
