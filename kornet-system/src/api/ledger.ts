import { apiDelete, apiGet, apiPatch, apiPost } from './client'

export interface FsEnvelope<T> { data: T; count?: number }
export interface FsListEnvelope<T> { data: T[]; count?: number }
export interface FsSystemInfo { currentMonth?: number; currentYear?: number; begDate?: string; endDate?: string; totalUnposted?: number; companyCode?: string; [key: string]: unknown }
export interface FsAccount { id?: number | string; acctCode: string; acctDesc: string; acctType?: string; groupCode?: string; subGroup?: string; formula: 'DC' | 'CD' | string; openBal?: number; curDebit?: number; curCredit?: number; endBal?: number; glReport?: string; glEffect?: string; schedule?: string; initialize?: string; isActive?: boolean; openingBalance?: number; debitMovement?: number; creditMovement?: number; endingBalance?: number }
export interface FsBank { id: number | string; bankNo: number; bankName: string; bankAddr?: string; bankAcct?: string }
export interface FsSupplier { id: number | string; supNo: number; supName: string; supAddr?: string; supPhone?: string; supFax?: string; supContak?: string }
export interface FsSignatory { id: number | string; signName: string; signTitle?: string; isActive: boolean }
export interface FsVoucherMaster { id?: number | string; jJvNo: string; jCkNo: string; jDate: string; jPayTo?: string; jCkAmt: number; jDesc?: string; bankNo?: number; supNo?: number }
export interface FsVoucherLine { id?: number | string; jCkNo: string; acctCode: string; jCkAmt: number; jDOrC: 'D' | 'C' }
export interface FsJournalLine { id?: number | string; jJvNo: string; jDate: string; acctCode: string; jCkAmt: number; jDOrC: 'D' | 'C' }
export interface FsLedgerLine { acctCode: string; amount: number; dc: 'D' | 'C'; memo?: string }
export interface FsReport { reportType: string; generatedAt: string; periodEnding?: string; data: unknown[]; lines: unknown[]; totalDebit?: number; totalCredit?: number; inBalance?: boolean; totals?: Record<string, number | boolean> }
export interface FsChecklist { tbBalanced: boolean; totalDebit: number; totalCredit: number; unposted: number; counts: Record<string, number>; ok: boolean }

const list = <T>(url: string, params?: Record<string, unknown>) => apiGet<FsListEnvelope<T>>(url, { params })
const one = <T>(url: string, body?: unknown) => apiPost<FsEnvelope<T>>(url, body)

export const ledgerApi = {
  systemInfo: () => apiGet<FsSystemInfo>('/fs/system-info'),
  period: () => apiGet<FsEnvelope<FsSystemInfo>>('/fs/period'),
  accounts: (params?: Record<string, unknown>) => list<FsAccount>('/fs/accounts', params),
  createAccount: (body: Partial<FsAccount>) => one<FsAccount>('/fs/accounts', body),
  updateAccount: (acctCode: string, body: Partial<FsAccount>) => apiPatch<FsEnvelope<FsAccount>>(`/fs/accounts/${encodeURIComponent(acctCode)}`, body),
  deleteAccount: (acctCode: string) => apiDelete(`/fs/accounts/${encodeURIComponent(acctCode)}`),
  banks: () => list<FsBank>('/fs/banks'),
  suppliers: () => list<FsSupplier>('/fs/suppliers'),
  signatories: () => list<FsSignatory>('/fs/signatories'),
  createSignatory: (body: Partial<FsSignatory>) => one<FsSignatory>('/fs/signatories', body),
  updateSignatory: (id: string | number, body: Partial<FsSignatory>) => apiPost<FsEnvelope<FsSignatory>>(`/fs/signatories/${id}`, body),
  putSignatory: (id: string | number, body: Partial<FsSignatory>) => fetchPut<FsEnvelope<FsSignatory>>(`/fs/signatories/${id}`, body),
  deleteSignatory: (id: string | number) => apiDelete(`/fs/signatories/${id}`),
  voucherMasters: (type?: string) => list<FsVoucherMaster>('/fs/vouchers/masters', type ? { type } : undefined),
  voucherLines: (checkNo: string) => list<FsVoucherLine>(`/fs/vouchers/lines/${encodeURIComponent(checkNo)}`),
  createVoucherMaster: (body: Partial<FsVoucherMaster>) => one<FsVoucherMaster>('/fs/vouchers/masters', body),
  updateVoucherMaster: (checkNo: string, body: Partial<FsVoucherMaster>) => fetchPut<FsEnvelope<FsVoucherMaster>>(`/fs/vouchers/masters/${encodeURIComponent(checkNo)}`, body),
  createVoucherLine: (body: Partial<FsVoucherLine>) => one<FsVoucherLine>('/fs/vouchers/lines', body),
  updateVoucherLine: (id: string | number, body: Partial<FsVoucherLine>) => fetchPut<FsEnvelope<FsVoucherLine>>(`/fs/vouchers/lines/${id}`, body),
  deleteVoucherLine: (id: string | number) => apiDelete(`/fs/vouchers/lines/${id}`),
  journal: (kind: string, params?: Record<string, unknown>) => list<FsJournalLine>(`/fs/journals/${kind}`, params),
  createJournalLine: (kind: string, body: Partial<FsJournalLine>) => one<FsJournalLine>(`/fs/journals/${kind}`, body),
  trialJournal: (kind: string, refNo: string) => apiPost<unknown>(`/fs/journals/${kind}/trial`, { refNo }),
  postJournal: (kind: string, refNo: string) => apiPost<unknown>(`/fs/journals/${kind}/post`, { refNo }),
  trialPost: (body: unknown) => apiPost<unknown>('/fs/trial-post', body),
  finalPost: (body: unknown) => apiPost<unknown>('/fs/final-post', body),
  posting: () => apiPost<unknown>('/fs/posting'),
  reverse: (refNo: string, date: string) => apiPost<unknown>('/fs/reverse', { refNo, date }),
  report: (type: string, params?: Record<string, unknown>) => apiGet<FsReport>(`/fs/reports/${type}`, { params }),
  monthEndChecklist: () => apiGet<FsEnvelope<FsChecklist>>('/fs/month-end/checklist'),
  closeMonth: () => apiPost<unknown>('/fs/month-end/close'),
  createBridgeCheck: (body: unknown) => apiPost<unknown>('/fs/bridge/create-check', body),
}

async function fetchPut<T>(url: string, body: unknown): Promise<T> {
  const { api } = await import('./client')
  const res = await api.put<T>(url, body)
  return res.data
}
