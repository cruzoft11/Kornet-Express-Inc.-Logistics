import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const KORNET = 'KORNET';

// ── New billing codes to add (CIF/CIP and DDU charges) ──────────────────────
const newCodes = [
  ['TOF',   'Turn-Over Fee (CIF/CIP)',           'OTHER',     'OCEAN,AIR', 'PER_SHPT', 'VATABLE',              '4215', '4515'],
  ['CSTO',  'Storage Charges (CIF)',              'WAREHOUSE', 'OCEAN,AIR', 'PER_CBM',  'VATABLE',              '4214', '4514'],
  ['CCTF',  'Cargo Transfer Fee (CIF)',            'OTHER',     'OCEAN,AIR', 'MANUAL',   'VATABLE',              '4215', '4515'],
  ['CICF',  'Import Cargo Fee (CIF)',              'CUSTOMS',   'OCEAN,AIR', 'MANUAL',   'VATABLE',              '4212', '4512'],
  ['CIPF',  'Import Permit Fee (CIF)',             'CUSTOMS',   'OCEAN,AIR', 'MANUAL',   'NON_VAT_REIMBURSABLE', '1130', '1130'],
  ['CIPL',  'IP Lodgement Fee (CIF)',              'CUSTOMS',   'OCEAN,AIR', 'MANUAL',   'VATABLE',              '4212', '4512'],
  ['CIPTP', 'PTOPS Fee (CIF)',                     'CUSTOMS',   'OCEAN,AIR', 'MANUAL',   'VATABLE',              '4212', '4512'],
  ['CLOD',  'Lodgement Fee (CIF)',                 'DOCS',      'OCEAN,AIR', 'PER_FILE', 'VATABLE',              '4215', '4515'],
  ['DSTO',  'Storage Charges (DDU)',               'WAREHOUSE', 'OCEAN,AIR', 'PER_CBM',  'VATABLE',              '4214', '4514'],
  ['DCTF',  'Cargo Transfer Fee (DDU)',             'OTHER',     'OCEAN,AIR', 'MANUAL',   'VATABLE',              '4215', '4515'],
  ['DICF',  'Import Cargo Fee (DDU)',               'CUSTOMS',   'OCEAN,AIR', 'MANUAL',   'VATABLE',              '4212', '4512'],
  ['DIPF',  'Import Permit Fee (DDU)',              'CUSTOMS',   'OCEAN,AIR', 'MANUAL',   'NON_VAT_REIMBURSABLE', '1130', '1130'],
  ['DIPL',  'IP Lodgement Fee (DDU)',               'CUSTOMS',   'OCEAN,AIR', 'MANUAL',   'VATABLE',              '4212', '4512'],
  ['DPTOP', 'PTOPS Fee (DDU)',                      'CUSTOMS',   'OCEAN,AIR', 'MANUAL',   'VATABLE',              '4212', '4512'],
  ['DTRK',  'Trucking (DDU)',                       'TRUCKING',  'OCEAN,AIR', 'PER_SHPT', 'VATABLE',              '4213', '4513'],
  ['DBBK',  'Breakbulk Fee (DDU)',                  'OTHER',     'OCEAN,AIR', 'MANUAL',   'VATABLE',              '4215', '4515'],
  ['DLOD',  'Lodgement Fee (DDU)',                  'DOCS',      'OCEAN,AIR', 'PER_FILE', 'VATABLE',              '4215', '4515'],
];

