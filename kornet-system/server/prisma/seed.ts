import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { env } from '../src/env.js';

const prisma = new PrismaClient();
const KORNET = 'KORNET';

const ports = [
  ['PHMNL', 'PHMNL', 'Manila', 'PH', 'SEA', null], ['PHMNS', 'PHMNL', 'Manila South Harbor', 'PH', 'SEA', null], ['PHMNN', 'PHMNL', 'Manila North Harbor', 'PH', 'SEA', null],
  ['PHCEB', 'PHCEB', 'Cebu', 'PH', 'SEA', null], ['PHDVO', 'PHDVO', 'Davao', 'PH', 'SEA', null], ['PHBTG', 'PHBTG', 'Batangas', 'PH', 'SEA', null], ['PHSFS', 'PHSFS', 'Subic Bay', 'PH', 'SEA', null],
  ['PHCGY', 'PHCGY', 'Cagayan de Oro', 'PH', 'SEA', null], ['PHILO', 'PHILO', 'Iloilo', 'PH', 'SEA', null], ['PHGES', 'PHGES', 'General Santos', 'PH', 'SEA', null], ['PHZAM', 'PHZAM', 'Zamboanga', 'PH', 'SEA', null], ['PHTAG', 'PHTAG', 'Tagbilaran', 'PH', 'SEA', null],
  ['CNSHA', 'CNSHA', 'Shanghai', 'CN', 'SEA', null], ['SGSIN', 'SGSIN', 'Singapore', 'SG', 'SEA', null], ['HKHKG', 'HKHKG', 'Hong Kong', 'HK', 'SEA', null], ['JPTYO', 'JPTYO', 'Tokyo', 'JP', 'SEA', null], ['KRPUS', 'KRPUS', 'Busan', 'KR', 'SEA', null],
  ['USLAX', 'USLAX', 'Los Angeles', 'US', 'SEA', null], ['USLGB', 'USLGB', 'Long Beach', 'US', 'SEA', null], ['AEJEA', 'AEJEA', 'Jebel Ali', 'AE', 'SEA', null], ['NLRTM', 'NLRTM', 'Rotterdam', 'NL', 'SEA', null], ['DEHAM', 'DEHAM', 'Hamburg', 'DE', 'SEA', null],
  ['MNL', null, 'Ninoy Aquino International Airport', 'PH', 'AIR', 'MNL'], ['CEB', null, 'Mactan-Cebu International Airport', 'PH', 'AIR', 'CEB'], ['DVO', null, 'Francisco Bangoy International Airport', 'PH', 'AIR', 'DVO'], ['CRK', null, 'Clark International Airport', 'PH', 'AIR', 'CRK'], ['ILO', null, 'Iloilo International Airport', 'PH', 'AIR', 'ILO'],
  ['HKG', null, 'Hong Kong International Airport', 'HK', 'AIR', 'HKG'], ['SIN', null, 'Singapore Changi Airport', 'SG', 'AIR', 'SIN'], ['NRT', null, 'Narita International Airport', 'JP', 'AIR', 'NRT'], ['ICN', null, 'Incheon International Airport', 'KR', 'AIR', 'ICN'], ['LAX', null, 'Los Angeles International Airport', 'US', 'AIR', 'LAX'], ['DXB', null, 'Dubai International Airport', 'AE', 'AIR', 'DXB'],
] as const;

const carriers = [
  ['MAEU', 'Maersk', 'MAEU', null], ['MSCU', 'Mediterranean Shipping Company (MSC)', 'MSCU', null], ['CMDU', 'CMA CGM', 'CMDU', null], ['COSU', 'COSCO Shipping Lines', 'COSU', null], ['EGLV', 'Evergreen Line', 'EGLV', null], ['ONEY', 'Ocean Network Express (ONE)', 'ONEY', null], ['HLCU', 'Hapag-Lloyd', 'HLCU', null], ['WHLC', 'Wan Hai Lines', 'WHLC', null],
  ['PAL', 'Philippine Airlines', null, '079'], ['CEB', 'Cebu Pacific Air', null, '203'], ['CPA', 'Cathay Pacific', null, '160'], ['SIA', 'Singapore Airlines', null, '618'], ['UAE', 'Emirates', null, '176'], ['KAL', 'Korean Air', null, '180'],
] as const;

