import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { prisma } from '../db.js'
import { asyncHandler, badRequest, conflict, notFound } from '../lib/http.js'
import { requireAuth, requireCompany, requireRole } from '../middleware/auth.js'
import { writeAudit } from '../lib/crud.js'
import { philippineAirports } from '../data/philippineAirports.js'
import { philippinePortReferences } from '../data/philippinePortReferences.js'
import { getLiveTrackingSnapshot, getSimulatedTrackingSnapshot } from '../services/trackingProviders.js'

const mapRouter = Router()
mapRouter.use(requireAuth, requireCompany)

const coordinateInput = z.object({
  latitude: z.number().finite().min(-90).max(90).nullable(),
  longitude: z.number().finite().min(-180).max(180).nullable(),
}).refine((value) => (value.latitude === null) === (value.longitude === null), {
  message: 'Latitude and longitude must both be provided or both be cleared.',
})

const locationRoles = requireRole('accounting', 'manager', 'admin')
const maintainReferenceRoles = requireRole('manager', 'admin')
const geocodePreviews = new Map<string, { previewId: string; latitude: number; longitude: number; confidence: number | null; expiresAt: number }>()

interface PortReferenceView {
  id: string
  code: string
  unlocode: string | null
  name: string
  country: string
  kind: string
  type: string
  iata: string | null
  latitude: number
  longitude: number
  locationSource: string | null
  approximate: boolean
  editable: boolean
}

function normalizeLocationName(value: string) {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '')
}

mapRouter.get('/references', asyncHandler(async (req, res) => {
  const ports = await prisma.port.findMany({
    where: { companyCode: req.companyCode! },
    select: {
      id: true,
      code: true,
      unlocode: true,
      name: true,
      country: true,
      kind: true,
      type: true,
      iata: true,
      latitude: true,
      longitude: true,
      locationSource: true,
    },
    orderBy: { name: 'asc' },
  })
  const references: PortReferenceView[] = philippinePortReferences.map((reference) => {
    const aliasNames = reference.aliases.map(normalizeLocationName)
    const companyPort = ports.find((port) => {
      const kind = `${port.kind} ${port.type}`.toLowerCase()
      if (!kind.includes('sea') && !kind.includes('port')) return false
      const name = normalizeLocationName(port.name)
      const code = normalizeLocationName(port.code)
      return aliasNames.some((alias) => name.includes(alias) || alias.includes(name) || code.includes(alias))
    })
    return {
      id: companyPort?.id ?? reference.referenceCode,
      code: companyPort?.code ?? reference.referenceCode,
      unlocode: companyPort?.unlocode ?? null,
      name: companyPort?.name ?? reference.name,
      country: companyPort?.country ?? 'PH',
      kind: companyPort?.kind ?? 'SEA',
      type: companyPort?.type ?? 'sea',
      iata: companyPort?.iata ?? null,
      latitude: companyPort?.latitude ?? reference.latitude,
      longitude: companyPort?.longitude ?? reference.longitude,
      locationSource: companyPort?.locationSource || 'WPI-derived port-area reference (approximate)',
      approximate: companyPort?.latitude == null || companyPort.longitude == null,
      editable: Boolean(companyPort),
    }
  })
  const additionalPorts: PortReferenceView[] = ports
    .filter((port): port is typeof port & { latitude: number; longitude: number } => port.latitude !== null && port.longitude !== null)
    .filter((port) => !philippinePortReferences.some((reference) => {
      const aliases = reference.aliases.map(normalizeLocationName)
      const name = normalizeLocationName(port.name)
      return aliases.some((alias) => name.includes(alias) || alias.includes(name))
    }))
    .map((port) => ({ ...port, locationSource: port.locationSource || 'Company master record', approximate: false, editable: true }))

  res.json({
    airports: philippineAirports.map((airport) => ({ ...airport, source: 'OurAirports (public domain)' })),
    ports: [...references, ...additionalPorts],
    attribution: {
      airports: 'Airport coordinates: OurAirports, public domain; accuracy is not guaranteed by the source.',
      ports: 'Port-area reference points: tayljordan/ports, derived from NGA World Port Index (2019 edition), MIT licensed; coordinates rounded to 0.01° and not berth-level. Company-verified coordinates override these references.',
      basemap: '© OpenStreetMap contributors · OpenFreeMap',
    },
  })
}))

