import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { type CompanyCode } from '../config/companies'
import { useAuthStore } from './authStore'

export interface CompanyOption {
  code: string
  name: string
  legalName?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
  branch?: string | null
}

interface CompanyState {
  selectedCompanyCode: CompanyCode | string | null
  companies: CompanyOption[]
  loading: boolean
  setSelectedCompany: (code: CompanyCode | string) => void
  clearSelectedCompany: () => void
  setCompanies: (companies: CompanyOption[]) => void
  fetchCompanies: () => Promise<void>
}

export const useCompanyStore = create<CompanyState>()(
  persist(
    (set) => ({
      selectedCompanyCode: 'KORNET',
      companies: [{ code: 'KORNET', name: 'Kornet Express Freight & Logistics' }],
      loading: false,
      setSelectedCompany: (code: CompanyCode | string) => set({ selectedCompanyCode: code }),
      clearSelectedCompany: () => set({ selectedCompanyCode: 'KORNET' }),
      setCompanies: (companies) => set({ companies }),
      fetchCompanies: async () => {
        const token = useAuthStore.getState().accessToken
        if (!token) return
        set({ loading: true })
        try {
          const res = await fetch('/api/companies', {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (!res.ok) return
          const json = (await res.json()) as { data: CompanyOption[] }
          if (Array.isArray(json.data) && json.data.length) {
            set({ companies: json.data })
          }
        } catch {
          /* keep last known list */
        } finally {
          set({ loading: false })
        }
      },
    }),
    {
      name: 'kornet-company-storage',
    },
  ),
)
