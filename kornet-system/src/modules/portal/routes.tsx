import { PortalHomePage, PortalLoginPage, PublicTrackingPage } from './PortalPages'

export const portalRoutes = [
  { path: '/portal/login', element: <PortalLoginPage />, label: 'Portal Login', group: 'Portal', public: true },
  { path: '/portal', element: <PortalHomePage />, label: 'Customer Portal', group: 'Portal', public: true },
  { path: '/track/:ref?', element: <PublicTrackingPage />, label: 'Public Tracking', group: 'Portal', public: true },
]