mapRouter.get('/assets', asyncHandler(async (req, res) => {
  if (req.query.mode === 'simulated') {
    res.setHeader('Cache-Control', 'private, no-store')
    res.json(getSimulatedTrackingSnapshot())
    return
  }

  const snapshot = await getLiveTrackingSnapshot()
  const links = await prisma.trackingAssetLink.findMany({
    where: { companyCode: req.companyCode! },
    include: { shipment: { select: { id: true, fileNo: true, status: true } } },
  })
  const linked = new Map(links.map((link) => [`${link.provider}:${link.assetType}:${link.externalId}`, {
    id: link.shipment.id,
    fileNo: link.shipment.fileNo,
    status: link.shipment.status,
  }]))
  const assets = snapshot.assets.map((asset) => ({
    ...asset,
    shipment: linked.get(`${asset.provider}:${asset.type === 'aircraft' ? 'AIRCRAFT' : 'VESSEL'}:${asset.externalId}`) ?? null,
  }))

  res.setHeader('Cache-Control', 'private, no-store')
  res.json({ ...snapshot, assets })
}))

mapRouter.get('/shipments', asyncHandler(async (req, res) => {
  const query = String(req.query.q ?? '').trim()
  if (query.length < 2) throw badRequest('Enter at least two characters to search shipments.')
  const shipments = await prisma.shipment.findMany({
    where: {
      companyCode: req.companyCode!,
      deletedAt: null,
      OR: [
        { fileNo: { contains: query } },
        { flightNo: { contains: query } },
        { vessel: { contains: query } },
        { bookingNo: { contains: query } },
      ],
    },
    select: { id: true, fileNo: true, status: true, mode: true, vessel: true, voyage: true, flightNo: true },
    orderBy: { updatedAt: 'desc' },
    take: 20,
  })
  res.json({ data: shipments })
}))

mapRouter.post('/links', requireRole('operations', 'manager', 'admin'), asyncHandler(async (req, res) => {
  const input = z.object({
    assetType: z.enum(['AIRCRAFT', 'VESSEL']),
    provider: z.enum(['adsb.lol', 'OpenSeaFeed']),
    externalId: z.string().trim().min(1).max(80),
    shipmentId: z.string().min(1),
  }).parse(req.body)
  const shipment = await prisma.shipment.findFirst({
    where: { id: input.shipmentId, companyCode: req.companyCode!, deletedAt: null },
    select: { id: true, fileNo: true, status: true },
  })
  if (!shipment) throw notFound('Shipment not found.')
  const existing = await prisma.trackingAssetLink.findFirst({
    where: {
      companyCode: req.companyCode!,
      assetType: input.assetType,
      provider: input.provider,
      externalId: input.externalId,
    },
    select: { id: true, shipmentId: true },
  })
  if (existing) {
    if (existing.shipmentId === shipment.id) throw conflict('This asset is already linked to that shipment.')
    throw conflict('This live asset is already linked to another shipment. Review the existing association first.')
  }
  const link = await prisma.trackingAssetLink.create({
    data: {
      companyCode: req.companyCode!,
      assetType: input.assetType,
      provider: input.provider,
      externalId: input.externalId,
      shipmentId: shipment.id,
      linkedBy: req.user?.sub,
    },
  })
  await writeAudit(req, 'link', 'TrackingAsset', link.id, { externalId: input.externalId, assetType: input.assetType, shipmentId: shipment.id })
  res.status(201).json({ link, shipment })
}))

mapRouter.patch('/ports/:id/location', maintainReferenceRoles, asyncHandler(async (req, res) => {
  const input = coordinateInput.parse(req.body)
  const existing = await prisma.port.findFirst({
    where: { id: req.params.id, companyCode: req.companyCode! },
    select: { id: true, latitude: true, longitude: true },
  })
  if (!existing) throw notFound('Port or airport reference not found.')
  const updated = await prisma.port.update({
    where: { id: existing.id },
    data: {
      latitude: input.latitude,
      longitude: input.longitude,
      locationSource: input.latitude === null ? null : 'MANUAL_VERIFIED',
      locationVerifiedAt: input.latitude === null ? null : new Date(),
    },
    select: { id: true, code: true, name: true, latitude: true, longitude: true, locationSource: true },
  })
  await writeAudit(req, 'update-location', 'Port', existing.id, { before: existing, after: updated })
  res.json(updated)
}))

