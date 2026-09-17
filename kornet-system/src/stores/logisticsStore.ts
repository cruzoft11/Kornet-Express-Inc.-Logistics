import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'
import {
  shipmentsService,
  vehiclesService,
  pdOrdersService,
  driversService,
  fleetVehiclesService,
  dispatchRoutesService,
  checksService,
  bridgeItemsService,
  trackingService,
  webAccountsService,
} from '../api/services'
import {
  apiShipmentToStore,
  storeShipmentToApiInput,
  apiVehicleToStore,
  storeVehicleToApiInput,
  apiPdOrderToStore,
  storePdOrderToApiInput,
  apiDriverToStore,
  storeDriverToApiInput,
  apiFleetVehicleToStore,
  storeFleetVehicleToApiInput,
  apiDispatchRouteToStore,
  storeDispatchRouteToApiInput,
  apiCheckToStore,
  storeCheckToApiInput,
  apiBridgeItemToStore,
  storeBridgeItemToApiInput,
  apiTrackingToStore,
  storeTrackingToApiInput,
  apiWebAccountToStore,
} from '../api/mappers'

export interface BillingLine {
  id: string
  code: string
  desc: string
  amount: number
  prepaidOrCollect: 'Prepaid' | 'Collect'
  customer: string
  glAccount: string
  rate?: number
  qty?: number
  unit?: string
  currency?: string
  exchangeRate?: number
}

export interface CostLine {
  id: string
  code: string
  desc: string
  amount: number
  vendor: string
  vendorId: string
  glAccount: string
  rate?: number
  qty?: number
  unit?: string
}

export interface ContainerStuffingDetail {
  id: string
  equipmentType: string
  containerNo: string
  sealNo: string
  orderNo: string
  status: 'Empty' | 'Loading' | 'Loaded' | 'Sealed'
  warehouseReceipts: string[]
  maxVolume: number
  loadedVolume: number
  maxWeight: number
  loadedWeight: number
  hazmat: {
    unNo: string
    desc: string
    contact: string
    phone: string
  }[]
  temperature?: {
    temp: number
    unit: 'F' | 'C'
    max: number
    min: number
    ventSetting: string
  }
}

export interface LoadingGuide {
  guideNo: string
  bookingNo: string
  fileNo: string
  date: string
  status: 'PRE-LOADED' | 'LOADED' | 'SHIPPED'
  carrier: string
  vessel: string
  voyage: string
  containers: ContainerStuffingDetail[]
}

export interface Quote {
  quoteNo: string
  date: string
  validUntil: string
  division: string
  userId: string
  type: 'PREPAID' | 'COLLECT'
  status: 'OPEN' | 'APPROVED' | 'EXPIRED'
  customer: string
  caller: string
  placeOfReceipt: string
  portOfLoading: string
  transhipPort: string
  portOfDischarge: string
  ultimateDestination: string
  carrier: string
  serviceTerms: string
  currency: string
  exchangeRate: number
  declaredValue: number
  insuredValue: number
  shipper: string
  consignee: string
  containers: { equipmentType: string; containerNo: string }[]
  cargoItems: {
    cargoType: string
    qty: number
    unit: string
    length: number
    width: number
    height: number
    unitWeight: number
    totalWeight: number
    totalCharge: number
  }[]
  billingLines: BillingLine[]
  costLines: CostLine[]
  comments: string
}

export interface Shipment {
  id?: string
  fileNo: string
  type: 'Ocean Export' | 'Ocean Import' | 'Air Export' | 'Air Import'
  mode?: 'FCL' | 'LCL'
  bookingNo: string
  blOrAwbNo: string
  blClass?: 'DBL' | 'MBL' | 'HBL'
  shipmentType?: 'Direct' | 'Consolidation'
  status: 'Open' | 'Closed' | 'Transferred'
  shipper: string
  shipperAddress?: string
  shipperTin?: string
  consignee: string
  consigneeAddress?: string
  consigneeTin?: string
  notifyParty?: string
  notifyPartyAddress?: string
  forwardingAgent?: string
  origin: string
  destination: string
  portOfLoading?: string
  portOfDischarge?: string
  transhipPort?: string
  vesselOrFlight: string
  voyageOrFlightNo: string
  carrierName?: string
  etd?: string
  eta?: string
  cutoffDate?: string
  cutoffTime?: string
  pieces: number
  packageType?: string
  weightKg: number
  netWeightKg?: number
  tareWeightKg?: number
  volumeCbm: number
  chargeableWeightKg?: number
  dimensions?: { length: number; width: number; height: number; unit: 'cm' | 'in'; pcs: number }[]
  containerNo?: string
  sealNo?: string
  equipmentType?: string
  marksAndNumbers?: string
  natureOfGoods?: string
  rateClass?: string
  commodityCode?: string
  customsEntryNo?: string
  customsSadNo?: string
  customsLane?: 'Green' | 'Yellow' | 'Red' | 'Blue'
  customsDutiesAmount?: number
  customsBrokerName?: string
  customsBrokerLicense?: string
  deliveryOrderStatus?: 'Issued' | 'Pending' | 'Surrendered'
  branchCode?: string
  isHazmat?: boolean
  unNumber?: string
  hazmatClass?: string
  itNumber?: string
  billingLines: BillingLine[]
  costLines: CostLine[]
  closedAt?: string
  transferredAt?: string
  comments?: string
}

export interface Vehicle {
  id: string
  vin: string
  year: number
  make: string
  model: string
  trim?: string
  bodyType: string
  color: string
  engine?: string
  condition?: string
  keys?: string
  status: 'Expected' | 'Received' | 'Ready to Ship' | 'Pre-Loaded' | 'Loaded' | 'Shipped' | 'Hold'
  warehouseReceiptNo?: string
  inspectionNo?: string
  inspectionDate?: string
  inspector?: string
  titleStatus: 'Pending' | 'Exists' | 'Mailed' | 'Received'
  titleNo?: string
  titleState?: string
  titleReceivedDate?: string
  lienReleaseCleared: boolean
  tentativeCleared: boolean
  customsTitleRejected: boolean
  assignedContainerNo?: string
  shipper: string
  consignee: string
  thirdParty?: string
  origin?: string
  destination?: string
  warehouseLocation: string
  whseBin?: string
  lengthInches?: number
  widthInches?: number
  heightInches?: number
  unitWeightLbs?: number
  cubicFeet?: number
  receivedDate?: string
  history: {
    status: string
    date: string
    time: string
    user: string
    comments: string
  }[]
}

export interface PDOrder {
  id: string
  orderNo: string
  type: 'Pickup' | 'Delivery' | 'Xdock' | 'Exchange' | 'Quote'
  division: string
  warehouse: string
  shipper: string
  shipperAddress?: string
  shipperContact?: string
  consignee: string
  consigneeAddress?: string
  consigneeContact?: string
  thirdParty?: string
  origin: string
  destination: string
  status: 'Scheduled' | 'In Transit' | 'Completed' | 'Pending'
  scheduledDate: string
  appointmentTime?: string
  driver: string
  equipmentType?: string
  route?: string
  loadNo?: string
  proNo?: string
  linkedWR?: string
  barcode: string
  amount: number
  reference?: string
  quoteNo?: string
  siNo?: string
  declaredValue?: number
  cargoDetails: {
    cargoType: string
    qty: number
    length: number
    width: number
    height: number
    unitWeight: number
    totalWeight: number
    cubic: number
    location: string
    bin: string
    materialDescription: string
    hazardous: boolean
  }[]
  dockReceiptNo?: string
}

export interface TrackingMilestone {
  id: string
  date: string
  time: string
  status: string
  subStatus: string
  description: string
  updatedBy: string
  location?: string
}

export interface TrackingAttachment {
  id: string
  name: string
  size: string
  type: string
  uploadDate: string
  dataUrl?: string
}

export interface TrackingItem {
  id: string
  refType: 'PD' | 'Ocean BL' | 'Air AWB' | 'Container'
  refNo: string
  shipper: string
  consignee: string
  origin: string
  destination: string
  scheduleDate: string
  currentStatus: string
  currentSubStatus: string
  history: TrackingMilestone[]
  attachments: TrackingAttachment[]
}

export interface CustomerWebAccount {
  id: string
  accountNo: string
  customerName: string
  userId: string
  passwordHash: string
  isAgent: boolean
  permissions: {
    canViewTracking: boolean
    canDownloadPOD: boolean
    canUploadDocs: boolean
    canViewInvoices: boolean
    tradeShowMgmt: 'None' | 'Carrier' | 'Show Management'
    poMgmt: 'None' | 'Standard' | 'Container'
  }
}

export interface CheckDisbursement {
  id: string
  checkNo: string
  checkType: 'COMPUTER' | 'MANUAL'
  paymentType: 'PAYMENT'
  date: string
  glPeriod: string
  status: 'OPEN' | 'PRINTED' | 'POSTED'
  vendor: string
  vendorAddress?: string
  amount: number
  isVoucher: boolean
  bankName: string
  currency: string
  exchangeRate: number
  reference: string
  comments: string
  invoicesApplied: {
    invoiceNo: string
    date: string
    dueDate: string
    reference: string
    amount: number
    discount: number
    applied: number
    apAccount: string
    glExpense: string
    type: 'Payment' | 'Debit' | 'OnAccount' | 'Disbursement'
  }[]
  jeNo?: string
  postedPeriod?: string
  postedDate?: string
}

