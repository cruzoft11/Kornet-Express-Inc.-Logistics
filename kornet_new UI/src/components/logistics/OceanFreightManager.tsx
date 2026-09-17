import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useLogisticsStore,
  Shipment,
  calculateOceanFreightWM,
  calculateVat
} from '../../stores/logisticsStore'
import FileAnalysisModal from './FileAnalysisModal'
import { downloadBolPdf, downloadManifestPdf } from '../../utils/freightPdf'

export const SEAPORTS_DIRECTORY = [
  { code: 'MNS', name: 'Manila South Harbor (MNS)' },
  { code: 'MNN', name: 'Manila North Harbor (MNN)' },
  { code: 'MICT', name: 'Manila International Container Terminal (MICT)' },
  { code: 'BTG', name: 'Batangas International Port (BTG)' },
  { code: 'SFS', name: 'Subic Bay Freeport Container Terminal (SFS)' },
  { code: 'CEB', name: 'Cebu International Port (CEB)' },
  { code: 'DVO', name: 'Davao Sasa Wharf / DICT (DVO)' },
  { code: 'CDO', name: 'Cagayan De Oro Macabalan Port (CDO)' },
  { code: 'LAX', name: 'Port of Los Angeles, USA (LAX)' },
  { code: 'LGB', name: 'Port of Long Beach, USA (LGB)' },
  { code: 'SIN', name: 'Port of Singapore, SG (SIN)' },
  { code: 'HKG', name: 'Port of Hong Kong, HK (HKG)' },
  { code: 'SHA', name: 'Port of Shanghai, CN (SHA)' },
  { code: 'PUS', name: 'Port of Busan, KR (PUS)' },
  { code: 'TYO', name: 'Port of Tokyo, JP (TYO)' }
]

export const CONTAINER_TYPES = [
  "20' Standard Dry (20' GP)",
  "40' Standard Dry (40' GP)",
  "40' High Cube (40' HC)",
  "45' High Cube (45' HC)",
  "20' Refrigerated (20' Reefer)",
  "40' Refrigerated (40' Reefer)",
  "20' Open Top (20' OT)",
  "40' Flat Rack (40' FR)"
]

export const PACKAGE_TYPES = [
  'Cartons',
  'Pallets',
  'Crates',
  'Drums',
  'Bags',
  'Units / Vehicles',
  'Wooden Boxes'
]

interface OceanFreightManagerProps {
  mode?: 'Ocean Export' | 'Ocean Import'
}