mapRouter.patch('/customers/:id/location', locationRoles, asyncHandler(async (req, res) => {
  const input = coordinateInput.parse(req.body)
  const existing = await prisma.party.findFirst({
    where: { id: req.params.id, companyCode: req.companyCode!, isCustomer: true },
    select: { id: true },
  })
  if (!existing) throw notFound('Customer not found.')
  if (input.latitude === null || input.longitude === null) {
    await prisma.partyMapLocation.deleteMany({ where: { companyCode: req.companyCode!, partyId: existing.id } })
  } else {
    await prisma.partyMapLocation.upsert({
      where: { companyCode_partyId: { companyCode: req.companyCode!, partyId: existing.id } },
      create: {
        companyCode: req.companyCode!,
        partyId: existing.id,
        latitude: input.latitude,
        longitude: input.longitude,
        source: 'MANUAL_VERIFIED',
        updatedBy: req.user?.sub,
      },
      update: { latitude: input.latitude, longitude: input.longitude, source: 'MANUAL_VERIFIED', updatedBy: req.user?.sub },
    })
  }
  const location = await prisma.partyMapLocation.findFirst({
    where: { companyCode: req.companyCode!, partyId: existing.id },
    select: { latitude: true, longitude: true, source: true },
  })
  await writeAudit(req, 'update-location', 'Party', existing.id, { after: location })
  res.json({ id: existing.id, ...location })
}))

mapRouter.post('/customers/:id/geocode-preview', locationRoles, asyncHandler(async (req, res) => {
  const key = process.env.GEOAPIFY_API_KEY
  if (!key || process.env.GEOAPIFY_TERMS_APPROVED !== 'true') {
    res.status(503).json({ error: 'Customer geocoding is disabled until Geoapify privacy and commercial terms are reviewed and configured.' })
    return
  }
  const party = await prisma.party.findFirst({
    where: { id: req.params.id, companyCode: req.companyCode!, isCustomer: true },
    select: { id: true, address: true, city: true, province: true, zip: true, country: true },
  })
  if (!party) throw notFound('Customer not found.')
  const address = [party.address, party.city, party.province, party.zip, party.country].filter(Boolean).join(', ')
  if (!address) throw badRequest('This customer has no address to geocode.')

  const url = new URL('https://api.geoapify.com/v1/geocode/search')
  url.searchParams.set('text', address)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '1')
  url.searchParams.set('apiKey', key)
  const response = await fetch(url, { signal: AbortSignal.timeout(8_000) })
  if (!response.ok) {
    res.status(502).json({ error: `Geocoding provider returned HTTP ${response.status}. No location was saved.` })
    return
  }
  const payload = await response.json() as {
    results?: Array<{ lat?: number; lon?: number; formatted?: string; rank?: { confidence?: number } }>
  }
  const candidate = payload.results?.[0]
  if (typeof candidate?.lat !== 'number' || typeof candidate.lon !== 'number') {
    res.status(404).json({ error: 'No geocoding match was returned. No location was saved.' })
    return
  }
  const previewId = randomUUID()
  const previewKey = `${req.user?.sub}:${party.id}`
  geocodePreviews.set(previewKey, {
    previewId,
    latitude: candidate.lat,
    longitude: candidate.lon,
    confidence: candidate.rank?.confidence ?? null,
    expiresAt: Date.now() + 5 * 60_000,
  })
  res.json({
    customerId: party.id,
    previewId,
    latitude: candidate.lat,
    longitude: candidate.lon,
    formatted: candidate.formatted ?? '',
    confidence: candidate.rank?.confidence ?? null,
    provider: 'Geoapify',
    saved: false,
  })
}))

mapRouter.post('/customers/:id/geocode-accept', locationRoles, asyncHandler(async (req, res) => {
  const input = z.object({ previewId: z.string().uuid() }).parse(req.body)
  const previewKey = `${req.user?.sub}:${req.params.id}`
  const preview = geocodePreviews.get(previewKey)
  if (!preview || preview.previewId !== input.previewId || preview.expiresAt < Date.now()) {
    geocodePreviews.delete(previewKey)
    throw conflict('Geocoding preview has expired or is no longer available. Request a new preview.')
  }
  const existing = await prisma.party.findFirst({
    where: { id: req.params.id, companyCode: req.companyCode!, isCustomer: true },
    select: { id: true },
  })
  if (!existing) throw notFound('Customer not found.')
  const updated = await prisma.partyMapLocation.upsert({
    where: { companyCode_partyId: { companyCode: req.companyCode!, partyId: existing.id } },
    create: {
      companyCode: req.companyCode!,
      partyId: existing.id,
      latitude: preview.latitude,
      longitude: preview.longitude,
      source: 'GEOAPIFY_REVIEWED',
      updatedBy: req.user?.sub,
    },
    update: {
      latitude: preview.latitude,
      longitude: preview.longitude,
      source: 'GEOAPIFY_REVIEWED',
      updatedBy: req.user?.sub,
    },
  })
  geocodePreviews.delete(previewKey)
  await writeAudit(req, 'geocode-location', 'Party', existing.id, {
    provider: 'Geoapify',
    confidence: preview.confidence,
    after: { latitude: updated.latitude, longitude: updated.longitude, source: updated.source },
  })
  res.json({ id: existing.id, latitude: updated.latitude, longitude: updated.longitude, source: updated.source })
}))