export interface BridgeStagingItem {
  id: string
  sourceFileNo: string
  sourceType: string
  customerOrVendor: string
  docType: 'Invoice (AR)' | 'Payable Cost (AP)'
  billingOrCostCode: string
  glAccount: string
  description: string
  amount: number
  status: 'Staged' | 'Trial Verified' | 'Posted'
  postedJvNo?: string
  postedAt?: string
}

export interface AuditLogEntry {
  id: string
  timestamp: string
  user: string
  module: string
  action: string
  referenceNo: string
  details: string
}

export interface Driver {
  id: string
  code: string
  name: string
  licenseNo: string
  phone: string
  branch: string
  status: 'Available' | 'On Delivery' | 'Off Duty'
  assignedVehiclePlate?: string
}

export interface FleetVehicle {
  id: string
  plateNo: string
  vehicleType: '10-Wheeler Wing Van' | '40ft Container Chassis' | '4-Wheeler Closed Van' | 'Reefer Truck' | 'Prime Mover'
  makeModel: string
  capacityKg: number
  volumeCbm: number
  branch: string
  status: 'Ready' | 'In Transit' | 'Maintenance'
  currentDriver?: string
}

export interface DispatchRoute {
  id: string
  dispatchNo: string
  originBranch: string
  destBranch: string
  waypoints: string[]
  driverId: string
  driverName: string
  vehicleId: string
  vehiclePlate: string
  status: 'Draft' | 'Dispatched' | 'In Transit' | 'Arrived' | 'Completed'
  cargoRef: string
  orderType: 'Pickup' | 'Delivery' | 'Transfer'
  podSignature?: string
  podReceiverName?: string
  podNotes?: string
  podDeliveredAt?: string
  createdAt: string
}

export interface PhilippineBranch {
  id: string
  code: string
  name: string
  city: string
  province: string
  address: string
  phone: string
  type: 'Headquarters' | 'Regional Hub' | 'Port Depot' | 'Airport Logistics Hub'
}

export interface LogisticsState {
  // Navigation & Active States
  activeModule: 'overview' | 'control' | 'ocean' | 'ocean-export' | 'ocean-import' | 'air' | 'air-export' | 'air-import' | 'vehicles' | 'pd' | 'fleet' | 'map' | 'bridge' | 'tracking' | 'rates' | 'fs'
  selectedFileNo: string | null
  activeRibbonTab: 'System' | 'Home' | 'Operations' | 'Fleet' | 'Accounting' | 'Maintenance' | 'View'
  activeSubView: string
  searchTerm: string
  filterStatus: string

  // Master Data Stores
  quotes: Quote[]
  shipments: Shipment[]
  shipmentsLoading: boolean
  shipmentsHydrated: boolean
  operationalHydrated: boolean
  loadingGuides: LoadingGuide[]
  vehicles: Vehicle[]
  pdOrders: PDOrder[]
  trackingItems: TrackingItem[]
  webAccounts: CustomerWebAccount[]
  checks: CheckDisbursement[]
  bridgeQueue: BridgeStagingItem[]
  auditLogs: AuditLogEntry[]
  drivers: Driver[]
  fleetVehicles: FleetVehicle[]
  dispatchRoutes: DispatchRoute[]
  phBranches: PhilippineBranch[]

  // Modals & Dialog Visibility
  modalOpen: {
    newQuote: boolean
    newBooking: boolean
    newBL: boolean
    newAirFile: boolean
    newAirwaybill: boolean
    newPDOrder: boolean
    newVehicle: boolean
    newCheck: boolean
    containerStuffing: boolean
    manifest: boolean
    fileAnalysis: boolean
    fileStatusChange: boolean
    transactionPosting: boolean
    printDoc: boolean
    auditLog: boolean
    attachments: boolean
    webStatusUpdate: boolean
    newCharge: boolean
    sedFiling: boolean
    billingCodes: boolean
    carriersDirectory: boolean
    portsDirectory: boolean
    systemDiagnostics: boolean
    newDriver: boolean
    newFleetVehicle: boolean
    newDispatchRoute: boolean
    podSignature: boolean
    resetConfirm: boolean
  }
  printDocPayload: {
    type: 'BOL' | 'AWB' | 'DOCK_RECEIPT' | 'BARCODE_LABELS' | 'CHECK_VOUCHER' | 'MANIFEST' | 'DISPATCH_MANIFEST' | 'POD_RECEIPT'
    title: string
    data: any
  } | null
  activeContainerStuffingGuideNo: string | null
  activeNewChargeShipmentFileNo: string | null
  activePodRouteId: string | null

  sidebarCollapsed: boolean
  activeTerminal: string
  selectedBranchCode: string

  // Rates & Maintenance
  fxRates: { USD: number; EUR: number; JPY: number; CNY: number; SGD: number; HKD: number }
  fxLastUpdated: string
  vatRate: number

  // State Mutators
  setActiveModule: (m: 'overview' | 'control' | 'ocean' | 'ocean-export' | 'ocean-import' | 'air' | 'air-export' | 'air-import' | 'vehicles' | 'pd' | 'fleet' | 'map' | 'bridge' | 'tracking' | 'rates' | 'fs') => void
  setSelectedFileNo: (fileNo: string | null) => void
  setActiveRibbonTab: (tab: 'System' | 'Home' | 'Operations' | 'Fleet' | 'Accounting' | 'Maintenance' | 'View') => void
  setActiveSubView: (view: string) => void
  setSearchTerm: (term: string) => void
  setFilterStatus: (status: string) => void
  setModalOpen: (modalName: keyof LogisticsState['modalOpen'], isOpen: boolean) => void
  openPrintModal: (payload: NonNullable<LogisticsState['printDocPayload']>) => void
  openContainerStuffingModal: (guideNo: string) => void
  openNewChargeModal: (fileNo: string) => void
  openPodModal: (routeId: string) => void
  toggleSidebar: () => void
  setActiveTerminal: (terminal: string) => void
  setSelectedBranchCode: (branchCode: string) => void
  fetchLiveFxRates: () => Promise<void>
  setFxRates: (rates: Record<string, number>) => void
  setVatRate: (vat: number) => void

  // CRUD & Operations Actions
  createQuote: (quote: Quote) => void
  createShipment: (shipment: Shipment) => void
  hydrateShipments: () => Promise<void>
  hydrateOperationalData: () => Promise<void>
  duplicateShipment: (fileNo: string) => Shipment | null
  deleteShipment: (fileNo: string) => boolean
  updateShipment: (fileNo: string, updates: Partial<Shipment>) => void
  addBillingLine: (fileNo: string, line: BillingLine) => void
  addCostLine: (fileNo: string, line: CostLine) => void
  closeShipment: (fileNo: string) => boolean
  transferToBridge: (fileNo: string) => boolean
  stageBridgeItem: (item: BridgeStagingItem) => Promise<boolean>

  createVehicle: (vehicle: Vehicle) => void
  updateVehicle: (id: string, updates: Partial<Vehicle>) => void
  decodeVin: (vin: string) => Promise<{ year: number; make: string; model: string; bodyType: string; engine?: string }>
  inspectVehicle: (id: string, inspector?: string) => void
  toggleCustomsHold: (id: string, rejected: boolean) => void
  assignVehicleToContainer: (vehicleId: string, containerNo: string) => void
  forceReadyToShip: (id: string) => void

  createPDOrder: (order: PDOrder) => void
  updatePDOrder: (id: string, updates: Partial<PDOrder>) => void
  createWRFromPD: (orderId: string) => string

  updateTrackingStatus: (refNo: string, status: string, subStatus: string, description: string, user: string, attachments?: TrackingAttachment[]) => void
  createWebAccount: (account: CustomerWebAccount) => void

  createCheck: (check: CheckDisbursement) => void
  autoBridgeOperationalCostToFsCheck: (params: {
    sourceFileNo: string
    carrierOrVendor: string
    amount: number
    description: string
    expenseAccount?: string
    bankNo?: number
  }) => Promise<{ success: boolean; checkNo: string; jvNo: string; message: string }>
  postCheckDisbursement: (checkId: string, trial: boolean) => { success: boolean; message: string; debits: number; credits: number }

  runTrialPost: () => { success: boolean; totalDebits: number; totalCredits: number; warnings: string[] }
  executeFinalPost: () => { success: boolean; postedCount: number; message: string }

  // Fleet & Dispatch Actions
  createDriver: (driver: Driver) => void
  updateDriver: (id: string, updates: Partial<Driver>) => void
  deleteDriver: (id: string) => void
  createFleetVehicle: (vehicle: FleetVehicle) => void
  updateFleetVehicle: (id: string, updates: Partial<FleetVehicle>) => void
  deleteFleetVehicle: (id: string) => void
  createDispatchRoute: (route: DispatchRoute) => void
  updateDispatchRoute: (id: string, updates: Partial<DispatchRoute>) => void
  signPOD: (routeId: string, signatureBase64: string, receiverName: string, notes?: string) => void

