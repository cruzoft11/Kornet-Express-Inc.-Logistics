export type CompanyCode =
  | 'KORNET'
  | 'cyberfridge'
  | 'johntrix'
  | 'thermalex'
  | 'gmixteam'
  | 'dynamiq'
  | 'metaleon'
  | '3jcrt'
  | 'gian'
  | 'jimi'
  | 'lmjay'
  | 'jemt'
  | 'jasc'
  | 'rcmi'
  | 'kote'
  | 'magrofil'

export interface Company {
  code: CompanyCode | string
  name: string
}

export const COMPANIES: Company[] = [
  { code: 'KORNET', name: 'Kornet Express Freight & Logistics' },
  { code: 'cyberfridge', name: 'CYBERFRIDGE GENERAL SERVICES INC' },
  { code: 'johntrix', name: 'JOHNTRIX TECHNICAL SERVICES INC.' },
  { code: 'thermalex', name: 'THERMALEX GENERAL SERVICES INC' },
  { code: 'gmixteam', name: 'GMIXTEAM GENERAL SERVICES INC' },
  { code: 'dynamiq', name: 'DYNAMIQ CIRQUE GENERAL SERVICES INC' },
  { code: 'metaleon', name: 'METALEON GENERAL SERVICES INC' },
  { code: '3jcrt', name: '3JCRT GENERAL SERVICES INC' },
  { code: 'gian', name: 'GIAN GENERAL SERVICES INC' },
  { code: 'jimi', name: 'JIMI GENERAL SERVICES INC' },
  { code: 'lmjay', name: 'LMJAY GENERAL SERVICES INC' },
  { code: 'jemt', name: 'JEMT GENERAL SERVICES INC' },
  { code: 'jasc', name: 'JASC GENERAL SERVICES INC' },
  { code: 'rcmi', name: 'RCMI GENERAL SERVICES INC' },
  { code: 'kote', name: 'KOTE GENERAL SERVICES INC' },
  { code: 'magrofil', name: 'Magrofil Industrial Services' }
]

export const COMPANY_HEADER_NAME = 'X-Company-Code'
export const DEFAULT_COMPANY_CODE: CompanyCode = 'KORNET'

export function getCompanyByCode(code?: string | null): Company | null {
  if (!code) return null
  
  // 1. Try loading from localStorage persisted Zustand store first (so renamed companies are shown!)
  try {
    const storageStr = localStorage.getItem('company-storage')
    if (storageStr) {
      const parsed = JSON.parse(storageStr)
      const list = parsed.state?.companies || []
      const found = list.find((c: any) => c.code === code)
      if (found) return { code, name: found.name }
    }
  } catch (e) {
    // Ignore error
  }

  // 2. Try static list next
  const staticFound = COMPANIES.find((company) => company.code === code)
  if (staticFound) return staticFound
  
  // Fallback to formatted code so it never shows "No Company Selected"
  return { code, name: code.toUpperCase() + ' GENERAL SERVICES INC.' }
}

export function getCompanyNameByCode(code?: string | null): string {
  return getCompanyByCode(code)?.name ?? 'No Company Selected'
}
