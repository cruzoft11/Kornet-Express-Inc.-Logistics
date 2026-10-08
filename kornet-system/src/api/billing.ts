import { apiDelete, apiGet, apiPatch, apiPost } from './client'

export type VatClass = 'VATABLE' | 'ZERO_RATED' | 'EXEMPT' | 'NON_VAT_REIMBURSABLE'
export type BillingStatus = 'DRAFT' | 'POSTED' | 'PARTIAL' | 'PAID' | 'VOID' | 'APPROVED' | 'PRINTED' | 'STAGED' | 'TRIAL_OK' | 'TRIAL_ERROR' | 'REJECTED'

export interface ListEnvelope<T> { data: T[]; total?: number; count?: number; page?: number; pageSize?: number }
export interface Party { id: string; code: string; name: string; address?: string | null; tin?: string | null; isCustomer?: boolean; isVendor?: boolean; withholdingAgent?: boolean; creditTermsDays?: number; active?: boolean }
export interface ShipmentRef { id: string; fileNo: string; mode?: string; direction?: string; billToPartyId?: string | null; shipperName?: string | null; consigneeName?: string | null; customerRef?: string | null }
export interface BillingLine { id?: string; billingCode: string; description: string; qty?: number; unit?: string; rate?: number; amount?: number; amountPhp?: number; vatClass?: VatClass; vatAmountPhp?: number; revenueAccount?: string | null; expenseAccount?: string | null; zeroRatedReason?: string | null; inputVat?: number }
export interface Invoice { id: string; invoiceNo: string; kind: 'INVOICE' | 'CREDIT_MEMO' | 'DEBIT_NOTE'; docClass?: string; shipmentId?: string | null; billToPartyId?: string | null; billToName?: string | null; billToAddress?: string | null; billToTin?: string | null; date: string; dueDate?: string | null; glPeriod?: string | null; currency: string; exchangeRate?: number; freightTerm?: string | null; customerRef?: string | null; poNo?: string | null; vatableSales: number; zeroRatedSales: number; exemptSales: number; reimbursables: number; vatAmount: number; totalAmount: number; ewtRate: number; ewtAmount: number; netReceivable: number; amountPaid: number; balance: number; status: BillingStatus; relatedInvoiceId?: string | null; jeNo?: string | null; postedAt?: string | null; voidReason?: string | null; lines?: BillingLine[] }
export interface ApBill { id: string; billNo: string; vendorPartyId?: string | null; vendorName?: string | null; vendorAddress?: string | null; vendorTin?: string | null; vendorInvoiceNo?: string | null; shipmentId?: string | null; date: string; dueDate?: string | null; glPeriod?: string | null; currency: string; exchangeRate?: number; subtotal: number; inputVat: number; ewtWithheld: number; total: number; amountPaid: number; balance: number; status: BillingStatus; jeNo?: string | null; lines?: BillingLine[] }
export interface ReceiptApplication { id?: string; invoiceId: string; applied: number; ewt?: number; invoice?: Invoice }
export interface ReceiptDoc { id: string; receiptNo: string; partyId?: string | null; partyName?: string | null; date: string; method: 'CASH' | 'CHECK' | 'BANK_TRANSFER' | 'ONLINE'; bankNo?: number | null; checkNo?: string | null; checkDate?: string | null; amount: number; ewtAmount: number; unapplied: number; status: BillingStatus; jeNo?: string | null; applications?: ReceiptApplication[] }
export interface CheckApplication { id?: string; apBillId: string; applied: number; discount?: number; apBill?: ApBill }
export interface CheckExpense { id?: string; account: string; amount: number; memo?: string | null }
export interface CheckDoc { id: string; voucherNo: string; checkNo?: string | null; checkType: 'COMPUTER' | 'MANUAL'; date: string; glPeriod?: string | null; payeePartyId?: string | null; payeeName?: string | null; bankNo?: number | null; currency: string; exchangeRate?: number; amount: number; status: BillingStatus; jeNo?: string | null; postedAt?: string | null; applications?: CheckApplication[]; directExpenses?: CheckExpense[] }
export interface BridgeLine { acctCode: string; dc: 'D' | 'C'; amount: number; memo?: string; fileNo?: string; blNo?: string; containerNo?: string }
export interface BridgeItem { id: string; refNo: string; sourceType: string; sourceId: string; journal: string; date: string; glPeriod?: string | null; party?: string | null; memo?: string | null; linesJson: string; totalDebit: number; totalCredit: number; status: BillingStatus; errorsJson: string; fsJvNo?: string | null; postedAt?: string | null }
export interface AgingBucket { partyId?: string; party: string; current: number; d1_30: number; d31_60: number; d61_90: number; d90Plus: number; total: number; docs: Array<{ id: string; no: string; date: string; dueDate?: string | null; balance: number; days: number }> }

const list = async <T>(resource: string, params?: Record<string, unknown>) => apiGet<ListEnvelope<T>>(`/${resource}`, { params })
const get = async <T>(resource: string, id: string) => apiGet<T>(`/${resource}/${id}`)
const create = async <T>(resource: string, body: unknown) => apiPost<T>(`/${resource}`, body)
const update = async <T>(resource: string, id: string, body: unknown) => apiPatch<T>(`/${resource}/${id}`, body)

