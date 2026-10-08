import { BillingCodesPage, CurrenciesPage, PartiesPage, PortsPage, TariffsPage } from './MastersPages'

export const mastersRoutes = [
  { path: '/directories/parties', element: <PartiesPage />, label: 'Customers & Vendors', group: 'Directories' },
  { path: '/directories/ports', element: <PortsPage />, label: 'Ports', group: 'Directories' },
  { path: '/directories/billing-codes', element: <BillingCodesPage />, label: 'Billing Codes', group: 'Directories' },
  { path: '/directories/rates', element: <TariffsPage />, label: 'Tariffs / Rates', group: 'Directories' },
  { path: '/directories/currencies', element: <CurrenciesPage />, label: 'Currencies / FX', group: 'Directories' },
]
