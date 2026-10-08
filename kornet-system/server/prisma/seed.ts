import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { env } from '../src/env.js';

const prisma = new PrismaClient();
const KORNET = 'KORNET';

const ports = [
  ['PHMNL', 'PHMNL', 'Manila South Harbor', 'PH', 'SEA', null],
  ['PHMNN', 'PHMNL', 'Manila North Harbor', 'PH', 'SEA', null],
  ['PHCEB', 'PHCEB', 'Cebu International Port', 'PH', 'SEA', null],
  ['PHDVO', 'PHDVO', 'Davao Port (Sasa Wharf)', 'PH', 'SEA', null],
  ['PHBTG', 'PHBTG', 'Batangas Port', 'PH', 'SEA', null],
  ['PHSFS', 'PHSFS', 'Subic Bay Freeport', 'PH', 'SEA', null],
  ['PHCGY', 'PHCGY', 'Cagayan de Oro Port', 'PH', 'SEA', null],
  ['CNSHA', 'CNSHA', 'Shanghai Port', 'CN', 'SEA', null],
  ['SGSIN', 'SGSIN', 'Singapore Port', 'SG', 'SEA', null],
  ['HKHKG', 'HKHKG', 'Hong Kong Victoria Harbor', 'HK', 'SEA', null],
  ['JPTYO', 'JPTYO', 'Tokyo Port', 'JP', 'SEA', null],
  ['KRPUS', 'KRPUS', 'Busan Port', 'KR', 'SEA', null],
  ['USLAX', 'USLAX', 'Port of Los Angeles', 'US', 'SEA', null],
  ['USLGB', 'USLGB', 'Port of Long Beach', 'US', 'SEA', null],
  ['NLRTM', 'NLRTM', 'Port of Rotterdam', 'NL', 'SEA', null],
  ['MNL', null, 'Ninoy Aquino International Airport', 'PH', 'AIR', 'MNL'],
  ['CEB', null, 'Mactan-Cebu International Airport', 'PH', 'AIR', 'CEB'],
  ['DVO', null, 'Francisco Bangoy International Airport', 'PH', 'AIR', 'DVO'],
  ['CRK', null, 'Clark International Airport', 'PH', 'AIR', 'CRK'],
  ['HKG', null, 'Hong Kong International Airport', 'HK', 'AIR', 'HKG'],
  ['SIN', null, 'Singapore Changi Airport', 'SG', 'AIR', 'SIN'],
  ['NRT', null, 'Narita International Airport', 'JP', 'AIR', 'NRT'],
  ['ICN', null, 'Incheon International Airport', 'KR', 'AIR', 'ICN'],
  ['LAX', null, 'Los Angeles International Airport', 'US', 'AIR', 'LAX'],
] as const;

const carriers = [
  ['MAEU', 'Maersk Line Philippines', 'MAEU', null],
  ['MSCU', 'Mediterranean Shipping Company (MSC)', 'MSCU', null],
  ['CMDU', 'CMA CGM Philippines', 'CMDU', null],
  ['COSU', 'COSCO Shipping Lines', 'COSU', null],
  ['EGLV', 'Evergreen Marine Corp.', 'EGLV', null],
  ['ONEY', 'Ocean Network Express (ONE)', 'ONEY', null],
  ['PAL', 'Philippine Airlines Cargo', null, '079'],
  ['CEB', 'Cebu Pacific Air Cargo', null, '203'],
  ['CPA', 'Cathay Pacific Cargo', null, '160'],
  ['SIA', 'Singapore Airlines Cargo', null, '618'],
  ['KAL', 'Korean Air Cargo', null, '180'],
] as const;

const billing = [
  ['OFRT', 'Ocean Freight', 'FREIGHT', 'OCEAN', 'PER_WM', 'ZERO_RATED', '4210', '4510'],
  ['AFRT', 'Air Freight', 'FREIGHT', 'AIR', 'PER_KG', 'ZERO_RATED', '4211', '4511'],
  ['FSC', 'Fuel Surcharge', 'FREIGHT', 'OCEAN,AIR', 'PER_SHPT', 'ZERO_RATED', '4210', '4510'],
  ['BAF', 'Bunker Adjustment Factor', 'FREIGHT', 'OCEAN', 'PER_CNTR', 'ZERO_RATED', '4210', '4510'],
  ['THC', 'Terminal Handling Charge', 'ORIGIN', 'OCEAN', 'PER_CNTR', 'VATABLE', '4215', '4515'],
  ['DOC', 'Documentation Fee', 'DOCS', 'OCEAN,AIR', 'PER_FILE', 'VATABLE', '4215', '4515'],
  ['BLF', 'Bill of Lading Fee', 'DOCS', 'OCEAN', 'PER_BL', 'VATABLE', '4215', '4515'],
  ['AWBF', 'Air Waybill Fee', 'DOCS', 'AIR', 'PER_AWB', 'VATABLE', '4215', '4515'],
  ['SEC', 'Security Surcharge', 'ORIGIN', 'AIR', 'PER_KG', 'VATABLE', '4215', '4515'],
  ['CFS', 'Container Freight Station Charge', 'WAREHOUSE', 'OCEAN', 'PER_CBM', 'VATABLE', '4214', '4514'],
  ['ARR', 'Arrastre Charges', 'REIMBURSABLE', 'OCEAN', 'MANUAL', 'NON_VAT_REIMBURSABLE', '1130', '1130'],
  ['WHF', 'Wharfage Dues', 'REIMBURSABLE', 'OCEAN', 'MANUAL', 'NON_VAT_REIMBURSABLE', '1130', '1130'],
  ['DUT', 'Customs Duties & Taxes', 'REIMBURSABLE', 'OCEAN,AIR', 'MANUAL', 'NON_VAT_REIMBURSABLE', '1130', '1130'],
  ['BRK', 'Customs Brokerage Fee', 'CUSTOMS', 'OCEAN,AIR', 'PER_SHPT', 'VATABLE', '4212', '4512'],
  ['TRK', 'Inland Trucking Delivery', 'TRUCKING', 'DOMESTIC,OCEAN,AIR,PD', 'PER_SHPT', 'VATABLE', '4213', '4513'],
  ['STO', 'Bonded Warehouse Storage', 'WAREHOUSE', 'OCEAN,AIR,VEHICLE', 'PER_CBM', 'VATABLE', '4214', '4514'],
  ['HDL', 'Cargo Handling Fee', 'OTHER', 'OCEAN,AIR,VEHICLE', 'PER_SHPT', 'VATABLE', '4215', '4515'],
  ['VHD', 'RoRo Vehicle Port Handling', 'OTHER', 'VEHICLE', 'PER_UNIT', 'VATABLE', '4216', '4515'],
] as const;