export const billingApi = {
  parties: (params?: Record<string, unknown>) => list<Party>('parties', params),
  shipments: (params?: Record<string, unknown>) => list<ShipmentRef>('shipments', params),
  invoices: (params?: Record<string, unknown>) => list<Invoice>('invoices', params),
  invoice: (id: string) => get<Invoice>('invoices', id),
  createInvoice: (body: unknown) => create<Invoice>('invoices', body),
  updateInvoice: (id: string, body: unknown) => update<Invoice>('invoices', id, body),
  deleteInvoice: (id: string) => apiDelete(`/invoices/${id}`),
  postInvoice: (id: string) => apiPost<unknown>(`/invoices/${id}/post`),
  voidInvoice: (id: string, reason: string) => apiPost<unknown>(`/invoices/${id}/void`, { reason }),
  creditMemo: (id: string, lines: Array<{ invoiceLineId: string; amount: number }>) => apiPost<Invoice>(`/invoices/${id}/credit-memo`, { lines }),
  createInvoiceFromShipment: (shipmentId: string) => apiPost<Invoice>(`/shipments/${shipmentId}/invoice`),
  apBills: (params?: Record<string, unknown>) => list<ApBill>('ap-bills', params),
  apBill: (id: string) => get<ApBill>('ap-bills', id),
  createApBill: (body: unknown) => create<ApBill>('ap-bills', body),
  updateApBill: (id: string, body: unknown) => update<ApBill>('ap-bills', id, body),
  postApBill: (id: string) => apiPost<unknown>(`/ap-bills/${id}/post`),
  receipts: (params?: Record<string, unknown>) => list<ReceiptDoc>('receipts', params),
  receipt: (id: string) => get<ReceiptDoc>('receipts', id),
  createReceipt: (body: unknown) => create<ReceiptDoc>('receipts', body),
  updateReceipt: (id: string, body: unknown) => update<ReceiptDoc>('receipts', id, body),
  postReceipt: (id: string) => apiPost<unknown>(`/receipts/${id}/post`),
  checks: (params?: Record<string, unknown>) => list<CheckDoc>('checks', params),
  check: (id: string) => get<CheckDoc>('checks', id),
  createCheck: (body: unknown) => create<CheckDoc>('checks', body),
  updateCheck: (id: string, body: unknown) => update<CheckDoc>('checks', id, body),
  approveCheck: (id: string) => apiPost<CheckDoc>(`/checks/${id}/approve`),
  printCheck: (id: string) => apiPost<CheckDoc>(`/checks/${id}/print`),
  postCheck: (id: string) => apiPost<unknown>(`/checks/${id}/post`),
  bridge: (status?: string) => apiGet<ListEnvelope<BridgeItem>>('/bridge', { params: status ? { status } : undefined }),
  trialBridge: (ids: string[]) => apiPost<{ data: unknown[] }>('/bridge/trial-post', { ids }),
  postBridge: (ids: string[]) => apiPost<{ data: unknown[] }>('/bridge/post', { ids }),
  rejectBridge: (id: string, reason: string) => apiPost<BridgeItem>(`/bridge/${id}/reject`, { reason }),
}

function daysPastDue(due?: string | null) { if (!due) return 0; return Math.max(0, Math.floor((Date.now() - new Date(due).getTime()) / 86400000)) }
export function buildArAging(invoices: Invoice[]): AgingBucket[] {
  const map = new Map<string, AgingBucket>()
  invoices.filter((i) => i.balance > 0 && i.status !== 'VOID').forEach((i) => {
    const key = i.billToPartyId || i.billToName || 'Unassigned customer'
    const b = map.get(key) || { partyId: i.billToPartyId || undefined, party: i.billToName || 'Unassigned customer', current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90Plus: 0, total: 0, docs: [] }
    const days = daysPastDue(i.dueDate); const amount = Number(i.balance || 0)
    if (days <= 0) b.current += amount; else if (days <= 30) b.d1_30 += amount; else if (days <= 60) b.d31_60 += amount; else if (days <= 90) b.d61_90 += amount; else b.d90Plus += amount
    b.total += amount; b.docs.push({ id: i.id, no: i.invoiceNo, date: i.date, dueDate: i.dueDate, balance: amount, days })
    map.set(key, b)
  })
  return [...map.values()].sort((a, b) => b.total - a.total)
}
export function buildApAging(bills: ApBill[]): AgingBucket[] {
  const map = new Map<string, AgingBucket>()
  bills.filter((i) => i.balance > 0 && i.status !== 'VOID').forEach((i) => {
    const key = i.vendorPartyId || i.vendorName || 'Unassigned vendor'
    const b = map.get(key) || { partyId: i.vendorPartyId || undefined, party: i.vendorName || 'Unassigned vendor', current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90Plus: 0, total: 0, docs: [] }
    const days = daysPastDue(i.dueDate); const amount = Number(i.balance || 0)
    if (days <= 0) b.current += amount; else if (days <= 30) b.d1_30 += amount; else if (days <= 60) b.d31_60 += amount; else if (days <= 90) b.d61_90 += amount; else b.d90Plus += amount
    b.total += amount; b.docs.push({ id: i.id, no: i.billNo, date: i.date, dueDate: i.dueDate, balance: amount, days })
    map.set(key, b)
  })
  return [...map.values()].sort((a, b) => b.total - a.total)
}
