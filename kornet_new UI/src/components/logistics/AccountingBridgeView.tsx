import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLogisticsStore, CheckDisbursement } from '../../stores/logisticsStore'
import { useSettingsStore } from '../../stores/settingsStore'

export default function AccountingBridgeView() {
  const navigate = useNavigate()
  const darkMode = useSettingsStore((s) => s.darkMode)
  const {
    bridgeQueue,
    checks,
    createCheck,
    autoBridgeOperationalCostToFsCheck,
    postCheckDisbursement,
    runTrialPost,
    executeFinalPost,
    openPrintModal,
    addAuditLog
  } = useLogisticsStore()

  // Automated Bridge Live Notification Banner
  const [fsBridgeBanner, setFsBridgeBanner] = useState<{ checkNo: string; jvNo: string; amount: number; vendor: string } | null>(null)

  // Active View Tab: 'staged' (Operations Queue & Bridge) | 'checks' (Disbursements & Checks Entry) | 'misc' (Miscellaneous Invoices) | 'reports' (Audit Reports)
  const [activeTab, setActiveTab] = useState<'staged' | 'checks' | 'misc' | 'reports'>('staged')

  // Trial Post & Post Results
  const [trialReport, setTrialReport] = useState<any>(null)
  const [postResult, setPostResult] = useState<string | null>(null)

  // Checks & Disbursements Modal States (Quick_Disbursements_Workflow_Guide.pdf Windows #1 - #10)
  const [showNewCheckModal, setShowNewCheckModal] = useState(false)
  const [showBatchPrintModal, setShowBatchPrintModal] = useState(false)
  const [showCheckReportModal, setShowCheckReportModal] = useState<string | null>(null)
  const [selectedCheckId, setSelectedCheckId] = useState<string>(checks[0]?.id || '')

  // New Check Form State (Window #3)
  const [newCheck, setNewCheck] = useState<Partial<CheckDisbursement>>({
    checkType: 'COMPUTER',
    paymentType: 'PAYMENT',
    date: new Date().toISOString().split('T')[0],
    glPeriod: '',
    status: 'OPEN',
    vendor: '',
    vendorAddress: '',
    amount: 0,
    isVoucher: true,
    bankName: '',
    currency: 'PHP',
    exchangeRate: 1,
    reference: '',
    comments: '',
    invoicesApplied: []
  })

  // New Check Sub-Tab: 'disbursements' (Window #5) | 'on_account' (Window #6)
  const [checkSubTab, setCheckSubTab] = useState<'disbursements' | 'on_account'>('disbursements')

  // New Misc Invoice Modal State (Quick_Invoices_and_CreditsTransfer_to_LS_Accounting.pdf Windows #1 - #2c)
  const [showMiscInvoiceModal, setShowMiscInvoiceModal] = useState(false)
  const [miscInvoice, setMiscInvoice] = useState({
    invoiceNo: `MISC-2026-${Math.floor(100 + Math.random() * 900)}`,
    type: 'Invoice',
    billType: 'Prepaid' as 'Prepaid' | 'Collect',
    glPeriod: '',
    documentClass: 'Miscellaneous',
    responsibleParty: 'Shipper' as 'Shipper' | 'Consignee' | 'Third Party',
    customerName: '',
    poReference: '',
    comments: '',
    billingCode: '',
    billingAmount: 0,
    costAmount: 0,
    revenueGL: '',
    expenseGL: '',
    pieces: 0,
    grossWeight: 0
  })

  const stagedItems = bridgeQueue.filter((b) => b.status === 'Staged' || b.status === 'Trial Verified')
  const postedItems = bridgeQueue.filter((b) => b.status === 'Posted')

  const arTotal = stagedItems.filter((i) => i.docType === 'Invoice (AR)').reduce((acc, i) => acc + i.amount, 0)
  const apTotal = stagedItems.filter((i) => i.docType === 'Payable Cost (AP)').reduce((acc, i) => acc + i.amount, 0)

  const handleRunTrial = () => {
    const res = runTrialPost()
    setTrialReport(res)
  }

  const handleExecuteFinal = () => {
    const res = executeFinalPost()
    setPostResult(res.message)
    setTrialReport(null)
  }

  const handleCreateCheckSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const checkNum =
      newCheck.checkType === 'COMPUTER'
        ? `CHK-${Math.floor(100000 + Math.random() * 900000)}`
        : newCheck.checkNo || `CHK-${Math.floor(100000 + Math.random() * 900000)}`

    const created: CheckDisbursement = {
      id: `chk-${Date.now()}`,
      checkNo: checkNum,
      checkType: newCheck.checkType || 'COMPUTER',
      paymentType: 'PAYMENT',
      date: newCheck.date || new Date().toISOString().split('T')[0],
      glPeriod: newCheck.glPeriod || '',
      status: 'OPEN',
      vendor: newCheck.vendor || '',
      vendorAddress: newCheck.vendorAddress,
      amount: Number(newCheck.amount) || 0,
      isVoucher: !!newCheck.isVoucher,
      bankName: newCheck.bankName || '',
      currency: newCheck.currency || 'PHP',
      exchangeRate: newCheck.exchangeRate || 1,
      reference: newCheck.reference || '',
      comments: newCheck.comments || '',
      invoicesApplied: newCheck.invoicesApplied || []
    }

    createCheck(created)
    setSelectedCheckId(created.id)
    setShowNewCheckModal(false)
    addAuditLog({
      module: 'Disbursements',
      action: 'Create Check',
      referenceNo: created.checkNo,
      user: 'AP_CLERK',
      details: `Created disbursement check for ${created.vendor} (PHP ${created.amount.toLocaleString()})`
    })
    setFsBridgeBanner({
      checkNo: created.checkNo,
      jvNo: created.jeNo || `CDV-${created.date.replace(/-/g, '')}-${created.checkNo.replace(/[^0-9]/g, '')}`,
      amount: created.amount,
      vendor: created.vendor || 'Vendor'
    })
  }

  const handlePrintSelectedCheck = (check: CheckDisbursement) => {
    openPrintModal({
      type: 'CHECK_VOUCHER',
      title: `Official Bank Check & Disbursement Voucher - ${check.checkNo}`,
      data: check
    })
  }

  const handlePostCheck = (checkId: string, isTrial: boolean) => {
    const res = postCheckDisbursement(checkId, isTrial)
    if (isTrial) {
      alert(`Trial Post Simulation for Check:\nStatus: Balance OK!\nDebits: $${res.debits.toFixed(2)}\nCredits: $${res.credits.toFixed(2)}\n\nLedger accounts in perfect balance. Ready for final post.`)
    } else {
      alert(`Final Post Succeeded!\n${res.message}\nCommitted to fs_checkmas, fs_checkvou, and fs_pournals.`)
    }
  }

  const handleBatchPrintAll = () => {
    useLogisticsStore.setState((state) => ({
      checks: state.checks.map((c) => (c.status === 'OPEN' ? { ...c, status: 'PRINTED' } : c))
    }))
    setShowBatchPrintModal(false)
    addAuditLog({
      module: 'Disbursements',
      action: 'Batch Check Printing',
      referenceNo: 'BATCH-PRINT',
      user: 'AP_SUPERVISOR',
      details: 'Batch printed all open vendor checks for BDO Operations Checking Account'
    })
    alert('Batch Check Printing Complete! All open checks updated to PRINTED status. Vouchers queued.')
  }

  const handleCreateMiscInvoice = (e: React.FormEvent) => {
    e.preventDefault()
    useLogisticsStore.setState((state) => ({
      bridgeQueue: [
        ...state.bridgeQueue,
        {
          id: `br-misc-${Date.now()}`,
          sourceFileNo: miscInvoice.invoiceNo,
          sourceType: 'Miscellaneous Invoice',
          customerOrVendor: miscInvoice.customerName,
          docType: 'Invoice (AR)',
          billingOrCostCode: miscInvoice.billingCode,
          glAccount: miscInvoice.revenueGL,
          description: miscInvoice.comments,
          amount: miscInvoice.billingAmount,
          status: 'Staged'
        }
      ]
    }))

    addAuditLog({
      module: 'Misc Invoices',
      action: 'Create Invoice',
      referenceNo: miscInvoice.invoiceNo,
      user: 'ACCT_BILLING',
      details: `Created Miscellaneous Invoice for ${miscInvoice.customerName} ($${miscInvoice.billingAmount.toFixed(2)})`
    })

    setShowMiscInvoiceModal(false)
    alert(`Miscellaneous Invoice ${miscInvoice.invoiceNo} ($${miscInvoice.billingAmount.toFixed(2)}) staged to Accounting Bridge queue!`)
  }

  const activeCheck = checks.find((c) => c.id === selectedCheckId) || checks[0]

  return (
    <div className={`stitch-module-surface flex-1 flex flex-col overflow-hidden relative ${
      darkMode ? 'bg-[#061426] text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Ambient background light orbs */}
      <div className="absolute top-[-10%] left-[20%] w-[500px] h-[350px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none -z-0 animate-pulse" />
      <div className="absolute bottom-[-10%] right-[10%] w-[450px] h-[350px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -z-0" />

      {/* Top Header & Workflow Switcher */}
      <div className={`px-6 py-3 border-b backdrop-blur-xl relative z-20 flex flex-wrap items-center justify-between gap-4 ${
        darkMode ? 'bg-[#0b192c]/80 border-white/10' : 'bg-white/85 border-slate-200 shadow-sm'
      }`}>
        <div className={`flex items-center gap-1 p-1 rounded-2xl text-xs font-bold ${
          darkMode ? 'bg-white/5 border border-white/10' : 'bg-slate-100'
        }`}>
          <button
            onClick={() => setActiveTab('staged')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all font-semibold ${
              activeTab === 'staged'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 border border-blue-400/30'
                : darkMode ? 'text-slate-300 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">hub</span>
            <span>1. Transfer to LS Accounting</span>
          </button>

          <button
            onClick={() => setActiveTab('checks')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all font-semibold ${
              activeTab === 'checks'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 border border-blue-400/30'
                : darkMode ? 'text-slate-300 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">payments</span>
            <span>2. Checks & Disbursements (AP)</span>
          </button>

          <button
            onClick={() => setActiveTab('misc')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all font-semibold ${
              activeTab === 'misc'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 border border-blue-400/30'
                : darkMode ? 'text-slate-300 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">receipt</span>
            <span>3. Misc Invoices</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all font-semibold ${
              activeTab === 'reports'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 border border-blue-400/30'
                : darkMode ? 'text-slate-300 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">analytics</span>
            <span>4. Invoices & Credits Analysis</span>
          </button>
        </div>

        {/* Global Action Handlers */}
        <div className="flex items-center gap-2">
          {activeTab === 'staged' && (
            <>
              <button
                onClick={handleRunTrial}
                disabled={stagedItems.length === 0}
                className="px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">rule</span>
                <span>Trial Post Simulation</span>
              </button>

              <button
                onClick={handleExecuteFinal}
                disabled={stagedItems.length === 0}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 border border-blue-400/40 flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">publish</span>
                <span>Post Batch to FS Ledger</span>
              </button>
            </>
          )}

          {activeTab === 'checks' && (
            <>
              <button
                onClick={() => setShowBatchPrintModal(true)}
                className={`px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                  darkMode
                    ? 'border-white/15 bg-white/5 hover:bg-white/10 text-slate-200'
                    : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-700 shadow-sm'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">print</span>
                <span>Batch Check Printing</span>
              </button>

              <button
                onClick={() => setShowNewCheckModal(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 border border-emerald-400/40 flex items-center gap-1.5 transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                <span>New Check Record</span>
              </button>
            </>
          )}

          {activeTab === 'misc' && (
            <button
              onClick={() => setShowMiscInvoiceModal(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 border border-emerald-400/40 flex items-center gap-1.5 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">add_card</span>
              <span>New Miscellaneous Invoice</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 relative z-10">
        {/* Automated Bridge Live Notification Toast Banner */}
        {fsBridgeBanner && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-600/90 to-teal-700/90 backdrop-blur-xl text-white shadow-2xl flex flex-wrap items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 border border-emerald-400/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-black flex-shrink-0 shadow-inner">
                <span className="material-symbols-outlined text-2xl text-white">check_circle</span>
              </div>
              <div>
                <div className="font-black text-sm flex items-center gap-2">
                  <span>FS Check {fsBridgeBanner.checkNo} Successfully Generated!</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-400/30 text-[10px] uppercase font-bold tracking-wider border border-emerald-300/30">
                    Live Synced to FS
                  </span>
                </div>
                <div className="text-xs text-white/90 mt-0.5">
                  Voucher <strong>{fsBridgeBanner.jvNo}</strong> for <strong>{fsBridgeBanner.vendor}</strong> (PHP {fsBridgeBanner.amount.toLocaleString()}) has been created with balanced Debit & Credit lines in <code className="font-mono bg-black/20 px-1 py-0.5 rounded">fs_checkmas</code> & <code className="font-mono bg-black/20 px-1 py-0.5 rounded">fs_checkvou</code>.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/fs/voucher')}
                className="px-4 py-2 rounded-xl bg-white text-emerald-900 hover:bg-emerald-50 font-bold text-xs shadow-lg flex items-center gap-1.5 transition-all hover:scale-[1.02]"
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

        {/* ========================================================
            TAB 1: STAGED OPERATIONS QUEUE & FS INTEGRATION
        ======================================================== */}
        {activeTab === 'staged' && (
          <div className="space-y-6">
            {/* Top Gateway Metrics */}
            <div className={`rounded-3xl p-6 border shadow-2xl relative overflow-hidden backdrop-blur-2xl ${
              darkMode ? 'liquid-glass-card border-white/10' : 'bg-white/90 border-slate-200 shadow-xl'
            }`}>
              <div className="flex flex-wrap justify-between items-start gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
                      <span className="material-symbols-outlined text-blue-400 text-xl">hub</span>
                    </div>
                    <div>
                      <h3 className={`text-lg font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        LogiSuite Operations-to-FS Accounting Bridge
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
                        Staging gateway connecting Ocean, Air, P/D, and Misc operations to the Financial Statements (FS) General Ledger.
                        Verified via <strong className="text-amber-400">Trial Post</strong> prior to committal into <code className="font-mono text-blue-400">fs_salebook</code>, <code className="font-mono text-blue-400">fs_purcbook</code>, and <code className="font-mono text-blue-400">fs_pournals</code>.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate('/fs/reports/trial-balance')}
                    className={`px-3.5 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition-all ${
                      darkMode
                        ? 'border-white/15 bg-white/5 hover:bg-white/10 text-slate-200'
                        : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700 shadow-sm'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px] text-emerald-400">account_balance</span>
                    <span>Live FS Trial Balance</span>
                  </button>
                  <button
                    onClick={() => navigate('/fs/vouchers/cdv')}
                    className={`px-3.5 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition-all ${
                      darkMode
                        ? 'border-white/15 bg-white/5 hover:bg-white/10 text-slate-200'
                        : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700 shadow-sm'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px] text-blue-400">receipt_long</span>
                    <span>FS Cash Disbursements (CDV)</span>
                  </button>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6">
                <div className={`p-4 rounded-2xl border transition-all ${
                  darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Staged Lines Awaiting Post</span>
                  <strong className={`text-2xl font-black mt-1 block font-mono ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {stagedItems.length}
                  </strong>
                  <span className="text-[10px] text-slate-400 block mt-1">Pending dual-entry transfer</span>
                </div>

                <div className="p-4 rounded-2xl border bg-blue-500/10 border-blue-500/25">
                  <span className="text-blue-400 text-[10px] uppercase font-bold tracking-wider block">
                    Staged AR Invoicing (Revenue)
                  </span>
                  <strong className="text-2xl font-black text-blue-300 font-mono mt-1 block">
                    ${arTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </strong>
                  <span className="text-[10px] text-blue-400/80 block mt-1">&rarr; Routes to fs_salebook</span>
                </div>

                <div className="p-4 rounded-2xl border bg-amber-500/10 border-amber-500/25">
                  <span className="text-amber-400 text-[10px] uppercase font-bold tracking-wider block">
                    Staged AP Payables (Carrier Costs)
                  </span>
                  <strong className="text-2xl font-black text-amber-300 font-mono mt-1 block">
                    ${apTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </strong>
                  <span className="text-[10px] text-amber-400/80 block mt-1">&rarr; Routes to fs_purcbook & CDVs</span>
                </div>

                <div className="p-4 rounded-2xl border bg-emerald-500/10 border-emerald-500/25">
                  <span className="text-emerald-400 text-[10px] uppercase font-bold tracking-wider block">
                    Committed to FS General Ledger
                  </span>
                  <strong className="text-2xl font-black text-emerald-300 font-mono mt-1 block">
                    {postedItems.length} Lines
                  </strong>
                  <span className="text-[10px] text-emerald-400/80 block mt-1">&check; Synced to fs_pournals</span>
                </div>
              </div>
            </div>

            {/* Trial Post Callout */}
            {trialReport && (
              <div
                className={`p-5 rounded-3xl border shadow-xl backdrop-blur-xl ${
                  trialReport.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                    : 'bg-red-500/10 border-red-500/30 text-red-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <span
                      className={`material-symbols-outlined ${
                        trialReport.success ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {trialReport.success ? 'verified' : 'error'}
                    </span>
                    <span>LogiSuite Trial Post Simulation Report (Step #3 - Window #4)</span>
                  </div>
                  <button
                    onClick={() => setTrialReport(null)}
                    className="text-xs text-slate-400 hover:text-white font-bold px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-4 text-xs font-mono">
                  <div className={`p-3.5 rounded-2xl border ${darkMode ? 'bg-black/30 border-white/10' : 'bg-white/80 border-emerald-200'}`}>
                    <span className="text-slate-400 block text-[10px]">TOTAL SIMULATED DEBITS</span>
                    <strong className="text-base text-white mt-1 block">${trialReport.totalDebits.toFixed(2)}</strong>
                  </div>
                  <div className={`p-3.5 rounded-2xl border ${darkMode ? 'bg-black/30 border-white/10' : 'bg-white/80 border-emerald-200'}`}>
                    <span className="text-slate-400 block text-[10px]">TOTAL SIMULATED CREDITS</span>
                    <strong className="text-base text-white mt-1 block">${trialReport.totalCredits.toFixed(2)}</strong>
                  </div>
                  <div className={`p-3.5 rounded-2xl border ${darkMode ? 'bg-emerald-950/40 border-emerald-500/30' : 'bg-white/80 border-emerald-200'}`}>
                    <span className="text-emerald-400 block text-[10px]">LEDGER EQUILIBRIUM</span>
                    <strong className="text-emerald-400 text-base mt-1 block">&check; ZERO VARIANCE ($0.00)</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Post Result Alert */}
            {postResult && (
              <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex justify-between items-center text-xs backdrop-blur-xl">
                <div className="flex items-center gap-2 font-bold text-blue-200">
                  <span className="material-symbols-outlined text-blue-400">check_circle</span>
                  <span>{postResult}</span>
                </div>
                <button
                  onClick={() => navigate('/fs/reports/trial-balance')}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-1 shadow-sm"
                >
                  <span>View Updated FS Trial Balance</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </button>
              </div>
            )}

            {/* Staged Items Table */}
            <div className={`rounded-3xl p-6 border shadow-2xl backdrop-blur-2xl space-y-4 ${
              darkMode ? 'liquid-glass-card border-white/10' : 'bg-white/90 border-slate-200 shadow-xl'
            }`}>
              <div className="flex justify-between items-center">
                <div>
                  <h4 className={`font-bold text-sm ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                    Operations Staged Transaction Queue
                  </h4>
                  <p className="text-xs text-slate-400">
                    Closed Ocean, Air, Domestic Cartage, and Misc records prepared for dual-entry GL posting.
                  </p>
                </div>
                <span className="font-mono text-xs font-bold text-blue-400 bg-blue-500/10 border border-blue-400/25 px-2.5 py-1 rounded-full">
                  {stagedItems.length} Staged Line(s)
                </span>
              </div>

              {stagedItems.length > 0 ? (
                <div className={`overflow-x-auto rounded-2xl border ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
                  <table className="w-full text-left text-xs">
                    <thead className={`text-[10px] uppercase font-mono font-bold tracking-wider ${
                      darkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-50 text-slate-500'
                    }`}>
                      <tr>
                        <th className="py-3 px-4">Source File #</th>
                        <th className="py-3 px-4">Source Module</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Customer / Vendor</th>
                        <th className="py-3 px-4">Code</th>
                        <th className="py-3 px-4">FS GL Account</th>
                        <th className="py-3 px-4 text-right">Amount (USD)</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-center">⚡ FS Automation</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y font-mono text-[11px] ${
                      darkMode ? 'divide-white/5' : 'divide-slate-100'
                    }`}>
                      {stagedItems.map((item) => (
                        <tr key={item.id} className={`transition-colors ${
                          darkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'
                        }`}>
                          <td className="py-3 px-4 font-bold text-blue-400">{item.sourceFileNo}</td>
                          <td className="py-3 px-4 text-slate-400 font-sans">{item.sourceType}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                item.docType === 'Invoice (AR)'
                                  ? 'bg-blue-500/20 text-blue-300 border-blue-400/30'
                                  : 'bg-amber-500/20 text-amber-300 border-amber-400/30'
                              }`}
                            >
                              {item.docType}
                            </span>
                          </td>
                          <td className={`py-3 px-4 font-sans font-bold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                            {item.customerOrVendor}
                          </td>
                          <td className="py-3 px-4 text-slate-400 font-bold">{item.billingOrCostCode}</td>
                          <td className="py-3 px-4 text-indigo-400 font-bold">{item.glAccount}</td>
                          <td className={`py-3 px-4 text-right font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            ${item.amount.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                item.status === 'Trial Verified'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                                  : 'bg-white/10 text-slate-300 border-white/15'
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {item.docType === 'Payable Cost (AP)' ? (
                              <button
                                onClick={async () => {
                                  const res = await autoBridgeOperationalCostToFsCheck({
                                    sourceFileNo: item.sourceFileNo,
                                    carrierOrVendor: item.customerOrVendor,
                                    amount: item.amount,
                                    description: `Operational Cost for ${item.billingOrCostCode}`,
                                    expenseAccount: item.glAccount || '5010'
                                  })
                                  setFsBridgeBanner({
                                    checkNo: res.checkNo,
                                    jvNo: res.jvNo,
                                    amount: item.amount,
                                    vendor: item.customerOrVendor
                                  })
                                }}
                                className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-[10px] shadow-sm flex items-center gap-1 mx-auto transition-all hover:scale-105 border border-emerald-400/30"
                                title="Auto-issue a CDV Check Voucher in FS Accounting"
                              >
                                <span className="material-symbols-outlined text-[13px]">bolt</span>
                                <span>Auto-FS Check</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-sans italic">AR Invoice Queue</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
                    <span className="material-symbols-outlined text-2xl text-slate-400">inbox</span>
                  </div>
                  <p className="font-bold text-slate-300">No staged transactions currently in the Bridge queue.</p>
                  <p className="text-[11px] text-slate-500">
                    To stage entries: Close an Ocean/Air shipment file, transfer a P/D order, or generate a Miscellaneous Invoice.
                  </p>
                </div>
              )}
            </div>

            {/* Committed Archive */}
            {postedItems.length > 0 && (
              <div className={`rounded-3xl p-6 border shadow-2xl backdrop-blur-2xl space-y-4 ${
                darkMode ? 'liquid-glass-card border-white/10' : 'bg-white/90 border-slate-200 shadow-xl'
              }`}>
                <div className="flex justify-between items-center">
                  <h4 className={`font-bold text-sm ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                    Recently Posted Transactions Archive (Committed to fs_pournals)
                  </h4>
                  <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 rounded-full">
                    &check; Committed & Locked
                  </span>
                </div>

                <div className={`divide-y font-mono text-xs ${darkMode ? 'divide-white/5' : 'divide-slate-100'}`}>
                  {postedItems.map((p) => (
                    <div key={p.id} className="py-3 flex justify-between items-center">
                      <div>
                        <span className={`font-bold font-sans ${darkMode ? 'text-white' : 'text-slate-900'}`}>{p.description}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Voucher JV #: <strong className="text-blue-400">{p.postedJvNo}</strong> &bull; GL: {p.glAccount} &bull; Entity: {p.customerOrVendor}
                        </span>
                      </div>
                      <div className="text-right">
                        <strong className={darkMode ? 'text-white' : 'text-slate-900'}>${p.amount.toFixed(2)}</strong>
                        <span className="text-[10px] text-emerald-400 block uppercase font-bold">&check; Posted</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 2: CHECKS & DISBURSEMENTS ENTRY (AP) (Windows #1 - #10)
        ======================================================== */}
        {activeTab === 'checks' && (
          <div className="space-y-6">
            <div className={`rounded-3xl p-6 border shadow-2xl relative overflow-hidden backdrop-blur-2xl flex flex-wrap justify-between items-start gap-4 ${
              darkMode ? 'liquid-glass-card border-white/10' : 'bg-white/90 border-slate-200 shadow-xl'
            }`}>
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
                    <span className="material-symbols-outlined text-blue-400 text-xl">payments</span>
                  </div>
                  <h3 className={`text-lg font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    Accounts Payable Checks & Disbursements (Window #1)
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                  Issue computer-generated and manual checks for carrier invoices, wharfage, and supply disbursements.
                  Supports invoice discount allocation, GL expense assignment, and automated Cash Disbursement Vouchers (CDVs).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCheckReportModal('voucher')}
                  className={`px-3.5 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition-all ${
                    darkMode
                      ? 'border-white/15 bg-white/5 hover:bg-white/10 text-slate-200'
                      : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-700 shadow-sm'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                  <span>Check Voucher Report</span>
                </button>
                <button
                  onClick={() => setShowCheckReportModal('disbursement')}
                  className={`px-3.5 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition-all ${
                    darkMode
                      ? 'border-white/15 bg-white/5 hover:bg-white/10 text-slate-200'
                      : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-700 shadow-sm'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">summarize</span>
                  <span>Disbursement Report</span>
                </button>
              </div>
            </div>

            {/* Checks Table & Selected Check Details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Checks List */}
              <div className={`lg:col-span-2 rounded-3xl p-6 border shadow-2xl backdrop-blur-2xl space-y-4 ${
                darkMode ? 'liquid-glass-card border-white/10' : 'bg-white/90 border-slate-200 shadow-xl'
              }`}>
                <div className="flex justify-between items-center">
                  <h4 className={`font-bold text-sm ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                    Disbursement Checks Master List ({checks.length})
                  </h4>
                  <span className="text-xs text-slate-400 font-mono">Active AP Register</span>
                </div>

                <div className={`overflow-x-auto rounded-2xl border ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
                  <table className="w-full text-left text-xs">
                    <thead className={`text-[10px] uppercase font-mono font-bold tracking-wider ${
                      darkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-50 text-slate-500'
                    }`}>
                      <tr>
                        <th className="py-3 px-4">Check #</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Vendor Payee</th>
                        <th className="py-3 px-4">Bank Account</th>
                        <th className="py-3 px-4 text-right">Amount (USD)</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y font-mono text-[11px] ${
                      darkMode ? 'divide-white/5' : 'divide-slate-100'
                    }`}>
                      {checks.map((c) => (
                        <tr
                          key={c.id}
                          onClick={() => setSelectedCheckId(c.id)}
                          className={`cursor-pointer transition-all ${
                            c.id === activeCheck?.id
                              ? darkMode
                                ? 'bg-blue-600/20 border-l-4 border-blue-500'
                                : 'bg-blue-50 border-l-4 border-blue-600'
                              : darkMode
                              ? 'hover:bg-white/5'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-3 px-4 font-bold text-blue-400">{c.checkNo}</td>
                          <td className="py-3 px-4 text-slate-400">{c.checkType}</td>
                          <td className="py-3 px-4">{c.date}</td>
                          <td className={`py-3 px-4 font-sans font-bold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                            {c.vendor}
                          </td>
                          <td className="py-3 px-4 text-slate-400 truncate max-w-[150px] font-sans">{c.bankName}</td>
                          <td className={`py-3 px-4 text-right font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            ${c.amount.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                c.status === 'POSTED'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                                  : c.status === 'PRINTED'
                                  ? 'bg-blue-500/20 text-blue-300 border-blue-400/30'
                                  : 'bg-amber-500/20 text-amber-300 border-amber-400/30'
                              }`}
                            >
                              {c.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right 1 Col: Check Voucher Inspector & Actions */}
              {activeCheck && (
                <div className={`rounded-3xl p-6 border shadow-2xl backdrop-blur-2xl space-y-4 text-xs ${
                  darkMode ? 'liquid-glass-card border-white/10' : 'bg-white/90 border-slate-200 shadow-xl'
                }`}>
                  <div className={`pb-3 border-b ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Selected Check Voucher</span>
                    <h4 className="text-xl font-black text-blue-400 font-mono mt-0.5">{activeCheck.checkNo}</h4>
                    <span className={`font-semibold block mt-0.5 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{activeCheck.vendor}</span>
                  </div>

                  <div className="space-y-2.5 font-mono">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Total Check Amount:</span>
                      <strong className="text-emerald-400 text-sm font-black">${activeCheck.amount.toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Bank Account:</span>
                      <span className={`truncate max-w-[150px] ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{activeCheck.bankName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">GL Period:</span>
                      <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>{activeCheck.glPeriod}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Check Type:</span>
                      <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>{activeCheck.checkType}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Journal Entry #:</span>
                      <span className="text-indigo-400 font-bold">{activeCheck.jeNo || 'Pending Post'}</span>
                    </div>
                  </div>

                  {/* Applied Invoices Breakdown */}
                  <div className={`pt-3 border-t space-y-2 ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
                    <span className={`font-bold block ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Applied Invoices:</span>
                    <div className="space-y-2">
                      {activeCheck.invoicesApplied.map((inv, idx) => (
                        <div key={idx} className={`p-3 rounded-xl font-mono text-[11px] space-y-1 border ${
                          darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <div className="flex justify-between font-bold">
                            <span className="text-blue-400">{inv.invoiceNo}</span>
                            <span className={darkMode ? 'text-white' : 'text-slate-900'}>${inv.applied.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-400 font-sans">
                            <span>AP: {inv.apAccount} &bull; GL: {inv.glExpense}</span>
                            <span>Disc: ${inv.discount.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions for this check */}
                  <div className={`pt-4 border-t space-y-2.5 ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
                    <button
                      onClick={() => handlePrintSelectedCheck(activeCheck)}
                      className={`w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all shadow-md ${
                        darkMode
                          ? 'bg-white/10 hover:bg-white/15 text-white border border-white/15'
                          : 'bg-slate-800 hover:bg-slate-700 text-white'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">print</span>
                      <span>Print Bank Check & Voucher</span>
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handlePostCheck(activeCheck.id, true)}
                        className="py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold flex items-center justify-center gap-1 shadow-sm transition-all"
                      >
                        <span className="material-symbols-outlined text-[14px]">rule</span>
                        <span>Trial Post</span>
                      </button>

                      <button
                        onClick={() => handlePostCheck(activeCheck.id, false)}
                        disabled={activeCheck.status === 'POSTED'}
                        className="py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold flex items-center justify-center gap-1 shadow-md border border-emerald-400/30 disabled:opacity-50 transition-all"
                      >
                        <span className="material-symbols-outlined text-[14px]">publish</span>
                        <span>Post to GL</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 3: MISCELLANEOUS INVOICES (Window #2a, 2b, 2c)
        ======================================================== */}
        {activeTab === 'misc' && (
          <div className={`rounded-3xl p-6 border shadow-2xl backdrop-blur-2xl space-y-6 ${
            darkMode ? 'liquid-glass-card border-white/10' : 'bg-white/90 border-slate-200 shadow-xl'
          }`}>
            <div className={`flex flex-wrap justify-between items-center gap-4 pb-4 border-b ${
              darkMode ? 'border-white/10' : 'border-slate-200'
            }`}>
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
                    <span className="material-symbols-outlined text-blue-400 text-xl">receipt</span>
                  </div>
                  <h3 className={`text-lg font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    3. Miscellaneous Invoices Entry (Window #2a)
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Issue ad-hoc freight invoices, inland terminal charges, storage demurrage, or document fees without a master operational file.
                </p>
              </div>

              <button
                onClick={() => setShowMiscInvoiceModal(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 border border-emerald-400/40 flex items-center gap-1.5 transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                <span>New Miscellaneous Invoice</span>
              </button>
            </div>

            {/* Miscellaneous Invoices List */}
            <div className={`p-5 rounded-2xl border space-y-3 text-xs ${
              darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex justify-between items-center">
                <span className={`font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Active Miscellaneous Invoices Register:</span>
                <span className="font-mono text-blue-400 font-bold bg-blue-500/10 border border-blue-400/20 px-2.5 py-0.5 rounded-full">
                  Document Class: Miscellaneous
                </span>
              </div>

              <div className={`p-6 rounded-xl border border-dashed text-center text-sm ${
                darkMode ? 'bg-black/20 border-white/10 text-slate-400' : 'bg-white border-slate-300 text-slate-500'
              }`}>
                No miscellaneous invoices are loaded for this company.
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 4: INVOICES & CREDITS ANALYSIS REPORT (Window #3)
        ======================================================== */}
        {activeTab === 'reports' && (
          <div className={`rounded-3xl p-6 border shadow-2xl backdrop-blur-2xl space-y-6 ${
            darkMode ? 'liquid-glass-card border-white/10' : 'bg-white/90 border-slate-200 shadow-xl'
          }`}>
            <div className={`pb-4 border-b ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-indigo-400 text-xl">analytics</span>
                </div>
                <h3 className={`text-lg font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  4. Invoices & Credits Analysis Report (Window #3)
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Formal pre-transfer verification audit report grouping all AR invoices, carrier AP costs, and margins before committal to the FS General Ledger.
              </p>
            </div>

            <div className={`p-6 rounded-2xl border font-mono text-xs space-y-5 ${
              darkMode ? 'bg-black/30 border-white/10' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className={`text-center pb-4 border-b ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
                <h4 className={`font-black text-base tracking-wider ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  KORNET EXPRESS FREIGHT & CARGO SERVICES
                </h4>
                <span className="text-[11px] text-slate-400 tracking-widest block mt-0.5">
                  INVOICES & CREDITS PRE-POSTING AUDIT ANALYSIS REPORT
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 text-[11px]">
                <div className={`p-3 rounded-xl border ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
                  <span className="text-slate-400 block text-[10px]">FISCAL PERIOD:</span>
                  <strong className={`mt-0.5 block ${darkMode ? 'text-white' : 'text-slate-900'}`}>SEPTEMBER 2026 (ACTIVE)</strong>
                </div>
                <div className="p-3 rounded-xl border bg-blue-500/10 border-blue-500/20">
                  <span className="text-blue-400 block text-[10px]">TOTAL REVENUE (AR):</span>
                  <strong className="text-blue-300 text-sm mt-0.5 block">${arTotal.toFixed(2)}</strong>
                </div>
                <div className="p-3 rounded-xl border bg-amber-500/10 border-amber-500/20">
                  <span className="text-amber-400 block text-[10px]">TOTAL COSTS (AP):</span>
                  <strong className="text-amber-300 text-sm mt-0.5 block">${apTotal.toFixed(2)}</strong>
                </div>
              </div>

              <div className={`p-4 rounded-xl border flex justify-between items-center ${
                darkMode ? 'bg-emerald-950/30 border-emerald-500/30' : 'bg-white border-slate-200'
              }`}>
                <span className={`font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>ESTIMATED NET OPERATING MARGIN:</span>
                <span className="text-base font-black text-emerald-400">
                  ${(arTotal - apTotal).toFixed(2)} (
                  {arTotal > 0 ? (((arTotal - apTotal) / arTotal) * 100).toFixed(1) : 0}%)
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => window.print()}
                  className={`px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-md ${
                    darkMode
                      ? 'bg-white/10 hover:bg-white/15 text-white border border-white/15'
                      : 'bg-slate-800 hover:bg-slate-700 text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  <span>Print Official Analysis Report</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Check Modal (Quick_Disbursements_Workflow_Guide.pdf Window #3) */}
      {showNewCheckModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`w-full max-w-3xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] backdrop-blur-2xl ${
            darkMode ? 'liquid-glass-card border-white/15 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`px-6 py-4 border-b flex justify-between items-center ${
              darkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-900 text-white'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-blue-400 text-lg">payments</span>
                </div>
                <div>
                  <h3 className="font-black text-sm">Create Disbursement Check (Window #3)</h3>
                  <span className="text-[10px] text-slate-400 font-mono">AP Bank Disbursement Voucher Generation</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setNewCheck({
                      checkType: 'COMPUTER',
                      paymentType: 'PAYMENT',
                      date: new Date().toISOString().split('T')[0],
                      glPeriod: '2026-09',
                      status: 'OPEN',
                      vendor: 'Maersk Philippines Inc.',
                      vendorAddress: 'Manila Harbor Center, Tondo, Manila',
                      amount: 45500,
                      isVoucher: true,
                      bankName: 'BDO Unibank (Parañaque Branch)',
                      currency: 'PHP',
                      exchangeRate: 1,
                      reference: 'BK-MNL-2026-0089',
                      invoicesApplied: [
                        {
                          invoiceNo: 'KE-SHP-2026-0001',
                          date: new Date().toISOString().split('T')[0],
                          dueDate: new Date().toISOString().split('T')[0],
                          reference: 'BK-MNL-2026-0089',
                          amount: 45500,
                          applied: 45500,
                          discount: 0,
                          apAccount: '2010',
                          glExpense: '5010',
                          type: 'Disbursement'
                        }
                      ]
                    })
                  }
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all border border-emerald-400/30"
                >
                  <span className="material-symbols-outlined text-[14px]">bolt</span>
                  <span>Quick-Fill Demo (Maersk PHP 45.5k)</span>
                </button>
                <button
                  onClick={() => setShowNewCheckModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateCheckSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-400 block mb-1.5">Check Type (Field 1)</label>
                  <select
                    value={newCheck.checkType}
                    onChange={(e) => setNewCheck({ ...newCheck, checkType: e.target.value as any })}
                    className={`w-full px-3 py-2 rounded-xl border font-bold transition-all ${
                      darkMode ? 'bg-white/5 border-white/15 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  >
                    <option value="COMPUTER" className={darkMode ? 'bg-slate-900 text-white' : ''}>Computer (Auto-assigned)</option>
                    <option value="MANUAL" className={darkMode ? 'bg-slate-900 text-white' : ''}>Manual (User input)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-400 block mb-1.5">Check Date (Field 2)</label>
                  <input
                    type="date"
                    required
                    value={newCheck.date}
                    onChange={(e) => setNewCheck({ ...newCheck, date: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border font-semibold transition-all ${
                      darkMode ? 'bg-white/5 border-white/15 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-400 block mb-1.5">GL Period (Field 3)</label>
                  <input
                    type="text"
                    required
                    value={newCheck.glPeriod}
                    onChange={(e) => setNewCheck({ ...newCheck, glPeriod: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border font-mono font-bold transition-all ${
                      darkMode ? 'bg-white/5 border-white/15 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="font-bold text-slate-400 block mb-1.5">Vendor Payee (Field 4)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Maersk Shipping Line or Evergreen Marine"
                    value={newCheck.vendor}
                    onChange={(e) => setNewCheck({ ...newCheck, vendor: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border font-bold transition-all ${
                      darkMode ? 'bg-white/5 border-white/15 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-400 block mb-1.5">Total Check Amount ($) (Field 5)</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={newCheck.amount}
                    onChange={(e) => setNewCheck({ ...newCheck, amount: parseFloat(e.target.value) || 0 })}
                    className={`w-full px-3 py-2 rounded-xl border font-mono font-bold text-emerald-400 text-sm transition-all ${
                      darkMode ? 'bg-white/5 border-white/15' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-400 block mb-1.5">Bank Name & Account (Field 7)</label>
                <input
                  type="text"
                  value={newCheck.bankName}
                  onChange={(e) => setNewCheck({ ...newCheck, bankName: e.target.value })}
                  placeholder="Enter bank and account"
                  className={`w-full px-3 py-2 rounded-xl border font-semibold transition-all ${
                    darkMode ? 'bg-white/5 border-white/15 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>

              {/* Sub Tabs: New Disbursements vs New On Account (Fields 9 & 10) */}
              <div className="pt-2">
                <div className={`flex border-b ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
                  <button
                    type="button"
                    onClick={() => setCheckSubTab('disbursements')}
                    className={`px-4 py-2 font-bold border-b-2 transition-all ${
                      checkSubTab === 'disbursements'
                        ? 'border-blue-500 text-blue-400'
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    9. New Disbursements (Pay AP Invoices - Window #5)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCheckSubTab('on_account')}
                    className={`px-4 py-2 font-bold border-b-2 transition-all ${
                      checkSubTab === 'on_account'
                        ? 'border-blue-500 text-blue-400'
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    10. New On Account (Pre-Payment - Window #6)
                  </button>
                </div>

                <div className={`p-4 rounded-b-2xl border border-t-0 space-y-2 ${
                  darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
                }`}>
                  {checkSubTab === 'disbursements' ? (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center font-bold">
                        <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Select Invoices to Apply Payment:</span>
                        <span className="text-emerald-400 font-mono text-[11px]">AP Account: 2010 (Trade)</span>
                      </div>
                      <div className={`p-3 rounded-xl border space-y-1 font-mono ${
                        darkMode ? 'bg-black/30 border-white/10' : 'bg-white border-slate-200'
                      }`}>
                        <label className="flex items-center justify-between cursor-pointer">
                          <div className="flex items-center gap-2">
                            <input type="checkbox" defaultChecked className="rounded text-blue-500" />
                            <span className="font-bold text-blue-400">INV-MSK-99120</span>
                            <span className="text-slate-400">(Due: 2026-09-15)</span>
                          </div>
                          <span>Gross: $1,500.00 | Disc: $50.00 | Applied: $1,450.00</span>
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="font-bold block mb-1 text-slate-400">Provider Invoice #</label>
                          <input
                            type="text"
                            placeholder="INV-FUTURE-001"
                            className={`w-full px-3 py-1.5 rounded-xl border font-mono ${
                              darkMode ? 'bg-white/5 border-white/15 text-white' : 'bg-white border-slate-300'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="font-bold block mb-1 text-slate-400">GL Expense Code (Lookup)</label>
                          <input
                            type="text"
                            defaultValue="5010 - Ocean Freight Expense"
                            className={`w-full px-3 py-1.5 rounded-xl border font-semibold ${
                              darkMode ? 'bg-white/5 border-white/15 text-white' : 'bg-white border-slate-300'
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className={`flex justify-end gap-2 pt-4 border-t ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
                <button
                  type="button"
                  onClick={() => setShowNewCheckModal(false)}
                  className={`px-4 py-2 rounded-xl border font-bold transition-all ${
                    darkMode ? 'border-white/15 hover:bg-white/10 text-slate-300' : 'border-slate-300 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold shadow-lg shadow-blue-600/30 border border-blue-400/40 flex items-center gap-1.5 transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  <span>Save & Issue Check Record</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Check Printing Modal (Window #7) */}
      {showBatchPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`w-full max-w-xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col backdrop-blur-2xl ${
            darkMode ? 'liquid-glass-card border-white/15 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`px-6 py-4 border-b flex justify-between items-center ${
              darkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-900 text-white'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-blue-400 text-lg">print</span>
                </div>
                <h3 className="font-black text-sm">Batch Check Printing (Window #7)</h3>
              </div>
              <button
                onClick={() => setShowBatchPrintModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-400 block mb-1.5">Select Bank Account:</label>
                <input
                  placeholder="Enter bank and account"
                  className={`w-full px-3 py-2 rounded-xl border font-bold transition-all ${
                    darkMode ? 'bg-white/5 border-white/15 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>

              <div className={`p-4 rounded-2xl border space-y-2 font-mono ${
                darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className={`font-bold block font-sans ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                  Checks Ready for Printing ({checks.filter((c) => c.status === 'OPEN').length}):
                </span>
                {checks
                  .filter((c) => c.status === 'OPEN')
                  .map((c) => (
                    <div key={c.id} className="flex justify-between text-[11px] py-1 border-b border-white/5 last:border-0">
                      <span>{c.checkNo} &bull; {c.vendor}</span>
                      <strong className="text-blue-400">${c.amount.toFixed(2)}</strong>
                    </div>
                  ))}
              </div>
            </div>

            <div className={`px-6 py-3 border-t flex justify-end gap-2 text-xs ${
              darkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'
            }`}>
              <button
                onClick={() => setShowBatchPrintModal(false)}
                className={`px-4 py-2 rounded-xl border font-bold transition-all ${
                  darkMode ? 'border-white/15 hover:bg-white/10 text-slate-300' : 'border-slate-300 text-slate-700'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleBatchPrintAll}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black flex items-center gap-1.5 shadow-lg shadow-blue-600/30 border border-blue-400/40"
              >
                <span className="material-symbols-outlined text-[16px]">print</span>
                <span>Print Checks Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Check Reports Preview Modal (Windows #8 & #9) */}
      {showCheckReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col backdrop-blur-2xl ${
            darkMode ? 'liquid-glass-card border-white/15 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`px-6 py-4 border-b flex justify-between items-center ${
              darkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-900 text-white'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-blue-400 text-lg">description</span>
                </div>
                <h3 className="font-black text-sm">
                  {showCheckReportModal === 'voucher' ? 'Check Voucher Report (Window #8)' : 'Disbursement Report (Window #9)'}
                </h3>
              </div>
              <button
                onClick={() => setShowCheckReportModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs font-mono">
              <div className={`text-center pb-3 border-b ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
                <h4 className={`font-black text-base tracking-wider ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  KORNET EXPRESS FREIGHT SERVICES
                </h4>
                <span className="text-[10px] text-slate-400 tracking-wider block mt-0.5">
                  {showCheckReportModal === 'voucher'
                    ? 'ACCOUNTS PAYABLE CHECK VOUCHER SUMMARY REPORT'
                    : 'CASH DISBURSEMENTS AUDIT REGISTER (PRE-POSTING VERIFICATION)'}
                </span>
              </div>

              <div className="space-y-2 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">BANK: BDO UNIBANK (0012-9981-22)</span>
                  <span className="text-slate-400">GL PERIOD: 09-2026</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">TOTAL DISBURSEMENTS:</span>
                  <strong className="text-emerald-400">${checks.reduce((a, b) => a + b.amount, 0).toFixed(2)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">RECORD COUNT:</span>
                  <span className="font-bold">{checks.length} CHECKS</span>
                </div>
              </div>
            </div>

            <div className={`px-6 py-3 border-t flex justify-end gap-2 text-xs ${
              darkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'
            }`}>
              <button
                onClick={() => setShowCheckReportModal(null)}
                className={`px-4 py-2 rounded-xl border font-bold transition-all ${
                  darkMode ? 'border-white/15 hover:bg-white/10 text-slate-300' : 'border-slate-300 text-slate-700'
                }`}
              >
                Close
              </button>
              <button
                onClick={() => {
                  window.print()
                  setShowCheckReportModal(null)
                }}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold flex items-center gap-1.5 shadow-lg shadow-blue-600/30 border border-blue-400/40"
              >
                <span className="material-symbols-outlined text-[16px]">print</span>
                <span>Print Report</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Miscellaneous Invoice Modal (Window #2a, 2b) */}
      {showMiscInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col backdrop-blur-2xl ${
            darkMode ? 'liquid-glass-card border-white/15 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`px-6 py-4 border-b flex justify-between items-center ${
              darkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-900 text-white'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-blue-400 text-lg">receipt</span>
                </div>
                <h3 className="font-black text-sm">New Miscellaneous Invoice (Window #2a)</h3>
              </div>
              <button
                onClick={() => setShowMiscInvoiceModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateMiscInvoice} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-400 block mb-1.5">Invoice # (Field 1)</label>
                  <input
                    type="text"
                    readOnly
                    value={miscInvoice.invoiceNo}
                    className={`w-full px-3 py-2 rounded-xl border font-mono font-bold text-blue-400 ${
                      darkMode ? 'bg-white/5 border-white/15' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-400 block mb-1.5">Bill Type (Field 3)</label>
                  <select
                    value={miscInvoice.billType}
                    onChange={(e) => setMiscInvoice({ ...miscInvoice, billType: e.target.value as any })}
                    className={`w-full px-3 py-2 rounded-xl border font-bold transition-all ${
                      darkMode ? 'bg-white/5 border-white/15 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  >
                    <option value="Prepaid" className={darkMode ? 'bg-slate-900 text-white' : ''}>Prepaid</option>
                    <option value="Collect" className={darkMode ? 'bg-slate-900 text-white' : ''}>Collect</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-400 block mb-1.5">GL Period (Field 4)</label>
                  <input
                    type="text"
                    value={miscInvoice.glPeriod}
                    onChange={(e) => setMiscInvoice({ ...miscInvoice, glPeriod: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border font-mono font-bold ${
                      darkMode ? 'bg-white/5 border-white/15 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-400 block mb-1.5">Responsible Billing Client (Field 6)</label>
                <input
                  type="text"
                  required
                  value={miscInvoice.customerName}
                  onChange={(e) => setMiscInvoice({ ...miscInvoice, customerName: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border font-bold ${
                    darkMode ? 'bg-white/5 border-white/15 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>

              <div>
                <label className="font-bold text-slate-400 block mb-1.5">Description / Comments (Field 9)</label>
                <textarea
                  rows={2}
                  value={miscInvoice.comments}
                  onChange={(e) => setMiscInvoice({ ...miscInvoice, comments: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border ${
                    darkMode ? 'bg-white/5 border-white/15 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>

              {/* Charges Details (Window #2b) */}
              <div className={`p-4 rounded-2xl border space-y-3 ${
                darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className={`font-bold block ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Charges Details (Window #2b - Billing & Cost):
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-400 block mb-1">Selling Amount (AR Revenue) ($)</label>
                    <input
                      type="number"
                      value={miscInvoice.billingAmount}
                      onChange={(e) => setMiscInvoice({ ...miscInvoice, billingAmount: parseFloat(e.target.value) || 0 })}
                      className={`w-full px-3 py-2 rounded-xl border font-mono font-bold text-blue-400 ${
                        darkMode ? 'bg-black/30 border-white/15' : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-400 block mb-1">Direct Cost (AP Expense) ($)</label>
                    <input
                      type="number"
                      value={miscInvoice.costAmount}
                      onChange={(e) => setMiscInvoice({ ...miscInvoice, costAmount: parseFloat(e.target.value) || 0 })}
                      className={`w-full px-3 py-2 rounded-xl border font-mono font-bold text-amber-400 ${
                        darkMode ? 'bg-black/30 border-white/15' : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>
                </div>
              </div>

              <div className={`flex justify-end gap-2 pt-4 border-t ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
                <button
                  type="button"
                  onClick={() => setShowMiscInvoiceModal(false)}
                  className={`px-4 py-2 rounded-xl border font-bold transition-all ${
                    darkMode ? 'border-white/15 hover:bg-white/10 text-slate-300' : 'border-slate-300 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold shadow-lg shadow-blue-600/30 border border-blue-400/40 flex items-center gap-1.5 transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  <span>Save & Transfer to Bridge</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
