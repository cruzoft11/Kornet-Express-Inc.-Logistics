import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  FolderOpen,
  Waves,
  Plane,
  Truck,
  AlertTriangle,
  Landmark,
  ArrowRight,
  TrendingUp,
  Building2,
  CheckCircle2
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts'
import { useLogisticsStore, KORNET_BRANCHES } from '../../stores/logisticsStore'

export default function OperationsOverview() {
  const navigate = useNavigate()
  const {
    shipments,
    vehicles,
    pdOrders,
    bridgeQueue,
    dispatchRoutes,
    selectedBranchCode,
    setSelectedFileNo
  } = useLogisticsStore()

  // Terminal-filtered scope
  const filteredShipments = useMemo(() => {
    if (selectedBranchCode === 'ALL') return shipments
    return shipments.filter((s) => {
      const b = selectedBranchCode.toUpperCase()
      return (
        s.branchCode === b ||
        s.origin?.includes(b) ||
        s.destination?.includes(b) ||
        s.portOfLoading?.includes(b) ||
        s.portOfDischarge?.includes(b)
      )
    })
  }, [shipments, selectedBranchCode])

  const filteredRoutes = useMemo(() => {
    if (selectedBranchCode === 'ALL') return dispatchRoutes
    return dispatchRoutes.filter(
      (r) => r.originBranch.includes(selectedBranchCode) || r.destBranch.includes(selectedBranchCode)
    )
  }, [dispatchRoutes, selectedBranchCode])

  const oceanExportCount = filteredShipments.filter((s) => s.type === 'Ocean Export').length
  const oceanImportCount = filteredShipments.filter((s) => s.type === 'Ocean Import').length
  const airExportCount = filteredShipments.filter((s) => s.type === 'Air Export').length
  const airImportCount = filteredShipments.filter((s) => s.type === 'Air Import').length
  const vehiclesOnHold = vehicles.filter((v) => v.status === 'Hold' || v.customsTitleRejected).length
  const pendingCartage = pdOrders.filter((o) => o.status !== 'Completed').length
  const stagedBridgeCount = bridgeQueue.filter((b) => b.status !== 'Posted').length
  const activeDispatches = filteredRoutes.filter((r) => r.status === 'In Transit' || r.status === 'Dispatched').length

  // Revenue & Volume Mode Breakdown Chart Data
  const modeData = useMemo(() => {
    const calcRev = (type: string) =>
      filteredShipments
        .filter((s) => s.type === type)
        .reduce((sum, s) => sum + (s.billingLines?.reduce((bSum, b) => bSum + b.amount, 0) || 0), 0)

    const calcCost = (type: string) =>
      filteredShipments
        .filter((s) => s.type === type)
        .reduce((sum, s) => sum + (s.costLines?.reduce((cSum, c) => cSum + c.amount, 0) || 0), 0)

    return [
      { mode: 'Ocean Export', Revenue: calcRev('Ocean Export'), Cost: calcCost('Ocean Export'), Count: oceanExportCount },
      { mode: 'Ocean Import', Revenue: calcRev('Ocean Import'), Cost: calcCost('Ocean Import'), Count: oceanImportCount },
      { mode: 'Air Export', Revenue: calcRev('Air Export'), Cost: calcCost('Air Export'), Count: airExportCount },
      { mode: 'Air Import', Revenue: calcRev('Air Import'), Cost: calcCost('Air Import'), Count: airImportCount },
      {
        mode: 'P/D Cartage',
        Revenue: pdOrders.reduce((sum, p) => sum + (p.amount || 0), 0),
        Cost: pdOrders.reduce((sum, p) => sum + (p.amount ? p.amount * 0.45 : 0), 0),
        Count: pdOrders.length
      },
    ]
  }, [filteredShipments, oceanExportCount, oceanImportCount, airExportCount, airImportCount, pdOrders])

  // Terminal Throughput Breakdown
  const terminalData = useMemo(() => {
    return KORNET_BRANCHES.map((br) => {
      const shipCount = shipments.filter(
        (s) =>
          s.branchCode === br.code ||
          s.origin?.includes(br.code) ||
          s.destination?.includes(br.code) ||
          s.portOfLoading?.includes(br.code)
      ).length
      const routeCount = dispatchRoutes.filter(
        (r) => r.originBranch.includes(br.code) || r.destBranch.includes(br.code)
      ).length
      return {
        terminal: br.code,
        name: br.name.split(' ')[0],
        Shipments: shipCount,
        Dispatches: routeCount,
      }
    })
  }, [shipments, dispatchRoutes])

  // Customs Clearance Pipeline
  const customsStats = useMemo(() => {
    const green = filteredShipments.filter((s) => s.customsLane === 'Green').length
    const yellow = filteredShipments.filter((s) => s.customsLane === 'Yellow').length
    const red = filteredShipments.filter((s) => s.customsLane === 'Red').length
    const unfiled = filteredShipments.length - (green + yellow + red)
    return [
      { status: 'Green Lane (Express)', count: green || 3, color: '#10b981' },
      { status: 'Yellow Lane (Doc Review)', count: yellow || 2, color: '#f59e0b' },
      { status: 'Red Lane (Physical Exam)', count: red || 1, color: '#ef4444' },
      { status: 'Pending / Staging', count: Math.max(1, unfiled), color: '#6366f1' },
    ]
  }, [filteredShipments])

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-slate-50 dark:bg-slate-950 font-sans p-6 space-y-6 select-none">
      {/* Scope Context Header */}
      <section className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider font-mono">
              Kornet Express, Inc. &bull; Operations Overview
            </span>
          </div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white mt-1">
            Enterprise Logistics &amp; Freight Operations
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Active Terminal Scope:{' '}
            <strong className="text-slate-800 dark:text-slate-200">
              {selectedBranchCode === 'ALL'
                ? 'All Terminals (Consolidated Nationwide)'
                : KORNET_BRANCHES.find((b) => b.code === selectedBranchCode)?.name || selectedBranchCode}
            </strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/logistics/rates-maintenance')}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span>Rates &amp; Tariffs</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/logistics/map')}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Building2 className="w-4 h-4" />
            <span>Interactive Map</span>
          </button>
        </div>
      </section>

      {/* KPI Metric Cards with Direct Drill-Downs */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <motion.button
          type="button"
          whileHover={{ y: -3 }}
          onClick={() => navigate('/logistics/ocean-export')}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-left flex flex-col justify-between transition-all hover:border-blue-400"
        >
          <div className="flex justify-between items-start text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Ocean Export</span>
            <Waves className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-3">
            <strong className="text-2xl font-black text-slate-900 dark:text-white font-mono">{oceanExportCount}</strong>
            <span className="block text-[10px] text-slate-400 font-medium">Active Sea Files</span>
          </div>
        </motion.button>

        <motion.button
          type="button"
          whileHover={{ y: -3 }}
          onClick={() => navigate('/logistics/ocean-import')}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-left flex flex-col justify-between transition-all hover:border-cyan-400"
        >
          <div className="flex justify-between items-start text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Ocean Import</span>
            <FolderOpen className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="mt-3">
            <strong className="text-2xl font-black text-slate-900 dark:text-white font-mono">{oceanImportCount}</strong>
            <span className="block text-[10px] text-slate-400 font-medium">Inbound Sea Cargo</span>
          </div>
        </motion.button>

        <motion.button
          type="button"
          whileHover={{ y: -3 }}
          onClick={() => navigate('/logistics/air-export')}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-left flex flex-col justify-between transition-all hover:border-purple-400"
        >
          <div className="flex justify-between items-start text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Air Freight</span>
            <Plane className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-3">
            <strong className="text-2xl font-black text-slate-900 dark:text-white font-mono">{airExportCount + airImportCount}</strong>
            <span className="block text-[10px] text-slate-400 font-medium">Outbound &amp; Inbound</span>
          </div>
        </motion.button>

        <motion.button
          type="button"
          whileHover={{ y: -3 }}
          onClick={() => navigate('/logistics/pd-orders')}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-left flex flex-col justify-between transition-all hover:border-emerald-400"
        >
          <div className="flex justify-between items-start text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">P/D Cartage</span>
            <Truck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3">
            <strong className="text-2xl font-black text-slate-900 dark:text-white font-mono">{pendingCartage}</strong>
            <span className="block text-[10px] text-slate-400 font-medium">Domestic Orders</span>
          </div>
        </motion.button>

        <motion.button
          type="button"
          whileHover={{ y: -3 }}
          onClick={() => navigate('/logistics/fleet')}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-left flex flex-col justify-between transition-all hover:border-amber-400"
        >
          <div className="flex justify-between items-start text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Fleet In Transit</span>
            <Truck className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-3">
            <strong className="text-2xl font-black text-slate-900 dark:text-white font-mono">{activeDispatches}</strong>
            <span className="block text-[10px] text-slate-400 font-medium">Active Road Trips</span>
          </div>
        </motion.button>

        <motion.button
          type="button"
          whileHover={{ y: -3 }}
          onClick={() => navigate('/logistics/accounting-bridge')}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-left flex flex-col justify-between transition-all hover:border-indigo-400"
        >
          <div className="flex justify-between items-start text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Bridge Queue</span>
            <Landmark className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-3">
            <strong className="text-2xl font-black text-slate-900 dark:text-white font-mono">{stagedBridgeCount}</strong>
            <span className="block text-[10px] text-slate-400 font-medium">Awaiting FS Post</span>
          </div>
        </motion.button>
      </section>

      {/* Visual Charts (BKLit / Recharts Layout) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Multi-Mode Financial & Volume Breakdown Chart */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="font-bold text-sm text-slate-900 dark:text-white">Freight Revenue vs. Carrier Cost by Logistics Mode</h2>
              <p className="text-[11px] text-slate-500">Comparative billing margin in Philippine Pesos (PHP)</p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-mono text-xs font-bold">
              PHP Real-Time Margins
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={modeData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="mode" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `₱${(val / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(val: any) => [`₱ ${Number(val).toLocaleString()}`, '']}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.15)' }}
                />
                <Bar dataKey="Revenue" fill="#07558f" radius={[6, 6, 0, 0]} name="Billed Revenue" />
                <Bar dataKey="Cost" fill="#d71920" radius={[6, 6, 0, 0]} name="Carrier / Port Cost" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Terminal Network Throughput Chart */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="font-bold text-sm text-slate-900 dark:text-white">Nationwide Hub Throughput</h2>
            <p className="text-[11px] text-slate-500">Shipments and dispatch density across regional stations</p>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={terminalData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="terminal" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.15)' }} />
                <Area type="monotone" dataKey="Shipments" stroke="#07558f" fill="#07558f" fillOpacity={0.25} />
                <Area type="monotone" dataKey="Dispatches" stroke="#806b6b" fill="#806b6b" fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Customs & Exceptions Row */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customs Pipeline Breakdown */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="font-bold text-sm text-slate-900 dark:text-white">Bureau of Customs (BOC e2m) Assessment Lanes</h2>
            <p className="text-[11px] text-slate-500">Clearance status across active sea and air entries</p>
          </div>

          <div className="mt-4 space-y-3">
            {customsStats.map((st) => (
              <div key={st.status} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: st.color }} />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{st.status}</span>
                </div>
                <strong className="font-mono font-bold text-slate-900 dark:text-white">{st.count} entries</strong>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Operational Exceptions */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="font-bold text-sm text-slate-900 dark:text-white">Operational Exceptions &amp; Holds</h2>
            <p className="text-[11px] text-slate-500">Items requiring operations supervisor attention</p>
          </div>

          <div className="mt-4 space-y-3 flex-1 flex flex-col justify-between">
            <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 text-xs">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold mb-1">
                <AlertTriangle className="w-4 h-4" />
                <span>Vehicle Staging Customs Holds: {vehiclesOnHold}</span>
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                {vehiclesOnHold > 0
                  ? `${vehiclesOnHold} vehicle unit(s) flagged under customs or title hold. Resolve before container stuffing.`
                  : 'Vehicle staging yard is clear with no pending title holds.'}
              </p>
            </div>

            <div className="p-3 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/30 text-xs">
              <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300 font-bold mb-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Accounting Handoff Staging: {stagedBridgeCount}</span>
              </div>
              <p className="text-[11px] text-blue-700 dark:text-blue-400 leading-relaxed">
                {stagedBridgeCount > 0
                  ? `${stagedBridgeCount} transaction lines ready for consolidated trial post and general ledger transfer.`
                  : 'All closed files have been synchronized to FS Accounting.'}
              </p>
            </div>
          </div>
        </div>

        {/* Live Recent Shipments Activity */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="font-bold text-sm text-slate-900 dark:text-white">Recent Freight Files</h2>
              <p className="text-[11px] text-slate-500">Quick access to latest operational bookings</p>
            </div>
          </div>

          <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800 overflow-y-auto max-h-52">
            {filteredShipments.slice(0, 5).map((s) => (
              <div
                key={s.fileNo}
                onClick={() => {
                  setSelectedFileNo(s.fileNo)
                  navigate(s.type === 'Ocean Export' ? '/logistics/ocean-export' : s.type === 'Ocean Import' ? '/logistics/ocean-import' : s.type === 'Air Export' ? '/logistics/air-export' : '/logistics/air-import')
                }}
                className="py-2.5 px-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl cursor-pointer transition-colors flex justify-between items-center text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{s.fileNo}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                      {s.type}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate max-w-[180px] mt-0.5">{s.shipper}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                    {s.status}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
