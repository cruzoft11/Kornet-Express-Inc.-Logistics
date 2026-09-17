import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { env } from '../src/env.js';

const prisma = new PrismaClient();

const KORNET = 'KORNET';

// Real Kornet Express Inc. profile (established 2000, Parañaque City, Philippines).
const companies: Array<{
  code: string;
  name: string;
  legalName?: string;
  address?: string;
  phone?: string;
  email?: string;
  branch?: string;
}> = [
  {
    code: KORNET,
    name: 'Kornet Express Freight & Logistics',
    legalName: 'Kornet Express, Inc.',
    address: 'JJM Building, No. 5 Ninoy Aquino Avenue, Brgy. San Dionisio, Parañaque City, Metro Manila, Philippines',
    phone: '+63 2 8826 0012 to 14',
    email: 'cs.impex@kornet.com.ph',
    branch: 'Head Office',
  },
  { code: 'cyberfridge', name: 'CYBERFRIDGE GENERAL SERVICES INC' },
  { code: 'johntrix', name: 'JOHNTRIX TECHNICAL SERVICES INC.' },
  { code: 'thermalex', name: 'THERMALEX GENERAL SERVICES INC' },
  { code: 'gmixteam', name: 'GMIXTEAM GENERAL SERVICES INC' },
  { code: 'dynamiq', name: 'DYNAMIQ CIRQUE GENERAL SERVICES INC' },
  { code: 'metaleon', name: 'METALEON GENERAL SERVICES INC' },
  { code: '3jcrt', name: '3JCRT GENERAL SERVICES INC' },
  { code: 'gian', name: 'GIAN GENERAL SERVICES INC' },
  { code: 'jimi', name: 'JIMI GENERAL SERVICES INC' },
  { code: 'lmjay', name: 'LMJAY GENERAL SERVICES INC' },
  { code: 'jemt', name: 'JEMT GENERAL SERVICES INC' },
  { code: 'jasc', name: 'JASC GENERAL SERVICES INC' },
  { code: 'rcmi', name: 'RCMI GENERAL SERVICES INC' },
  { code: 'kote', name: 'KOTE GENERAL SERVICES INC' },
  { code: 'magrofil', name: 'Magrofil Industrial Services' },
];

const ports = [
  { code: 'MNLN', name: 'Manila North Harbor', country: 'PH', type: 'sea' },
  { code: 'MNLS', name: 'Manila South Harbor', country: 'PH', type: 'sea' },
  { code: 'MICT', name: 'Manila International Container Terminal', country: 'PH', type: 'sea' },
  { code: 'BTG', name: 'Batangas International Port', country: 'PH', type: 'sea' },
  { code: 'SUB', name: 'Subic Bay Freeport', country: 'PH', type: 'sea' },
  { code: 'CEB', name: 'Port of Cebu', country: 'PH', type: 'sea' },
  { code: 'CDO', name: 'Port of Cagayan de Oro', country: 'PH', type: 'sea' },
  { code: 'DVO', name: 'Sasa Wharf, Davao', country: 'PH', type: 'sea' },
  { code: 'ILO', name: 'Port of Iloilo', country: 'PH', type: 'sea' },
  { code: 'GES', name: 'Makar Wharf, General Santos', country: 'PH', type: 'sea' },
  { code: 'MNL', name: 'Ninoy Aquino Intl Airport (NAIA)', country: 'PH', type: 'air' },
  { code: 'CRK', name: 'Clark International Airport', country: 'PH', type: 'air' },
  { code: 'HKG', name: 'Port of Hong Kong', country: 'HK', type: 'sea' },
  { code: 'SIN', name: 'Port of Singapore', country: 'SG', type: 'sea' },
  { code: 'KHH', name: 'Port of Kaohsiung', country: 'TW', type: 'sea' },
  { code: 'SGN', name: 'Port of Ho Chi Minh (Cat Lai)', country: 'VN', type: 'sea' },
  { code: 'HPH', name: 'Port of Hai Phong', country: 'VN', type: 'sea' },
  { code: 'NGB', name: 'Port of Ningbo', country: 'CN', type: 'sea' },
  { code: 'SHA', name: 'Port of Shanghai', country: 'CN', type: 'sea' },
  { code: 'LAX', name: 'Port of Los Angeles', country: 'US', type: 'sea' },
];

