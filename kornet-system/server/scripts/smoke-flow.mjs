import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';

const prisma = new PrismaClient();
const base = process.env.KORNET_API_URL || 'http://localhost:4000/api';
const company = 'KORNET';
const stamp = Date.now().toString().slice(-6);
let token = '';
let viewerToken = '';

function assert(cond, msg) { if (!cond) throw new Error(msg); }
function eq(a, b, msg) { if (Math.abs(Number(a) - Number(b)) > 0.005) throw new Error(`${msg}: expected ${b}, got ${a}`); }
async function call(method, url, body, auth = true, companyCode = company, bearer = token, okStatuses = [200,201,204]) {
  const res = await fetch(`${base}${url}`, { method, headers: { 'content-type': 'application/json', ...(auth ? { authorization: `Bearer ${bearer}`, 'x-company-code': companyCode } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text(); const data = text ? JSON.parse(text) : null;
  if (!okStatuses.includes(res.status)) throw new Error(`${method} ${url} ${res.status}: ${text}`);
  return { status: res.status, data };
}
async function step(name, fn) { try { const r = await fn(); console.log(`PASS ${name}`); return r; } catch (e) { console.error(`FAIL ${name}: ${e.message}`); process.exitCode = 1; throw e; } }

await step('direct setup viewer/portal/other tenant', async () => {
  await prisma.company.upsert({ where: { code: 'OTHER' }, update: { active: true, name: 'Other Tenant' }, create: { code: 'OTHER', name: 'Other Tenant', active: true } });
  await prisma.user.upsert({ where: { username: `viewer${stamp}` }, update: {}, create: { username: `viewer${stamp}`, passwordHash: await bcrypt.hash('viewerpass', 10), fullName: 'Smoke Viewer', role: 'viewer', companies: JSON.stringify([company]), active: true } });
});
const login = await step('login admin', async () => (await call('POST','/auth/login',{username:'admin',password:'kornet2000'},false)).data);
token = login.accessToken;
viewerToken = (await step('login viewer', async () => (await call('POST','/auth/login',{username:`viewer${stamp}`,password:'viewerpass'},false)).data)).accessToken;
await step('viewer POST is forbidden', async () => { const r = await call('POST','/parties',{code:`BAD${stamp}`,name:'Bad'},true,company,viewerToken,[403]); assert(r.status===403,'viewer not blocked'); });

const customer = await step('create customer', async () => (await call('POST','/parties',{code:`C${stamp}`,name:`Customer ${stamp}`,isCustomer:true,isShipper:true,isConsignee:true,vatRegistered:true,creditTermsDays:0})).data);
const vendor = await step('create vendor', async () => (await call('POST','/parties',{code:`V${stamp}`,name:`Vendor ${stamp}`,isVendor:true,vatRegistered:true})).data);
await step('create tariffs precedence', async () => {
  await call('POST','/tariffs',{billingCode:'OFRT',mode:'AIR',direction:'EXPORT',unit:'PER_KG',sellRate:10,buyRate:5,currency:'PHP',validFrom:'2020-01-01T00:00:00.000Z'});
  await call('POST','/tariffs',{billingCode:'OFRT',mode:'AIR',direction:'EXPORT',customerPartyId:customer.id,unit:'PER_KG',sellRate:20,buyRate:8,currency:'PHP',vendorPartyId:vendor.id,validFrom:'2020-01-01T00:00:00.000Z'});
});
const air = await step('create air shipment and assert numbering', async () => { const s=(await call('POST','/shipments',{mode:'AIR',direction:'EXPORT',billToPartyId:customer.id,shipperPartyId:customer.id,consigneePartyId:customer.id,polCode:'MNL',podCode:'HKG',currency:'PHP',exchangeRate:1})).data; assert(/^AE-\d{4}-\d{5}$/.test(s.fileNo),`bad fileNo ${s.fileNo}`); return s; });
await step('IDOR other tenant returns 404', async () => { const other = await prisma.shipment.create({ data:{ companyCode:'OTHER', fileNo:`OT-${stamp}`, mode:'AIR', direction:'EXPORT' }}); const r=await call('POST',`/shipments/${other.id}/recalc`,{},true,company,token,[404]); assert(r.status===404,'IDOR not 404'); });
await step('air chargeable math', async () => { await call('POST','/cargo-lines',{shipmentId:air.id,pieces:2,lengthCm:100,widthCm:80,heightCm:60,grossKg:120,description:'Air cargo'}); const r=(await call('POST',`/shipments/${air.id}/recalc`,{})).data; eq(r.totalVolumetricKg,160,'volumetric kg'); eq(r.totalChargeableKg,160,'chargeable kg'); });
await step('tariff customer precedence', async () => { const rows=(await call('GET',`/charges?shipmentId=${air.id}`)).data.data.filter(c=>c.source==='TARIFF'&&c.billingCode==='OFRT'); assert(rows.length===1,'duplicate OFRT tariff'); eq(rows[0].rate,20,'customer tariff rate'); });
const ocean = await step('ocean W/M math', async () => { const s=(await call('POST','/shipments',{mode:'OCEAN',direction:'EXPORT',loadType:'LCL',billToPartyId:customer.id,shipperPartyId:customer.id,consigneePartyId:customer.id,polCode:'PHMNL',podCode:'SGSIN',currency:'PHP',exchangeRate:1})).data; await call('POST','/cargo-lines',{shipmentId:s.id,pieces:1,lengthCm:100,widthCm:100,heightCm:120,grossKg:800,description:'Ocean cargo'}); const r=(await call('POST',`/shipments/${s.id}/recalc`,{})).data; eq(r.totalWmTons,1.2,'ocean wm'); return r; });
await step('add exact invoice charges', async () => { await call('POST','/charges',{shipmentId:ocean.id,billingCode:'DOC',chargeSide:'BOTH',billParty:'OTHER',billToPartyId:customer.id,unit:'PER_FILE',rate:1000,costVendorPartyId:vendor.id,costRate:200}); await call('POST','/charges',{shipmentId:ocean.id,billingCode:'OFRT',chargeSide:'BILL_ONLY',billParty:'OTHER',billToPartyId:customer.id,unit:'PER_FILE',rate:2000,vatClass:'ZERO_RATED'}); await call('POST','/charges',{shipmentId:ocean.id,billingCode:'ARR',chargeSide:'BILL_ONLY',billParty:'OTHER',billToPartyId:customer.id,unit:'PER_FILE',rate:500,vatClass:'NON_VAT_REIMBURSABLE'}); await call('POST','/charges',{shipmentId:ocean.id,billingCode:'TRK',chargeSide:'COST_ONLY',unit:'PER_FILE',rate:0,costVendorPartyId:vendor.id,costRate:1000}); });
const invoice = await step('invoice totals exact', async () => { const inv=(await call('POST',`/shipments/${ocean.id}/invoice`,{})).data; eq(inv.vatableSales,1000,'vatable'); eq(inv.zeroRatedSales,2000,'zero'); eq(inv.reimbursables,500,'reimb'); eq(inv.vatAmount,120,'vat'); eq(inv.totalAmount,3620,'total'); return inv; });
const invBridge = await step('post invoice stages balanced bridge', async () => { const b=(await call('POST',`/invoices/${invoice.id}/post`,{})).data; eq(b.totalDebit,b.totalCredit,'invoice bridge DrCr'); await prisma.bridgeItem.update({ where:{ id:b.id }, data:{ date:new Date('2026-10-08T00:00:00.000Z'), glPeriod:'2026-10' } }); return b; });
await step('trial-post then final post writes jeNo', async () => { const tr=(await call('POST','/bridge/trial-post',{ids:[invBridge.id]})).data.data[0]; assert(tr.ok,`trial failed ${JSON.stringify(tr.errors)}`); const po=(await call('POST','/bridge/post',{ids:[invBridge.id]})).data.data[0]; assert(po.ok,`post failed ${JSON.stringify(po.errors)}`); const inv=(await call('GET',`/invoices/${invoice.id}`)).data; assert(inv.jeNo,'jeNo not written'); });
const ap = await step('AP bill totals exact', async () => { const a=(await call('POST',`/shipments/${ocean.id}/ap-bills`,{})).data; eq(a.subtotal,1200,'ap subtotal'); eq(a.inputVat,144,'ap input vat'); eq(a.ewtWithheld,24,'ap ewt'); eq(a.total,1320,'ap total'); await call('POST',`/ap-bills/${a.id}/post`,{}); return a; });
await step('receipt partial then paid', async () => { const r1=(await call('POST','/receipts',{partyId:customer.id,partyName:customer.name,amount:1000,applications:{create:[{companyCode:company,invoiceId:invoice.id,applied:1000,ewt:0}]}})).data; await call('POST',`/receipts/${r1.id}/post`,{}); let inv=(await call('GET',`/invoices/${invoice.id}`)).data; assert(inv.status==='PARTIAL','not partial'); const r2=(await call('POST','/receipts',{partyId:customer.id,partyName:customer.name,amount:inv.balance,applications:{create:[{companyCode:company,invoiceId:invoice.id,applied:inv.balance,ewt:0}]}})).data; await call('POST',`/receipts/${r2.id}/post`,{}); inv=(await call('GET',`/invoices/${invoice.id}`)).data; assert(inv.status==='PAID','not paid'); });
await step('check applies AP bill', async () => { const check=(await call('POST','/checks',{payeePartyId:vendor.id,payeeName:vendor.name,bankNo:1,amount:ap.balance,applications:{create:[{companyCode:company,apBillId:ap.id,applied:ap.balance,discount:0}]}})).data; await call('POST',`/checks/${check.id}/approve`,{}); await call('POST',`/checks/${check.id}/print`,{}); await call('POST',`/checks/${check.id}/post`,{}); const a=(await call('GET',`/ap-bills/${ap.id}`)).data; assert(a.status==='PAID','AP not paid'); });
await step('close gate blocks then passes and locks', async () => { let ck=(await call('GET',`/shipments/${ocean.id}/close-check`)).data; assert(!ck.ok,'close should block before doc issued'); const doc=(await call('POST','/transport-docs',{shipmentId:ocean.id,docType:'BL',docClass:'HOUSE',docNo:`HBL${stamp}`})).data; await call('POST',`/transport-docs/${doc.id}/issue`,{}); ck=(await call('GET',`/shipments/${ocean.id}/close-check`)).data; assert(ck.ok,`close blockers ${ck.blockers}`); await call('POST',`/shipments/${ocean.id}/close`,{}); const r=await call('PATCH',`/shipments/${ocean.id}`,{version:ocean.version,status:'DRAFT'},true,company,token,[409]); assert(r.status===409,'closed patch not blocked'); });
await step('portal forged token rejected', async () => { const r=await fetch(`${base}/portal/shipments`,{headers:{authorization:`Bearer ${Buffer.from('KORNET:fake:user').toString('base64url')}`}}); assert(r.status===401,'forged portal token not rejected'); });
console.log('SUMMARY', JSON.stringify({ airFile: air.fileNo, oceanFile: ocean.fileNo, invoice: invoice.invoiceNo, ap: ap.billNo }, null, 2));
await prisma.$disconnect();
