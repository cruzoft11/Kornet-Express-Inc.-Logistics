import { apiDelete, apiGet, apiPatch, apiPost } from './client'

export type AdminRole = 'superadmin' | 'admin' | 'manager' | 'operations' | 'accounting' | 'operator' | 'accountant' | 'viewer'
export interface UserAdmin { id: string; username: string; fullName: string; email?: string | null; role: AdminRole; active: boolean; canAccessFs: boolean; companies: string[]; lastLoginAt?: string | null; createdAt?: string }
export interface Company { id: string; code: string; name: string; legalName?: string | null; address?: string | null; phone?: string | null; email?: string | null; tin?: string | null; branch?: string | null; active?: boolean }
export interface CompanySetting { id: string; key: string; value: unknown; updatedAt?: string }
export interface AuditLog { id: string; username?: string | null; userId?: string | null; action: string; entity?: string | null; entityId?: string | null; detail?: unknown; createdAt: string }

export const usersApi = {
  list: () => apiGet<{ data: UserAdmin[] }>('/users'),
  create: (body: Partial<UserAdmin> & { password: string }) => apiPost<UserAdmin>('/users', body),
  update: (id: string, body: Partial<UserAdmin> & { password?: string }) => apiPatch<UserAdmin>(`/users/${id}`, body),
  remove: (id: string) => apiDelete(`/users/${id}`),
}
export const companiesApi = { list: () => apiGet<{ data: Company[] }>('/companies') }
export const settingsApi = {
  list: () => apiGet<{ data: CompanySetting[] }>('/company-settings'),
  create: (body: { key: string; value: unknown }) => apiPost<CompanySetting>('/company-settings', body),
  update: (id: string, body: Partial<CompanySetting>) => apiPatch<CompanySetting>(`/company-settings/${id}`, body),
}
export const auditApi = { list: (params?: Record<string, unknown>) => apiGet<{ data: AuditLog[]; total: number }>('/audit-logs', { params }) }
