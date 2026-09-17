import { api } from './client'
import type {
  Paginated,
  Shipment,
  Vehicle,
  PdOrder,
  Quote,
  Driver,
  FleetVehicle,
  DispatchRoute,
  CheckDisbursement,
  BridgeItem,
  TrackingItem,
  WebAccount,
  Carrier,
  Port,
  BillingCode,
  Attachment,
  Integration,
  AuditLog,
  Company,
} from './types'

export interface ListParams {
  q?: string
  page?: number
  pageSize?: number
  entity?: string
}

export interface CrudService<T> {
  resource: string
  list: (params?: ListParams) => Promise<Paginated<T>>
  get: (id: string) => Promise<T>
  create: (body: Partial<T>) => Promise<T>
  update: (id: string, body: Partial<T>) => Promise<T>
  remove: (id: string) => Promise<void>
}

export function createService<T>(resource: string): CrudService<T> {
  return {
    resource,
    async list(params?: ListParams) {
      const res = await api.get<Paginated<T>>(`/${resource}`, { params })
      return res.data
    },
    async get(id: string) {
      const res = await api.get<T>(`/${resource}/${id}`)
      return res.data
    },
    async create(body: Partial<T>) {
      const res = await api.post<T>(`/${resource}`, body)
      return res.data
    },
    async update(id: string, body: Partial<T>) {
      const res = await api.patch<T>(`/${resource}/${id}`, body)
      return res.data
    },
    async remove(id: string) {
      await api.delete(`/${resource}/${id}`)
    },
  }
}

export const shipmentsService = createService<Shipment>('shipments')
export const vehiclesService = createService<Vehicle>('vehicles')
export const pdOrdersService = createService<PdOrder>('pd-orders')
export const quotesService = createService<Quote>('quotes')
export const driversService = createService<Driver>('drivers')
export const fleetVehiclesService = createService<FleetVehicle>('fleet-vehicles')
export const dispatchRoutesService = createService<DispatchRoute>('dispatch-routes')
export const checksService = createService<CheckDisbursement>('checks')
export const bridgeItemsService = createService<BridgeItem>('bridge-items')
export const trackingService = createService<TrackingItem>('tracking')
export const webAccountsService = createService<WebAccount>('web-accounts')
export const carriersService = createService<Carrier>('carriers')
export const portsService = createService<Port>('ports')
export const billingCodesService = createService<BillingCode>('billing-codes')
export const attachmentsService = createService<Attachment>('attachments')
export const integrationsService = createService<Integration>('integrations')

// Read-only / specialized
export const auditService = {
  resource: 'audit-logs',
  async list(params?: ListParams) {
    const res = await api.get<Paginated<AuditLog>>('/audit-logs', { params })
    return res.data
  },
}

export const companiesService = {
  async list() {
    const res = await api.get<{ data: Company[] }>('/companies')
    return res.data.data
  },
}

export interface SupportTicketInput {
  name: string
  email?: string
  subject: string
  message: string
}
export const supportService = {
  async submit(body: SupportTicketInput) {
    const res = await api.post<{ id: string; status: string }>('/support', body)
    return res.data
  },
}
