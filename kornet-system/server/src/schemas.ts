import { z } from 'zod';

const jsonArray = z.array(z.any());
const optDate = z.coerce.date().optional().nullable();
const optNum = z.coerce.number().optional();
const optStr = z.string().optional().nullable();

// ─── Shipment ───
export const shipmentCreate = z.object({
  fileNo: z.string().optional(),
  mode: z.enum(['ocean', 'air']).default('ocean'),
  status: z.string().default('Draft'),
  direction: z.string().default('Export'),
  bookingNo: optStr,
  blAwbNo: optStr,
  shipperName: optStr,
  shipperAddress: optStr,
  consigneeName: optStr,
  consigneeAddress: optStr,
  notifyParty: optStr,
  originPort: optStr,
  destinationPort: optStr,
  carrier: optStr,
  vesselOrFlight: optStr,
  voyageOrFlightNo: optStr,
  etd: optDate,
  eta: optDate,
  containerNo: optStr,
  containerType: optStr,
  commodity: optStr,
  packages: optNum,
  grossWeightKg: optNum,
  volumeCbm: optNum,
  chargeableWeight: optNum,
  incoterm: optStr,
  currency: z.string().default('PHP'),
  remarks: optStr,
  billingLines: jsonArray.optional(),
  costLines: jsonArray.optional(),
});
export const shipmentUpdate = shipmentCreate.partial();

// ─── Vehicle ───
export const vehicleCreate = z.object({
  vin: z.string().min(1),
  year: optNum,
  make: optStr,
  model: optStr,
  bodyClass: optStr,
  color: optStr,
  engine: optStr,
  status: z.string().default('Expected'),
  titleStatus: z.string().default('Pending'),
  shipperName: optStr,
  consigneeName: optStr,
  warehouse: optStr,
  originPort: optStr,
  destinationPort: optStr,
  bookingNo: optStr,
  customsHold: z.boolean().optional(),
  lienReleaseCleared: z.boolean().optional(),
  odometer: optNum,
  remarks: optStr,
  history: jsonArray.optional(),
});
export const vehicleUpdate = vehicleCreate.partial();

// ─── P/D Order ───
export const pdOrderCreate = z.object({
  orderNo: z.string().optional(),
  barcode: optStr,
  status: z.string().default('Open'),
  type: z.string().default('Pickup'),
  shipperName: optStr,
  consigneeName: optStr,
  originAddr: optStr,
  destAddr: optStr,
  warehouse: optStr,
  division: optStr,
  driverName: optStr,
  driverPlate: optStr,
  equipment: optStr,
  scheduledAt: optDate,
  cargoItems: jsonArray.optional(),
  linkedFileNo: optStr,
  wrNo: optStr,
  remarks: optStr,
});
export const pdOrderUpdate = pdOrderCreate.partial();

// ─── Quote ───
export const quoteCreate = z.object({
  quoteNo: z.string().optional(),
  status: z.string().default('Draft'),
  mode: z.string().default('ocean'),
  customerName: optStr,
  originPort: optStr,
  destinationPort: optStr,
  commodity: optStr,
  validUntil: optDate,
  currency: z.string().default('PHP'),
  lines: jsonArray.optional(),
  total: optNum,
  remarks: optStr,
});
export const quoteUpdate = quoteCreate.partial();

// ─── Driver ───
export const driverCreate = z.object({
  name: z.string().min(1),
  licenseNo: optStr,
  phone: optStr,
  plateHint: optStr,
  status: z.string().default('Available'),
});
export const driverUpdate = driverCreate.partial();

// ─── Fleet Vehicle ───
export const fleetVehicleCreate = z.object({
  plateNo: z.string().min(1),
  type: optStr,
  make: optStr,
  capacity: optStr,
  status: z.string().default('Available'),
});
export const fleetVehicleUpdate = fleetVehicleCreate.partial();

// ─── Dispatch Route ───
export const dispatchRouteCreate = z.object({
  routeNo: z.string().optional(),
  stage: z.string().default('Draft'),
  origin: optStr,
  destination: optStr,
  driverName: optStr,
  vehiclePlate: optStr,
  cargoRef: optStr,
  scheduledAt: optDate,
  podSignature: optStr,
  podSignedBy: optStr,
  podSignedAt: optDate,
  stops: jsonArray.optional(),
  remarks: optStr,
});
export const dispatchRouteUpdate = dispatchRouteCreate.partial();

