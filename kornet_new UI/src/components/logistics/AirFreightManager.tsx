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
    <div className="stitch-module-surface flex-1 flex flex-col overflow-hidden font-sans relative">
      {/* Action Toolbar */}
      <div className="px-6 py-3 border-b border-white/10 bg-black/40 backdrop-blur-xl flex flex-wrap justify-between items-center gap-3 text-xs relative z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNewAwbModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-600 hover:from-indigo-400 hover:to-sky-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">add_box</span>
            New Air Waybill
          </button>
          <span className="font-extrabold text-white flex items-center gap-2 tracking-wide">
            <span className="material-symbols-outlined text-indigo-400 text-[20px]">flight_takeoff</span>
            {mode ? `${mode} Operations` : 'Air Freight Operations & IATA Airwaybills'}
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
            {filtered.length} Flights Active
          </span>
          <span className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-300 border border-sky-400/20 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            IATA e-AWB 2.0 Direct
          </span>
        </div>

        {current && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowAnalysis(true)}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">analytics</span>
              File Analysis
            </button>

            {/* Direct PDF Download */}
            <button
              onClick={handleDirectDownloadAWB}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
              title="Directly download official IATA Air Waybill PDF"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              AWB PDF
            </button>

            <button
              onClick={handlePrintAWB}
              className="px-3 py-1.5 rounded-xl border border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 font-bold text-xs flex items-center gap-1.5 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              Print AWB
            </button>

            {current.status === 'Open' ? (
              <button
                onClick={() => closeShipment(current.fileNo)}
                className="px-3 py-1.5 rounded-xl bg-indigo-500/30 hover:bg-indigo-500/40 border border-indigo-400/40 text-indigo-200 font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">lock</span>
                Close File
              </button>
            ) : current.status === 'Closed' ? (
              <button
                onClick={() => transferToBridge(current.fileNo)}
                className="px-3 py-1.5 rounded-xl bg-purple-500/30 hover:bg-purple-500/40 border border-purple-400/40 text-purple-200 font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">hub</span>
                Transfer to Bridge
              </button>
            ) : (
              <span className="px-3 py-1.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-400/30 font-black text-xs">
                Bridged to FS
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* Left Files List */}
        <div className="w-84 border-r border-white/10 bg-black/30 backdrop-blur-xl flex flex-col overflow-y-auto">
          <div className="p-3 border-b border-white/10 bg-white/[0.02] text-[11px] font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-indigo-400">airlines</span>
              {mode || 'Air'} Flights Manifest
            </span>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white font-bold">{filtered.length}</span>
          </div>

          <div className="divide-y divide-white/5">
            {filtered.map((s) => {
              const isSelected = s.fileNo === current?.fileNo
              return (
                <div
                  key={s.fileNo}
                  onClick={() => setSelectedFileNo(s.fileNo)}
                  className={`p-3.5 cursor-pointer transition-all border-l-4 relative group ${
                    isSelected
                      ? 'bg-gradient-to-r from-indigo-500/20 to-sky-500/10 border-indigo-400 shadow-lg'
                      : 'border-transparent hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-white font-mono flex items-center gap-1.5">
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />}
                      {s.fileNo}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                        s.status === 'Closed'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : s.status === 'Transferred'
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                          : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-200 truncate font-semibold">
                    {s.shipper}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                    <span className="truncate max-w-[120px]">{s.origin}</span>
                    <span className="text-sky-400 font-bold">✈</span>
                    <span className="truncate max-w-[120px] font-medium text-slate-200">{s.destination}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 font-mono pt-1.5 border-t border-white/5">
                    <span className="text-indigo-300">AWB: {s.blOrAwbNo}</span>
                    <span className="font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-400/20">
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
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-20 h-20 rounded-3xl liquid-glass-card flex items-center justify-center mb-5 border border-white/10 shadow-2xl">
              <span className="material-symbols-outlined text-4xl text-indigo-400">flight_takeoff</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              No Air Freight Shipments Staged
            </h3>
            <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
              Create a new air export or import booking to rate IATA chargeable weight, generate Master/House AWBs, and track flight routing.
            </p>
            <button
              onClick={() => setShowNewAwbModal(true)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-600 hover:from-indigo-400 hover:to-sky-500 text-white font-bold text-xs shadow-xl shadow-indigo-500/20 inline-flex items-center gap-2 active:scale-95 transition-all"
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
            <div className="liquid-glass-card p-6 rounded-2xl border border-white/10 shadow-2xl relative overflow-hidden space-y-5">
              <div className="absolute top-0 right-0 w-64 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-white/5 relative z-10">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-2xl font-black text-white font-mono tracking-tight flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                      {current.fileNo}
                    </h2>
                    <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                      {current.type}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-black uppercase bg-white/5 text-slate-300 border border-white/10 font-mono">
                      IATA Class: {current.blClass || 'MBL'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 font-mono flex items-center gap-3 flex-wrap">
                    <span>AWB: <strong className="text-cyan-400">{current.blOrAwbNo}</strong></span>
                    <span className="text-slate-600">•</span>
                    <span>Flight: <strong className="text-slate-200">{current.vesselOrFlight} {current.voyageOrFlightNo}</strong></span>
                  </p>
                </div>

                {/* Actions & Financial Badges */}
                <div className="flex items-center gap-3 text-xs flex-wrap">
                  <button
                    onClick={handleOpenEdit}
                    className="px-3.5 py-1.5 rounded-xl border border-indigo-400/30 bg-indigo-500/15 text-indigo-200 hover:bg-indigo-500/25 font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
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
                    <strong className="text-indigo-400 text-sm font-mono block">
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
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Margin</span>
                    <strong className="text-sm font-mono block">
                      PHP {profit.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({marginPct.toFixed(1)}%)
                    </strong>
                  </div>
                </div>
              </div>

              {/* Routing & Entity Details */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs relative z-10">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Shipper</span>
                  <span className="font-semibold text-slate-100 block truncate mt-0.5">{current.shipper}</span>
                  {current.shipperTin && <span className="text-[10px] text-slate-400 font-mono block mt-0.5">TIN: {current.shipperTin}</span>}
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Consignee</span>
                  <span className="font-semibold text-slate-100 block truncate mt-0.5">{current.consignee}</span>
                  {current.consigneeTin && <span className="text-[10px] text-slate-400 font-mono block mt-0.5">TIN: {current.consigneeTin}</span>}
                </div>
                <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-400/20 shadow-inner">
                  <span className="text-indigo-300 block text-[10px] uppercase font-bold flex items-center gap-1.5 tracking-wider">
                    <span className="material-symbols-outlined text-[14px]">flight_takeoff</span> Departure Hub
                  </span>
                  <span className="font-bold text-white block mt-1 truncate">{current.origin}</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-400/20 shadow-inner">
                  <span className="text-emerald-300 block text-[10px] uppercase font-bold flex items-center gap-1.5 tracking-wider">
                    <span className="material-symbols-outlined text-[14px]">flight_land</span> Destination Hub
                  </span>
                  <span className="font-bold text-white block mt-1 truncate">{current.destination}</span>
                </div>
              </div>
            </div>

            {/* Detailed Tabs Strip with visionOS glass pills */}
            <div className="flex gap-2 overflow-x-auto pb-1 border-b border-white/10">
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
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-400/40 shadow-[0_0_15px_rgba(99,102,241,0.25)]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
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
                <div className="liquid-glass-card rounded-2xl p-6 border border-white/10 shadow-xl space-y-5">
                  <h3 className="font-bold text-sm text-white tracking-wide">
                    IATA Volumetric & Chargeable Weight Specifications
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-xl text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Total Pieces</span>
                      <strong className="text-base text-white font-mono block mt-1">{current.pieces || 1} PKGS</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Actual Gross Weight</span>
                      <strong className="text-base text-white font-mono block mt-1">{(current.weightKg || 0).toLocaleString()} KG</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Chargeable Weight (IATA)</span>
                      <strong className="text-base text-cyan-400 font-mono block mt-1">
                        {(current.chargeableWeightKg || current.weightKg || 0).toLocaleString()} KG
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Total Volume</span>
                      <strong className="text-base text-white font-mono block mt-1">{(current.volumeCbm || 0).toFixed(3)} CBM</strong>
                    </div>
                  </div>

                  <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl text-xs space-y-2">
                    <span className="font-bold text-slate-400 uppercase text-[10px] block tracking-wider">Commodity & Nature of Goods</span>
                    <p className="font-semibold text-white">{current.natureOfGoods || 'General Aviation Courier Cargo'}</p>
                    <p className="text-slate-400 whitespace-pre-line font-mono text-[11px] bg-black/20 p-3 rounded-lg border border-white/5">{current.marksAndNumbers}</p>
                  </div>
                </div>

                {/* Interactive IATA Calculator */}
                <div className="liquid-glass-card rounded-2xl p-6 border border-indigo-400/20 shadow-xl space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-80 h-32 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

                  <div className="flex justify-between items-center relative z-10">
                    <div>
                      <h4 className="font-bold text-xs text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">calculate</span>
                        IATA Volumetric Cargo Calculator (6,000 cm³/kg Standard)
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Formula: [Length (cm) × Width (cm) × Height (cm) ÷ 6,000] × Pieces
                      </p>
                    </div>
                    <span className="px-3.5 py-1.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 font-mono text-xs font-bold shadow-[0_0_12px_rgba(99,102,241,0.2)]">
                      Calculated: {calcVolWeight.toFixed(2)} KG
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs relative z-10">
                    <div>
                      <label className="text-[10px] font-bold text-slate-300 block mb-1">Length (cm)</label>
                      <input
                        type="number"
                        value={dimL}
                        onChange={(e) => setDimL(Number(e.target.value))}
                        className="input-glass w-full px-3 py-2 rounded-xl font-mono font-bold text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-300 block mb-1">Width (cm)</label>
                      <input
                        type="number"
                        value={dimW}
                        onChange={(e) => setDimW(Number(e.target.value))}
                        className="input-glass w-full px-3 py-2 rounded-xl font-mono font-bold text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-300 block mb-1">Height (cm)</label>
                      <input
                        type="number"
                        value={dimH}
                        onChange={(e) => setDimH(Number(e.target.value))}
                        className="input-glass w-full px-3 py-2 rounded-xl font-mono font-bold text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-300 block mb-1">Pieces</label>
                      <input
                        type="number"
                        value={dimPcs}
                        onChange={(e) => setDimPcs(Number(e.target.value))}
                        className="input-glass w-full px-3 py-2 rounded-xl font-mono font-bold text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Billing Lines */}
            {activeTab === 'billing' && (
              <div className="liquid-glass-card rounded-2xl p-6 border border-white/10 shadow-xl space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-sm text-white tracking-wide">
                      Air Waybill Billing Lines (AR)
                    </h3>
                    <p className="text-[11px] text-slate-400">Auto-routes to FS Sales Book (fs_salebook) upon Bridge transfer</p>
                  </div>
                  <button
                    onClick={() => openNewChargeModal(current.fileNo)}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-600 hover:from-indigo-400 hover:to-sky-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 flex items-center gap-1.5 transition-all active:scale-95"
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
                        <th className="py-3 px-4">Terms</th>
                        <th className="py-3 px-4">Target FS GL Account</th>
                        <th className="py-3 px-4 text-right">Amount (PHP)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                      {current.billingLines.map((b) => (
                        <tr key={b.id} className="hover:bg-white/[0.04] transition-colors">
                          <td className="py-3 px-4 font-bold text-indigo-400">{b.code}</td>
                          <td className="py-3 px-4 font-sans font-medium text-slate-200">{b.desc}</td>
                          <td className="py-3 px-4 font-sans">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-slate-300 border border-white/10">
                              {b.prepaidOrCollect}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-400">{b.glAccount} (Air Revenue)</td>
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

            {/* Tab 3: Cost Lines */}
            {activeTab === 'costs' && (
              <div className="liquid-glass-card rounded-2xl p-6 border border-white/10 shadow-xl space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-sm text-white tracking-wide">
                      Airline Ramp & Handling Costs (AP)
                    </h3>
                    <p className="text-[11px] text-slate-400">Auto-routes to FS Purchase Book (fs_purcbook) & CDV vouchers</p>
                  </div>
                  <button
                    onClick={() => openNewChargeModal(current.fileNo)}
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
                        <th className="py-3 px-4">Airline / Vendor</th>
                        <th className="py-3 px-4">Target FS GL Account</th>
                        <th className="py-3 px-4 text-right">Amount (PHP)</th>
                        <th className="py-3 px-4 text-center">⚡ FS CDV Voucher</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                      {current.costLines.map((c) => (
                        <tr key={c.id} className="hover:bg-white/[0.04] transition-colors">
                          <td className="py-3 px-4 font-bold text-amber-400">{c.code}</td>
                          <td className="py-3 px-4 font-sans font-medium text-slate-200">{c.desc}</td>
                          <td className="py-3 px-4 font-sans font-bold text-slate-300">{c.vendor}</td>
                          <td className="py-3 px-4 text-slate-400">{c.glAccount} (Airline Cost)</td>
                          <td className="py-3 px-4 text-right font-bold text-white">
                            PHP {c.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-center">
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

            {/* Tab 4: BOC Airport Customs */}
            {activeTab === 'customs' && (
              <div className="liquid-glass-card rounded-2xl p-6 border border-white/10 shadow-xl space-y-5">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-sm text-white flex items-center gap-2 tracking-wide">
                      <span className="material-symbols-outlined text-indigo-400">verified_user</span>
                      BOC Airport Customs Clearance & Formal Entry
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Track Single Administrative Document (SAD), Customs Lane Assessment, and Airport Cargo Release
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
                      <label className="font-bold block mb-1 text-slate-300">BOC Airport SAD Entry #</label>
                      <input
                        type="text"
                        value={current.customsSadNo || ''}
                        onChange={(e) => updateShipment(current.fileNo, { customsSadNo: e.target.value })}
                        placeholder="e.g. SAD-2026-CRK-00421"
                        className="input-glass w-full px-3 py-2 rounded-xl text-white font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="font-bold block mb-1 text-slate-300">Customs Assessment Lane</label>
                      <select
                        value={current.customsLane || 'Green'}
                        onChange={(e) => updateShipment(current.fileNo, { customsLane: e.target.value as any })}
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
                        value={current.customsDutiesAmount || ''}
                        onChange={(e) => updateShipment(current.fileNo, { customsDutiesAmount: parseFloat(e.target.value) || 0 })}
                        placeholder="e.g. 35000"
                        className="input-glass w-full px-3 py-2 rounded-xl text-emerald-400 font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="font-bold block mb-1 text-slate-300">Customs Broker</label>
                      <input
                        type="text"
                        value={current.customsBrokerName || ''}
                        onChange={(e) => updateShipment(current.fileNo, { customsBrokerName: e.target.value })}
                        placeholder="e.g. Michael Tan, LCB"
                        className="input-glass w-full px-3 py-2 rounded-xl text-white"
                      />
                    </div>
                    <div>
                      <label className="font-bold block mb-1 text-slate-300">PRC License #</label>
                      <input
                        type="text"
                        value={current.customsBrokerLicense || ''}
                        onChange={(e) => updateShipment(current.fileNo, { customsBrokerLicense: e.target.value })}
                        placeholder="e.g. PRC-LCB-004419"
                        className="input-glass w-full px-3 py-2 rounded-xl text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-bold block mb-1 text-slate-300">Air Delivery Order (DO) Status</label>
                      <select
                        value={current.deliveryOrderStatus || 'Pending'}
                        onChange={(e) => updateShipment(current.fileNo, { deliveryOrderStatus: e.target.value as any })}
                        className="input-glass w-full px-3 py-2 rounded-xl text-white font-bold bg-slate-900"
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
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-600 hover:from-indigo-400 hover:to-sky-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition-all active:scale-95"
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
              <div className="liquid-glass-card rounded-2xl p-6 border border-white/10 shadow-xl space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-sm text-white tracking-wide">
                      Air Cargo Flight Manifest Summary
                    </h3>
                    <p className="text-[11px] text-slate-400">Official airline and airport ramp dispatch record</p>
                  </div>
                  <button
                    onClick={handleDirectDownloadManifest}
                    className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">download</span>
                    Download Manifest PDF
                  </button>
                </div>

                <div className="p-5 rounded-xl bg-black/20 border border-white/10 text-xs space-y-3 font-mono">
                  <div className="flex justify-between border-b pb-3 border-white/10">
                    <span className="text-white font-bold">Flight: <span className="text-sky-400">{current.vesselOrFlight} {current.voyageOrFlightNo}</span></span>
                    <span className="text-white font-bold">AWB: <span className="text-cyan-400">{current.blOrAwbNo}</span></span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-[11px]">
                    <div>Shipper: <span className="text-slate-200">{current.shipper}</span></div>
                    <div>Consignee: <span className="text-slate-200">{current.consignee}</span></div>
                    <div>Origin: <span className="text-slate-200">{current.origin}</span></div>
                    <div>Destination: <span className="text-slate-200">{current.destination}</span></div>
                    <div>Packages: <span className="text-slate-200">{current.pieces} PKGS</span></div>
                    <div>Chargeable Weight: <span className="text-cyan-400 font-bold">{current.chargeableWeightKg || current.weightKg} KG</span></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {/* NEW AIR WAYBILL MODAL */}
      {isNewAwbOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="liquid-glass-card rounded-2xl w-full max-w-3xl shadow-2xl border border-white/10 overflow-hidden flex flex-col max-h-[90vh] relative">
            <div className="absolute top-0 right-0 w-80 h-32 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-white/[0.03] relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center font-black shadow-lg shadow-indigo-500/10">
                  <span className="material-symbols-outlined text-[20px]">flight_takeoff</span>
                </div>
                <div>
                  <h3 className="font-bold text-base text-white tracking-wide">
                    New Air Waybill & IATA Chargeable Weight Rating
                  </h3>
                  <p className="text-xs text-slate-400">
                    IATA Volumetric Rating (6000 cm³/kg) &bull; Standard Air Waybill Form 079
                  </p>
                </div>
              </div>
              <button onClick={handleCloseNewAwb} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveNewAwb} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs relative z-10">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold block mb-1 text-slate-300">File Reference #</label>
                  <input
                    type="text"
                    value={newAwb.fileNo}
                    onChange={(e) => setNewAwb({ ...newAwb, fileNo: e.target.value })}
                    placeholder={`KE-${mode === 'Air Import' ? 'AI' : 'AE'}-2026-AUTO`}
                    className="input-glass w-full px-3 py-2 rounded-xl font-mono font-bold text-indigo-400"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1 text-slate-300">Booking Ref #</label>
                  <input
                    type="text"
                    value={newAwb.bookingNo}
                    onChange={(e) => setNewAwb({ ...newAwb, bookingNo: e.target.value })}
                    placeholder="AWB-BKG-88124"
                    className="input-glass w-full px-3 py-2 rounded-xl font-mono text-white"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1 text-slate-300">Air Waybill (AWB) #</label>
                  <input
                    type="text"
                    value={newAwb.awbNo}
                    onChange={(e) => setNewAwb({ ...newAwb, awbNo: e.target.value })}
                    placeholder="079-99482110"
                    className="input-glass w-full px-3 py-2 rounded-xl font-mono font-bold text-cyan-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold block mb-1 text-slate-300">Operation Mode</label>
                  <select
                    value={newAwb.mode}
                    onChange={(e) => setNewAwb({ ...newAwb, mode: e.target.value as 'Air Export' | 'Air Import' })}
                    className="input-glass w-full px-3 py-2 rounded-xl font-bold bg-slate-900 text-white"
                  >
                    <option value="Air Export">Air Export</option>
                    <option value="Air Import">Air Import</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold block mb-1 text-slate-300">Air Carrier</label>
                  <select
                    value={newAwb.airline}
                    onChange={(e) => setNewAwb({ ...newAwb, airline: e.target.value })}
                    className="input-glass w-full px-3 py-2 rounded-xl font-medium bg-slate-900 text-white"
                  >
                    {AIR_CARRIERS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold block mb-1 text-slate-300">Flight #</label>
                  <input
                    type="text"
                    value={newAwb.flightNo}
                    onChange={(e) => setNewAwb({ ...newAwb, flightNo: e.target.value })}
                    placeholder="PR-102"
                    className="input-glass w-full px-3 py-2 rounded-xl font-mono text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1 text-slate-300">Shipper / Exporter</label>
                  <input
                    type="text"
                    value={newAwb.shipper}
                    onChange={(e) => setNewAwb({ ...newAwb, shipper: e.target.value })}
                    placeholder="e.g. Clark Semi-Conductor Assembly"
                    className="input-glass w-full px-3 py-2 rounded-xl text-white"
                  />
                  <input
                    type="text"
                    value={newAwb.shipperTin}
                    onChange={(e) => setNewAwb({ ...newAwb, shipperTin: e.target.value })}
                    placeholder="Shipper TIN"
                    className="input-glass w-full mt-2 px-3 py-1.5 rounded-lg text-[11px] font-mono text-slate-300"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1 text-slate-300">Consignee / Importer</label>
                  <input
                    type="text"
                    value={newAwb.consignee}
                    onChange={(e) => setNewAwb({ ...newAwb, consignee: e.target.value })}
                    placeholder="e.g. Silicon Valley Microelectronics"
                    className="input-glass w-full px-3 py-2 rounded-xl text-white"
                  />
                  <input
                    type="text"
                    value={newAwb.consigneeTin}
                    onChange={(e) => setNewAwb({ ...newAwb, consigneeTin: e.target.value })}
                    placeholder="Consignee TIN / Tax ID"
                    className="input-glass w-full mt-2 px-3 py-1.5 rounded-lg text-[11px] font-mono text-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1 text-slate-300">Departure Airport</label>
                  <select
                    value={newAwb.origin}
                    onChange={(e) => setNewAwb({ ...newAwb, origin: e.target.value })}
                    className="input-glass w-full px-3 py-2 rounded-xl font-medium bg-slate-900 text-white"
                  >
                    {AIRPORTS_DIRECTORY.map((a) => (
                      <option key={a.code} value={a.name}>{a.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold block mb-1 text-slate-300">Destination Airport</label>
                  <select
                    value={newAwb.destination}
                    onChange={(e) => setNewAwb({ ...newAwb, destination: e.target.value })}
                    className="input-glass w-full px-3 py-2 rounded-xl font-medium bg-slate-900 text-white"
                  >
                    {AIRPORTS_DIRECTORY.map((a) => (
                      <option key={a.code} value={a.name}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dimensions & Rating Box */}
              <div className="p-4 rounded-xl border border-indigo-400/20 bg-indigo-500/10 space-y-3">
                <span className="font-black text-xs text-indigo-300 uppercase tracking-wider block">
                  IATA Volumetric Chargeable Weight Rating
                </span>

                <div className="grid grid-cols-5 gap-2">
                  <div>
                    <label className="text-[10px] font-bold block mb-1 text-slate-400">Pieces</label>
                    <input
                      type="text"
                      value={newAwb.pieces}
                      onChange={(e) => setNewAwb({ ...newAwb, pieces: e.target.value })}
                      placeholder="1"
                      className="input-glass w-full px-2.5 py-1.5 rounded-xl font-mono font-bold text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold block mb-1 text-slate-400">L (cm)</label>
                    <input
                      type="text"
                      value={newAwb.dimLengthCm}
                      onChange={(e) => setNewAwb({ ...newAwb, dimLengthCm: e.target.value })}
                      placeholder="60"
                      className="input-glass w-full px-2.5 py-1.5 rounded-xl font-mono font-bold text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold block mb-1 text-slate-400">W (cm)</label>
                    <input
                      type="text"
                      value={newAwb.dimWidthCm}
                      onChange={(e) => setNewAwb({ ...newAwb, dimWidthCm: e.target.value })}
                      placeholder="40"
                      className="input-glass w-full px-2.5 py-1.5 rounded-xl font-mono font-bold text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold block mb-1 text-slate-400">H (cm)</label>
                    <input
                      type="text"
                      value={newAwb.dimHeightCm}
                      onChange={(e) => setNewAwb({ ...newAwb, dimHeightCm: e.target.value })}
                      placeholder="40"
                      className="input-glass w-full px-2.5 py-1.5 rounded-xl font-mono font-bold text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold block mb-1 text-slate-400">Actual Gross (KG)</label>
                    <input
                      type="text"
                      value={newAwb.grossWeightKg}
                      onChange={(e) => setNewAwb({ ...newAwb, grossWeightKg: e.target.value })}
                      placeholder="e.g. 15"
                      className="input-glass w-full px-2.5 py-1.5 rounded-xl font-mono font-bold text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[10px] font-bold block mb-1 text-slate-400">Air Freight Rate per KG (PHP)</label>
                    <input
                      type="text"
                      value={newAwb.ratePerKg}
                      onChange={(e) => setNewAwb({ ...newAwb, ratePerKg: e.target.value })}
                      placeholder="e.g. 350"
                      className="input-glass w-full px-3 py-2 rounded-xl font-mono font-bold text-emerald-400"
                    />
                  </div>
                  <div className="p-3 rounded-xl bg-black/20 border border-white/10 flex flex-col justify-center">
                    <div className="text-[10px] text-slate-400">Volumetric Weight: {calcVolKg.toFixed(2)} KG</div>
                    <div className="text-xs font-bold text-indigo-300">
                      Chargeable: {chargeableWeight.toFixed(2)} KG ({parsedGrossKg >= calcVolKg ? 'Actual' : 'Volumetric'})
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-indigo-400/20 text-xs">
                  <div>
                    Base Freight: <strong className="font-mono text-cyan-300">PHP {airFreightTotal.toLocaleString()}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400">Total Air Freight + {Math.round(effectiveVatRate * 100)}% VAT:</span>
                    <strong className="ml-2 font-mono text-sm text-emerald-400">
                      PHP {(airFreightTotal + airVat.vat).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseNewAwb}
                  className="px-4 py-2 rounded-xl border border-white/10 font-bold text-slate-300 hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-600 hover:from-indigo-400 hover:to-sky-500 text-white font-bold shadow-lg shadow-indigo-500/25 flex items-center gap-1.5 active:scale-95 transition-all"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="liquid-glass-card rounded-2xl w-full max-w-3xl shadow-2xl border border-white/10 overflow-hidden flex flex-col max-h-[90vh] relative">
            <div className="absolute top-0 right-0 w-80 h-32 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-white/[0.03] relative z-10">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-400 text-[20px]">edit_document</span>
                <h3 className="font-bold text-base text-white tracking-wide">
                  Edit Air Shipment File: {editingShipment.fileNo}
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
                  <label className="font-bold block mb-1 text-slate-300">Departure Airport</label>
                  <select
                    value={editingShipment.origin}
                    onChange={(e) =>
                      setEditingShipment({
                        ...editingShipment,
                        origin: e.target.value,
                        portOfLoading: e.target.value
                      })
                    }
                    className="input-glass w-full px-3 py-2 rounded-xl bg-slate-900 text-white"
                  >
                    {AIRPORTS_DIRECTORY.map((a) => (
                      <option key={a.code} value={a.name}>{a.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold block mb-1 text-slate-300">Destination Airport</label>
                  <select
                    value={editingShipment.destination}
                    onChange={(e) =>
                      setEditingShipment({
                        ...editingShipment,
                        destination: e.target.value,
                        portOfDischarge: e.target.value
                      })
                    }
                    className="input-glass w-full px-3 py-2 rounded-xl bg-slate-900 text-white"
                  >
                    {AIRPORTS_DIRECTORY.map((a) => (
                      <option key={a.code} value={a.name}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold block mb-1 text-slate-300">Air Carrier</label>
                  <input
                    type="text"
                    value={editingShipment.vesselOrFlight}
                    onChange={(e) => setEditingShipment({ ...editingShipment, vesselOrFlight: e.target.value })}
                    className="input-glass w-full px-3 py-2 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1 text-slate-300">Flight #</label>
                  <input
                    type="text"
                    value={editingShipment.voyageOrFlightNo}
                    onChange={(e) => setEditingShipment({ ...editingShipment, voyageOrFlightNo: e.target.value })}
                    className="input-glass w-full px-3 py-2 rounded-xl font-mono text-white"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1 text-slate-300">Air Waybill #</label>
                  <input
                    type="text"
                    value={editingShipment.blOrAwbNo}
                    onChange={(e) => setEditingShipment({ ...editingShipment, blOrAwbNo: e.target.value })}
                    className="input-glass w-full px-3 py-2 rounded-xl font-mono font-bold text-cyan-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold block mb-1 text-slate-300">Pieces</label>
                  <input
                    type="number"
                    value={editingShipment.pieces}
                    onChange={(e) => setEditingShipment({ ...editingShipment, pieces: parseInt(e.target.value, 10) || 1 })}
                    className="input-glass w-full px-3 py-2 rounded-xl font-mono text-white"
                  />
                </div>
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
                  <label className="font-bold block mb-1 text-slate-300">Chargeable Weight (KG)</label>
                  <input
                    type="number"
                    value={editingShipment.chargeableWeightKg || editingShipment.weightKg}
                    onChange={(e) => setEditingShipment({ ...editingShipment, chargeableWeightKg: parseFloat(e.target.value) || 0 })}
                    className="input-glass w-full px-3 py-2 rounded-xl font-mono font-bold text-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold block mb-1 text-slate-300">Nature & Quantity of Goods</label>
                <input
                  type="text"
                  value={editingShipment.natureOfGoods || ''}
                  onChange={(e) => setEditingShipment({ ...editingShipment, natureOfGoods: e.target.value })}
                  className="input-glass w-full px-3 py-2 rounded-xl text-white"
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
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-600 hover:from-indigo-400 hover:to-sky-500 text-white font-bold shadow-lg shadow-indigo-500/25 flex items-center gap-1.5 active:scale-95 transition-all"
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