// ── Airlines from Import Airline Warehouses Excel ────────────────────────────
const newAirlines = [
  ['CA','Air China Cargo','CA'],['LD','Air Hong Kong (AHK/ASL Airlines)','LD'],
  ['NH','ANA Cargo / All Nippon Cargo','NH'],['SJ','Cebu Pacific Cargo','SJ'],
  ['CI','China Airlines Cargo','297'],['MU','China Eastern Cargo','MU'],
  ['CZ','China Southern Cargo','CZ'],['DL','Delta Cargo','DL'],
  ['EK','Emirates SkyCargo','176'],['ET','Ethiopian Airlines Cargo','ET'],
  ['EY','Etihad Cargo','EY'],['BR','EVA Air Cargo','BR'],
  ['GF','Gulf Air Cargo','GF'],['RH','Hong Kong Air Cargo (HKAC)','RH'],
  ['HX','Hong Kong Airlines Cargo','HX'],['JL','Japan Airlines Cargo (JAL)','131'],
  ['3K','Jetstar Asia Cargo','3K'],['WY','Oman Air Cargo','WY'],
  ['QF','Qantas Freight','QF'],['QR','Qatar Airways Cargo','QR'],
  ['BI','Royal Brunei Airlines Cargo','BI'],['JX','Starlux Airlines Cargo','JX'],
  ['TG','Thai Airways Cargo (THAI)','TG'],['TR','Tiger Air / Scoot Cargo','TR'],
  ['UA','United Airlines Cargo','UA'],['MF','Xiamen Air Cargo','MF'],
  ['YG','YTO Cargo Express','YG'],['JG','Jiangsu JD Cargo Airlines','JG'],
  ['3U','Sichuan Airlines Cargo','3U'],['VN','Vietnam Airlines Cargo','VN'],
  ['TK','Turkish Airlines Cargo','TK'],['AF','Air France-KLM Cargo','AF'],
  ['OZ','Asiana Cargo Airlines','OZ'],['MH','Malaysia Airlines Cargo (MASkargo)','MH'],
  ['KL','KLM Cargo / Royal Cargo','KL'],['SR','Skyway / Suparna Airlines Cargo','SR'],
  ['PX','Air Niugini Cargo','PX'],['ZZ','Air Asia Cargo (AirAsia X)','ZZ'],
  ['AK','Air Asia Cargo (AK)','AK'],['GM','Tri-MG Intra Asia Airlines','GM'],
  ['7C','Jeju Air Cargo','7C'],['2Y','My Indo Airlines','2Y'],
  ['GI','Longhao Airlines','GI'],['ZH','Shenzhen Airlines Cargo','ZH'],
  ['NT','My Jet Express','NT'],['HT','Tianjin Airlines Cargo','HT'],
  ['8Y','Pan Pacific Airlines','8Y'],['RW','Royal Air Philippines','RW'],
  ['O3','SF Airlines','O3'],['KJ','Air Incheon Cargo','KJ'],
  ['AC','Air Canada Cargo','AC'],['KU','Kuwait Airways Cargo','KU'],
  ['SV','Saudia Cargo','SV'],['VJ','Vietjet Air Cargo','VJ'],
  ['WW','MUETS Cargo','WW'],['CF','China Postal Airlines','CF'],
  ['3G','World Cargo Airlines','3G'],['IB','China Central Airlines','IB'],
];

let bcAdded = 0, bcSkipped = 0, airAdded = 0, airSkipped = 0;

// Add billing codes
for (const [code, description, category, modes, defaultUnit, vatClass, revenueAccount, costAccount] of newCodes) {
  const exists = await prisma.billingCode.findUnique({ where: { companyCode_code: { companyCode: KORNET, code } } });
  if (!exists) {
    await prisma.billingCode.create({ data: { companyCode: KORNET, code, description, category, modes, defaultUnit, vatClass, revenueAccount, costAccount, glAccount: revenueAccount, taxable: vatClass === 'VATABLE', active: true } });
    bcAdded++;
  } else { bcSkipped++; }
}

// Add airlines as Party (carrier) + Carrier record
for (const [iataCode, name, prefix] of newAirlines) {
  const code = 'AIR-' + iataCode;
  const existsParty = await prisma.party.findFirst({ where: { companyCode: KORNET, OR: [{ code }, { iataCode }] } });
  if (!existsParty) {
    await prisma.party.create({ data: { companyCode: KORNET, code, name, isCarrier: true, isVendor: true, iataCode, active: true } });
    airAdded++;
  } else { airSkipped++; }
  // Also upsert into Carrier table
  const existsCarrier = await prisma.carrier.findFirst({ where: { companyCode: KORNET, name } });
  if (!existsCarrier) {
    await prisma.carrier.create({ data: { companyCode: KORNET, name, scac: iataCode, mode: 'air' } }).catch(() => undefined);
  }
}

console.log(`Billing codes: +${bcAdded} added, ${bcSkipped} already existed`);
console.log(`Airlines: +${airAdded} added, ${airSkipped} already existed`);

await prisma.$disconnect();
