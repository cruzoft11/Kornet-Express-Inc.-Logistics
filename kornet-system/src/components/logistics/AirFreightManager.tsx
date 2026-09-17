import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useLogisticsStore,
  Shipment,
  calculateVolumetricWeightKg,
  calculateVat
} from '../../stores/logisticsStore'
import FileAnalysisModal from './FileAnalysisModal'
import { downloadAwbPdf, downloadManifestPdf } from '../../utils/freightPdf'

export const AIRPORTS_DIRECTORY = [
  { code: 'CRK', name: 'Clark International Airport (CRK)' },
  { code: 'MNL', name: 'Ninoy Aquino International Airport (MNL/NAIA)' },
  { code: 'CEB', name: 'Mactan-Cebu International Airport (CEB)' },
  { code: 'DVO', name: 'Francisco Bangoy International Airport (DVO)' },
  { code: 'HKG', name: 'Hong Kong International Airport (HKG)' },
  { code: 'SIN', name: 'Singapore Changi Airport (SIN)' },
  { code: 'ICN', name: 'Incheon International Airport (ICN)' },
  { code: 'NRT', name: 'Tokyo Narita International Airport (NRT)' },
  { code: 'TPE', name: 'Taiwan Taoyuan International Airport (TPE)' },
  { code: 'LAX', name: 'Los Angeles International Airport (LAX)' },
  { code: 'SFO', name: 'San Francisco International Airport (SFO)' },
  { code: 'ORD', name: "Chicago O'Hare International Airport (ORD)" }
]

export const AIR_CARRIERS = [
  'Philippine Airlines Cargo (PR)',
  'Cebu Pacific Air Cargo (5J)',
  'Cathay Pacific Cargo (CX)',
  'Singapore Airlines Cargo (SQ)',
  'Korean Air Cargo (KE)',
  'Asiana Airlines Cargo (OZ)',
  'Federal Express / FedEx Express',
  'UPS Air Cargo',
  'DHL Aviation / AeroLogic'
]

interface AirFreightManagerProps {
  mode?: 'Air Export' | 'Air Import'
}

