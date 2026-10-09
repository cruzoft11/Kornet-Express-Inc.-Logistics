import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'node:path';
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { env } from './env.js';
import apiRoutes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { initializeTrackingProviders } from './services/trackingProviders.js';
import { prisma } from './db.js';
import { hashPassword } from './lib/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Production first-boot: ensure DB exists and is migrated ──────────────────
if (process.env.NODE_ENV === 'production' || process.env.WEBSITE_SITE_NAME) {
  const serverRoot = [
    path.resolve(__dirname, '..'),
    path.resolve(__dirname, '../..'),
  ].find((candidate) => fs.existsSync(path.join(candidate, 'prisma', 'schema.prisma')))
    ?? path.resolve(__dirname, '..');
  console.log('[boot] Backing up and preparing the existing SQLite database.');
  execSync('node scripts/prepare-production-db.mjs', {
    cwd: serverRoot,
    stdio: 'inherit',
    env: { ...process.env },
  });
  console.log('[boot] Applying only data-preserving Prisma schema changes.');
  execSync('npx prisma db push --schema prisma/schema.prisma --skip-generate', {
    cwd: serverRoot,
    stdio: 'inherit',
    env: { ...process.env },
  });
}

const app = express();
initializeTrackingProviders();

app.disable('x-powered-by');
app.use(helmet());
app.use(
  cors({
    origin: env.corsOrigins.length ? env.corsOrigins : false,
    credentials: true,
  }),
);
app.use(express.json({ limit: env.jsonBodyLimit }));
app.use(express.urlencoded({ extended: true }));
if (env.isDev) app.use(morgan('dev'));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'kornet-express-api', time: new Date().toISOString() });
});

