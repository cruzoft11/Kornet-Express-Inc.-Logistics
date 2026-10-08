import { AuditLogPage, CompanySettingsPage, UsersPage } from './AdminPages'

export const adminRoutes = [
  { path: '/admin/users', element: <UsersPage />, label: 'Users', group: 'Admin', roles: ['admin', 'superadmin'] },
  { path: '/admin/settings', element: <CompanySettingsPage />, label: 'Company Settings', group: 'Admin', roles: ['admin', 'superadmin', 'manager'] },
  { path: '/admin/audit-log', element: <AuditLogPage />, label: 'Audit Log', group: 'Admin', roles: ['admin', 'superadmin', 'manager'] },
]