const billing = [
  ['OFRT','Ocean Freight','FREIGHT','OCEAN','PER_WM','ZERO_RATED','4210','4510'], ['AFRT','Air Freight','FREIGHT','AIR','PER_KG','ZERO_RATED','4211','4511'], ['FSC','Fuel Surcharge','FREIGHT','OCEAN,AIR','PER_SHPT','ZERO_RATED','4210','4510'], ['BAF','Bunker Adjustment Factor','FREIGHT','OCEAN','PER_CNTR','ZERO_RATED','4210','4510'], ['CAF','Currency Adjustment Factor','FREIGHT','OCEAN','PCT','ZERO_RATED','4210','4510'],
  ['THC','Terminal Handling Charge','ORIGIN','OCEAN','PER_CNTR','VATABLE','4215','4515'], ['DOC','Documentation Fee','DOCS','OCEAN,AIR','PER_FILE','VATABLE','4215','4515'], ['BLF','Bill of Lading Fee','DOCS','OCEAN','PER_BL','VATABLE','4215','4515'], ['AWBF','Air Waybill Fee','DOCS','AIR','PER_AWB','VATABLE','4215','4515'], ['SEC','Security Surcharge','ORIGIN','AIR','PER_KG','VATABLE','4215','4515'], ['CFS','Container Freight Station','WAREHOUSE','OCEAN','PER_CBM','VATABLE','4214','4514'],
  ['ARR','Arrastre','REIMBURSABLE','OCEAN','MANUAL','NON_VAT_REIMBURSABLE','1130','1130'], ['WHF','Wharfage','REIMBURSABLE','OCEAN','MANUAL','NON_VAT_REIMBURSABLE','1130','1130'], ['DUT','Duties and Taxes','REIMBURSABLE','OCEAN,AIR','MANUAL','NON_VAT_REIMBURSABLE','1130','1130'],
  ['BRK','Brokerage Fee','CUSTOMS','OCEAN,AIR','PER_SHPT','VATABLE','4212','4512'], ['TRK','Trucking','TRUCKING','DOMESTIC,OCEAN,AIR,PD','PER_SHPT','VATABLE','4213','4513'], ['PUP','Pickup','TRUCKING','PD','PER_SHPT','VATABLE','4213','4513'], ['DEL','Delivery','TRUCKING','PD','PER_SHPT','VATABLE','4213','4513'], ['STO','Storage','WAREHOUSE','OCEAN,AIR,VEHICLE','PER_CBM','VATABLE','4214','4514'], ['HDL','Handling','OTHER','OCEAN,AIR,VEHICLE','PER_SHPT','VATABLE','4215','4515'], ['INS','Insurance','INSURANCE','OCEAN,AIR','PCT','VATABLE','4215','4515'], ['DEM','Demurrage','OTHER','OCEAN','PER_CNTR','VATABLE','4215','4515'], ['DET','Detention','OTHER','OCEAN','PER_CNTR','VATABLE','4215','4515'], ['VHD','Vehicle Handling','OTHER','VEHICLE','PER_UNIT','VATABLE','4216','4515'],
] as const;

const settings: Record<string, unknown> = {
  marginThresholdPct: 15,
  defaultCurrency: 'PHP',
  vatRate: 12,
  glDefaults: { arTrade: '1123', apTrade: '2112', cashDefault: '1110', outputVat: '2122', inputVat: '1142', ewtReceivable: '1128', ewtPayable: '2166', advancesToClients: '1130', customerDeposits: '2117', fxGainLoss: '4303', revenueDefault: '4215', costDefault: '4515' },
  bankAccounts: { '0': '1110', '1': '1110' },
  withholdOnVendors: true,
};

async function main() {
  await prisma.company.upsert({ where: { code: KORNET }, update: { name: 'Kornet Express Inc.', legalName: 'Kornet Express Inc.', active: true }, create: { code: KORNET, name: 'Kornet Express Inc.', legalName: 'Kornet Express Inc.', active: true } });
  const passwordHash = await bcrypt.hash(env.seed.adminPassword, 10);
  await prisma.user.upsert({ where: { username: env.seed.adminUsername }, update: { role: 'superadmin', canAccessFs: true, active: true }, create: { username: env.seed.adminUsername, passwordHash, fullName: 'System Administrator', role: 'superadmin', active: true, canAccessFs: true, companies: JSON.stringify([]) } });

  for (const [code, unlocode, name, country, kind, iata] of ports) {
    await prisma.port.upsert({ where: { companyCode_code: { companyCode: KORNET, code } }, update: { unlocode, name, country, kind, type: kind.toLowerCase(), iata }, create: { companyCode: KORNET, code, unlocode, name, country, kind, type: kind.toLowerCase(), iata } });
  }
  for (const [code, name, scac, iataCode] of carriers) {
    await prisma.party.upsert({ where: { companyCode_code: { companyCode: KORNET, code } }, update: { name, isCarrier: true, isVendor: true, scac, iataCode, active: true }, create: { companyCode: KORNET, code, name, isCarrier: true, isVendor: true, scac, iataCode, active: true } });
    await prisma.carrier.create({ data: { companyCode: KORNET, name, scac: scac ?? iataCode ?? undefined, mode: scac ? 'ocean' : 'air' } }).catch(() => undefined);
  }
  for (const [code, description, category, modes, defaultUnit, vatClass, revenueAccount, costAccount] of billing) {
    await prisma.billingCode.upsert({ where: { companyCode_code: { companyCode: KORNET, code } }, update: { description, category, modes, defaultUnit, vatClass, revenueAccount, costAccount, glAccount: revenueAccount, taxable: vatClass === 'VATABLE', active: true }, create: { companyCode: KORNET, code, description, category, modes, defaultUnit, vatClass, revenueAccount, costAccount, glAccount: revenueAccount, taxable: vatClass === 'VATABLE', active: true } });
  }
  for (const [key, value] of Object.entries(settings)) {
    await prisma.companySetting.upsert({ where: { companyCode_key: { companyCode: KORNET, key } }, update: { value: JSON.stringify(value) }, create: { companyCode: KORNET, key, value: JSON.stringify(value) } });
  }
  for (const it of [{ key: 'barcode-scanner', name: 'Barcode / QR Scanner', category: 'hardware' }, { key: 'signature-pad', name: 'POD Signature Capture', category: 'hardware' }, { key: 'label-printer', name: 'Label / Waybill Printer', category: 'printing' }, { key: 'boc-e2m', name: 'Bureau of Customs e2m', category: 'government' }, { key: 'carrier-api', name: 'Carrier Tracking API', category: 'carrier' }]) {
    await prisma.integration.upsert({ where: { companyCode_key: { companyCode: KORNET, key: it.key } }, update: {}, create: { companyCode: KORNET, ...it } });
  }
  console.log(`Seed complete. Admin: ${env.seed.adminUsername} / ${env.seed.adminPassword}`);
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
