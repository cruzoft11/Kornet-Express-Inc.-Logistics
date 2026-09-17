import { create } from 'zustand'
import { integrationsService } from '../api/services'
import type { Integration } from '../api/types'

export type IntegrationStatus = 'connected' | 'disconnected' | 'error'

export interface IntegrationLite {
  id?: string
  key: string
  name: string
  category: string
  status: IntegrationStatus
}

// The catalogue of integrations the logistics app knows about. If the backend
// has no row for a given key yet (e.g. a freshly-provisioned company), we fall
// back to these defaults in a "disconnected" state so features gate correctly.
export const INTEGRATION_CATALOGUE: IntegrationLite[] = [
  { key: 'barcode-scanner', name: 'Barcode / QR Scanner', category: 'hardware', status: 'disconnected' },
  { key: 'signature-pad', name: 'POD Signature Capture', category: 'hardware', status: 'disconnected' },
  { key: 'label-printer', name: 'Label / Waybill Printer', category: 'printing', status: 'disconnected' },
  { key: 'boc-e2m', name: 'Bureau of Customs e2m', category: 'government', status: 'disconnected' },
  { key: 'carrier-api', name: 'Carrier Tracking API', category: 'carrier', status: 'disconnected' },
]

interface IntegrationsState {
  items: IntegrationLite[]
  loaded: boolean
  loading: boolean
  settingsOpen: boolean
  fetchIntegrations: () => Promise<void>
  isConnected: (key: string) => boolean
  setStatus: (key: string, status: IntegrationStatus) => Promise<void>
  openSettings: () => void
  closeSettings: () => void
}

function mergeWithCatalogue(rows: Integration[]): IntegrationLite[] {
  return INTEGRATION_CATALOGUE.map((cat) => {
    const found = rows.find((r) => r.key === cat.key)
    if (!found) return { ...cat }
    return {
      id: found.id,
      key: found.key,
      name: found.name || cat.name,
      category: found.category || cat.category,
      status: (found.status as IntegrationStatus) || 'disconnected',
    }
  })
}

export const useIntegrationsStore = create<IntegrationsState>((set, get) => ({
  items: INTEGRATION_CATALOGUE.map((c) => ({ ...c })),
  loaded: false,
  loading: false,
  settingsOpen: false,

  fetchIntegrations: async () => {
    if (get().loading) return
    set({ loading: true })
    try {
      const res = await integrationsService.list({ pageSize: 100 })
      set({ items: mergeWithCatalogue(res.data), loaded: true })
    } catch (err) {
      console.error('[integrations] fetch failed:', err)
      set({ loaded: true })
    } finally {
      set({ loading: false })
    }
  },

  isConnected: (key) => get().items.find((i) => i.key === key)?.status === 'connected',

  setStatus: async (key, status) => {
    const item = get().items.find((i) => i.key === key)
    // Optimistic update.
    set((state) => ({
      items: state.items.map((i) => (i.key === key ? { ...i, status } : i)),
    }))
    try {
      if (item?.id) {
        await integrationsService.update(item.id, { status } as Partial<Integration>)
      } else {
        const created = await integrationsService.create({
          key,
          name: item?.name ?? key,
          category: item?.category ?? 'other',
          status,
        } as Partial<Integration>)
        set((state) => ({
          items: state.items.map((i) => (i.key === key ? { ...i, id: created.id } : i)),
        }))
      }
    } catch (err) {
      console.error('[integrations] setStatus failed:', err)
      // Roll back to previous state on failure.
      set((state) => ({
        items: state.items.map((i) => (i.key === key ? { ...i, status: item?.status ?? 'disconnected' } : i)),
      }))
      throw err
    }
  },

  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
}))