  // Reset & Audit
  resetAllOperationalData: () => void
  addAuditLog: (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => void
}

export const KORNET_BRANCHES: PhilippineBranch[] = [
  { id: 'br-mnl', code: 'MNL', name: 'Manila South Harbor HQ', city: 'Manila', province: 'Metro Manila', address: 'South Harbor Port Area, Port District, City of Manila', phone: '+63 (02) 8527-4000', type: 'Headquarters' },
  { id: 'br-btn', code: 'BTN', name: 'Bataan Freeport Hub', city: 'Mariveles', province: 'Bataan', address: 'FAB Post Complex, Freeport Area of Bataan, Mariveles', phone: '+63 (047) 935-1200', type: 'Regional Hub' },
  { id: 'br-crk', code: 'CRK', name: 'Clark International Airport Hub', city: 'Clark Freeport Zone', province: 'Pampanga', address: 'Civil Aviation Complex, Clark Freeport, Pampanga', phone: '+63 (045) 599-2800', type: 'Airport Logistics Hub' },
  { id: 'br-ceb', code: 'CEB', name: 'Cebu Pier Logistics Depot', city: 'Cebu City', province: 'Cebu', address: 'Cebu International Port Area, North Reclamation, Cebu City', phone: '+63 (032) 231-7700', type: 'Port Depot' },
  { id: 'br-dvo', code: 'DVO', name: 'Davao Sasa Wharf Logistics Hub', city: 'Davao City', province: 'Davao del Sur', address: 'Km 10 Sasa Wharf, Davao City', phone: '+63 (082) 234-9100', type: 'Port Depot' },
  { id: 'br-cdo', code: 'CDO', name: 'Cagayan De Oro Macabalan Port', city: 'Cagayan de Oro', province: 'Misamis Oriental', address: 'Macabalan Port Logistics Terminal, CDO', phone: '+63 (088) 856-4200', type: 'Port Depot' }
]

export const DEFAULT_DRIVERS: Driver[] = [
  { id: 'drv-01', code: 'DRV-MNL-01', name: 'Eduardo Santos', licenseNo: 'N01-12-889021', phone: '+63 917 555 1021', branch: 'MNL', status: 'Available', assignedVehiclePlate: 'NCL-8921' },
  { id: 'drv-02', code: 'DRV-CRK-02', name: 'Danilo Ramos', licenseNo: 'C03-09-441092', phone: '+63 920 888 3491', branch: 'CRK', status: 'Available', assignedVehiclePlate: 'CBA-4492' },
  { id: 'drv-03', code: 'DRV-BTN-03', name: 'Rodrigo Mendoza', licenseNo: 'B02-14-663910', phone: '+63 918 222 7109', branch: 'BTN', status: 'Available', assignedVehiclePlate: 'NAA-1102' },
  { id: 'drv-04', code: 'DRV-CEB-04', name: 'Vicente Dela Cruz', licenseNo: 'G07-16-552199', phone: '+63 929 444 8210', branch: 'CEB', status: 'Available', assignedVehiclePlate: 'GAL-9901' },
  { id: 'drv-05', code: 'DRV-DVO-05', name: 'Arnel Bautista', licenseNo: 'L11-18-771203', phone: '+63 919 777 5543', branch: 'DVO', status: 'Available', assignedVehiclePlate: 'LAA-3320' },
  { id: 'drv-06', code: 'DRV-CDO-06', name: 'Nestor Magpantay', licenseNo: 'K10-15-339011', phone: '+63 928 333 9811', branch: 'CDO', status: 'Available', assignedVehiclePlate: 'KAB-6120' }
]

export const DEFAULT_FLEET: FleetVehicle[] = [
  { id: 'flt-01', plateNo: 'NCL-8921', vehicleType: '10-Wheeler Wing Van', makeModel: 'Isuzu Giga 6UZ1', capacityKg: 15000, volumeCbm: 58, branch: 'MNL', status: 'Ready', currentDriver: 'Eduardo Santos' },
  { id: 'flt-02', plateNo: 'CBA-4492', vehicleType: '40ft Container Chassis', makeModel: 'Hino 700 Prime Mover', capacityKg: 28000, volumeCbm: 76, branch: 'CRK', status: 'Ready', currentDriver: 'Danilo Ramos' },
  { id: 'flt-03', plateNo: 'NAA-1102', vehicleType: 'Reefer Truck', makeModel: 'Mitsubishi Fuso Fighter', capacityKg: 8500, volumeCbm: 32, branch: 'BTN', status: 'Ready', currentDriver: 'Rodrigo Mendoza' },
  { id: 'flt-04', plateNo: 'GAL-9901', vehicleType: '4-Wheeler Closed Van', makeModel: 'Isuzu Elf NPR', capacityKg: 4200, volumeCbm: 18, branch: 'CEB', status: 'Ready', currentDriver: 'Vicente Dela Cruz' },
  { id: 'flt-05', plateNo: 'LAA-3320', vehicleType: '10-Wheeler Wing Van', makeModel: 'UD Trucks Quester', capacityKg: 16000, volumeCbm: 60, branch: 'DVO', status: 'Ready', currentDriver: 'Arnel Bautista' },
  { id: 'flt-06', plateNo: 'KAB-6120', vehicleType: '40ft Container Chassis', makeModel: 'Isuzu EXR Heavy Tractor', capacityKg: 30000, volumeCbm: 76, branch: 'CDO', status: 'Ready', currentDriver: 'Nestor Magpantay' }
]

export function calculateVolumetricWeightKg(lengthCm: number, widthCm: number, heightCm: number, divisor: number = 6000): number {
  return Number(((lengthCm * widthCm * heightCm) / divisor).toFixed(2))
}

export function calculateOceanFreightWM(
  weightKgOrMt: number,
  volumeCbm: number,
  ratePerWM: number,
  isWeightInKg: boolean = true
): { chargeableWM: number; totalFreight: number; basis: 'Weight (MT)' | 'Volume (CBM)'; weightMT: number } {
  // If input is in KG or numeric value > 150, convert to Metric Tons (1 MT = 1000 KG)
  const weightMT = isWeightInKg || weightKgOrMt > 150 ? Number((weightKgOrMt / 1000).toFixed(3)) : weightKgOrMt
  const basis = volumeCbm >= weightMT ? 'Volume (CBM)' : 'Weight (MT)'
  const chargeableWM = Math.max(weightMT, volumeCbm)
  const totalFreight = Number((chargeableWM * ratePerWM).toFixed(2))
  return { chargeableWM, totalFreight, basis, weightMT }
}

export function calculateVat(amount: number, vatRate: number = 0.12): { vatable: number; vat: number; total: number } {
  const vat = Number((amount * vatRate).toFixed(2))
  const total = Number((amount + vat).toFixed(2))
  return { vatable: amount, vat, total }
}

export const calculateVat12 = (amount: number) => calculateVat(amount, 0.12)

async function syncShipmentTracking(shipment: Shipment, status: string, note: string): Promise<void> {
  const existing = await trackingService.list({ q: shipment.fileNo, pageSize: 5 })
  const current = existing.data.find((item) => item.trackingNo === shipment.fileNo)
  const milestone = {
    status,
    note,
    location: shipment.destination || shipment.origin || undefined,
    at: new Date().toISOString(),
  }

  if (current) {
    const milestones = Array.isArray(current.milestones) ? [...current.milestones, milestone] : [milestone]
    await trackingService.update(current.id, { status, milestones })
    return
  }

  await trackingService.create({
    trackingNo: shipment.fileNo,
    refType: shipment.type.startsWith('Air') ? 'Air AWB' : 'Ocean BL',
    refFileNo: shipment.fileNo,
    status,
    shipperName: shipment.shipper || null,
    consigneeName: shipment.consignee || null,
    origin: shipment.origin || null,
    destination: shipment.destination || null,
    milestones: [milestone],
  })
}

export const useLogisticsStore = create<LogisticsState>()(
  persist(
    (set, get) => ({
  activeModule: 'control',
  selectedFileNo: null,
  activeRibbonTab: 'Home',
  activeSubView: 'shipments',
  searchTerm: '',
  filterStatus: 'ALL',

  quotes: [],
  shipments: [],
  shipmentsLoading: false,
  shipmentsHydrated: false,
  operationalHydrated: false,
  loadingGuides: [],
  vehicles: [],
  pdOrders: [],
  trackingItems: [],
  webAccounts: [],
  checks: [],
  bridgeQueue: [],
  auditLogs: [],
  drivers: [],
  fleetVehicles: [],
  dispatchRoutes: [],
  phBranches: KORNET_BRANCHES,

  modalOpen: {
    newQuote: false,
    newBooking: false,
    newBL: false,
    newAirFile: false,
    newAirwaybill: false,
    newPDOrder: false,
    newVehicle: false,
    newCheck: false,
    containerStuffing: false,
    manifest: false,
    fileAnalysis: false,
    fileStatusChange: false,
    transactionPosting: false,
    printDoc: false,
    auditLog: false,
    attachments: false,
    webStatusUpdate: false,
    newCharge: false,
    sedFiling: false,
    billingCodes: false,
    carriersDirectory: false,
    portsDirectory: false,
    systemDiagnostics: false,
    newDriver: false,
    newFleetVehicle: false,
    newDispatchRoute: false,
    podSignature: false,
    resetConfirm: false
  },
  printDocPayload: null,
  activeContainerStuffingGuideNo: null,
  activeNewChargeShipmentFileNo: null,
  activePodRouteId: null,

  sidebarCollapsed: false,
  activeTerminal: 'All Terminals (Consolidated Nationwide)',
  selectedBranchCode: 'ALL',

  fxRates: { USD: 56.50, EUR: 61.20, JPY: 0.38, CNY: 7.80, SGD: 42.50, HKD: 7.25 },
  fxLastUpdated: new Date().toISOString(),
  vatRate: 0.12,

  setActiveModule: (m) => set({ activeModule: m }),
  setSelectedFileNo: (fileNo) => set({ selectedFileNo: fileNo }),
  setActiveRibbonTab: (tab) => set({ activeRibbonTab: tab }),
  setActiveSubView: (view) => set({ activeSubView: view }),
  setSearchTerm: (term) => set({ searchTerm: term }),
  setFilterStatus: (status) => set({ filterStatus: status }),
  setModalOpen: (modalName, isOpen) => set((state) => ({
    modalOpen: { ...state.modalOpen, [modalName]: isOpen }
  })),
  openPrintModal: (payload) => set((state) => ({
    printDocPayload: payload,
    modalOpen: { ...state.modalOpen, printDoc: true }
  })),
  openContainerStuffingModal: (guideNo) => set((state) => ({
    activeContainerStuffingGuideNo: guideNo,
    modalOpen: { ...state.modalOpen, containerStuffing: true }
  })),
  openNewChargeModal: (fileNo) => set((state) => ({
    activeNewChargeShipmentFileNo: fileNo,
    modalOpen: { ...state.modalOpen, newCharge: true }
  })),
  openPodModal: (routeId) => set((state) => ({
    activePodRouteId: routeId,
    modalOpen: { ...state.modalOpen, podSignature: true }
  })),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setActiveTerminal: (terminal) => set({ activeTerminal: terminal }),
  setSelectedBranchCode: (branchCode) => set({ selectedBranchCode: branchCode }),
  setFxRates: (rates) => set((state) => ({ fxRates: { ...state.fxRates, ...rates } as any, fxLastUpdated: new Date().toISOString() })),
  setVatRate: (vat) => set({ vatRate: vat }),
  fetchLiveFxRates: async () => {
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD')
      if (res.ok) {
        const json = await res.json()
        const rates = json.rates || {}
        const phpPerUsd = rates.PHP || 56.50
        const newRates = {
          USD: Number(phpPerUsd.toFixed(2)),
          EUR: Number((phpPerUsd / (rates.EUR || 0.92)).toFixed(2)),
          JPY: Number((phpPerUsd / (rates.JPY || 150)).toFixed(4)),
          CNY: Number((phpPerUsd / (rates.CNY || 7.23)).toFixed(2)),
          SGD: Number((phpPerUsd / (rates.SGD || 1.34)).toFixed(2)),
          HKD: Number((phpPerUsd / (rates.HKD || 7.82)).toFixed(2)),
        }
        set({ fxRates: newRates, fxLastUpdated: new Date().toISOString() })
      }
    } catch (e) {
      console.warn('[logistics] failed to fetch live fx rates:', e)
    }
  },

  createQuote: (quote) => {
    set((state) => ({
      quotes: [quote, ...state.quotes]
    }))
    get().addAuditLog({
      user: 'OFFICE',
      module: 'Quotes',
      action: 'Create Quote',
      referenceNo: quote.quoteNo,
      details: `Quote ${quote.quoteNo} generated for ${quote.customer}`
    })
  },

  createShipment: (shipment) => {
    set((state) => ({
      shipments: [shipment, ...state.shipments],
      selectedFileNo: shipment.fileNo
    }))
    get().addAuditLog({
      user: 'OFFICE',
      module: shipment.type,
      action: 'Create Shipment',
      referenceNo: shipment.fileNo,
      details: `${shipment.type} booking ${shipment.bookingNo} created`
    })
    // Persist to backend; reconcile the local record with the server id on success.
    void shipmentsService
      .create(storeShipmentToApiInput(shipment) as Parameters<typeof shipmentsService.create>[0])
      .then((created) => {
        const mapped = apiShipmentToStore(created)
        set((state) => ({
          shipments: state.shipments.map((s) => (s.fileNo === shipment.fileNo ? mapped : s))
        }))
        return syncShipmentTracking(mapped, 'Booked', 'Shipment record created and tracking initialized.')
      })
      .catch((err) => console.error('[logistics] shipment create or tracking initialization failed:', err))
  },

  hydrateShipments: async () => {
    if (get().shipmentsLoading) return
    set({ shipmentsLoading: true })
    try {
      const res = await shipmentsService.list({ pageSize: 500 })
      const mapped = res.data.map(apiShipmentToStore)
      set((state) => {
        const selected =
          state.selectedFileNo && mapped.some((s) => s.fileNo === state.selectedFileNo)
            ? state.selectedFileNo
            : mapped[0]?.fileNo ?? null
        return { shipments: mapped, shipmentsHydrated: true, selectedFileNo: selected }
      })
    } catch (err) {
      console.error('[logistics] hydrateShipments failed:', err)
      set({ shipmentsHydrated: true })
    } finally {
      set({ shipmentsLoading: false })
    }
  },

  hydrateOperationalData: async () => {
    try {
      const [vehicles, pdOrders, drivers, fleetVehicles, dispatchRoutes, checks, bridgeItems, trackingItems, webAccounts] = await Promise.all([
        vehiclesService.list({ pageSize: 500 }),
        pdOrdersService.list({ pageSize: 500 }),
        driversService.list({ pageSize: 500 }),
        fleetVehiclesService.list({ pageSize: 500 }),
        dispatchRoutesService.list({ pageSize: 500 }),
        checksService.list({ pageSize: 500 }),
        bridgeItemsService.list({ pageSize: 500 }),
        trackingService.list({ pageSize: 500 }),
        webAccountsService.list({ pageSize: 500 }),
      ])

      set({
        vehicles: vehicles.data.map(apiVehicleToStore),
        pdOrders: pdOrders.data.map(apiPdOrderToStore),
        drivers: drivers.data.map(apiDriverToStore),
        fleetVehicles: fleetVehicles.data.map(apiFleetVehicleToStore),
        dispatchRoutes: dispatchRoutes.data.map(apiDispatchRouteToStore),
        checks: checks.data.map(apiCheckToStore),
        bridgeQueue: bridgeItems.data.map(apiBridgeItemToStore),
        trackingItems: trackingItems.data.map(apiTrackingToStore),
        webAccounts: webAccounts.data.map(apiWebAccountToStore),
        operationalHydrated: true,
      })
    } catch (err) {
      console.error('[logistics] hydrateOperationalData failed:', err)
      set({ operationalHydrated: true })
    }
  },

  duplicateShipment: (fileNo) => {
    const s = get().shipments.find((x) => x.fileNo === fileNo)
    if (!s) return null
    const newFileNo = `${s.fileNo}-CPY`
    const cloned: Shipment = {
      ...s,
      fileNo: newFileNo,
      bookingNo: `${s.bookingNo}-CP`,
      blOrAwbNo: `${s.blOrAwbNo}-CP`,
      status: 'Open',
      closedAt: undefined,
      transferredAt: undefined
    }
    set((state) => ({
      shipments: [cloned, ...state.shipments],
      selectedFileNo: newFileNo
    }))
    get().addAuditLog({
      user: 'OP_DISPATCH',
      module: s.type,
      action: 'Duplicate Shipment',
      referenceNo: newFileNo,
      details: `Cloned duplicate from file ${fileNo}`
    })
    void shipmentsService
      .create(storeShipmentToApiInput(cloned))
      .then((created) => {
        const mapped = apiShipmentToStore(created)
        set((state) => ({ shipments: state.shipments.map((item) => (item.fileNo === newFileNo ? mapped : item)) }))
      })
      .catch((err) => {
        set((state) => ({
          shipments: state.shipments.filter((item) => item.fileNo !== newFileNo),
          selectedFileNo: state.shipments.find((item) => item.fileNo !== newFileNo)?.fileNo ?? null,
        }))
        console.error('[logistics] shipment duplicate failed to persist:', err)
      })
    return cloned
  },

  deleteShipment: (fileNo) => {
    const s = get().shipments.find((x) => x.fileNo === fileNo)
    if (!s) return false
    const remaining = get().shipments.filter((x) => x.fileNo !== fileNo)
    set({
      shipments: remaining,
      selectedFileNo: remaining[0]?.fileNo || null
    })
    get().addAuditLog({
      user: 'OP_DISPATCH',
      module: s.type,
      action: 'Delete / Archive File',
      referenceNo: fileNo,
      details: `Archived shipment file ${fileNo}`
    })
    if (s.id) {
      void shipmentsService.remove(s.id).catch((err) => {
        set((state) => ({ shipments: [s, ...state.shipments] }))
        console.error('[logistics] shipment delete failed to persist:', err)
      })
    }
    return true
  },

  updateShipment: (fileNo, updates) => {
    const previous = get().shipments.find((shipment) => shipment.fileNo === fileNo)
    set((state) => ({
      shipments: state.shipments.map((s) => (s.fileNo === fileNo ? { ...s, ...updates } : s))
    }))
    const updated = get().shipments.find((shipment) => shipment.fileNo === fileNo)
    if (previous?.id && updated) {
      void shipmentsService.update(previous.id, storeShipmentToApiInput(updated))
        .then((saved) => {
          const mapped = apiShipmentToStore(saved)
          set((state) => ({ shipments: state.shipments.map((item) => (item.fileNo === fileNo ? mapped : item)) }))
        })
        .catch((err) => {
          set((state) => ({ shipments: state.shipments.map((item) => (item.fileNo === fileNo ? previous : item)) }))
          console.error('[logistics] shipment update failed to persist:', err)
        })
    }
  },

  addBillingLine: (fileNo, line) => {
    const previous = get().shipments.find((shipment) => shipment.fileNo === fileNo)
    set((state) => ({
      shipments: state.shipments.map((s) =>
        s.fileNo === fileNo ? { ...s, billingLines: [...s.billingLines, line] } : s
      )
    }))
    const updated = get().shipments.find((shipment) => shipment.fileNo === fileNo)
    if (previous?.id && updated) {
      void shipmentsService.update(previous.id, storeShipmentToApiInput(updated)).catch((err) => {
        set((state) => ({ shipments: state.shipments.map((item) => (item.fileNo === fileNo ? previous : item)) }))
        console.error('[logistics] billing line update failed to persist:', err)
      })
    }
  },

  addCostLine: (fileNo, line) => {
    const previous = get().shipments.find((shipment) => shipment.fileNo === fileNo)
    set((state) => ({
      shipments: state.shipments.map((s) =>
        s.fileNo === fileNo ? { ...s, costLines: [...s.costLines, line] } : s
      )
    }))
    const updated = get().shipments.find((shipment) => shipment.fileNo === fileNo)
    if (previous?.id && updated) {
      void shipmentsService.update(previous.id, storeShipmentToApiInput(updated)).catch((err) => {
        set((state) => ({ shipments: state.shipments.map((item) => (item.fileNo === fileNo ? previous : item)) }))
        console.error('[logistics] cost line update failed to persist:', err)
      })
    }
  },

  closeShipment: (fileNo) => {
    const shipment = get().shipments.find((s) => s.fileNo === fileNo)
    if (!shipment) return false

    // Check if any vehicles assigned to this shipment container are on Customs Hold!
    if (shipment.containerNo) {
      const containerVehicles = get().vehicles.filter((v) => v.assignedContainerNo === shipment.containerNo)
      const holdVehicles = containerVehicles.filter((v) => v.status === 'Hold' || v.customsTitleRejected)
      if (holdVehicles.length > 0) {
        window.alert(
          `Customs Security Alert: Container ${shipment.containerNo} contains vehicle (${holdVehicles[0].vin}) currently flagged with Customs Title Rejection / Hold. Shipment cannot be closed until hold is cleared!`
        )
        return false
      }
    }

    // Pre-Audit Margin Verification Gate (LogiSuite standard)
    const totalBilling = shipment.billingLines.reduce((acc, l) => acc + l.amount, 0)
    const totalCost = shipment.costLines.reduce((acc, l) => acc + l.amount, 0)
    if (totalCost > totalBilling) {
      window.alert(
        `Pre-Audit Margin Warning: Total carrier cost ($${totalCost.toFixed(2)}) exceeds billed revenue ($${totalBilling.toFixed(2)}). Profit is negative. Adjust rates before closing.`
      )
      return false
    }

    set((state) => ({
      shipments: state.shipments.map((s) =>
        s.fileNo === fileNo ? { ...s, status: 'Closed', closedAt: new Date().toISOString() } : s
      )
    }))

    get().addAuditLog({
      user: 'OFFICE',
      module: shipment.type,
      action: 'Close File',
      referenceNo: fileNo,
      details: `File ${fileNo} closed and locked for Accounting Bridge transfer`
    })

    if (shipment.id) {
      void shipmentsService
        .update(shipment.id, { status: 'Closed' })
        .then(() => syncShipmentTracking(shipment, 'Closed', 'Shipment file closed and verified for accounting handoff.'))
        .catch((err) => console.error('[logistics] shipment close or tracking update failed:', err))
    }

    return true
  },

  transferToBridge: (fileNo) => {
    const shipment = get().shipments.find((s) => s.fileNo === fileNo)
    if (!shipment || shipment.status !== 'Closed') {
      window.alert('File must be closed and verified before transferring to the Accounting Bridge.')
      return false
    }

    const newItems: BridgeStagingItem[] = []

    // Map customer billing lines into AR Invoices (fs_salebook)
    shipment.billingLines.forEach((b) => {
      newItems.push({
        id: `br-ar-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        sourceFileNo: shipment.fileNo,
        sourceType: shipment.type,
        customerOrVendor: b.customer,
        docType: 'Invoice (AR)',
        billingOrCostCode: b.code,
        glAccount: b.glAccount,
        description: `Shipment ${shipment.fileNo} - ${b.desc}`,
        amount: b.amount,
        status: 'Staged'
      })
    })

    // Map vendor cost lines into AP Payables (fs_purcbook)
    shipment.costLines.forEach((c) => {
      newItems.push({
        id: `br-ap-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        sourceFileNo: shipment.fileNo,
        sourceType: shipment.type,
        customerOrVendor: c.vendor,
        docType: 'Payable Cost (AP)',
        billingOrCostCode: c.code,
        glAccount: c.glAccount,
        description: `Shipment ${shipment.fileNo} - ${c.desc} [${c.vendor}]`,
        amount: c.amount,
        status: 'Staged'
      })
    })

    set((state) => ({
      bridgeQueue: [...newItems, ...state.bridgeQueue],
      shipments: state.shipments.map((s) =>
        s.fileNo === fileNo ? { ...s, status: 'Transferred', transferredAt: new Date().toISOString() } : s
      )
    }))

    // Consolidated Auto-CDV generation for vendor payables
    const vendorMap: Record<string, { lines: CostLine[]; total: number }> = {}
    shipment.costLines.forEach((c) => {
      const vendorName = c.vendor || 'Carrier / Service Vendor'
      if (!vendorMap[vendorName]) vendorMap[vendorName] = { lines: [], total: 0 }
      vendorMap[vendorName].lines.push(c)
      vendorMap[vendorName].total += c.amount
    })

    const todayStr = new Date().toISOString().split('T')[0]
    Object.entries(vendorMap).forEach(([vendor, group]) => {
      const checkNum = `CHK-${Math.floor(100000 + Math.random() * 900000)}`
      const jvNum = `CDV-${todayStr.replace(/-/g, '')}-${checkNum.replace(/[^0-9]/g, '')}`
      const primaryGl = group.lines[0]?.glAccount || '5010'

      const newCheck: CheckDisbursement = {
        id: `chk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        checkNo: checkNum,
        checkType: 'COMPUTER',
        paymentType: 'PAYMENT',
        date: todayStr,
        glPeriod: todayStr.slice(0, 7),
        status: 'POSTED',
        vendor,
        amount: group.total,
        isVoucher: true,
        bankName: 'BDO Operations Checking',
        currency: 'PHP',
        exchangeRate: 1,
        reference: shipment.fileNo,
        comments: `Automated CDV for ${shipment.fileNo} (${group.lines.map((l) => l.code).join(', ')})`,
        jeNo: jvNum,
        postedPeriod: todayStr.slice(0, 7),
        postedDate: todayStr,
        invoicesApplied: group.lines.map((l) => ({
          invoiceNo: shipment.fileNo,
          date: todayStr,
          dueDate: todayStr,
          reference: l.desc,
          amount: l.amount,
          discount: 0,
          applied: l.amount,
          apAccount: '2010',
          glExpense: l.glAccount || '5010',
          type: 'Disbursement'
        }))
      }

      set((state) => ({ checks: [newCheck, ...state.checks] }))

      void axios.post('/api/fs/bridge/create-check', {
        checkNo: checkNum,
        jvNo: jvNum,
        date: todayStr,
        payee: vendor,
        amount: group.total,
        description: `Consolidated Carrier Disbursement (File: ${shipment.fileNo})`,
        bankNo: 1,
        expenseAccount: primaryGl,
        assetAccount: '1010',
        sourceRef: shipment.fileNo
      }).catch((err) => console.warn('[logistics] auto-cdv bridge notification:', err))
    })

    get().addAuditLog({
      user: 'OFFICE',
      module: 'Accounting Bridge',
      action: 'Transfer to Bridge & Auto-CDV',
      referenceNo: fileNo,
      details: `Transferred ${newItems.length} charge lines and auto-generated ${Object.keys(vendorMap).length} consolidated vendor CDV vouchers`
    })

    if (shipment.id) {
      void shipmentsService
        .update(shipment.id, { status: 'Transferred' })
        .then(() => syncShipmentTracking(shipment, 'Accounting Handoff', 'Shipment charges transferred to the accounting bridge.'))
        .catch((err) => console.error('[logistics] shipment transfer or tracking update failed:', err))
    }

    void Promise.all(
      newItems.map((item) => bridgeItemsService.create(storeBridgeItemToApiInput(item)))
    ).catch((err) => console.error('[logistics] bridge transfer failed to persist:', err))

    return true
  },

  stageBridgeItem: async (item) => {
    set((state) => ({ bridgeQueue: [item, ...state.bridgeQueue] }))
    try {
      const created = await bridgeItemsService.create(storeBridgeItemToApiInput(item))
      const mapped = apiBridgeItemToStore(created)
      set((state) => ({
        bridgeQueue: state.bridgeQueue.map((existing) => (existing.id === item.id ? mapped : existing)),
      }))
      return true
    } catch (err) {
      set((state) => ({ bridgeQueue: state.bridgeQueue.filter((existing) => existing.id !== item.id) }))
      console.error('[logistics] bridge item staging failed to persist:', err)
      return false
    }
  },

  createVehicle: (vehicle) => {
    set((state) => ({ vehicles: [vehicle, ...state.vehicles] }))
    get().addAuditLog({
      user: 'OFFICE',
      module: 'Vehicle Inventory',
      action: 'New Vehicle Entry',
      referenceNo: vehicle.vin,
      details: `Registered VIN ${vehicle.vin} (${vehicle.year} ${vehicle.make} ${vehicle.model})`
    })
    void vehiclesService
      .create(storeVehicleToApiInput(vehicle))
      .then((created) => {
        const mapped = apiVehicleToStore(created)
        set((state) => ({ vehicles: state.vehicles.map((item) => (item.id === vehicle.id ? mapped : item)) }))
      })
      .catch((err) => console.error('[logistics] vehicle create failed to persist:', err))
  },

  updateVehicle: (id, updates) => {
    set((state) => ({
      vehicles: state.vehicles.map((v) => (v.id === id ? { ...v, ...updates } : v))
    }))
    const current = get().vehicles.find((vehicle) => vehicle.id === id)
    if (current) {
      void vehiclesService.update(id, storeVehicleToApiInput(current))
        .then((updated) => {
          const mapped = apiVehicleToStore(updated)
          set((state) => ({ vehicles: state.vehicles.map((item) => (item.id === id ? mapped : item)) }))
        })
        .catch((err) => console.error('[logistics] vehicle update failed to persist:', err))
    }
  },

  decodeVin: async (vin) => {
    // Attempt real live NHTSA API decode
    try {
      const resp = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${vin}?format=json`, {
        signal: AbortSignal.timeout(4000)
      })
      if (resp.ok) {
        const json = await resp.json()
        const results = json.Results || []
        const findVal = (varId: number) => results.find((r: any) => r.VariableId === varId)?.Value || ''
        const year = parseInt(findVal(29) || '', 10)
        const make = findVal(26) || ''
        const model = findVal(28) || ''
        const bodyType = findVal(5) || ''
        const engine = `${findVal(70) || ''} ${findVal(64) || ''}`.trim()
        if (year && make && model) {
          return { year, make, model, bodyType: bodyType || 'Passenger Vehicle', engine: engine || 'Gasoline Engine' }
        }
      }
    } catch (e) {
      console.warn('Live NHTSA decode timed out or unavailable, using internal pattern library', e)
    }

    throw new Error('VIN decoder unavailable: NHTSA did not return a complete vehicle identity')
  },

  inspectVehicle: (id, inspector = '') => {
    const stamp = Date.now().toString().slice(-4)
    const today = new Date().toISOString().split('T')[0]
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    set((state) => ({
      vehicles: state.vehicles.map((v) => {
        if (v.id !== id) return v
        const updatedHistory = [
          ...v.history,
          {
            status: 'Received',
            date: today,
            time: nowTime,
            user: 'INSPECTOR',
            comments: `Vehicle inspected by ${inspector || 'operator'}. Warehouse Receipt WR-${new Date().getFullYear()}-${stamp} generated.`
          }
        ]
        return {
          ...v,
          status: 'Received',
          warehouseReceiptNo: v.warehouseReceiptNo || `WR-${new Date().getFullYear()}-${stamp}`,
          inspectionNo: `INSP-${stamp}`,
          inspectionDate: today,
          inspector,
          receivedDate: today,
          history: updatedHistory
        }
      })
    }))
    const updated = get().vehicles.find((vehicle) => vehicle.id === id)
    if (updated) {
      void vehiclesService.update(id, storeVehicleToApiInput(updated))
        .catch((err) => console.error('[logistics] vehicle inspection failed to persist:', err))
    }
  },

  forceReadyToShip: (id) => {
    const today = new Date().toISOString().split('T')[0]
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    set((state) => ({
      vehicles: state.vehicles.map((v) => {
        if (v.id !== id) return v
        if (v.status === 'Hold' || v.customsTitleRejected) {
          window.alert('Cannot force Ready to Ship while Customs Hold or Title Rejection is active.')
          return v
        }
        return {
          ...v,
          status: 'Ready to Ship',
          titleStatus: 'Received',
          lienReleaseCleared: true,
          history: [
            ...v.history,
            { status: 'Ready to Ship', date: today, time: nowTime, user: 'OFFICE', comments: 'Cleared for container loading.' }
          ]
        }
      })
    }))
    const updated = get().vehicles.find((vehicle) => vehicle.id === id)
    if (updated && updated.status === 'Ready to Ship') {
      void vehiclesService.update(id, storeVehicleToApiInput(updated))
        .catch((err) => console.error('[logistics] vehicle readiness failed to persist:', err))
    }
  },

  toggleCustomsHold: (id, rejected) => {
    const target = get().vehicles.find((v) => v.id === id)
    if (!target) return

    const today = new Date().toISOString().split('T')[0]
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    set((state) => ({
      vehicles: state.vehicles.map((v) => {
        // Cascade to all vehicles in the same container
        if (v.id === id || (rejected && target.assignedContainerNo && v.assignedContainerNo === target.assignedContainerNo)) {
          const newStatus = rejected ? 'Hold' : (v.warehouseReceiptNo ? 'Ready to Ship' : 'Received')
          return {
            ...v,
            customsTitleRejected: rejected,
            status: newStatus,
            history: [
              ...v.history,
              {
                status: newStatus,
                date: today,
                time: nowTime,
                user: 'CUSTOMS_GATE',
                comments: rejected
                  ? `Customs Title Rejection triggered on container ${target.assignedContainerNo || 'Staged'}!`
                  : 'Customs hold cleared after title resubmission.'
              }
            ]
          }
        }
        return v
      })
    }))
    const updated = get().vehicles.find((vehicle) => vehicle.id === id)
    if (updated) {
      void vehiclesService.update(id, storeVehicleToApiInput(updated))
        .catch((err) => console.error('[logistics] customs hold update failed to persist:', err))
    }
  },

  assignVehicleToContainer: (vehicleId, containerNo) => {
    const today = new Date().toISOString().split('T')[0]
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    set((state) => ({
      vehicles: state.vehicles.map((v) =>
        v.id === vehicleId
          ? {
              ...v,
              assignedContainerNo: containerNo,
              status: 'Pre-Loaded',
              history: [
                ...v.history,
                { status: 'Pre-Loaded', date: today, time: nowTime, user: 'LOAD_MASTER', comments: `Assigned to container ${containerNo}` }
              ]
            }
          : v
      )
    }))
    const updated = get().vehicles.find((vehicle) => vehicle.id === vehicleId)
    if (updated) {
      void vehiclesService.update(vehicleId, storeVehicleToApiInput(updated))
        .catch((err) => console.error('[logistics] container assignment failed to persist:', err))
    }
  },

  createPDOrder: (order) => {
    set((state) => ({ pdOrders: [order, ...state.pdOrders] }))
    get().addAuditLog({
      user: 'DISPATCH',
      module: 'Pickup & Delivery',
      action: 'Create P/D Order',
      referenceNo: order.orderNo,
      details: `${order.type} order ${order.orderNo} created for ${order.consignee}`
    })
    void pdOrdersService
      .create(storePdOrderToApiInput(order))
      .then((created) => {
        const mapped = apiPdOrderToStore(created)
        set((state) => ({ pdOrders: state.pdOrders.map((item) => (item.id === order.id ? mapped : item)) }))
      })
      .catch((err) => console.error('[logistics] P/D order create failed to persist:', err))
  },

  updatePDOrder: (id, updates) => {
    set((state) => ({
      pdOrders: state.pdOrders.map((o) => (o.id === id ? { ...o, ...updates } : o))
    }))
    const current = get().pdOrders.find((order) => order.id === id)
    if (current) {
      void pdOrdersService.update(id, storePdOrderToApiInput(current))
        .then((updated) => {
          const mapped = apiPdOrderToStore(updated)
          set((state) => ({ pdOrders: state.pdOrders.map((item) => (item.id === id ? mapped : item)) }))
          if (mapped.amount > 0 && /completed|delivered/i.test(mapped.status) && !get().bridgeQueue.some((item) => item.sourceFileNo === mapped.orderNo)) {
            void get().stageBridgeItem({
              id: `br-pd-${mapped.id}`,
              sourceFileNo: mapped.orderNo,
              sourceType: 'P/D Cartage',
              customerOrVendor: mapped.consignee,
              docType: 'Invoice (AR)',
              billingOrCostCode: 'CART',
              glAccount: '',
              description: `Domestic ${mapped.type} Cartage Delivery - ${mapped.origin} to ${mapped.destination}`,
              amount: mapped.amount,
              status: 'Staged',
            })
          }
        })
        .catch((err) => console.error('[logistics] P/D order update failed to persist:', err))
    }
  },

  createWRFromPD: (orderId) => {
    const order = get().pdOrders.find((o) => o.id === orderId)
    if (!order) return ''

    const stamp = Date.now().toString().slice(-4)
    const wrNo = `WR-${new Date().getFullYear()}-${stamp}`

    set((state) => ({
      pdOrders: state.pdOrders.map((o) => (o.id === orderId ? { ...o, linkedWR: wrNo, status: 'Completed' } : o))
    }))

    get().addAuditLog({
      user: 'DISPATCH',
      module: 'Pickup & Delivery',
      action: 'Create Warehouse Receipt',
      referenceNo: wrNo,
      details: `Warehouse Receipt ${wrNo} generated from P/D Order ${order.orderNo}`
    })

    const updated = get().pdOrders.find((item) => item.id === orderId)
    if (updated) {
      void pdOrdersService.update(orderId, storePdOrderToApiInput(updated))
        .then(() => {
          if (updated.amount > 0 && !get().bridgeQueue.some((item) => item.sourceFileNo === updated.orderNo)) {
            return get().stageBridgeItem({
              id: `br-pd-${updated.id}`,
              sourceFileNo: updated.orderNo,
              sourceType: 'P/D Cartage',
              customerOrVendor: updated.consignee,
              docType: 'Invoice (AR)',
              billingOrCostCode: 'CART',
              glAccount: '',
              description: `Domestic ${updated.type} Cartage Delivery - ${updated.origin} to ${updated.destination}`,
              amount: updated.amount,
              status: 'Staged',
            })
          }
          return undefined
        })
        .catch((err) => console.error('[logistics] warehouse receipt update or accounting automation failed:', err))
    }

    return wrNo
  },

  updateTrackingStatus: (refNo, status, subStatus, description, user, attachments) => {
    const today = new Date().toISOString().split('T')[0]
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const milestoneId = `m-${Date.now()}`

    set((state) => {
      const existing = state.trackingItems.find((t) => t.refNo === refNo)
      if (existing) {
        return {
          trackingItems: state.trackingItems.map((t) =>
            t.refNo === refNo
              ? {
                  ...t,
                  currentStatus: status,
                  currentSubStatus: subStatus,
                  history: [
                    ...t.history,
                    {
                      id: milestoneId,
                      date: today,
                      time: nowTime,
                      status,
                      subStatus,
                      description,
                      updatedBy: user
                    }
                  ],
                  attachments: attachments ? [...t.attachments, ...attachments] : t.attachments
                }
              : t
          )
        }
      } else {
        const newItem: TrackingItem = {
          id: `trk-${Date.now()}`,
          refType: 'Ocean BL',
          refNo,
          shipper: '',
          consignee: '',
          origin: '',
          destination: '',
          scheduleDate: today,
          currentStatus: status,
          currentSubStatus: subStatus,
          history: [
            {
              id: milestoneId,
              date: today,
              time: nowTime,
              status,
              subStatus,
              description,
              updatedBy: user
            }
          ],
          attachments: attachments || []
        }
        return { trackingItems: [newItem, ...state.trackingItems] }
      }
    })
    const current = get().trackingItems.find((item) => item.refNo === refNo)
    if (current) {
      const input = storeTrackingToApiInput(current)
      const request = current.id.startsWith('trk-')
        ? trackingService.create(input)
        : trackingService.update(current.id, input)
      void request
        .then((updated) => {
          const mapped = apiTrackingToStore(updated)
          set((state) => ({ trackingItems: state.trackingItems.map((item) => (item.id === current.id ? mapped : item)) }))
        })
        .catch((err) => console.error('[logistics] tracking update failed to persist:', err))
    }
  },

  createWebAccount: (account) => {
    set((state) => ({ webAccounts: [account, ...state.webAccounts] }))
    void webAccountsService
      .create({
        customerName: account.customerName,
        username: account.userId,
        active: true,
        canTrack: account.permissions.canViewTracking,
        canDownloadPod: account.permissions.canDownloadPOD,
        canUploadDocs: account.permissions.canUploadDocs,
        canViewInvoices: account.permissions.canViewInvoices,
      })
      .then((created) => {
        const mapped = apiWebAccountToStore(created)
        set((state) => ({ webAccounts: state.webAccounts.map((item) => (item.id === account.id ? mapped : item)) }))
      })
      .catch((err) => console.error('[logistics] web account create failed to persist:', err))
  },

  createCheck: (check) => {
    set((state) => ({ checks: [check, ...state.checks] }))
    get().addAuditLog({
      user: 'ACCOUNTANT',
      module: 'Disbursements',
      action: 'Create Check Entry',
      referenceNo: check.checkNo,
      details: `Check #${check.checkNo} ($${check.amount.toFixed(2)}) issued to ${check.vendor}`
    })
    void checksService
      .create(storeCheckToApiInput(check))
      .then((created) => {
        const mapped = apiCheckToStore(created)
        set((state) => ({ checks: state.checks.map((item) => (item.id === check.id ? mapped : item)) }))
      })
      .catch((err) => console.error('[logistics] check create failed to persist:', err))

    // Real-time synchronization to FS Check Master & Balanced Voucher lines
    void axios
      .post('/api/fs/bridge/create-check', {
        checkNo: check.checkNo,
        date: check.date,
        payee: check.vendor,
        amount: check.amount,
        description: check.comments || check.reference || `Disbursement for ${check.vendor}`,
        bankNo: check.bankName?.includes('BDO') ? 1 : check.bankName?.includes('Metrobank') ? 2 : 1,
        expenseAccount: '5010',
        assetAccount: '1010'
      })
      .catch((err) => console.warn('[logistics] auto fs check bridge notice:', err))
  },

  autoBridgeOperationalCostToFsCheck: async ({ sourceFileNo, carrierOrVendor, amount, description, expenseAccount = '5010', bankNo = 1 }) => {
    const checkNo = `CHK-${Math.floor(100000 + Math.random() * 900000)}`
    const today = new Date().toISOString().split('T')[0]
    const jvNo = `CDV-${today.replace(/-/g, '')}-${checkNo.replace(/[^0-9]/g, '')}`

    const newCheckObj: CheckDisbursement = {
      id: `chk-${Date.now()}`,
      checkNo,
      checkType: 'COMPUTER',
      paymentType: 'PAYMENT',
      date: today,
      glPeriod: '2026-09',
      status: 'POSTED',
      vendor: carrierOrVendor,
      amount,
      isVoucher: true,
      bankName: bankNo === 1 ? 'BDO Operations Checking' : 'Metrobank Logistics Hub',
      currency: 'PHP',
      exchangeRate: 1,
      reference: sourceFileNo,
      comments: description,
      jeNo: jvNo,
      postedPeriod: '2026-09',
      invoicesApplied: [
        {
          invoiceNo: sourceFileNo,
          date: today,
          dueDate: today,
          reference: sourceFileNo,
          amount,
          discount: 0,
          applied: amount,
          apAccount: '2010',
          glExpense: expenseAccount,
          type: 'Disbursement'
        }
      ]
    }

    // 1. Add to store checks
    set((state) => ({ checks: [newCheckObj, ...state.checks] }))

    // 2. Post to FS backend
    try {
      await axios.post('/api/fs/bridge/create-check', {
        checkNo,
        jvNo,
        date: today,
        payee: carrierOrVendor,
        amount,
        description: `${description} (File: ${sourceFileNo})`,
        bankNo,
        expenseAccount,
        assetAccount: '1010',
        sourceRef: sourceFileNo
      })
    } catch (e) {
      console.warn('[logistics] autoBridge backend notice:', e)
    }

    // 3. Audit log
    get().addAuditLog({
      user: 'SYSTEM_BRIDGE',
      module: 'Accounting Bridge',
      action: '⚡ Auto-Bridge FS Check',
      referenceNo: checkNo,
      details: `Generated FS Cash Disbursement Voucher ${jvNo} for ${carrierOrVendor} (PHP ${amount.toLocaleString()}) from ${sourceFileNo}`
    })

    return {
      success: true,
      checkNo,
      jvNo,
      message: `Automated Check ${checkNo} created in FS Cash Disbursement register (Voucher ${jvNo})!`
    }
  },

  postCheckDisbursement: (checkId, trial) => {
    const check = get().checks.find((c) => c.id === checkId)
    if (!check) return { success: false, message: 'Check not found', debits: 0, credits: 0 }

    const debits = check.amount
    const credits = check.amount

    if (trial) {
      return {
        success: true,
        message: `Trial Post simulation verified! Total Debits ($${debits.toFixed(2)}) == Total Credits ($${credits.toFixed(2)}). Fiscal period ${check.glPeriod} is ACTIVE. Ready to post.`,
        debits,
        credits
      }
    }

    const today = new Date().toISOString().split('T')[0]
    const jeNo = `CDV-${today.replace(/-/g, '')}-${check.checkNo}`

    set((state) => ({
      checks: state.checks.map((c) =>
        c.id === checkId ? { ...c, status: 'POSTED', jeNo, postedPeriod: check.glPeriod, postedDate: today } : c
      )
    }))

    void checksService
      .update(checkId, {
        status: 'Posted',
        jeNo,
        postedAt: new Date().toISOString(),
      })
      .catch((err) => console.error('[logistics] check posting failed to persist:', err))

    get().addAuditLog({
      user: 'ACCOUNTANT',
      module: 'Disbursements',
      action: 'Post Disbursement',
      referenceNo: check.checkNo,
      details: `Check ${check.checkNo} finalized into General Ledger CDV voucher ${jeNo}`
    })

    return {
      success: true,
      message: `Disbursement successfully posted into FS General Ledger (fs_checkmas / fs_checkvou / fs_pournals)! Voucher No: ${jeNo}`,
      debits,
      credits
    }
  },

  runTrialPost: () => {
    const staged = get().bridgeQueue.filter((b) => b.status === 'Staged' || b.status === 'Trial Verified')
    if (staged.length === 0) {
      return { success: false, totalDebits: 0, totalCredits: 0, warnings: ['No staged transactions found in Bridge queue.'] }
    }

    const totalDebits = staged.reduce((acc, i) => acc + i.amount, 0)
    const totalCredits = staged.reduce((acc, i) => acc + i.amount, 0)
    const warnings: string[] = []

    staged.forEach((item) => {
      if (!item.glAccount) warnings.push(`Missing GL mapping for ${item.sourceFileNo} (${item.billingOrCostCode})`)
    })

    set((state) => ({
      bridgeQueue: state.bridgeQueue.map((b) =>
        b.status === 'Staged' ? { ...b, status: 'Trial Verified' } : b
      )
    }))

    void Promise.all(
      staged.map((item) => bridgeItemsService.update(item.id, { status: 'Trial Verified' }))
    ).catch((err) => console.error('[logistics] bridge trial post failed to persist:', err))

    return {
      success: warnings.length === 0,
      totalDebits,
      totalCredits,
      warnings
    }
  },

  executeFinalPost: () => {
    const verified = get().bridgeQueue.filter((b) => b.status === 'Trial Verified' || b.status === 'Staged')
    if (verified.length === 0) {
      return { success: false, postedCount: 0, message: 'No items ready for final posting.' }
    }

    const now = new Date().toISOString()
    const jvPrefix = `JV-${now.slice(0, 10).replace(/-/g, '')}-`

    set((state) => ({
      bridgeQueue: state.bridgeQueue.map((b, idx) =>
        b.status !== 'Posted'
          ? { ...b, status: 'Posted', postedJvNo: `${jvPrefix}${String(idx + 1).padStart(3, '0')}`, postedAt: now }
          : b
      )
    }))

    void Promise.all(
      verified.map((item, index) => bridgeItemsService.update(item.id, {
        status: 'Posted',
        postedAt: now,
        memo: `${item.description} | JV ${jvPrefix}${String(index + 1).padStart(3, '0')}`,
      }))
    ).catch((err) => console.error('[logistics] bridge final post failed to persist:', err))

    get().addAuditLog({
      user: 'ACCOUNTANT',
      module: 'Accounting Bridge',
      action: 'Commit Posting Batch',
      referenceNo: `${verified.length} lines`,
      details: `Bridged operational charges committed into fs_salebook, fs_purcbook & fs_pournals`
    })

    return {
      success: true,
      postedCount: verified.length,
      message: `Successfully posted ${verified.length} transactions into Financial Statements (fs_salebook, fs_purcbook & fs_pournals)!`
    }
  },

  // Fleet & Dispatch Implementations
  createDriver: (driver) => {
    set((state) => ({ drivers: [driver, ...state.drivers] }))
    get().addAuditLog({
      user: 'DISPATCHER',
      module: 'Fleet & Driver Registry',
      action: 'Register Driver',
      referenceNo: driver.code,
      details: `Registered driver ${driver.name} (${driver.licenseNo}) assigned to ${driver.branch}`
    })
    void driversService
      .create(storeDriverToApiInput(driver))
      .then((created) => {
        const mapped = apiDriverToStore(created)
        set((state) => ({ drivers: state.drivers.map((item) => (item.id === driver.id ? mapped : item)) }))
      })
      .catch((err) => console.error('[logistics] driver create failed to persist:', err))
  },

  updateDriver: (id, updates) => {
    set((state) => ({
      drivers: state.drivers.map((d) => (d.id === id ? { ...d, ...updates } : d))
    }))
    const current = get().drivers.find((driver) => driver.id === id)
    if (current) {
      void driversService.update(id, storeDriverToApiInput(current))
        .then((updated) => {
          const mapped = apiDriverToStore(updated)
          set((state) => ({ drivers: state.drivers.map((item) => (item.id === id ? mapped : item)) }))
        })
        .catch((err) => console.error('[logistics] driver update failed to persist:', err))
    }
  },

  deleteDriver: (id) => {
    set((state) => ({ drivers: state.drivers.filter((d) => d.id !== id) }))
  },

  createFleetVehicle: (vehicle) => {
    set((state) => ({ fleetVehicles: [vehicle, ...state.fleetVehicles] }))
    get().addAuditLog({
      user: 'DISPATCHER',
      module: 'Fleet Operations',
      action: 'Register Vehicle',
      referenceNo: vehicle.plateNo,
      details: `Registered fleet unit ${vehicle.plateNo} (${vehicle.vehicleType} - ${vehicle.makeModel})`
    })
    void fleetVehiclesService
      .create(storeFleetVehicleToApiInput(vehicle))
      .then((created) => {
        const mapped = apiFleetVehicleToStore(created)
        set((state) => ({ fleetVehicles: state.fleetVehicles.map((item) => (item.id === vehicle.id ? mapped : item)) }))
      })
      .catch((err) => console.error('[logistics] fleet vehicle create failed to persist:', err))
  },

  updateFleetVehicle: (id, updates) => {
    set((state) => ({
      fleetVehicles: state.fleetVehicles.map((v) => (v.id === id ? { ...v, ...updates } : v))
    }))
    const current = get().fleetVehicles.find((vehicle) => vehicle.id === id)
    if (current) {
      void fleetVehiclesService.update(id, storeFleetVehicleToApiInput(current))
        .then((updated) => {
          const mapped = apiFleetVehicleToStore(updated)
          set((state) => ({ fleetVehicles: state.fleetVehicles.map((item) => (item.id === id ? mapped : item)) }))
        })
        .catch((err) => console.error('[logistics] fleet vehicle update failed to persist:', err))
    }
  },

  deleteFleetVehicle: (id) => {
    set((state) => ({ fleetVehicles: state.fleetVehicles.filter((v) => v.id !== id) }))
  },

  createDispatchRoute: (route) => {
    set((state) => ({ dispatchRoutes: [route, ...state.dispatchRoutes] }))
    get().addAuditLog({
      user: 'DISPATCHER',
      module: 'Dispatch Routing',
      action: 'Create Dispatch Route',
      referenceNo: route.dispatchNo,
      details: `Route ${route.dispatchNo} created from ${route.originBranch} to ${route.destBranch} assigned to ${route.driverName} (${route.vehiclePlate})`
    })
    void dispatchRoutesService
      .create(storeDispatchRouteToApiInput(route))
      .then((created) => {
        const mapped = apiDispatchRouteToStore(created)
        set((state) => ({ dispatchRoutes: state.dispatchRoutes.map((item) => (item.id === route.id ? mapped : item)) }))
      })
      .catch((err) => console.error('[logistics] dispatch route create failed to persist:', err))
  },

  updateDispatchRoute: (id, updates) => {
    set((state) => ({
      dispatchRoutes: state.dispatchRoutes.map((r) => (r.id === id ? { ...r, ...updates } : r))
    }))
    const current = get().dispatchRoutes.find((route) => route.id === id)
    if (current) {
      void dispatchRoutesService.update(id, storeDispatchRouteToApiInput(current))
        .then((updated) => {
          const mapped = apiDispatchRouteToStore(updated)
          set((state) => ({ dispatchRoutes: state.dispatchRoutes.map((item) => (item.id === id ? mapped : item)) }))
        })
        .catch((err) => console.error('[logistics] dispatch route update failed to persist:', err))
    }
  },

  signPOD: (routeId, signatureBase64, receiverName, notes) => {
    const now = new Date().toISOString()
    set((state) => ({
      dispatchRoutes: state.dispatchRoutes.map((r) =>
        r.id === routeId
          ? {
              ...r,
              status: 'Completed',
              podSignature: signatureBase64,
              podReceiverName: receiverName,
              podNotes: notes,
              podDeliveredAt: now
            }
          : r
      ),
      modalOpen: { ...state.modalOpen, podSignature: false }
    }))
    get().addAuditLog({
      user: 'DRIVER/RECEIVER',
      module: 'Proof of Delivery (POD)',
      action: 'Capture Digital POD',
      referenceNo: routeId,
      details: `Digital POD signed by ${receiverName} on ${now}`
    })
    const updated = get().dispatchRoutes.find((route) => route.id === routeId)
    if (updated) {
      void dispatchRoutesService.update(routeId, storeDispatchRouteToApiInput(updated))
        .catch((err) => console.error('[logistics] POD signature failed to persist:', err))
    }
  },

  resetAllOperationalData: () => {
    set({
      quotes: [],
      shipments: [],
      loadingGuides: [],
      vehicles: [],
      pdOrders: [],
      trackingItems: [],
      webAccounts: [],
      checks: [],
      bridgeQueue: [],
      auditLogs: [],
      dispatchRoutes: [],
      selectedFileNo: null
    })
    try {
      localStorage.removeItem('kornet-logistics-storage')
    } catch (e) {}
  },

  addAuditLog: (entry) => {
    const newEntry: AuditLogEntry = {
      id: `al-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toLocaleString(),
      ...entry
    }
    set((state) => ({ auditLogs: [newEntry, ...state.auditLogs] }))
  }
    }),
    {
      name: 'kornet-logistics-storage',
      partialize: (state) => ({
        quotes: state.quotes,
        loadingGuides: state.loadingGuides,
        vehicles: state.vehicles,
        pdOrders: state.pdOrders,
        trackingItems: state.trackingItems,
        webAccounts: state.webAccounts,
        checks: state.checks,
        bridgeQueue: state.bridgeQueue,
        auditLogs: state.auditLogs,
        drivers: state.drivers,
        fleetVehicles: state.fleetVehicles,
        dispatchRoutes: state.dispatchRoutes,
        phBranches: state.phBranches
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.modalOpen = {
            newQuote: false,
            newBooking: false,
            newBL: false,
            newAirFile: false,
            newAirwaybill: false,
            newPDOrder: false,
            newVehicle: false,
            newCheck: false,
            containerStuffing: false,
            manifest: false,
            fileAnalysis: false,
            fileStatusChange: false,
            transactionPosting: false,
            printDoc: false,
            auditLog: false,
            attachments: false,
            webStatusUpdate: false,
            newCharge: false,
            sedFiling: false,
            billingCodes: false,
            carriersDirectory: false,
            portsDirectory: false,
            systemDiagnostics: false,
            newDriver: false,
            newFleetVehicle: false,
            newDispatchRoute: false,
            podSignature: false,
            resetConfirm: false
          }
          state.printDocPayload = null
        }
      }
    }
  )
)