const carriers = [
  { name: 'Maersk Line', scac: 'MAEU', mode: 'ocean' },
  { name: 'MSC', scac: 'MSCU', mode: 'ocean' },
  { name: 'CMA CGM', scac: 'CMDU', mode: 'ocean' },
  { name: 'Evergreen Line', scac: 'EGLV', mode: 'ocean' },
  { name: 'COSCO Shipping', scac: 'COSU', mode: 'ocean' },
  { name: 'OOCL', scac: 'OOLU', mode: 'ocean' },
  { name: 'Wan Hai Lines', scac: 'WHLC', mode: 'ocean' },
  { name: 'PIL (Pacific Intl Lines)', scac: 'PABV', mode: 'ocean' },
  { name: '2GO Freight', scac: '', mode: 'ocean' },
  { name: 'Philippine Airlines Cargo', scac: 'PR', mode: 'air' },
  { name: 'Cebu Pacific Cargo', scac: '5J', mode: 'air' },
  { name: 'Cathay Cargo', scac: 'CX', mode: 'air' },
  { name: 'Singapore Airlines Cargo', scac: 'SQ', mode: 'air' },
  { name: 'Kornet Express Trucking', scac: '', mode: 'land' },
];

const billingCodes = [
  { code: 'OFR', description: 'Ocean Freight', glAccount: '4010', defaultRate: 0, taxable: true },
  { code: 'AFR', description: 'Air Freight', glAccount: '4011', defaultRate: 0, taxable: true },
  { code: 'THC', description: 'Terminal Handling Charge', glAccount: '4020', defaultRate: 0, taxable: true },
  { code: 'DOC', description: 'Documentation Fee', glAccount: '4030', defaultRate: 1500, taxable: true },
  { code: 'BRK', description: 'Customs Brokerage Fee', glAccount: '4040', defaultRate: 0, taxable: true },
  { code: 'ARR', description: 'Arrastre Charge', glAccount: '4050', defaultRate: 0, taxable: true },
  { code: 'WHF', description: 'Wharfage', glAccount: '4051', defaultRate: 0, taxable: true },
  { code: 'TRK', description: 'Trucking / Delivery', glAccount: '4060', defaultRate: 0, taxable: true },
  { code: 'HND', description: 'Handling Fee', glAccount: '4070', defaultRate: 0, taxable: true },
  { code: 'STG', description: 'Storage / Warehousing', glAccount: '4080', defaultRate: 0, taxable: true },
  { code: 'INS', description: 'Cargo Insurance', glAccount: '4090', defaultRate: 0, taxable: false },
  { code: 'DEM', description: 'Demurrage / Detention', glAccount: '4091', defaultRate: 0, taxable: true },
];

const integrations = [
  { key: 'barcode-scanner', name: 'Barcode / QR Scanner', category: 'hardware' },
  { key: 'signature-pad', name: 'POD Signature Capture', category: 'hardware' },
  { key: 'label-printer', name: 'Label / Waybill Printer', category: 'printing' },
  { key: 'boc-e2m', name: 'Bureau of Customs e2m', category: 'government' },
  { key: 'carrier-api', name: 'Carrier Tracking API', category: 'carrier' },
];

