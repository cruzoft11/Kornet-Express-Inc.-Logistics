import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query'
import { useCompanyStore } from '../stores/companyStore'
import {
  createService,
  type CrudService,
  type ListParams,
  shipmentsService,
  vehiclesService,
  pdOrdersService,
  quotesService,
  driversService,
  fleetVehiclesService,
  dispatchRoutesService,
  checksService,
  bridgeItemsService,
  trackingService,
  webAccountsService,
  carriersService,
  portsService,
  billingCodesService,
  attachmentsService,
  integrationsService,
} from './services'
import type { Paginated } from './types'

/**
 * Build a set of react-query hooks for a CRUD service. Query keys include the
 * active company code so switching tenants automatically refetches.
 */
export function crudHooks<T extends { id: string }>(service: CrudService<T>) {
  const base = service.resource

  function useList(params?: ListParams, options?: Partial<UseQueryOptions<Paginated<T>>>) {
    const company = useCompanyStore((s) => s.selectedCompanyCode)
    return useQuery({
      queryKey: [base, company, 'list', params ?? {}],
      queryFn: () => service.list(params),
      ...options,
    })
  }

  function useItem(id: string | undefined, options?: Partial<UseQueryOptions<T>>) {
    const company = useCompanyStore((s) => s.selectedCompanyCode)
    return useQuery({
      queryKey: [base, company, 'item', id],
      queryFn: () => service.get(id as string),
      enabled: !!id,
      ...options,
    })
  }

  function useCreate() {
    const qc = useQueryClient()
    const company = useCompanyStore((s) => s.selectedCompanyCode)
    return useMutation({
      mutationFn: (body: Partial<T>) => service.create(body),
      onSuccess: () => qc.invalidateQueries({ queryKey: [base, company] }),
    })
  }

  function useUpdate() {
    const qc = useQueryClient()
    const company = useCompanyStore((s) => s.selectedCompanyCode)
    return useMutation({
      mutationFn: ({ id, body }: { id: string; body: Partial<T> }) => service.update(id, body),
      onSuccess: () => qc.invalidateQueries({ queryKey: [base, company] }),
    })
  }

  function useRemove() {
    const qc = useQueryClient()
    const company = useCompanyStore((s) => s.selectedCompanyCode)
    return useMutation({
      mutationFn: (id: string) => service.remove(id),
      onSuccess: () => qc.invalidateQueries({ queryKey: [base, company] }),
    })
  }

  return { useList, useItem, useCreate, useUpdate, useRemove }
}

export const shipmentHooks = crudHooks(shipmentsService)
export const vehicleHooks = crudHooks(vehiclesService)
export const pdOrderHooks = crudHooks(pdOrdersService)
export const quoteHooks = crudHooks(quotesService)
export const driverHooks = crudHooks(driversService)
export const fleetVehicleHooks = crudHooks(fleetVehiclesService)
export const dispatchRouteHooks = crudHooks(dispatchRoutesService)
export const checkHooks = crudHooks(checksService)
export const bridgeItemHooks = crudHooks(bridgeItemsService)
export const trackingHooks = crudHooks(trackingService)
export const webAccountHooks = crudHooks(webAccountsService)
export const carrierHooks = crudHooks(carriersService)
export const portHooks = crudHooks(portsService)
export const billingCodeHooks = crudHooks(billingCodesService)
export const attachmentHooks = crudHooks(attachmentsService)
export const integrationHooks = crudHooks(integrationsService)

// Re-export the factory for ad-hoc resources
export { createService }
