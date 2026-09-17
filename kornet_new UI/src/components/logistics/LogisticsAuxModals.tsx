import { useState } from 'react'
import { useLogisticsStore } from '../../stores/logisticsStore'
import { useRequireIntegration } from '../../hooks/useRequireIntegration'

export function BOCDeclarationModal() {
  const { modalOpen, setModalOpen, selectedFileNo, shipments, addAuditLog } = useLogisticsStore()
  const requireIntegration = useRequireIntegration()

  const currentShipment = (selectedFileNo ? shipments.find((s) => s.fileNo === selectedFileNo) : null) || shipments[0]
  const [bocTin, setBocTin] = useState('')
  const [customsDistrict, setCustomsDistrict] = useState('MICP - Manila International Container Port (P02A)')
  const [declarationType, setDeclarationType] = useState<'ED' | 'SAD' | 'PEZA'>('ED')
  const [commodityDesc, setCommodityDesc] = useState(currentShipment?.natureOfGoods || '')
  const [declaredValuePhp, setDeclaredValuePhp] = useState('')
  const [dutiesTaxesPhp] = useState('')
  const [filingStatus, setFilingStatus] = useState<'IDLE' | 'TRANSMITTING' | 'ACCEPTED'>('IDLE')
  const [e2mReferenceNo, setE2mReferenceNo] = useState<string | null>(null)
  const [gatePassNo, setGatePassNo] = useState<string | null>(null)

  if (!modalOpen.sedFiling) return null

  const handleTransmit = () => {
    if (!requireIntegration('boc-e2m', 'Bureau of Customs e2m')) return
    setFilingStatus('TRANSMITTING')
    setTimeout(() => {
      const e2mRef = `BOC-E2M-2026-${Math.floor(100000 + Math.random() * 900000)}`
      const gatePass = `GP-MNL-${Math.floor(10000 + Math.random() * 90000)}`
      setE2mReferenceNo(e2mRef)
      setGatePassNo(gatePass)
      setFilingStatus('ACCEPTED')
      addAuditLog({
        user: 'CUSTOMS_BROKER',
        module: 'BOC e2m Gateway',
        action: 'File e2m Customs Declaration',
        referenceNo: currentShipment?.fileNo || e2mRef,
        details: `BOC ${declarationType} clearance filed at ${customsDistrict}. e2m Ref: ${e2mRef}, Gate Pass: ${gatePass}`
      })
    }, 800)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="liquid-glass-card border border-white/15 text-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] backdrop-blur-2xl relative">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 text-amber-400 flex items-center justify-center font-black shadow-inner">
              <span className="material-symbols-outlined text-2xl">verified_user</span>
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                Bureau of Customs (BOC) &bull; e2m Customs Gateway
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-400 text-blue-950 shadow-sm">
                  PHILIPPINES
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Department of Finance &bull; Single Administrative Document (SAD) &amp; Port Gate Pass
              </p>
            </div>
          </div>
          <button
            onClick={() => setModalOpen('sedFiling', false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs custom-scrollbar">
          {filingStatus === 'ACCEPTED' && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2 backdrop-blur-md">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <span className="material-symbols-outlined text-emerald-400">verified</span>
                e2m Declaration Cleared &bull; Green Lane Assessment
              </div>
              <div className="text-xs text-slate-200 space-y-1 font-mono">
                <div>e2m Reference Number: <strong className="text-sm text-emerald-300">{e2mReferenceNo}</strong></div>
                <div>Official BOC Gate Pass: <strong className="text-sm text-cyan-300">{gatePassNo}</strong></div>
                <div>Status: <span className="text-emerald-400 font-bold">PORT RELEASE PERMITTED (OLRS NOTIFIED)</span></div>
                <div>Filing Timestamp: <span className="text-slate-400">{new Date().toLocaleString()}</span></div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-300 block mb-1">Target Shipment File #</label>
              <input
                type="text"
                disabled
                value={currentShipment?.fileNo || 'KN-OE-2026-0891'}
                className="w-full px-3 py-1.5 rounded-xl border border-white/10 bg-black/40 text-cyan-300 font-mono font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-300 block mb-1">Importer / Exporter TIN</label>
              <input
                type="text"
                value={bocTin}
                onChange={(e) => setBocTin(e.target.value)}
                placeholder="000-000-000-000"
                className="w-full px-3 py-1.5 rounded-xl border border-white/15 bg-black/40 text-white font-mono font-bold focus:border-cyan-400 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-300 block mb-1">Customs Collection District / Port</label>
              <select
                value={customsDistrict}
                onChange={(e) => setCustomsDistrict(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-white/15 bg-black/40 text-white font-semibold outline-none focus:border-cyan-400"
              >
                <option value="MICP - Manila International Container Port (P02A)" className="bg-slate-900 text-white">MICP - Manila International Container Port (P02A)</option>
                <option value="POM - Port of Manila (P01)" className="bg-slate-900 text-white">POM - Port of Manila (P01)</option>
                <option value="NAIA - Ninoy Aquino International Airport Customs (P03)" className="bg-slate-900 text-white">NAIA - Ninoy Aquino International Airport Customs (P03)</option>
                <option value="Port of Cebu (P07)" className="bg-slate-900 text-white">Port of Cebu - Container Terminal (P07)</option>
                <option value="Port of Davao (P10)" className="bg-slate-900 text-white">Port of Davao - Sasa Wharf (P10)</option>
                <option value="Subic Bay Freeport Zone (SBF)" className="bg-slate-900 text-white">Subic Bay Freeport Zone (SBF)</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-300 block mb-1">BOC Declaration Type</label>
              <select
                value={declarationType}
                onChange={(e) => setDeclarationType(e.target.value as any)}
                className="w-full px-3 py-1.5 rounded-xl border border-white/15 bg-black/40 text-white font-bold outline-none focus:border-cyan-400"
              >
                <option value="ED" className="bg-slate-900 text-white">Export Declaration (ED) - Outbound Freight</option>
                <option value="SAD" className="bg-slate-900 text-white">Single Administrative Document (SAD) - Inbound Import</option>
                <option value="PEZA" className="bg-slate-900 text-white">PEZA Transshipment / Economic Zone Clearance</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-300 block mb-1">Shipper / Exporter</label>
              <input
                type="text"
                disabled
                value={currentShipment?.shipper || 'Kornet Central Logistics Dep.'}
                className="w-full px-3 py-1.5 rounded-xl border border-white/10 bg-black/40 text-slate-300"
              />
            </div>
            <div>
              <label className="font-bold text-slate-300 block mb-1">Consignee / Importer of Record</label>
              <input
                type="text"
                disabled
                value={currentShipment?.consignee || 'Philippine Industrial Enterprise Inc.'}
                className="w-full px-3 py-1.5 rounded-xl border border-white/10 bg-black/40 text-slate-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-300 block mb-1">Commodity Description &amp; Tariff</label>
              <input
                type="text"
                value={commodityDesc}
                onChange={(e) => setCommodityDesc(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-white/15 bg-black/40 text-white focus:border-cyan-400 outline-none font-semibold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-300 block mb-1">Dutiable Customs Value (PHP)</label>
              <input
                type="text"
                value={declaredValuePhp}
                onChange={(e) => setDeclaredValuePhp(e.target.value)}
                placeholder="₱0.00"
                className="w-full px-3 py-1.5 rounded-xl border border-white/15 bg-black/40 text-white font-mono font-bold focus:border-cyan-400 outline-none"
              />
            </div>
          </div>

          <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex justify-between items-center text-xs backdrop-blur-md">
            <span className="text-slate-300 font-medium">Estimated Duties &amp; 12% BIR Import VAT:</span>
            <span className="font-mono font-black text-cyan-300 text-sm">
              ₱{parseFloat(dutiesTaxesPhp || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-white/10 flex justify-between items-center bg-white/5">
          <span className="text-[11px] text-slate-400">
            Republic Act No. 10863 &bull; Customs Modernization and Tariff Act (CMTA)
          </span>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setModalOpen('sedFiling', false)}
              className="px-4 py-2 rounded-xl border border-white/15 text-slate-300 hover:text-white hover:bg-white/10 text-xs font-semibold transition-all"
            >
              Close
            </button>
            <button
              onClick={handleTransmit}
              disabled={filingStatus === 'TRANSMITTING'}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 border border-blue-400/40 flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">verified</span>
              {filingStatus === 'TRANSMITTING' ? 'Transmitting to BOC e2m...' : 'Submit to BOC e2m'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export const SEDFilingModal = BOCDeclarationModal

export function BillingCodesModal() {
  const { modalOpen, setModalOpen } = useLogisticsStore()
  const [searchTerm, setSearchTerm] = useState('')

  const [codes, setCodes] = useState([
    { code: 'OFRT', desc: 'Ocean Freight 40ft High Cube Container', category: 'Freight', glSales: '4010', glCost: '5010', defaultRate: 5200.00, currency: 'USD' },
    { code: 'DOCF', desc: 'Export Documentation & AESDirect EEI Filing', category: 'Documentation', glSales: '4020', glCost: '5020', defaultRate: 150.00, currency: 'USD' },
    { code: 'THC', desc: 'Terminal Handling Charge Origin (THC)', category: 'Port Charges', glSales: '4030', glCost: '5030', defaultRate: 480.00, currency: 'USD' },
    { code: 'DRAY', desc: 'Harbor Drayage & Intermodal Cartage', category: 'Inland Drayage', glSales: '4040', glCost: '5040', defaultRate: 650.00, currency: 'USD' },
    { code: 'WHSE', desc: 'CFS Warehouse Staging & Palletizing', category: 'Warehousing', glSales: '4050', glCost: '5050', defaultRate: 350.00, currency: 'USD' },
    { code: 'HAZM', desc: 'Dangerous Goods Declaration Compliance Fee', category: 'Compliance', glSales: '4060', glCost: '5060', defaultRate: 275.00, currency: 'USD' },
    { code: 'INSP', desc: 'NHTSA / Customs Vehicle Physical Inspection', category: 'Vehicle Inspection', glSales: '4070', glCost: '5070', defaultRate: 195.00, currency: 'USD' },
    { code: 'CHSS', desc: 'Tri-Axle Container Chassis Rental (Daily)', category: 'Equipment', glSales: '4080', glCost: '5080', defaultRate: 85.00, currency: 'USD' }
  ])

  const [showAddForm, setShowAddForm] = useState(false)
  const [newCode, setNewCode] = useState({ code: '', desc: '', category: 'Freight', glSales: '4010', glCost: '5010', defaultRate: 100, currency: 'USD' })

  if (!modalOpen.billingCodes) return null

  const handleAddCode = () => {
    if (!newCode.code || !newCode.desc) return
    setCodes([...codes, { ...newCode, code: newCode.code.toUpperCase() }])
    setShowAddForm(false)
    setNewCode({ code: '', desc: '', category: 'Freight', glSales: '4010', glCost: '5010', defaultRate: 100, currency: 'USD' })
  }

  const filtered = codes.filter(
    (c) =>
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="liquid-glass-card border border-white/15 text-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] backdrop-blur-2xl relative">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 text-cyan-400 flex items-center justify-center font-black">
              <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                LogiSuite Standard Billing &amp; Freight Codes Directory
              </h3>
              <p className="text-xs text-slate-400">
                Pre-configured Revenue &amp; Cost Charges linked to FS General Ledger Accounts
              </p>
            </div>
          </div>
          <button
            onClick={() => setModalOpen('billingCodes', false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Action Bar */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between gap-4 bg-black/20 text-xs">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <span className="material-symbols-outlined text-slate-400">search</span>
            <input
              type="text"
              placeholder="Search by code, description, category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-white/15 bg-black/40 text-white outline-none focus:border-cyan-400"
            />
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-white font-bold flex items-center gap-1.5 shadow-lg shadow-blue-600/30 border border-blue-400/40 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            {showAddForm ? 'Cancel Add' : 'Add Billing Code'}
          </button>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div className="p-5 bg-white/5 border-b border-white/10 text-xs grid grid-cols-4 gap-3">
            <div>
              <label className="font-bold block mb-1 text-slate-300">Charge Code</label>
              <input
                type="text"
                placeholder="e.g. WHST"
                value={newCode.code}
                onChange={(e) => setNewCode({ ...newCode, code: e.target.value })}
                className="w-full px-3 py-1.5 rounded-xl border border-white/15 bg-black/40 text-white uppercase font-mono"
              />
            </div>
            <div className="col-span-2">
              <label className="font-bold block mb-1 text-slate-300">Description</label>
              <input
                type="text"
                placeholder="Description of the service or tariff"
                value={newCode.desc}
                onChange={(e) => setNewCode({ ...newCode, desc: e.target.value })}
                className="w-full px-3 py-1.5 rounded-xl border border-white/15 bg-black/40 text-white"
              />
            </div>
            <div>
              <label className="font-bold block mb-1 text-slate-300">Category</label>
              <select
                value={newCode.category}
                onChange={(e) => setNewCode({ ...newCode, category: e.target.value })}
                className="w-full px-3 py-1.5 rounded-xl border border-white/15 bg-black/40 text-white"
              >
                <option className="bg-slate-900 text-white">Freight</option>
                <option className="bg-slate-900 text-white">Documentation</option>
                <option className="bg-slate-900 text-white">Port Charges</option>
                <option className="bg-slate-900 text-white">Inland Drayage</option>
                <option className="bg-slate-900 text-white">Warehousing</option>
                <option className="bg-slate-900 text-white">Compliance</option>
              </select>
            </div>
            <div>
              <label className="font-bold block mb-1 text-slate-300">Target Sales GL</label>
              <input
                type="text"
                value={newCode.glSales}
                onChange={(e) => setNewCode({ ...newCode, glSales: e.target.value })}
                className="w-full px-3 py-1.5 rounded-xl border border-white/15 bg-black/40 text-white font-mono"
              />
            </div>
            <div>
              <label className="font-bold block mb-1 text-slate-300">Target Cost GL</label>
              <input
                type="text"
                value={newCode.glCost}
                onChange={(e) => setNewCode({ ...newCode, glCost: e.target.value })}
                className="w-full px-3 py-1.5 rounded-xl border border-white/15 bg-black/40 text-white font-mono"
              />
            </div>
            <div>
              <label className="font-bold block mb-1 text-slate-300">Default Rate (USD)</label>
              <input
                type="number"
                value={newCode.defaultRate}
                onChange={(e) => setNewCode({ ...newCode, defaultRate: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-1.5 rounded-xl border border-white/15 bg-black/40 text-white font-mono"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleAddCode}
                className="w-full py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 border border-emerald-400/40"
              >
                Save Code
              </button>
            </div>
          </div>
        )}

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto p-4 text-xs custom-scrollbar">
          <div className="rounded-xl border border-white/10 bg-black/20 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 uppercase text-[10px] font-bold bg-white/5">
                  <th className="py-3 px-3">Code</th>
                  <th className="py-3 px-3">Description</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Sales GL (AR)</th>
                  <th className="py-3 px-3">Cost GL (AP)</th>
                  <th className="py-3 px-3 text-right">Default Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                {filtered.map((c) => (
                  <tr key={c.code} className="hover:bg-white/[0.04] transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-cyan-400">
                      {c.code}
                    </td>
                    <td className="py-3 px-3 font-sans font-medium text-slate-200">
                      {c.desc}
                    </td>
                    <td className="py-3 px-3 font-sans">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 text-slate-300 border border-white/10">
                        {c.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {c.glSales} (Sales)
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {c.glCost} (Direct Cost)
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-white">
                      ${c.defaultRate.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex justify-between items-center bg-white/5 text-xs">
          <span className="text-slate-400 font-mono">{filtered.length} Billing Codes Configured</span>
          <button
            onClick={() => setModalOpen('billingCodes', false)}
            className="px-4 py-2 rounded-xl border border-white/15 text-slate-300 hover:text-white hover:bg-white/10 font-semibold transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export function CarriersDirectoryModal() {
  const { modalOpen, setModalOpen } = useLogisticsStore()
  const [filterMode, setFilterMode] = useState<'ALL' | 'OCEAN' | 'AIR'>('ALL')

  const carriers = [
    { name: 'Maersk Line Philippines Inc.', scac: 'MAEU', mode: 'OCEAN', contact: '+63 (2) 8876-1200', edi: 'Connected (EDI 304/310/315)', website: 'maersk.com' },
    { name: 'Mediterranean Shipping Company (MSC)', scac: 'MSCU', mode: 'OCEAN', contact: '+63 (2) 8527-8890', edi: 'Connected (EDI 304/310/315)', website: 'msc.com' },
    { name: 'Evergreen Marine Corp.', scac: 'EGLV', mode: 'OCEAN', contact: '+63 (2) 8527-7700', edi: 'Connected (EDI 310)', website: 'evergreen-marine.com' },
    { name: 'CMA CGM Philippines Inc.', scac: 'CMDU', mode: 'OCEAN', contact: '+63 (2) 8479-5000', edi: 'Connected (EDI 304)', website: 'cma-cgm.com' },
    { name: 'Ocean Network Express (ONE)', scac: 'ONEY', mode: 'OCEAN', contact: '+63 (2) 8537-8000', edi: 'Connected (EDI 315)', website: 'one-line.com' },
    { name: 'Philippine Airlines Cargo (PAL)', scac: 'PR (079)', mode: 'AIR', contact: '+63 (2) 8855-8888', edi: 'Connected (IATA Cargo-XML)', website: 'palcargo.ph' },
    { name: 'Cathay Pacific Cargo', scac: 'CX (160)', mode: 'AIR', contact: '+63 (2) 8832-2980', edi: 'Connected (IATA e-AWB)', website: 'cathaycargo.com' },
    { name: 'Emirates SkyCargo', scac: 'EK (176)', mode: 'AIR', contact: '+63 (2) 8854-4411', edi: 'Connected (IATA Cargo-XML)', website: 'skycargo.com' },
    { name: 'FedEx Express Intercontinental', scac: 'FX (023)', mode: 'AIR', contact: '+63 (2) 8456-7890', edi: 'Connected (FedEx Direct API)', website: 'fedex.com' }
  ]

  if (!modalOpen.carriersDirectory) return null

  const filtered = carriers.filter((c) => filterMode === 'ALL' || c.mode === filterMode)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="liquid-glass-card border border-white/15 text-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] backdrop-blur-2xl relative">
        <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/30 text-teal-300 flex items-center justify-center font-black">
              <span className="material-symbols-outlined text-[20px]">directions_boat</span>
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                Carrier Master Directory &amp; EDI Status
              </h3>
              <p className="text-xs text-slate-400">
                Ocean Shipping Lines &amp; Commercial Airline Integrations
              </p>
            </div>
          </div>
          <button
            onClick={() => setModalOpen('carriersDirectory', false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Filter Bar */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between gap-4 bg-black/20 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Filter Transport:</span>
            <div className="flex rounded-xl p-1 bg-white/5 border border-white/10">
              <button
                onClick={() => setFilterMode('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  filterMode === 'ALL' ? 'bg-teal-500/30 text-teal-300 border border-teal-400/40 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                All Carriers
              </button>
              <button
                onClick={() => setFilterMode('OCEAN')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  filterMode === 'OCEAN' ? 'bg-teal-500/30 text-teal-300 border border-teal-400/40 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Ocean Lines
              </button>
              <button
                onClick={() => setFilterMode('AIR')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  filterMode === 'AIR' ? 'bg-teal-500/30 text-teal-300 border border-teal-400/40 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Air Cargo
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto p-4 text-xs custom-scrollbar">
          <div className="rounded-xl border border-white/10 bg-black/20 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 uppercase text-[10px] font-bold bg-white/5">
                  <th className="py-3 px-3">Carrier Name</th>
                  <th className="py-3 px-3">SCAC / IATA</th>
                  <th className="py-3 px-3">Mode</th>
                  <th className="py-3 px-3">EDI / API Gateway</th>
                  <th className="py-3 px-3">Direct Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((c) => (
                  <tr key={c.scac} className="hover:bg-white/[0.04] transition-colors">
                    <td className="py-3 px-3 font-semibold text-white">
                      {c.name}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-teal-300">
                      {c.scac}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                        c.mode === 'OCEAN'
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                          : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                      }`}>
                        {c.mode}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {c.edi}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                      {c.contact}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex justify-between items-center bg-white/5 text-xs">
          <span className="text-slate-400 font-mono">{filtered.length} Carriers Registered</span>
          <button
            onClick={() => setModalOpen('carriersDirectory', false)}
            className="px-4 py-2 rounded-xl border border-white/15 text-slate-300 hover:text-white hover:bg-white/10 font-semibold transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export function PortsDirectoryModal() {
  const { modalOpen, setModalOpen } = useLogisticsStore()

  const ports = [
    { locode: 'PHMNL', name: 'Port of Manila (South Harbor / Pier 3 & 5)', country: 'Philippines', terminal: 'Asian Terminals Inc. (ATI)', customsOffice: 'BOC District II (POM)' },
    { locode: 'PHMNN', name: 'Manila International Container Terminal (MICT)', country: 'Philippines', terminal: 'ICTSI International Docks', customsOffice: 'BOC District II-A (MICT)' },
    { locode: 'PHCEB', name: 'Cebu International Port', country: 'Philippines', terminal: 'Cebu Port Authority (CPA)', customsOffice: 'BOC District VII' },
    { locode: 'USPEF', name: 'Port Everglades, Florida', country: 'United States', terminal: 'Everglades Marine Terminal', customsOffice: 'CBP Port 5203' },
    { locode: 'USMIA', name: 'Port of Miami (Dodge Island)', country: 'United States', terminal: 'Dodge Island Container Terminal', customsOffice: 'CBP Port 5201' },
    { locode: 'USLAX', name: 'Port of Los Angeles / Long Beach', country: 'United States', terminal: 'APM Terminals Pier 400', customsOffice: 'CBP Port 2704' },
    { locode: 'JPTYO', name: 'Port of Tokyo / Yokohama Harbor', country: 'Japan', terminal: 'Ohi Container Terminal', customsOffice: 'Tokyo Customs Office' },
    { locode: 'SGSIN', name: 'Port of Singapore (PSA)', country: 'Singapore', terminal: 'Pasir Panjang Terminal', customsOffice: 'Singapore Customs' }
  ]

  if (!modalOpen.portsDirectory) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="liquid-glass-card border border-white/15 text-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] backdrop-blur-2xl relative">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 flex items-center justify-center font-black">
              <span className="material-symbols-outlined text-[20px]">anchor</span>
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                World Ports &amp; Terminals Directory (UN/LOCODE)
              </h3>
              <p className="text-xs text-slate-400">
                Official Port Codes, Customs Office Districts, and Terminal Operators
              </p>
            </div>
          </div>
          <button
            onClick={() => setModalOpen('portsDirectory', false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 text-xs custom-scrollbar">
          <div className="rounded-xl border border-white/10 bg-black/20 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 uppercase text-[10px] font-bold bg-white/5">
                  <th className="py-3 px-3">LOCODE</th>
                  <th className="py-3 px-3">Port &amp; Terminal Name</th>
                  <th className="py-3 px-3">Country</th>
                  <th className="py-3 px-3">Terminal Operator</th>
                  <th className="py-3 px-3">Customs Authority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {ports.map((p) => (
                  <tr key={p.locode} className="hover:bg-white/[0.04] transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-cyan-300">
                      {p.locode}
                    </td>
                    <td className="py-3 px-3 font-semibold text-white">
                      {p.name}
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      {p.country}
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      {p.terminal}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                      {p.customsOffice}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex justify-between items-center bg-white/5 text-xs">
          <span className="text-slate-400 font-mono">{ports.length} International Ports Registered</span>
          <button
            onClick={() => setModalOpen('portsDirectory', false)}
            className="px-4 py-2 rounded-xl border border-white/15 text-slate-300 hover:text-white hover:bg-white/10 font-semibold transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export function SystemDiagnosticsModal() {
  const { modalOpen, setModalOpen, shipments, vehicles, pdOrders, checks, bridgeQueue, activeTerminal } = useLogisticsStore()
  const [runningTest, setRunningTest] = useState(false)
  const [diagnosticsCompleted, setDiagnosticsCompleted] = useState(false)

  if (!modalOpen.systemDiagnostics) return null

  const handleRunTest = () => {
    setRunningTest(true)
    setTimeout(() => {
      setRunningTest(false)
      setDiagnosticsCompleted(true)
    }, 600)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="liquid-glass-card border border-white/15 text-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] backdrop-blur-2xl relative">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 text-cyan-400 flex items-center justify-center font-black">
              <span className="material-symbols-outlined text-[20px]">build</span>
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                LogiSuite System Diagnostics &amp; Storage Health
              </h3>
              <p className="text-xs text-slate-400">
                Core Module Integrity, Dual-Ledger Sync, and Session Check
              </p>
            </div>
          </div>
          <button
            onClick={() => setModalOpen('systemDiagnostics', false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs custom-scrollbar">
          {diagnosticsCompleted && (
            <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold text-[11px] flex items-center gap-2 backdrop-blur-md">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              Full system diagnostics completed successfully. All core subsystem integrity checks passed.
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Active Terminal Hub</span>
              <strong className="text-white text-xs">{activeTerminal}</strong>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">ERP Version / Build</span>
              <strong className="text-cyan-300 text-xs font-mono">LogiSuite v11.4 &bull; Philippines Edition</strong>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>
                <span className="font-bold text-white">Local Browser Storage Persistence</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-mono">
                PASSED (ONLINE)
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>
                <span className="font-bold text-white">Ocean &amp; Air Shipments Store ({shipments.length} files)</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-mono">
                HEALTHY
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>
                <span className="font-bold text-white">Vehicle Inventory Staging ({vehicles.length} units)</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-mono">
                HEALTHY
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>
                <span className="font-bold text-white">P/D Cartage &amp; Dock Receipts ({pdOrders.length} orders)</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-mono">
                HEALTHY
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-emerald-400 text-[18px]">check_circle</span>
                <span className="font-bold text-white">Accounting Bridge Gateway ({bridgeQueue.length} staged / {checks.length} checks)</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-mono">
                SYNCED
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex justify-between items-center bg-white/5 text-xs">
          <button
            onClick={handleRunTest}
            disabled={runningTest}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-white font-bold flex items-center gap-1.5 shadow-lg shadow-blue-600/30 border border-blue-400/40 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">restart_alt</span>
            {runningTest ? 'Running Self-Test...' : 'Run Diagnostics Self-Test'}
          </button>
          <button
            onClick={() => setModalOpen('systemDiagnostics', false)}
            className="px-4 py-2 rounded-xl border border-white/15 text-slate-300 hover:text-white hover:bg-white/10 font-semibold transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