// ─── Check Disbursement ───
export const checkCreate = z.object({
  checkNo: z.string().min(1),
  status: z.string().default('Draft'),
  payee: optStr,
  bank: optStr,
  amount: optNum,
  currency: z.string().default('PHP'),
  glAccount: optStr,
  memo: optStr,
  jeNo: optStr,
  postedAt: optDate,
});
export const checkUpdate = checkCreate.partial();

// ─── Bridge Item ───
export const bridgeCreate = z.object({
  refNo: z.string().optional(),
  type: z.string().default('AR Invoice'),
  status: z.string().default('Staged'),
  sourceFileNo: optStr,
  party: optStr,
  glAccount: optStr,
  debit: optNum,
  credit: optNum,
  currency: z.string().default('PHP'),
  memo: optStr,
  postedAt: optDate,
});
export const bridgeUpdate = bridgeCreate.partial();

// ─── Tracking Item ───
export const trackingCreate = z.object({
  trackingNo: z.string().optional(),
  refType: z.string().default('Shipment'),
  refFileNo: optStr,
  status: z.string().default('In Transit'),
  shipperName: optStr,
  consigneeName: optStr,
  origin: optStr,
  destination: optStr,
  milestones: jsonArray.optional(),
});
export const trackingUpdate = trackingCreate.partial();

// ─── Web Account ───
export const webAccountCreate = z.object({
  customerName: z.string().min(1),
  username: z.string().min(1),
  email: optStr,
  active: z.boolean().optional(),
  canTrack: z.boolean().optional(),
  canDownloadPod: z.boolean().optional(),
  canUploadDocs: z.boolean().optional(),
  canViewInvoices: z.boolean().optional(),
});
export const webAccountUpdate = webAccountCreate.partial();

// ─── Directories ───
export const carrierCreate = z.object({
  name: z.string().min(1),
  scac: optStr,
  mode: z.string().default('ocean'),
  contact: optStr,
});
export const carrierUpdate = carrierCreate.partial();

export const portCreate = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  country: z.string().default('PH'),
  type: z.string().default('sea'),
});
export const portUpdate = portCreate.partial();

export const billingCodeCreate = z.object({
  code: z.string().min(1),
  description: z.string().min(1),
  glAccount: optStr,
  defaultRate: optNum,
  taxable: z.boolean().optional(),
});
export const billingCodeUpdate = billingCodeCreate.partial();

// ─── Attachment ───
export const attachmentCreate = z.object({
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: optStr,
  sizeBytes: optNum,
  dataUrl: z.string().min(1),
});
export const attachmentUpdate = attachmentCreate.partial();

// ─── Integration ───
export const integrationCreate = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  status: z.string().default('disconnected'),
  config: z.record(z.string(), z.any()).optional(),
  lastCheckedAt: optDate,
});
export const integrationUpdate = integrationCreate.partial();

// ─── Auth ───
export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

// ─── Users (admin) ───
export const userCreate = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  fullName: z.string().min(1),
  email: optStr,
  role: z.enum(['superadmin', 'manager', 'operator', 'accountant', 'viewer']).default('operator'),
  active: z.boolean().optional(),
  canAccessFs: z.boolean().optional(),
  companies: z.array(z.string()).optional(),
});
export const userUpdate = z.object({
  password: z.string().min(6).optional(),
  fullName: z.string().min(1).optional(),
  email: optStr,
  role: z.enum(['superadmin', 'manager', 'operator', 'accountant', 'viewer']).optional(),
  active: z.boolean().optional(),
  canAccessFs: z.boolean().optional(),
  companies: z.array(z.string()).optional(),
});

// ─── Company (admin) ───
export const companyCreate = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  legalName: optStr,
  address: optStr,
  phone: optStr,
  email: optStr,
  tin: optStr,
  branch: optStr,
  active: z.boolean().optional(),
});
export const companyUpdate = companyCreate.partial();

// ─── Support ticket (public) ───
export const supportTicketCreate = z.object({
  name: z.string().min(1),
  email: optStr,
  subject: z.string().min(1),
  message: z.string().min(1),
});