export default function OceanFreightManager({ mode }: OceanFreightManagerProps) {
  const navigate = useNavigate()
  const {
    shipments,
    hydrateShipments,
    quotes,
    selectedFileNo,
    setSelectedFileNo,
    vehicles,
    activeSubView,
    searchTerm,
    filterStatus,
    selectedBranchCode,
    closeShipment,
    transferToBridge,
    autoBridgeOperationalCostToFsCheck,
    openPrintModal,
    openContainerStuffingModal,
    openNewChargeModal,
    createShipment,
    updateShipment,
    deleteShipment,
    setActiveSubView,
    setModalOpen,
    modalOpen,
    vatRate
  } = useLogisticsStore()

  const [fsBridgeBanner, setFsBridgeBanner] = useState<{
    checkNo: string
    jvNo: string
    amount: number
    vendor: string
  } | null>(null)

  const [activeTab, setActiveTab] = useState<'billing' | 'costs' | 'cargo' | 'customs' | 'containers'>('billing')
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [showNewBookingModal, setShowNewBookingModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null)
  const [customsNotice, setCustomsNotice] = useState<string | null>(null)

  // Load shipments from the backend on first mount.
  useEffect(() => {
    void hydrateShipments()
  }, [hydrateShipments])

  const isNewBookingOpen = showNewBookingModal || modalOpen.newBooking
  const handleCloseNewBooking = () => {
    setShowNewBookingModal(false)
    setModalOpen('newBooking', false)
  }

  // String state for input fields to eliminate the 018500 leading-zero bug
  const [newBooking, setNewBooking] = useState({
    fileNo: '',
    bookingNo: '',
    blNo: '',
    mode: mode || 'Ocean Export',
    fclOrLcl: 'FCL',
    shipper: '',
    shipperAddress: '',
    shipperTin: '',
    consignee: '',
    consigneeAddress: '',
    consigneeTin: '',
    notifyParty: '',
    pol: 'Manila South Harbor (MNS)',
    pod: 'Port of Los Angeles, USA (LAX)',
    carrier: 'Maersk Line Philippines',
    vessel: 'MV Merlion Express',
    voyage: '048E',
    containerNo: '',
    sealNo: '',
    equipmentType: "40' High Cube (40' HC)",
    pieces: '1',
    packageType: 'Cartons',
    goods: '',
    commodityCode: '',
    isHazmat: false,
    unNumber: '',
    weightKg: '',
    volumeCbm: '',
    ratePerRT: ''
  })

  // Numeric parsing for live W/M calculations
  const parsedWeightKg = parseFloat(newBooking.weightKg) || 0
  const parsedVolumeCbm = parseFloat(newBooking.volumeCbm) || 0
  const parsedRatePerRT = parseFloat(newBooking.ratePerRT) || 0

  const wmCalc = calculateOceanFreightWM(parsedWeightKg, parsedVolumeCbm, parsedRatePerRT)
  const effectiveVatRate = vatRate ?? 0.12
  const vatCalc = calculateVat(wmCalc.totalFreight, effectiveVatRate)

  const handleSaveNewBooking = (e: React.FormEvent) => {
    e.preventDefault()
    const prefix = (newBooking.mode || mode) === 'Ocean Import' ? 'KE-OI' : 'KE-OE'
    const fileNo =
      newBooking.fileNo.trim() ||
      `${prefix}-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`

    const shipment: Shipment = {
      fileNo,
      type: (newBooking.mode as 'Ocean Export' | 'Ocean Import') || mode || 'Ocean Export',
      bookingNo: newBooking.bookingNo || `BKG-${Date.now().toString().slice(-6)}`,
      blOrAwbNo: newBooking.blNo || `MSKU-${Date.now().toString().slice(-8)}`,
      blClass: 'MBL',
      shipmentType: newBooking.fclOrLcl === 'FCL' ? 'Direct' : 'Consolidation',
      status: 'Open',
      shipper: newBooking.shipper || 'Unspecified Shipper',
      shipperAddress: newBooking.shipperAddress,
      shipperTin: newBooking.shipperTin,
      consignee: newBooking.consignee || 'Unspecified Consignee',
      consigneeAddress: newBooking.consigneeAddress,
      consigneeTin: newBooking.consigneeTin,
      notifyParty: newBooking.notifyParty,
      origin: newBooking.pol,
      destination: newBooking.pod,
      portOfLoading: newBooking.pol,
      portOfDischarge: newBooking.pod,
      carrierName: newBooking.carrier,
      vesselOrFlight: newBooking.vessel || 'MV Cargo Liner',
      voyageOrFlightNo: newBooking.voyage || '001',
      pieces: parseInt(newBooking.pieces, 10) || 1,
      packageType: newBooking.packageType,
      weightKg: parsedWeightKg,
      volumeCbm: parsedVolumeCbm,
      containerNo: newBooking.containerNo || 'MSKU-992144-8',
      sealNo: newBooking.sealNo || 'SL-884102',
      equipmentType: newBooking.equipmentType,
      natureOfGoods: newBooking.goods || 'General Merchandise',
      commodityCode: newBooking.commodityCode,
      isHazmat: newBooking.isHazmat,
      unNumber: newBooking.unNumber,
      marksAndNumbers: `SHIPPER: ${newBooking.shipper || 'N/A'}\nCONSIGNEE: ${newBooking.consignee || 'N/A'}\nDESTINATION: ${newBooking.pod}`,
      customsLane: 'Green',
      deliveryOrderStatus: 'Pending',
      billingLines: [
        {
          id: 'b-' + Date.now() + '-1',
          code: 'OF-WM',
          desc: `Ocean Freight (${wmCalc.chargeableWM.toFixed(2)} RT @ PHP ${parsedRatePerRT.toLocaleString()} - ${wmCalc.basis} Basis)`,
          currency: 'PHP',
          rate: parsedRatePerRT,
          amount: wmCalc.totalFreight,
          glAccount: '4000-01',
          customer: newBooking.shipper || 'Direct Shipper',
          prepaidOrCollect: 'Prepaid'
        },
        {
          id: 'b-' + Date.now() + '-2',
          code: `VAT-${Math.round(effectiveVatRate * 100)}`,
          desc: `${Math.round(effectiveVatRate * 100)}% Value Added Tax (BIR Compliant)`,
          currency: 'PHP',
          rate: effectiveVatRate,
          amount: vatCalc.vat,
          glAccount: '2100-05',
          customer: newBooking.shipper || 'Direct Shipper',
          prepaidOrCollect: 'Prepaid'
        }
      ],
      costLines: [
        {
          id: 'c-' + Date.now() + '-1',
          code: 'THC-DEST',
          desc: 'Terminal Handling Charges - Port Authority',
          rate: 4500,
          amount: 4500,
          glAccount: '5000-02',
          vendor: 'Philippine Ports Authority',
          vendorId: 'VND-PPA-01'
        },
        {
          id: 'c-' + Date.now() + '-2',
          code: 'DOC-FEE',
          desc: 'Carrier Documentation & Bill of Lading Fee',
          rate: 2200,
          amount: 2200,
          glAccount: '5000-01',
          vendor: newBooking.carrier || 'Maersk Line Philippines',
          vendorId: 'VND-MAE-01'
        }
      ]
    }

    createShipment(shipment)
    setSelectedFileNo(shipment.fileNo)
    setActiveSubView('shipments')
    handleCloseNewBooking()
  }

  const isQuotesView = activeSubView === 'quotes'

  // Filter ocean shipments by mode prop (Ocean Export vs Ocean Import) if provided,
  // plus global terminal filter if selected
  const oceanShipments = shipments.filter((s) => {
    if (mode && s.type !== mode) return false
    if (!mode && s.type !== 'Ocean Export' && s.type !== 'Ocean Import') return false

    if (selectedBranchCode && selectedBranchCode !== 'ALL') {
      const matchBranch =
        s.branchCode === selectedBranchCode ||
        s.portOfLoading?.includes(selectedBranchCode) ||
        s.portOfDischarge?.includes(selectedBranchCode) ||
        s.origin?.includes(selectedBranchCode) ||
        s.destination?.includes(selectedBranchCode)
      if (!matchBranch) return false
    }

    return true
  })

  const filteredShipments = oceanShipments.filter((s) => {
    const matchesSearch =
      searchTerm === '' ||
      s.fileNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.bookingNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.containerNo && s.containerNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
      s.shipper.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.consignee.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.portOfLoading && s.portOfLoading.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.portOfDischarge && s.portOfDischarge.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesFilter = filterStatus === 'ALL' || s.status === filterStatus
    return matchesSearch && matchesFilter
  })

  const currentShipment =
    oceanShipments.find((s) => s.fileNo === selectedFileNo) || oceanShipments[0]

  const linkedVehicles = currentShipment?.containerNo
    ? vehicles.filter((v) => v.assignedContainerNo === currentShipment.containerNo)
    : []

  const totalBilling = currentShipment?.billingLines.reduce((acc, b) => acc + b.amount, 0) || 0
  const totalCost = currentShipment?.costLines.reduce((acc, c) => acc + c.amount, 0) || 0
  const profit = totalBilling - totalCost
  const marginPct = totalBilling > 0 ? (profit / totalBilling) * 100 : 0

  const handlePrintBOL = () => {
    if (!currentShipment) return
    openPrintModal({
      type: 'BOL',
      title: `Export Ocean Bill of Lading (FMC Format) — ${currentShipment.blOrAwbNo}`,
      data: currentShipment
    })
  }

  const handlePrintManifest = () => {
    if (!currentShipment) return
    openPrintModal({
      type: 'MANIFEST',
      title: `Ocean Shipping Manifest — Vessel ${currentShipment.vesselOrFlight}`,
      data: currentShipment
    })
  }

  const handleDirectDownloadBOL = () => {
    if (!currentShipment) return
    downloadBolPdf(currentShipment)
  }

  const handleDirectDownloadManifest = () => {
    if (!currentShipment) return
    downloadManifestPdf(currentShipment)
  }

  const handleOpenEdit = () => {
    if (!currentShipment) return
    setEditingShipment({ ...currentShipment })
    setShowEditModal(true)
  }

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingShipment) return
    updateShipment(editingShipment.fileNo, editingShipment)
    setShowEditModal(false)
  }

  const handleDeleteShipment = () => {
    if (!currentShipment) return
    const confirmed = window.confirm(
      `Are you sure you want to delete / archive shipment ${currentShipment.fileNo}? This action cannot be undone.`
    )
    if (confirmed) {
      deleteShipment(currentShipment.fileNo)
    }
  }

  const handleSaveCustomsInfo = (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentShipment) return
    updateShipment(currentShipment.fileNo, {
      customsSadNo: currentShipment.customsSadNo,
      customsEntryNo: currentShipment.customsEntryNo,
      customsLane: currentShipment.customsLane,
      customsDutiesAmount: currentShipment.customsDutiesAmount,
      customsBrokerName: currentShipment.customsBrokerName,
      customsBrokerLicense: currentShipment.customsBrokerLicense,
      deliveryOrderStatus: currentShipment.deliveryOrderStatus
    })
    setCustomsNotice('BOC e2m Customs clearance status saved successfully!')
    setTimeout(() => setCustomsNotice(null), 3000)
  }

  return (
    <div className="stitch-module-surface flex-1 flex flex-col overflow-hidden bg-[#061426] text-[#d6e3fe] font-sans">
      {/* Top Action Toolbar */}
      <div className="px-6 py-2.5 border-b border-white/10 bg-[#0b192c]/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <span className="font-bold text-white flex items-center gap-1.5 text-sm">
            <span className="material-symbols-outlined text-blue-400 text-[18px]">directions_boat</span>
            {mode ? `${mode} Operations` : 'Ocean Freight Operations (Export & Import)'}
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-blue-500/20 text-blue-300 border border-blue-400/30">
            {isQuotesView ? `${quotes.length} Quotes Active` : `${filteredShipments.length} Active Files`}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowNewBookingModal(true)}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold text-xs shadow-[0_0_14px_rgba(37,99,235,0.4)] border border-white/20 flex items-center gap-1.5 transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">add_box</span>
            New Ocean Booking
          </button>
          {currentShipment && !isQuotesView && (
            <>
              <button
                onClick={() => setShowAnalysis(true)}
                className="px-3 py-1.5 rounded-xl liquid-glass-subtle hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold text-xs flex items-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">analytics</span>
                File Analysis
              </button>

              <button
                onClick={() => openContainerStuffingModal('LG-OE-2026-0089')}
                className="px-3 py-1.5 rounded-xl liquid-glass-subtle hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold text-xs flex items-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">view_in_ar</span>
                Stuffing
              </button>

              {/* Direct PDF Download */}
              <button
                onClick={handleDirectDownloadBOL}
                className="px-3 py-1.5 rounded-xl liquid-glass-subtle hover:bg-white/10 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors border border-white/10"
                title="Directly download official FMC Bill of Lading PDF"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                BOL PDF
              </button>

              <button
                onClick={handleDirectDownloadManifest}
                className="px-3 py-1.5 rounded-xl liquid-glass-subtle hover:bg-white/10 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors border border-white/10"
                title="Directly download official Cargo Manifest PDF"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                Manifest PDF
              </button>

              <button
                onClick={handlePrintBOL}
                className="px-3 py-1.5 rounded-xl liquid-glass-subtle hover:bg-white/10 text-[#d6e3fe] font-semibold text-xs flex items-center gap-1.5 transition-colors border border-white/10"
              >
                <span className="material-symbols-outlined text-[16px]">print</span>
                Print BOL
              </button>

              <button
                onClick={handlePrintManifest}
                className="px-3 py-1.5 rounded-xl liquid-glass-subtle hover:bg-white/10 text-[#d6e3fe] font-semibold text-xs flex items-center gap-1.5 border border-white/10"
              >
                <span className="material-symbols-outlined text-[16px]">table_rows</span>
                Manifest
              </button>

              {currentShipment.status === 'Open' ? (
                <button
                  onClick={() => closeShipment(currentShipment.fileNo)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5 transition-colors border border-white/20"
                >
                  <span className="material-symbols-outlined text-[16px]">lock</span>
                  Close File
                </button>
              ) : currentShipment.status === 'Closed' ? (
                <button
                  onClick={() => transferToBridge(currentShipment.fileNo)}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5 transition-colors border border-white/20"
                >
                  <span className="material-symbols-outlined text-[16px]">hub</span>
                  Transfer to Bridge
                </button>
              ) : (
                <span className="px-3 py-1.5 rounded-xl bg-purple-500/20 text-purple-300 font-mono font-bold text-xs border border-purple-400/30">
                  Bridged to FS
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Master Files List */}
        <div className="w-84 border-r border-white/10 bg-[#061426]/85 backdrop-blur-xl flex flex-col overflow-y-auto custom-scrollbar">
          <div className="p-3 border-b border-white/10 bg-[#020e21]/70 text-[11px] font-mono font-bold text-[#c3c6d7] uppercase tracking-wider flex justify-between items-center">
            <span>{isQuotesView ? 'Active Quotes' : `${mode || 'Ocean'} Manifest Feed`}</span>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/25">
              {isQuotesView ? quotes.length : filteredShipments.length} files
            </span>
          </div>

          <div className="divide-y divide-white/5 p-2 space-y-2">
            {isQuotesView ? (
              quotes.map((q) => (
                <div
                  key={q.quoteNo}
                  className="p-3.5 rounded-xl liquid-glass-card hover:border-blue-400/40 cursor-pointer transition-all relative overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-xs text-blue-400">{q.quoteNo}</span>
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {q.status}
                    </span>
                  </div>
                  <div className="font-semibold text-xs text-white truncate">{q.customer}</div>
                  <div className="text-[10px] font-mono text-[#c3c6d7]/70 mt-1 flex justify-between">
                    <span>POL: {q.portOfLoading}</span>
                    <span>POD: {q.portOfDischarge}</span>
                  </div>
                </div>
              ))
            ) : (
              filteredShipments.map((s) => {
                const isSelected = s.fileNo === currentShipment?.fileNo
                return (
                  <div
                    key={s.fileNo}
                    onClick={() => setSelectedFileNo(s.fileNo)}
                    className={`p-3.5 rounded-xl cursor-pointer transition-all relative overflow-hidden group ${
                      isSelected
                        ? 'bg-gradient-to-r from-blue-950/80 to-[#132033] border border-blue-400/50 shadow-[0_4px_20px_rgba(37,99,235,0.25)]'
                        : 'liquid-glass-subtle border border-white/5 hover:border-white/15 hover:bg-white/5'
                    }`}
                  >
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-white group-hover:text-blue-300 transition-colors">
                            {s.fileNo}
                          </span>
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300">
                            {s.type?.includes('Export') ? 'Export' : 'Import'}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#c3c6d7] font-medium truncate max-w-[170px] mt-0.5">
                          {s.shipper}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase ${
                          s.status === 'Closed'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : s.status === 'Transferred'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}
                      >
                        {s.status}
                      </span>
                    </div>

                    {/* Route Node Pipeline Box */}
                    <div className="flex items-center justify-between mt-2 pt-1.5 px-2.5 py-1.5 bg-[#020e21]/70 rounded-lg border border-white/5 text-[10px] font-mono">
                      <div className="flex flex-col">
                        <span className="text-slate-400 text-[9px]">POL</span>
                        <span className="text-white font-semibold truncate max-w-[90px]">{s.portOfLoading || s.origin}</span>
                      </div>
                      <div className="flex flex-col items-center px-1">
                        <span className="text-[9px] text-blue-400 font-bold">{s.teu || 1} TEU</span>
                        <div className="flex items-center gap-1 text-blue-400/80">
                          <div className="w-6 h-px bg-blue-400/40" />
                          <span>&rarr;</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-slate-400 text-[9px]">POD</span>
                        <span className="text-white font-semibold truncate max-w-[90px]">{s.portOfDischarge || s.destination}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-[#c3c6d7]/70 mt-2">
                      <span className="truncate max-w-[120px]">{s.carrier || s.vesselOrFlight}</span>
                      <span className="font-semibold text-blue-400">{s.containerNo || 'FCL / LCL'}</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right: Shipment Detail Workspace */}
        {!currentShipment && !isQuotesView ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-50 dark:bg-slate-950">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-3xl">directions_boat</span>
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">
              No Ocean Shipments Currently Staged
            </h3>
            <p className="text-xs text-slate-500 max-w-md mb-6">
              Create a new ocean export or import booking to generate FMC-compliant Bills of Lading, calculate W/M revenue ton freights, and track container stuffing.
            </p>
            <button
              onClick={() => setShowNewBookingModal(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md inline-flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">add_box</span>
              Create First Ocean Booking
            </button>
          </div>
        ) : currentShipment && !isQuotesView ? (
          <div className="flex-1 flex flex-col overflow-y-auto p-6 space-y-6">
            {/* Live Automated FS Bridge Notification Toast Banner */}
            {fsBridgeBanner && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-xl flex flex-wrap items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 border border-emerald-400/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-black flex-shrink-0">
                    <span className="material-symbols-outlined text-2xl">check_circle</span>
                  </div>
                  <div>
                    <div className="font-black text-sm flex items-center gap-2">
                      <span>FS Check {fsBridgeBanner.checkNo} Successfully Generated!</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/50 text-[10px] uppercase font-bold tracking-wider">
                        Live Synced to FS
                      </span>
                    </div>
                    <div className="text-xs text-white/90 mt-0.5">
                      Voucher <strong>{fsBridgeBanner.jvNo}</strong> for <strong>{fsBridgeBanner.vendor}</strong> (PHP {fsBridgeBanner.amount.toLocaleString()}) has been created in <code>fs_checkmas</code> & <code>fs_checkvou</code>.
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate('/fs/voucher')}
                    className="px-4 py-2 rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 font-bold text-xs shadow-md flex items-center gap-1.5 transition-all hover:scale-[1.02]"
                  >
                    <span>Open in FS Voucher Entry</span>
                    <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                  </button>
                  <button
                    onClick={() => setFsBridgeBanner(null)}
                    className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
              </div>
            )}

            {/* Header Record Card */}
            <div className="liquid-glass-card p-6 rounded-2xl border border-white/10 shadow-2xl relative overflow-hidden space-y-5">
              <div className="absolute top-0 right-0 w-64 h-32 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-white/5 relative z-10">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-2xl font-black text-white font-mono tracking-tight flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                      {currentShipment.fileNo}
                    </h2>
                    <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-sky-500/20 text-sky-300 border border-sky-400/30">
                      {currentShipment.type}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-black uppercase bg-white/5 text-slate-300 border border-white/10 font-mono">
                      {currentShipment.shipmentType || 'FCL'} • Class: {currentShipment.blClass || 'MBL'}
                    </span>
                    {currentShipment.customsLane && (
                      <span
                        className={`px-3 py-1 rounded-lg text-[11px] font-black uppercase border ${
                          currentShipment.customsLane === 'Green'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                            : currentShipment.customsLane === 'Yellow'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.2)]'
                        }`}
                      >
                        BOC Lane: {currentShipment.customsLane}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-2 font-mono flex items-center gap-3 flex-wrap">
                    <span>Booking: <strong className="text-slate-200">{currentShipment.bookingNo}</strong></span>
                    <span className="text-slate-600">•</span>
                    <span>B/L: <strong className="text-cyan-400">{currentShipment.blOrAwbNo}</strong></span>
                    {currentShipment.carrierName && (
                      <>
                        <span className="text-slate-600">•</span>
                        <span>Carrier: <strong className="text-slate-200">{currentShipment.carrierName}</strong></span>
                      </>
                    )}
                  </p>
                </div>

                {/* File Header Actions & Financials */}
                <div className="flex items-center gap-3 text-xs flex-wrap">
                  <button
                    onClick={handleOpenEdit}
                    className="px-3.5 py-1.5 rounded-xl border border-sky-400/30 bg-sky-500/15 text-sky-200 hover:bg-sky-500/25 font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit_document</span>
                    Edit File
                  </button>

                  <button
                    onClick={handleDeleteShipment}
                    className="px-3.5 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                    Delete
                  </button>

                  <div className="h-8 w-px bg-white/10 mx-1" />

                  <div className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5 text-right min-w-[110px]">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Billing (AR)</span>
                    <strong className="text-sky-400 text-sm font-mono block">
                      PHP {totalBilling.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5 text-right min-w-[110px]">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Cost (AP)</span>
                    <strong className="text-amber-400 text-sm font-mono block">
                      PHP {totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                  <div className={`px-3 py-1.5 rounded-xl border text-right min-w-[120px] ${
                    profit >= 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  }`}>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Net Margin</span>
                    <strong className="text-sm font-mono block">
                      PHP {profit.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({marginPct.toFixed(1)}%)
                    </strong>
                  </div>
                </div>
              </div>

              {/* Routing & Entity Details with POL & POD clearly displayed */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs relative z-10">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Shipper / Exporter</span>
                  <span className="font-semibold text-slate-100 block truncate mt-0.5">{currentShipment.shipper}</span>
                  {currentShipment.shipperTin && (
                    <span className="text-[10px] text-slate-400 font-mono block mt-0.5">TIN: {currentShipment.shipperTin}</span>
                  )}
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Consignee / Importer</span>
                  <span className="font-semibold text-slate-100 block truncate mt-0.5">{currentShipment.consignee}</span>
                  {currentShipment.consigneeTin && (
                    <span className="text-[10px] text-slate-400 font-mono block mt-0.5">TIN: {currentShipment.consigneeTin}</span>
                  )}
                </div>
                <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-400/20 shadow-inner">
                  <span className="text-sky-300 block text-[10px] uppercase font-bold flex items-center gap-1.5 tracking-wider">
                    <span className="material-symbols-outlined text-[14px]">anchor</span> Port of Loading (POL)
                  </span>
                  <span className="font-bold text-white block mt-1">
                    {currentShipment.portOfLoading || currentShipment.origin || 'Manila South Harbor (MNS)'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-400/20 shadow-inner">
                  <span className="text-emerald-300 block text-[10px] uppercase font-bold flex items-center gap-1.5 tracking-wider">
                    <span className="material-symbols-outlined text-[14px]">location_on</span> Port of Discharge (POD)
                  </span>
                  <span className="font-bold text-white block mt-1">
                    {currentShipment.portOfDischarge || currentShipment.destination || 'Port of Los Angeles (LAX)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Detailed Tabs Strip with visionOS glass pills */}
            <div className="flex gap-2 overflow-x-auto pb-1 border-b border-white/10">
              {[
                { id: 'billing', label: `Customer Billing (${currentShipment.billingLines.length})`, icon: 'receipt' },
                { id: 'costs', label: `Carrier Costs (${currentShipment.costLines.length})`, icon: 'payments' },
                { id: 'cargo', label: `Container & Cargo Specs`, icon: 'inventory_2' },
                { id: 'customs', label: `BOC e2m Customs Clearance`, icon: 'verified_user' },
                { id: 'containers', label: `Linked Staged Vehicles (${linkedVehicles.length})`, icon: 'directions_car' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-sky-500/20 text-sky-200 border border-sky-400/40 shadow-[0_0_15px_rgba(56,189,248,0.25)]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab 1: Billing Lines */}
            {activeTab === 'billing' && (
              <div className="liquid-glass-card rounded-2xl p-6 border border-white/10 shadow-xl space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-sm text-white tracking-wide">
                      Customer Invoicing & Receivable Lines
                    </h3>
                    <p className="text-[11px] text-slate-400">Auto-routes to FS Sales Book (fs_salebook) upon Bridge transfer</p>
                  </div>
                  <button
                    onClick={() => openNewChargeModal(currentShipment.fileNo)}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-sky-500/20 flex items-center gap-1.5 transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Add Billing Charge
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-white/5 bg-white/[0.02]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400 text-[10px] uppercase tracking-wider bg-white/[0.02]">
                        <th className="py-3 px-4">Code</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4">Payment Terms</th>
                        <th className="py-3 px-4">Target FS GL Account</th>
                        <th className="py-3 px-4 text-right">Amount (PHP)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                      {currentShipment.billingLines.map((b) => (
                        <tr key={b.id} className="hover:bg-white/[0.04] transition-colors">
                          <td className="py-3 px-4 font-bold text-sky-400">{b.code}</td>
                          <td className="py-3 px-4 font-sans font-medium text-slate-200">{b.desc}</td>
                          <td className="py-3 px-4 font-sans">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-slate-300 border border-white/10">
                              {b.prepaidOrCollect}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-400">{b.glAccount} (Freight Sales)</td>
                          <td className="py-3 px-4 text-right font-bold text-white">
                            PHP {b.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 2: Cost Lines */}
            {activeTab === 'costs' && (
              <div className="liquid-glass-card rounded-2xl p-6 border border-white/10 shadow-xl space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-sm text-white tracking-wide">
                      Carrier & Vendor Cost Lines
                    </h3>
                    <p className="text-[11px] text-slate-400">Auto-routes to FS Purchase Book (fs_purcbook) & CDV vouchers</p>
                  </div>
                  <button
                    onClick={() => openNewChargeModal(currentShipment.fileNo)}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Add Cost Line
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-white/5 bg-white/[0.02]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400 text-[10px] uppercase tracking-wider bg-white/[0.02]">
                        <th className="py-3 px-4">Code</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4">Vendor / Carrier</th>
                        <th className="py-3 px-4">Target FS GL Account</th>
                        <th className="py-3 px-4 text-right">Amount (PHP)</th>
                        <th className="py-3 px-4 text-center">⚡ FS CDV Voucher</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                      {currentShipment.costLines.map((c) => (
                        <tr key={c.id} className="hover:bg-white/[0.04] transition-colors">
                          <td className="py-3 px-4 font-bold text-amber-400">{c.code}</td>
                          <td className="py-3 px-4 font-sans font-medium text-slate-200">{c.desc}</td>
                          <td className="py-3 px-4 font-sans font-bold text-slate-300">{c.vendor}</td>
                          <td className="py-3 px-4 text-slate-400">{c.glAccount} (Carrier Cost)</td>
                          <td className="py-3 px-4 text-right font-bold text-white">
                            PHP {c.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={async () => {
                                const res = await autoBridgeOperationalCostToFsCheck({
                                  sourceFileNo: currentShipment.fileNo,
                                  carrierOrVendor: c.vendor || currentShipment.vesselOrFlight || 'Carrier',
                                  amount: c.amount,
                                  description: `${c.desc} (Booking ${currentShipment.bookingNo || currentShipment.fileNo})`,
                                  expenseAccount: c.glAccount || '5010'
                                })
                                setFsBridgeBanner({
                                  checkNo: res.checkNo,
                                  jvNo: res.jvNo,
                                  amount: c.amount,
                                  vendor: c.vendor || currentShipment.vesselOrFlight || 'Carrier'
                                })
                              }}
                              className="px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold text-[10px] inline-flex items-center gap-1 transition-transform hover:scale-105"
                              title="Immediately create balanced CDV Check in FS Accounting"
                            >
                              <span className="material-symbols-outlined text-[13px]">bolt</span>
                              <span>Auto-CDV</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 3: Container & Cargo Specs */}
            {activeTab === 'cargo' && (
              <div className="liquid-glass-card rounded-2xl p-6 border border-white/10 shadow-xl space-y-5">
                <h3 className="font-bold text-sm text-white tracking-wide">
                  Container Stuffing & Equipment Specifications
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-xl text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Container Number</span>
                    <strong className="text-base text-cyan-400 font-mono block mt-1">{currentShipment.containerNo || 'MSKU-992144-8'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Seal Number</span>
                    <strong className="text-base text-slate-200 font-mono block mt-1">{currentShipment.sealNo || 'SL-884102'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Equipment Type</span>
                    <strong className="text-sm text-slate-200 block mt-1">{currentShipment.equipmentType || "40' High Cube (40' HC)"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Gross Weight</span>
                    <strong className="text-base text-white block mt-1 font-mono">
                      {currentShipment.weightKg.toLocaleString()} KGS ({((currentShipment.weightKg || 0) / 1000).toFixed(2)} MT)
                    </strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-xl text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Total Volume</span>
                    <strong className="text-base text-white block mt-1 font-mono">{currentShipment.volumeCbm} CBM</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Packages</span>
                    <strong className="text-base text-white block mt-1">{currentShipment.pieces} {currentShipment.packageType || 'Cartons'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Commodity Code (HS)</span>
                    <strong className="text-sm text-slate-200 font-mono block mt-1">{currentShipment.commodityCode || '8703.23.00'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Hazmat / Dangerous Goods</span>
                    <strong className={`text-sm block mt-1 ${currentShipment.isHazmat ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {currentShipment.isHazmat ? `DG (UN ${currentShipment.unNumber})` : 'Non-Hazardous'}
                    </strong>
                  </div>
                </div>

                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl text-xs space-y-2">
                  <span className="font-bold text-slate-400 uppercase text-[10px] block tracking-wider">Commodity Description & Marks</span>
                  <p className="font-semibold text-white">{currentShipment.natureOfGoods}</p>
                  <p className="text-slate-400 whitespace-pre-line font-mono text-[11px] bg-black/20 p-3 rounded-lg border border-white/5">{currentShipment.marksAndNumbers}</p>
                </div>
              </div>
            )}

            {/* Tab 4: BOC e2m Customs Clearance */}
            {activeTab === 'customs' && (
              <div className="liquid-glass-card rounded-2xl p-6 border border-white/10 shadow-xl space-y-5">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-sm text-white flex items-center gap-2 tracking-wide">
                      <span className="material-symbols-outlined text-sky-400">verified_user</span>
                      Bureau of Customs (BOC e2m) Clearance & Release Status
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Track Single Administrative Document (SAD), Assessment Lane, Customs Brokerage, and Port Authority DO Release
                    </p>
                  </div>
                  {customsNotice && (
                    <span className="px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold animate-in fade-in">
                      {customsNotice}
                    </span>
                  )}
                </div>

                <form onSubmit={handleSaveCustomsInfo} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="font-bold block mb-1 text-slate-300">BOC SAD Entry Number</label>
                      <input
                        type="text"
                        value={currentShipment.customsSadNo || ''}
                        onChange={(e) => updateShipment(currentShipment.fileNo, { customsSadNo: e.target.value })}
                        placeholder="e.g. SAD-2026-MICP-98124"
                        className="input-glass w-full px-3 py-2 rounded-xl text-white font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="font-bold block mb-1 text-slate-300">Customs Assessment Lane</label>
                      <select
                        value={currentShipment.customsLane || 'Green'}
                        onChange={(e) => updateShipment(currentShipment.fileNo, { customsLane: e.target.value as any })}
                        className="input-glass w-full px-3 py-2 rounded-xl text-white font-bold bg-slate-900"
                      >
                        <option value="Green">Green Lane (Express No-Exam Clearance)</option>
                        <option value="Yellow">Yellow Lane (Documentary Verification Required)</option>
                        <option value="Red">Red Lane (Mandatory Physical Inspection / X-Ray)</option>
                        <option value="Blue">Blue Lane (Post-Clearance Audit Staging)</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-bold block mb-1 text-slate-300">Assessed Duties & Taxes (PHP)</label>
                      <input
                        type="number"
                        value={currentShipment.customsDutiesAmount || ''}
                        onChange={(e) => updateShipment(currentShipment.fileNo, { customsDutiesAmount: parseFloat(e.target.value) || 0 })}
                        placeholder="e.g. 145000"
                        className="input-glass w-full px-3 py-2 rounded-xl text-emerald-400 font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="font-bold block mb-1 text-slate-300">Licensed Customs Broker</label>
                      <input
                        type="text"
                        value={currentShipment.customsBrokerName || ''}
                        onChange={(e) => updateShipment(currentShipment.fileNo, { customsBrokerName: e.target.value })}
                        placeholder="e.g. Atty. Roberto Santos, LCB"
                        className="input-glass w-full px-3 py-2 rounded-xl text-white"
                      />
                    </div>
                    <div>
                      <label className="font-bold block mb-1 text-slate-300">Broker PRC License #</label>
                      <input
                        type="text"
                        value={currentShipment.customsBrokerLicense || ''}
                        onChange={(e) => updateShipment(currentShipment.fileNo, { customsBrokerLicense: e.target.value })}
                        placeholder="e.g. PRC-LCB-0089241"
                        className="input-glass w-full px-3 py-2 rounded-xl text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-bold block mb-1 text-slate-300">Delivery Order (DO) Status</label>
                      <select
                        value={currentShipment.deliveryOrderStatus || 'Pending'}
                        onChange={(e) => updateShipment(currentShipment.fileNo, { deliveryOrderStatus: e.target.value as any })}
                        className="input-glass w-full px-3 py-2 rounded-xl text-white font-bold bg-slate-900"
                      >
                        <option value="Pending">Pending Port Payment</option>
                        <option value="Issued">Issued / Cleared for Gate Pass</option>
                        <option value="Surrendered">Surrendered to Pier Terminal Operator</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-sky-500/20 flex items-center gap-2 transition-all active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[16px]">save</span>
                      Save BOC Customs Clearance Record
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Tab 5: Linked Vehicles */}
            {activeTab === 'containers' && (
              <div className="liquid-glass-card rounded-2xl p-6 border border-white/10 shadow-xl space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-sm text-white tracking-wide">
                      Staged Vehicles Loaded in Container {currentShipment.containerNo}
                    </h3>
                    <p className="text-[11px] text-slate-400">Tracked with NHTSA VIN specifications, warehouse receipts, and title status</p>
                  </div>
                  <button
                    onClick={() => setModalOpen('containerStuffing', true)}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-sky-500/20 flex items-center gap-1.5 transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[16px]">tune</span>
                    Manage Container Stuffing
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {linkedVehicles.map((v) => (
                    <div
                      key={v.id}
                      className="p-4 rounded-xl border border-white/10 bg-white/[0.03] space-y-2 text-xs hover:border-sky-400/30 transition-all"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-black text-sm text-white">
                            {v.year} {v.make} {v.model}
                          </span>
                          <span className="text-[11px] font-mono text-cyan-400 block mt-0.5">
                            VIN: {v.vin}
                          </span>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {v.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 pt-2 border-t border-white/5">
                        <div>WR #: <strong className="text-white font-mono">{v.warehouseReceiptNo}</strong></div>
                        <div>Inspection: <strong className="text-white font-mono">{v.inspectionNo}</strong></div>
                        <div>Title: <strong className="text-white">{v.titleStatus}</strong> ({v.titleState})</div>
                        <div>Location: <strong className="text-white">{v.warehouseLocation}</strong></div>
                      </div>
                    </div>
                  ))}
                  {linkedVehicles.length === 0 && (
                    <div className="col-span-2 py-8 text-center text-slate-400 text-xs">
                      No vehicles assigned to container {currentShipment.containerNo}. Open "Loading Plan & Stuffing" to link staged Warehouse Receipts.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* NEW OCEAN BOOKING MODAL */}
      {isNewBookingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="liquid-glass-card rounded-2xl w-full max-w-3xl shadow-2xl border border-white/10 overflow-hidden flex flex-col max-h-[90vh] relative">
            <div className="absolute top-0 right-0 w-80 h-32 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />

            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-white/[0.03] relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/30 text-sky-300 flex items-center justify-center font-black shadow-lg shadow-sky-500/10">
                  <span className="material-symbols-outlined text-[20px]">directions_boat</span>
                </div>
                <div>
                  <h3 className="font-bold text-base text-white tracking-wide">
                    New Ocean Shipment Booking & Rating
                  </h3>
                  <p className="text-xs text-slate-400">
                    Automated Weight/Measure (W/M) Rating &bull; FMC Compliant Bill of Lading
                  </p>
                </div>
              </div>
              <button onClick={handleCloseNewBooking} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveNewBooking} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs relative z-10">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold block mb-1 text-slate-300">File Reference #</label>
                  <input
                    type="text"
                    value={newBooking.fileNo}
                    onChange={(e) => setNewBooking({ ...newBooking, fileNo: e.target.value })}
                    placeholder={`KE-${mode === 'Ocean Import' ? 'OI' : 'OE'}-2026-AUTO`}
                    className="input-glass w-full px-3 py-2 rounded-xl font-mono font-bold text-sky-400"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1 text-slate-300">Booking #</label>
                  <input
                    type="text"
                    value={newBooking.bookingNo}
                    onChange={(e) => setNewBooking({ ...newBooking, bookingNo: e.target.value })}
                    placeholder="e.g. BKG-992144"
                    className="input-glass w-full px-3 py-2 rounded-xl font-mono text-white"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1 text-slate-300">Bill of Lading #</label>
                  <input
                    type="text"
                    value={newBooking.blNo}
                    onChange={(e) => setNewBooking({ ...newBooking, blNo: e.target.value })}
                    placeholder="e.g. MSKU-88219"
                    className="input-glass w-full px-3 py-2 rounded-xl font-mono font-bold text-cyan-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1 text-slate-300">Operation Mode</label>
                  <select
                    value={newBooking.mode}
                    onChange={(e) => setNewBooking({ ...newBooking, mode: e.target.value as 'Ocean Export' | 'Ocean Import' })}
                    className="input-glass w-full px-3 py-2 rounded-xl font-bold bg-slate-900 text-white"
                  >
                    <option value="Ocean Export">Ocean Export</option>
                    <option value="Ocean Import">Ocean Import</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold block mb-1 text-slate-300">Shipment Type (FCL / LCL)</label>
                  <select
                    value={newBooking.fclOrLcl}
                    onChange={(e) => setNewBooking({ ...newBooking, fclOrLcl: e.target.value })}
                    className="input-glass w-full px-3 py-2 rounded-xl font-bold bg-slate-900 text-white"
                  >
                    <option value="FCL">FCL — Full Container Load</option>
                    <option value="LCL">LCL — Less than Container Load (Consolidation)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1 text-slate-300">Shipper / Exporter</label>
                  <input
                    type="text"
                    value={newBooking.shipper}
                    onChange={(e) => setNewBooking({ ...newBooking, shipper: e.target.value })}
                    placeholder="e.g. Manila Port Logistics Inc."
                    className="input-glass w-full px-3 py-2 rounded-xl text-white"
                  />
                  <input
                    type="text"
                    value={newBooking.shipperTin}
                    onChange={(e) => setNewBooking({ ...newBooking, shipperTin: e.target.value })}
                    placeholder="Shipper TIN (e.g. 000-123-456-000)"
                    className="input-glass w-full mt-2 px-3 py-1.5 rounded-lg text-[11px] font-mono text-slate-300"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1 text-slate-300">Consignee / Importer</label>
                  <input
                    type="text"
                    value={newBooking.consignee}
                    onChange={(e) => setNewBooking({ ...newBooking, consignee: e.target.value })}
                    placeholder="e.g. Pacific Coast Distribution LLC"
                    className="input-glass w-full px-3 py-2 rounded-xl text-white"
                  />
                  <input
                    type="text"
                    value={newBooking.consigneeTin}
                    onChange={(e) => setNewBooking({ ...newBooking, consigneeTin: e.target.value })}
                    placeholder="Consignee TIN / Tax ID"
                    className="input-glass w-full mt-2 px-3 py-1.5 rounded-lg text-[11px] font-mono text-slate-300"
                  />
                </div>
              </div>

              {/* Ports Selection */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1 text-slate-300">Port of Loading (POL)</label>
                  <select
                    value={newBooking.pol}
                    onChange={(e) => setNewBooking({ ...newBooking, pol: e.target.value })}
                    className="input-glass w-full px-3 py-2 rounded-xl font-medium bg-slate-900 text-white"
                  >
                    {SEAPORTS_DIRECTORY.map((p) => (
                      <option key={p.code} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold block mb-1 text-slate-300">Port of Discharge (POD)</label>
                  <select
                    value={newBooking.pod}
                    onChange={(e) => setNewBooking({ ...newBooking, pod: e.target.value })}
                    className="input-glass w-full px-3 py-2 rounded-xl font-medium bg-slate-900 text-white"
                  >
                    {SEAPORTS_DIRECTORY.map((p) => (
                      <option key={p.code} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Vessel & Equipment */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold block mb-1 text-slate-300">Vessel Name</label>
                  <input
                    type="text"
                    value={newBooking.vessel}
                    onChange={(e) => setNewBooking({ ...newBooking, vessel: e.target.value })}
                    placeholder="MV Merlion Express"
                    className="input-glass w-full px-3 py-2 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1 text-slate-300">Voyage #</label>
                  <input
                    type="text"
                    value={newBooking.voyage}
                    onChange={(e) => setNewBooking({ ...newBooking, voyage: e.target.value })}
                    placeholder="048E"
                    className="input-glass w-full px-3 py-2 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1 text-slate-300">Equipment Type</label>
                  <select
                    value={newBooking.equipmentType}
                    onChange={(e) => setNewBooking({ ...newBooking, equipmentType: e.target.value })}
                    className="input-glass w-full px-3 py-2 rounded-xl bg-slate-900 text-white"
                  >
                    {CONTAINER_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1 text-slate-300">Container #</label>
                  <input
                    type="text"
                    value={newBooking.containerNo}
                    onChange={(e) => setNewBooking({ ...newBooking, containerNo: e.target.value })}
                    placeholder="MSKU-992144-8"
                    className="input-glass w-full px-3 py-2 rounded-xl font-mono font-bold text-cyan-400"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1 text-slate-300">Seal #</label>
                  <input
                    type="text"
                    value={newBooking.sealNo}
                    onChange={(e) => setNewBooking({ ...newBooking, sealNo: e.target.value })}
                    placeholder="SL-884102"
                    className="input-glass w-full px-3 py-2 rounded-xl font-mono text-white"
                  />
                </div>
              </div>

              {/* Weight & Measure (W/M) Rating Box */}
              <div className="p-4 rounded-xl border border-sky-400/20 bg-sky-500/10 space-y-3">
                <span className="font-black text-xs text-sky-300 uppercase tracking-wider block">
                  Automated Weight / Measure (W/M) Rating Engine
                </span>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold block mb-1 text-slate-400">Gross Weight (KG)</label>
                    <input
                      type="text"
                      value={newBooking.weightKg}
                      onChange={(e) => setNewBooking({ ...newBooking, weightKg: e.target.value })}
                      placeholder="e.g. 18500"
                      className="input-glass w-full px-3 py-2 rounded-xl font-mono font-bold text-white"
                    />
                    <span className="text-[10px] text-slate-400 block mt-1">
                      = {(parsedWeightKg / 1000).toFixed(2)} Metric Tons
                    </span>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold block mb-1 text-slate-400">Volume (CBM)</label>
                    <input
                      type="text"
                      value={newBooking.volumeCbm}
                      onChange={(e) => setNewBooking({ ...newBooking, volumeCbm: e.target.value })}
                      placeholder="e.g. 32.5"
                      className="input-glass w-full px-3 py-2 rounded-xl font-mono font-bold text-white"
                    />
                    <span className="text-[10px] text-slate-400 block mt-1">Cubic Meters</span>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold block mb-1 text-slate-400">Rate per RT (PHP)</label>
                    <input
                      type="text"
                      value={newBooking.ratePerRT}
                      onChange={(e) => setNewBooking({ ...newBooking, ratePerRT: e.target.value })}
                      placeholder="e.g. 2400"
                      className="input-glass w-full px-3 py-2 rounded-xl font-mono font-bold text-emerald-400"
                    />
                    <span className="text-[10px] text-slate-400 block mt-1">Tariff Base Rate</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-sky-400/20 text-xs">
                  <div>
                    Revenue Tons: <strong className="font-mono text-cyan-300">{wmCalc.chargeableWM.toFixed(2)} RT</strong>
                    <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30 font-bold uppercase">
                      Rated by {wmCalc.basis} (Max of {(parsedWeightKg / 1000).toFixed(2)} MT vs {parsedVolumeCbm.toFixed(2)} CBM)
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400">
                      Freight ({wmCalc.totalFreight.toLocaleString()}) + {Math.round(effectiveVatRate * 100)}% VAT ({vatCalc.vat.toLocaleString()}):
                    </span>
                    <strong className="ml-2 font-mono text-sm text-emerald-400">
                      PHP {(wmCalc.totalFreight + vatCalc.vat).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseNewBooking}
                  className="px-4 py-2 rounded-xl border border-white/10 font-bold text-slate-300 hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold shadow-lg shadow-sky-500/25 flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  Save Ocean Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IN-PLACE EDIT SHIPMENT MODAL */}
      {showEditModal && editingShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="liquid-glass-card rounded-2xl w-full max-w-3xl shadow-2xl border border-white/10 overflow-hidden flex flex-col max-h-[90vh] relative">
            <div className="absolute top-0 right-0 w-80 h-32 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />

            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-white/[0.03] relative z-10">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sky-400 text-[20px]">edit_document</span>
                <h3 className="font-bold text-base text-white tracking-wide">
                  Edit Shipment File: {editingShipment.fileNo}
                </h3>
              </div>
              <button onClick={() => setShowEditModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs relative z-10">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1 text-slate-300">Shipper / Exporter</label>
                  <input
                    type="text"
                    value={editingShipment.shipper}
                    onChange={(e) => setEditingShipment({ ...editingShipment, shipper: e.target.value })}
                    className="input-glass w-full px-3 py-2 rounded-xl text-white"
                  />
                  <input
                    type="text"
                    value={editingShipment.shipperTin || ''}
                    onChange={(e) => setEditingShipment({ ...editingShipment, shipperTin: e.target.value })}
                    placeholder="Shipper TIN"
                    className="input-glass w-full mt-2 px-3 py-1.5 rounded-lg text-[11px] font-mono text-slate-300"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1 text-slate-300">Consignee / Importer</label>
                  <input
                    type="text"
                    value={editingShipment.consignee}
                    onChange={(e) => setEditingShipment({ ...editingShipment, consignee: e.target.value })}
                    className="input-glass w-full px-3 py-2 rounded-xl text-white"
                  />
                  <input
                    type="text"
                    value={editingShipment.consigneeTin || ''}
                    onChange={(e) => setEditingShipment({ ...editingShipment, consigneeTin: e.target.value })}
                    placeholder="Consignee TIN"
                    className="input-glass w-full mt-2 px-3 py-1.5 rounded-lg text-[11px] font-mono text-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1 text-slate-300">Port of Loading (POL)</label>
                  <select
                    value={editingShipment.portOfLoading || editingShipment.origin}
                    onChange={(e) =>
                      setEditingShipment({
                        ...editingShipment,
                        portOfLoading: e.target.value,
                        origin: e.target.value
                      })
                    }
                    className="input-glass w-full px-3 py-2 rounded-xl bg-slate-900 text-white"
                  >
                    {SEAPORTS_DIRECTORY.map((p) => (
                      <option key={p.code} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold block mb-1 text-slate-300">Port of Discharge (POD)</label>
                  <select
                    value={editingShipment.portOfDischarge || editingShipment.destination}
                    onChange={(e) =>
                      setEditingShipment({
                        ...editingShipment,
                        portOfDischarge: e.target.value,
                        destination: e.target.value
                      })
                    }
                    className="input-glass w-full px-3 py-2 rounded-xl bg-slate-900 text-white"
                  >
                    {SEAPORTS_DIRECTORY.map((p) => (
                      <option key={p.code} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold block mb-1 text-slate-300">Vessel Name</label>
                  <input
                    type="text"
                    value={editingShipment.vesselOrFlight}
                    onChange={(e) => setEditingShipment({ ...editingShipment, vesselOrFlight: e.target.value })}
                    className="input-glass w-full px-3 py-2 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1 text-slate-300">Voyage #</label>
                  <input
                    type="text"
                    value={editingShipment.voyageOrFlightNo}
                    onChange={(e) => setEditingShipment({ ...editingShipment, voyageOrFlightNo: e.target.value })}
                    className="input-glass w-full px-3 py-2 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1 text-slate-300">Carrier</label>
                  <input
                    type="text"
                    value={editingShipment.carrierName || ''}
                    onChange={(e) => setEditingShipment({ ...editingShipment, carrierName: e.target.value })}
                    className="input-glass w-full px-3 py-2 rounded-xl text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold block mb-1 text-slate-300">Container #</label>
                  <input
                    type="text"
                    value={editingShipment.containerNo || ''}
                    onChange={(e) => setEditingShipment({ ...editingShipment, containerNo: e.target.value })}
                    className="input-glass w-full px-3 py-2 rounded-xl font-mono text-cyan-400 font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1 text-slate-300">Seal #</label>
                  <input
                    type="text"
                    value={editingShipment.sealNo || ''}
                    onChange={(e) => setEditingShipment({ ...editingShipment, sealNo: e.target.value })}
                    className="input-glass w-full px-3 py-2 rounded-xl font-mono text-white"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1 text-slate-300">Equipment Type</label>
                  <select
                    value={editingShipment.equipmentType || "40' High Cube (40' HC)"}
                    onChange={(e) => setEditingShipment({ ...editingShipment, equipmentType: e.target.value })}
                    className="input-glass w-full px-3 py-2 rounded-xl bg-slate-900 text-white"
                  >
                    {CONTAINER_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold block mb-1 text-slate-300">Gross Weight (KG)</label>
                  <input
                    type="number"
                    value={editingShipment.weightKg}
                    onChange={(e) => setEditingShipment({ ...editingShipment, weightKg: parseFloat(e.target.value) || 0 })}
                    className="input-glass w-full px-3 py-2 rounded-xl font-mono text-white"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1 text-slate-300">Volume (CBM)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingShipment.volumeCbm}
                    onChange={(e) => setEditingShipment({ ...editingShipment, volumeCbm: parseFloat(e.target.value) || 0 })}
                    className="input-glass w-full px-3 py-2 rounded-xl font-mono text-white"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1 text-slate-300">Commodity Code (HS)</label>
                  <input
                    type="text"
                    value={editingShipment.commodityCode || ''}
                    onChange={(e) => setEditingShipment({ ...editingShipment, commodityCode: e.target.value })}
                    className="input-glass w-full px-3 py-2 rounded-xl font-mono text-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold block mb-1 text-slate-300">Nature of Goods</label>
                <input
                  type="text"
                  value={editingShipment.natureOfGoods || ''}
                  onChange={(e) => setEditingShipment({ ...editingShipment, natureOfGoods: e.target.value })}
                  className="input-glass w-full px-3 py-2 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="font-bold block mb-1 text-slate-300">Marks and Numbers</label>
                <textarea
                  rows={3}
                  value={editingShipment.marksAndNumbers || ''}
                  onChange={(e) => setEditingShipment({ ...editingShipment, marksAndNumbers: e.target.value })}
                  className="input-glass w-full px-3 py-2 rounded-xl font-mono text-[11px] text-white"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 font-bold text-slate-300 hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold shadow-lg shadow-sky-500/25 flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">check</span>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* File Analysis Modal */}
      {showAnalysis && currentShipment && (
        <FileAnalysisModal shipment={currentShipment} onClose={() => setShowAnalysis(false)} />
      )}
    </div>
  )
}
