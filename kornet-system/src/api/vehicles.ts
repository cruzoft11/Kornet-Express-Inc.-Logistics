import { apiDelete, apiGet, apiPatch, apiPost } from './client'
import type { PageResult, ListParams, StatusEvent } from './pd'

export interface Vehicle {
  id: string; wrNo?: string | null; date?: string; division?: string | null; mode?: string; status: string; hold?: boolean; priorStatus?: string | null; vin: string; year?: number | null; make?: string | null; model?: string | null; trim?: string | null; body?: string | null; bodyClass?: string | null; color?: string | null; engine?: string | null; fuel?: string | null; type?: string | null; condition?: string | null; keys?: string | null; odometer?: number | null; decodedJson?: string | null; shipperTentative?: boolean; destinationTentative?: boolean; lienReleaseRequired?: boolean; lienReleaseReceived?: boolean; titleReceived?: boolean; titleNumber?: string | null; titleState?: string | null; titleReceivedDate?: string | null; titleByMail?: boolean; docsExist?: boolean; inspectionNo?: string | null; inspectionDate?: string | null; inspectedBy?: string | null; shipperPartyId?: string | null; shipperName?: string | null; consigneePartyId?: string | null; consigneeName?: string | null; thirdPartyPartyId?: string | null; originCode?: string | null; finalDestination?: string | null; warehouse?: string | null; location?: string | null; bin?: string | null; lengthCm?: number; widthCm?: number; heightCm?: number; grossKg?: number; cbm?: number; loadingInstructions?: string | null; shippingInstructionNo?: string | null; bookingNo?: string | null; shipmentId?: string | null; transportDocId?: string | null; containerId?: string | null; titleRejectedSent?: string | null; titleRejectedReceived?: string | null; temporalRelease?: boolean; withdrawnAt?: string | null; createdAt?: string; updatedAt?: string
}
export type VehicleInput = Partial<Vehicle>
export interface VinDecodeResult { vin: string; year?: number | null; make?: string | null; model?: string | null; trim?: string | null; body?: string | null; bodyClass?: string | null; engine?: string | null; fuel?: string | null; warning?: string | null; warnings?: string[]; raw?: unknown }
export interface ContainerOption { id: string; containerNo: string; status?: string; shipmentId?: string | null }
function compact<T extends Record<string, unknown>>(obj: T): T { return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== '')) as T }
export const vehiclesApi = {
  list(params: ListParams = {}) { return apiGet<PageResult<Vehicle>>('/vehicles', { params: compact(params) }) },
  get(id: string) { return apiGet<Vehicle>(`/vehicles/${id}`) },
  create(input: VehicleInput) { return apiPost<Vehicle>('/vehicles', input) },
  update(id: string, input: VehicleInput) { return apiPatch<Vehicle>(`/vehicles/${id}`, input) },
  remove(id: string) { return apiDelete(`/vehicles/${id}`) },
  decodeVin(vin: string) { return apiGet<VinDecodeResult>(`/vin/decode/${encodeURIComponent(vin.toUpperCase())}`) },
  action(id: string, action: 'receive' | 'inspect' | 'hold' | 'release-hold' | 'ready' | 'force-ready' | 'temporal-release' | 'undo-temporal-release' | 'withdraw' | 'link-to-container' | 'title-rejected', body?: Record<string, unknown>) { return apiPost<Vehicle>(`/vehicles/${id}/${action}`, body ?? {}) },
  statusEvents(entityId: string) { return apiGet<{ data: StatusEvent[] }>('/status-events', { params: { entityType: 'VEHICLE', entityId } }) },
  containers(q = '') { return apiGet<PageResult<ContainerOption>>('/containers', { params: { q, pageSize: 100 } }) },
}
