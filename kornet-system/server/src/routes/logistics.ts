import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { ZodTypeAny } from 'zod';
import { prisma } from '../db.js';
import { asyncHandler, badRequest, conflict, notFound, unauthorized } from '../lib/http.js';
import { requireAuth, requireCompany, requireRole } from '../middleware/auth.js';
import { COMPANY_CODE } from '../company.js';
import { createCrudRouter, type PrismaDelegate, writeAudit } from '../lib/crud.js';
import { nextNumber, sequenceKeyForShipment } from '../lib/sequence.js';
import { airChargeableKg, airVolumetricKg, cbm, fileMarginPct, oceanWmTons, round2, vatAmount } from '../lib/calc.js';
import { computeCharge, convertQuote, recomputeInvoice, recomputeApBill, applyTariffs, recalcShipment, shipmentAnalysis, createInvoiceFromShipment, createApBillsFromShipment, createDraftFinanceForShipment, postInvoice, postApBill, trialBridge, finalBridge, closeShipment, closeCheck, createBridge, getOwned, emitStatus, bankAccount, parseJson, assertChargeMutable, assertShipmentMutable } from '../services/domain.js';
import * as s from '../schemas.js';

const logistics = Router();
logistics.use(requireAuth, requireCompany);
const writeAll = requireRole('operations', 'accounting', 'manager', 'admin');
const acct = requireRole('accounting', 'manager', 'admin');

function delegate(name: string) { return (prisma as unknown as Record<string, PrismaDelegate>)[name]; }
function crud(path: string, modelName: string, entity: string, createSchema: ZodTypeAny, updateSchema: ZodTypeAny, options: Partial<Parameters<typeof createCrudRouter>[0]> = {}) {
  logistics.use(path, createCrudRouter({ model: delegate(modelName), modelName, entity, createSchema, updateSchema, ...options }));
}
async function chargeContext(companyCode: string, data: Record<string, unknown>) {
  if (typeof data.shipmentId === 'string' && data.shipmentId) {
    const shipment = await prisma.shipment.findFirst({ where: { id: data.shipmentId, companyCode }, include: { containers: true } });
    if (!shipment) throw notFound('Shipment not found');
    return {
      containerCount: shipment.containers.length,
      chargeableKg: shipment.totalChargeableKg,
      cbm: shipment.totalCbm,
      wmTons: shipment.totalWmTons,
      pieces: shipment.totalPieces,
      units: 1,
      percentBase: shipment.declaredValue,
    };
  }
  if (typeof data.quoteId === 'string' && data.quoteId) {
    const quote = await prisma.quote.findFirst({ where: { id: data.quoteId, companyCode }, include: { cargoLines: true } });
    if (!quote) throw notFound('Quote not found');
    const cargo = quote.cargoLines.reduce((totals, line) => {
      const pieces = line.pieces || 1;
      totals.pieces += line.pieces;
      totals.grossKg += line.grossKg;
      totals.cbm += line.cbm || cbm(line.lengthCm, line.widthCm, line.heightCm, pieces);
      totals.volumetricKg += line.volumetricKg || airVolumetricKg(line.lengthCm, line.widthCm, line.heightCm, pieces);
      return totals;
    }, { pieces: 0, grossKg: 0, cbm: 0, volumetricKg: 0 });
    return {
      containerCount: 0,
      chargeableKg: quote.mode.toUpperCase() === 'AIR' ? airChargeableKg(cargo.grossKg, cargo.volumetricKg) : cargo.grossKg,
      cbm: round2(cargo.cbm),
      wmTons: oceanWmTons(cargo.grossKg, cargo.cbm),
      pieces: cargo.pieces,
      units: 1,
      percentBase: quote.declaredValue,
    };
  }
  return {};
}

crud('/parties', 'party', 'Party', s.partyCreate, s.partyUpdate, { searchFields: ['code', 'name', 'email', 'tin'], orderBy: { name: 'asc' } });
crud('/tariffs', 'tariff', 'Tariff', s.tariffCreate, s.tariffUpdate, { searchFields: ['billingCode', 'originPortCode', 'destPortCode'], orderBy: { validFrom: 'desc' } });
crud('/quotes', 'quote', 'Quote', s.quoteCreate, s.quoteUpdate, { searchFields: ['quoteNo', 'commodity'], numbering: { field: 'quoteNo', key: 'QUOTE' }, include: { cargoLines: true, charges: true }, softDelete: true });
crud('/shipments', 'shipment', 'Shipment', s.shipmentCreate, s.shipmentUpdate, { searchFields: ['fileNo', 'bookingNo', 'customerRef', 'shipperName', 'consigneeName'], include: { cargoLines: true, containers: true, charges: true, transportDocs: true }, softDelete: true, afterWrite: async (row, action, req) => { if (action === 'create') await applyTariffs(String(row.id), req.companyCode!, req.user?.sub); } });
crud('/transport-docs', 'transportDoc', 'TransportDoc', s.transportDocCreate, s.transportDocUpdate, { searchFields: ['docNo', 'shipperName', 'consigneeName'], include: { cargoLines: true, containers: true }, softDelete: true });
crud('/containers', 'container', 'Container', s.containerCreate, s.containerUpdate, { searchFields: ['containerNo', 'sealNo'], softDelete: true, afterWrite: async (row, _action, req) => { if (row.shipmentId) await recalcShipment(String(row.shipmentId), req.companyCode!, true, req.user?.sub); } });
crud('/cargo-lines', 'cargoLine', 'CargoLine', s.cargoLineCreate, s.cargoLineUpdate, { afterWrite: async (row, _action, req) => { if (row.shipmentId) await recalcShipment(String(row.shipmentId), req.companyCode!, true, req.user?.sub); } });
crud('/invoices', 'invoice', 'Invoice', s.invoiceCreate, s.invoiceUpdate, { searchFields: ['invoiceNo', 'billToName'], numbering: { field: 'invoiceNo', key: 'INVOICE' }, include: { lines: true }, writeRoles: ['operations', 'accounting', 'manager', 'admin'], softDelete: true, afterWrite: async (row, _action, req) => { await recomputeInvoice(String(row.id), req.companyCode!); } });
crud('/ap-bills', 'apBill', 'ApBill', s.apBillCreate, s.apBillUpdate, { searchFields: ['billNo', 'vendorName', 'vendorInvoiceNo'], numbering: { field: 'billNo', key: 'AP_BILL' }, include: { lines: true }, writeRoles: ['accounting', 'manager', 'admin'], softDelete: true, afterWrite: async (row, _action, req) => { await recomputeApBill(String(row.id), req.companyCode!); } });
crud('/receipts', 'receipt', 'Receipt', s.receiptCreate, s.receiptUpdate, { searchFields: ['receiptNo', 'partyName', 'checkNo'], numbering: { field: 'receiptNo', key: 'RECEIPT' }, include: { applications: true }, writeRoles: ['accounting', 'manager', 'admin'], softDelete: true });
crud('/checks', 'checkDisbursement', 'CheckDisbursement', s.checkCreate, s.checkUpdate, { searchFields: ['voucherNo', 'checkNo', 'payeeName'], numbering: { field: 'voucherNo', key: 'CHECK' }, include: { applications: true, directExpenses: true }, writeRoles: ['accounting', 'manager', 'admin'], softDelete: true });
crud('/vehicles', 'vehicle', 'Vehicle', s.vehicleCreate, s.vehicleUpdate, { searchFields: ['vin', 'wrNo', 'make', 'model', 'shipperName', 'consigneeName'], numbering: { field: 'wrNo', key: 'WR' }, softDelete: true });
crud('/pd-orders', 'pdOrder', 'PdOrder', s.pdOrderCreate, s.pdOrderUpdate, { searchFields: ['orderNo', 'trackingNo', 'shipperName', 'consigneeName'], numbering: { field: 'orderNo', key: 'PD' }, include: { cargoLines: true, charges: true }, softDelete: true });
crud('/drivers', 'driver', 'Driver', s.driverCreate, s.driverUpdate, { searchFields: ['name', 'licenseNo', 'phone'] });
crud('/fleet-vehicles', 'fleetVehicle', 'FleetVehicle', s.fleetVehicleCreate, s.fleetVehicleUpdate, { searchFields: ['plateNo', 'type', 'make'] });
crud('/dispatch-routes', 'dispatchRoute', 'DispatchRoute', s.dispatchRouteCreate, s.dispatchRouteUpdate, { searchFields: ['routeNo', 'origin', 'destination'], numbering: { field: 'routeNo', key: 'DT' } });
crud('/status-events', 'statusEvent', 'StatusEvent', s.statusEventCreate, s.statusEventUpdate, { searchFields: ['entityType', 'entityId', 'code', 'location'] });
crud('/web-accounts', 'webAccount', 'WebAccount', s.webAccountCreate, s.webAccountUpdate, { searchFields: ['customerName', 'username', 'email'] });
crud('/web-users', 'webUser', 'WebUser', s.webUserCreate, s.webUserUpdate, { searchFields: ['username', 'email'] });
crud('/ports', 'port', 'Port', s.portCreate, s.portUpdate, { searchFields: ['code', 'unlocode', 'name', 'country'], orderBy: { name: 'asc' } });
crud('/billing-codes', 'billingCode', 'BillingCode', s.billingCodeCreate, s.billingCodeUpdate, { searchFields: ['code', 'description', 'category'], orderBy: { code: 'asc' } });
crud('/carriers', 'carrier', 'Carrier', s.carrierCreate, s.carrierUpdate, { searchFields: ['name', 'scac', 'contact'], orderBy: { name: 'asc' } });
crud('/attachments', 'attachment', 'Attachment', s.attachmentCreate, s.attachmentUpdate, { searchFields: ['fileName', 'entityType', 'entityId'] });
crud('/integrations', 'integration', 'Integration', s.integrationCreate, s.integrationUpdate, { searchFields: ['key', 'name', 'category', 'status'], jsonFields: ['config'], orderBy: { name: 'asc' } });
crud('/company-settings', 'companySetting', 'CompanySetting', s.companySettingCreate, s.companySettingUpdate, { searchFields: ['key'], jsonFields: ['value'] });

