import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'

import { useSettingsStore } from '../stores/settingsStore'
import { useLogisticsStore } from '../stores/logisticsStore'
import { useSavingStore } from '../stores/savingStore'

import LogisticsHeader from '../components/logistics/LogisticsHeader'
import LogisticsSidebar from '../components/logistics/LogisticsSidebar'

// Global Logistics Modals
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

// FS Core Components
import FSFiscalNarrative from '../components/fs/FSFiscalNarrative'
import FSVoucherEntry from '../components/fs/FSVoucherEntry'
import FSJournalEntry from '../components/fs/FSJournalEntry'
import FSTransferAdvanceCDB from '../components/fs/FSTransferAdvanceCDB'
import FSChartOfAccounts from '../components/fs/FSChartOfAccounts'
import FSReports from '../components/fs/FSReports'
import FSPosting from '../components/fs/FSPosting'
import FSMonthEnd from '../components/fs/FSMonthEnd'
import FSGroupCodes from '../components/fs/FSGroupCodes'
import FSSubsidiaryGroups from '../components/fs/FSSubsidiaryGroups'
import FSBanks from '../components/fs/FSBanks'
import FSSuppliers from '../components/fs/FSSuppliers'
import FSSignatories from '../components/fs/FSSignatories'
import FSQueryBrowser from '../components/fs/FSQueryBrowser'
import FSManual from '../components/fs/FSManual'
import FSCompanyProperties from '../components/fs/FSCompanyProperties'

export default function FSSystem() {
  const { darkMode } = useSettingsStore()
  const { setActiveModule, setActiveRibbonTab } = useLogisticsStore()

  // Sync Logistics shell state to FS Accounting
  useEffect(() => {
    setActiveModule('fs')
    setActiveRibbonTab('Accounting')
  }, [setActiveModule, setActiveRibbonTab])

  // Listen to typing / input changes for Google Docs Auto-Save animation
  useEffect(() => {
    const handleInput = (e: Event) => {
      const target = e.target as HTMLElement
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        useSavingStore.getState().triggerChange()
      }
    }
    window.addEventListener('input', handleInput)
    return () => window.removeEventListener('input', handleInput)
  }, [])

  return (
    <div
      className={`font-body h-screen flex flex-col overflow-hidden select-none ${
        darkMode ? 'bg-[#0a0f1e] text-gray-100' : 'bg-slate-100 text-slate-900'
      }`}
    >
      {/* Unified LogiSuite Ribbon Header */}
      <LogisticsHeader />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left LogiSuite Accordion Explorer Sidebar */}
        <LogisticsSidebar />

        {/* Dynamic Center Work Area for FS Accounting */}
        <main className="flex-1 flex flex-col overflow-y-auto custom-scrollbar p-6 relative">
          <Routes>
            <Route path="/" element={<FSFiscalNarrative />} />
            <Route path="/voucher" element={<FSVoucherEntry type="current" />} />
            <Route path="/vouchers/*" element={<FSVoucherEntry type="current" />} />
            <Route path="/voucher/advance" element={<FSVoucherEntry type="advance" />} />
            <Route path="/transfer-advance" element={<FSTransferAdvanceCDB />} />
            <Route path="/journal/:type" element={<FSJournalEntry />} />
            <Route path="/chart-of-accounts" element={<FSChartOfAccounts />} />
            <Route path="/group-codes" element={<FSGroupCodes />} />
            <Route path="/subsidiary-groups" element={<FSSubsidiaryGroups />} />
            <Route path="/banks" element={<FSBanks />} />
            <Route path="/suppliers" element={<FSSuppliers />} />
            <Route path="/signatories" element={<FSSignatories />} />
            <Route path="/posting" element={<FSPosting />} />
            <Route path="/month-end" element={<FSMonthEnd />} />
            <Route path="/reports/:reportType" element={<FSReports />} />
            <Route path="/query/:queryType" element={<FSQueryBrowser />} />
            <Route path="/manual" element={<FSManual />} />
            <Route path="/administration/properties" element={<FSCompanyProperties />} />
          </Routes>
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
    </div>
  )
}