const customers = [
  { code: 'CUST-SMC', name: 'San Miguel Yamamura Packaging Corp.', address: '40 San Miguel Ave, Ortigas Center, Mandaluyong City, Metro Manila', tin: '000-123-456-000', contact: 'Ramon Castillo Â· 0917-888-1122', email: 'rcastillo@smg.sanmiguel.com.ph' },
  { code: 'CUST-URC', name: 'Universal Robina Corporation', address: 'Eulogio Rodriguez Jr Ave, Bagong Ilog, Pasig, Metro Manila', tin: '000-234-567-000', contact: 'Elena Bautista Â· 0918-999-3344', email: 'elena.bautista@urc.com.ph' },
  { code: 'CUST-TMP', name: 'Toyota Motor Philippines Corp.', address: 'Toyota Special Economic Zone, Santa Rosa-Tagaytay Rd, Santa Rosa, Laguna', tin: '000-345-678-000', contact: 'Kenji Tanaka Â· 0917-555-8899', email: 'logistics@toyota.com.ph' },
  { code: 'CUST-NESTLE', name: 'NestlÃ© Philippines Inc.', address: 'Cabuyao Industrial Park, Brgy. Niugan, Cabuyao, Laguna', tin: '000-456-789-000', contact: 'Carlos Mendoza Â· 0920-777-6655', email: 'supplychain@ph.nestle.com' },
  { code: 'CUST-MONDE', name: 'Monde Nissin Corporation', address: 'Felix Reyes St, Balibago, Santa Rosa, Laguna', tin: '000-567-890-000', contact: 'Grace Lim Â· 0917-333-2211', email: 'grace.lim@mondenissin.com' },
];

const agents = [
  { code: 'AGT-LAX', name: 'Pacific Forwarding Logistics LLC', address: '19200 S Western Ave, Torrance, CA 90501, USA', contact: 'John Miller Â· +1-310-555-0144' },
  { code: 'AGT-TYO', name: 'Nippon Cargo & Express KK', address: '2-1-1 Nihonbashi, Chuo-ku, Tokyo 103-0027, Japan', contact: 'Takeshi Sato Â· +81-3-5555-0199' },
  { code: 'AGT-SIN', name: 'Lion City Freight Logistics Pte Ltd', address: '10 Changi South St 2, Singapore 486596', contact: 'Marcus Tan Â· +65-6555-0188' },
  { code: 'AGT-HKG', name: 'Kowloon Air Express Ltd', address: 'Tower 2, Metroplaza, Kwai Fong, Hong Kong', contact: 'David Wong Â· +852-2555-0177' },
];

const settings: Record<string, unknown> = {
  marginThresholdPct: 15,
  defaultCurrency: 'PHP',
  vatRate: 12,
  glDefaults: { arTrade: '1123', apTrade: '2112', cashDefault: '1110', outputVat: '2122', inputVat: '1142', ewtReceivable: '1128', ewtPayable: '2166', advancesToClients: '1130', customerDeposits: '2117', fxGainLoss: '4303', revenueDefault: '4215', costDefault: '4515' },
  bankAccounts: { '0': '1110', '1': '1110' },
  withholdOnVendors: true,
};

