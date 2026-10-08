import { apiDelete, apiGet, apiPatch, apiPost } from './client'

export interface Page<T> { data: T[]; total?: number; page?: number; pageSize?: number }
export interface Party { id: string; code?: string; name: string; tin?: string | null; email?: string | null; phone?: string | null; contactName?: string | null; address?: string | null; city?: string | null; province?: string | null; country?: string; currency?: string; active?: boolean; vatRegistered?: boolean; withholdingAgent?: boolean; creditTermsDays?: number; creditLimit?: number; iataCode?: string | null; scac?: string | null; arAccount?: string | null; apAccount?: string | null; isCustomer?: boolean; isVendor?: boolean; isShipper?: boolean; isConsignee?: boolean; isAgent?: boolean; isBroker?: boolean; isCarrier?: boolean; isWarehouse?: boolean; isTrucker?: boolean; notes?: string | null }
export interface Port { id: string; code: string; unlocode?: string | null; name: string; country?: string; kind?: string; iata?: string | null }
export interface BillingCode { id: string; code: string; description: string; category?: string; modes?: string; defaultUnit?: string; defaultRate?: number; defaultCost?: number; currency?: string; vatClass?: string; revenueAccount?: string | null; costAccount?: string | null; active?: boolean; showOnDoc?: boolean }
export interface Tariff { id: string; billingCode: string; mode: string; direction?: string; originPortCode?: string | null; destPortCode?: string | null; carrierPartyId?: string | null; customerPartyId?: string | null; equipmentType?: string | null; unit: string; sellRate?: number; buyRate?: number; minSell?: number; minBuy?: number; currency?: string; validFrom?: string; validTo?: string | null; active?: boolean; vendorPartyId?: string | null }
export interface FsAccount { acctCode: string; acctDesc: string; formula?: string; isActive?: boolean }

function service<T>(resource: string) {
  return {
    list: (params?: Record<string, unknown>) => apiGet<Page<T>>(`/${resource}`, { params }),
    get: (id: string) => apiGet<T>(`/${resource}/${id}`),
    create: (body: Partial<T>) => apiPost<T>(`/${resource}`, body),
    update: (id: string, body: Partial<T>) => apiPatch<T>(`/${resource}/${id}`, body),
    remove: (id: string) => apiDelete(`/${resource}/${id}`),
  }
}

export const partiesApi = service<Party>('parties')
export const portsApi = service<Port>('ports')
export const billingCodesApi = service<BillingCode>('billing-codes')
export const tariffsApi = service<Tariff>('tariffs')
export function listFsAccounts() { return apiGet<{ data: FsAccount[] }>('/fs/accounts') }
export function listFsSuppliers() { return apiGet<{ data: Array<{ id: string | number; supNo?: number; supName?: string }> }>('/fs/suppliers') }