export default function AirFreightManager({ mode }: AirFreightManagerProps) {
  const navigate = useNavigate()
  const {
    shipments,
    hydrateShipments,
    selectedFileNo,
    setSelectedFileNo,
    searchTerm,
    filterStatus,
    selectedBranchCode,
    closeShipment,
    transferToBridge,
    autoBridgeOperationalCostToFsCheck,
    openPrintModal,
    openNewChargeModal,
    createShipment,
    updateShipment,
    deleteShipment,
    modalOpen,
    setModalOpen,
    vatRate
  } = useLogisticsStore()

  const [fsBridgeBanner, setFsBridgeBanner] = useState<{
    checkNo: string
    jvNo: string
    amount: number
    vendor: string
  } | null>(null)

  const [showAnalysis, setShowAnalysis] = useState(false)
  const [showNewAwbModal, setShowNewAwbModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null)
  const [activeTab, setActiveTab] = useState<'details' | 'billing' | 'costs' | 'customs' | 'manifest'>('details')
  const [customsNotice, setCustomsNotice] = useState<string | null>(null)

  // Load shipments from the backend on first mount.
  useEffect(() => {
    void hydrateShipments()
  }, [hydrateShipments])

  const isNewAwbOpen = showNewAwbModal || modalOpen.newAirwaybill
  const handleCloseNewAwb = () => {
    setShowNewAwbModal(false)
    setModalOpen('newAirwaybill', false)
  }

  // String state for inputs to eliminate 0-bug
  const [newAwb, setNewAwb] = useState({
    fileNo: '',
    bookingNo: '',
    awbNo: '',
    mode: mode || 'Air Export',
    airline: 'Philippine Airlines Cargo (PR)',
    flightNo: 'PR-102',
    shipper: '',
    shipperAddress: '',
    shipperTin: '',
    consignee: '',
    consigneeAddress: '',
    consigneeTin: '',
    origin: 'Clark International Airport (CRK)',
    destination: 'Los Angeles International Airport (LAX)',
    pieces: '1',
    grossWeightKg: '',
    dimLengthCm: '60',
    dimWidthCm: '40',
    dimHeightCm: '40',
    ratePerKg: '',
    commodity: 'Aviation Electronics & High-Value Components',
    hsCode: '8542.31.00',
    isHazmat: false,
    unNumber: ''
  })

  // Dimensional weight interactive calculator
  const [dimL, setDimL] = useState(60)
  const [dimW, setDimW] = useState(40)
  const [dimH, setDimH] = useState(40)
  const [dimPcs, setDimPcs] = useState(12)

  const calcVolWeight = ((dimL * dimW * dimH) / 6000) * dimPcs

  // Numeric parsing for live AWB rating
  const parsedGrossKg = parseFloat(newAwb.grossWeightKg) || 0
  const parsedPcs = parseInt(newAwb.pieces, 10) || 1
  const parsedLen = parseFloat(newAwb.dimLengthCm) || 0
  const parsedWid = parseFloat(newAwb.dimWidthCm) || 0
  const parsedHgt = parseFloat(newAwb.dimHeightCm) || 0
  const parsedRatePerKg = parseFloat(newAwb.ratePerKg) || 0

  const calcVolKg = calculateVolumetricWeightKg(parsedLen, parsedWid, parsedHgt, parsedPcs)
  const chargeableWeight = Math.max(parsedGrossKg, calcVolKg)
  const airFreightTotal = chargeableWeight * parsedRatePerKg
  const effectiveVatRate = vatRate ?? 0.12
  const airVat = calculateVat(airFreightTotal, effectiveVatRate)

  const handleSaveNewAwb = (e: React.FormEvent) => {
    e.preventDefault()
    const prefix = (newAwb.mode || mode) === 'Air Import' ? 'KE-AI' : 'KE-AE'
    const fileNo =
      newAwb.fileNo.trim() ||
      `${prefix}-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`

    const shipment: Shipment = {
      fileNo,
      type: (newAwb.mode as 'Air Export' | 'Air Import') || mode || 'Air Export',
      bookingNo: newAwb.bookingNo || `AWB-BKG-${Date.now().toString().slice(-6)}`,
      blOrAwbNo: newAwb.awbNo || `079-${Date.now().toString().slice(-8)}`,
      blClass: 'MBL',
      shipmentType: 'Direct',
      status: 'Open',
      shipper: newAwb.shipper || 'Unspecified Shipper',
      shipperAddress: newAwb.shipperAddress,
      shipperTin: newAwb.shipperTin,
      consignee: newAwb.consignee || 'Unspecified Consignee',
      consigneeAddress: newAwb.consigneeAddress,
      consigneeTin: newAwb.consigneeTin,
      origin: newAwb.origin,
      destination: newAwb.destination,
      portOfLoading: newAwb.origin,
      portOfDischarge: newAwb.destination,
      carrierName: newAwb.airline,
      vesselOrFlight: newAwb.airline,
      voyageOrFlightNo: newAwb.flightNo,
      pieces: parsedPcs,
      packageType: 'Cartons',
      weightKg: parsedGrossKg,
      chargeableWeightKg: chargeableWeight,
      volumeCbm: (parsedLen * parsedWid * parsedHgt * parsedPcs) / 1000000,
      natureOfGoods: newAwb.commodity || 'General Air Cargo',
      commodityCode: newAwb.hsCode,
      isHazmat: newAwb.isHazmat,
      unNumber: newAwb.unNumber,
      marksAndNumbers: `SHIPPER: ${newAwb.shipper || 'N/A'}\nDEST: ${newAwb.destination}`,
      customsLane: 'Green',
      deliveryOrderStatus: 'Pending',
      billingLines: [
        {
          id: 'b-' + Date.now() + '-1',
          code: 'AF-BASE',
          desc: `Air Freight Cargo (${chargeableWeight.toFixed(2)} KG Chargeable @ PHP ${parsedRatePerKg.toLocaleString()}/KG - ${parsedGrossKg >= calcVolKg ? 'Actual' : 'Volumetric'} Basis)`,
          currency: 'PHP',
          rate: parsedRatePerKg,
          amount: airFreightTotal,
          glAccount: '4000-02',
          customer: newAwb.shipper || 'Direct Shipper',
          prepaidOrCollect: 'Prepaid'
        },
        {
          id: 'b-' + Date.now() + '-2',
          code: `VAT-${Math.round(effectiveVatRate * 100)}`,
          desc: `${Math.round(effectiveVatRate * 100)}% Value Added Tax (BIR Compliant)`,
          currency: 'PHP',
          rate: effectiveVatRate,
          amount: airVat.vat,
          glAccount: '2100-05',
          customer: newAwb.shipper || 'Direct Shipper',
          prepaidOrCollect: 'Prepaid'
        }
      ],
      costLines: [
        {
          id: 'c-' + Date.now() + '-1',
          code: 'AIR-HANDLING',
          desc: 'Airport Ramp & Cargo Terminal Handling Fee',
          rate: 2200,
          amount: 2200,
          glAccount: '5000-03',
          vendor: 'Clark International Airport Corp',
          vendorId: 'VND-CIAC-01'
        },
        {
          id: 'c-' + Date.now() + '-2',
          code: 'AIR-DOC',
          desc: 'IATA Air Waybill Issuance & Security Fee',
          rate: 1500,
          amount: 1500,
          glAccount: '5000-01',
          vendor: newAwb.airline,
          vendorId: 'VND-AIRLINE-01'
        }
      ]
    }

    createShipment(shipment)
    setSelectedFileNo(shipment.fileNo)
    handleCloseNewAwb()
  }

  // Filter air shipments by mode if provided
  const airShipments = shipments.filter((s) => {
    if (mode && s.type !== mode) return false
    if (!mode && s.type !== 'Air Export' && s.type !== 'Air Import') return false

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

  const filtered = airShipments.filter((s) => {
    const matchesSearch =
      searchTerm === '' ||
      s.fileNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.blOrAwbNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.shipper.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.consignee.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.origin && s.origin.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.destination && s.destination.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesFilter = filterStatus === 'ALL' || s.status === filterStatus
    return matchesSearch && matchesFilter
  })

  const current = airShipments.find((s) => s.fileNo === selectedFileNo) || airShipments[0]

  const totalBilling = current?.billingLines.reduce((sum, b) => sum + b.amount, 0) || 0
  const totalCost = current?.costLines.reduce((sum, c) => sum + c.amount, 0) || 0
  const profit = totalBilling - totalCost
  const marginPct = totalBilling > 0 ? (profit / totalBilling) * 100 : 0

  const handlePrintAWB = () => {
    if (!current) return
    openPrintModal({
      type: 'AWB',
      title: `IATA Standard Air Waybill (Form 079) — ${current.blOrAwbNo}`,
      data: current
    })
  }

  const handleDirectDownloadAWB = () => {
    if (!current) return
    downloadAwbPdf(current)
  }

  const handleDirectDownloadManifest = () => {
    if (!current) return
    downloadManifestPdf(current)
  }

  const handleOpenEdit = () => {
    if (!current) return
    setEditingShipment({ ...current })
    setShowEditModal(true)
  }

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingShipment) return
    updateShipment(editingShipment.fileNo, editingShipment)
    setShowEditModal(false)
  }

  const handleDeleteShipment = () => {
    if (!current) return
    const confirmed = window.confirm(
      `Are you sure you want to delete / archive shipment ${current.fileNo}? This action cannot be undone.`
    )
    if (confirmed) {
      deleteShipment(current.fileNo)
    }
  }

  const handleSaveCustomsInfo = (e: React.FormEvent) => {
    e.preventDefault()
    if (!current) return
    updateShipment(current.fileNo, {
      customsSadNo: current.customsSadNo,
      customsEntryNo: current.customsEntryNo,
      customsLane: current.customsLane,
      customsDutiesAmount: current.customsDutiesAmount,
      customsBrokerName: current.customsBrokerName,
      customsBrokerLicense: current.customsBrokerLicense,
      deliveryOrderStatus: current.deliveryOrderStatus
    })
    setCustomsNotice('BOC Airport Customs clearance status saved successfully!')
    setTimeout(() => setCustomsNotice(null), 3000)
  }

  return (
    <div className="stitch-module-surface flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans">
      {/* Action Toolbar */}
      <div className="px-6 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap justify-between items-center gap-3 text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewAwbModal(true)}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">add_box</span>
            New Air Waybill
          </button>
          <span className="font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-indigo-600 text-[18px]">flight_takeoff</span>
            {mode ? `${mode} Operations` : 'Air Freight Operations & IATA Airwaybills'}
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
            {filtered.length} Flights Active
          </span>
        </div>

        {current && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowAnalysis(true)}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">analytics</span>
              File Analysis
            </button>

            {/* Direct PDF Download */}
            <button
              onClick={handleDirectDownloadAWB}
              className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
              title="Directly download official IATA Air Waybill PDF"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              Download AWB PDF
            </button>

            <button
              onClick={handlePrintAWB}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              Print AWB
            </button>

            {current.status === 'Open' ? (
              <button
                onClick={() => closeShipment(current.fileNo)}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">lock</span>
                Close File
              </button>
            ) : current.status === 'Closed' ? (
              <button
                onClick={() => transferToBridge(current.fileNo)}
                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">hub</span>
                Transfer to Bridge
              </button>
            ) : (
              <span className="px-3 py-1.5 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 font-black text-xs">
                Bridged to FS
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Files List */}
        <div className="w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col overflow-y-auto">
          <div className="p-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950 text-[11px] font-bold text-slate-500 uppercase tracking-wider flex justify-between items-center">
            <span>{mode || 'Air'} Files</span>
            <span className="font-mono text-[10px]">{filtered.length}</span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {filtered.map((s) => {
              const isSelected = s.fileNo === current?.fileNo
              return (
                <div
                  key={s.fileNo}
                  onClick={() => setSelectedFileNo(s.fileNo)}
                  className={`p-3.5 cursor-pointer transition-all border-l-4 ${
                    isSelected
                      ? 'bg-indigo-50/90 dark:bg-indigo-950/50 border-indigo-600 shadow-sm'
                      : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-slate-900 dark:text-white font-mono">{s.fileNo}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                        s.status === 'Closed'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : s.status === 'Transferred'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                          : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-700 dark:text-slate-300 truncate font-semibold">
                    {s.shipper}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                    <span className="truncate max-w-[120px]">{s.origin}</span>
                    <span className="text-slate-300 dark:text-slate-600">✈</span>
                    <span className="truncate max-w-[120px] font-medium text-slate-600 dark:text-slate-300">{s.destination}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 font-mono">
                    <span>AWB: {s.blOrAwbNo}</span>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                      {s.chargeableWeightKg || s.weightKg} KG
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Details Pane */}
        {!current ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-50 dark:bg-slate-950">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-3xl">flight_takeoff</span>
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">
              No Air Freight Shipments Staged
            </h3>
            <p className="text-xs text-slate-500 max-w-md mb-6">
              Create a new air export or import booking to rate IATA chargeable weight, generate Master/House AWBs, and track flight routing.
            </p>
            <button
              onClick={() => setShowNewAwbModal(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md inline-flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">add_box</span>
              Create First Air Waybill
            </button>
          </div>
        ) : (
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
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white font-mono">{current.fileNo}</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                      {current.type}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      IATA Class: {current.blClass || 'MBL'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-mono">
                    AWB: <strong>{current.blOrAwbNo}</strong> &bull; Flight: <strong>{current.vesselOrFlight} {current.voyageOrFlightNo}</strong>
                  </p>
                </div>

                {/* Actions & Financial Badges */}
                <div className="flex items-center gap-4 text-xs flex-wrap">
                  <button
                    onClick={handleOpenEdit}
                    className="px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit_document</span>
                    Edit File
                  </button>

                  <button
                    onClick={handleDeleteShipment}
                    className="px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100 font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                    Delete
                  </button>

                  <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />

                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px] uppercase">Billing (AR)</span>
                    <strong className="text-indigo-600 dark:text-indigo-400 text-sm font-mono">
                      PHP {totalBilling.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                  <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px] uppercase">Cost (AP)</span>
                    <strong className="text-amber-600 dark:text-amber-400 text-sm font-mono">
                      PHP {totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                  <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px] uppercase">Margin</span>
                    <strong className={`text-sm font-mono ${profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}`}>
                      PHP {profit.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({marginPct.toFixed(1)}%)
                    </strong>
                  </div>
                </div>
              </div>

              {/* Routing & Weights Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Shipper</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">{current.shipper}</span>
                  {current.shipperTin && <span className="text-[10px] text-slate-400 font-mono">TIN: {current.shipperTin}</span>}
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Consignee</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">{current.consignee}</span>
                  {current.consigneeTin && <span className="text-[10px] text-slate-400 font-mono">TIN: {current.consigneeTin}</span>}
                </div>
                <div className="p-2.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
                  <span className="text-indigo-600 dark:text-indigo-400 block text-[10px] uppercase font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">flight_takeoff</span> Departure Hub
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white block mt-0.5 truncate">{current.origin}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                  <span className="text-emerald-600 dark:text-emerald-400 block text-[10px] uppercase font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">flight_land</span> Destination Hub
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white block mt-0.5 truncate">{current.destination}</span>
                </div>
              </div>
            </div>

            {/* Detailed Tabs Strip */}
            <div className="border-b border-slate-200 dark:border-slate-800 flex gap-4 overflow-x-auto">
              {[
                { id: 'details', label: `Flight & Weight Details`, icon: 'flight' },
                { id: 'billing', label: `Air Billing (${current.billingLines.length})`, icon: 'receipt' },
                { id: 'costs', label: `Ramp & Carrier Costs (${current.costLines.length})`, icon: 'payments' },
                { id: 'customs', label: `BOC Airport Customs`, icon: 'verified_user' },
                { id: 'manifest', label: `Air Cargo Manifest`, icon: 'table_rows' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 pb-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab 1: Details */}
            {activeTab === 'details' && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                    IATA Volumetric & Chargeable Weight Specifications
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Pieces</span>
                      <strong className="text-base text-slate-900 dark:text-white font-mono">{current.pieces || 1} PKGS</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Actual Gross Weight</span>
                      <strong className="text-base text-slate-900 dark:text-white font-mono">{(current.weightKg || 0).toLocaleString()} KG</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Chargeable Weight (IATA)</span>
                      <strong className="text-base text-indigo-600 dark:text-indigo-400 font-mono">
                        {(current.chargeableWeightKg || current.weightKg || 0).toLocaleString()} KG
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Volume</span>
                      <strong className="text-base text-slate-900 dark:text-white font-mono">{(current.volumeCbm || 0).toFixed(3)} CBM</strong>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs space-y-2">
                    <span className="font-bold text-slate-500 uppercase text-[10px] block">Commodity & Nature of Goods</span>
                    <p className="font-bold text-slate-900 dark:text-white">{current.natureOfGoods || 'General Aviation Courier Cargo'}</p>
                    <p className="text-slate-600 dark:text-slate-400 whitespace-pre-line font-mono text-[11px]">{current.marksAndNumbers}</p>
                  </div>
                </div>

                {/* Interactive IATA Calculator */}
                <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-xs text-indigo-900 dark:text-indigo-300 uppercase tracking-wider">
                        IATA Volumetric Cargo Calculator (6,000 cm³/kg Standard)
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Formula: [Length (cm) × Width (cm) × Height (cm) ÷ 6,000] × Pieces
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-indigo-600 text-white font-mono text-xs font-bold">
                      Calculated: {calcVolWeight.toFixed(2)} KG
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Length (cm)</label>
                      <input
                        type="number"
                        value={dimL}
                        onChange={(e) => setDimL(Number(e.target.value))}
                        className="w-full px-3 py-1.5 rounded-lg border dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Width (cm)</label>
                      <input
                        type="number"
                        value={dimW}
                        onChange={(e) => setDimW(Number(e.target.value))}
                        className="w-full px-3 py-1.5 rounded-lg border dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Height (cm)</label>
                      <input
                        type="number"
                        value={dimH}
                        onChange={(e) => setDimH(Number(e.target.value))}
                        className="w-full px-3 py-1.5 rounded-lg border dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Pieces</label>
                      <input
                        type="number"
                        value={dimPcs}
                        onChange={(e) => setDimPcs(Number(e.target.value))}
                        className="w-full px-3 py-1.5 rounded-lg border dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Billing Lines */}
            {activeTab === 'billing' && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                      Air Waybill Billing Lines (AR)
                    </h3>
                    <p className="text-[11px] text-slate-500">Auto-routes to FS Sales Book (fs_salebook) upon Bridge transfer</p>
                  </div>
                  <button
                    onClick={() => openNewChargeModal(current.fileNo)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Add Billing Charge
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-[10px] uppercase">
                        <th className="pb-2">Code</th>
                        <th className="pb-2">Description</th>
                        <th className="pb-2">Terms</th>
                        <th className="pb-2">Target FS GL Account</th>
                        <th className="pb-2 text-right">Amount (PHP)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
                      {current.billingLines.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="py-2.5 font-bold text-indigo-600">{b.code}</td>
                          <td className="py-2.5 font-sans font-medium text-slate-800 dark:text-slate-200">{b.desc}</td>
                          <td className="py-2.5 font-sans">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {b.prepaidOrCollect}
                            </span>
                          </td>
                          <td className="py-2.5 text-slate-600 dark:text-slate-400">{b.glAccount} (Air Revenue)</td>
                          <td className="py-2.5 text-right font-bold text-slate-900 dark:text-white">
                            PHP {b.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 3: Cost Lines */}
            {activeTab === 'costs' && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                      Airline Ramp & Handling Costs (AP)
                    </h3>
                    <p className="text-[11px] text-slate-500">Auto-routes to FS Purchase Book (fs_purcbook) & CDV vouchers</p>
                  </div>
                  <button
                    onClick={() => openNewChargeModal(current.fileNo)}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-sm flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Add Cost Line
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-[10px] uppercase">
                        <th className="pb-2">Code</th>
                        <th className="pb-2">Description</th>
                        <th className="pb-2">Airline / Vendor</th>
                        <th className="pb-2">Target FS GL Account</th>
                        <th className="pb-2 text-right">Amount (PHP)</th>
                        <th className="pb-2 text-center">⚡ FS CDV Voucher</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
                      {current.costLines.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="py-2.5 font-bold text-amber-600">{c.code}</td>
                          <td className="py-2.5 font-sans font-medium text-slate-800 dark:text-slate-200">{c.desc}</td>
                          <td className="py-2.5 font-sans font-bold text-slate-700 dark:text-slate-300">{c.vendor}</td>
                          <td className="py-2.5 text-slate-600 dark:text-slate-400">{c.glAccount} (Airline Cost)</td>
                          <td className="py-2.5 text-right font-bold text-slate-900 dark:text-white">
                            PHP {c.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 text-center">
                            <button
                              onClick={async () => {
                                const res = await autoBridgeOperationalCostToFsCheck({
                                  sourceFileNo: current.fileNo,
                                  carrierOrVendor: c.vendor || current.vesselOrFlight || 'Airline',
                                  amount: c.amount,
                                  description: `${c.desc} (Flight ${current.voyageOrFlightNo || current.fileNo})`,
                                  expenseAccount: c.glAccount || '5010'
                                })
                                setFsBridgeBanner({
                                  checkNo: res.checkNo,
                                  jvNo: res.jvNo,
                                  amount: c.amount,
                                  vendor: c.vendor || current.vesselOrFlight || 'Airline'
                                })
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] shadow-sm inline-flex items-center gap-1 transition-transform hover:scale-105"
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

            {/* Tab 4: BOC Airport Customs */}
            {activeTab === 'customs' && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-indigo-600">verified_user</span>
                      BOC Airport Customs Clearance & Formal Entry
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Track Single Administrative Document (SAD), Customs Lane Assessment, and Airport Cargo Release
                    </p>
                  </div>
                  {customsNotice && (
                    <span className="px-3 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold animate-in fade-in">
                      {customsNotice}
                    </span>
                  )}
                </div>

                <form onSubmit={handleSaveCustomsInfo} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="font-bold block mb-1 text-slate-600 dark:text-slate-400">BOC Airport SAD Entry #</label>
                      <input
                        type="text"
                        value={current.customsSadNo || ''}
                        onChange={(e) => updateShipment(current.fileNo, { customsSadNo: e.target.value })}
                        placeholder="e.g. SAD-2026-CRK-00421"
                        className="w-full px-3 py-1.5 rounded-lg border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="font-bold block mb-1 text-slate-600 dark:text-slate-400">Customs Lane Assessment</label>
                      <select
                        value={current.customsLane || 'Green'}
                        onChange={(e) => updateShipment(current.fileNo, { customsLane: e.target.value as any })}
                        className="w-full px-3 py-1.5 rounded-lg border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                      >
                        <option value="Green">Green Lane (Immediate Airport Release)</option>
                        <option value="Yellow">Yellow Lane (Documentary Review)</option>
                        <option value="Red">Red Lane (Physical Ramp Inspection)</option>
                        <option value="Blue">Blue Lane (Post-Clearance Staging)</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-bold block mb-1 text-slate-600 dark:text-slate-400">Assessed Duties & Taxes (PHP)</label>
                      <input
                        type="number"
                        value={current.customsDutiesAmount || ''}
                        onChange={(e) => updateShipment(current.fileNo, { customsDutiesAmount: parseFloat(e.target.value) || 0 })}
                        placeholder="e.g. 35000"
                        className="w-full px-3 py-1.5 rounded-lg border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-emerald-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="font-bold block mb-1 text-slate-600 dark:text-slate-400">Customs Broker</label>
                      <input
                        type="text"
                        value={current.customsBrokerName || ''}
                        onChange={(e) => updateShipment(current.fileNo, { customsBrokerName: e.target.value })}
                        placeholder="e.g. Michael Tan, LCB"
                        className="w-full px-3 py-1.5 rounded-lg border dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                      />
                    </div>
                    <div>
                      <label className="font-bold block mb-1 text-slate-600 dark:text-slate-400">PRC License #</label>
                      <input
                        type="text"
                        value={current.customsBrokerLicense || ''}
                        onChange={(e) => updateShipment(current.fileNo, { customsBrokerLicense: e.target.value })}
                        placeholder="e.g. PRC-LCB-004419"
                        className="w-full px-3 py-1.5 rounded-lg border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-bold block mb-1 text-slate-600 dark:text-slate-400">Air Delivery Order (DO) Status</label>
                      <select
                        value={current.deliveryOrderStatus || 'Pending'}
                        onChange={(e) => updateShipment(current.fileNo, { deliveryOrderStatus: e.target.value as any })}
                        className="w-full px-3 py-1.5 rounded-lg border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                      >
                        <option value="Pending">Pending Airport Payment</option>
                        <option value="Issued">Issued / Gate Pass Ready</option>
                        <option value="Surrendered">Surrendered to Cargo Terminal</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">save</span>
                      Save Airport Customs Record
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Tab 5: Cargo Manifest */}
            {activeTab === 'manifest' && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                      Air Cargo Flight Manifest Summary
                    </h3>
                    <p className="text-[11px] text-slate-500">Official airline and airport ramp dispatch record</p>
                  </div>
                  <button
                    onClick={handleDirectDownloadManifest}
                    className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">download</span>
                    Download Manifest PDF
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs space-y-3 font-mono">
                  <div className="flex justify-between border-b pb-2 border-slate-200 dark:border-slate-700">
                    <span>Flight: {current.vesselOrFlight} {current.voyageOrFlightNo}</span>
                    <span>AWB: {current.blOrAwbNo}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-[11px]">
                    <div>Shipper: {current.shipper}</div>
                    <div>Consignee: {current.consignee}</div>
                    <div>Origin: {current.origin}</div>
                    <div>Destination: {current.destination}</div>
                    <div>Packages: {current.pieces} PKGS</div>
                    <div>Chargeable Weight: {current.chargeableWeightKg || current.weightKg} KG</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* NEW AIR WAYBILL MODAL */}
      {isNewAwbOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-indigo-50/70 dark:bg-indigo-950/40">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black">
                  <span className="material-symbols-outlined text-[18px]">flight_takeoff</span>
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    New Air Waybill & IATA Chargeable Weight Rating
                  </h3>
                  <p className="text-xs text-slate-500">
                    IATA Volumetric Rating (6000 cm³/kg) &bull; Standard Air Waybill Form 079
                  </p>
                </div>
              </div>
              <button onClick={handleCloseNewAwb} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveNewAwb} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold block mb-1 text-slate-600 dark:text-slate-400">File Reference #</label>
                  <input
                    type="text"
                    value={newAwb.fileNo}
                    onChange={(e) => setNewAwb({ ...newAwb, fileNo: e.target.value })}
                    placeholder={`KE-${mode === 'Air Import' ? 'AI' : 'AE'}-2026-AUTO`}
                    className="w-full px-3 py-1.5 rounded-lg border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1 text-slate-600 dark:text-slate-400">Booking Ref #</label>
                  <input
                    type="text"
                    value={newAwb.bookingNo}
                    onChange={(e) => setNewAwb({ ...newAwb, bookingNo: e.target.value })}
                    placeholder="AWB-BKG-88124"
                    className="w-full px-3 py-1.5 rounded-lg border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1 text-slate-600 dark:text-slate-400">Air Waybill (AWB) #</label>
                  <input
                    type="text"
                    value={newAwb.awbNo}
                    onChange={(e) => setNewAwb({ ...newAwb, awbNo: e.target.value })}
                    placeholder="079-99482110"
                    className="w-full px-3 py-1.5 rounded-lg border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold block mb-1 text-slate-600 dark:text-slate-400">Operation Mode</label>
                  <select
                    value={newAwb.mode}
                    onChange={(e) => setNewAwb({ ...newAwb, mode: e.target.value as 'Air Export' | 'Air Import' })}
                    className="w-full px-3 py-1.5 rounded-lg border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  >
                    <option value="Air Export">Air Export</option>
                    <option value="Air Import">Air Import</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold block mb-1 text-slate-600 dark:text-slate-400">Air Carrier</label>
                  <select
                    value={newAwb.airline}
                    onChange={(e) => setNewAwb({ ...newAwb, airline: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                  >
                    {AIR_CARRIERS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold block mb-1 text-slate-600 dark:text-slate-400">Flight #</label>
                  <input
                    type="text"
                    value={newAwb.flightNo}
                    onChange={(e) => setNewAwb({ ...newAwb, flightNo: e.target.value })}
                    placeholder="PR-102"
                    className="w-full px-3 py-1.5 rounded-lg border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1 text-slate-600 dark:text-slate-400">Shipper / Exporter</label>
                  <input
                    type="text"
                    value={newAwb.shipper}
                    onChange={(e) => setNewAwb({ ...newAwb, shipper: e.target.value })}
                    placeholder="e.g. Clark Semi-Conductor Assembly"
                    className="w-full px-3 py-1.5 rounded-lg border dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                  <input
                    type="text"
                    value={newAwb.shipperTin}
                    onChange={(e) => setNewAwb({ ...newAwb, shipperTin: e.target.value })}
                    placeholder="Shipper TIN"
                    className="w-full mt-1.5 px-3 py-1 rounded-lg border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1 text-slate-600 dark:text-slate-400">Consignee / Importer</label>
                  <input
                    type="text"
                    value={newAwb.consignee}
                    onChange={(e) => setNewAwb({ ...newAwb, consignee: e.target.value })}
                    placeholder="e.g. Silicon Valley Microelectronics"
                    className="w-full px-3 py-1.5 rounded-lg border dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                  <input
                    type="text"
                    value={newAwb.consigneeTin}
                    onChange={(e) => setNewAwb({ ...newAwb, consigneeTin: e.target.value })}
                    placeholder="Consignee TIN / Tax ID"
                    className="w-full mt-1.5 px-3 py-1 rounded-lg border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1 text-slate-600 dark:text-slate-400">Departure Airport</label>
                  <select
                    value={newAwb.origin}
                    onChange={(e) => setNewAwb({ ...newAwb, origin: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                  >
                    {AIRPORTS_DIRECTORY.map((a) => (
                      <option key={a.code} value={a.name}>{a.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold block mb-1 text-slate-600 dark:text-slate-400">Destination Airport</label>
                  <select
                    value={newAwb.destination}
                    onChange={(e) => setNewAwb({ ...newAwb, destination: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                  >
                    {AIRPORTS_DIRECTORY.map((a) => (
                      <option key={a.code} value={a.name}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dimensions & Rating Box */}
              <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-3">
                <span className="font-black text-xs text-indigo-900 dark:text-indigo-300 uppercase tracking-wider block">
                  IATA Volumetric Chargeable Weight Rating
                </span>

                <div className="grid grid-cols-5 gap-2">
                  <div>
                    <label className="text-[10px] font-bold block mb-0.5 text-slate-500">Pieces</label>
                    <input
                      type="text"
                      value={newAwb.pieces}
                      onChange={(e) => setNewAwb({ ...newAwb, pieces: e.target.value })}
                      placeholder="1"
                      className="w-full px-2.5 py-1.5 rounded-lg border dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold block mb-0.5 text-slate-500">L (cm)</label>
                    <input
                      type="text"
                      value={newAwb.dimLengthCm}
                      onChange={(e) => setNewAwb({ ...newAwb, dimLengthCm: e.target.value })}
                      placeholder="60"
                      className="w-full px-2.5 py-1.5 rounded-lg border dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold block mb-0.5 text-slate-500">W (cm)</label>
                    <input
                      type="text"
                      value={newAwb.dimWidthCm}
                      onChange={(e) => setNewAwb({ ...newAwb, dimWidthCm: e.target.value })}
                      placeholder="40"
                      className="w-full px-2.5 py-1.5 rounded-lg border dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold block mb-0.5 text-slate-500">H (cm)</label>
                    <input
                      type="text"
                      value={newAwb.dimHeightCm}
                      onChange={(e) => setNewAwb({ ...newAwb, dimHeightCm: e.target.value })}
                      placeholder="40"
                      className="w-full px-2.5 py-1.5 rounded-lg border dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold block mb-0.5 text-slate-500">Actual Gross (KG)</label>
                    <input
                      type="text"
                      value={newAwb.grossWeightKg}
                      onChange={(e) => setNewAwb({ ...newAwb, grossWeightKg: e.target.value })}
                      placeholder="e.g. 15"
                      className="w-full px-2.5 py-1.5 rounded-lg border dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[10px] font-bold block mb-0.5 text-slate-500">Air Freight Rate per KG (PHP)</label>
                    <input
                      type="text"
                      value={newAwb.ratePerKg}
                      onChange={(e) => setNewAwb({ ...newAwb, ratePerKg: e.target.value })}
                      placeholder="e.g. 350"
                      className="w-full px-3 py-1.5 rounded-lg border dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-emerald-600"
                    />
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border dark:border-slate-700 flex flex-col justify-center">
                    <div className="text-[10px] text-slate-400">Volumetric Weight: {calcVolKg.toFixed(2)} KG</div>
                    <div className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                      Chargeable: {chargeableWeight.toFixed(2)} KG ({parsedGrossKg >= calcVolKg ? 'Actual' : 'Volumetric'})
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-indigo-200 dark:border-indigo-900 text-xs">
                  <div>
                    Base Freight: <strong className="font-mono text-indigo-700 dark:text-indigo-300">PHP {airFreightTotal.toLocaleString()}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-500">Total Air Freight + {Math.round(effectiveVatRate * 100)}% VAT:</span>
                    <strong className="ml-2 font-mono text-sm text-emerald-600 dark:text-emerald-400">
                      PHP {(airFreightTotal + airVat.vat).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseNewAwb}
                  className="px-4 py-1.5 rounded-lg border font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  Save Air Waybill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IN-PLACE EDIT AWB MODAL */}
      {showEditModal && editingShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-indigo-50/70 dark:bg-indigo-950/40">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-600 text-[20px]">edit_document</span>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Edit Air Shipment File: {editingShipment.fileNo}
                </h3>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1 text-slate-600 dark:text-slate-400">Shipper / Exporter</label>
                  <input
                    type="text"
                    value={editingShipment.shipper}
                    onChange={(e) => setEditingShipment({ ...editingShipment, shipper: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                  <input
                    type="text"
                    value={editingShipment.shipperTin || ''}
                    onChange={(e) => setEditingShipment({ ...editingShipment, shipperTin: e.target.value })}
                    placeholder="Shipper TIN"
                    className="w-full mt-1 px-3 py-1 rounded-lg border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1 text-slate-600 dark:text-slate-400">Consignee / Importer</label>
                  <input
                    type="text"
                    value={editingShipment.consignee}
                    onChange={(e) => setEditingShipment({ ...editingShipment, consignee: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                  <input
                    type="text"
                    value={editingShipment.consigneeTin || ''}
                    onChange={(e) => setEditingShipment({ ...editingShipment, consigneeTin: e.target.value })}
                    placeholder="Consignee TIN"
                    className="w-full mt-1 px-3 py-1 rounded-lg border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1 text-slate-600 dark:text-slate-400">Departure Airport</label>
                  <select
                    value={editingShipment.origin}
                    onChange={(e) =>
                      setEditingShipment({
                        ...editingShipment,
                        origin: e.target.value,
                        portOfLoading: e.target.value
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                  >
                    {AIRPORTS_DIRECTORY.map((a) => (
                      <option key={a.code} value={a.name}>{a.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold block mb-1 text-slate-600 dark:text-slate-400">Destination Airport</label>
                  <select
                    value={editingShipment.destination}
                    onChange={(e) =>
                      setEditingShipment({
                        ...editingShipment,
                        destination: e.target.value,
                        portOfDischarge: e.target.value
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                  >
                    {AIRPORTS_DIRECTORY.map((a) => (
                      <option key={a.code} value={a.name}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold block mb-1 text-slate-600 dark:text-slate-400">Air Carrier</label>
                  <input
                    type="text"
                    value={editingShipment.vesselOrFlight}
                    onChange={(e) => setEditingShipment({ ...editingShipment, vesselOrFlight: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1 text-slate-600 dark:text-slate-400">Flight #</label>
                  <input
                    type="text"
                    value={editingShipment.voyageOrFlightNo}
                    onChange={(e) => setEditingShipment({ ...editingShipment, voyageOrFlightNo: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1 text-slate-600 dark:text-slate-400">Air Waybill #</label>
                  <input
                    type="text"
                    value={editingShipment.blOrAwbNo}
                    onChange={(e) => setEditingShipment({ ...editingShipment, blOrAwbNo: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold block mb-1 text-slate-600 dark:text-slate-400">Pieces</label>
                  <input
                    type="number"
                    value={editingShipment.pieces}
                    onChange={(e) => setEditingShipment({ ...editingShipment, pieces: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3 py-1.5 rounded-lg border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1 text-slate-600 dark:text-slate-400">Gross Weight (KG)</label>
                  <input
                    type="number"
                    value={editingShipment.weightKg}
                    onChange={(e) => setEditingShipment({ ...editingShipment, weightKg: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 rounded-lg border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1 text-slate-600 dark:text-slate-400">Chargeable Weight (KG)</label>
                  <input
                    type="number"
                    value={editingShipment.chargeableWeightKg || editingShipment.weightKg}
                    onChange={(e) => setEditingShipment({ ...editingShipment, chargeableWeightKg: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 rounded-lg border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold block mb-1 text-slate-600 dark:text-slate-400">Nature & Quantity of Goods</label>
                <input
                  type="text"
                  value={editingShipment.natureOfGoods || ''}
                  onChange={(e) => setEditingShipment({ ...editingShipment, natureOfGoods: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="pt-3 border-t dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-1.5 rounded-lg border font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">check</span>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pre-Audit File Analysis Modal */}
      {showAnalysis && current && (
        <FileAnalysisModal shipment={current} onClose={() => setShowAnalysis(false)} />
      )}
    </div>
  )
}
