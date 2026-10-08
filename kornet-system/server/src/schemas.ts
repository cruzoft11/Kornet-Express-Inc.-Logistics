import { z } from 'zod';

const anyObj = z.object({}).passthrough();
const withOptionalNumber = (field: string, key: string) => anyObj.extend({ [field]: z.string().optional(), [key]: z.string().optional() });

export const partyCreate = anyObj.extend({ code: z.string().optional(), name: z.string().min(1) });
export const partyUpdate = partyCreate.partial();
export const shipmentCreate = withOptionalNumber('fileNo', 'mode');
export const shipmentUpdate = shipmentCreate.partial();
export const quoteCreate = anyObj.extend({ quoteNo: z.string().optional() });
export const quoteUpdate = quoteCreate.partial();
export const transportDocCreate = anyObj.extend({ docNo: z.string().optional(), shipmentId: z.string().min(1) });
export const transportDocUpdate = transportDocCreate.partial();
export const containerCreate = anyObj.extend({ shipmentId: z.string().min(1), equipmentType: z.string().default('20GP'), containerNo: z.string().min(1) });
export const containerUpdate = containerCreate.partial();
export const cargoLineCreate = anyObj;
export const cargoLineUpdate = cargoLineCreate.partial();
export const chargeCreate = anyObj.extend({ billingCode: z.string().min(1).default('MISC'), description: z.string().default('Charge') });
export const chargeUpdate = chargeCreate.partial();
export const invoiceCreate = anyObj.extend({ invoiceNo: z.string().optional() });
export const invoiceUpdate = invoiceCreate.partial();
export const apBillCreate = anyObj.extend({ billNo: z.string().optional() });
export const apBillUpdate = apBillCreate.partial();
export const receiptCreate = anyObj.extend({ receiptNo: z.string().optional() });
export const receiptUpdate = receiptCreate.partial();
export const checkCreate = anyObj.extend({ voucherNo: z.string().optional() });
export const checkUpdate = checkCreate.partial();
export const bridgeCreate = anyObj;
export const bridgeUpdate = bridgeCreate.partial();
export const vehicleCreate = anyObj.extend({ vin: z.string().min(1) });
export const vehicleUpdate = vehicleCreate.partial();
export const pdOrderCreate = anyObj.extend({ orderNo: z.string().optional() });
export const pdOrderUpdate = pdOrderCreate.partial();
export const driverCreate = anyObj.extend({ name: z.string().min(1) });
export const driverUpdate = driverCreate.partial();
export const fleetVehicleCreate = anyObj.extend({ plateNo: z.string().min(1) });
export const fleetVehicleUpdate = fleetVehicleCreate.partial();
export const dispatchRouteCreate = anyObj.extend({ routeNo: z.string().optional() });
export const dispatchRouteUpdate = dispatchRouteCreate.partial();
export const statusEventCreate = anyObj.extend({ entityType: z.string().min(1), entityId: z.string().min(1), code: z.string().min(1) });
export const statusEventUpdate = statusEventCreate.partial();
export const webAccountCreate = anyObj.extend({ customerName: z.string().min(1), username: z.string().min(1) });
export const webAccountUpdate = webAccountCreate.partial();
export const webUserCreate = anyObj.extend({ accountId: z.string().min(1), username: z.string().min(1), password: z.string().optional(), passwordHash: z.string().optional() });
export const webUserUpdate = webUserCreate.partial();
export const carrierCreate = anyObj.extend({ name: z.string().min(1) });
export const carrierUpdate = carrierCreate.partial();
export const portCreate = anyObj.extend({ code: z.string().min(1), name: z.string().min(1) });
export const portUpdate = portCreate.partial();
export const billingCodeCreate = anyObj.extend({ code: z.string().min(1), description: z.string().min(1) });
export const billingCodeUpdate = billingCodeCreate.partial();
export const tariffCreate = anyObj.extend({ billingCode: z.string().min(1), mode: z.string().min(1), unit: z.string().min(1) });
export const tariffUpdate = tariffCreate.partial();
export const companySettingCreate = anyObj.extend({ key: z.string().min(1), value: z.any() });
export const companySettingUpdate = companySettingCreate.partial();
export const attachmentCreate = anyObj.extend({ entityType: z.string().min(1), entityId: z.string().min(1), fileName: z.string().min(1), dataUrl: z.string().min(1) });
export const attachmentUpdate = attachmentCreate.partial();
export const integrationCreate = anyObj.extend({ key: z.string().min(1), name: z.string().min(1), category: z.string().min(1) });
export const integrationUpdate = integrationCreate.partial();

export const loginSchema = z.object({ username: z.string().min(1), password: z.string().min(1) });
export const refreshSchema = z.object({ refreshToken: z.string().min(1) });
export const userCreate = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  fullName: z.string().min(1),
  email: z.string().optional().nullable(),
  role: z.enum(['superadmin', 'admin', 'manager', 'operations', 'accounting', 'viewer', 'operator', 'accountant']).default('operations'),
  active: z.boolean().optional(),
  canAccessFs: z.boolean().optional(),
});
export const userUpdate = z.object({
  password: z.string().min(6).optional(),
  fullName: z.string().min(1).optional(),
  email: z.string().optional().nullable(),
  role: z.enum(['superadmin', 'admin', 'manager', 'operations', 'accounting', 'viewer', 'operator', 'accountant']).optional(),
  active: z.boolean().optional(),
  canAccessFs: z.boolean().optional(),
});
export const supportTicketCreate = z.object({ name: z.string().min(1), email: z.string().optional().nullable(), subject: z.string().min(1), message: z.string().min(1) });