async function main() {
  // Companies
  for (const c of companies) {
    await prisma.company.upsert({
      where: { code: c.code },
      update: {
        name: c.name,
        legalName: c.legalName ?? null,
        address: c.address ?? null,
        phone: c.phone ?? null,
        email: c.email ?? null,
        branch: c.branch ?? null,
      },
      create: {
        code: c.code,
        name: c.name,
        legalName: c.legalName ?? null,
        address: c.address ?? null,
        phone: c.phone ?? null,
        email: c.email ?? null,
        branch: c.branch ?? null,
      },
    });
  }

  // Admin user (all-company access)
  const passwordHash = await bcrypt.hash(env.seed.adminPassword, 10);
  await prisma.user.upsert({
    where: { username: env.seed.adminUsername },
    update: {},
    create: {
      username: env.seed.adminUsername,
      passwordHash,
      fullName: 'System Administrator',
      email: 'cs.impex@kornet.com.ph',
      role: 'superadmin',
      active: true,
      canAccessFs: true,
      companies: JSON.stringify([]),
    },
  });

  // Reference directories for KORNET — only if empty (avoid clobbering edits)
  if ((await prisma.port.count({ where: { companyCode: KORNET } })) === 0) {
    await prisma.port.createMany({ data: ports.map((p) => ({ ...p, companyCode: KORNET })) });
  }
  if ((await prisma.carrier.count({ where: { companyCode: KORNET } })) === 0) {
    await prisma.carrier.createMany({ data: carriers.map((c) => ({ ...c, companyCode: KORNET })) });
  }
  if ((await prisma.billingCode.count({ where: { companyCode: KORNET } })) === 0) {
    await prisma.billingCode.createMany({
      data: billingCodes.map((b) => ({ ...b, companyCode: KORNET })),
    });
  }
  if ((await prisma.driver.count({ where: { companyCode: KORNET } })) === 0) {
    await prisma.driver.createMany({
      data: [
        { companyCode: KORNET, name: 'Eduardo Santos', licenseNo: 'N01-12-889021', phone: '+63 917 555 1021', plateHint: 'NCL-8921', status: 'Available' },
        { companyCode: KORNET, name: 'Danilo Ramos', licenseNo: 'C03-09-441092', phone: '+63 920 888 3491', plateHint: 'CBA-4492', status: 'Available' },
        { companyCode: KORNET, name: 'Rodrigo Mendoza', licenseNo: 'B02-14-663910', phone: '+63 918 222 7109', plateHint: 'NAA-1102', status: 'Available' },
        { companyCode: KORNET, name: 'Vicente Dela Cruz', licenseNo: 'G07-16-552199', phone: '+63 929 444 8210', plateHint: 'GAL-9901', status: 'Available' },
        { companyCode: KORNET, name: 'Arnel Bautista', licenseNo: 'L11-18-771203', phone: '+63 919 777 5543', plateHint: 'LAA-3320', status: 'Available' },
        { companyCode: KORNET, name: 'Nestor Magpantay', licenseNo: 'K10-15-339011', phone: '+63 928 333 9811', plateHint: 'KAB-6120', status: 'Available' },
      ],
    });
  }
  if ((await prisma.fleetVehicle.count({ where: { companyCode: KORNET } })) === 0) {
    await prisma.fleetVehicle.createMany({
      data: [
        { companyCode: KORNET, plateNo: 'NCL-8921', type: '10-Wheeler Wing Van', make: 'Isuzu Giga 6UZ1', capacity: '15000 kg / 58 cbm', status: 'Available' },
        { companyCode: KORNET, plateNo: 'CBA-4492', type: '40ft Container Chassis', make: 'Hino 700 Prime Mover', capacity: '28000 kg / 76 cbm', status: 'Available' },
        { companyCode: KORNET, plateNo: 'NAA-1102', type: 'Reefer Truck', make: 'Mitsubishi Fuso Fighter', capacity: '8500 kg / 32 cbm', status: 'Available' },
        { companyCode: KORNET, plateNo: 'GAL-9901', type: '4-Wheeler Closed Van', make: 'Isuzu Elf NPR', capacity: '4200 kg / 18 cbm', status: 'Available' },
        { companyCode: KORNET, plateNo: 'LAA-3320', type: '10-Wheeler Wing Van', make: 'UD Trucks Quester', capacity: '16000 kg / 60 cbm', status: 'Available' },
        { companyCode: KORNET, plateNo: 'KAB-6120', type: '40ft Container Chassis', make: 'Isuzu EXR Heavy Tractor', capacity: '30000 kg / 76 cbm', status: 'Available' },
      ],
    });
  }
  for (const it of integrations) {
    await prisma.integration.upsert({
      where: { companyCode_key: { companyCode: KORNET, key: it.key } },
      update: {},
      create: { companyCode: KORNET, key: it.key, name: it.name, category: it.category },
    });
  }

  // eslint-disable-next-line no-console
  console.log(
    `Seed complete. Admin: ${env.seed.adminUsername} / ${env.seed.adminPassword}  (change after first login)`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
