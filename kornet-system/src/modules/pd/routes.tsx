import PdOrdersPage from './PdOrdersPage'
import PdDispatchBoard from './PdDispatchBoard'
export const pdRoutes = [
  { path: '/logistics/pd-orders', element: <PdOrdersPage /> },
  { path: '/logistics/pd-orders/board', element: <PdDispatchBoard /> },
]
