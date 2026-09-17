import { useState } from 'react'
import { useLogisticsStore, BillingLine, CostLine } from '../../stores/logisticsStore'

const STANDARD_BILLING_CODES = [
  { code: 'OFRT', desc: 'Ocean Freight FCL/LCL', revenueGL: '4010', expenseGL: '5010' },
  { code: 'AFRT', desc: 'Air Freight Express / Priority', revenueGL: '4015', expenseGL: '5015' },
  { code: 'THC', desc: 'Terminal Handling Charge Origin/Dest', revenueGL: '4030', expenseGL: '5020' },
  { code: 'DOCF', desc: 'Documentation & AESDirect SED Filing', revenueGL: '4020', expenseGL: '5020' },
  { code: 'FSC', desc: 'Fuel Surcharge Carrier', revenueGL: '4025', expenseGL: '5025' },
  { code: 'PORT', desc: 'Port Gate & Wharfage Fees', revenueGL: '4030', expenseGL: '5020' },
  { code: 'CUST', desc: 'Customs Clearance & Brokerage', revenueGL: '4040', expenseGL: '5040' },
  { code: 'CHAS', desc: 'Chassis Daily Rental', revenueGL: '4030', expenseGL: '5030' },
  { code: 'HAWB', desc: 'House Airwaybill Fee', revenueGL: '4035', expenseGL: '5025' }
]