mapRouter.get('/financial', locationRoles, asyncHandler(async (req, res) => {
  const period = String(req.query.period ?? '30d')
  if (!['30d', '90d', 'ytd'].includes(period)) throw badRequest('Period must be 30d, 90d, or ytd.')
  const now = new Date()
  const start = period === 'ytd'
    ? new Date(Date.UTC(now.getUTCFullYear(), 0, 1))
    : new Date(now.getTime() - (period === '90d' ? 90 : 30) * 24 * 60 * 60 * 1_000)
  const [invoices, receipts] = await Promise.all([
    prisma.invoice.findMany({
      where: { companyCode: req.companyCode!, status: 'POSTED', deletedAt: null, date: { gte: start, lte: now } },
      select: { billToPartyId: true, totalAmount: true, vatAmount: true },
    }),
    prisma.receipt.findMany({
      where: { companyCode: req.companyCode!, status: 'POSTED', deletedAt: null, date: { gte: start, lte: now } },
      select: {
        applications: {
          select: {
            applied: true,
            ewt: true,
            invoice: { select: { billToPartyId: true } },
          },
        },
      },
    }),
  ])

  type Totals = { sales: number; cashCollected: number; ewtWithheld: number }
  const totals = new Map<string, Totals>()
  const getTotals = (partyId: string) => {
    const current = totals.get(partyId) ?? { sales: 0, cashCollected: 0, ewtWithheld: 0 }
    totals.set(partyId, current)
    return current
  }

  for (const invoice of invoices) {
    if (!invoice.billToPartyId) continue
    getTotals(invoice.billToPartyId).sales += invoice.totalAmount - invoice.vatAmount
  }
  for (const receipt of receipts) {
    for (const application of receipt.applications) {
      const partyId = application.invoice.billToPartyId
      if (!partyId) continue
      const customer = getTotals(partyId)
      customer.cashCollected += application.applied
      customer.ewtWithheld += application.ewt
    }
  }

  const partyIds = [...totals.keys()]
  const parties = partyIds.length ? await prisma.party.findMany({
    where: { companyCode: req.companyCode!, id: { in: partyIds }, isCustomer: true },
    select: { id: true, name: true },
  }) : []
  const byId = new Map(parties.map((party) => [party.id, party]))
  const locations = partyIds.length ? await prisma.partyMapLocation.findMany({
    where: { companyCode: req.companyCode!, partyId: { in: partyIds } },
    select: { partyId: true, latitude: true, longitude: true, source: true },
  }) : []
  const locationsByParty = new Map(locations.map((location) => [location.partyId, location]))
  const points = []
  const unmappedCustomers = []

  for (const [partyId, amount] of totals) {
    const party = byId.get(partyId)
    if (!party) continue
    const location = locationsByParty.get(partyId)
    if (!location) {
      unmappedCustomers.push({ partyId, name: party.name, ...amount })
      continue
    }
    points.push({
      partyId,
      name: party.name,
      latitude: location.latitude,
      longitude: location.longitude,
      locationSource: location.source,
      ...amount,
    })
  }

  res.setHeader('Cache-Control', 'private, no-store')
  res.json({
    period,
    from: start.toISOString(),
    to: now.toISOString(),
    metricDefinitions: {
      sales: 'Posted invoice total less VAT, matching the current logistics dashboard revenue calculation.',
      cashCollected: 'Posted receipt application amounts only; EWT is excluded from cash and shown separately.',
      ewtWithheld: 'EWT recorded on posted receipt applications.',
    },
    points,
    unmappedCustomers,
  })
}))

export default mapRouter
