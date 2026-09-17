import { getCompanyNameByCode } from '../config/companies'

type CompanyStorageState = {
  state?: {
    selectedCompanyCode?: string | null
  }
}

const COMPANY_STORAGE_KEY = 'company-storage'

export function readSelectedCompanyCode(): string | null {
  try {
    const raw = localStorage.getItem(COMPANY_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CompanyStorageState
    return parsed.state?.selectedCompanyCode ?? null
  } catch {
    return null
  }
}

export function readSelectedCompanyName(): string {
  return getCompanyNameByCode(readSelectedCompanyCode())
}