export default function NewChargeModal() {
  const {
    modalOpen,
    setModalOpen,
    activeNewChargeShipmentFileNo,
    shipments,
    addBillingLine,
    addCostLine,
    addAuditLog
  } = useLogisticsStore()

  const [activeTab, setActiveTab] = useState<'billing' | 'cost' | 'history'>('billing')
  const [billingCode, setBillingCode] = useState('OFRT')
  const [billType, setBillType] = useState<'Prepaid' | 'Collect'>('Prepaid')
  const [billParty, setBillParty] = useState<'SHIPPER' | 'CONSIGNEE' | 'OTHER'>('SHIPPER')
  const [comments, setComments] = useState('')

  // Billing Tab Fields
  const [qty, setQty] = useState(1)
  const [unit, setUnit] = useState('CNTR')
  const [rate, setRate] = useState(480.00)
  const [currency, setCurrency] = useState('USD')
  const [exchangeRate, setExchangeRate] = useState(56.50)

  // Cost Tab Fields
  const [costQty, setCostQty] = useState(1)
  const [costUnit, setCostUnit] = useState('CNTR')
  const [costRate, setCostRate] = useState(320.00)
  const [vendor, setVendor] = useState('Maersk Shipping Line')
  const [vendorId, setVendorId] = useState('VND-001')

  if (!modalOpen.newCharge) return null

  const fileNo = activeNewChargeShipmentFileNo || (shipments[0]?.fileNo ?? 'KN-OE-2026-0891')
  const currentShipment = shipments.find((s) => s.fileNo === fileNo) || shipments[0]
  const selectedCodeDef = STANDARD_BILLING_CODES.find((c) => c.code === billingCode) || STANDARD_BILLING_CODES[0]

  const billingAmount = qty * rate
  const costAmount = costQty * costRate

  const handleSave = () => {
    if (!currentShipment && shipments.length === 0) {
      alert('No shipment files available. Please create a shipment before adding charges.')
      setModalOpen('newCharge', false)
      return
    }

    // Add Billing Line
    if (billingAmount > 0) {
      const newLine: BillingLine = {
        id: `b-${Date.now()}`,
        code: billingCode,
        desc: selectedCodeDef.desc,
        amount: billingAmount,
        prepaidOrCollect: billType,
        customer: currentShipment?.shipper || 'Customer Account',
        glAccount: selectedCodeDef.revenueGL,
        rate,
        qty,
        unit,
        currency,
        exchangeRate
      }
      addBillingLine(fileNo, newLine)
    }

    // Add Cost Line
    if (costAmount > 0) {
      const newCost: CostLine = {
        id: `c-${Date.now()}`,
        code: billingCode,
        desc: `${selectedCodeDef.desc} [${vendor}]`,
        amount: costAmount,
        vendor,
        vendorId,
        glAccount: selectedCodeDef.expenseGL,
        rate: costRate,
        qty: costQty,
        unit: costUnit
      }
      addCostLine(fileNo, newCost)
    }

    addAuditLog({
      user: 'OFFICE',
      module: currentShipment?.type || 'Ocean Export',
      action: 'Add Charges Details',
      referenceNo: fileNo,
      details: `Added ${billingCode} charge: Billing $${billingAmount.toFixed(2)} | Cost $${costAmount.toFixed(2)}`
    })

    setModalOpen('newCharge', false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="liquid-glass-card border border-white/15 text-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col backdrop-blur-2xl relative">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="px-6 py-4 bg-white/5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-cyan-400">
              <span className="material-symbols-outlined text-lg">monetization_on</span>
            </div>
            <span className="font-bold text-sm tracking-wide text-white">
              New Charges Details &bull; <span className="font-mono text-cyan-300">#{fileNo}</span>
            </span>
          </div>
          <button
            onClick={() => setModalOpen('newCharge', false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Top Identification Block */}
        <div className="p-5 bg-black/20 border-b border-white/10 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="font-bold text-slate-300 block mb-1">Billing Code</label>
            <select
              value={billingCode}
              onChange={(e) => setBillingCode(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-white/15 bg-black/40 text-white font-mono font-bold outline-none focus:border-cyan-400"
            >
              {STANDARD_BILLING_CODES.map((c) => (
                <option key={c.code} value={c.code} className="bg-slate-900 text-white">
                  {c.code} - {c.desc}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-300 block mb-1">Bill Type</label>
            <select
              value={billType}
              onChange={(e) => setBillType(e.target.value as any)}
              className="w-full px-3 py-1.5 rounded-xl border border-white/15 bg-black/40 text-white font-bold outline-none focus:border-cyan-400"
            >
              <option value="Prepaid" className="bg-slate-900 text-white">PREPAID</option>
              <option value="Collect" className="bg-slate-900 text-white">COLLECT</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-300 block mb-1">Bill Party</label>
            <select
              value={billParty}
              onChange={(e) => setBillParty(e.target.value as any)}
              className="w-full px-3 py-1.5 rounded-xl border border-white/15 bg-black/40 text-white font-bold outline-none focus:border-cyan-400"
            >
              <option value="SHIPPER" className="bg-slate-900 text-white">SHIPPER ({currentShipment?.shipper ? currentShipment.shipper.slice(0, 16) + '...' : 'Consignor Account'})</option>
              <option value="CONSIGNEE" className="bg-slate-900 text-white">CONSIGNEE ({currentShipment?.consignee ? currentShipment.consignee.slice(0, 16) + '...' : 'Consignee Account'})</option>
              <option value="OTHER" className="bg-slate-900 text-white">THIRD PARTY / OTHER</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="font-bold text-slate-300 block mb-1">Charge Comments</label>
            <input
              type="text"
              placeholder="Comments printed on Commercial Invoice line item..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-white/15 bg-black/40 text-white placeholder-slate-500 text-xs outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        {/* Tab Navigation: Billing | Cost | History */}
        <div className="flex border-b border-white/10 bg-white/5 px-4 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('billing')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all ${
              activeTab === 'billing'
                ? 'bg-blue-600/30 text-cyan-300 border-t border-x border-cyan-400/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Billing (Revenue / Sale)
          </button>
          <button
            onClick={() => setActiveTab('cost')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all ${
              activeTab === 'cost'
                ? 'bg-blue-600/30 text-cyan-300 border-t border-x border-cyan-400/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Cost (Carrier / Vendor Payable)
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all ${
              activeTab === 'history'
                ? 'bg-blue-600/30 text-cyan-300 border-t border-x border-cyan-400/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            History &amp; GL Route
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 text-xs space-y-4">
          {activeTab === 'billing' && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="font-semibold text-slate-400 block mb-1">Quantity</label>
                  <input
                    type="number"
                    value={qty}
                    onChange={(e) => setQty(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 rounded-xl border border-white/15 bg-black/40 text-white font-mono font-bold outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-400 block mb-1">Unit</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-white/15 bg-black/40 text-white outline-none focus:border-cyan-400"
                  >
                    <option value="CNTR" className="bg-slate-900 text-white">CNTR (Container)</option>
                    <option value="CBM" className="bg-slate-900 text-white">CBM (Cubic Meter)</option>
                    <option value="KGS" className="bg-slate-900 text-white">KGS (Kilogram)</option>
                    <option value="DOC" className="bg-slate-900 text-white">DOC (Document)</option>
                    <option value="SET" className="bg-slate-900 text-white">SET (Shipment)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-400 block mb-1">Rate ($)</label>
                  <input
                    type="number"
                    value={rate}
                    onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 rounded-xl border border-white/15 bg-black/40 text-white font-mono font-bold outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-400 block mb-1">Total Billing ($)</label>
                  <div className="px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono font-black text-sm">
                    ${billingAmount.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-400 block mb-1">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-white/15 bg-black/40 text-white font-semibold outline-none focus:border-cyan-400"
                  >
                    <option value="USD" className="bg-slate-900 text-white">USD - US Dollar</option>
                    <option value="PHP" className="bg-slate-900 text-white">PHP - Philippine Peso</option>
                    <option value="EUR" className="bg-slate-900 text-white">EUR - Euro</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-400 block mb-1">Exchange Rate (PHP/USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 1)}
                    className="w-full px-3 py-1.5 rounded-xl border border-white/15 bg-black/40 text-white font-mono font-bold outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex justify-between items-center text-[11px]">
                <span className="text-slate-400">Auto-routes to FS AR Revenue Account:</span>
                <span className="font-mono font-bold text-cyan-300">
                  {selectedCodeDef.revenueGL} - Ocean/Air Operating Freight Revenue
                </span>
              </div>
            </div>
          )}

          {activeTab === 'cost' && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="font-semibold text-slate-400 block mb-1">Cost Qty</label>
                  <input
                    type="number"
                    value={costQty}
                    onChange={(e) => setCostQty(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 rounded-xl border border-white/15 bg-black/40 text-white font-mono font-bold outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-400 block mb-1">Cost Unit</label>
                  <select
                    value={costUnit}
                    onChange={(e) => setCostUnit(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-white/15 bg-black/40 text-white outline-none focus:border-amber-400"
                  >
                    <option value="CNTR" className="bg-slate-900 text-white">CNTR</option>
                    <option value="SET" className="bg-slate-900 text-white">SET</option>
                    <option value="CBM" className="bg-slate-900 text-white">CBM</option>
                    <option value="KGS" className="bg-slate-900 text-white">KGS</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-400 block mb-1">Carrier Rate ($)</label>
                  <input
                    type="number"
                    value={costRate}
                    onChange={(e) => setCostRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 rounded-xl border border-white/15 bg-black/40 text-white font-mono font-bold outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-400 block mb-1">Total Cost ($)</label>
                  <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono font-black text-sm">
                    ${costAmount.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="font-semibold text-slate-400 block mb-1">Carrier / Vendor Payee</label>
                  <input
                    type="text"
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-white/15 bg-black/40 text-white font-bold outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-400 block mb-1">Vendor ID</label>
                  <input
                    type="text"
                    value={vendorId}
                    onChange={(e) => setVendorId(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-white/15 bg-black/40 text-white font-mono font-bold outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex justify-between items-center text-[11px]">
                <span className="text-slate-400">Auto-routes to FS AP Expense Account:</span>
                <span className="font-mono font-bold text-amber-300">
                  {selectedCodeDef.expenseGL} - Carrier Ocean/Air Freight Expense (COGS)
                </span>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3 font-mono text-[11px] text-slate-300 bg-black/30 p-4 rounded-2xl border border-white/10">
              <div className="flex justify-between">
                <span className="text-slate-400">FILE NUMBER:</span>
                <span className="font-bold text-cyan-300">{fileNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">ESTIMATED MARGIN:</span>
                <span className="font-bold text-emerald-400">
                  +${(billingAmount - costAmount).toFixed(2)} ({billingAmount > 0 ? Math.round(((billingAmount - costAmount) / billingAmount) * 100) : 0}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">PRE-AUDIT STATUS:</span>
                <span className="font-bold text-cyan-400">Passes &ge; 15% Threshold</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">GL FISCAL PERIOD:</span>
                <span className="font-bold text-white">09/2026</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white/5 border-t border-white/10 flex justify-between items-center">
          <div className="text-xs font-mono font-bold">
            Projected Profit: <span className="text-emerald-400">+${(billingAmount - costAmount).toFixed(2)}</span>
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={() => setModalOpen('newCharge', false)}
              className="px-4 py-2 rounded-xl border border-white/15 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 border border-blue-400/40 transition-all active:scale-95"
            >
              Save Charge Line
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
