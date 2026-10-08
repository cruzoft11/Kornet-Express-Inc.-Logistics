import { QuotesPage } from './QuotesPage'
import { ShipmentWorkspace } from './ShipmentWorkspace'

export const opsRoutes = [
  { path: '/logistics/quotes', element: <QuotesPage /> },
  { path: '/logistics/ocean-export', element: <ShipmentWorkspace mode="OCEAN_EXPORT" /> },
  { path: '/logistics/ocean-import', element: <ShipmentWorkspace mode="OCEAN_IMPORT" /> },
  { path: '/logistics/air-export', element: <ShipmentWorkspace mode="AIR_EXPORT" /> },
  { path: '/logistics/air-import', element: <ShipmentWorkspace mode="AIR_IMPORT" /> },
  { path: '/logistics/domestic', element: <ShipmentWorkspace mode="DOMESTIC" /> },
  { path: '/logistics/files/:id', element: <ShipmentWorkspace /> },
]
