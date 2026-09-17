import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import PageHeader from '../PageHeader'



interface AdvanceCheck {
  id: number
  jJvNo: string
  jCkNo: string
  jDate: string
  jPayTo: string
  jCkAmt: number
  jDesc: string
}

function formatToYmd(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) {
    const match = dateStr.match(/^(\d{4}-\d{2}-\d{2})/)
    return match ? match[1] : dateStr
  }
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function FSTransferAdvanceCDB() {
  const [isTransferring, setIsTransferring] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [advanceChecks, setAdvanceChecks] = useState<AdvanceCheck[]>([])
  const [loading, setLoading] = useState(true)
  
  // Date range filters
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  
  const navigate = useNavigate()

  const fetchAdvanceChecks = async () => {
    try {
      const resp = await axios.get('/api/fs/advance-checks')
      setAdvanceChecks(resp.data || [])
    } catch (err) {
      console.error('Failed to load advance checks', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const fetchSystemInfo = async () => {
      try {
        const resp = await axios.get('/api/fs/system-info')
        if (resp.data) {
          if (resp.data.begDate) setFromDate(formatToYmd(resp.data.begDate))
          else if (resp.data.BegDate) setFromDate(formatToYmd(resp.data.BegDate))
          
          if (resp.data.endDate) setToDate(formatToYmd(resp.data.endDate))
          else if (resp.data.EndDate) setToDate(formatToYmd(resp.data.EndDate))
        }
      } catch (err) {
        console.error('Failed to load system info', err)
      }
    }
    fetchSystemInfo()
    fetchAdvanceChecks()
  }, [])

  const handleTransfer = async () => {
    setIsTransferring(true)
    setResult(null)
    try {
      const resp = await axios.post(`/api/fs/transfer-advance-cdb?fromDate=${fromDate}&toDate=${toDate}`)
      setResult(resp.data?.message || 'Transfer complete.')
      await fetchAdvanceChecks()
    } catch (err: any) {
      setResult(err.response?.data?.error || err.message || 'Transfer failed.')
    } finally {
      setIsTransferring(false)
    }
  }

  // Filter logic
  const filteredChecks = advanceChecks.filter(c => {
    if (!fromDate && !toDate) return true // Show all if no filter
    const checkDate = formatToYmd(c.jDate)
    if (fromDate && checkDate < fromDate) return false
    if (toDate && checkDate > toDate) return false
    return true
  })

  const totalFilteredAmt = filteredChecks.reduce((sum, c) => sum + c.jCkAmt, 0)
  const isFail = result?.toLowerCase().includes('fail')

  return (
    <div className="flex flex-col gap-6 max-w-[900px] mx-auto w-full">
      <PageHeader
        title="Transfer Advance CDB"
        subtitle="Move advance CDB vouchers into the current period."
        breadcrumb="PROCESSING / TRANSFER ADVANCE CDB"
      />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Settings & Filter Panel */}
        <div className="md:col-span-1 bg-surface border border-outline-variant/30 rounded-xl shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="p-6 flex flex-col gap-4">
            <h3 className="font-bold text-base text-on-surface">Transfer Filter</h3>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-on-surface-variant mb-1 block">From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={e => setFromDate(e.target.value)}
                  className="w-full h-10 px-3 text-sm border border-outline-variant/50 rounded-lg focus:border-primary outline-none bg-surface-container"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-on-surface-variant mb-1 block">To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={e => setToDate(e.target.value)}
                  className="w-full h-10 px-3 text-sm border border-outline-variant/50 rounded-lg focus:border-primary outline-none bg-surface-container"
                />
              </div>
            </div>

            {/* Quick Indicators */}
            <div className="mt-4 p-4 rounded-xl bg-surface-container flex flex-col gap-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant">In Date Range:</span>
                <span className="font-bold text-primary">{filteredChecks.length} checks</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-on-surface-variant">Total Amount:</span>
                <span className="font-bold text-on-surface">
                  {totalFilteredAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-outline-variant/30 pt-2 text-xs">
                <span className="text-on-surface-variant">Total Outstanding ADV:</span>
                <span className="font-semibold">{advanceChecks.length}</span>
              </div>
            </div>

            {result && (
              <div className={`px-4 py-3 rounded-lg border text-sm font-semibold flex items-center gap-2 ${
                isFail
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                <span className="material-symbols-outlined text-[18px]">
                  {isFail ? 'error' : 'check_circle'}
                </span>
                <span className="line-clamp-2">{result}</span>
              </div>
            )}
          </div>
          
          <div className="p-6 bg-surface-container/30 border-t border-outline-variant/30 flex gap-3">
            <button
              className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg font-bold text-sm shadow-sm hover:bg-primary/90 transition-all disabled:opacity-50"
              onClick={handleTransfer}
              disabled={isTransferring || filteredChecks.length === 0}
            >
              {isTransferring ? 'Transferring...' : 'Transfer Filtered'}
            </button>
            <button
              className="px-4 py-2.5 text-on-surface-variant border border-outline-variant/30 rounded-lg font-bold text-sm hover:bg-surface-container transition-colors"
              onClick={() => navigate(-1)}
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="md:col-span-2 bg-surface border border-outline-variant/30 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container/20">
            <span className="font-bold text-sm text-on-surface">Voucher Preview ({filteredChecks.length} matched / {advanceChecks.length} total)</span>
          </div>
          <div className="flex-1 overflow-auto max-h-[400px]">
            {loading ? (
              <div className="p-12 text-center text-on-surface-variant text-sm">Loading advance checks...</div>
            ) : advanceChecks.length === 0 ? (
              <div className="p-12 text-center text-on-surface-variant text-sm">No advance checks currently in database.</div>
            ) : (
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-surface-container border-b border-outline-variant/30 text-on-surface-variant font-semibold">
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5">JV / Check No</th>
                    <th className="px-4 py-2.5">Payee</th>
                    <th className="px-4 py-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {advanceChecks.map(c => {
                    const isMatched = filteredChecks.some(fc => fc.id === c.id)
                    return (
                      <tr
                        key={c.id}
                        className={`border-b border-outline-variant/10 hover:bg-surface-container/10 transition-colors ${
                          isMatched ? 'bg-primary/5 font-medium' : 'opacity-40'
                        }`}
                      >
                        <td className="px-4 py-3 font-mono">{formatToYmd(c.jDate)}</td>
                        <td className="px-4 py-3 font-mono">
                          <div className="text-xs text-on-surface-variant">{c.jJvNo}</div>
                          <div>{c.jCkNo}</div>
                        </td>
                        <td className="px-4 py-3 truncate max-w-[200px]" title={c.jPayTo}>{c.jPayTo}</td>
                        <td className="px-4 py-3 text-right font-mono font-semibold">
                          {c.jCkAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
