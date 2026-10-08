import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  AlertTriangle,
  ArrowRight,
  Ban,
  CheckCircle2,
  Copy,
  Edit2,
  FileText,
  Plane,
  Plus,
  Printer,
  Ship,
  Trash2,
  Truck,
  Wand2,
} from 'lucide-react'
import {
  Badge,
  Button,
  ConfirmDialog,
  EditableGrid,
  EmptyState,
  FormField,
  FormSection,
  Input,
  NumberInput,
  MoneyInput,
  Select,
  Sheet,
  SheetContent,
  Textarea,
  Timeline,
  Toolbar,
} from '@/components/ui'
import {
  opsApi,
  type CargoLine,
  type ChargeLine,
  type ContainerLine,
  type Shipment,
  type TransportDoc,
  type WorkspaceMode,
} from '@/api/ops'
import { formatCbm, formatDate, formatMoney, formatNumber, formatWeightKg } from '@/lib/format'
import {
  apiErrorMessage,
  cargoTotals,
  CHARGE_UNITS,
  computeCargoLine,
  computeChargeLine,
  EQUIPMENT_TYPES,
  FREIGHT_TERMS,
  fromDateInput,
  INCOTERMS,
  LOAD_TYPES,
  newCargoLine,
  STATUS_STEPS,
  toDateInput,
  validateIso6346,
  validateMawb,
  VAT_CLASSES,
} from '../utils'
import { LookupField, MarginBadge, MoneyValue, OptionsSelect, WarningText } from './common'
import { openPrintWindow, transportDocPrintHtml } from './print'

type Row = Record<string, unknown>
const docKinds = ['booking-confirmation', 'hbl', 'awb', 'arrival-notice', 'delivery-order', 'manifest', 'cargo-release']

export const DOMESTIC_VEHICLE_TYPES = [
  { value: '4W_CLOSED_VAN', label: '4-Wheeler Closed Van (1.5 - 2 Tons)' },
  { value: '6W_FORWARD', label: '6-Wheeler Forward / Dropside (4 - 7 Tons)' },
  { value: '10W_WING_VAN', label: '10-Wheeler Wing Van (15 - 25 Tons)' },
  { value: 'TRAILER_20FT', label: 'Tractor Head w/ 20ft Chassis Trailer' },
  { value: 'TRAILER_40FT', label: 'Tractor Head w/ 40ft Chassis Trailer' },
  { value: 'BOOM_TRUCK', label: 'Boom Truck / Crane Cargo (Heavy Equipment)' },
  { value: 'L300_UTILITY', label: 'L300 / Utility Multicab (< 1 Ton Express)' },
]

export const DOMESTIC_CORRIDORS = [
  { value: 'NCR_METRO', label: 'Metro Manila (NCR) Inter-Branch Direct' },
  { value: 'NCR_LAGUNA', label: 'NCR ↔ Laguna (Technopark / Calamba / Sta. Rosa)' },
  { value: 'NCR_CAVITE', label: 'NCR ↔ Cavite (EPZA / Rosario / Dasmariñas)' },
  { value: 'NCR_BATANGAS', label: 'NCR ↔ Batangas Port / FPIP / Sto. Tomas' },
  { value: 'NCR_CLARK', label: 'NCR ↔ Bulacan / Pampanga (Clark Freeport)' },
  { value: 'NCR_SUBIC', label: 'NCR ↔ Subic Bay Freeport Zone (SBFZ)' },
  { value: 'LUZON_VISAYAS_RORO', label: 'Luzon ↔ Visayas (RORO Inter-Island: Iloilo/Bacolod/Cebu)' },
  { value: 'LUZON_MIN_RORO', label: 'Luzon ↔ Mindanao (RORO Inter-Island: CDO/Davao/GenSan)' },
]

export const AIR_HANDLING_CODES = [
  { code: 'PER', label: 'PER (Perishable / Temp Sensitive)' },
  { code: 'GEN', label: 'GEN (General Non-Hazardous)' },
  { code: 'VAL', label: 'VAL (High Value Cargo)' },
  { code: 'DGR', label: 'DGR (Dangerous Goods / Hazmat)' },
  { code: 'FRAG', label: 'FRAG (Fragile / Handle With Care)' },
  { code: 'COL', label: 'COL (Cool Room Storage)' },
  { code: 'HUM', label: 'HUM (Humanitarian Aid)' },
]

function blankContainer(shipmentId: string): ContainerLine {
  return { shipmentId, equipmentType: '20GP', containerNo: '', sealNo: '', tareKg: 0, vgmKg: 0, temperatureC: null, hazmat: false, unNumbers: '', status: 'EMPTY' }
}

function blankCharge(index: number): ChargeLine {
  return { billingCode: 'MISC', description: '', chargeSide: 'BOTH', freightTerm: 'PREPAID', billParty: 'SHIPPER', unit: 'PER_SHPT', qty: 1, rate: 0, minAmount: 0, currency: 'PHP', exchangeRate: 1, amount: 0, amountPhp: 0, vatClass: 'VATABLE', showOnDoc: true, costQty: 1, costRate: 0, costCurrency: 'PHP', costExchangeRate: 1, costAmount: 0, costAmountPhp: 0, billStatus: 'OPEN', costStatus: 'OPEN', sortOrder: index }
}

function blankDoc(shipment: Partial<Shipment>, mode: 'OCEAN' | 'AIR' | 'DOMESTIC'): TransportDoc {
  if (mode === 'DOMESTIC') {
    const year = new Date().getFullYear()
    const rand = Math.floor(Math.random() * 9000) + 1000
    return {
      shipmentId: String(shipment.id),
      docType: 'DR',
      docClass: 'HOUSE',
      docNo: shipment.bookingNo || `DR-${year}-${rand}`,
      freightTerm: shipment.freightTerm || 'PREPAID',
      numberOfOriginals: 2,
      releaseType: 'ORIGINAL',
      shipperName: shipment.shipperName,
      shipperAddress: shipment.shipperAddress || shipment.placeOfReceipt,
      consigneeName: shipment.consigneeName,
      consigneeAddress: shipment.consigneeAddress || shipment.finalDestination,
      notifyName: shipment.notifyName,
      notifyAddress: shipment.notifyAddress,
      pol: shipment.polCode || shipment.placeOfReceipt,
      pod: shipment.podCode || shipment.finalDestination,
      status: 'DRAFT',
    }
  }

  const isAir = mode === 'AIR'
  return {
    shipmentId: String(shipment.id),
    docType: isAir ? 'AWB' : 'BL',
    docClass: 'HOUSE',
    docNo: '',
    freightTerm: shipment.freightTerm || 'PREPAID',
    numberOfOriginals: 3,
    releaseType: 'ORIGINAL',
    shipperName: shipment.shipperName,
    shipperAddress: shipment.shipperAddress,
    consigneeName: shipment.consigneeName,
    consigneeAddress: shipment.consigneeAddress,
    notifyName: shipment.notifyName,
    notifyAddress: shipment.notifyAddress,
    pol: shipment.polCode,
    pod: shipment.podCode,
    status: 'DRAFT',
  }
}

