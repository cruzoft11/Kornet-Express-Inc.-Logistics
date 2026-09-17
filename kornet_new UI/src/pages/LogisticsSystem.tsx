import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useLogisticsStore } from '../stores/logisticsStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useIntegrationsStore } from '../stores/integrationsStore'
import LogisticsHeader from '../components/logistics/LogisticsHeader'
import LogisticsSidebar from '../components/logistics/LogisticsSidebar'
import OperationsOverview from '../components/logistics/OperationsOverview'
import OceanFreightManager from '../components/logistics/OceanFreightManager'
import AirFreightManager from '../components/logistics/AirFreightManager'
import VehicleInventoryManager from '../components/logistics/VehicleInventoryManager'
import PDOrdersManager from '../components/logistics/PDOrdersManager'
import AccountingBridgeView from '../components/logistics/AccountingBridgeView'
import CustomerTrackingPortal from '../components/logistics/CustomerTrackingPortal'
import FleetDispatchManager from '../components/logistics/FleetDispatchManager'
import PhilippineLogisticsMap from '../components/logistics/PhilippineLogisticsMap'
import RatesMaintenanceManager from '../components/logistics/RatesMaintenanceManager'
import KornetLoader from '../components/common/KornetLoader'

// Global Modals
import PrintDocumentModal from '../components/logistics/PrintDocumentModal'
import AuditLogModal from '../components/logistics/AuditLogModal'
import AttachmentModal from '../components/logistics/AttachmentModal'
import ContainerStuffingModal from '../components/logistics/ContainerStuffingModal'
import OceanManifestModal from '../components/logistics/OceanManifestModal'
import NewChargeModal from '../components/logistics/NewChargeModal'
import FileAnalysisModal from '../components/logistics/FileAnalysisModal'
import {
  SEDFilingModal,
  BillingCodesModal,
  CarriersDirectoryModal,
  PortsDirectoryModal,
  SystemDiagnosticsModal
} from '../components/logistics/LogisticsAuxModals'
import IntegrationsSettings from '../components/logistics/IntegrationsSettings'

export default function LogisticsSystem() {
  const location = useLocation()
  const {
    activeModule,
    hydrateOperationalData,
    operationalHydrated,
    shipmentsLoading
  } = useLogisticsStore()
  const darkMode = useSettingsStore((s) => s.darkMode)
  const fetchIntegrations = useIntegrationsStore((s) => s.fetchIntegrations)

  useEffect(() => {
    void fetchIntegrations()
  }, [fetchIntegrations])

  useEffect(() => {
    void hydrateOperationalData()
  }, [hydrateOperationalData])

  // Sync route URL with active module
  const currentPath = location.pathname

  // Derive active view key from URL or store fallback
  let viewKey = 'overview'
  if (currentPath.includes('ocean-export')) viewKey = 'ocean-export'
  else if (currentPath.includes('ocean-import')) viewKey = 'ocean-import'
  else if (currentPath.includes('air-export')) viewKey = 'air-export'
  else if (currentPath.includes('air-import')) viewKey = 'air-import'
  else if (currentPath.includes('vehicles')) viewKey = 'vehicles'
  else if (currentPath.includes('pd-orders')) viewKey = 'pd'
  else if (currentPath.includes('fleet')) viewKey = 'fleet'
  else if (currentPath.includes('map')) viewKey = 'map'
  else if (currentPath.includes('accounting-bridge')) viewKey = 'bridge'
  else if (currentPath.includes('tracking')) viewKey = 'tracking'
  else if (currentPath.includes('rates-maintenance')) viewKey = 'rates'
  else if (activeModule) viewKey = activeModule

  return (
    <div className="kornet-logistics-shell font-sans h-screen flex flex-col overflow-hidden select-none bg-[#061426] text-[#d6e3fe] relative">
      {/* ══ Animated VisionOS Liquid Light Orbs (Ambient Refraction Layer) ══ */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div
          className="absolute -top-32 left-1/4 w-[520px] h-[520px] rounded-full bg-blue-600/15 blur-[130px]"
          style={{ animation: 'orb-float-1 18s ease-in-out infinite' }}
        />
        <div
          className="absolute top-1/3 -right-20 w-[480px] h-[480px] rounded-full bg-emerald-500/10 blur-[140px]"
          style={{ animation: 'orb-float-2 22s ease-in-out infinite alternate' }}
        />
        <div
          className="absolute bottom-10 left-1/3 w-[600px] h-[600px] rounded-full bg-blue-400/8 blur-[160px]"
          style={{ animation: 'orb-float-3 25s ease-in-out infinite' }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-[340px] h-[340px] rounded-full bg-red-600/10 blur-[120px]"
          style={{ animation: 'orb-float-1 16s ease-in-out infinite reverse' }}
        />
      </div>

      {/* Universal Loading Overlay */}
      {(!operationalHydrated || shipmentsLoading) && (
        <KornetLoader label="Synchronizing Kornet Express, Inc. Live Operations..." fullScreen />
      )}

      {/* Corporate Header Bar */}
      <LogisticsHeader />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden gap-3 p-3 relative z-10">
        {/* Streamlined Logistics Sidebar */}
        <LogisticsSidebar />

        {/* Dynamic Center Work Area */}
        <main className="logistics-main-panel flex-1 flex overflow-hidden rounded-2xl liquid-glass border border-white/10 shadow-2xl">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={viewKey}
              className="flex min-h-0 min-w-0 flex-1"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              {(viewKey === 'overview' || viewKey === 'control') && <OperationsOverview />}
              {viewKey === 'ocean-export' && <OceanFreightManager mode="Ocean Export" />}
              {viewKey === 'ocean-import' && <OceanFreightManager mode="Ocean Import" />}
              {viewKey === 'ocean' && <OceanFreightManager />}
              {viewKey === 'air-export' && <AirFreightManager mode="Air Export" />}
              {viewKey === 'air-import' && <AirFreightManager mode="Air Import" />}
              {viewKey === 'air' && <AirFreightManager />}
              {viewKey === 'vehicles' && <VehicleInventoryManager />}
              {viewKey === 'pd' && <PDOrdersManager />}
              {viewKey === 'fleet' && <FleetDispatchManager />}
              {viewKey === 'map' && <PhilippineLogisticsMap />}
              {viewKey === 'bridge' && <AccountingBridgeView />}
              {viewKey === 'tracking' && <CustomerTrackingPortal />}
              {viewKey === 'rates' && <RatesMaintenanceManager />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Global Application Modals */}
      <PrintDocumentModal />
      <AuditLogModal />
      <AttachmentModal />
      <ContainerStuffingModal />
      <OceanManifestModal />
      <NewChargeModal />
      <FileAnalysisModal />
      <SEDFilingModal />
      <BillingCodesModal />
      <CarriersDirectoryModal />
      <PortsDirectoryModal />
      <SystemDiagnosticsModal />
      <IntegrationsSettings />
    </div>
  )
}
