import { apiDelete, apiGet, apiPatch, apiPost } from './client'
import type { PageResult, ListParams } from './pd'
export interface Driver { id: string; companyCode?: string; name: string; licenseNo?: string | null; phone?: string | null; plateHint?: string | null; status: string; createdAt?: string; updatedAt?: string }
export interface FleetVehicle { id: string; companyCode?: string; plateNo: string; type?: string | null; make?: string | null; capacity?: string | null; status: string; createdAt?: string; updatedAt?: string }
export interface DispatchRoute { id: string; companyCode?: string; routeNo: string; stage: string; origin?: string | null; destination?: string | null; driverName?: string | null; vehiclePlate?: string | null; cargoRef?: string | null; scheduledAt?: string | null; podSignature?: string | null; podSignedBy?: string | null; podSignedAt?: string | null; stops?: string; remarks?: string | null; createdAt?: string; updatedAt?: string }
export type DriverInput = Partial<Omit<Driver, 'id' | 'companyCode' | 'createdAt' | 'updatedAt'>>
export type FleetVehicleInput = Partial<Omit<FleetVehicle, 'id' | 'companyCode' | 'createdAt' | 'updatedAt'>>
export type DispatchRouteInput = Partial<Omit<DispatchRoute, 'id' | 'companyCode' | 'createdAt' | 'updatedAt'>>
export const fleetApi = {
  drivers(params: ListParams = {}) { return apiGet<PageResult<Driver>>('/drivers', { params: { pageSize: 200, ...params } }) },
  createDriver(input: DriverInput) { return apiPost<Driver>('/drivers', input) },
  updateDriver(id: string, input: DriverInput) { return apiPatch<Driver>(`/drivers/${id}`, input) },
  removeDriver(id: string) { return apiDelete(`/drivers/${id}`) },
  vehicles(params: ListParams = {}) { return apiGet<PageResult<FleetVehicle>>('/fleet-vehicles', { params: { pageSize: 200, ...params } }) },
  createVehicle(input: FleetVehicleInput) { return apiPost<FleetVehicle>('/fleet-vehicles', input) },
  updateVehicle(id: string, input: FleetVehicleInput) { return apiPatch<FleetVehicle>(`/fleet-vehicles/${id}`, input) },
  removeVehicle(id: string) { return apiDelete(`/fleet-vehicles/${id}`) },
  routes(params: ListParams = {}) { return apiGet<PageResult<DispatchRoute>>('/dispatch-routes', { params: { pageSize: 200, ...params } }) },
  createRoute(input: DispatchRouteInput) { return apiPost<DispatchRoute>('/dispatch-routes', input) },
  updateRoute(id: string, input: DispatchRouteInput) { return apiPatch<DispatchRoute>(`/dispatch-routes/${id}`, input) },
  removeRoute(id: string) { return apiDelete(`/dispatch-routes/${id}`) },
}
