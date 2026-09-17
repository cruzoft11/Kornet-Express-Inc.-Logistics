import { useState, useEffect } from 'react'
import axios from 'axios'

const API_BASE = '/api/fs'

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

interface SystemInfo {
  currentMonth: number
  currentYear: number
  begDate: string
  endDate: string
  unpostedChecks: number
  unpostedCashReceipts: number
  unpostedSalesBook: number
  unpostedJournals: number
  unpostedPurchaseBook: number
  unpostedAdjustments: number
  totalUnposted: number
}

const STATUS_ROWS: { key: keyof SystemInfo; label: string }[] = [
  { key: 'unpostedChecks',       label: 'Check Disbursement Vouchers' },
  { key: 'unpostedCashReceipts', label: 'Cash Receipts' },
  { key: 'unpostedSalesBook',    label: 'Sales Book' },
  { key: 'unpostedJournals',     label: 'Journal Vouchers' },
  { key: 'unpostedPurchaseBook', label: 'Purchase Book' },
  { key: 'unpostedAdjustments',  label: 'Adjustments' },
]

export default function FSMainMenu() {
  const [info, setInfo] = useState<SystemInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error] = useState('')

  useEffect(() => {
    axios.get(`${API_BASE}/system-info`)
      .then(r => {
        const d = r.data?.data ?? r.data
        setInfo({
          currentMonth:         d.currentMonth        ?? d.current_month          ?? 0,
          currentYear:          d.currentYear         ?? d.current_year           ?? 0,
          begDate:              d.begDate             ?? d.beg_date               ?? '',
          endDate:              d.endDate             ?? d.end_date               ?? '',
          unpostedChecks:       d.unpostedChecks      ?? d.unposted_checks        ?? 0,
          unpostedCashReceipts: d.unpostedCashReceipts?? d.unposted_cash_receipts ?? 0,
          unpostedSalesBook:    d.unpostedSalesBook   ?? d.unposted_sales_book    ?? 0,
          unpostedJournals:     d.unpostedJournals    ?? d.unposted_journals      ?? 0,
          unpostedPurchaseBook: d.unpostedPurchaseBook?? d.unposted_purchase_book ?? 0,
          unpostedAdjustments:  d.unpostedAdjustments ?? d.unposted_adjustments   ?? 0,
          totalUnposted:        d.totalUnposted       ?? d.total_unposted         ?? 0,
        })
      })
      .catch(() => {
        const now = new Date()
        setInfo({
          currentMonth: now.getMonth() + 1,
          currentYear: now.getFullYear(),
          begDate: `${now.getFullYear()}-01-01`,
          endDate: `${now.getFullYear()}-12-31`,
          unpostedChecks: 0,
          unpostedCashReceipts: 0,
          unpostedSalesBook: 0,
          unpostedJournals: 0,
          unpostedPurchaseBook: 0,
          unpostedAdjustments: 0,
          totalUnposted: 0,
        })
      })
      .finally(() => setLoading(false))
  }, [])

  const periodLabel = info
    ? `${MONTH_NAMES[info.currentMonth] ?? info.currentMonth} ${info.currentYear}`
    : '—'

  const totalUnposted = info?.totalUnposted ?? 0

  return (
    <div className="card" style={{ maxWidth: 900 }}>
      {/* ── Page heading ── */}
      <div style={{ marginBottom: 20, paddingBottom: 14, borderBottom: '2px solid var(--border)' }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>
          Financial Statements
        </h2>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
          Select a command from the ribbon above to begin data entry, queries, or reports.
        </p>
      </div>

      {error && (
        <div style={{
          padding: '8px 12px', background: 'rgba(196,43,28,0.06)',
          border: '1px solid rgba(196,43,28,0.25)',
          borderLeft: '3px solid var(--error)',
          borderRadius: 'var(--radius)', marginBottom: 16, fontSize: 12, color: 'var(--error)'
        }}>
          {error}
        </div>
      )}

      <div className="grid-2">
        {/* ── Quick actions ── */}
        <div className="info-card">
          <h4>Quick Actions</h4>
          <ul className="feature-list">
            <li>Enter vouchers and journals from the ribbon</li>
            <li>Post transactions to chart of accounts</li>
            <li>Generate financial statements</li>
            <li>Perform month-end close</li>
            <li>Maintain chart of accounts</li>
          </ul>
        </div>

        {/* ── System status ── */}
        <div className="info-card">
          <h4>
            Unposted Transactions
            {!loading && (
              <span style={{ float: 'right', fontWeight: 400 }}>
                {totalUnposted > 0
                  ? <span className="badge badge-warning">{totalUnposted} pending</span>
                  : <span className="badge badge-success">All posted</span>
                }
              </span>
            )}
          </h4>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              {[1,2,3,4].map(i => (
                <div key={i} className="skeleton" style={{ height: 16, borderRadius: 2 }} />
              ))}
            </div>
          ) : (
            <>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '6px 8px', background: 'rgba(15,91,102,0.04)',
                borderRadius: 'var(--radius)', marginBottom: 6,
                fontSize: 12, fontWeight: 600
              }}>
                <span>Current Period:</span>
                <span style={{ color: 'var(--primary)' }}>{periodLabel}</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <tbody>
                  {STATUS_ROWS.map(({ key, label }) => {
                    const val = (info?.[key] as number) ?? 0
                    return (
                      <tr key={key} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '5px 4px', color: 'var(--text-secondary)' }}>{label}</td>
                        <td style={{
                          padding: '5px 4px', textAlign: 'right',
                          fontFamily: 'Consolas, monospace',
                          color: val > 0 ? 'var(--warning)' : 'var(--text-muted)',
                          fontWeight: val > 0 ? 700 : 400
                        }}>
                          {val}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