// ── Admin seed endpoint — outside /api to bypass auth middleware ──
app.post('/internal-seed', async (_req, res) => {
  try {
    await prisma.company.upsert({
      where: { code: 'KORNET' },
      update: {},
      create: { code: 'KORNET', name: 'Kornet Express Inc.', legalName: 'Kornet Express, Inc.', address: 'Unit 801, Ermita, Manila, Philippines', active: true },
    });
    const passwordHash = await hashPassword(env.seed.adminPassword);
    await prisma.user.upsert({
      where: { username: env.seed.adminUsername },
      update: { passwordHash, active: true, role: 'superadmin', canAccessFs: true },
      create: { username: env.seed.adminUsername, passwordHash, fullName: 'System Administrator', role: 'superadmin', active: true, canAccessFs: true },
    });
    res.json({ ok: true, username: env.seed.adminUsername });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

app.use('/api', apiRoutes);

// Serve the built SPA in production
const clientDistCandidates = [
  path.resolve(__dirname, '../../dist'),
  path.resolve(__dirname, '../dist'),
  path.resolve(process.cwd(), 'dist'),
  path.resolve(process.cwd(), 'kornet-system/dist'),
];
const clientDist = clientDistCandidates.find((d) => fs.existsSync(path.join(d, 'index.html')));

if (clientDist) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    // Let API routes and seed endpoint pass through
    if (req.path.startsWith('/api') || req.path === '/internal-seed') return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

// ── Seed helpers ──────────────────────────────────────────────────────────────
const KORNET = 'KORNET';

async function ensureAdminUser() {
  await prisma.company.upsert({
    where: { code: KORNET },
    update: {},
    create: { code: KORNET, name: 'Kornet Express Inc.', legalName: 'Kornet Express, Inc.', address: 'Unit 801, Ermita, Manila, Philippines', active: true },
  });
  const passwordHash = await hashPassword(env.seed.adminPassword);
  // Always update passwordHash so corrupted records get fixed
  await prisma.user.upsert({
    where: { username: env.seed.adminUsername },
    update: { passwordHash, active: true, role: 'superadmin', canAccessFs: true },
    create: { username: env.seed.adminUsername, passwordHash, fullName: 'System Administrator', role: 'superadmin', active: true, canAccessFs: true },
  });
  console.log(`[seed] Admin ready — ${env.seed.adminUsername}`);
}

async function seedSampleShipments(adminId: string) {
  const now = new Date();
  const d = (days: number) => new Date(now.getTime() + days * 86400000);

  const billingLines = (items: { code: string; desc: string; qty: number; rate: number; vat: boolean }[]) =>
    JSON.stringify(items.map((i) => ({
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
      billingCode: i.code, description: i.desc,
      qty: i.qty, rate: i.rate,
      amount: i.qty * i.rate,
      vatClass: i.vat ? 'VATABLE' : 'ZERO_RATED',
      vatAmount: i.vat ? i.qty * i.rate * 0.12 : 0,
      total: i.qty * i.rate * (i.vat ? 1.12 : 1),
      currency: 'PHP', status: 'OPEN',
    })));

  const samples = [
    {
      fileNo: 'OE-2026-00001', mode: 'OCEAN', direction: 'EXPORT', status: 'IN_TRANSIT',
      bookingNo: 'BKG-MAEU-202604', blAwbNo: 'KNE-HBL-2026-0012',
      shipperName: 'San Miguel Yamamura Packaging Corp.', consigneeName: 'Pacific Forwarding Logistics LLC',
      originPort: 'PHMNL', destinationPort: 'USLAX', carrier: 'Maersk Line',
      vesselOrFlight: 'MAERSK MC-KINNEY MOLLER', voyageOrFlightNo: '2604E',
      etd: d(-3), eta: d(14), containerNo: 'MSKU7829104', containerType: '40HC',
      commodity: 'Glass Container Packaging', packages: 1200, grossWeightKg: 18500, volumeCbm: 48.5,
      incoterm: 'FOB', currency: 'PHP', remarks: 'Priority FCL shipment',
      billingLines: billingLines([
        { code: 'OFRT', desc: 'Ocean Freight MNL→LAX', qty: 2, rate: 68400, vat: false },
        { code: 'THC', desc: 'Terminal Handling Charge', qty: 2, rate: 7250, vat: true },
        { code: 'DOC', desc: 'Documentation Fee', qty: 1, rate: 3500, vat: true },
      ]),
    },
    {
      fileNo: 'OI-2026-00001', mode: 'OCEAN', direction: 'IMPORT', status: 'ARRIVED',
      bookingNo: 'EGLV-TYO-982144', blAwbNo: 'KNE-OIBL-2026-0005',
      shipperName: 'Nippon Cargo & Express KK', consigneeName: 'Toyota Motor Philippines Corp.',
      originPort: 'JPTYO', destinationPort: 'PHMNL', carrier: 'Evergreen Marine',
      vesselOrFlight: 'EVER GIVEN', voyageOrFlightNo: '0142W',
      etd: d(-10), eta: d(1), containerNo: 'EGLU9182341', containerType: '40HC',
      commodity: 'Automotive Transmission Assemblies', packages: 80, grossWeightKg: 22250, volumeCbm: 56,
      incoterm: 'FCA', currency: 'PHP',
      billingLines: billingLines([
        { code: 'THC', desc: 'Terminal Handling Charge Destination', qty: 1, rate: 8500, vat: true },
        { code: 'BRK', desc: 'Customs Clearance & Brokerage', qty: 1, rate: 12500, vat: true },
        { code: 'TRK', desc: 'Inland Trucking to Laguna Plant', qty: 1, rate: 18000, vat: true },
      ]),
    },
    {
      fileNo: 'AE-2026-00001', mode: 'AIR', direction: 'EXPORT', status: 'DEPARTED',
      bookingNo: 'PAL-BK-2026-0791', blAwbNo: '079-81234565',
      shipperName: 'Nestlé Philippines Inc.', consigneeName: 'Lion City Freight Logistics Pte Ltd',
      originPort: 'MNL', destinationPort: 'SIN', carrier: 'Philippine Airlines Cargo',
      vesselOrFlight: 'PR 507', voyageOrFlightNo: 'PR507',
      etd: d(0), eta: d(0), commodity: 'Nutritional Dairy Formula',
      packages: 45, grossWeightKg: 1850, chargeableWeight: 1850,
      incoterm: 'CIP', currency: 'PHP',
      billingLines: billingLines([
        { code: 'AFRT', desc: 'Air Freight MNL→SIN @ ₱88/kg', qty: 1850, rate: 88, vat: false },
        { code: 'AWBF', desc: 'Air Waybill Processing Fee', qty: 1, rate: 1800, vat: true },
        { code: 'SEC', desc: 'Security Surcharge', qty: 1850, rate: 8, vat: true },
      ]),
    },
    {
      fileNo: 'AI-2026-00001', mode: 'AIR', direction: 'IMPORT', status: 'CUSTOMS_CLEARED',
      bookingNo: 'CPA-HKG-90312', blAwbNo: '160-54128904',
      shipperName: 'Kowloon Air Express Ltd', consigneeName: 'Universal Robina Corporation',
      originPort: 'HKG', destinationPort: 'MNL', carrier: 'Cathay Pacific Cargo',
      vesselOrFlight: 'CX 903', voyageOrFlightNo: 'CX903',
      etd: d(-1), eta: d(-1), commodity: 'Precision Optical Sensors & Microchips',
      packages: 12, grossWeightKg: 620, chargeableWeight: 750,
      incoterm: 'CPT', currency: 'PHP',
      billingLines: billingLines([
        { code: 'BRK', desc: 'Customs Clearance Fee', qty: 1, rate: 8500, vat: true },
        { code: 'DOC', desc: 'Documentation & Filing Fee', qty: 1, rate: 2500, vat: true },
        { code: 'TRK', desc: 'Airport Delivery to Pasig', qty: 1, rate: 6500, vat: true },
      ]),
    },
    {
      fileNo: 'OE-2026-00002', mode: 'OCEAN', direction: 'EXPORT', status: 'BOOKING_CONFIRMED',
      bookingNo: 'BKG-CMDU-202605', blAwbNo: '',
      shipperName: 'Universal Robina Corporation', consigneeName: 'US Foods International LLC',
      originPort: 'PHMNL', destinationPort: 'USLGB', carrier: 'CMA CGM',
      vesselOrFlight: 'CMA CGM MARCO POLO', voyageOrFlightNo: '0310E',
      etd: d(7), eta: d(35), containerNo: 'CMAU4819023', containerType: '20GP',
      commodity: 'Jack n Jill Snacks & Confectionery', packages: 960, grossWeightKg: 14200, volumeCbm: 33.2,
      incoterm: 'CFR', currency: 'USD',
      billingLines: billingLines([
        { code: 'OFRT', desc: 'Ocean Freight MNL→LGB', qty: 1, rate: 185000, vat: false },
        { code: 'THC', desc: 'Terminal Handling Charge', qty: 1, rate: 7250, vat: true },
        { code: 'DOC', desc: 'B/L Issuance Fee', qty: 1, rate: 3500, vat: true },
        { code: 'CFS', desc: 'CFS Stuffing Charge', qty: 33.2, rate: 850, vat: true },
      ]),
    },
  ];

  for (const s of samples) {
    await (prisma.shipment as any).upsert({
      where: { companyCode_fileNo: { companyCode: KORNET, fileNo: s.fileNo } },
      update: { status: s.status, billingLines: s.billingLines },
      create: { companyCode: KORNET, createdBy: adminId, ...s },
    }).catch(() => {/* ignore if model differs */});
  }
  console.log(`[seed] ${samples.length} sample shipments with billing lines seeded`);
}

async function autoSeedIfEmpty() {
  try {
    await ensureAdminUser();
    const admin = await prisma.user.findFirst({ where: { username: env.seed.adminUsername } });
    const shipmentCount = await (prisma.shipment as any).count({ where: { companyCode: KORNET } }).catch(() => 0);
    if (shipmentCount === 0 && admin) {
      await seedSampleShipments(admin.id);
    }
  } catch (e) {
    console.error('[startup] Auto-seed failed (non-fatal):', e);
  }
}

app.listen(env.port, async () => {
  await autoSeedIfEmpty();
  console.log(`\n  Kornet Express API & Web  →  http://localhost:${env.port}\n`);
});