logistics.get('/quotes/:id/print', asyncHandler(async (req, res) => { const quote = await prisma.quote.findFirst({ where: { id: req.params.id, companyCode: req.companyCode! }, include: { cargoLines: true, charges: true } }); if (!quote) throw notFound('Quote not found'); res.json({ data: quote }); }));
logistics.post('/quotes/:id/convert', writeAll, asyncHandler(async (req, res) => {
  const converted = await convertQuote(req.params.id, req.companyCode!, req.user?.sub);
  if (!converted) throw notFound('Converted shipment not found');
  const cargoLineCount = await prisma.cargoLine.count({ where: { shipmentId: converted.id, companyCode: req.companyCode! } });
  const row = cargoLineCount > 0 && converted.totalPieces === 0 && converted.totalGrossKg === 0 && converted.totalCbm === 0 && converted.totalWmTons === 0
    ? await recalcShipment(converted.id, req.companyCode!, false, req.user?.sub)
    : converted;
  await writeAudit(req, 'convert', 'Quote', req.params.id, { shipment: row });
  res.json(row);
}));
logistics.post('/shipments/:id/apply-tariffs', writeAll, asyncHandler(async (req, res) => { await getOwned(prisma.shipment, req.params.id, req.companyCode!, 'Shipment'); res.json({ data: await applyTariffs(req.params.id, req.companyCode!, req.user?.sub) }); }));
logistics.post('/shipments/:id/recalc', writeAll, asyncHandler(async (req, res) => res.json(await recalcShipment(req.params.id, req.companyCode!, false, req.user?.sub))));
logistics.get('/shipments/:id/analysis', asyncHandler(async (req, res) => res.json(await shipmentAnalysis(req.params.id, req.companyCode!))));
logistics.post('/shipments/:id/analysis', asyncHandler(async (req, res) => res.json(await shipmentAnalysis(req.params.id, req.companyCode!))));
logistics.get('/shipments/:id/close-check', asyncHandler(async (req, res) => res.json(await closeCheck(req.params.id, req.companyCode!))));
logistics.post('/shipments/:id/invoice', writeAll, asyncHandler(async (req, res) => res.json(await createInvoiceFromShipment(req.params.id, req.companyCode!, req.user?.sub))));
logistics.post('/shipments/:id/ap-bills', acct, asyncHandler(async (req, res) => res.json(await createApBillsFromShipment(req.params.id, req.companyCode!, req.user?.sub))));
logistics.post('/shipments/:id/close', writeAll, asyncHandler(async (req, res) => res.json(await closeShipment(req.params.id, req.companyCode!, req.user?.role, req.body?.overrideReason))));
logistics.post('/shipments/:id/reopen', requireRole('manager', 'admin'), asyncHandler(async (req, res) => { const sh = await getOwned(prisma.shipment, req.params.id, req.companyCode!, 'Shipment'); if (sh.status !== 'CLOSED') throw conflict('Only CLOSED shipments can be reopened'); const reason = String(req.body?.reason ?? '').trim(); if (!reason) throw badRequest('Reopen reason is required'); const row = await prisma.shipment.update({ where: { id: sh.id }, data: { status: 'DRAFT', closedAt: null, reopenReason: reason, version: { increment: 1 } } }); await emitStatus(req.companyCode!, 'SHIPMENT', sh.id, 'ROP', req.user?.sub, { notes: reason }); res.json(row); }));
logistics.post('/shipments/:id/status', writeAll, asyncHandler(async (req, res) => { const sh = await getOwned(prisma.shipment, req.params.id, req.companyCode!, 'Shipment'); const next = String(req.body?.status ?? sh.status); const updated = next !== sh.status ? await prisma.shipment.update({ where: { id: sh.id }, data: { status: next, version: { increment: 1 } } }) : sh; const ev = await emitStatus(req.companyCode!, 'SHIPMENT', sh.id, String(req.body?.code ?? next), req.user?.sub, { ...req.body, isPublic: Boolean(req.body?.isPublic) }); res.json({ shipment: updated, event: ev }); }));
logistics.post('/shipments/:id/clone', writeAll, asyncHandler(async (req, res) => { const sh = await prisma.shipment.findFirst({ where: { id: req.params.id, companyCode: req.companyCode! }, include: { cargoLines: true, charges: true } }); if (!sh) throw notFound('Shipment not found'); const cloned = await prisma.$transaction(async (tx) => { const fileNo = await nextNumber(tx, req.companyCode!, sequenceKeyForShipment(sh.mode, sh.direction)); const n = await tx.shipment.create({ data: { companyCode: req.companyCode!, fileNo, mode: sh.mode, direction: sh.direction, fileType: sh.fileType, loadType: sh.loadType, status: 'DRAFT', freightTerm: sh.freightTerm, incoterm: sh.incoterm, carrierPartyId: sh.carrierPartyId, polCode: sh.polCode, podCode: sh.podCode, shipperPartyId: sh.shipperPartyId, consigneePartyId: sh.consigneePartyId, billToPartyId: sh.billToPartyId, commodity: sh.commodity, currency: sh.currency, exchangeRate: sh.exchangeRate, createdBy: req.user?.sub } }); for (const l of sh.cargoLines) await tx.cargoLine.create({ data: { companyCode: req.companyCode!, shipmentId: n.id, lineNo: l.lineNo, pieces: l.pieces, packageType: l.packageType, description: l.description, lengthCm: l.lengthCm, widthCm: l.widthCm, heightCm: l.heightCm, grossKg: l.grossKg, cbm: l.cbm } }); for (const c of sh.charges) await tx.charge.create({ data: { companyCode: req.companyCode!, shipmentId: n.id, billingCode: c.billingCode, description: c.description, chargeSide: c.chargeSide, billParty: c.billParty, billToPartyId: c.billToPartyId, unit: c.unit, qty: c.qty, rate: c.rate, minAmount: c.minAmount, currency: c.currency, exchangeRate: c.exchangeRate, amount: c.amount, amountPhp: c.amountPhp, vatClass: c.vatClass, vatAmountPhp: c.vatAmountPhp, costVendorPartyId: c.costVendorPartyId, costQty: c.costQty, costRate: c.costRate, costAmount: c.costAmount, costAmountPhp: c.costAmountPhp, source: 'MANUAL', billStatus: 'OPEN', costStatus: 'OPEN' } }); return n; }); res.json(cloned); }));
logistics.get('/shipments/:id/documents/:kind', asyncHandler(async (req, res) => { const kinds = ['bl', 'hbl', 'awb', 'booking-confirmation', 'arrival-notice', 'delivery-order', 'cargo-release', 'manifest', 'file-analysis', 'invoice']; const kind = req.params.kind.toLowerCase(); if (kind === 'list') return res.json({ kinds }); if (!kinds.includes(kind)) throw badRequest('Unknown document kind'); const shipment = await prisma.shipment.findFirst({ where: { id: req.params.id, companyCode: req.companyCode! }, include: { cargoLines: true, containers: true, charges: true, transportDocs: true } }); if (!shipment) throw notFound('Shipment not found'); const [company, settings, ports] = await Promise.all([prisma.company.findUnique({ where: { code: req.companyCode! } }), prisma.companySetting.findMany({ where: { companyCode: req.companyCode! } }), prisma.port.findMany({ where: { companyCode: req.companyCode!, code: { in: [shipment.polCode ?? '', shipment.podCode ?? ''] } } })]); res.json({ kind, company, settings: Object.fromEntries(settings.map((x) => [x.key, parseJson(x.value, x.value)])), ports, shipment, cargo: shipment.cargoLines, containers: shipment.containers, charges: shipment.charges.filter((c) => c.showOnDoc), generatedAt: new Date().toISOString() }); }));
logistics.get('/transport-docs/:id', asyncHandler(async (req, res) => { const doc = await prisma.transportDoc.findFirst({ where: { id: req.params.id, companyCode: req.companyCode! }, include: { cargoLines: true, containers: true } }); if (!doc) throw notFound('Transport document not found'); const houses = doc.docClass === 'MASTER' ? await prisma.transportDoc.findMany({ where: { companyCode: req.companyCode!, parentDocId: doc.id }, include: { cargoLines: true } }) : []; const totals = houses.flatMap((h) => h.cargoLines).reduce((a, l) => ({ pieces: a.pieces + l.pieces, grossKg: a.grossKg + l.grossKg, cbm: round2(a.cbm + l.cbm) }), { pieces: 0, grossKg: 0, cbm: 0 }); res.json({ ...doc, houses, masterTotals: totals }); }));
logistics.post('/transport-docs/:id/issue', writeAll, asyncHandler(async (req, res) => {
  const d = await getOwned(prisma.transportDoc, req.params.id, req.companyCode!, 'Transport doc');
  if (d.status === 'ISSUED') return res.json(d);
  if (d.status !== 'DRAFT') throw conflict('Only DRAFT documents can be issued');

  const isHouseFreightDocument =
    d.docClass.toUpperCase() === 'HOUSE' && ['BL', 'HBL', 'AWB', 'HAWB'].includes(d.docType.toUpperCase());
  const financeDrafts = isHouseFreightDocument
    ? await createDraftFinanceForShipment(d.shipmentId, req.companyCode!, req.user?.sub)
    : { invoiceNumbers: [], apBillNumbers: [] };
  const row = await prisma.transportDoc.update({
    where: { id: d.id },
    data: { status: 'ISSUED', issueDate: new Date(), version: { increment: 1 } },
  });
  await emitStatus(req.companyCode!, 'SHIPMENT', d.shipmentId, 'DOC', req.user?.sub, {
    notes: `${d.docNo} issued`,
    isPublic: true,
  });
  res.json({ ...row, financeDrafts });
}));
logistics.post('/charges', writeAll, asyncHandler(async (req, res) => {
  const companyCode = req.companyCode!;
  const data = s.chargeCreate.parse(req.body) as Record<string, unknown>;
  await assertShipmentMutable(data.shipmentId as string | undefined, companyCode);
  const ctx = await chargeContext(companyCode, data);
  const bc = await prisma.billingCode.findUnique({ where: { companyCode_code: { companyCode, code: String(data.billingCode) } } });
  const computed = computeCharge({ ...data, vatClass: bc?.vatClass ?? data.vatClass }, ctx);
  const chargeData = { companyCode, createdBy: req.user?.sub, description: bc?.description ?? String(data.description ?? data.billingCode), vatClass: bc?.vatClass ?? String(data.vatClass ?? 'VATABLE'), billStatus: 'OPEN', costStatus: 'OPEN', ...data, ...computed };
  const created = await prisma.charge.create({ data: chargeData as never });
  await writeAudit(req, 'create', 'Charge', created.id, { after: created });
  res.status(201).json(created);
}));
logistics.get('/charges', asyncHandler(async (req, res) => { const where: Record<string, unknown> = { companyCode: req.companyCode! }; if (req.query.shipmentId) where.shipmentId = String(req.query.shipmentId); res.json({ data: await prisma.charge.findMany({ where, orderBy: { sortOrder: 'asc' } }) }); }));
logistics.get('/charges/:id', asyncHandler(async (req, res) => res.json(await getOwned(prisma.charge, req.params.id, req.companyCode!, 'Charge'))));
logistics.patch('/charges/:id', writeAll, asyncHandler(async (req, res) => {
  const companyCode = req.companyCode!;
  const existing = await getOwned(prisma.charge, req.params.id, companyCode, 'Charge');
  if (req.body?.version !== undefined && Number(req.body.version) !== existing.version) throw conflict('Version mismatch');
  const parsed = s.chargeUpdate.parse(req.body ?? {}) as Record<string, unknown>;
  for (const field of ['id', 'companyCode', 'createdBy', 'createdAt', 'updatedAt', 'invoiceId', 'apBillId', 'tariffId', 'source', 'status', 'billStatus', 'costStatus', 'version', 'deletedAt']) delete parsed[field];
  const financialChange = Object.keys(parsed).some((field) => !['notes', 'sortOrder'].includes(field));
  const [linkedInvoice, linkedApBill] = await Promise.all([
    existing.invoiceId
      ? prisma.invoice.findFirst({ where: { id: existing.invoiceId, companyCode }, select: { status: true } })
      : Promise.resolve(null),
    existing.apBillId
      ? prisma.apBill.findFirst({ where: { id: existing.apBillId, companyCode }, select: { status: true } })
      : Promise.resolve(null),
  ]);
  const hasLinkedDocuments = Boolean(existing.invoiceId || existing.apBillId);
  const linkedDocumentsAreDraft =
    (!existing.invoiceId || linkedInvoice?.status === 'DRAFT') &&
    (!existing.apBillId || linkedApBill?.status === 'DRAFT');
  const hasPostedStatus = [existing.status, existing.billStatus, existing.costStatus].some((status) => status === 'POSTED');
  const mutableCharge = financialChange && hasLinkedDocuments && linkedDocumentsAreDraft && !hasPostedStatus
    ? { ...existing, status: 'OPEN', billStatus: 'OPEN', costStatus: 'OPEN' }
    : existing;
  assertChargeMutable(mutableCharge, parsed);
  const data = { ...existing, ...parsed } as Record<string, unknown>;
  await assertShipmentMutable(typeof data.shipmentId === 'string' ? data.shipmentId : undefined, companyCode);
  const ctx = await chargeContext(companyCode, data);
  const bc = await prisma.billingCode.findUnique({ where: { companyCode_code: { companyCode, code: String(data.billingCode) } } });
  const computed = computeCharge({ ...data, vatClass: bc?.vatClass ?? data.vatClass }, ctx);
  const finalVatClass = String(bc?.vatClass ?? data.vatClass ?? existing.vatClass);
  const result = await prisma.$transaction(async (tx) => {
    const current = await tx.charge.findFirst({ where: { id: existing.id, companyCode } });
    if (!current) throw notFound('Charge not found');
    if (current.version !== existing.version) throw conflict('Version mismatch');

    const invoice = current.invoiceId
      ? await tx.invoice.findFirst({ where: { id: current.invoiceId, companyCode } })
      : null;
    const apBill = current.apBillId
      ? await tx.apBill.findFirst({ where: { id: current.apBillId, companyCode } })
      : null;
    if (financialChange && ((current.invoiceId && invoice?.status !== 'DRAFT') || (current.apBillId && apBill?.status !== 'DRAFT'))) {
      throw conflict('Financial charge fields can only be revised while linked invoice/AP documents are drafts');
    }

    const charge = await tx.charge.update({
      where: { id: current.id },
      data: { ...parsed, ...(financialChange ? computed : {}), version: { increment: 1 } },
    });

    let updatedInvoice: typeof invoice = null;
    if (financialChange && invoice) {
      const line = await tx.invoiceLine.findFirst({
        where: { companyCode, invoiceId: invoice.id, chargeId: current.id },
      });
      if (!line) throw conflict('Draft invoice line is missing for this charge');
      const billingCode = await tx.billingCode.findUnique({
        where: { companyCode_code: { companyCode, code: charge.billingCode } },
      });
      await tx.invoiceLine.update({
        where: { id: line.id },
        data: {
          billingCode: charge.billingCode,
          description: charge.description,
          qty: charge.qty,
          unit: charge.unit,
          rate: charge.rate,
          amount: charge.amount,
          amountPhp: charge.amountPhp,
          vatClass: charge.vatClass,
          vatAmountPhp: charge.vatAmountPhp,
          revenueAccount: billingCode?.revenueAccount ?? line.revenueAccount,
          zeroRatedReason: charge.vatClass === 'ZERO_RATED'
            ? line.zeroRatedReason ?? 'International freight forwarding service (NIRC Sec.108(B))'
            : null,
        },
      });
      const lines = await tx.invoiceLine.findMany({ where: { companyCode, invoiceId: invoice.id } });
      const totals = lines.reduce((sum, item) => {
        if (item.vatClass === 'VATABLE') sum.vatable += round2(item.amountPhp);
        else if (item.vatClass === 'ZERO_RATED') sum.zeroRated += round2(item.amountPhp);
        else if (item.vatClass === 'NON_VAT_REIMBURSABLE') sum.reimbursables += round2(item.amountPhp);
        else sum.exempt += round2(item.amountPhp);
        sum.vat += round2(item.vatAmountPhp);
        return sum;
      }, { vatable: 0, zeroRated: 0, exempt: 0, reimbursables: 0, vat: 0 });
      const sales = round2(totals.vatable + totals.zeroRated + totals.exempt + totals.reimbursables);
      const ewtAmount = round2((totals.vatable + totals.zeroRated + totals.exempt) * (invoice.ewtRate / 100));
      const totalAmount = round2(sales + totals.vat);
      const netReceivable = round2(totalAmount - ewtAmount);
      updatedInvoice = await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          vatableSales: round2(totals.vatable),
          zeroRatedSales: round2(totals.zeroRated),
          exemptSales: round2(totals.exempt),
          reimbursables: round2(totals.reimbursables),
          vatAmount: round2(totals.vat),
          totalAmount,
          ewtAmount,
          netReceivable,
          balance: round2(netReceivable - invoice.amountPaid),
          version: { increment: 1 },
        },
      });
    }

    let updatedApBill: typeof apBill = null;
    if (financialChange && apBill) {
      const line = await tx.apBillLine.findFirst({
        where: { companyCode, apBillId: apBill.id, chargeId: current.id },
      });
      if (!line) throw conflict('Draft AP line is missing for this charge');
      const [vendor, billingCode, withholdSetting] = await Promise.all([
        apBill.vendorPartyId
          ? tx.party.findFirst({ where: { id: apBill.vendorPartyId, companyCode } })
          : Promise.resolve(null),
        tx.billingCode.findUnique({ where: { companyCode_code: { companyCode, code: charge.billingCode } } }),
        tx.companySetting.findUnique({ where: { companyCode_key: { companyCode, key: 'withholdOnVendors' } } }),
      ]);
      const withholdOnVendors = parseJson(withholdSetting?.value, true);
      const ewtFor = (amountPhp: number, vatClass: string) =>
        withholdOnVendors && vendor && !vendor.ewtExemptVendor && vatClass !== 'NON_VAT_REIMBURSABLE'
          ? round2(amountPhp * 0.02)
          : 0;
      const inputVat = vendor?.vatRegistered && finalVatClass === 'VATABLE'
        ? vatAmount(charge.costAmountPhp, 'VATABLE')
        : 0;
      const ewtWithheld = round2(
        apBill.ewtWithheld -
        ewtFor(current.costAmountPhp, current.vatClass) +
        ewtFor(charge.costAmountPhp, finalVatClass),
      );
      await tx.apBillLine.update({
        where: { id: line.id },
        data: {
          billingCode: charge.billingCode,
          description: charge.description,
          amount: charge.costAmount,
          amountPhp: charge.costAmountPhp,
          inputVat,
          expenseAccount: billingCode?.costAccount ?? line.expenseAccount,
        },
      });
      const lines = await tx.apBillLine.findMany({ where: { companyCode, apBillId: apBill.id } });
      const subtotal = round2(lines.reduce((sum, item) => sum + round2(item.amountPhp), 0));
      const totalInputVat = round2(lines.reduce((sum, item) => sum + round2(item.inputVat), 0));
      const total = round2(subtotal + totalInputVat - ewtWithheld);
      updatedApBill = await tx.apBill.update({
        where: { id: apBill.id },
        data: {
          subtotal,
          inputVat: totalInputVat,
          ewtWithheld,
          total,
          balance: Math.max(0, round2(total - apBill.amountPaid)),
          version: { increment: 1 },
        },
      });
    }
    return { charge, invoice: updatedInvoice, apBill: updatedApBill };
  });

  await writeAudit(req, 'update', 'Charge', existing.id, { before: existing, after: result.charge });
  if (result.invoice) await writeAudit(req, 'update', 'Invoice', result.invoice.id, { reason: 'Draft charge revision', after: result.invoice });
  if (result.apBill) await writeAudit(req, 'update', 'ApBill', result.apBill.id, { reason: 'Draft charge revision', after: result.apBill });
  res.json(result.charge);
}));
logistics.delete('/charges/:id', writeAll, asyncHandler(async (req, res) => {
  const existing = await getOwned(prisma.charge, req.params.id, req.companyCode!, 'Charge');
  await assertShipmentMutable(existing.shipmentId ?? undefined, req.companyCode!);
  assertChargeMutable(existing, { billingCode: 'delete' });
  if (!['DRAFT', 'OPEN'].includes(existing.status.toUpperCase())) throw conflict(`Only draft/open Charge records can be deleted`);
  await prisma.charge.delete({ where: { id: existing.id } });
  await writeAudit(req, 'delete', 'Charge', existing.id, { before: existing });
  res.status(204).end();
}));
logistics.post('/invoices/:id/post', acct, asyncHandler(async (req, res) => { await getOwned(prisma.invoice, req.params.id, req.companyCode!, 'Invoice'); res.json(await postInvoice(req.params.id, req.companyCode!, req.user?.sub)); }));
logistics.post('/invoices/:id/void', acct, asyncHandler(async (req, res) => { const inv = await getOwned(prisma.invoice, req.params.id, req.companyCode!, 'Invoice'); if (inv.status !== 'POSTED') throw conflict('Only POSTED invoices can be voided'); if (inv.amountPaid > 0) throw conflict('Cannot void invoice with payments; issue a credit memo'); const row = await prisma.invoice.update({ where: { id: inv.id }, data: { status: 'VOID', voidReason: String(req.body?.reason ?? ''), version: { increment: 1 } } }); const bridge = await import('../services/domain.js').then((m) => m.stageBridgeForInvoice(inv.id, req.companyCode!, req.user?.sub, true, 'INVOICE_VOID')); res.json({ invoice: row, bridge }); }));
logistics.post('/invoices/:id/credit-memo', acct, asyncHandler(async (req, res) => { const inv = await prisma.invoice.findFirst({ where: { id: req.params.id, companyCode: req.companyCode! }, include: { lines: true } }); if (!inv) throw notFound('Invoice not found'); const selected = Array.isArray(req.body?.lines) && req.body.lines.length ? req.body.lines : inv.lines.map((l) => ({ invoiceLineId: l.id, amount: l.amountPhp })); const creditNo = await prisma.$transaction((tx) => nextNumber(tx, req.companyCode!, 'CREDIT_MEMO')); const cm = await prisma.invoice.create({ data: { companyCode: req.companyCode!, invoiceNo: creditNo, kind: 'CREDIT_MEMO', relatedInvoiceId: inv.id, billToPartyId: inv.billToPartyId, billToName: inv.billToName, billToAddress: inv.billToAddress, billToTin: inv.billToTin, date: new Date(), glPeriod: new Date().toISOString().slice(0, 7), status: 'DRAFT', createdBy: req.user?.sub } }); for (const x of selected) { const src = inv.lines.find((l) => l.id === x.invoiceLineId); if (!src) throw badRequest('Invalid invoiceLineId'); const amt = round2(Number(x.amount)); if (amt <= 0 || amt - src.amountPhp > 0.005) throw badRequest('Invalid credit memo amount'); await prisma.invoiceLine.create({ data: { companyCode: req.companyCode!, invoiceId: cm.id, chargeId: src.chargeId, billingCode: src.billingCode, description: `CM: ${src.description}`, qty: 1, unit: src.unit, rate: amt, amount: amt, amountPhp: amt, vatClass: src.vatClass, vatAmountPhp: vatAmount(amt, src.vatClass), revenueAccount: src.revenueAccount, zeroRatedReason: src.zeroRatedReason } }); } const out = await import('../services/domain.js').then((m) => m.recomputeInvoice(cm.id, req.companyCode!)); await prisma.invoice.update({ where: { id: inv.id }, data: { balance: Math.max(0, round2(inv.balance - out.netReceivable)), status: inv.balance - out.netReceivable <= 0.005 ? 'PAID' : inv.status } }); res.json(out); }));
logistics.post('/ap-bills/:id/post', acct, asyncHandler(async (req, res) => { await getOwned(prisma.apBill, req.params.id, req.companyCode!, 'AP bill'); res.json(await postApBill(req.params.id, req.companyCode!, req.user?.sub)); }));
logistics.post('/receipts/:id/post', acct, asyncHandler(async (req, res) => { const existing = await prisma.receipt.findFirst({ where: { id: req.params.id, companyCode: req.companyCode! }, include: { applications: { include: { invoice: true } } } }); if (!existing) throw notFound('Receipt not found'); if (existing.status !== 'DRAFT') throw conflict('Only DRAFT receipts can be posted'); const appTotal = round2(existing.applications.reduce((sum, app) => sum + app.applied + app.ewt, 0)); if (Math.abs(round2(appTotal + existing.unapplied) - round2(existing.amount + existing.ewtAmount)) > 0.005) throw badRequest('Applications plus unapplied must equal receipt amount plus EWT'); for (const app of existing.applications) if (round2(app.applied + app.ewt) - app.invoice.balance > 0.005) throw badRequest(`Application exceeds invoice balance ${app.invoice.invoiceNo}`); for (const app of existing.applications) { const paid = round2(app.invoice.amountPaid + app.applied + app.ewt); const bal = round2(app.invoice.netReceivable - paid); await prisma.invoice.update({ where: { id: app.invoiceId }, data: { amountPaid: paid, balance: Math.max(0, bal), status: bal <= 0.005 ? 'PAID' : 'PARTIAL' } }); } const receipt = await prisma.receipt.update({ where: { id: existing.id }, data: { status: 'POSTED', version: { increment: 1 } } }); const cashAcct = await bankAccount(req.companyCode!, receipt.bankNo); const lines = [{ acctCode: cashAcct, dc: 'D' as const, amount: receipt.amount, memo: receipt.receiptNo }, ...(receipt.ewtAmount ? [{ acctCode: '1128', dc: 'D' as const, amount: receipt.ewtAmount, memo: 'CWT' }] : []), { acctCode: '1123', dc: 'C' as const, amount: round2(receipt.amount + receipt.ewtAmount - receipt.unapplied), memo: receipt.receiptNo }, ...(receipt.unapplied ? [{ acctCode: '2117', dc: 'C' as const, amount: receipt.unapplied, memo: 'Customer deposit' }] : [])]; const bridge = await createBridge(req.companyCode!, 'RECEIPT', receipt.id, 'CRB', receipt.receiptNo, receipt.date, receipt.partyName, `Receipt ${receipt.receiptNo}`, lines, req.user?.sub); res.json({ receipt, bridge }); }));
logistics.post('/checks/:id/approve', acct, asyncHandler(async (req, res) => { const c = await getOwned(prisma.checkDisbursement, req.params.id, req.companyCode!, 'Check'); if (c.status !== 'DRAFT') throw conflict('Only DRAFT checks can be approved'); res.json(await prisma.checkDisbursement.update({ where: { id: c.id }, data: { status: 'APPROVED', version: { increment: 1 } } })); }));
logistics.post('/checks/:id/print', acct, asyncHandler(async (req, res) => { const c = await getOwned(prisma.checkDisbursement, req.params.id, req.companyCode!, 'Check'); if (!['DRAFT', 'APPROVED'].includes(c.status)) throw conflict('Only DRAFT/APPROVED checks can be printed'); let checkNo = c.checkNo; if (c.checkType === 'COMPUTER' && !checkNo) checkNo = await prisma.$transaction((tx) => nextNumber(tx, req.companyCode!, `CHECK_${c.bankNo ?? 0}`)); if (c.checkType === 'MANUAL' && !checkNo) throw badRequest('Manual check requires checkNo'); if (checkNo) { const dup = await prisma.checkDisbursement.findFirst({ where: { companyCode: req.companyCode!, bankNo: c.bankNo, checkNo, id: { not: c.id } } }); if (dup) throw conflict('Check number already exists for bank'); } res.json(await prisma.checkDisbursement.update({ where: { id: c.id }, data: { status: 'PRINTED', checkNo, version: { increment: 1 } } })); }));
logistics.post('/checks/:id/post', acct, asyncHandler(async (req, res) => { const c = await prisma.checkDisbursement.findFirst({ where: { id: req.params.id, companyCode: req.companyCode! }, include: { applications: { include: { apBill: true } }, directExpenses: true } }); if (!c) throw notFound('Check not found'); if (!['DRAFT', 'APPROVED', 'PRINTED'].includes(c.status)) throw conflict('Check cannot be posted from current status'); const applied = round2(c.applications.reduce((sum, app) => sum + app.applied - app.discount, 0)); const direct = round2(c.directExpenses.reduce((sum, d) => sum + d.amount, 0)); const total = round2(applied + direct); if (Math.abs(total - c.amount) > 0.005) throw badRequest('Check amount must equal applied bills plus direct expenses'); for (const app of c.applications) { const paid = round2(app.apBill.amountPaid + app.applied); const bal = round2(app.apBill.total - paid); await prisma.apBill.update({ where: { id: app.apBillId }, data: { amountPaid: paid, balance: Math.max(0, bal), status: bal <= 0.005 ? 'PAID' : 'PARTIAL' } }); } const check = await prisma.checkDisbursement.update({ where: { id: c.id }, data: { status: 'POSTED', postedAt: new Date(), version: { increment: 1 } } }); const cashAcct = await bankAccount(req.companyCode!, c.bankNo); const lines = [...(applied ? [{ acctCode: '2112', dc: 'D' as const, amount: applied, memo: c.voucherNo }] : []), ...c.directExpenses.map((d) => ({ acctCode: d.account, dc: 'D' as const, amount: d.amount, memo: d.memo ?? c.voucherNo })), { acctCode: cashAcct, dc: 'C' as const, amount: c.amount, memo: c.voucherNo }]; const bridge = await createBridge(req.companyCode!, 'CHECK', check.id, 'CDB', check.voucherNo, check.date, check.payeeName, `Check ${check.voucherNo}`, lines, req.user?.sub); res.json({ check, bridge }); }));
logistics.get('/bridge', asyncHandler(async (req, res) => res.json({ data: await prisma.bridgeItem.findMany({ where: { companyCode: req.companyCode!, status: req.query.status ? String(req.query.status) : undefined }, orderBy: { createdAt: 'desc' } }) })));
logistics.post('/bridge/trial-post', acct, asyncHandler(async (req, res) => res.json({ data: await trialBridge((req.body?.ids ?? []) as string[], req.companyCode!) })));
logistics.post('/bridge/post', acct, asyncHandler(async (req, res) => res.json({ data: await finalBridge((req.body?.ids ?? []) as string[], req.companyCode!, req.user?.sub) })));
logistics.post('/bridge/:id/reject', acct, asyncHandler(async (req, res) => { const b = await getOwned(prisma.bridgeItem, req.params.id, req.companyCode!, 'Bridge item'); res.json(await prisma.bridgeItem.update({ where: { id: b.id }, data: { status: 'REJECTED', errorsJson: JSON.stringify([String(req.body?.reason ?? 'Rejected')]) } })); }));
function vinCheck(vin: string) { return /^[A-HJ-NPR-Z0-9]{17}$/.test(vin) ? { valid: true, warning: null } : { valid: false, warning: 'VIN must be 17 chars excluding I/O/Q' }; }
for (const action of ['receive', 'inspect', 'hold', 'release-hold', 'ready', 'force-ready', 'temporal-release', 'undo-temporal-release', 'withdraw', 'link-to-container', 'title-rejected'] as const) logistics.post(`/vehicles/:id/${action}`, action === 'force-ready' ? requireRole('manager', 'admin') : writeAll, asyncHandler(async (req, res) => { const v = await getOwned(prisma.vehicle, req.params.id, req.companyCode!, 'Vehicle'); const data: Record<string, unknown> = { version: { increment: 1 } }; if (action === 'receive') { if (v.status !== 'EXPECTED') throw conflict('receive requires EXPECTED'); data.status = 'RECEIVED'; data.wrNo = v.wrNo ?? await prisma.$transaction((tx) => nextNumber(tx, req.companyCode!, 'WR')); } else if (action === 'inspect') { if (v.status !== 'RECEIVED') throw conflict('inspect requires RECEIVED'); if (!req.body?.inspectionDate || !req.body?.inspectedBy) throw badRequest('inspectionDate and inspectedBy are required'); data.inspectionDate = new Date(req.body.inspectionDate); data.inspectedBy = req.body.inspectedBy; data.inspectionNo = v.inspectionNo ?? await prisma.$transaction((tx) => nextNumber(tx, req.companyCode!, 'INSPECTION')); } else if (action === 'hold') { if (!['RECEIVED', 'READY_TO_SHIP'].includes(v.status)) throw conflict('hold requires RECEIVED or READY_TO_SHIP'); data.priorStatus = v.status; data.status = 'ON_HOLD'; data.hold = true; } else if (action === 'release-hold') { if (v.status !== 'ON_HOLD') throw conflict('release-hold requires ON_HOLD'); data.status = v.priorStatus ?? 'RECEIVED'; data.hold = false; } else if (action === 'ready') { if (v.status !== 'RECEIVED') throw conflict('ready requires RECEIVED'); if (v.shipperTentative || v.destinationTentative || (v.lienReleaseRequired && !v.lienReleaseReceived) || !v.titleReceived) throw conflict('Vehicle readiness prerequisites are incomplete'); data.status = 'READY_TO_SHIP'; } else if (action === 'force-ready') { if (!String(req.body?.reason ?? '').trim()) throw badRequest('force-ready reason is required'); data.status = 'READY_TO_SHIP'; data.remarks = `Force ready: ${req.body.reason}`; } else if (action === 'temporal-release') { data.temporalRelease = true; data.status = 'RELEASED'; } else if (action === 'undo-temporal-release') { data.temporalRelease = false; data.status = 'RECEIVED'; } else if (action === 'withdraw') { if (['LOADED', 'SHIPPED'].includes(v.status)) throw conflict('Cannot withdraw loaded/shipped vehicle'); data.status = 'WITHDRAWN'; data.withdrawnAt = new Date(); data.withdrawnBy = req.user?.sub; } else if (action === 'link-to-container') { if (!req.body?.containerId) throw badRequest('containerId required'); data.containerId = req.body.containerId; data.status = 'LOADED'; } else if (action === 'title-rejected') { data.titleRejectedSent = new Date(); if (v.containerId) await prisma.vehicle.updateMany({ where: { companyCode: req.companyCode!, containerId: v.containerId }, data: { titleRejectedSent: new Date() } }); } const updated = await prisma.vehicle.update({ where: { id: v.id }, data }); await emitStatus(req.companyCode!, 'VEHICLE', v.id, String(data.status ?? action).toUpperCase(), req.user?.sub); res.json(updated); }));
logistics.get('/vin/decode/:vin', asyncHandler(async (req, res) => { const vin = req.params.vin.toUpperCase(); const validation = vinCheck(vin); if (!validation.valid) return res.status(400).json({ error: validation.warning }); const existing = await prisma.vehicle.findFirst({ where: { companyCode: req.companyCode!, vin } }); if (existing?.decodedJson) return res.json(JSON.parse(existing.decodedJson)); const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 10_000); try { const r = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(vin)}?format=json`, { signal: controller.signal }); if (!r.ok) return res.status(502).json({ error: 'NHTSA vPIC unavailable' }); const raw = await r.json() as { Results?: Array<Record<string, string>> }; const first = raw?.Results?.[0] ?? {}; if (first.ErrorCode && first.ErrorCode !== '0') return res.status(502).json({ error: first.ErrorText ?? 'NHTSA vPIC decode error', raw }); const normalized = { vin, year: Number(first.ModelYear) || null, make: first.Make || null, model: first.Model || null, trim: first.Trim || null, body: first.BodyClass || null, engine: first.EngineModel || first.DisplacementL || null, fuel: first.FuelTypePrimary || null, warning: validation.warning, raw }; if (existing) await prisma.vehicle.update({ where: { id: existing.id }, data: { decodedJson: JSON.stringify(normalized), year: normalized.year ?? undefined, make: normalized.make, model: normalized.model, trim: normalized.trim, body: normalized.body, engine: normalized.engine, fuel: normalized.fuel } }); res.json(normalized); } catch { res.status(502).json({ error: 'NHTSA vPIC request timed out or failed' }); } finally { clearTimeout(timer); } }));
async function releasePdResources(tx: Prisma.TransactionClient, order: { companyCode: string; driverId: string | null; fleetVehicleId: string | null; routeId: string | null }) {
  const activeStatuses = ['DISPATCHED', 'IN_TRANSIT'];
  if (order.driverId) {
    const activeDriverOrders = await tx.pdOrder.count({
      where: { companyCode: order.companyCode, driverId: order.driverId, status: { in: activeStatuses } },
    });
    if (activeDriverOrders === 0) {
      await tx.driver.updateMany({
        where: { id: order.driverId, companyCode: order.companyCode, status: 'ON_ROUTE' },
        data: { status: 'AVAILABLE' },
      });
    }
  }
  if (order.fleetVehicleId) {
    const activeVehicleOrders = await tx.pdOrder.count({
      where: { companyCode: order.companyCode, fleetVehicleId: order.fleetVehicleId, status: { in: activeStatuses } },
    });
    if (activeVehicleOrders === 0) {
      await tx.fleetVehicle.updateMany({
        where: { id: order.fleetVehicleId, companyCode: order.companyCode, status: 'ON_ROUTE' },
        data: { status: 'AVAILABLE' },
      });
    }
  }
  if (order.routeId) {
    const activeRouteOrders = await tx.pdOrder.count({
      where: { companyCode: order.companyCode, routeId: order.routeId, status: { in: ['OPEN', ...activeStatuses] } },
    });
    if (activeRouteOrders === 0) {
      await tx.dispatchRoute.updateMany({
        where: { id: order.routeId, companyCode: order.companyCode },
        data: { stage: 'COMPLETED' },
      });
    }
  }
}

logistics.post('/pd-orders/:id/dispatch', writeAll, asyncHandler(async (req, res) => {
  const companyCode = req.companyCode!;
  const driverId = String(req.body?.driverId ?? '');
  const fleetVehicleId = String(req.body?.fleetVehicleId ?? '');
  const routeId = req.body?.routeId ? String(req.body.routeId) : null;
  if (!driverId || !fleetVehicleId) throw badRequest('driverId and fleetVehicleId are required');

  const row = await prisma.$transaction(async (tx) => {
    const order = await tx.pdOrder.findFirst({ where: { id: req.params.id, companyCode } });
    if (!order) throw notFound('P/D order not found');
    if (order.status !== 'OPEN') throw conflict('dispatch requires OPEN');

    const [driver, vehicle, route] = await Promise.all([
      tx.driver.findFirst({ where: { id: driverId, companyCode } }),
      tx.fleetVehicle.findFirst({ where: { id: fleetVehicleId, companyCode } }),
      routeId ? tx.dispatchRoute.findFirst({ where: { id: routeId, companyCode } }) : Promise.resolve(null),
    ]);
    if (!driver) throw notFound('Driver not found');
    if (!vehicle) throw notFound('Fleet vehicle not found');
    if (routeId && !route) throw notFound('Dispatch route not found');

    const activeStatuses = ['DISPATCHED', 'IN_TRANSIT'];
    const routeAssignment = route
      ? await tx.pdOrder.findFirst({
          where: { companyCode, routeId: route.id, status: { in: activeStatuses } },
          select: { driverId: true, fleetVehicleId: true },
        })
      : null;
    const joiningRoute = Boolean(
      routeAssignment && routeAssignment.driverId === driverId && routeAssignment.fleetVehicleId === fleetVehicleId,
    );
    if (routeAssignment && !joiningRoute) throw conflict('Route is already in progress with another driver or vehicle');
    if (route?.stage === 'COMPLETED') throw conflict('Cannot dispatch an order onto a completed route');

    const [driverAssignment, vehicleAssignment] = await Promise.all([
      tx.pdOrder.findFirst({
        where: { companyCode, driverId, status: { in: activeStatuses } },
        select: { routeId: true },
      }),
      tx.pdOrder.findFirst({
        where: { companyCode, fleetVehicleId, status: { in: activeStatuses } },
        select: { routeId: true },
      }),
    ]);
    if (driverAssignment && (!joiningRoute || driverAssignment.routeId !== routeId)) {
      throw conflict('Driver is already assigned to an active order');
    }
    if (vehicleAssignment && (!joiningRoute || vehicleAssignment.routeId !== routeId)) {
      throw conflict('Fleet vehicle is already assigned to an active order');
    }

    const driverAvailable = driver.status.toUpperCase() === 'AVAILABLE';
    const vehicleAvailable = vehicle.status.toUpperCase() === 'AVAILABLE';
    if (!driverAvailable && !joiningRoute) throw conflict('Driver is not available');
    if (!vehicleAvailable && !joiningRoute) throw conflict('Fleet vehicle is not available');

    if (driverAvailable) {
      const claimed = await tx.driver.updateMany({
        where: { id: driver.id, companyCode, status: driver.status },
        data: { status: 'ON_ROUTE' },
      });
      if (claimed.count !== 1) throw conflict('Driver availability changed; refresh and retry');
    }
    if (vehicleAvailable) {
      const claimed = await tx.fleetVehicle.updateMany({
        where: { id: vehicle.id, companyCode, status: vehicle.status },
        data: { status: 'ON_ROUTE' },
      });
      if (claimed.count !== 1) throw conflict('Fleet vehicle availability changed; refresh and retry');
    }
    if (route) {
      await tx.dispatchRoute.update({
        where: { id: route.id },
        data: { stage: 'IN_PROGRESS', driverName: driver.name, vehiclePlate: vehicle.plateNo },
      });
    }
    return tx.pdOrder.update({
      where: { id: order.id },
      data: {
        status: 'DISPATCHED',
        driverId,
        fleetVehicleId,
        routeId,
        version: { increment: 1 },
      },
    });
  });

  await emitStatus(companyCode, 'PD_ORDER', row.id, 'DSP', req.user?.sub, { isPublic: true });
  res.json(row);
}));

logistics.post('/pd-orders/:id/complete', writeAll, asyncHandler(async (req, res) => {
  const companyCode = req.companyCode!;
  if (!String(req.body?.signedBy ?? '').trim()) throw badRequest('signedBy is required');
  const row = await prisma.$transaction(async (tx) => {
    const order = await tx.pdOrder.findFirst({ where: { id: req.params.id, companyCode } });
    if (!order) throw notFound('P/D order not found');
    if (!['DISPATCHED', 'IN_TRANSIT'].includes(order.status)) throw conflict('complete requires DISPATCHED/IN_TRANSIT');
    const updated = await tx.pdOrder.update({
      where: { id: order.id },
      data: {
        status: 'COMPLETED',
        deliveredAt: new Date(),
        podSignedBy: String(req.body.signedBy).trim(),
        podAt: req.body?.podAt ? new Date(req.body.podAt) : new Date(),
        podRemarks: String(req.body?.remarks ?? req.body?.podRemarks ?? '').trim() || null,
        podPhotoUrl: req.body?.podPhotoUrl ?? null,
        signatureDataUrl: req.body?.signatureDataUrl ?? null,
        version: { increment: 1 },
      },
    });
    await releasePdResources(tx, order);
    return updated;
  });
  await emitStatus(companyCode, 'PD_ORDER', row.id, 'POD', req.user?.sub, { isPublic: true });
  res.json(row);
}));

logistics.post('/pd-orders/:id/cancel', writeAll, asyncHandler(async (req, res) => {
  const companyCode = req.companyCode!;
  const row = await prisma.$transaction(async (tx) => {
    const order = await tx.pdOrder.findFirst({ where: { id: req.params.id, companyCode } });
    if (!order) throw notFound('P/D order not found');
    if (!['OPEN', 'DISPATCHED'].includes(order.status)) throw conflict('cancel requires OPEN/DISPATCHED');
    const updated = await tx.pdOrder.update({
      where: { id: order.id },
      data: {
        status: 'CANCELLED',
        cancelReason: String(req.body?.reason ?? '').trim() || null,
        version: { increment: 1 },
      },
    });
    await releasePdResources(tx, order);
    return updated;
  });
  await emitStatus(companyCode, 'PD_ORDER', row.id, 'CNL', req.user?.sub, { isPublic: true });
  res.json(row);
}));
logistics.get('/status-events', asyncHandler(async (req, res) => res.json({ data: await prisma.statusEvent.findMany({ where: { companyCode: req.companyCode!, entityType: req.query.entityType ? String(req.query.entityType) : undefined, entityId: req.query.entityId ? String(req.query.entityId) : undefined }, orderBy: { eventAt: 'asc' } }) })));
logistics.get('/lookups/search', asyncHandler(async (req, res) => { const type = String(req.query.type ?? 'party'); const q = String(req.query.q ?? ''); const role = String(req.query.role ?? ''); if (type === 'party') { const roleWhere = role ? { [`is${role[0]?.toUpperCase()}${role.slice(1)}`]: true } : {}; res.json({ data: await prisma.party.findMany({ where: { companyCode: req.companyCode!, active: true, OR: [{ code: { contains: q } }, { name: { contains: q } }, { tin: { contains: q } }], ...roleWhere }, take: 20, orderBy: { name: 'asc' } }) }); } else res.json({ data: [] }); }));
logistics.get('/lookups/ports', asyncHandler(async (req, res) => res.json({ data: await prisma.port.findMany({ where: { companyCode: req.companyCode!, kind: req.query.kind ? String(req.query.kind) : undefined, OR: [{ code: { contains: String(req.query.q ?? '') } }, { unlocode: { contains: String(req.query.q ?? '') } }, { name: { contains: String(req.query.q ?? '') } }] }, take: 20, orderBy: { name: 'asc' } }) })));
logistics.get('/lookups/billing-codes', asyncHandler(async (req, res) => res.json({ data: await prisma.billingCode.findMany({ where: { companyCode: req.companyCode!, active: true, modes: req.query.mode ? { contains: String(req.query.mode).toUpperCase() } : undefined }, take: 50, orderBy: { code: 'asc' } }) })));
logistics.get('/lookups/global', asyncHandler(async (req, res) => { const c = req.companyCode!, q = String(req.query.q ?? ''); const [shipments, docs, containers, vehicles, invoices, aps, pds, parties] = await Promise.all([prisma.shipment.findMany({ where: { companyCode: c, OR: [{ fileNo: { contains: q } }, { bookingNo: { contains: q } }, { customerRef: { contains: q } }] }, take: 5 }), prisma.transportDoc.findMany({ where: { companyCode: c, docNo: { contains: q } }, take: 5 }), prisma.container.findMany({ where: { companyCode: c, containerNo: { contains: q } }, take: 5 }), prisma.vehicle.findMany({ where: { companyCode: c, OR: [{ vin: { contains: q } }, { wrNo: { contains: q } }] }, take: 5 }), prisma.invoice.findMany({ where: { companyCode: c, invoiceNo: { contains: q } }, take: 5 }), prisma.apBill.findMany({ where: { companyCode: c, billNo: { contains: q } }, take: 5 }), prisma.pdOrder.findMany({ where: { companyCode: c, orderNo: { contains: q } }, take: 5 }), prisma.party.findMany({ where: { companyCode: c, OR: [{ code: { contains: q } }, { name: { contains: q } }] }, take: 5 })]); const out = [...shipments.map((x) => ({ type: 'shipment', id: x.id, label: x.fileNo, sublabel: x.status, route: `/logistics/files/${x.id}` })), ...docs.map((x) => ({ type: 'transportDoc', id: x.id, label: x.docNo, sublabel: x.status, route: x.shipmentId ? `/logistics/files/${x.shipmentId}` : `/logistics/ocean-export` })), ...containers.map((x) => ({ type: 'container', id: x.id, label: x.containerNo, sublabel: x.status, route: x.shipmentId ? `/logistics/files/${x.shipmentId}` : `/logistics/ocean-export` })), ...vehicles.map((x) => ({ type: 'vehicle', id: x.id, label: x.vin, sublabel: x.wrNo, route: `/logistics/vehicles` })), ...invoices.map((x) => ({ type: 'invoice', id: x.id, label: x.invoiceNo, sublabel: x.status, route: `/billing/invoices` })), ...aps.map((x) => ({ type: 'apBill', id: x.id, label: x.billNo, sublabel: x.status, route: `/billing/payables` })), ...pds.map((x) => ({ type: 'pdOrder', id: x.id, label: x.orderNo, sublabel: x.status, route: `/logistics/pd-orders` })), ...parties.map((x) => ({ type: 'party', id: x.id, label: x.name, sublabel: x.code, route: `/directories/parties` }))].slice(0, 20); res.json({ data: out }); }));
logistics.get('/dashboard/summary', asyncHandler(async (req, res) => {
  const companyCode = req.companyCode!;
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const tomorrow = new Date(today.getTime() + 86400000);
  const in7 = new Date(now.getTime() + 7 * 86400000);
  const in72 = new Date(now.getTime() + 72 * 3600000);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const postedStatuses = ['POSTED', 'PARTIAL', 'PAID'];
  const openFinancialStatuses = ['POSTED', 'PARTIAL'];

  const [
    filesByStatus,
    upcomingEtas,
    upcomingCutoffs,
    unbilled,
    bridgeQueue,
    hold,
    pdToday,
    invoices,
    apBills,
    overdueInvoices,
    postedInv,
    postedAp,
    lowMarginShipments,
    marginSetting,
  ] = await Promise.all([
    prisma.shipment.groupBy({
      by: ['mode', 'status'],
      where: { companyCode, deletedAt: null },
      _count: true,
    }),
    prisma.shipment.findMany({
      where: { companyCode, deletedAt: null, eta: { gte: now, lte: in7 } },
      select: { id: true, fileNo: true, eta: true, podCode: true, status: true },
      take: 10,
      orderBy: { eta: 'asc' },
    }),
    prisma.shipment.findMany({
      where: {
        companyCode,
        deletedAt: null,
        OR: [{ docCutoff: { gte: now, lte: in72 } }, { cargoCutoff: { gte: now, lte: in72 } }],
      },
      select: { id: true, fileNo: true, docCutoff: true, cargoCutoff: true, podCode: true, status: true },
      take: 10,
      orderBy: { docCutoff: 'asc' },
    }),
    prisma.charge.count({
      where: { companyCode, deletedAt: null, OR: [{ billStatus: 'OPEN' }, { costStatus: 'OPEN' }] },
    }),
    prisma.bridgeItem.groupBy({ by: ['status'], where: { companyCode }, _count: true }),
    prisma.vehicle.count({ where: { companyCode, deletedAt: null, hold: true } }),
    prisma.pdOrder.count({
      where: {
        companyCode,
        deletedAt: null,
        status: { in: ['OPEN', 'DISPATCHED', 'IN_TRANSIT'] },
        deliverBy: { gte: today, lt: tomorrow },
      },
    }),
    prisma.invoice.findMany({
      where: { companyCode, deletedAt: null, status: { in: openFinancialStatuses }, balance: { gt: 0 } },
      select: { id: true, invoiceNo: true, billToName: true, dueDate: true, balance: true, status: true },
    }),
    prisma.apBill.findMany({
      where: { companyCode, deletedAt: null, status: { in: openFinancialStatuses }, balance: { gt: 0 } },
      select: { id: true, billNo: true, vendorName: true, dueDate: true, balance: true, status: true },
    }),
    prisma.invoice.findMany({
      where: {
        companyCode,
        deletedAt: null,
        status: { in: openFinancialStatuses },
        balance: { gt: 0 },
        dueDate: { lt: now },
      },
      select: { id: true, invoiceNo: true, billToName: true, dueDate: true, balance: true, status: true },
      take: 10,
      orderBy: { dueDate: 'asc' },
    }),
    prisma.invoice.findMany({
      where: { companyCode, deletedAt: null, status: { in: postedStatuses }, date: { gte: monthStart, lt: nextMonthStart } },
      include: { shipment: { select: { mode: true } } },
    }),
    prisma.apBill.findMany({
      where: { companyCode, deletedAt: null, status: { in: postedStatuses }, date: { gte: monthStart, lt: nextMonthStart } },
      include: { shipment: { select: { mode: true } } },
    }),
    prisma.shipment.findMany({
      where: { companyCode, deletedAt: null, status: { notIn: ['CLOSED', 'CANCELLED'] } },
      select: {
        id: true,
        fileNo: true,
        mode: true,
        status: true,
        updatedAt: true,
        charges: {
          where: { deletedAt: null },
          select: { amountPhp: true, costAmountPhp: true, vatClass: true },
        },
      },
      take: 200,
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.companySetting.findUnique({
      where: { companyCode_key: { companyCode, key: 'marginThresholdPct' } },
      select: { value: true },
    }),
  ]);

  const aging: Record<string, number> = { current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
  for (const invoice of invoices) {
    const daysPastDue = Math.floor((now.getTime() - (invoice.dueDate ?? now).getTime()) / 86400000);
    const bucket = daysPastDue <= 0 ? 'current' : daysPastDue <= 30 ? '1-30' : daysPastDue <= 60 ? '31-60' : daysPastDue <= 90 ? '61-90' : '90+';
    aging[bucket] = round2(aging[bucket] + invoice.balance);
  }

  const revenueOf = (invoice: { totalAmount: number; vatAmount: number }) => round2(invoice.totalAmount - invoice.vatAmount);
  const revenueMtd = round2(postedInv.reduce((sum, invoice) => sum + revenueOf(invoice), 0));
  const costMtd = round2(postedAp.reduce((sum, bill) => sum + bill.subtotal, 0));
  const customerTotals = postedInv.reduce<Record<string, number>>((totals, invoice) => {
    const customer = invoice.billToName ?? 'Unknown';
    totals[customer] = round2((totals[customer] ?? 0) + revenueOf(invoice));
    return totals;
  }, {});
  const topCustomers = Object.entries(customerTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([customer, amount]) => ({ customer, amount }));

  const modeTotals = new Map<string, { revenue: number; cost: number }>();
  for (const invoice of postedInv) {
    const mode = invoice.shipment?.mode ?? 'MISC';
    const totals = modeTotals.get(mode) ?? { revenue: 0, cost: 0 };
    totals.revenue = round2(totals.revenue + revenueOf(invoice));
    modeTotals.set(mode, totals);
  }
  for (const bill of postedAp) {
    const mode = bill.shipment?.mode ?? 'MISC';
    const totals = modeTotals.get(mode) ?? { revenue: 0, cost: 0 };
    totals.cost = round2(totals.cost + bill.subtotal);
    modeTotals.set(mode, totals);
  }
  const mtdByMode = [...modeTotals].map(([mode, totals]) => ({ mode, ...totals }));

  const marginThreshold = Number(parseJson(marginSetting?.value, 15));
  const lowMarginFiles = lowMarginShipments
    .map((shipment) => {
      const charges = shipment.charges.filter((charge) => charge.vatClass !== 'NON_VAT_REIMBURSABLE');
      const revenue = round2(charges.reduce((sum, charge) => sum + charge.amountPhp, 0));
      const cost = round2(charges.reduce((sum, charge) => sum + charge.costAmountPhp, 0));
      return {
        id: shipment.id,
        fileNo: shipment.fileNo,
        mode: shipment.mode,
        status: shipment.status,
        updatedAt: shipment.updatedAt,
        revenue,
        cost,
        marginPct: fileMarginPct(revenue, cost),
      };
    })
    .filter((shipment) => (shipment.revenue > 0 || shipment.cost > 0) && shipment.marginPct < marginThreshold)
    .sort((a, b) => a.marginPct - b.marginPct)
    .slice(0, 10);

  const apDueThisWeek = round2(apBills
    .filter((bill) => bill.dueDate && bill.dueDate >= now && bill.dueDate <= in7)
    .reduce((sum, bill) => sum + bill.balance, 0));

  res.json({
    filesByStatus,
    upcomingEtas,
    upcomingCutoffs,
    overdueInvoices,
    lowMarginFiles,
    unbilledCharges: unbilled,
    invoicesOverdue: invoices.filter((invoice) => invoice.dueDate && invoice.dueDate < now).length,
    arOutstanding: round2(invoices.reduce((sum, invoice) => sum + invoice.balance, 0)),
    arOverdue: round2(invoices.filter((invoice) => invoice.dueDate && invoice.dueDate < now).reduce((sum, invoice) => sum + invoice.balance, 0)),
    arAging: aging,
    apDueAmount: round2(apBills.reduce((sum, bill) => sum + bill.balance, 0)),
    apDueThisWeek,
    bridgeQueue,
    vehiclesOnHold: hold,
    pdToday,
    mtd: { revenue: revenueMtd, cost: costMtd, profit: round2(revenueMtd - costMtd) },
    mtdByMode,
    topCustomers,
  });
}));

export const portal = Router();
const portalAttempts = new Map<string, { failures: number; first: number; blockedUntil: number }>();
const portalSecret = process.env.PORTAL_JWT_SECRET || process.env.JWT_ACCESS_SECRET || 'kornet-dev-access-secret-change-me-at-least-32-bytes';
function portalKey(ip: string | undefined, u: string) { return `${ip ?? 'unknown'}:${u.toLowerCase()}`; }
function portalBlocked(k: string) { const a = portalAttempts.get(k); if (!a) return false; if (a.blockedUntil > Date.now()) return true; if (Date.now() - a.first > 900000) portalAttempts.delete(k); return false; }
function portalFail(k: string) { const now = Date.now(), a = portalAttempts.get(k); const n = a && now - a.first <= 900000 ? a.failures + 1 : 1; portalAttempts.set(k, { failures: n, first: a?.first ?? now, blockedUntil: n >= 5 ? now + 900000 : 0 }); }
function portalAuth(req: { headers: Record<string, string | string[] | undefined> }) { const h = String(req.headers.authorization ?? '').replace(/^Bearer /, ''); try { return { ...(jwt.verify(h, portalSecret) as { accountId: string; userId: string }), companyCode: COMPANY_CODE }; } catch { throw unauthorized('Invalid portal token'); } }
portal.post('/login', asyncHandler(async (req, res) => { const username = String(req.body?.username ?? ''); const k = portalKey(req.ip, username); if (portalBlocked(k)) throw unauthorized('Invalid portal credentials'); const user = await prisma.webUser.findUnique({ where: { companyCode_username: { companyCode: COMPANY_CODE, username } }, include: { account: true } }); if (!user || !user.active || !(await bcrypt.compare(String(req.body?.password ?? ''), user.passwordHash))) { portalFail(k); throw unauthorized('Invalid portal credentials'); } portalAttempts.delete(k); const token = jwt.sign({ companyCode: COMPANY_CODE, accountId: user.accountId, userId: user.id }, portalSecret, { expiresIn: '8h' }); res.json({ user: { id: user.id, username: user.username, accountId: user.accountId, customerName: user.account.customerName }, token }); }));
portal.get('/shipments', asyncHandler(async (req, res) => { const t = portalAuth(req); const acc = await prisma.webAccount.findFirst({ where: { id: t.accountId, companyCode: t.companyCode } }); if (!acc) throw unauthorized(); res.json({ data: await prisma.shipment.findMany({ where: { companyCode: t.companyCode, OR: [{ billToPartyId: acc.partyId ?? '' }, { shipperPartyId: acc.partyId ?? '' }, { consigneePartyId: acc.partyId ?? '' }] }, select: { id: true, fileNo: true, status: true, mode: true, direction: true, eta: true, etd: true } }) }); }));
portal.get('/track/:ref', asyncHandler(async (req, res) => { const ref = req.params.ref; const shipment = await prisma.shipment.findFirst({ where: { companyCode: COMPANY_CODE, OR: [{ fileNo: ref }, { transportDocs: { some: { docNo: ref } } }] }, select: { id: true, companyCode: true, fileNo: true, status: true, mode: true, polCode: true, podCode: true, eta: true, etd: true } }); if (!shipment) throw notFound('Tracking reference not found'); const ports = await prisma.port.findMany({ where: { companyCode: COMPANY_CODE, code: { in: [shipment.polCode ?? '', shipment.podCode ?? ''] } } }); const events = await prisma.statusEvent.findMany({ where: { companyCode: COMPANY_CODE, entityType: 'SHIPMENT', entityId: shipment.id, isPublic: true }, select: { code: true, subStatus: true, location: true, eventAt: true, notes: true }, orderBy: { eventAt: 'asc' } }); res.json({ shipment: { fileNo: shipment.fileNo, mode: shipment.mode, status: shipment.status, origin: ports.find((p) => p.code === shipment.polCode)?.name ?? shipment.polCode, destination: ports.find((p) => p.code === shipment.podCode)?.name ?? shipment.podCode, eta: shipment.eta, etd: shipment.etd }, milestones: events }); }));

export default logistics;
