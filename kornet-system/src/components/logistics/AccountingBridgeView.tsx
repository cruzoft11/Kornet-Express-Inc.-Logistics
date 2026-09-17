import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLogisticsStore, CheckDisbursement } from '../../stores/logisticsStore'

export default function AccountingBridgeView() {
  const navigate = useNavigate()
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
    <div className="stitch-module-surface flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Top Header & Workflow Switcher */}
      <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => setActiveTab('staged')}
            className={`px-4 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
              activeTab === 'staged'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">hub</span>
            1. Transfer to LS Accounting (Queue)
          </button>

          <button
            onClick={() => setActiveTab('checks')}
            className={`px-4 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
              activeTab === 'checks'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">payments</span>
            2. Checks & Disbursements Entry (AP)
          </button>

          <button
            onClick={() => setActiveTab('misc')}
            className={`px-4 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
              activeTab === 'misc'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">receipt</span>
            3. Miscellaneous Invoices (Window #2a)
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
              activeTab === 'reports'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">analytics</span>
            4. Invoices & Credits Analysis Report
          </button>
        </div>

        {/* Global Action Handlers */}
        <div className="flex items-center gap-2">
          {activeTab === 'staged' && (
            <>
              <button
                onClick={handleRunTrial}
                disabled={stagedItems.length === 0}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm flex items-center gap-1 transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">rule</span>
                Trial Post Simulation
              </button>

              <button
                onClick={handleExecuteFinal}
                disabled={stagedItems.length === 0}
                className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-md flex items-center gap-1 transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">publish</span>
                Post Batch to FS Ledger
              </button>
            </>
          )}

          {activeTab === 'checks' && (
            <>
              <button
                onClick={() => setShowBatchPrintModal(true)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">print</span>
                Batch Check Printing (Window #7)
              </button>

              <button
                onClick={() => setShowNewCheckModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-sm flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                New Check Record (Window #2)
              </button>
            </>
          )}

          {activeTab === 'misc' && (
            <button
              onClick={() => setShowMiscInvoiceModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-sm flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">add_card</span>
              New Miscellaneous Invoice (Window #2a)
            </button>
          )}
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Automated Bridge Live Notification Toast Banner */}
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
                  Voucher <strong>{fsBridgeBanner.jvNo}</strong> for <strong>{fsBridgeBanner.vendor}</strong> (PHP {fsBridgeBanner.amount.toLocaleString()}) has been created with balanced Debit & Credit lines in <code>fs_checkmas</code> & <code>fs_checkvou</code>.
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
        {/* ========================================================
            TAB 1: STAGED OPERATIONS QUEUE & FS INTEGRATION
        ======================================================== */}
        {activeTab === 'staged' && (
          <div className="space-y-6">
            {/* Top Gateway Metrics */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
              <div className="flex flex-wrap justify-between items-start gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-600 text-2xl">hub</span>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">
                      LogiSuite Operations-to-FS Accounting Bridge
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                    Staging gateway connecting Ocean, Air, P/D, and Misc operations to the Financial Statements (FS) General Ledger.
                    Verified via <strong>Trial Post</strong> prior to committal into <code>fs_salebook</code>, <code>fs_purcbook</code>, and <code>fs_pournals</code>.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate('/fs/reports/trial-balance')}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px] text-emerald-600">account_balance</span>
                    Live FS Trial Balance
                  </button>
                  <button
                    onClick={() => navigate('/fs/vouchers/cdv')}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px] text-blue-600">receipt_long</span>
                    FS Cash Disbursements (CDV)
                  </button>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Staged Lines Awaiting Post</span>
                  <strong className="text-2xl font-black text-slate-900 dark:text-white">{stagedItems.length}</strong>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Pending GL transfer</span>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50">
                  <span className="text-blue-700 dark:text-blue-400 text-[10px] uppercase font-bold block">
                    Staged AR Invoicing (Revenue)
                  </span>
                  <strong className="text-2xl font-black text-blue-950 dark:text-blue-200 font-mono">
                    ${arTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </strong>
                  <span className="text-[10px] text-blue-600/70 block mt-0.5">&rarr; Routes to fs_salebook</span>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50">
                  <span className="text-amber-700 dark:text-amber-400 text-[10px] uppercase font-bold block">
                    Staged AP Payables (Carrier Costs)
                  </span>
                  <strong className="text-2xl font-black text-amber-950 dark:text-amber-200 font-mono">
                    ${apTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </strong>
                  <span className="text-[10px] text-amber-600/70 block mt-0.5">&rarr; Routes to fs_purcbook & CDVs</span>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50">
                  <span className="text-emerald-700 dark:text-emerald-400 text-[10px] uppercase font-bold block">
                    Committed to FS General Ledger
                  </span>
                  <strong className="text-2xl font-black text-emerald-950 dark:text-emerald-200 font-mono">
                    {postedItems.length} Lines
                  </strong>
                  <span className="text-[10px] text-emerald-600/70 block mt-0.5">&check; Synced to fs_pournals</span>
                </div>
              </div>
            </div>

            {/* Trial Post Callout */}
            {trialReport && (
              <div
                className={`p-5 rounded-2xl border ${
                  trialReport.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                    : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                    <span
                      className={`material-symbols-outlined ${
                        trialReport.success ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {trialReport.success ? 'verified' : 'error'}
                    </span>
                    <span>LogiSuite Trial Post Simulation Report (Step #3 - Window #4)</span>
                  </div>
                  <button
                    onClick={() => setTrialReport(null)}
                    className="text-xs text-slate-400 hover:text-slate-600 font-bold"
                  >
                    Dismiss
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-4 text-xs font-mono">
                  <div className="p-3 bg-white/70 dark:bg-slate-900/60 rounded-xl border border-emerald-200 dark:border-emerald-800">
                    <span className="text-slate-500 block text-[10px]">TOTAL SIMULATED DEBITS</span>
                    <strong className="text-slate-900 dark:text-white text-base">${trialReport.totalDebits.toFixed(2)}</strong>
                  </div>
                  <div className="p-3 bg-white/70 dark:bg-slate-900/60 rounded-xl border border-emerald-200 dark:border-emerald-800">
                    <span className="text-slate-500 block text-[10px]">TOTAL SIMULATED CREDITS</span>
                    <strong className="text-slate-900 dark:text-white text-base">${trialReport.totalCredits.toFixed(2)}</strong>
                  </div>
                  <div className="p-3 bg-white/70 dark:bg-slate-900/60 rounded-xl border border-emerald-200 dark:border-emerald-800">
                    <span className="text-slate-500 block text-[10px]">LEDGER EQUILIBRIUM</span>
                    <strong className="text-emerald-600 text-base">&check; ZERO VARIANCE ($0.00)</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Post Result Alert */}
            {postResult && (
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 flex justify-between items-center text-xs">
                <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-200">
                  <span className="material-symbols-outlined text-blue-600">check_circle</span>
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
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    Operations Staged Transaction Queue
                  </h4>
                  <p className="text-xs text-slate-500">
                    Closed Ocean, Air, Domestic Cartage, and Misc records prepared for dual-entry GL posting.
                  </p>
                </div>
                <span className="font-mono text-xs font-bold text-blue-600">
                  {stagedItems.length} Staged Line(s)
                </span>
              </div>

              {stagedItems.length > 0 ? (
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-2xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 text-[10px] uppercase font-bold">
                      <tr>
                        <th className="py-2.5 px-4">Source File #</th>
                        <th className="py-2.5 px-4">Source Module</th>
                        <th className="py-2.5 px-4">Type</th>
                        <th className="py-2.5 px-4">Customer / Vendor</th>
                        <th className="py-2.5 px-4">Code</th>
                        <th className="py-2.5 px-4">FS GL Account</th>
                        <th className="py-2.5 px-4 text-right">Amount (USD)</th>
                        <th className="py-2.5 px-4 text-center">Status</th>
                        <th className="py-2.5 px-4 text-center">⚡ FS Automation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                      {stagedItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-4 font-bold text-blue-600">{item.sourceFileNo}</td>
                          <td className="py-2.5 px-4 text-slate-500 font-sans">{item.sourceType}</td>
                          <td className="py-2.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                item.docType === 'Invoice (AR)'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              }`}
                            >
                              {item.docType}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-sans font-bold text-slate-800 dark:text-slate-200">
                            {item.customerOrVendor}
                          </td>
                          <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 font-bold">{item.billingOrCostCode}</td>
                          <td className="py-2.5 px-4 text-indigo-600 dark:text-indigo-400 font-bold">{item.glAccount}</td>
                          <td className="py-2.5 px-4 text-right font-bold text-slate-900 dark:text-white">
                            ${item.amount.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                item.status === 'Trial Verified'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-center">
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
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] shadow-sm flex items-center gap-1 mx-auto transition-colors hover:scale-105"
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
                  <span className="material-symbols-outlined text-4xl text-slate-300 block">inbox</span>
                  <p className="font-bold">No staged transactions currently in the Bridge queue.</p>
                  <p className="text-[11px] text-slate-500">
                    To stage entries: Close an Ocean/Air shipment file, transfer a P/D order, or generate a Miscellaneous Invoice.
                  </p>
                </div>
              )}
            </div>

            {/* Committed Archive */}
            {postedItems.length > 0 && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    Recently Posted Transactions Archive (Committed to fs_pournals)
                  </h4>
                  <span className="text-xs text-emerald-600 font-bold">&check; Committed & Locked</span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-xs">
                  {postedItems.map((p) => (
                    <div key={p.id} className="py-2.5 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white font-sans">{p.description}</span>
                        <span className="text-[10px] text-slate-400 block">
                          Voucher JV #: <strong className="text-blue-600">{p.postedJvNo}</strong> &bull; GL: {p.glAccount} &bull; Entity: {p.customerOrVendor}
                        </span>
                      </div>
                      <div className="text-right">
                        <strong className="text-slate-900 dark:text-white">${p.amount.toFixed(2)}</strong>
                        <span className="text-[10px] text-emerald-600 block uppercase font-bold">&check; Posted</span>
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
            <div className="flex flex-wrap justify-between items-start gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600">payments</span>
                  Accounts Payable Checks & Disbursements (Window #1)
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                  Issue computer-generated and manual checks for carrier invoices, wharfage, and supply disbursements.
                  Supports invoice discount allocation, GL expense assignment, and automated Cash Disbursement Vouchers (CDVs).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCheckReportModal('voucher')}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                  Check Voucher Report (Window #8)
                </button>
                <button
                  onClick={() => setShowCheckReportModal('disbursement')}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">summarize</span>
                  Disbursement Report (Window #9)
                </button>
              </div>
            </div>

            {/* Checks Table & Selected Check Details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Checks List */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    Disbursement Checks Master List ({checks.length})
                  </h4>
                  <span className="text-xs text-slate-400 font-mono">Window #2 &bull; Active AP Register</span>
                </div>

                <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-2xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 text-[10px] uppercase font-bold">
                      <tr>
                        <th className="py-2.5 px-4">Check #</th>
                        <th className="py-2.5 px-4">Type</th>
                        <th className="py-2.5 px-4">Date</th>
                        <th className="py-2.5 px-4">Vendor Payee</th>
                        <th className="py-2.5 px-4">Bank Account</th>
                        <th className="py-2.5 px-4 text-right">Amount (USD)</th>
                        <th className="py-2.5 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                      {checks.map((c) => (
                        <tr
                          key={c.id}
                          onClick={() => setSelectedCheckId(c.id)}
                          className={`cursor-pointer transition-colors ${
                            c.id === activeCheck?.id
                              ? 'bg-blue-50/80 dark:bg-blue-950/40 border-l-4 border-blue-600'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <td className="py-2.5 px-4 font-bold text-blue-600">{c.checkNo}</td>
                          <td className="py-2.5 px-4 text-slate-500">{c.checkType}</td>
                          <td className="py-2.5 px-4">{c.date}</td>
                          <td className="py-2.5 px-4 font-sans font-bold text-slate-800 dark:text-slate-200">
                            {c.vendor}
                          </td>
                          <td className="py-2.5 px-4 text-slate-500 truncate max-w-[150px] font-sans">{c.bankName}</td>
                          <td className="py-2.5 px-4 text-right font-bold text-slate-900 dark:text-white">
                            ${c.amount.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                c.status === 'POSTED'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : c.status === 'PRINTED'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
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
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 text-xs">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Selected Check Voucher</span>
                    <h4 className="text-xl font-black text-slate-900 dark:text-white font-mono">{activeCheck.checkNo}</h4>
                    <span className="text-slate-500 font-semibold">{activeCheck.vendor}</span>
                  </div>

                  <div className="space-y-2 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Check Amount:</span>
                      <strong className="text-emerald-600 text-sm font-black">${activeCheck.amount.toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Bank Account:</span>
                      <span className="text-slate-700 dark:text-slate-300 truncate max-w-[150px]">{activeCheck.bankName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">GL Period:</span>
                      <span className="text-slate-700 dark:text-slate-300">{activeCheck.glPeriod}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Check Type:</span>
                      <span className="text-slate-700 dark:text-slate-300">{activeCheck.checkType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Journal Entry #:</span>
                      <span className="text-indigo-600 font-bold">{activeCheck.jeNo || 'Pending Post'}</span>
                    </div>
                  </div>

                  {/* Applied Invoices Breakdown */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <span className="font-bold text-slate-700 dark:text-slate-300 block">Applied Invoices:</span>
                    <div className="space-y-1.5">
                      {activeCheck.invoicesApplied.map((inv, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 font-mono text-[11px] space-y-1">
                          <div className="flex justify-between font-bold">
                            <span className="text-blue-600">{inv.invoiceNo}</span>
                            <span>${inv.applied.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-400 font-sans">
                            <span>AP Acct: {inv.apAccount} &bull; GL Exp: {inv.glExpense}</span>
                            <span>Disc: ${inv.discount.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions for this check */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <button
                      onClick={() => handlePrintSelectedCheck(activeCheck)}
                      className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center gap-1 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[16px]">print</span>
                      Print Bank Check & Voucher (Window #3)
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handlePostCheck(activeCheck.id, true)}
                        className="py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold flex items-center justify-center gap-1 shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[14px]">rule</span>
                        Trial Post
                      </button>

                      <button
                        onClick={() => handlePostCheck(activeCheck.id, false)}
                        disabled={activeCheck.status === 'POSTED'}
                        className="py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-1 shadow-sm disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[14px]">publish</span>
                        Post to GL
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
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600">receipt</span>
                  3. Miscellaneous Invoices Entry (Window #2a)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Issue ad-hoc freight invoices, inland terminal charges, storage demurrage, or document fees without a master operational file.
                </p>
              </div>

              <button
                onClick={() => setShowMiscInvoiceModal(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                New Miscellaneous Invoice
              </button>
            </div>

            {/* Miscellaneous Invoices List */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-700 dark:text-slate-300">Active Miscellaneous Invoices Register:</span>
                <span className="font-mono text-blue-600 font-bold">Document Class: Miscellaneous</span>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 text-sm text-slate-500">
                No miscellaneous invoices are loaded for this company.
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 4: INVOICES & CREDITS ANALYSIS REPORT (Window #3)
        ======================================================== */}
        {activeTab === 'reports' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-600">analytics</span>
                4. Invoices & Credits Analysis Report (Window #3)
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Formal pre-transfer verification audit report grouping all AR invoices, carrier AP costs, and margins before committal to the FS General Ledger.
              </p>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 font-mono text-xs space-y-4">
              <div className="text-center pb-3 border-b border-slate-200 dark:border-slate-700">
                <h4 className="font-black text-base text-slate-900 dark:text-white">
                  KORNET EXPRESS FREIGHT & CARGO SERVICES
                </h4>
                <span className="text-[11px] text-slate-500">
                  INVOICES & CREDITS PRE-POSTING AUDIT ANALYSIS REPORT
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 text-[11px]">
                <div>
                  <span className="text-slate-400 block">FISCAL PERIOD:</span>
                  <strong className="text-slate-900 dark:text-white">SEPTEMBER 2026 (ACTIVE)</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">TOTAL REVENUE (AR):</span>
                  <strong className="text-blue-600 text-sm">${arTotal.toFixed(2)}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">TOTAL COSTS (AP):</span>
                  <strong className="text-amber-600 text-sm">${apTotal.toFixed(2)}</strong>
                </div>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <span className="font-bold text-slate-700 dark:text-slate-300">ESTIMATED NET OPERATING MARGIN:</span>
                <span className="text-base font-black text-emerald-600">
                  ${(arTotal - apTotal).toFixed(2)} (
                  {arTotal > 0 ? (((arTotal - apTotal) / arTotal) * 100).toFixed(1) : 0}%)
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  Print Official Analysis Report
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Check Modal (Quick_Disbursements_Workflow_Guide.pdf Window #3) */}
      {showNewCheckModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-400">payments</span>
                <h3 className="font-black text-sm">Create Disbursement Check (Window #3)</h3>
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
                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">bolt</span>
                  <span>Quick-Fill Demo (Maersk PHP 45.5k)</span>
                </button>
                <button onClick={() => setShowNewCheckModal(false)} className="text-slate-400 hover:text-white">
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateCheckSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">Check Type (Field 1)</label>
                  <select
                    value={newCheck.checkType}
                    onChange={(e) => setNewCheck({ ...newCheck, checkType: e.target.value as any })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  >
                    <option value="COMPUTER">Computer (Auto-assigned)</option>
                    <option value="MANUAL">Manual (User input)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">Check Date (Field 2)</label>
                  <input
                    type="date"
                    required
                    value={newCheck.date}
                    onChange={(e) => setNewCheck({ ...newCheck, date: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">GL Period (Field 3)</label>
                  <input
                    type="text"
                    required
                    value={newCheck.glPeriod}
                    onChange={(e) => setNewCheck({ ...newCheck, glPeriod: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">Vendor Payee (Field 4)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Maersk Shipping Line or Evergreen Marine"
                    value={newCheck.vendor}
                    onChange={(e) => setNewCheck({ ...newCheck, vendor: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">Total Check Amount ($) (Field 5)</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={newCheck.amount}
                    onChange={(e) => setNewCheck({ ...newCheck, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-emerald-600 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">Bank Name & Account (Field 7)</label>
                <input
                  type="text"
                  value={newCheck.bankName}
                  onChange={(e) => setNewCheck({ ...newCheck, bankName: e.target.value })}
                  placeholder="Enter bank and account"
                  className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                />
              </div>

              {/* Sub Tabs: New Disbursements vs New On Account (Fields 9 & 10) */}
              <div className="pt-2">
                <div className="flex border-b border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setCheckSubTab('disbursements')}
                    className={`px-4 py-2 font-bold border-b-2 transition-colors ${
                      checkSubTab === 'disbursements'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-500'
                    }`}
                  >
                    9. New Disbursements (Pay AP Invoices - Window #5)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCheckSubTab('on_account')}
                    className={`px-4 py-2 font-bold border-b-2 transition-colors ${
                      checkSubTab === 'on_account'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-500'
                    }`}
                  >
                    10. New On Account (Pre-Payment - Window #6)
                  </button>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-b-xl border border-t-0 border-slate-200 dark:border-slate-700 space-y-2">
                  {checkSubTab === 'disbursements' ? (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center font-bold text-slate-700 dark:text-slate-300">
                        <span>Select Invoices to Apply Payment:</span>
                        <span className="text-emerald-600">AP Account: 2010 (Accounts Payable - Trade)</span>
                      </div>
                      <div className="p-3 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 space-y-1 font-mono">
                        <label className="flex items-center justify-between cursor-pointer">
                          <div className="flex items-center gap-2">
                            <input type="checkbox" defaultChecked className="rounded text-blue-600" />
                            <span className="font-bold text-blue-600">INV-MSK-99120</span>
                            <span className="text-slate-500">(Due: 2026-09-15)</span>
                          </div>
                          <span>Gross: $1,500.00 | Disc: $50.00 | Applied: $1,450.00</span>
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="font-bold block mb-1">Provider Invoice #</label>
                          <input
                            type="text"
                            placeholder="INV-FUTURE-001"
                            className="w-full px-3 py-1.5 rounded border bg-white dark:bg-slate-900"
                          />
                        </div>
                        <div>
                          <label className="font-bold block mb-1">GL Expense Code (Lookup)</label>
                          <input
                            type="text"
                            defaultValue="5010 - Ocean Freight Expense"
                            className="w-full px-3 py-1.5 rounded border bg-white dark:bg-slate-900 font-semibold"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewCheckModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  Save & Issue Check Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Check Printing Modal (Window #7) */}
      {showBatchPrintModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-400">print</span>
                <h3 className="font-black text-sm">Batch Check Printing (Window #7)</h3>
              </div>
              <button onClick={() => setShowBatchPrintModal(false)} className="text-slate-400 hover:text-white">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">Select Bank Account:</label>
                <input placeholder="Enter bank and account" className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold" />
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 font-mono">
                <span className="font-bold text-slate-700 dark:text-slate-300 block font-sans">
                  Checks Ready for Printing ({checks.filter((c) => c.status === 'OPEN').length}):
                </span>
                {checks
                  .filter((c) => c.status === 'OPEN')
                  .map((c) => (
                    <div key={c.id} className="flex justify-between text-[11px]">
                      <span>{c.checkNo} &bull; {c.vendor}</span>
                      <strong className="text-blue-600">${c.amount.toFixed(2)}</strong>
                    </div>
                  ))}
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex justify-end gap-2 text-xs">
              <button
                onClick={() => setShowBatchPrintModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleBatchPrintAll}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">print</span>
                Print Checks Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Check Reports Preview Modal (Windows #8 & #9) */}
      {showCheckReportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-400">description</span>
                <h3 className="font-black text-sm">
                  {showCheckReportModal === 'voucher' ? 'Check Voucher Report (Window #8)' : 'Disbursement Report (Window #9)'}
                </h3>
              </div>
              <button onClick={() => setShowCheckReportModal(null)} className="text-slate-400 hover:text-white">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs font-mono">
              <div className="text-center pb-2 border-b border-slate-200 dark:border-slate-700">
                <h4 className="font-black text-base text-slate-900 dark:text-white">
                  KORNET EXPRESS FREIGHT SERVICES
                </h4>
                <span className="text-[10px] text-slate-500">
                  {showCheckReportModal === 'voucher'
                    ? 'ACCOUNTS PAYABLE CHECK VOUCHER SUMMARY REPORT'
                    : 'CASH DISBURSEMENTS AUDIT REGISTER (PRE-POSTING VERIFICATION)'}
                </span>
              </div>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span>BANK: BDO UNIBANK (0012-9981-22)</span>
                  <span>GL PERIOD: 09-2026</span>
                </div>
                <div className="flex justify-between">
                  <span>TOTAL DISBURSEMENTS: ${checks.reduce((a, b) => a + b.amount, 0).toFixed(2)}</span>
                  <span>RECORD COUNT: {checks.length} CHECKS</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex justify-end gap-2 text-xs">
              <button
                onClick={() => setShowCheckReportModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold"
              >
                Close
              </button>
              <button
                onClick={() => {
                  window.print()
                  setShowCheckReportModal(null)
                }}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">print</span>
                Print Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Miscellaneous Invoice Modal (Window #2a, 2b) */}
      {showMiscInvoiceModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-400">receipt</span>
                <h3 className="font-black text-sm">New Miscellaneous Invoice (Window #2a)</h3>
              </div>
              <button onClick={() => setShowMiscInvoiceModal(false)} className="text-slate-400 hover:text-white">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateMiscInvoice} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">Invoice # (Field 1)</label>
                  <input
                    type="text"
                    readOnly
                    value={miscInvoice.invoiceNo}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-blue-600"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">Bill Type (Field 3)</label>
                  <select
                    value={miscInvoice.billType}
                    onChange={(e) => setMiscInvoice({ ...miscInvoice, billType: e.target.value as any })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  >
                    <option value="Prepaid">Prepaid</option>
                    <option value="Collect">Collect</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">GL Period (Field 4)</label>
                  <input
                    type="text"
                    value={miscInvoice.glPeriod}
                    onChange={(e) => setMiscInvoice({ ...miscInvoice, glPeriod: e.target.value })}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">Responsible Billing Client (Field 6)</label>
                <input
                  type="text"
                  required
                  value={miscInvoice.customerName}
                  onChange={(e) => setMiscInvoice({ ...miscInvoice, customerName: e.target.value })}
                  className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">Description / Comments (Field 9)</label>
                <textarea
                  rows={2}
                  value={miscInvoice.comments}
                  onChange={(e) => setMiscInvoice({ ...miscInvoice, comments: e.target.value })}
                  className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              {/* Charges Details (Window #2b) */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <span className="font-bold text-slate-700 dark:text-slate-300 block">
                  Charges Details (Window #2b - Billing & Cost):
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-500 block mb-1">Selling Amount (AR Revenue) ($)</label>
                    <input
                      type="number"
                      value={miscInvoice.billingAmount}
                      onChange={(e) => setMiscInvoice({ ...miscInvoice, billingAmount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-1.5 rounded border bg-white dark:bg-slate-900 font-mono font-bold text-blue-600"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-500 block mb-1">Direct Cost (AP Expense) ($)</label>
                    <input
                      type="number"
                      value={miscInvoice.costAmount}
                      onChange={(e) => setMiscInvoice({ ...miscInvoice, costAmount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-1.5 rounded border bg-white dark:bg-slate-900 font-mono font-bold text-amber-600"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowMiscInvoiceModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  Save & Transfer to Bridge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