export function GeneralTab({
  draft,
  air,
  mode: explicitMode,
  update,
  onNext,
}: {
  draft: Partial<Shipment>
  air?: boolean
  mode?: WorkspaceMode | string
  update: (patch: Partial<Shipment>) => void
  onNext?: () => void
}) {
  const resolvedMode = (explicitMode || draft.mode || (air ? 'AIR' : 'OCEAN')).toUpperCase()
  const isAir = resolvedMode.includes('AIR')
  const isDomestic = resolvedMode.includes('DOMESTIC')
  const isOcean = !isAir && !isDomestic

  // MAWB Mod-7 check for Air mode
  const mawbValidation = isAir && draft.bookingNo ? validateMawb(draft.bookingNo) : null

  return (
    <div className="space-y-4">
      {/* 1. DOMESTIC FREIGHT FORM */}
      {isDomestic && (
        <>
          <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-xs text-primary">
            <Truck className="size-4 shrink-0" />
            <span className="font-semibold">Domestic Logistics &amp; Inland Trucking:</span>
            <span className="text-muted-foreground">Standardized for Philippine logistics corridor dispatch, fleet plate tracking, driver assignment and Delivery Receipts (DR).</span>
          </div>

          <FormSection
            title="Clients & Facilities"
            description="Client sender plant, delivery recipient site, fleet partner and billing account."
          >
            <LookupField
              label="Shipper / Origin Plant"
              value={draft.shipperPartyId}
              display={draft.shipperName}
              onChange={(id, item) =>
                update({
                  shipperPartyId: id,
                  shipperName: item?.label,
                  shipperAddress: String(item?.raw?.address ?? ''),
                  placeOfReceipt: String(item?.raw?.address ?? draft.placeOfReceipt ?? ''),
                })
              }
              loader={opsApi.lookupParties}
              role="isShipper"
            />
            <LookupField
              label="Consignee / Delivery Facility"
              value={draft.consigneePartyId}
              display={draft.consigneeName}
              onChange={(id, item) =>
                update({
                  consigneePartyId: id,
                  consigneeName: item?.label,
                  consigneeAddress: String(item?.raw?.address ?? ''),
                  finalDestination: String(item?.raw?.address ?? draft.finalDestination ?? ''),
                })
              }
              loader={opsApi.lookupParties}
              role="isConsignee"
            />
            <LookupField
              label="Fleet Carrier / Trucker"
              value={draft.carrierPartyId}
              onChange={(carrierPartyId) => update({ carrierPartyId })}
              loader={opsApi.lookupParties}
              role="isCarrier"
            />
            <LookupField
              label="Bill to Account"
              value={draft.billToPartyId}
              onChange={(billToPartyId) => update({ billToPartyId })}
              loader={opsApi.lookupParties}
              role="isCustomer"
            />
          </FormSection>

          <FormSection
            title="Fleet Dispatch &amp; Driver Assignment"
            description="Truck asset plate number, body type, driver credentials, and dispatch gate passes."
          >
            <FormField label="Truck Plate #" required hint="e.g. NBD 1234 or ABC 5678">
              <div className="relative flex items-center">
                <Input
                  value={draft.vessel || ''}
                  onChange={(e) => update({ vessel: e.target.value.toUpperCase() })}
                  placeholder="NBD 1234"
                  className="font-mono font-bold tracking-wider uppercase pr-14"
                />
                {draft.vessel && (
                  <span className="absolute right-2.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground uppercase">
                    PH PLATE
                  </span>
                )}
              </div>
            </FormField>

            <FormField label="Vehicle / Truck Type">
              <Select
                value={
                  DOMESTIC_VEHICLE_TYPES.some((v) => draft.remarks?.includes(v.value))
                    ? DOMESTIC_VEHICLE_TYPES.find((v) => draft.remarks?.includes(v.value))?.value
                    : '10W_WING_VAN'
                }
                onValueChange={(val) => {
                  const label = DOMESTIC_VEHICLE_TYPES.find((v) => v.value === val)?.label || val
                  update({ remarks: `Truck: ${label}${draft.remarks ? ` | ${draft.remarks.replace(/^Truck: [^|]+ \|?/, '')}` : ''}` })
                }}
                options={DOMESTIC_VEHICLE_TYPES}
              />
            </FormField>

            <FormField label="Driver Full Name &amp; Mobile" hint="Driver contact for dispatch tracking">
              <Input
                value={draft.flightNo || ''}
                onChange={(e) => update({ flightNo: e.target.value })}
                placeholder="Juan Dela Cruz &middot; 0917-555-0123"
              />
            </FormField>

            <FormField label="Driver License #" hint="LTO driver license on file">
              <Input
                value={draft.voyage || ''}
                onChange={(e) => update({ voyage: e.target.value.toUpperCase() })}
                placeholder="N01-14-123456"
                className="font-mono"
              />
            </FormField>

            <FormField label="Domestic Trip Ticket #" hint="Internal fleet dispatch ticket">
              <Input
                value={draft.bookingNo || ''}
                onChange={(e) => update({ bookingNo: e.target.value.toUpperCase() })}
                placeholder="TT-2026-0042"
                className="font-mono"
              />
            </FormField>

            <FormField label="Warehouse Gate Pass #" hint="Facility security gate pass">
              <Input
                value={draft.carrierBookingRef || ''}
                onChange={(e) => update({ carrierBookingRef: e.target.value.toUpperCase() })}
                placeholder="GP-8831"
                className="font-mono"
              />
            </FormField>

            <FormField label="Customer DR / PO #" hint="Customer commercial reference">
              <Input
                value={draft.customerRef || ''}
                onChange={(e) => update({ customerRef: e.target.value })}
                placeholder="PO-99124 / DR-4501"
              />
            </FormField>

            <FormField label="Payment / Freight Term">
              <OptionsSelect
                value={draft.freightTerm || 'PREPAID'}
                options={['PREPAID', 'COLLECT', 'CHARGE_TO_CLIENT']}
                onChange={(freightTerm) => update({ freightTerm })}
              />
            </FormField>
          </FormSection>

          <FormSection
            title="Route Corridor &amp; Schedule Windows"
            description="Highway corridor, origin facility address, destination drop-off and delivery windows."
          >
            <div className="sm:col-span-2 lg:col-span-3">
              <FormField label="Logistics Corridor">
                <Select
                  value={
                    DOMESTIC_CORRIDORS.some((c) => draft.polCode === c.value)
                      ? draft.polCode
                      : 'NCR_LAGUNA'
                  }
                  onValueChange={(val) => {
                    const match = DOMESTIC_CORRIDORS.find((c) => c.value === val)
                    update({
                      polCode: val,
                      podCode: match?.label.split('↔')[1]?.trim() || 'DEST',
                    })
                  }}
                  options={DOMESTIC_CORRIDORS}
                />
              </FormField>
            </div>

            <div className="sm:col-span-2 lg:col-span-3 grid gap-3 sm:grid-cols-2">
              <FormField label="Pick-up Origin Facility Address">
                <Textarea
                  value={draft.placeOfReceipt || draft.shipperAddress || ''}
                  onChange={(e) => update({ placeOfReceipt: e.target.value })}
                  placeholder="Kornet Central Warehouse, Paranaque City"
                  rows={2}
                />
              </FormField>

              <FormField label="Delivery Site Facility Address">
                <Textarea
                  value={draft.finalDestination || draft.consigneeAddress || ''}
                  onChange={(e) => update({ finalDestination: e.target.value })}
                  placeholder="Laguna Technopark Phase 3, Binan, Laguna"
                  rows={2}
                />
              </FormField>
            </div>

            <FormField label="Scheduled Pick-up Window">
              <Input
                type="datetime-local"
                value={draft.docCutoff?.slice(0, 16) || ''}
                onChange={(e) => update({ docCutoff: e.target.value ? new Date(e.target.value).toISOString() : null })}
              />
            </FormField>

            <FormField label="Target Delivery Window">
              <Input
                type="datetime-local"
                value={draft.cargoCutoff?.slice(0, 16) || ''}
                onChange={(e) => update({ cargoCutoff: e.target.value ? new Date(e.target.value).toISOString() : null })}
              />
            </FormField>

            <FormField label="Departure Date (ATD)">
              <Input
                type="date"
                value={toDateInput(draft.etd)}
                onChange={(e) => update({ etd: fromDateInput(e.target.value) })}
              />
            </FormField>

            <FormField label="Delivery Date (ATA)">
              <Input
                type="date"
                value={toDateInput(draft.eta)}
                onChange={(e) => update({ eta: fromDateInput(e.target.value) })}
              />
            </FormField>
          </FormSection>

          <FormSection
            title="Cargo Manifest Summary &amp; Special Handling"
            description="Goods description, security requirements and site gate notes."
          >
            <FormField label="Commodity / Cargo Title">
              <Input
                value={draft.commodity || ''}
                onChange={(e) => update({ commodity: e.target.value })}
                placeholder="e.g. Automotive Electronic Components &amp; Harnesses"
              />
            </FormField>

            <FormField label="Goods Description">
              <Textarea
                value={draft.goodsDescription || ''}
                onChange={(e) => update({ goodsDescription: e.target.value })}
                placeholder="Description of packages and merchandise..."
                rows={2}
              />
            </FormField>

            <div className="sm:col-span-2 lg:col-span-3">
              <FormField label="Special Gate &amp; Delivery Instructions">
                <Textarea
                  value={draft.remarks || ''}
                  onChange={(e) => update({ remarks: e.target.value })}
                  placeholder="e.g. Safety PPE (Hardhat &amp; Steel Toe) mandatory; Tail-lift required; Unloading dock 4."
                  rows={2}
                />
              </FormField>
            </div>
          </FormSection>
        </>
      )}

      {/* 2. AIR FREIGHT FORM */}
      {isAir && (
        <>
          <div className="flex items-center gap-2 rounded-xl border border-sky-500/20 bg-sky-500/5 px-4 py-2.5 text-xs text-sky-600 dark:text-sky-400">
            <Plane className="size-4 shrink-0" />
            <span className="font-semibold">IATA Standard Air Freight:</span>
            <span className="text-muted-foreground">Governed by IATA Resolution 600a format with 11-digit MAWB Mod-7 check digit verification, flight schedules and volumetric calculations.</span>
          </div>

          <FormSection
            title="IATA Parties"
            description="IATA standard Shipper, Consignee, Also Notify and Issuing Cargo Agent details."
          >
            <LookupField
              label="Shipper / Exporter"
              value={draft.shipperPartyId}
              display={draft.shipperName}
              onChange={(id, item) =>
                update({
                  shipperPartyId: id,
                  shipperName: item?.label,
                  shipperAddress: String(item?.raw?.address ?? ''),
                })
              }
              loader={opsApi.lookupParties}
              role="isShipper"
            />
            <LookupField
              label="Consignee / Importer"
              value={draft.consigneePartyId}
              display={draft.consigneeName}
              onChange={(id, item) =>
                update({
                  consigneePartyId: id,
                  consigneeName: item?.label,
                  consigneeAddress: String(item?.raw?.address ?? ''),
                })
              }
              loader={opsApi.lookupParties}
              role="isConsignee"
            />
            <LookupField
              label="Also Notify Party"
              value={draft.notifyPartyId}
              display={draft.notifyName}
              onChange={(id, item) =>
                update({
                  notifyPartyId: id,
                  notifyName: item?.label,
                  notifyAddress: String(item?.raw?.address ?? ''),
                })
              }
              loader={opsApi.lookupParties}
              role="isNotify"
            />
            <LookupField
              label="Issuing Cargo Agent"
              value={draft.agentPartyId}
              onChange={(agentPartyId) => update({ agentPartyId })}
              loader={opsApi.lookupParties}
              role="isAgent"
            />
            <LookupField
              label="Customs Broker"
              value={draft.brokerPartyId}
              onChange={(brokerPartyId) => update({ brokerPartyId })}
              loader={opsApi.lookupParties}
              role="isBroker"
            />
            <LookupField
              label="Bill to Account"
              value={draft.billToPartyId}
              onChange={(billToPartyId) => update({ billToPartyId })}
              loader={opsApi.lookupParties}
              role="isCustomer"
            />
          </FormSection>

          <FormSection
            title="Flight Schedule &amp; AWB Booking"
            description="Airline carrier, Master AWB #, flight number, airport codes and flight cutoffs."
          >
            <LookupField
              label="Airline Carrier"
              value={draft.carrierPartyId}
              onChange={(carrierPartyId) => update({ carrierPartyId })}
              loader={opsApi.lookupParties}
              role="isCarrier"
            />

            <FormField label="Airline Booking Ref">
              <Input
                value={draft.carrierBookingRef || ''}
                onChange={(e) => update({ carrierBookingRef: e.target.value.toUpperCase() })}
                placeholder="BK-PR-90184"
                className="font-mono uppercase"
              />
            </FormField>

            <FormField
              label="Master AWB (MAWB) #"
              hint="Format: 079-12345675 (3 prefix + 7 serial + mod-7 check)"
            >
              <div className="space-y-1">
                <Input
                  value={draft.bookingNo || ''}
                  onChange={(e) => update({ bookingNo: e.target.value.toUpperCase() })}
                  placeholder="079-12345675"
                  className="font-mono font-bold tracking-wider uppercase"
                />
                {draft.bookingNo && (
                  <div className="pt-0.5">
                    {mawbValidation ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="size-3" />
                        {mawbValidation}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="size-3" />
                        Valid IATA MAWB Mod-7 check digit
                      </span>
                    )}
                  </div>
                )}
              </div>
            </FormField>

            <FormField label="Flight #" hint="e.g. PR 102, 5J 804, CX 906">
              <Input
                value={draft.flightNo || ''}
                onChange={(e) => update({ flightNo: e.target.value.toUpperCase() })}
                placeholder="PR 102"
                className="font-mono uppercase"
              />
            </FormField>

            <FormField label="Connecting / Transfer Flight" hint="Optional transit leg">
              <Input
                value={draft.voyage || ''}
                onChange={(e) => update({ voyage: e.target.value.toUpperCase() })}
                placeholder="SQ 917"
                className="font-mono uppercase"
              />
            </FormField>

            <LookupField
              label="Airport of Departure (POL)"
              value={draft.polCode}
              onChange={(polCode) => update({ polCode })}
              loader={(q) => opsApi.lookupPorts(q, 'AIR')}
            />

            <LookupField
              label="Airport of Destination (POD)"
              value={draft.podCode}
              onChange={(podCode) => update({ podCode })}
              loader={(q) => opsApi.lookupPorts(q, 'AIR')}
            />

            <FormField label="Flight Scheduled ETD">
              <Input
                type="date"
                value={toDateInput(draft.etd)}
                onChange={(e) => update({ etd: fromDateInput(e.target.value) })}
              />
            </FormField>

            <FormField label="Flight Scheduled ETA">
              <Input
                type="date"
                value={toDateInput(draft.eta)}
                onChange={(e) => update({ eta: fromDateInput(e.target.value) })}
              />
            </FormField>

            <FormField label="Cargo Acceptance Cutoff">
              <Input
                type="datetime-local"
                value={draft.cargoCutoff?.slice(0, 16) || ''}
                onChange={(e) => update({ cargoCutoff: e.target.value ? new Date(e.target.value).toISOString() : null })}
              />
            </FormField>

            <FormField label="Doc / Security Cutoff">
              <Input
                type="datetime-local"
                value={draft.docCutoff?.slice(0, 16) || ''}
                onChange={(e) => update({ docCutoff: e.target.value ? new Date(e.target.value).toISOString() : null })}
              />
            </FormField>
          </FormSection>

          <FormSection
            title="Air Cargo Trade Terms &amp; Special Handling"
            description="IATA box 27 nature of goods, air incoterms, freight terms and handling codes."
          >
            <FormField label="Air Incoterm">
              <OptionsSelect
                value={draft.incoterm || 'FCA'}
                options={['FCA', 'CPT', 'CIP', 'DAP', 'EXW', 'DDP']}
                onChange={(incoterm) => update({ incoterm })}
              />
            </FormField>

            <FormField label="Freight Payment Term">
              <OptionsSelect
                value={draft.freightTerm || 'PREPAID'}
                options={FREIGHT_TERMS}
                onChange={(freightTerm) => update({ freightTerm })}
              />
            </FormField>

            <FormField label="Commodity / Cargo Title">
              <Input
                value={draft.commodity || ''}
                onChange={(e) => update({ commodity: e.target.value })}
                placeholder="e.g. Semiconductor Integrated Circuits"
              />
            </FormField>

            <div className="sm:col-span-2 lg:col-span-3">
              <FormField label="Nature and Quantity of Goods (Box 27)">
                <Textarea
                  value={draft.goodsDescription || ''}
                  onChange={(e) => update({ goodsDescription: e.target.value })}
                  placeholder="Full IATA cargo nature description as specified on AWB..."
                  rows={2}
                />
              </FormField>

              {/* Quick Clickable Special Handling Pills */}
              <div className="mt-2 space-y-1.5">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Quick Add IATA Special Handling Codes:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {AIR_HANDLING_CODES.map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => {
                        const current = draft.goodsDescription || ''
                        if (!current.includes(item.code)) {
                          update({ goodsDescription: current ? `${current} | ${item.code}` : item.code })
                          toast.info(`Added special handling code: ${item.code}`)
                        }
                      }}
                      className="rounded-md border border-border/70 bg-muted/40 px-2 py-0.5 text-xs font-medium text-foreground transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary"
                    >
                      +{item.code}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </FormSection>
        </>
      )}

      {/* 3. OCEAN FREIGHT FORM */}
      {isOcean && (
        <>
          <div className="flex items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-2.5 text-xs text-blue-600 dark:text-blue-400">
            <Ship className="size-4 shrink-0" />
            <span className="font-semibold">Ocean Freight Operations:</span>
            <span className="text-muted-foreground">Standardized for maritime shipping lines, container stuffing (FCL/LCL), port cutoffs (CY/CFS) and Ocean Bills of Lading (B/L).</span>
          </div>

          <FormSection
            title="Maritime Parties"
            description="Shipper, Consignee, Notify Party, Forwarding Agent, Broker and Bill to client."
          >
            <LookupField
              label="Shipper / Exporter"
              value={draft.shipperPartyId}
              display={draft.shipperName}
              onChange={(id, item) =>
                update({
                  shipperPartyId: id,
                  shipperName: item?.label,
                  shipperAddress: String(item?.raw?.address ?? ''),
                })
              }
              loader={opsApi.lookupParties}
              role="isShipper"
            />
            <LookupField
              label="Consignee / Importer"
              value={draft.consigneePartyId}
              display={draft.consigneeName}
              onChange={(id, item) =>
                update({
                  consigneePartyId: id,
                  consigneeName: item?.label,
                  consigneeAddress: String(item?.raw?.address ?? ''),
                })
              }
              loader={opsApi.lookupParties}
              role="isConsignee"
            />
            <LookupField
              label="Notify Party"
              value={draft.notifyPartyId}
              display={draft.notifyName}
              onChange={(id, item) =>
                update({
                  notifyPartyId: id,
                  notifyName: item?.label,
                  notifyAddress: String(item?.raw?.address ?? ''),
                })
              }
              loader={opsApi.lookupParties}
              role="isNotify"
            />
            <LookupField
              label="Forwarding Agent"
              value={draft.agentPartyId}
              onChange={(agentPartyId) => update({ agentPartyId })}
              loader={opsApi.lookupParties}
              role="isAgent"
            />
            <LookupField
              label="Customs Broker"
              value={draft.brokerPartyId}
              onChange={(brokerPartyId) => update({ brokerPartyId })}
              loader={opsApi.lookupParties}
              role="isBroker"
            />
            <LookupField
              label="Bill to Account"
              value={draft.billToPartyId}
              onChange={(billToPartyId) => update({ billToPartyId })}
              loader={opsApi.lookupParties}
              role="isCustomer"
            />
          </FormSection>

          <FormSection
            title="Vessel &amp; Ocean Routing"
            description="Shipping line carrier, vessel, voyage, seaport UN/LOCODEs and terminal cutoffs."
          >
            <LookupField
              label="Shipping Line / Carrier"
              value={draft.carrierPartyId}
              onChange={(carrierPartyId) => update({ carrierPartyId })}
              loader={opsApi.lookupParties}
              role="isCarrier"
            />

            <FormField label="Carrier Booking Ref">
              <Input
                value={draft.carrierBookingRef || ''}
                onChange={(e) => update({ carrierBookingRef: e.target.value.toUpperCase() })}
                placeholder="MSK-9021840"
                className="font-mono uppercase"
              />
            </FormField>

            <FormField label="Customer Ref / PO">
              <Input
                value={draft.customerRef || ''}
                onChange={(e) => update({ customerRef: e.target.value })}
                placeholder="PO-2026-4401"
              />
            </FormField>

            <FormField label="Ocean Vessel Name" required>
              <Input
                value={draft.vessel || ''}
                onChange={(e) => update({ vessel: e.target.value.toUpperCase() })}
                placeholder="MAERSK MC-KINNEY MOLLER"
                className="font-medium uppercase"
              />
            </FormField>

            <FormField label="Voyage #" required>
              <Input
                value={draft.voyage || ''}
                onChange={(e) => update({ voyage: e.target.value.toUpperCase() })}
                placeholder="2408W"
                className="font-mono uppercase"
              />
            </FormField>

            <LookupField
              label="Port of Loading (POL)"
              value={draft.polCode}
              onChange={(polCode) => update({ polCode })}
              loader={(q) => opsApi.lookupPorts(q, 'SEA')}
            />

            <LookupField
              label="Port of Discharge (POD)"
              value={draft.podCode}
              onChange={(podCode) => update({ podCode })}
              loader={(q) => opsApi.lookupPorts(q, 'SEA')}
            />

            <FormField label="Place of Receipt">
              <Input
                value={draft.placeOfReceipt || ''}
                onChange={(e) => update({ placeOfReceipt: e.target.value })}
                placeholder="Manila South Harbor CY"
              />
            </FormField>

            <FormField label="Final Destination">
              <Input
                value={draft.finalDestination || ''}
                onChange={(e) => update({ finalDestination: e.target.value })}
                placeholder="Singapore Port Gateway"
              />
            </FormField>

            <FormField label="Estimated Departure (ETD)">
              <Input
                type="date"
                value={toDateInput(draft.etd)}
                onChange={(e) => update({ etd: fromDateInput(e.target.value) })}
              />
            </FormField>

            <FormField label="Estimated Arrival (ETA)">
              <Input
                type="date"
                value={toDateInput(draft.eta)}
                onChange={(e) => update({ eta: fromDateInput(e.target.value) })}
              />
            </FormField>

            <FormField label="CY Cutoff (Container Gate)">
              <Input
                type="datetime-local"
                value={draft.cargoCutoff?.slice(0, 16) || ''}
                onChange={(e) => update({ cargoCutoff: e.target.value ? new Date(e.target.value).toISOString() : null })}
              />
            </FormField>

            <FormField label="SI / Doc Cutoff (Shipping Inst)">
              <Input
                type="datetime-local"
                value={draft.docCutoff?.slice(0, 16) || ''}
                onChange={(e) => update({ docCutoff: e.target.value ? new Date(e.target.value).toISOString() : null })}
              />
            </FormField>
          </FormSection>

          <FormSection
            title="Ocean Trade Terms &amp; Cargo Particulars"
            description="Incoterms, freight terms, load type (FCL/LCL) and cargo details."
          >
            <FormField label="Service / Load Type">
              <OptionsSelect
                value={draft.loadType || 'FCL'}
                options={LOAD_TYPES}
                onChange={(loadType) => update({ loadType })}
              />
            </FormField>

            <FormField label="Incoterm">
              <OptionsSelect
                value={draft.incoterm || 'FOB'}
                options={INCOTERMS}
                onChange={(incoterm) => update({ incoterm })}
              />
            </FormField>

            <FormField label="Freight Payment Term">
              <OptionsSelect
                value={draft.freightTerm || 'PREPAID'}
                options={FREIGHT_TERMS}
                onChange={(freightTerm) => update({ freightTerm })}
              />
            </FormField>

            <FormField label="Commodity / Cargo Title">
              <Input
                value={draft.commodity || ''}
                onChange={(e) => update({ commodity: e.target.value })}
                placeholder="e.g. Industrial Machinery and Components"
              />
            </FormField>

            <div className="sm:col-span-2 lg:col-span-3">
              <FormField label="Goods Description &amp; Marks">
                <Textarea
                  value={draft.goodsDescription || ''}
                  onChange={(e) => update({ goodsDescription: e.target.value })}
                  placeholder="Full goods description as specified on ocean bill of lading..."
                  rows={2}
                />
              </FormField>
            </div>
          </FormSection>
        </>
      )}

      {/* Straightforward Stage Forwarder */}
      {onNext && (
        <div className="flex justify-end pt-3 border-t">
          <Button onClick={onNext} className="gap-2 shadow-xs">
            Next: {isDomestic ? 'Cargo Manifest' : isAir ? 'Air Cargo Specs' : 'Cargo Specs'}
            <ArrowRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

export function ImportTab({
  draft,
  update,
  disabled,
  onNext,
}: {
  draft: Partial<Shipment>
  update: (patch: Partial<Shipment>) => void
  disabled: boolean
  onNext?: () => void
}) {
  if (disabled)
    return (
      <EmptyState
        title="Customs import info is only required for import files"
        description="Export and domestic files skip Bureau of Customs entry and pier availability fields."
      />
    )

  return (
    <div className="space-y-4">
      <FormSection
        title="Import Filing &amp; Bureau of Customs (BOC)"
        description="Entry number, registry number, IT/GO references and cargo terminal release status."
      >
        <FormField label="Customs Entry #" hint="BOC official import entry number">
          <Input
            value={draft.entryNo || ''}
            onChange={(e) => update({ entryNo: e.target.value.toUpperCase() })}
            placeholder="C-2026-00918"
            className="font-mono uppercase"
          />
        </FormField>
        <FormField label="Entry Date">
          <Input
            type="date"
            value={toDateInput(draft.entryDate)}
            onChange={(e) => update({ entryDate: fromDateInput(e.target.value) })}
          />
        </FormField>
        <FormField label="IT / Transit #" hint="In-Transit permit number">
          <Input
            value={draft.itNo || ''}
            onChange={(e) => update({ itNo: e.target.value.toUpperCase() })}
            placeholder="IT-4491"
            className="font-mono uppercase"
          />
        </FormField>
        <FormField label="IT Date">
          <Input
            type="date"
            value={toDateInput(draft.itDate)}
            onChange={(e) => update({ itDate: fromDateInput(e.target.value) })}
          />
        </FormField>
        <FormField label="GO # / Pier Reg">
          <Input
            value={draft.goNo || ''}
            onChange={(e) => update({ goNo: e.target.value.toUpperCase() })}
            placeholder="GO-1092"
            className="font-mono uppercase"
          />
        </FormField>
        <FormField label="Cargo Available Date">
          <Input
            type="date"
            value={toDateInput(draft.availableDate)}
            onChange={(e) => update({ availableDate: fromDateInput(e.target.value) })}
          />
        </FormField>
        <FormField label="Free Time Expires" hint="Demurrage / Detention cutoff">
          <Input
            type="date"
            value={toDateInput(draft.freeTimeExpires)}
            onChange={(e) => update({ freeTimeExpires: fromDateInput(e.target.value) })}
          />
        </FormField>
        <LookupField
          label="Customs Bonded Warehouse"
          value={draft.cargoLocationPartyId}
          onChange={(cargoLocationPartyId) => update({ cargoLocationPartyId })}
          loader={opsApi.lookupParties}
          role="isWarehouse"
        />
        <FormField label="BOC Customs Status">
          <Input
            value={draft.customsStatus || ''}
            onChange={(e) => update({ customsStatus: e.target.value.toUpperCase() })}
            placeholder="CLEARED / PAID / HOLD"
            className="font-mono uppercase"
          />
        </FormField>
      </FormSection>

      {onNext && (
        <div className="flex justify-end pt-3 border-t">
          <Button onClick={onNext} className="gap-2 shadow-xs">
            Next: Cargo Specifications
            <ArrowRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

export function CargoTab({
  air,
  mode: explicitMode,
  cargo,
  setCargo,
  totals,
  pasteText,
  setPasteText,
  onNext,
}: {
  air?: boolean
  mode?: WorkspaceMode | string
  cargo: CargoLine[]
  setCargo: (rows: CargoLine[]) => void
  totals: ReturnType<typeof cargoTotals>
  pasteText: string
  setPasteText: (value: string) => void
  onNext?: () => void
}) {
  const resolvedMode = (explicitMode || (air ? 'AIR' : 'OCEAN')).toUpperCase()
  const isAir = resolvedMode.includes('AIR')
  const isDomestic = resolvedMode.includes('DOMESTIC')

  const paste = () => {
    const rows = pasteText
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line, index) => {
        const [pieces, packageType, description, marks, lengthCm, widthCm, heightCm, grossKg] = line.split('\t')
        return computeCargoLine(
          {
            lineNo: index + 1,
            pieces: Number(pieces || 0),
            packageType: packageType || 'PKG',
            description: description || '',
            marks: marks || '',
            lengthCm: Number(lengthCm || 0),
            widthCm: Number(widthCm || 0),
            heightCm: Number(heightCm || 0),
            grossKg: Number(grossKg || 0),
          },
          isAir
        )
      })
    if (rows.length) {
      setCargo(rows)
      toast.success(`Imported ${rows.length} cargo lines from spreadsheet`)
    }
    setPasteText('')
  }

  return (
    <div className="space-y-4">
      {/* Informative Guidance Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-muted/40 p-3 text-xs">
        <div className="flex items-center gap-2">
          {isDomestic ? (
            <Truck className="size-4 text-primary" />
          ) : isAir ? (
            <Plane className="size-4 text-sky-500" />
          ) : (
            <Ship className="size-4 text-blue-500" />
          )}
          <span className="font-semibold text-foreground">
            {isDomestic
              ? 'Domestic Cargo Manifest'
              : isAir
              ? 'IATA Volumetric Specs (L×W×H cm ÷ 6000)'
              : 'Ocean Freight Weight & Measurement (W/M)'}
            :
          </span>
          <span className="text-muted-foreground">
            {isDomestic
              ? 'Track loose cartons, pallets, crates, gross weight and cubic volume.'
              : isAir
              ? 'Chargeable kg is greater of Gross Weight or Volumetric Weight per IATA Res 600a.'
              : 'Revenue Tons (W/M) computed as max of Metric Tons or CBM volume.'}
          </span>
        </div>
      </div>

      <EditableGrid
        rows={cargo as unknown as Row[]}
        onRowsChange={(rows) =>
          setCargo(
            (rows as unknown as CargoLine[]).map((line, index) =>
              computeCargoLine({ ...line, lineNo: index + 1 }, isAir)
            )
          )
        }
        createRow={() => newCargoLine(cargo.length + 1) as unknown as Row}
        columns={[
          { id: 'pieces', header: 'PCS', type: 'number' as const },
          { id: 'packageType', header: 'Pkg' },
          { id: 'description', header: 'Description of Goods' },
          { id: 'marks', header: 'Marks / Numbers' },
          { id: 'lengthCm', header: 'L (cm)', type: 'number' as const },
          { id: 'widthCm', header: 'W (cm)', type: 'number' as const },
          { id: 'heightCm', header: 'H (cm)', type: 'number' as const },
          { id: 'grossKg', header: 'Gross (kg)', type: 'number' as const },
          { id: 'cbm', header: 'CBM', type: 'number' as const, readOnly: true },
          ...(isAir ? [{ id: 'volumetricKg', header: 'Vol (kg)', type: 'number' as const, readOnly: true }] : []),
          {
            id: 'chargeableKg',
            header: isAir ? 'Chg kg' : isDomestic ? 'Billable' : 'W/M (Ton)',
            type: 'number' as const,
            readOnly: true,
          },
        ]}
        footer={
          <div className="flex flex-wrap items-center justify-end gap-5 text-xs">
            <span className="font-semibold text-foreground">
              Total Pieces: <span className="font-mono">{formatNumber(totals.pieces)}</span>
            </span>
            <span className="font-semibold text-foreground">
              Total Weight: <span className="font-mono">{formatWeightKg(totals.grossKg)}</span>
            </span>
            <span className="font-semibold text-foreground">
              Total Volume: <span className="font-mono">{formatCbm(totals.cbm)}</span>
            </span>
            <span className="rounded-md bg-primary/10 px-2 py-1 font-bold text-primary">
              {isAir
                ? `${formatNumber(totals.chargeableKg)} IATA Chargeable kg`
                : isDomestic
                ? `${formatWeightKg(totals.grossKg)} Gross Cargo`
                : `${formatNumber(totals.chargeableKg)} Ocean W/M Tons`}
            </span>
          </div>
        }
      />

      <FormSection
        title="Fast Import from Excel / Sheets"
        description="Copy and paste rows directly from Excel: PCS, Pkg, Description, Marks, Length, Width, Height, Gross Weight."
        defaultOpen={false}
      >
        <div className="xl:col-span-3 md:col-span-2 space-y-2">
          <Textarea
            value={pasteText}
            onChange={(event) => setPasteText(event.target.value)}
            placeholder="Paste tab-delimited cells from Excel here…"
            rows={3}
          />
          <Button variant="outline" size="sm" onClick={paste}>
            Parse pasted rows
          </Button>
        </div>
      </FormSection>

      {onNext && (
        <div className="flex justify-end pt-3 border-t">
          <Button onClick={onNext} className="gap-2 shadow-xs">
            Next: {isDomestic ? 'Delivery Receipts (DR)' : isAir ? 'Air Waybills (AWB)' : 'Container Stuffing'}
            <ArrowRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

export function ContainersTab({
  ocean,
  shipmentId,
  containers,
  setContainers,
  onNext,
}: {
  ocean: boolean
  shipmentId: string
  containers: ContainerLine[]
  setContainers: (rows: ContainerLine[]) => void
  onNext?: () => void
}) {
  if (!ocean)
    return (
      <EmptyState
        title="Containers apply to Ocean freight files"
        description="Air freight and domestic trucking files manage loose and palletized cargo directly in the Cargo tab."
      />
    )

  return (
    <div className="space-y-4">
      <EditableGrid
        rows={containers as unknown as Row[]}
        onRowsChange={(rows) => setContainers(rows as unknown as ContainerLine[])}
        createRow={() => blankContainer(shipmentId) as unknown as Row}
        columns={[
          { id: 'equipmentType', header: 'Equipment' },
          { id: 'containerNo', header: 'Container #' },
          { id: 'sealNo', header: 'Seal #' },
          { id: 'tareKg', header: 'Tare kg', type: 'number' },
          { id: 'vgmKg', header: 'VGM kg', type: 'number' },
          { id: 'temperatureC', header: 'Temp °C', type: 'number' },
          { id: 'unNumbers', header: 'UN / Hazmat' },
        ]}
        footer={<span className="text-sm text-muted-foreground">Standard ISO Types: {EQUIPMENT_TYPES.join(', ')}</span>}
      />

      <div className="grid gap-2 md:grid-cols-2">
        {containers.map((line, index) => (
          <WarningText key={line.id ?? index}>{validateIso6346(line.containerNo)}</WarningText>
        ))}
      </div>

      {onNext && (
        <div className="flex justify-end pt-3 border-t">
          <Button onClick={onNext} className="gap-2 shadow-xs">
            Next: Ocean Bills of Lading (B/L)
            <ArrowRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

export function DocsTab({
  air,
  mode: explicitMode,
  draft,
  cargo = [],
  docs,
  setDocs,
  onNext,
}: {
  air?: boolean
  mode?: WorkspaceMode | string
  draft: Partial<Shipment>
  cargo?: CargoLine[]
  docs: TransportDoc[]
  setDocs: (rows: TransportDoc[]) => void
  onNext?: () => void
}) {
  const [editingDoc, setEditingDoc] = useState<TransportDoc | null>(null)
  const [editingIndex, setEditingIndex] = useState<number>(-1)
  const [deletingDoc, setDeletingDoc] = useState<{ doc: TransportDoc; index: number } | null>(null)

  const resolvedMode = (explicitMode || draft.mode || (air ? 'AIR' : 'OCEAN')).toUpperCase()
  const isDomestic = resolvedMode.includes('DOMESTIC')
  const isAir = !isDomestic && resolvedMode.includes('AIR')

  const createPrimary = () => {
    const next = blankDoc(draft, isDomestic ? 'DOMESTIC' : isAir ? 'AIR' : 'OCEAN')
    setDocs([...docs, next])
    setEditingDoc(next)
    setEditingIndex(docs.length)
    toast.success(
      isDomestic
        ? 'Created draft Delivery Receipt (DR)'
        : isAir
        ? 'Created draft House Air Waybill (HAWB)'
        : 'Created draft House Bill of Lading (HBL)'
    )
  }

  const createSecondary = () => {
    const next: TransportDoc = {
      ...blankDoc(draft, isDomestic ? 'DOMESTIC' : isAir ? 'AIR' : 'OCEAN'),
      docClass: 'MASTER',
      docType: isDomestic ? 'WAYBILL' : isAir ? 'AWB' : 'BL',
    }
    setDocs([...docs, next])
    setEditingDoc(next)
    setEditingIndex(docs.length)
    toast.success(
      isDomestic
        ? 'Created draft Inland Waybill'
        : isAir
        ? 'Created draft Master Air Waybill (MAWB)'
        : 'Created draft Master Bill of Lading (MBL)'
    )
  }

  const syncFromShipment = (index: number) => {
    const current = docs[index]
    if (!current) return
    const updated: TransportDoc = {
      ...current,
      shipperName: draft.shipperName || current.shipperName,
      shipperAddress: draft.shipperAddress || draft.placeOfReceipt || current.shipperAddress,
      consigneeName: draft.consigneeName || current.consigneeName,
      consigneeAddress: draft.consigneeAddress || draft.finalDestination || current.consigneeAddress,
      notifyName: draft.notifyName || current.notifyName,
      notifyAddress: draft.notifyAddress || current.notifyAddress,
      pol: draft.polCode || current.pol,
      pod: draft.podCode || current.pod,
      freightTerm: draft.freightTerm || current.freightTerm,
    }
    setDocs(docs.map((d, i) => (i === index ? updated : d)))
    if (editingIndex === index) setEditingDoc(updated)
    toast.success('Synced party & route details from shipment')
  }

  const issueDoc = async (doc: TransportDoc, index: number) => {
    if (!doc.id) {
      toast.error('Please save the file first before issuing this document.')
      return
    }
    if (isAir && doc.docNo) {
      const err = validateMawb(doc.docNo)
      if (err) {
        toast.warning(`MAWB note: ${err}`)
      }
    }
    try {
      const updated = await opsApi.issueTransportDoc(doc.id)
      toast.success(`${updated.docNo || 'Transport document'} issued successfully`)
      setDocs(docs.map((d, i) => (i === index ? updated : d)))
    } catch (e) {
      toast.error(apiErrorMessage(e))
    }
  }

  const voidDoc = async (doc: TransportDoc, index: number) => {
    if (doc.id) {
      try {
        const updated = await opsApi.updateTransportDoc(doc.id, { status: 'VOID' })
        setDocs(docs.map((d, i) => (i === index ? updated : d)))
        toast.success(`Marked ${doc.docNo || 'document'} as VOID`)
      } catch (e) {
        toast.error(apiErrorMessage(e))
      }
    } else {
      setDocs(docs.map((d, i) => (i === index ? { ...d, status: 'VOID' } : d)))
      toast.success('Marked draft as VOID')
    }
  }

  const duplicateDoc = (doc: TransportDoc) => {
    const copy: TransportDoc = {
      ...doc,
      id: undefined,
      docNo: doc.docNo ? `${doc.docNo}-COPY` : '',
      status: 'DRAFT',
      issueDate: null,
      version: undefined,
    }
    setDocs([...docs, copy])
    toast.success('Document duplicated as new draft')
  }

  const confirmDelete = async () => {
    if (!deletingDoc) return
    const { doc, index } = deletingDoc
    try {
      if (doc.id) {
        await opsApi.deleteTransportDoc(doc.id)
        toast.success(`Deleted ${doc.docNo || 'document'}`)
      } else {
        toast.info('Draft transport document removed')
      }
      setDocs(docs.filter((_, i) => i !== index))
      setDeletingDoc(null)
    } catch (e) {
      toast.error(apiErrorMessage(e))
    }
  }

  const printDoc = (doc: TransportDoc) => {
    try {
      openPrintWindow(doc.docNo || 'Transport Document', transportDocPrintHtml(doc, draft, cargo))
    } catch (e) {
      toast.error(apiErrorMessage(e))
    }
  }

  const saveEditedDoc = () => {
    if (!editingDoc || editingIndex < 0) return
    setDocs(docs.map((d, i) => (i === editingIndex ? editingDoc : d)))
    setEditingDoc(null)
    setEditingIndex(-1)
    toast.success('Transport document details updated in draft')
  }

  return (
    <div className="space-y-4">
      {/* Top Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {isDomestic ? (
            <>
              <Button onClick={createPrimary} size="sm">
                <Plus className="size-4" />
                New Delivery Receipt (DR)
              </Button>
              <Button onClick={createSecondary} variant="outline" size="sm">
                <Plus className="size-4" />
                New Inland Waybill
              </Button>
            </>
          ) : isAir ? (
            <>
              <Button onClick={createPrimary} size="sm">
                <Plus className="size-4" />
                New House AWB (HAWB)
              </Button>
              <Button onClick={createSecondary} variant="outline" size="sm">
                <Plus className="size-4" />
                New Master AWB (MAWB)
              </Button>
            </>
          ) : (
            <>
              <Button onClick={createPrimary} size="sm">
                <Plus className="size-4" />
                New House B/L (HBL)
              </Button>
              <Button onClick={createSecondary} variant="outline" size="sm">
                <Plus className="size-4" />
                New Master B/L (MBL)
              </Button>
            </>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {docs.length} {isDomestic ? 'delivery receipt' : isAir ? 'air waybill' : 'bill of lading'}
          {docs.length === 1 ? '' : 's'} linked to this file
        </div>
      </div>

      {/* Document Cards List */}
      {docs.length === 0 ? (
        <EmptyState
          title={
            isDomestic
              ? 'No Delivery Receipts (DR) created yet'
              : isAir
              ? 'No Air Waybills (AWB) created yet'
              : 'No Bills of Lading (B/L) created yet'
          }
          description={
            isDomestic
              ? 'Click "New Delivery Receipt (DR)" to generate an official proof of delivery document with plate #, driver credentials, and dual signatures.'
              : isAir
              ? 'Click "New House AWB" to generate an IATA Resolution 600a compliant air waybill with Mod-7 validation.'
              : 'Click "New House B/L" to create an ocean bill of lading populated with vessel, voyage, and container particulars.'
          }
          action={
            <Button onClick={createPrimary}>
              <Plus className="size-4" />
              {isDomestic ? 'Create Delivery Receipt' : isAir ? 'Create Air Waybill' : 'Create Bill of Lading'}
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {docs.map((doc, index) => {
            const isDocAir = doc.docType === 'AWB' || isAir
            const isDocDomestic = doc.docType === 'DR' || doc.docType === 'WAYBILL' || isDomestic
            const mawbCheck = isDocAir && doc.docNo ? validateMawb(doc.docNo) : null
            const isDraft = !doc.status || doc.status === 'DRAFT'
            const isIssued = doc.status === 'ISSUED'
            const isVoid = doc.status === 'VOID'

            return (
              <div
                key={doc.id || index}
                className="group relative rounded-xl border bg-card p-4 shadow-xs transition-all duration-200 hover:border-primary/40 hover:shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {/* Left info */}
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        status={
                          isDocDomestic
                            ? doc.docType === 'DR'
                              ? 'DELIVERY RECEIPT'
                              : 'WAYBILL'
                            : doc.docClass || 'HOUSE'
                        }
                        tone={doc.docClass === 'MASTER' ? 'accent' : 'info'}
                      />
                      <Badge
                        status={doc.status || 'DRAFT'}
                        tone={isIssued ? 'success' : isVoid ? 'danger' : 'neutral'}
                      />
                      <span className="font-mono text-sm font-bold tracking-tight text-foreground">
                        {doc.docNo || <span className="italic text-muted-foreground">Unnumbered draft</span>}
                      </span>
                    </div>

                    <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <span className="font-semibold text-foreground/80">
                          {isDocDomestic ? 'Origin Plant: ' : 'Shipper: '}
                        </span>
                        <span className="truncate">{doc.shipperName || draft.shipperName || '—'}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-foreground/80">
                          {isDocDomestic ? 'Drop-off Site: ' : 'Consignee: '}
                        </span>
                        <span className="truncate">{doc.consigneeName || draft.consigneeName || '—'}</span>
                      </div>
                      {isDocDomestic ? (
                        <>
                          <div>
                            <span className="font-semibold text-foreground/80">Truck Plate: </span>
                            <span className="font-mono font-bold text-foreground">{draft.vessel || '—'}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-foreground/80">Driver: </span>
                            <span>{draft.flightNo || '—'}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <span className="font-semibold text-foreground/80">Term: </span>
                            <span>{doc.freightTerm || draft.freightTerm || 'PREPAID'}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-foreground/80">Route: </span>
                            <span>
                              {doc.pol || draft.polCode || '—'} → {doc.pod || draft.podCode || '—'}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* MAWB format validation badge */}
                    {isDocAir && doc.docNo && (
                      <div className="pt-0.5">
                        {mawbCheck ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="size-3" />
                            {mawbCheck}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="size-3" />
                            Valid IATA MAWB Mod-7 check digit
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Tools & Actions */}
                  <div className="flex flex-wrap items-center gap-1.5 sm:self-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingDoc({ ...doc })
                        setEditingIndex(index)
                      }}
                      title="Edit particulars"
                    >
                      <Edit2 className="size-3.5" />
                      Edit
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => printDoc(doc)}
                      title={
                        isDocDomestic
                          ? 'Print Philippine Delivery Receipt'
                          : isDocAir
                          ? 'Print IATA Air Waybill'
                          : 'Print Ocean Bill of Lading'
                      }
                    >
                      <Printer className="size-3.5" />
                      Print
                    </Button>

                    {isDraft && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => issueDoc(doc, index)}
                        title="Issue document"
                      >
                        <CheckCircle2 className="size-3.5" />
                        Issue
                      </Button>
                    )}

                    {isIssued && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => voidDoc(doc, index)}
                        className="text-amber-600 hover:text-amber-700 dark:text-amber-400"
                        title="Mark document as void"
                      >
                        <Ban className="size-3.5" />
                        Void
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => duplicateDoc(doc)}
                      title="Duplicate as new draft"
                    >
                      <Copy className="size-3.5" />
                      Clone
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingDoc({ doc, index })}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      title="Delete transport document"
                    >
                      <Trash2 className="size-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Edit Transport Document Full Sheet */}
      <Sheet
        open={Boolean(editingDoc)}
        onOpenChange={(open) => {
          if (!open) setEditingDoc(null)
        }}
      >
        <SheetContent
          title={
            isDomestic
              ? 'Edit Delivery Receipt & Waybill Particulars'
              : isAir
              ? 'Edit IATA Air Waybill Particulars'
              : 'Edit Ocean Bill of Lading Particulars'
          }
          description={
            isDomestic
              ? 'Philippine commercial logistics delivery receipt with asset plate and driver authorization.'
              : isAir
              ? 'Complete IATA Resolution 600a compliant document particulars.'
              : 'FIATA/Carrier standard ocean bill of lading particulars.'
          }
          className="overflow-y-auto sm:max-w-2xl"
        >
          {editingDoc && (
            <div className="space-y-4 pt-2">
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={() => syncFromShipment(editingIndex)}>
                  Autofill from shipment file
                </Button>
              </div>

              <FormSection
                title="Document Identification"
                description="Class, number, terms, and release format."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label="Document Class" required>
                    <Select
                      value={editingDoc.docClass || 'HOUSE'}
                      onValueChange={(val) => setEditingDoc({ ...editingDoc, docClass: val })}
                      options={
                        isDomestic
                          ? [
                              { value: 'HOUSE', label: 'Direct Delivery Receipt (DR)' },
                              { value: 'MASTER', label: 'Carrier Trip Waybill' },
                            ]
                          : [
                              { value: 'HOUSE', label: 'HOUSE (Direct client)' },
                              { value: 'MASTER', label: 'MASTER (Carrier direct)' },
                            ]
                      }
                    />
                  </FormField>

                  <FormField label="Document Type" required>
                    <Select
                      value={editingDoc.docType || (isDomestic ? 'DR' : isAir ? 'AWB' : 'BL')}
                      onValueChange={(val) => setEditingDoc({ ...editingDoc, docType: val })}
                      options={
                        isDomestic
                          ? [
                              { value: 'DR', label: 'DR (Delivery Receipt)' },
                              { value: 'WAYBILL', label: 'Waybill (Trip Waybill)' },
                            ]
                          : [
                              { value: 'AWB', label: 'AWB (Air Waybill)' },
                              { value: 'BL', label: 'B/L (Bill of Lading)' },
                            ]
                      }
                    />
                  </FormField>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField
                    label="Document Number"
                    required
                    hint={
                      isAir
                        ? 'Format: 079-12345675 (3 airline prefix + 7 serial + mod-7)'
                        : isDomestic
                        ? 'e.g. DR-2026-0042'
                        : undefined
                    }
                  >
                    <Input
                      value={editingDoc.docNo || ''}
                      onChange={(e) => setEditingDoc({ ...editingDoc, docNo: e.target.value.toUpperCase() })}
                      placeholder={isAir ? '079-12345675' : isDomestic ? 'DR-2026-0042' : 'HBL-2026-00001'}
                    />
                  </FormField>

                  <FormField label="Freight Payment Term">
                    <Select
                      value={editingDoc.freightTerm || 'PREPAID'}
                      onValueChange={(val) => setEditingDoc({ ...editingDoc, freightTerm: val })}
                      options={FREIGHT_TERMS.map((t) => ({ value: t, label: t }))}
                    />
                  </FormField>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <FormField label="Issue Place">
                    <Input
                      value={editingDoc.issuePlace || ''}
                      onChange={(e) => setEditingDoc({ ...editingDoc, issuePlace: e.target.value })}
                      placeholder="MANILA, PH"
                    />
                  </FormField>

                  <FormField label="Release Type">
                    <Select
                      value={editingDoc.releaseType || 'ORIGINAL'}
                      onValueChange={(val) => setEditingDoc({ ...editingDoc, releaseType: val })}
                      options={[
                        { value: 'ORIGINAL', label: 'Original Paper' },
                        { value: 'TELEX', label: 'Telex / Express' },
                        { value: 'SEA_WAYBILL', label: 'Sea Waybill' },
                      ]}
                    />
                  </FormField>

                  <FormField label="Originals Count">
                    <NumberInput
                      value={editingDoc.numberOfOriginals ?? (isDomestic ? 2 : 3)}
                      onValueChange={(val) => setEditingDoc({ ...editingDoc, numberOfOriginals: val })}
                    />
                  </FormField>
                </div>
              </FormSection>

              <FormSection
                title={isDomestic ? 'Origin Plant &amp; Destination Site' : 'Shipper &amp; Consignee'}
                description="Registered names and facility addresses as shown on physical document."
              >
                <FormField label={isDomestic ? 'Shipper / Origin Plant' : 'Shipper Name'} required>
                  <Input
                    value={editingDoc.shipperName || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, shipperName: e.target.value })}
                  />
                </FormField>
                <FormField label={isDomestic ? 'Pick-up Facility Address' : 'Shipper Address'}>
                  <Textarea
                    value={editingDoc.shipperAddress || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, shipperAddress: e.target.value })}
                    rows={2}
                  />
                </FormField>

                <FormField label={isDomestic ? 'Consignee / Recipient Facility' : 'Consignee Name'} required>
                  <Input
                    value={editingDoc.consigneeName || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, consigneeName: e.target.value })}
                  />
                </FormField>
                <FormField label={isDomestic ? 'Delivery Site Address' : 'Consignee Address'}>
                  <Textarea
                    value={editingDoc.consigneeAddress || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, consigneeAddress: e.target.value })}
                    rows={2}
                  />
                </FormField>
              </FormSection>

              <FormSection
                title={isDomestic ? 'Corridor &amp; Fleet Particulars' : 'Routing &amp; Carrier Details'}
                defaultOpen={false}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label={isAir ? 'Airport of Departure' : isDomestic ? 'Pick-up Corridor' : 'Port of Loading (POL)'}>
                    <Input
                      value={editingDoc.pol || ''}
                      onChange={(e) => setEditingDoc({ ...editingDoc, pol: e.target.value.toUpperCase() })}
                    />
                  </FormField>
                  <FormField label={isAir ? 'Airport of Destination' : isDomestic ? 'Delivery Corridor' : 'Port of Discharge (POD)'}>
                    <Input
                      value={editingDoc.pod || ''}
                      onChange={(e) => setEditingDoc({ ...editingDoc, pod: e.target.value.toUpperCase() })}
                    />
                  </FormField>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <FormField label="Declared Value Carriage">
                    <MoneyInput
                      value={editingDoc.declaredValueCarriage || 0}
                      onValueChange={(val) => setEditingDoc({ ...editingDoc, declaredValueCarriage: val })}
                    />
                  </FormField>
                  <FormField label="Declared Value Customs">
                    <MoneyInput
                      value={editingDoc.declaredValueCustoms || 0}
                      onValueChange={(val) => setEditingDoc({ ...editingDoc, declaredValueCustoms: val })}
                    />
                  </FormField>
                  <FormField label="Insurance Amount">
                    <MoneyInput
                      value={editingDoc.amountInsurance || 0}
                      onValueChange={(val) => setEditingDoc({ ...editingDoc, amountInsurance: val })}
                    />
                  </FormField>
                </div>

                <FormField label="Special Handling / Gate Instructions">
                  <Textarea
                    value={editingDoc.handlingInfo || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, handlingInfo: e.target.value })}
                    placeholder={
                      isDomestic
                        ? 'e.g. PPE required, tail-lift needed, confirm with receiving dock.'
                        : 'e.g. KEEP DRY, DO NOT STACK, 24HR NOTIFY'
                    }
                    rows={2}
                  />
                </FormField>
                <FormField label="Accounting Information">
                  <Textarea
                    value={editingDoc.accountingInfo || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, accountingInfo: e.target.value })}
                    placeholder="e.g. FREIGHT PREPAID VIA MANILA HEAD OFFICE"
                    rows={2}
                  />
                </FormField>
              </FormSection>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setEditingDoc(null)}>
                  Cancel
                </Button>
                <Button onClick={saveEditedDoc}>Apply Changes</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deletingDoc)}
        onOpenChange={(open) => {
          if (!open) setDeletingDoc(null)
        }}
        title="Delete Transport Document"
        description={`Are you sure you want to delete ${
          deletingDoc?.doc.docNo || 'this transport document'
        }? This action cannot be undone.`}
        onConfirm={() => void confirmDelete()}
      />

      {onNext && (
        <div className="flex justify-end pt-3 border-t">
          <Button onClick={onNext} className="gap-2 shadow-xs">
            Next: Charges &amp; Margin
            <ArrowRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

export function ChargesTab({ draft, air, cargo, containers, charges, setCharges, applyTariffs, loading, totals }: { draft: Partial<Shipment>; air: boolean; cargo: CargoLine[]; containers: ContainerLine[]; charges: ChargeLine[]; setCharges: (rows: ChargeLine[]) => void; applyTariffs: () => void; loading: boolean; totals: { bill: number; cost: number; profit: number; margin: number } }) {
  return <div className="space-y-4"><Toolbar className="mb-0"><LookupField label="Billing code" loader={opsApi.lookupBillingCodes} onChange={(code, item) => setCharges([...charges, computeChargeLine({ ...blankCharge(charges.length), billingCode: code, description: String(item?.raw?.description ?? ''), unit: String(item?.raw?.defaultUnit ?? 'PER_SHPT'), rate: Number(item?.raw?.defaultRate ?? 0), costRate: Number(item?.raw?.defaultCost ?? 0), currency: String(item?.raw?.currency ?? 'PHP'), vatClass: String(item?.raw?.vatClass ?? 'VATABLE') }, draft, cargo, containers, air)])} /><Button onClick={applyTariffs} loading={loading}><Wand2 className="size-4" />Apply tariffs</Button></Toolbar>
    <EditableGrid rows={charges as unknown as Row[]} onRowsChange={(rows) => setCharges((rows as unknown as ChargeLine[]).map((line) => computeChargeLine(line, draft, cargo, containers, air)))} createRow={() => blankCharge(charges.length) as unknown as Row} columns={[{ id: 'billingCode', header: 'Code' }, { id: 'description', header: 'Description' }, { id: 'unit', header: 'Basis' }, { id: 'qty', header: 'Qty', type: 'number', readOnly: true }, { id: 'rate', header: 'Rate', type: 'money' }, { id: 'amountPhp', header: 'Bill PHP', type: 'money', readOnly: true }, { id: 'billParty', header: 'Bill party' }, { id: 'freightTerm', header: 'Term' }, { id: 'costRate', header: 'Cost rate', type: 'money' }, { id: 'costAmountPhp', header: 'Cost PHP', type: 'money', readOnly: true }, { id: 'billStatus', header: 'Bill status', readOnly: true }, { id: 'costStatus', header: 'Cost status', readOnly: true }]} footer={<div className="flex flex-wrap items-center justify-end gap-4"><span>Bill <MoneyValue value={totals.bill} /></span><span>Cost <MoneyValue value={totals.cost} /></span><span>Profit <MoneyValue value={totals.profit} /></span><MarginBadge bill={totals.bill} cost={totals.cost} /></div>} />
    <FormSection title="Charge defaults" defaultOpen={false}><FormField label="Unit list"><OptionsSelect value={charges[0]?.unit} options={CHARGE_UNITS} onChange={(unit) => setCharges(charges.map((line, index) => index === 0 ? { ...line, unit } : line))} /></FormField><FormField label="VAT class"><OptionsSelect value={charges[0]?.vatClass} options={VAT_CLASSES} onChange={(vatClass) => setCharges(charges.map((line, index) => index === 0 ? { ...line, vatClass } : line))} /></FormField><FormField label="Bill total"><Input readOnly value={formatMoney(totals.bill)} className="font-mono" /></FormField></FormSection></div>
}

export function TimelineTab({ events, milestone, setMilestone, add, status }: { events: { id: string; code: string; eventAt?: string; createdAt?: string; location?: string; notes?: string }[]; milestone: { code: string; location: string; notes: string; isPublic: boolean }; setMilestone: (next: { code: string; location: string; notes: string; isPublic: boolean }) => void; add: () => void; status: (value: string) => void }) {
  return <div className="grid gap-4 xl:grid-cols-[1fr_22rem]"><Timeline items={events.map((event) => ({ id: event.id, title: `${event.code}${event.location ? ` · ${event.location}` : ''}`, time: formatDate(event.eventAt || event.createdAt), description: event.notes, tone: event.code === 'EXC' ? 'danger' : 'info' }))} /><div className="space-y-3"><FormField label="Next status"><Select placeholder="Set status" options={STATUS_STEPS.map((s) => ({ value: s, label: s }))} onValueChange={status} /></FormField><FormField label="Milestone code"><Input value={milestone.code} onChange={(event) => setMilestone({ ...milestone, code: event.target.value.toUpperCase() })} /></FormField><FormField label="Location"><Input value={milestone.location} onChange={(event) => setMilestone({ ...milestone, location: event.target.value })} /></FormField><FormField label="Notes"><Textarea value={milestone.notes} onChange={(event) => setMilestone({ ...milestone, notes: event.target.value })} /></FormField><Button onClick={add}>Add milestone</Button></div></div>
}

export function DocumentsTab({ air, print }: { air: boolean; print: (kind: string) => void }) {
  const kinds = docKinds.filter((kind) => air ? kind !== 'hbl' : kind !== 'awb')
  return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{kinds.map((kind) => <Button key={kind} variant="outline" className="justify-start" onClick={() => print(kind)}><Printer className="size-4" />{kind.replace(/-/g, ' ')}</Button>)}</div>
}

export function AccountingTab({ fileId, generateInvoices, generateAp, loading }: { fileId?: string; generateInvoices: () => void; generateAp: () => void; loading: boolean }) {
  const navigate = useNavigate()
  return <div className="grid gap-4 md:grid-cols-3"><Button onClick={generateInvoices} loading={loading}>Generate invoices</Button><Button onClick={generateAp} loading={loading} variant="outline">Generate AP bills</Button><Button variant="outline" onClick={() => navigate(`/billing/invoices?id=${fileId || ''}`)}><FileText className="size-4" />Open billing</Button></div>
}

export function CloseTab({ status, openClose, reopenReason, setReopenReason, reopen }: { status?: string; openClose: () => void; reopenReason: string; setReopenReason: (value: string) => void; reopen: () => void }) {
  return <div className="space-y-4"><Button onClick={openClose} disabled={status === 'CLOSED'}>Run close check</Button><FormSection title="Reopen closed file" defaultOpen={status === 'CLOSED'}><FormField label="Reopen reason"><Textarea value={reopenReason} onChange={(event) => setReopenReason(event.target.value)} /></FormField><div className="flex items-end"><Button variant="outline" onClick={reopen} disabled={status !== 'CLOSED' || !reopenReason.trim()}>Reopen</Button></div></FormSection></div>
}

export function AuditTab({ draft }: { draft: Partial<Shipment> }) {
  return <div className="grid gap-3 text-sm md:grid-cols-2"><div><span className="text-muted-foreground">Created</span><p>{formatDate(draft.createdAt)}</p></div><div><span className="text-muted-foreground">Updated</span><p>{formatDate(draft.updatedAt)}</p></div><div><span className="text-muted-foreground">Version</span><p className="font-mono">{draft.version ?? '—'}</p></div><div><span className="text-muted-foreground">Closed</span><p>{formatDate(draft.closedAt)}</p></div><div className="md:col-span-2"><span className="text-muted-foreground">Remarks</span><p>{draft.remarks || '—'}</p></div></div>
}
