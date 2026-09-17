import { Router } from 'express';
import { prisma } from '../db.js';
import { createCrudRouter, type PrismaDelegate } from '../lib/crud.js';
import authRoutes from './auth.js';
import usersRoutes from './users.js';
import companiesRoutes from './companies.js';
import auditRoutes from './audit.js';
import supportRoutes from './support.js';
import fsRoutes from './fs.js';
import * as s from '../schemas.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/companies', companiesRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/support', supportRoutes);
router.use('/fs', fsRoutes);

// Tenant-scoped resources via the generic CRUD factory.
router.use(
  '/shipments',
  createCrudRouter({
    model: prisma.shipment as unknown as PrismaDelegate,
    entity: 'Shipment',
    createSchema: s.shipmentCreate,
    updateSchema: s.shipmentUpdate,
    jsonFields: ['billingLines', 'costLines'],
    searchFields: ['fileNo', 'blAwbNo', 'bookingNo', 'shipperName', 'consigneeName', 'carrier'],
    numbering: { field: 'fileNo', prefix: 'KE-SHP' },
  }),
);

router.use(
  '/vehicles',
  createCrudRouter({
    model: prisma.vehicle as unknown as PrismaDelegate,
    entity: 'Vehicle',
    createSchema: s.vehicleCreate,
    updateSchema: s.vehicleUpdate,
    jsonFields: ['history'],
    searchFields: ['vin', 'make', 'model', 'shipperName', 'consigneeName', 'bookingNo'],
  }),
);

router.use(
  '/pd-orders',
  createCrudRouter({
    model: prisma.pdOrder as unknown as PrismaDelegate,
    entity: 'PdOrder',
    createSchema: s.pdOrderCreate,
    updateSchema: s.pdOrderUpdate,
    jsonFields: ['cargoItems'],
    searchFields: ['orderNo', 'barcode', 'shipperName', 'consigneeName', 'driverName', 'wrNo'],
    numbering: { field: 'orderNo', prefix: 'KE-PD' },
  }),
);

router.use(
  '/quotes',
  createCrudRouter({
    model: prisma.quote as unknown as PrismaDelegate,
    entity: 'Quote',
    createSchema: s.quoteCreate,
    updateSchema: s.quoteUpdate,
    jsonFields: ['lines'],
    searchFields: ['quoteNo', 'customerName', 'originPort', 'destinationPort', 'commodity'],
    numbering: { field: 'quoteNo', prefix: 'KE-QT' },
  }),
);

router.use(
  '/drivers',
  createCrudRouter({
    model: prisma.driver as unknown as PrismaDelegate,
    entity: 'Driver',
    createSchema: s.driverCreate,
    updateSchema: s.driverUpdate,
    searchFields: ['name', 'licenseNo', 'phone', 'plateHint'],
  }),
);

router.use(
  '/fleet-vehicles',
  createCrudRouter({
    model: prisma.fleetVehicle as unknown as PrismaDelegate,
    entity: 'FleetVehicle',
    createSchema: s.fleetVehicleCreate,
    updateSchema: s.fleetVehicleUpdate,
    searchFields: ['plateNo', 'type', 'make'],
  }),
);

router.use(
  '/dispatch-routes',
  createCrudRouter({
    model: prisma.dispatchRoute as unknown as PrismaDelegate,
    entity: 'DispatchRoute',
    createSchema: s.dispatchRouteCreate,
    updateSchema: s.dispatchRouteUpdate,
    jsonFields: ['stops'],
    searchFields: ['routeNo', 'origin', 'destination', 'driverName', 'vehiclePlate', 'cargoRef'],
    numbering: { field: 'routeNo', prefix: 'KE-RT' },
  }),
);

router.use(
  '/checks',
  createCrudRouter({
    model: prisma.checkDisbursement as unknown as PrismaDelegate,
    entity: 'CheckDisbursement',
    createSchema: s.checkCreate,
    updateSchema: s.checkUpdate,
    searchFields: ['checkNo', 'payee', 'bank', 'glAccount', 'jeNo'],
  }),
);

router.use(
  '/bridge-items',
  createCrudRouter({
    model: prisma.bridgeItem as unknown as PrismaDelegate,
    entity: 'BridgeItem',
    createSchema: s.bridgeCreate,
    updateSchema: s.bridgeUpdate,
    searchFields: ['refNo', 'party', 'sourceFileNo', 'glAccount'],
    numbering: { field: 'refNo', prefix: 'KE-BR' },
  }),
);

router.use(
  '/tracking',
  createCrudRouter({
    model: prisma.trackingItem as unknown as PrismaDelegate,
    entity: 'TrackingItem',
    createSchema: s.trackingCreate,
    updateSchema: s.trackingUpdate,
    jsonFields: ['milestones'],
    searchFields: ['trackingNo', 'refFileNo', 'shipperName', 'consigneeName', 'origin', 'destination'],
    numbering: { field: 'trackingNo', prefix: 'KE-TRK' },
  }),
);

router.use(
  '/web-accounts',
  createCrudRouter({
    model: prisma.webAccount as unknown as PrismaDelegate,
    entity: 'WebAccount',
    createSchema: s.webAccountCreate,
    updateSchema: s.webAccountUpdate,
    searchFields: ['customerName', 'username', 'email'],
  }),
);

router.use(
  '/carriers',
  createCrudRouter({
    model: prisma.carrier as unknown as PrismaDelegate,
    entity: 'Carrier',
    createSchema: s.carrierCreate,
    updateSchema: s.carrierUpdate,
    searchFields: ['name', 'scac', 'contact'],
    orderBy: { name: 'asc' },
  }),
);

router.use(
  '/ports',
  createCrudRouter({
    model: prisma.port as unknown as PrismaDelegate,
    entity: 'Port',
    createSchema: s.portCreate,
    updateSchema: s.portUpdate,
    searchFields: ['code', 'name', 'country'],
    orderBy: { name: 'asc' },
  }),
);

router.use(
  '/billing-codes',
  createCrudRouter({
    model: prisma.billingCode as unknown as PrismaDelegate,
    entity: 'BillingCode',
    createSchema: s.billingCodeCreate,
    updateSchema: s.billingCodeUpdate,
    searchFields: ['code', 'description', 'glAccount'],
    orderBy: { code: 'asc' },
  }),
);

router.use(
  '/attachments',
  createCrudRouter({
    model: prisma.attachment as unknown as PrismaDelegate,
    entity: 'Attachment',
    createSchema: s.attachmentCreate,
    updateSchema: s.attachmentUpdate,
    searchFields: ['fileName', 'entityType', 'entityId'],
  }),
);

router.use(
  '/integrations',
  createCrudRouter({
    model: prisma.integration as unknown as PrismaDelegate,
    entity: 'Integration',
    createSchema: s.integrationCreate,
    updateSchema: s.integrationUpdate,
    jsonFields: ['config'],
    searchFields: ['key', 'name', 'category', 'status'],
    orderBy: { name: 'asc' },
  }),
);

export default router;
