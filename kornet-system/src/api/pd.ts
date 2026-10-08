import { apiDelete, apiGet, apiPatch, apiPost } from './client'

export interface PageResult<T> { data: T[]; total: number; page: number; pageSize: number }
export interface ListParams { q?: string; page?: number; pageSize?: number; status?: string; type?: string; dateFrom?: string; dateTo?: string; dateField?: string; include?: 'relations'; [key: string]: string | number | undefined }

export interface CargoLine { id?: string; lineNo?: number; pieces?: number; packageType?: string | null; description?: string | null; marks?: string | null; lengthCm?: number; widthCm?: number; heightCm?: number; grossKg?: number; cbm?: number; vehicleId?: string | null }
export interface ChargeLine { id?: string; billingCode?: string; description?: string; unit?: string; qty?: number; rate?: number; amount?: number; currency?: string; vatClass?: string; status?: string; notes?: string | null }
export interface PdOrder {
  id: string; companyCode?: string; orderNo: string; type: string; status: string; date?: string; warehouse?: string | null; division?: string | null; shipmentId?: string | null; quoteNo?: string | null; shippingInstructionNo?: string | null; thirdPartyPartyId?: string | null; shipperPartyId?: string | null; shipperName?: string | null; shipperContact?: string | null; shipperPhone?: string | null; consigneePartyId?: string | null; consigneeName?: string | null; consigneeContact?: string | null; consigneePhone?: string | null; originAddr?: string | null; destAddr?: string | null; readyAt?: string | null; closeAt?: string | null; deliverBy?: string | null; arrivedAt?: string | null; departedAt?: string | null; deliveredAt?: string | null; carrierPartyId?: string | null; driverId?: string | null; fleetVehicleId?: string | null; routeId?: string | null; equipmentType?: string | null; loadNumber?: string | null; trackingNo?: string | null; declaredValue?: number; insuredValue?: number; currency?: string; cod?: boolean; codAmount?: number; hazardous?: boolean; instructions?: string | null; marks?: string | null; podSignedBy?: string | null; signatureDataUrl?: string | null; podAt?: string | null; containerDetails?: string | null; linkedVehiclesJson?: string; cargoLines?: CargoLine[]; charges?: ChargeLine[]; createdAt?: string; updatedAt?: string
}
export type PdOrderInput = Partial<PdOrder>
export interface Driver { id: string; name: string; licenseNo?: string | null; phone?: string | null; status: string }
export interface FleetVehicle { id: string; plateNo: string; type?: string | null; make?: string | null; capacity?: string | null; status: string }
export interface StatusEvent { id: string; entityType: string; entityId: string; code: string; subStatus?: string | null; location?: string | null; eventAt: string; notes?: string | null; isPublic?: boolean; source?: string }

function compact<T extends Record<string, unknown>>(obj: T): T { return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== '')) as T }

export const pdApi = {
  list(params: ListParams = {}) { return apiGet<PageResult<PdOrder>>('/pd-orders', { params: compact({ ...params, include: params.include ?? 'relations' }) }) },
  get(id: string) { return apiGet<PdOrder>(`/pd-orders/${id}`, { params: { include: 'relations' } }) },
  create(input: PdOrderInput) { return apiPost<PdOrder>('/pd-orders', input) },
  update(id: string, input: PdOrderInput) { return apiPatch<PdOrder>(`/pd-orders/${id}`, input) },
  remove(id: string) { return apiDelete(`/pd-orders/${id}`) },
  dispatch(id: string, body: { driverId: string; fleetVehicleId: string; routeId?: string }) { return apiPost<PdOrder>(`/pd-orders/${id}/dispatch`, body) },
  complete(id: string, body: { signedBy: string; signatureDataUrl?: string; remarks?: string; podAt?: string }) { return apiPost<PdOrder>(`/pd-orders/${id}/complete`, body) },
  cancel(id: string, reason: string) { return apiPost<PdOrder>(`/pd-orders/${id}/cancel`, { reason }) },
  drivers() { return apiGet<PageResult<Driver>>('/drivers', { params: { pageSize: 200 } }) },
  fleetVehicles() { return apiGet<PageResult<FleetVehicle>>('/fleet-vehicles', { params: { pageSize: 200 } }) },
  statusEvents(entityId: string) { return apiGet<{ data: StatusEvent[] }>('/status-events', { params: { entityType: 'PD_ORDER', entityId } }) },
  lookupShipments(q: string) { return apiGet<{ data: Array<{ id: string; fileNo?: string; bookingNo?: string; customerRef?: string; status?: string }> }>('/shipments', { params: { q, pageSize: 20 } }) },
  lookupParties(q: string, role?: string) { return apiGet<{ data: Array<{ id: string; code?: string; name: string; address?: string; phone?: string; contactName?: string }> }>('/lookups/search', { params: compact({ type: 'party', q, role }) }) },
}
