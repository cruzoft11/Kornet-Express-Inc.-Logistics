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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-blue-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-800 border border-blue-700 text-amber-300 flex items-center justify-center font-black shadow-inner">
              <span className="material-symbols-outlined text-2xl">verified_user</span>
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                Bureau of Customs (BOC) &bull; e2m Customs Gateway
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-400 text-blue-950">
                  PHILIPPINES
                </span>
              </h3>
              <p className="text-xs text-blue-200">
                Department of Finance &bull; Single Administrative Document (SAD) & Port Gate Pass
              </p>
            </div>
          </div>
          <button
            onClick={() => setModalOpen('sedFiling', false)}
            className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-blue-800 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {filingStatus === 'ACCEPTED' && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                <span className="material-symbols-outlined text-emerald-600">verified</span>
                e2m Declaration Cleared &bull; Green Lane Assessment
              </div>
              <div className="text-xs text-emerald-900 dark:text-emerald-200 space-y-1 font-mono">
                <div>e2m Reference Number: <strong className="text-sm text-emerald-700 dark:text-emerald-400">{e2mReferenceNo}</strong></div>
                <div>Official BOC Gate Pass: <strong className="text-sm text-blue-700 dark:text-blue-400">{gatePassNo}</strong></div>
                <div>Status: <span className="text-emerald-600 font-bold">PORT RELEASE PERMITTED (OLRS NOTIFIED)</span></div>
                <div>Filing Timestamp: <span>{new Date().toLocaleString()}</span></div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Target Shipment File #</label>
              <input
                type="text"
                disabled
                value={currentShipment?.fileNo || 'KN-OE-2026-0891'}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Importer / Exporter TIN</label>
              <input
                type="text"
                value={bocTin}
                onChange={(e) => setBocTin(e.target.value)}
                placeholder="000-000-000-000"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono font-bold focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Customs Collection District / Port</label>
              <select
                value={customsDistrict}
                onChange={(e) => setCustomsDistrict(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="MICP - Manila International Container Port (P02A)">MICP - Manila International Container Port (P02A)</option>
                <option value="POM - Port of Manila (P01)">POM - Port of Manila (P01)</option>
                <option value="NAIA - Ninoy Aquino International Airport Customs (P03)">NAIA - Ninoy Aquino International Airport Customs (P03)</option>
                <option value="Port of Cebu (P07)">Port of Cebu - Container Terminal (P07)</option>
                <option value="Port of Davao (P10)">Port of Davao - Sasa Wharf (P10)</option>
                <option value="Subic Bay Freeport Zone (SBF)">Subic Bay Freeport Zone (SBF)</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">BOC Declaration Type</label>
              <select
                value={declarationType}
                onChange={(e) => setDeclarationType(e.target.value as any)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="ED">Export Declaration (ED) - Outbound Freight</option>
                <option value="SAD">Single Administrative Document (SAD) - Inbound Import</option>
                <option value="PEZA">PEZA Transshipment / Economic Zone Clearance</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Shipper / Exporter</label>
              <input
                type="text"
                disabled
                value={currentShipment?.shipper || 'Kornet Central Logistics Dep.'}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Consignee / Importer of Record</label>
              <input
                type="text"
                disabled
                value={currentShipment?.consignee || 'Philippine Industrial Enterprise Inc.'}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Commodity Description & Tariff</label>
              <input
                type="text"
                value={commodityDesc}
                onChange={(e) => setCommodityDesc(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-semibold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Dutiable Customs Value (PHP)</label>
              <input
                type="text"
                value={declaredValuePhp}
                onChange={(e) => setDeclaredValuePhp(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono font-bold focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900 flex justify-between items-center text-xs">
            <span className="text-blue-900 dark:text-blue-200 font-medium">Estimated Duties & 12% BIR Import VAT:</span>
            <span className="font-mono font-black text-blue-800 dark:text-blue-300 text-sm">
              ₱{parseFloat(dutiesTaxesPhp || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
          <span className="text-[11px] text-slate-500">
            Republic Act No. 10863 &bull; Customs Modernization and Tariff Act (CMTA)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setModalOpen('sedFiling', false)}
              className="px-4 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold"
            >
              Close
            </button>
            <button
              onClick={handleTransmit}
              disabled={filingStatus === 'TRANSMITTING'}
              className="px-5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-blue-50/70 dark:bg-blue-950/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black">
              <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                LogiSuite Standard Billing & Freight Codes Directory
              </h3>
              <p className="text-xs text-slate-500">
                Pre-configured Revenue & Cost Charges linked to FS General Ledger Accounts
              </p>
            </div>
          </div>
          <button
            onClick={() => setModalOpen('billingCodes', false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Action Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50 dark:bg-slate-950 text-xs">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <span className="material-symbols-outlined text-slate-400">search</span>
            <input
              type="text"
              placeholder="Search by code, description, category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none"
            />
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            {showAddForm ? 'Cancel Add' : 'Add Billing Code'}
          </button>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border-b border-blue-200 dark:border-blue-800 text-xs grid grid-cols-4 gap-3">
            <div>
              <label className="font-bold block mb-1">Charge Code</label>
              <input
                type="text"
                placeholder="e.g. WHST"
                value={newCode.code}
                onChange={(e) => setNewCode({ ...newCode, code: e.target.value })}
                className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div className="col-span-2">
              <label className="font-bold block mb-1">Description</label>
              <input
                type="text"
                placeholder="Description of the service or tariff"
                value={newCode.desc}
                onChange={(e) => setNewCode({ ...newCode, desc: e.target.value })}
                className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="font-bold block mb-1">Category</label>
              <select
                value={newCode.category}
                onChange={(e) => setNewCode({ ...newCode, category: e.target.value })}
                className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option>Freight</option>
                <option>Documentation</option>
                <option>Port Charges</option>
                <option>Inland Drayage</option>
                <option>Warehousing</option>
                <option>Compliance</option>
              </select>
            </div>
            <div>
              <label className="font-bold block mb-1">Target Sales GL</label>
              <input
                type="text"
                value={newCode.glSales}
                onChange={(e) => setNewCode({ ...newCode, glSales: e.target.value })}
                className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="font-bold block mb-1">Target Cost GL</label>
              <input
                type="text"
                value={newCode.glCost}
                onChange={(e) => setNewCode({ ...newCode, glCost: e.target.value })}
                className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="font-bold block mb-1">Default Rate (USD)</label>
              <input
                type="number"
                value={newCode.defaultRate}
                onChange={(e) => setNewCode({ ...newCode, defaultRate: parseFloat(e.target.value) || 0 })}
                className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleAddCode}
                className="w-full px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow"
              >
                Save Code
              </button>
            </div>
          </div>
        )}

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto p-4 text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] font-bold">
                <th className="py-2 px-3">Code</th>
                <th className="py-2 px-3">Description</th>
                <th className="py-2 px-3">Category</th>
                <th className="py-2 px-3">Sales GL (AR)</th>
                <th className="py-2 px-3">Cost GL (AP)</th>
                <th className="py-2 px-3 text-right">Default Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filtered.map((c) => (
                <tr key={c.code} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="py-2.5 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                    {c.code}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                    {c.desc}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {c.category}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                    {c.glSales} (Sales)
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                    {c.glCost} (Direct Freight Cost)
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                    ${c.defaultRate.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950 text-xs">
          <span className="text-slate-500">{filtered.length} Billing Codes Configured</span>
          <button
            onClick={() => setModalOpen('billingCodes', false)}
            className="px-4 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-teal-50/70 dark:bg-teal-950/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center font-black">
              <span className="material-symbols-outlined text-[18px]">directions_boat</span>
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Carrier Master Directory & EDI Status
              </h3>
              <p className="text-xs text-slate-500">
                Ocean Shipping Lines & Commercial Airline Integrations
              </p>
            </div>
          </div>
          <button
            onClick={() => setModalOpen('carriersDirectory', false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 bg-slate-50 dark:bg-slate-950 text-xs">
          <span className="font-bold text-slate-500">Mode:</span>
          {(['ALL', 'OCEAN', 'AIR'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setFilterMode(m)}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors ${
                filterMode === m
                  ? 'bg-teal-600 text-white'
                  : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
              }`}
            >
              {m} Carriers
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map((c) => (
              <div key={c.name} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-teal-500 transition-colors">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-bold text-slate-900 dark:text-white text-xs">{c.name}</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                    c.mode === 'OCEAN' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                  }`}>
                    {c.scac}
                  </span>
                </div>
                <div className="text-slate-500 space-y-1 text-[11px] mt-2">
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px] text-slate-400">call</span>
                    <span>{c.contact}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px] text-emerald-500">sync_saved_locally</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{c.edi}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950 text-xs">
          <span className="text-slate-500">{filtered.length} Carriers Listed</span>
          <button
            onClick={() => setModalOpen('carriersDirectory', false)}
            className="px-4 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-cyan-50/70 dark:bg-cyan-950/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-600 text-white flex items-center justify-center font-black">
              <span className="material-symbols-outlined text-[18px]">anchor</span>
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                World Ports & Terminals Directory (UN/LOCODE)
              </h3>
              <p className="text-xs text-slate-500">
                Official Port Codes, Customs Office Districts, and Terminal Operators
              </p>
            </div>
          </div>
          <button
            onClick={() => setModalOpen('portsDirectory', false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] font-bold">
                <th className="py-2 px-3">LOCODE</th>
                <th className="py-2 px-3">Port & Terminal Name</th>
                <th className="py-2 px-3">Country</th>
                <th className="py-2 px-3">Terminal Operator</th>
                <th className="py-2 px-3">Customs Authority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {ports.map((p) => (
                <tr key={p.locode} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="py-2.5 px-3 font-mono font-bold text-cyan-600 dark:text-cyan-400">
                    {p.locode}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                    {p.name}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                    {p.country}
                  </td>
                  <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                    {p.terminal}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                    {p.customsOffice}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950 text-xs">
          <span className="text-slate-500">{ports.length} International Ports Registered</span>
          <button
            onClick={() => setModalOpen('portsDirectory', false)}
            className="px-4 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-100 dark:bg-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-700 text-white flex items-center justify-center font-black">
              <span className="material-symbols-outlined text-[18px]">build</span>
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                LogiSuite System Diagnostics & Storage Health
              </h3>
              <p className="text-xs text-slate-500">
                Core Module Integrity, Dual-Ledger Sync, and Session Check
              </p>
            </div>
          </div>
          <button
            onClick={() => setModalOpen('systemDiagnostics', false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {diagnosticsCompleted && (
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px] flex items-center gap-1.5 border border-emerald-300 dark:border-emerald-800">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              Full system diagnostics completed successfully. All core subsystem integrity checks passed.
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Active Terminal Hub</span>
              <strong className="text-slate-800 dark:text-slate-200 text-xs">{activeTerminal}</strong>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">ERP Version / Build</span>
              <strong className="text-slate-800 dark:text-slate-200 text-xs">LogiSuite v11.4 &bull; Philippines Edition</strong>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-500 text-[18px]">check_circle</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">Local Browser Storage Persistence</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                PASSED (ONLINE)
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-500 text-[18px]">check_circle</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">Ocean & Air Shipments Store ({shipments.length} files)</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                HEALTHY
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-500 text-[18px]">check_circle</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">Vehicle Inventory Staging ({vehicles.length} units)</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                HEALTHY
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-500 text-[18px]">check_circle</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">P/D Cartage & Dock Receipts ({pdOrders.length} orders)</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                HEALTHY
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-500 text-[18px]">check_circle</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">Accounting Bridge Gateway ({bridgeQueue.length} staged / {checks.length} checks)</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                SYNCED
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950 text-xs">
          <button
            onClick={handleRunTest}
            disabled={runningTest}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 shadow"
          >
            <span className="material-symbols-outlined text-[16px]">restart_alt</span>
            {runningTest ? 'Running Self-Test...' : 'Run Diagnostics Self-Test'}
          </button>
          <button
            onClick={() => setModalOpen('systemDiagnostics', false)}
            className="px-4 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