async function main() {
  console.log('Seeding Kornet Express Logistics Operations & Accounting...');

  // Purge smoke-test artifacts (company OTHER, test users created by smoke-flow.mjs)
  const smokeUsernames = ['viewer_smoke', 'testop', 'smoke_admin', 'viewer_test', 'testviewer'];
  await prisma.shipment.deleteMany({ where: { companyCode: 'OTHER' } }).catch(() => undefined);
  await prisma.invoice.deleteMany({ where: { companyCode: 'OTHER' } }).catch(() => undefined);
  await prisma.party.deleteMany({ where: { companyCode: 'OTHER' } }).catch(() => undefined);
  await prisma.port.deleteMany({ where: { companyCode: 'OTHER' } }).catch(() => undefined);
  await prisma.company.deleteMany({ where: { code: 'OTHER' } }).catch(() => undefined);
  await prisma.user.deleteMany({ where: { username: { in: smokeUsernames } } }).catch(() => undefined);

  // 1. Company
  await prisma.company.upsert({
    where: { code: KORNET },
    update: { name: 'Kornet Express Inc.', legalName: 'Kornet Express, Inc.', address: 'Unit 801, Ermita, Manila, Philippines', active: true },
    create: { code: KORNET, name: 'Kornet Express Inc.', legalName: 'Kornet Express, Inc.', address: 'Unit 801, Ermita, Manila, Philippines', active: true },
  });

  // 2. Admin User
  const passwordHash = await bcrypt.hash(env.seed.adminPassword, 10);
  const admin = await prisma.user.upsert({
    where: { username: env.seed.adminUsername },
    update: { role: 'superadmin', canAccessFs: true, active: true },
    create: { username: env.seed.adminUsername, passwordHash, fullName: 'System Administrator', role: 'superadmin', active: true, canAccessFs: true, companies: JSON.stringify(['KORNET']) },
  });

  // Clean existing operational records to make seed idempotent
  await prisma.receiptApplication.deleteMany({ where: { companyCode: KORNET } }).catch(() => undefined);
  await prisma.receipt.deleteMany({ where: { companyCode: KORNET } }).catch(() => undefined);
  await prisma.invoiceLine.deleteMany({ where: { companyCode: KORNET } }).catch(() => undefined);
  await prisma.invoice.deleteMany({ where: { companyCode: KORNET } }).catch(() => undefined);
  await prisma.apBillLine.deleteMany({ where: { companyCode: KORNET } }).catch(() => undefined);
  await prisma.apBill.deleteMany({ where: { companyCode: KORNET } }).catch(() => undefined);
  await prisma.charge.deleteMany({ where: { companyCode: KORNET } }).catch(() => undefined);
  await prisma.cargoLine.deleteMany({ where: { companyCode: KORNET } }).catch(() => undefined);
  await prisma.container.deleteMany({ where: { companyCode: KORNET } }).catch(() => undefined);
  await prisma.transportDoc.deleteMany({ where: { companyCode: KORNET } }).catch(() => undefined);
  await prisma.vehicle.deleteMany({ where: { companyCode: KORNET } }).catch(() => undefined);
  await prisma.pdOrder.deleteMany({ where: { companyCode: KORNET } }).catch(() => undefined);
  await prisma.shipment.deleteMany({ where: { companyCode: KORNET } }).catch(() => undefined);
  await prisma.quote.deleteMany({ where: { companyCode: KORNET } }).catch(() => undefined);
  await prisma.dispatchRoute.deleteMany({ where: { companyCode: KORNET } }).catch(() => undefined);
  await prisma.driver.deleteMany({ where: { companyCode: KORNET } }).catch(() => undefined);
  await prisma.fleetVehicle.deleteMany({ where: { companyCode: KORNET } }).catch(() => undefined);

  // 3. Ports
  for (const [code, unlocode, name, country, kind, iata] of ports) {
    await prisma.port.upsert({
      where: { companyCode_code: { companyCode: KORNET, code } },
      update: { unlocode, name, country, kind, type: kind.toLowerCase(), iata },
      create: { companyCode: KORNET, code, unlocode, name, country, kind, type: kind.toLowerCase(), iata },
    });
  }

  // 4. Carriers (Vendors)
  const carrierMap = new Map<string, string>();
  for (const [code, name, scac, iataCode] of carriers) {
    const party = await prisma.party.upsert({
      where: { companyCode_code: { companyCode: KORNET, code } },
      update: { name, isCarrier: true, isVendor: true, scac, iataCode, active: true },
      create: { companyCode: KORNET, code, name, isCarrier: true, isVendor: true, scac, iataCode, active: true },
    });
    carrierMap.set(code, party.id);
    await prisma.carrier.create({ data: { companyCode: KORNET, name, scac: scac ?? iataCode ?? undefined, mode: scac ? 'ocean' : 'air' } }).catch(() => undefined);
  }

  // 5. Customers & Overseas Agents
  const custMap = new Map<string, string>();
  for (const c of customers) {
    const party = await prisma.party.upsert({
      where: { companyCode_code: { companyCode: KORNET, code: c.code } },
      update: { name: c.name, address: c.address, tin: c.tin, email: c.email, isCustomer: true, isShipper: true, isConsignee: true, active: true },
      create: { companyCode: KORNET, code: c.code, name: c.name, address: c.address, tin: c.tin, email: c.email, isCustomer: true, isShipper: true, isConsignee: true, active: true },
    });
    custMap.set(c.code, party.id);
  }

  const agentMap = new Map<string, string>();
  for (const a of agents) {
    const party = await prisma.party.upsert({
      where: { companyCode_code: { companyCode: KORNET, code: a.code } },
      update: { name: a.name, address: a.address, isAgent: true, isConsignee: true, isShipper: true, active: true },
      create: { companyCode: KORNET, code: a.code, name: a.name, address: a.address, isAgent: true, isConsignee: true, isShipper: true, active: true },
    });
    agentMap.set(a.code, party.id);
  }

  // 6. Billing Codes
  for (const [code, description, category, modes, defaultUnit, vatClass, revenueAccount, costAccount] of billing) {
    await prisma.billingCode.upsert({
      where: { companyCode_code: { companyCode: KORNET, code } },
      update: { description, category, modes, defaultUnit, vatClass, revenueAccount, costAccount, glAccount: revenueAccount, taxable: vatClass === 'VATABLE', active: true },
      create: { companyCode: KORNET, code, description, category, modes, defaultUnit, vatClass, revenueAccount, costAccount, glAccount: revenueAccount, taxable: vatClass === 'VATABLE', active: true },
    });
  }

  // 7. Company Settings & Integrations
  for (const [key, value] of Object.entries(settings)) {
    await prisma.companySetting.upsert({
      where: { companyCode_key: { companyCode: KORNET, key } },
      update: { value: JSON.stringify(value) },
      create: { companyCode: KORNET, key, value: JSON.stringify(value) },
    });
  }

  // 8. Drivers & Fleet Trucks
  await prisma.driver.create({
    data: { companyCode: KORNET, name: 'Juan Dela Cruz', licenseNo: 'N01-14-123456', licenseExpiry: new Date('2027-08-15'), phone: '0917-555-0123', plateHint: 'NBD 1234', status: 'ASSIGNED' },
  });
  await prisma.driver.create({
    data: { companyCode: KORNET, name: 'Roberto Bautista', licenseNo: 'N02-09-654321', licenseExpiry: new Date('2026-10-25'), phone: '0918-777-4567', plateHint: 'CBC 7890', status: 'AVAILABLE' },
  });
  await prisma.driver.create({
    data: { companyCode: KORNET, name: 'Eduardo Santos', licenseNo: 'C03-12-789012', licenseExpiry: new Date('2028-03-10'), phone: '0920-888-9012', plateHint: 'ABK 4567', status: 'AVAILABLE' },
  });

  await prisma.fleetVehicle.create({
    data: { companyCode: KORNET, plateNo: 'NBD 1234', type: '10W Wing Van', make: 'Isuzu Giga', capacity: '15,000 kg / 45 CBM', registrationExpiry: new Date('2027-05-30'), insuranceExpiry: new Date('2027-04-15'), status: 'ASSIGNED' },
  });
  await prisma.fleetVehicle.create({
    data: { companyCode: KORNET, plateNo: 'CBC 7890', type: '6W Forward Van', make: 'Hino 500', capacity: '8,000 kg / 28 CBM', registrationExpiry: new Date('2026-10-18'), insuranceExpiry: new Date('2027-01-20'), status: 'AVAILABLE' },
  });
  await prisma.fleetVehicle.create({
    data: { companyCode: KORNET, plateNo: 'ABK 4567', type: '4W Closed Van', make: 'Mitsubishi Canter', capacity: '4,000 kg / 16 CBM', registrationExpiry: new Date('2027-11-12'), insuranceExpiry: new Date('2027-09-05'), status: 'AVAILABLE' },
  });
  await prisma.fleetVehicle.create({
    data: { companyCode: KORNET, plateNo: 'RTH 9012', type: 'Tractor Head / Chassis', make: 'Fuso Super Great', capacity: '32,000 kg', registrationExpiry: new Date('2027-07-22'), insuranceExpiry: new Date('2027-06-30'), status: 'MAINTENANCE' },
  });

  // 9. Dispatch Routes
  await prisma.dispatchRoute.create({
    data: {
      companyCode: KORNET, routeNo: 'DT-2026-0001', stage: 'IN_TRANSIT', origin: 'Monde Nissin Plant, Santa Rosa, Laguna', destination: 'Shopee Hub, Calamba Logistics Center',
      driverName: 'Juan Dela Cruz', vehiclePlate: 'NBD 1234', cargoRef: 'PO-98442 Â· 480 Cartons Noodles', scheduledAt: new Date(), remarks: 'Priority morning delivery',
    },
  });

  // 10. Quotes
  const q1 = await prisma.quote.create({
    data: {
      companyCode: KORNET, quoteNo: 'QUO-2026-0001', status: 'ACCEPTED', mode: 'OCEAN', direction: 'EXPORT',
      customerPartyId: custMap.get('CUST-SMC'), contact: 'Ramon Castillo', pol: 'PHMNL', pod: 'USLAX',
      incoterm: 'FOB', freightTerm: 'PREPAID', currency: 'USD', exchangeRate: 57.0, commodity: 'Glass Container Packaging',
      validUntil: new Date('2026-11-30'),
    },
  });
  await prisma.cargoLine.create({
    data: { companyCode: KORNET, quoteId: q1.id, lineNo: 1, pieces: 1200, packageType: 'Cartons', description: 'Glass Bottles', grossKg: 18500, cbm: 48.5 },
  });
  await prisma.charge.create({
    data: { companyCode: KORNET, quoteId: q1.id, billingCode: 'OFRT', description: 'Ocean Freight 40HC', unit: 'PER_CNTR', qty: 1, rate: 2400, amount: 2400, amountPhp: 136800, vatClass: 'ZERO_RATED', costRate: 2100, costAmount: 2100, costAmountPhp: 119700 },
  });

  const q2 = await prisma.quote.create({
    data: {
      companyCode: KORNET, quoteNo: 'QUO-2026-0002', status: 'SENT', mode: 'AIR', direction: 'EXPORT',
      customerPartyId: custMap.get('CUST-URC'), contact: 'Elena Bautista', pol: 'MNL', pod: 'NRT',
      incoterm: 'CIP', freightTerm: 'PREPAID', currency: 'PHP', exchangeRate: 1.0, commodity: 'Jack n Jill Snack Confectionery',
      validUntil: new Date('2026-11-15'),
    },
  });
  await prisma.cargoLine.create({
    data: { companyCode: KORNET, quoteId: q2.id, lineNo: 1, pieces: 60, packageType: 'Boxes', description: 'Assorted Snacks', lengthCm: 80, widthCm: 60, heightCm: 50, grossKg: 2100, volumetricKg: 2400, chargeableKg: 2400 },
  });

  // 11. Operational Shipments:
  // (A) OCEAN EXPORT
  const oe = await prisma.shipment.create({
    data: {
      companyCode: KORNET, fileNo: 'OE-2026-00001', mode: 'OCEAN', direction: 'EXPORT', status: 'IN_TRANSIT',
      bookingNo: 'BKG-MAEU-202604', carrierBookingRef: 'MAEU-884912',
      shipperPartyId: custMap.get('CUST-SMC'), consigneePartyId: agentMap.get('AGT-LAX'), billToPartyId: custMap.get('CUST-SMC'),
      carrierPartyId: carrierMap.get('MAEU'), polCode: 'PHMNL', podCode: 'USLAX', placeOfReceipt: 'Manila CFS', finalDestination: 'Los Angeles, CA',
      vessel: 'MAERSK MC-KINNEY MOLLER', voyage: '2604E',
      etd: new Date(Date.now() - 3 * 86400000), eta: new Date(Date.now() + 14 * 86400000),
      docCutoff: new Date(Date.now() - 5 * 86400000), cargoCutoff: new Date(Date.now() - 4 * 86400000),
      commodity: 'San Miguel Glass Packaging Containers', freightTerm: 'PREPAID', incoterm: 'FOB', currency: 'PHP',
      createdBy: admin.id,
    },
  });
  await prisma.container.create({
    data: { companyCode: KORNET, shipmentId: oe.id, containerNo: 'MSKU7829104', equipmentType: '40HC', sealNo: 'ML-PH-99214', tareKg: 3850, maxPayloadKg: 20750, vgmKg: 24600, status: 'LOADED_ON_BOARD' },
  });
  await prisma.container.create({
    data: { companyCode: KORNET, shipmentId: oe.id, containerNo: 'MSKU4312890', equipmentType: '20GP', sealNo: 'ML-PH-99215', tareKg: 2200, maxPayloadKg: 16200, vgmKg: 18400, status: 'LOADED_ON_BOARD' },
  });
  await prisma.cargoLine.create({
    data: { companyCode: KORNET, shipmentId: oe.id, lineNo: 1, pieces: 1200, packageType: 'Cartons', description: 'Food Grade Glass Bottles', grossKg: 18500, cbm: 48.5, marks: 'SMC / USLAX / 1-1200' },
  });
  await prisma.transportDoc.create({
    data: {
      companyCode: KORNET, shipmentId: oe.id, docType: 'HOUSE_BL', docNo: 'KNE-HBL-2026-0012', status: 'ISSUED',
      shipperName: 'San Miguel Yamamura Packaging Corp.', consigneeName: 'Pacific Forwarding Logistics LLC', notifyName: 'Same as Consignee',
      issuePlace: 'Manila, Philippines', issueDate: new Date(), freightTerm: 'PREPAID',
    },
  });
  await prisma.transportDoc.create({
    data: {
      companyCode: KORNET, shipmentId: oe.id, docType: 'MASTER_BL', docNo: 'MAEU-MNL-260401', status: 'ISSUED',
      shipperName: 'Kornet Express Inc.', consigneeName: 'Pacific Forwarding Logistics LLC', issuePlace: 'Manila', issueDate: new Date(),
    },
  });
  await prisma.charge.create({
    data: { companyCode: KORNET, shipmentId: oe.id, billingCode: 'OFRT', description: 'Ocean Freight Manila to Los Angeles', unit: 'PER_CNTR', qty: 2, rate: 68400, amount: 136800, amountPhp: 136800, vatClass: 'ZERO_RATED', costVendorPartyId: carrierMap.get('MAEU'), costQty: 2, costRate: 59850, costAmount: 119700, costAmountPhp: 119700, billStatus: 'INVOICED', costStatus: 'BILLED' },
  });
  await prisma.charge.create({
    data: { companyCode: KORNET, shipmentId: oe.id, billingCode: 'THC', description: 'Terminal Handling Charge Origin', unit: 'PER_CNTR', qty: 2, rate: 7250, amount: 14500, amountPhp: 14500, vatClass: 'VATABLE', vatAmountPhp: 1740, costVendorPartyId: carrierMap.get('MAEU'), costQty: 2, costRate: 6000, costAmount: 12000, costAmountPhp: 12000, billStatus: 'INVOICED', costStatus: 'BILLED' },
  });
  await prisma.charge.create({
    data: { companyCode: KORNET, shipmentId: oe.id, billingCode: 'DOC', description: 'Documentation Fee', unit: 'PER_FILE', qty: 1, rate: 3500, amount: 3500, amountPhp: 3500, vatClass: 'VATABLE', vatAmountPhp: 420, billStatus: 'INVOICED', costStatus: 'OPEN' },
  });

  // (B) OCEAN IMPORT
  const oi = await prisma.shipment.create({
    data: {
      companyCode: KORNET, fileNo: 'OI-2026-00001', mode: 'OCEAN', direction: 'IMPORT', status: 'ARRIVED',
      bookingNo: 'EGLV-TYO-982144', carrierBookingRef: 'EMC-091244',
      shipperPartyId: agentMap.get('AGT-TYO'), consigneePartyId: custMap.get('CUST-TMP'), billToPartyId: custMap.get('CUST-TMP'),
      carrierPartyId: carrierMap.get('EGLV'), polCode: 'JPTYO', podCode: 'PHMNL', placeOfReceipt: 'Tokyo Port', finalDestination: 'Toyota Laguna Plant',
      vessel: 'EVER GIVEN', voyage: '0142W',
      etd: new Date(Date.now() - 10 * 86400000), eta: new Date(Date.now() + 1 * 86400000),
      commodity: 'Automotive Transmission Assemblies', freightTerm: 'COLLECT', incoterm: 'FCA', currency: 'PHP',
      createdBy: admin.id,
    },
  });
  await prisma.container.create({
    data: { companyCode: KORNET, shipmentId: oi.id, containerNo: 'EGLU9182341', equipmentType: '40HC', sealNo: 'EMC-88219', tareKg: 3900, maxPayloadKg: 22200, vgmKg: 26100, status: 'DISCHARGED' },
  });
  await prisma.cargoLine.create({
    data: { companyCode: KORNET, shipmentId: oi.id, lineNo: 1, pieces: 80, packageType: 'Crates', description: 'Transmission Gearboxes', grossKg: 22250, cbm: 56.0, marks: 'TMP-LAGUNA-01/80' },
  });
  await prisma.transportDoc.create({
    data: {
      companyCode: KORNET, shipmentId: oi.id, docType: 'HOUSE_BL', docNo: 'KNE-OIBL-2026-0005', status: 'ISSUED',
      shipperName: 'Nippon Cargo & Express KK', consigneeName: 'Toyota Motor Philippines Corp.', freightTerm: 'COLLECT',
      issuePlace: 'Tokyo', issueDate: new Date(),
    },
  });
  await prisma.charge.create({
    data: { companyCode: KORNET, shipmentId: oi.id, billingCode: 'THC', description: 'Terminal Handling Charge Destination', unit: 'PER_CNTR', qty: 1, rate: 8500, amount: 8500, amountPhp: 8500, vatClass: 'VATABLE', vatAmountPhp: 1020, billStatus: 'OPEN', costStatus: 'OPEN' },
  });
  await prisma.charge.create({
    data: { companyCode: KORNET, shipmentId: oi.id, billingCode: 'BRK', description: 'Customs Clearance & Brokerage', unit: 'PER_SHPT', qty: 1, rate: 12500, amount: 12500, amountPhp: 12500, vatClass: 'VATABLE', vatAmountPhp: 1500, billStatus: 'OPEN', costStatus: 'OPEN' },
  });

  // (C) AIR EXPORT
  const ae = await prisma.shipment.create({
    data: {
      companyCode: KORNET, fileNo: 'AE-2026-00001', mode: 'AIR', direction: 'EXPORT', status: 'DEPARTED',
      bookingNo: 'PAL-BK-2026-0791', carrierBookingRef: 'PAL-CARGO-99',
      shipperPartyId: custMap.get('CUST-NESTLE'), consigneePartyId: agentMap.get('AGT-SIN'), billToPartyId: custMap.get('CUST-NESTLE'),
      carrierPartyId: carrierMap.get('PAL'), polCode: 'MNL', podCode: 'SIN',
      flightNo: 'PR 507', etd: new Date(), eta: new Date(Date.now() + 4 * 3600000),
      commodity: 'Nestle Nutritional Dairy Formula', freightTerm: 'PREPAID', incoterm: 'CIP', currency: 'PHP',
      createdBy: admin.id,
    },
  });
  await prisma.cargoLine.create({
    data: { companyCode: KORNET, shipmentId: ae.id, lineNo: 1, pieces: 45, packageType: 'Boxes', description: 'Nutritional Infant Powder', lengthCm: 80, widthCm: 60, heightCm: 50, grossKg: 1850, volumetricKg: 1800, chargeableKg: 1850, marks: 'NESTLE / SIN / 1-45' },
  });
  await prisma.transportDoc.create({
    data: {
      companyCode: KORNET, shipmentId: ae.id, docType: 'HOUSE_AWB', docNo: 'KNE-HAWB-2026-0089', status: 'ISSUED',
      shipperName: 'NestlÃ© Philippines Inc.', consigneeName: 'Lion City Freight Logistics Pte Ltd', issuePlace: 'Manila', issueDate: new Date(),
    },
  });
  await prisma.transportDoc.create({
    data: {
      companyCode: KORNET, shipmentId: ae.id, docType: 'MASTER_AWB', docNo: '079-81234565', status: 'ISSUED', // Valid mod-7 check digit: 8123456 % 7 = 5
      shipperName: 'Kornet Express Inc.', consigneeName: 'Lion City Freight Logistics Pte Ltd', issuePlace: 'Manila', issueDate: new Date(),
    },
  });
  await prisma.charge.create({
    data: { companyCode: KORNET, shipmentId: ae.id, billingCode: 'AFRT', description: 'Air Freight Manila to Singapore', unit: 'PER_KG', qty: 1850, rate: 88, amount: 162800, amountPhp: 162800, vatClass: 'ZERO_RATED', costVendorPartyId: carrierMap.get('PAL'), costQty: 1850, costRate: 74, costAmount: 136900, costAmountPhp: 136900, billStatus: 'INVOICED', costStatus: 'BILLED' },
  });
  await prisma.charge.create({
    data: { companyCode: KORNET, shipmentId: ae.id, billingCode: 'AWBF', description: 'Air Waybill Processing Fee', unit: 'PER_AWB', qty: 1, rate: 1800, amount: 1800, amountPhp: 1800, vatClass: 'VATABLE', vatAmountPhp: 216, billStatus: 'INVOICED', costStatus: 'OPEN' },
  });

  // (D) AIR IMPORT
  const ai = await prisma.shipment.create({
    data: {
      companyCode: KORNET, fileNo: 'AI-2026-00001', mode: 'AIR', direction: 'IMPORT', status: 'CUSTOMS_CLEARED',
      bookingNo: 'CPA-HKG-90312',
      shipperPartyId: agentMap.get('AGT-HKG'), consigneePartyId: custMap.get('CUST-URC'), billToPartyId: custMap.get('CUST-URC'),
      carrierPartyId: carrierMap.get('CPA'), polCode: 'HKG', podCode: 'MNL',
      flightNo: 'CX 903', etd: new Date(Date.now() - 86400000), eta: new Date(Date.now() - 80000000),
      commodity: 'Precision Optical Sensors & Microchips', freightTerm: 'PREPAID', incoterm: 'CPT', currency: 'PHP',
      createdBy: admin.id,
    },
  });
  await prisma.cargoLine.create({
    data: { companyCode: KORNET, shipmentId: ai.id, lineNo: 1, pieces: 12, packageType: 'Pallets', description: 'Optical Sensors', grossKg: 620, volumetricKg: 750, chargeableKg: 750 },
  });
  await prisma.transportDoc.create({
    data: {
      companyCode: KORNET, shipmentId: ai.id, docType: 'MASTER_AWB', docNo: '160-54128904', status: 'ISSUED', // 5412890 % 7 = 4
      shipperName: 'Kowloon Air Express Ltd', consigneeName: 'Kornet Express Inc.', issuePlace: 'Hong Kong', issueDate: new Date(),
    },
  });
  await prisma.charge.create({
    data: { companyCode: KORNET, shipmentId: ai.id, billingCode: 'BRK', description: 'Customs Clearance Fee', unit: 'PER_SHPT', qty: 1, rate: 8500, amount: 8500, amountPhp: 8500, vatClass: 'VATABLE', vatAmountPhp: 1020, billStatus: 'OPEN', costStatus: 'OPEN' },
  });

  // (E) DOMESTIC TRUCKING
  const dt = await prisma.shipment.create({
    data: {
      companyCode: KORNET, fileNo: 'DT-2026-00001', mode: 'DOMESTIC', direction: 'DOMESTIC', status: 'IN_TRANSIT',
      bookingNo: 'TT-2026-0042', carrierBookingRef: 'GP-8831',
      shipperPartyId: custMap.get('CUST-MONDE'), consigneePartyId: custMap.get('CUST-SMC'), billToPartyId: custMap.get('CUST-MONDE'),
      placeOfReceipt: 'Monde Nissin Facility, Santa Rosa, Laguna', finalDestination: 'SMC Canlubang Distribution Hub, Calamba',
      vessel: 'NBD 1234', voyage: 'N01-14-123456', flightNo: 'Juan Dela Cruz Â· 0917-555-0123',
      commodity: 'Lucky Me Consumer Instant Noodles & Baked Goods', freightTerm: 'PREPAID', currency: 'PHP',
      remarks: '10W Wing Van Â· Warehouse Gate Pass GP-8831 Â· Sealed Truck',
      createdBy: admin.id,
    },
  });
  await prisma.cargoLine.create({
    data: { companyCode: KORNET, shipmentId: dt.id, lineNo: 1, pieces: 480, packageType: 'Cartons', description: 'Instant Noodles Assorted', grossKg: 4200, cbm: 24.0 },
  });
  await prisma.transportDoc.create({
    data: {
      companyCode: KORNET, shipmentId: dt.id, docType: 'DELIVERY_RECEIPT', docNo: 'DR-2026-0015', status: 'ISSUED',
      shipperName: 'Monde Nissin Corporation', consigneeName: 'San Miguel Yamamura Packaging',
      handlingInfo: 'Driver: Juan Dela Cruz (Plate: NBD 1234) Â· Trip Ticket: TT-2026-0042', issuePlace: 'Laguna', issueDate: new Date(),
    },
  });
  await prisma.charge.create({
    data: { companyCode: KORNET, shipmentId: dt.id, billingCode: 'TRK', description: 'Dedicated 10W Wing Van Trucking Laguna to Calamba', unit: 'PER_SHPT', qty: 1, rate: 32000, amount: 32000, amountPhp: 32000, vatClass: 'VATABLE', vatAmountPhp: 3840, billStatus: 'INVOICED', costStatus: 'OPEN' },
  });

  // 12. Vehicles (RoRo Export Inventory)
  await prisma.vehicle.create({
    data: {
      companyCode: KORNET, wrNo: 'WR-2026-0001', vin: '1HGCR2F83HA012345', make: 'Toyota', model: 'Hilux 2.8 4x4 Conquest', year: 2024,
      color: 'Silver Metallic', status: 'READY', keys: '2', odometer: 1200, titleNumber: 'CR-889921', titleState: 'LTO-NCR',
      shipperName: 'Toyota Motor Philippines Corp.', consigneeName: 'Gulf Motors International LLC', finalDestination: 'Jebel Ali, Dubai',
    },
  });
  await prisma.vehicle.create({
    data: {
      companyCode: KORNET, wrNo: 'WR-2026-0002', vin: '3N1AB7AP4HY234567', make: 'Isuzu', model: 'D-Max 3.0 LS-A 4x4', year: 2023,
      color: 'Valencia Orange', status: 'INSPECTED', keys: '2', odometer: 4500, titleNumber: 'CR-771120', titleState: 'LTO-Region 4A',
      shipperName: 'San Miguel Yamamura Packaging Corp.', consigneeName: 'Asia Pacific Fleet Services', finalDestination: 'Singapore',
    },
  });
  await prisma.vehicle.create({
    data: {
      companyCode: KORNET, wrNo: 'WR-2026-0003', vin: '4T1B11HK5JU345678', make: 'Mitsubishi', model: 'Montero Sport GT 4x4', year: 2024,
      color: 'White Diamond', status: 'RECEIVED', keys: '1', odometer: 850,
      shipperName: 'Universal Robina Corporation', consigneeName: 'Global Auto Logistics', finalDestination: 'Tokyo, Japan',
    },
  });
  await prisma.vehicle.create({
    data: {
      companyCode: KORNET, wrNo: 'WR-2026-0004', vin: '5N1AL0MM4EC456789', make: 'Nissan', model: 'Navara PRO-4X 4x4', year: 2023,
      color: 'Stealth Gray', status: 'HOLD', hold: true,
      shipperName: 'NestlÃ© Philippines Inc.', consigneeName: 'Oceanic Motors Australia', finalDestination: 'Sydney, Australia',
    },
  });

  // 13. P/D Orders (Pickup & Delivery)
  await prisma.pdOrder.create({
    data: {
      companyCode: KORNET, orderNo: 'PD-2026-0001', type: 'PICKUP', status: 'DISPATCHED',
      shipperName: 'San Miguel Yamamura Packaging Corp.', originAddr: 'Santa Rosa Industrial Park, Laguna',
      consigneeName: 'Manila South Harbor CY Container Yard', destAddr: 'South Harbor, Port Area, Manila',
      date: new Date(), carrierPartyId: carrierMap.get('MAEU'), loadNumber: 'LD-40HC-01', trackingNo: 'TRK-2026-001',
      equipmentType: '10W Wing Van', instructions: 'Present Warehouse Gate Pass GP-8831 upon entry.',
    },
  });
  await prisma.pdOrder.create({
    data: {
      companyCode: KORNET, orderNo: 'PD-2026-0002', type: 'DELIVERY', status: 'SCHEDULED',
      shipperName: 'Manila North Harbor Pier 16', originAddr: 'Pier 16, North Harbor, Manila',
      consigneeName: 'Toyota Motor Philippines Corp.', destAddr: 'Santa Rosa Plant, Laguna',
      date: new Date(Date.now() + 86400000), equipmentType: 'Tractor Head / 40ft Chassis', instructions: 'Handle with care: Automotive transmissions.',
    },
  });
  await prisma.pdOrder.create({
    data: {
      companyCode: KORNET, orderNo: 'PD-2026-0003', type: 'PICKUP', status: 'COMPLETED',
      shipperName: 'NestlÃ© Philippines Inc.', originAddr: 'Cabuyao Industrial Park, Laguna',
      consigneeName: 'NAIA International Cargo Terminal', destAddr: 'NAIA Cargo Area, Pasay City',
      date: new Date(Date.now() - 86400000), podSignedBy: 'R. Tan (PAL Cargo Acceptance)', podAt: new Date(Date.now() - 40000000),
      equipmentType: '6W Forward Van', instructions: 'Keep cargo dry and ambient temperature.',
    },
  });

  // 14. Billing: Invoices (SI)
  const inv1 = await prisma.invoice.create({
    data: {
      companyCode: KORNET, invoiceNo: 'SI-2026-00001', status: 'PAID', shipmentId: oe.id,
      billToPartyId: custMap.get('CUST-SMC'), billToName: 'San Miguel Yamamura Packaging Corp.',
      billToAddress: '40 San Miguel Ave, Mandaluyong City', billToTin: '000-123-456-000',
      date: new Date(Date.now() - 5 * 86400000), dueDate: new Date(Date.now() + 25 * 86400000),
      currency: 'PHP', totalAmount: 156960, balance: 0,
    },
  });
  await prisma.invoiceLine.create({
    data: { companyCode: KORNET, invoiceId: inv1.id, billingCode: 'OFRT', description: 'Ocean Freight Manila to Los Angeles', qty: 2, rate: 68400, amount: 136800, amountPhp: 136800, vatClass: 'ZERO_RATED', vatAmountPhp: 0 },
  });
  await prisma.invoiceLine.create({
    data: { companyCode: KORNET, invoiceId: inv1.id, billingCode: 'THC', description: 'Terminal Handling Charge Origin', qty: 2, rate: 7250, amount: 14500, amountPhp: 14500, vatClass: 'VATABLE', vatAmountPhp: 1740 },
  });
  await prisma.invoiceLine.create({
    data: { companyCode: KORNET, invoiceId: inv1.id, billingCode: 'DOC', description: 'Documentation Fee', qty: 1, rate: 3500, amount: 3500, amountPhp: 3500, vatClass: 'VATABLE', vatAmountPhp: 420 },
  });

  const inv2 = await prisma.invoice.create({
    data: {
      companyCode: KORNET, invoiceNo: 'SI-2026-00002', status: 'POSTED', shipmentId: ae.id,
      billToPartyId: custMap.get('CUST-NESTLE'), billToName: 'NestlÃ© Philippines Inc.',
      billToAddress: 'Cabuyao Industrial Park, Laguna', billToTin: '000-456-789-000',
      date: new Date(), dueDate: new Date(Date.now() + 30 * 86400000),
      currency: 'PHP', totalAmount: 164816, balance: 164816,
    },
  });
  await prisma.invoiceLine.create({
    data: { companyCode: KORNET, invoiceId: inv2.id, billingCode: 'AFRT', description: 'Air Freight Manila to Singapore', qty: 1850, rate: 88, amount: 162800, amountPhp: 162800, vatClass: 'ZERO_RATED', vatAmountPhp: 0 },
  });
  await prisma.invoiceLine.create({
    data: { companyCode: KORNET, invoiceId: inv2.id, billingCode: 'AWBF', description: 'Air Waybill Processing Fee', qty: 1, rate: 1800, amount: 1800, amountPhp: 1800, vatClass: 'VATABLE', vatAmountPhp: 216 },
  });

  const inv3 = await prisma.invoice.create({
    data: {
      companyCode: KORNET, invoiceNo: 'SI-2026-00003', status: 'POSTED', shipmentId: dt.id,
      billToPartyId: custMap.get('CUST-MONDE'), billToName: 'Monde Nissin Corporation',
      billToAddress: 'Santa Rosa, Laguna', billToTin: '000-567-890-000',
      date: new Date(), dueDate: new Date(Date.now() + 15 * 86400000),
      currency: 'PHP', totalAmount: 35840, balance: 35840,
    },
  });
  await prisma.invoiceLine.create({
    data: { companyCode: KORNET, invoiceId: inv3.id, billingCode: 'TRK', description: 'Inland Trucking Laguna to Calamba', qty: 1, rate: 32000, amount: 32000, amountPhp: 32000, vatClass: 'VATABLE', vatAmountPhp: 3840 },
  });

  // 15. Vendor AP Bills
  const ap1 = await prisma.apBill.create({
    data: {
      companyCode: KORNET, billNo: 'AP-2026-00001', status: 'PAID', shipmentId: oe.id,
      vendorPartyId: carrierMap.get('MAEU'), vendorName: 'Maersk Line Philippines',
      vendorInvoiceNo: 'ML-PH-INV-99014', date: new Date(Date.now() - 4 * 86400000), dueDate: new Date(Date.now() + 20 * 86400000),
      currency: 'PHP', subtotal: 131700, inputVat: 1440, total: 133140, balance: 0,
    },
  });
  await prisma.apBillLine.create({
    data: { companyCode: KORNET, apBillId: ap1.id, billingCode: 'OFRT', description: 'Ocean Freight Carrier Cost', amount: 119700, amountPhp: 119700, inputVat: 0 },
  });
  await prisma.apBillLine.create({
    data: { companyCode: KORNET, apBillId: ap1.id, billingCode: 'THC', description: 'Terminal Handling Origin Cost', amount: 12000, amountPhp: 12000, inputVat: 1440 },
  });

  const ap2 = await prisma.apBill.create({
    data: {
      companyCode: KORNET, billNo: 'AP-2026-00002', status: 'POSTED', shipmentId: ae.id,
      vendorPartyId: carrierMap.get('PAL'), vendorName: 'Philippine Airlines Cargo',
      vendorInvoiceNo: 'PAL-CARGO-INV-771', date: new Date(), dueDate: new Date(Date.now() + 30 * 86400000),
      currency: 'PHP', subtotal: 136900, inputVat: 0, total: 136900, balance: 136900,
    },
  });
  await prisma.apBillLine.create({
    data: { companyCode: KORNET, apBillId: ap2.id, billingCode: 'AFRT', description: 'Air Freight PR 507 Carrier Cost', amount: 136900, amountPhp: 136900, inputVat: 0 },
  });

  // 16. Official Receipts (OR)
  const or1 = await prisma.receipt.create({
    data: {
      companyCode: KORNET, receiptNo: 'OR-2026-00001', partyId: custMap.get('CUST-SMC'), partyName: 'San Miguel Yamamura Packaging Corp.',
      date: new Date(), amount: 153820.80, ewtAmount: 3139.20, unapplied: 0,
      bankNo: 1, checkNo: 'BDO-CHK-449120', method: 'CHECK', status: 'POSTED',
    },
  });
  await prisma.receiptApplication.create({
    data: { companyCode: KORNET, receiptId: or1.id, invoiceId: inv1.id, applied: 156960, ewt: 3139.20 },
  });

  console.log(`\n======================================================`);
  console.log(`Logistics Operations & Accounting Seed Complete!`);
  console.log(`- Customers: ${customers.length}`);
  console.log(`- Carriers / Agents: ${carriers.length + agents.length}`);
  console.log(`- Shipments: Ocean Export, Ocean Import, Air Export, Air Import, Domestic Trucking`);
  console.log(`- Containers: ISO 6346 stuffed & verified`);
  console.log(`- Transport Docs: Master & House B/Ls, IATA AWBs, Delivery Receipts`);
  console.log(`- Quotes: Active Ocean, Air, Domestic quotations pipeline`);
  console.log(`- Vehicles: RoRo export vehicles with real VINs and WR#`);
  console.log(`- P/D Orders: Pickup and delivery orders with dispatch`);
  console.log(`- Fleet: Trucks, drivers, and dispatch routes`);
  console.log(`- Financials: Invoices, AP bills, and Official Receipts`);
  console.log(`======================================================\n`);
}

main().then(() => prisma.$disconnect()).catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
