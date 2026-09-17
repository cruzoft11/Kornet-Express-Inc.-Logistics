// Shared API types — mirror the backend Prisma models (server/prisma/schema.prisma).

export type Role = 'superadmin' | 'manager' | 'operator' | 'accountant' | 'viewer';

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  role: Role;
  active: boolean;
  canAccessFs: boolean;
  companies: string[];
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export interface Company {
  id: string;
  code: string;
  name: string;
  legalName?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  tin?: string | null;
  branch?: string | null;
  active: boolean;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// Line-item shapes stored in JSON columns
export interface BillingLine {
  code?: string;
  description?: string;
  qty?: number;
  rate?: number;
  amount: number;
  taxable?: boolean;
}
export interface CostLine {
  code?: string;
  description?: string;
  vendor?: string;
  amount: number;
}
export interface Milestone {
  status: string;
  location?: string;
  note?: string;
  at: string;
}
export interface CargoItem {
  description: string;
  qty?: number;
  weightKg?: number;
  volumeCbm?: number;
}

export interface Shipment {
  id: string;
  companyCode: string;
  fileNo: string;
  mode: 'ocean' | 'air';
  status: string;
  direction: string;
  bookingNo?: string | null;
  blAwbNo?: string | null;
  shipperName?: string | null;
  shipperAddress?: string | null;
  consigneeName?: string | null;
  consigneeAddress?: string | null;
  notifyParty?: string | null;
  originPort?: string | null;
  destinationPort?: string | null;
  carrier?: string | null;
  vesselOrFlight?: string | null;
  voyageOrFlightNo?: string | null;
  etd?: string | null;
  eta?: string | null;
  containerNo?: string | null;
  containerType?: string | null;
  commodity?: string | null;
  packages: number;
  grossWeightKg: number;
  volumeCbm: number;
  chargeableWeight: number;
  incoterm?: string | null;
  currency: string;
  remarks?: string | null;
  billingLines: BillingLine[];
  costLines: CostLine[];
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Vehicle {
  id: string;
  companyCode: string;
  vin: string;
  year?: number | null;
  make?: string | null;
  model?: string | null;
  bodyClass?: string | null;
  color?: string | null;
  engine?: string | null;
  status: string;
  titleStatus: string;
  shipperName?: string | null;
  consigneeName?: string | null;
  warehouse?: string | null;
  originPort?: string | null;
  destinationPort?: string | null;
  bookingNo?: string | null;
  customsHold: boolean;
  lienReleaseCleared: boolean;
  odometer?: number | null;
  remarks?: string | null;
  history: Array<Record<string, unknown>>;
  createdAt: string;
  updatedAt: string;
}

export interface PdOrder {
  id: string;
  companyCode: string;
  orderNo: string;
  barcode?: string | null;
  status: string;
  type: string;
  shipperName?: string | null;
  consigneeName?: string | null;
  originAddr?: string | null;
  destAddr?: string | null;
  warehouse?: string | null;
  division?: string | null;
  driverName?: string | null;
  driverPlate?: string | null;
  equipment?: string | null;
  scheduledAt?: string | null;
  cargoItems: CargoItem[];
  linkedFileNo?: string | null;
  wrNo?: string | null;
  remarks?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Quote {
  id: string;
  companyCode: string;
  quoteNo: string;
  status: string;
  mode: string;
  customerName?: string | null;
  originPort?: string | null;
  destinationPort?: string | null;
  commodity?: string | null;
  validUntil?: string | null;
  currency: string;
  lines: BillingLine[];
  total: number;
  remarks?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Driver {
  id: string;
  companyCode: string;
  name: string;
  licenseNo?: string | null;
  phone?: string | null;
  plateHint?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface FleetVehicle {
  id: string;
  companyCode: string;
  plateNo: string;
  type?: string | null;
  make?: string | null;
  capacity?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface DispatchRoute {
  id: string;
  companyCode: string;
  routeNo: string;
  stage: string;
  origin?: string | null;
  destination?: string | null;
  driverName?: string | null;
  vehiclePlate?: string | null;
  cargoRef?: string | null;
  scheduledAt?: string | null;
  podSignature?: string | null;
  podSignedBy?: string | null;
  podSignedAt?: string | null;
  stops: Array<Record<string, unknown>>;
  remarks?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CheckDisbursement {
  id: string;
  companyCode: string;
  checkNo: string;
  status: string;
  payee?: string | null;
  bank?: string | null;
  amount: number;
  currency: string;
  glAccount?: string | null;
  memo?: string | null;
  jeNo?: string | null;
  postedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BridgeItem {
  id: string;
  companyCode: string;
  refNo: string;
  type: string;
  status: string;
  sourceFileNo?: string | null;
  party?: string | null;
  glAccount?: string | null;
  debit: number;
  credit: number;
  currency: string;
  memo?: string | null;
  postedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TrackingItem {
  id: string;
  companyCode: string;
  trackingNo: string;
  refType: string;
  refFileNo?: string | null;
  status: string;
  shipperName?: string | null;
  consigneeName?: string | null;
  origin?: string | null;
  destination?: string | null;
  milestones: Milestone[];
  createdAt: string;
  updatedAt: string;
}

export interface WebAccount {
  id: string;
  companyCode: string;
  customerName: string;
  username: string;
  email?: string | null;
  active: boolean;
  canTrack: boolean;
  canDownloadPod: boolean;
  canUploadDocs: boolean;
  canViewInvoices: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Carrier {
  id: string;
  companyCode: string;
  name: string;
  scac?: string | null;
  mode: string;
  contact?: string | null;
}

export interface Port {
  id: string;
  companyCode: string;
  code: string;
  name: string;
  country: string;
  type: string;
}

export interface BillingCode {
  id: string;
  companyCode: string;
  code: string;
  description: string;
  glAccount?: string | null;
  defaultRate: number;
  taxable: boolean;
}

export interface Attachment {
  id: string;
  companyCode: string;
  entityType: string;
  entityId: string;
  fileName: string;
  mimeType?: string | null;
  sizeBytes: number;
  dataUrl: string;
  uploadedBy?: string | null;
  createdAt: string;
}

export interface Integration {
  id: string;
  companyCode: string;
  key: string;
  name: string;
  category: string;
  status: 'disconnected' | 'connected' | 'error';
  config: Record<string, unknown>;
  lastCheckedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  companyCode: string;
  userId?: string | null;
  username?: string | null;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  detail: Record<string, unknown>;
  createdAt: string;
}
