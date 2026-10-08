import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { AlertTriangle, Ban, CheckCircle2, Copy, Edit2, FileText, Plus, Printer, Trash2, Wand2 } from 'lucide-react'
import { Badge, Button, ConfirmDialog, EditableGrid, EmptyState, FormField, FormSection, Input, NumberInput, MoneyInput, Select, Sheet, SheetContent, Textarea, Timeline, Toolbar } from '@/components/ui'
import { opsApi, type CargoLine, type ChargeLine, type ContainerLine, type Shipment, type TransportDoc } from '@/api/ops'
import { formatCbm, formatDate, formatMoney, formatNumber, formatWeightKg } from '@/lib/format'
import { apiErrorMessage, cargoTotals, CHARGE_UNITS, computeCargoLine, computeChargeLine, EQUIPMENT_TYPES, FREIGHT_TERMS, fromDateInput, INCOTERMS, LOAD_TYPES, newCargoLine, STATUS_STEPS, toDateInput, validateIso6346, validateMawb, VAT_CLASSES } from '../utils'
import { LookupField, MarginBadge, MoneyValue, NumberValue, OptionsSelect, WarningText } from './common'
import { openPrintWindow, transportDocPrintHtml } from './print'

type Row = Record<string, unknown>
const docKinds = ['booking-confirmation', 'hbl', 'awb', 'arrival-notice', 'delivery-order', 'manifest', 'cargo-release']

function blankContainer(shipmentId: string): ContainerLine {
  return { shipmentId, equipmentType: '20GP', containerNo: '', sealNo: '', tareKg: 0, vgmKg: 0, temperatureC: null, hazmat: false, unNumbers: '', status: 'EMPTY' }
}

function blankCharge(index: number): ChargeLine {
  return { billingCode: 'MISC', description: '', chargeSide: 'BOTH', freightTerm: 'PREPAID', billParty: 'SHIPPER', unit: 'PER_SHPT', qty: 1, rate: 0, minAmount: 0, currency: 'PHP', exchangeRate: 1, amount: 0, amountPhp: 0, vatClass: 'VATABLE', showOnDoc: true, costQty: 1, costRate: 0, costCurrency: 'PHP', costExchangeRate: 1, costAmount: 0, costAmountPhp: 0, billStatus: 'OPEN', costStatus: 'OPEN', sortOrder: index }
}

function blankDoc(shipment: Partial<Shipment>, air: boolean): TransportDoc {
  return { shipmentId: String(shipment.id), docType: air ? 'AWB' : 'BL', docClass: 'HOUSE', docNo: '', freightTerm: shipment.freightTerm || 'PREPAID', numberOfOriginals: 3, releaseType: 'ORIGINAL', shipperName: shipment.shipperName, shipperAddress: shipment.shipperAddress, consigneeName: shipment.consigneeName, consigneeAddress: shipment.consigneeAddress, notifyName: shipment.notifyName, notifyAddress: shipment.notifyAddress, pol: shipment.polCode, pod: shipment.podCode, status: 'DRAFT' }
}

export function GeneralTab({ draft, air, update }: { draft: Partial<Shipment>; air: boolean; update: (patch: Partial<Shipment>) => void }) {
  const portKind = air ? 'AIR' : 'SEA'
  return <div className="space-y-4">
    <FormSection title="Parties" description="Snapshots are captured from the party directory for document printing.">
      <LookupField label="Shipper" value={draft.shipperPartyId} display={draft.shipperName} onChange={(id, item) => update({ shipperPartyId: id, shipperName: item?.label, shipperAddress: String(item?.raw?.address ?? '') })} loader={opsApi.lookupParties} role="isShipper" />
      <LookupField label="Consignee" value={draft.consigneePartyId} display={draft.consigneeName} onChange={(id, item) => update({ consigneePartyId: id, consigneeName: item?.label, consigneeAddress: String(item?.raw?.address ?? '') })} loader={opsApi.lookupParties} role="isConsignee" />
      <LookupField label="Notify" value={draft.notifyPartyId} display={draft.notifyName} onChange={(id, item) => update({ notifyPartyId: id, notifyName: item?.label, notifyAddress: String(item?.raw?.address ?? '') })} loader={opsApi.lookupParties} role="isNotify" />
      <LookupField label="Agent" value={draft.agentPartyId} onChange={(agentPartyId) => update({ agentPartyId })} loader={opsApi.lookupParties} role="isAgent" />
      <LookupField label="Broker" value={draft.brokerPartyId} onChange={(brokerPartyId) => update({ brokerPartyId })} loader={opsApi.lookupParties} role="isBroker" />
      <LookupField label="Bill to" value={draft.billToPartyId} onChange={(billToPartyId) => update({ billToPartyId })} loader={opsApi.lookupParties} role="isCustomer" />
    </FormSection>
    <FormSection title="Movement" description="Carrier, routing, schedule, cutoffs and service details.">
      <FormField label="File type"><OptionsSelect value={draft.fileType} options={['DIRECT', 'CONSOLIDATION']} onChange={(fileType) => update({ fileType })} /></FormField>
      <FormField label="Load/service type"><OptionsSelect value={draft.loadType} options={LOAD_TYPES} onChange={(loadType) => update({ loadType })} /></FormField>
      <FormField label="Booking no"><Input value={draft.bookingNo || ''} onChange={(event) => update({ bookingNo: event.target.value })} /></FormField>
      <FormField label="Customer ref"><Input value={draft.customerRef || ''} onChange={(event) => update({ customerRef: event.target.value })} /></FormField>
      <LookupField label="Carrier" value={draft.carrierPartyId} onChange={(carrierPartyId) => update({ carrierPartyId })} loader={opsApi.lookupParties} role="isCarrier" />
      <FormField label={air ? 'Flight' : 'Vessel'}><Input value={air ? draft.flightNo || '' : draft.vessel || ''} onChange={(event) => air ? update({ flightNo: event.target.value }) : update({ vessel: event.target.value })} /></FormField>
      {!air && <FormField label="Voyage"><Input value={draft.voyage || ''} onChange={(event) => update({ voyage: event.target.value })} /></FormField>}
      <LookupField label="POL" value={draft.polCode} onChange={(polCode) => update({ polCode })} loader={(q) => opsApi.lookupPorts(q, portKind)} />
      <LookupField label="POD" value={draft.podCode} onChange={(podCode) => update({ podCode })} loader={(q) => opsApi.lookupPorts(q, portKind)} />
      <FormField label="Place of receipt"><Input value={draft.placeOfReceipt || ''} onChange={(event) => update({ placeOfReceipt: event.target.value })} /></FormField>
      <FormField label="Final destination"><Input value={draft.finalDestination || ''} onChange={(event) => update({ finalDestination: event.target.value })} /></FormField>
      <FormField label="ETD"><Input type="date" value={toDateInput(draft.etd)} onChange={(event) => update({ etd: fromDateInput(event.target.value) })} /></FormField>
      <FormField label="ETA"><Input type="date" value={toDateInput(draft.eta)} onChange={(event) => update({ eta: fromDateInput(event.target.value) })} /></FormField>
      <FormField label="Doc cutoff"><Input type="datetime-local" value={draft.docCutoff?.slice(0, 16) || ''} onChange={(event) => update({ docCutoff: event.target.value ? new Date(event.target.value).toISOString() : null })} /></FormField>
      <FormField label="Cargo cutoff"><Input type="datetime-local" value={draft.cargoCutoff?.slice(0, 16) || ''} onChange={(event) => update({ cargoCutoff: event.target.value ? new Date(event.target.value).toISOString() : null })} /></FormField>
      <FormField label="Incoterm"><OptionsSelect value={draft.incoterm} options={INCOTERMS} onChange={(incoterm) => update({ incoterm })} /></FormField>
      <FormField label="Freight term"><OptionsSelect value={draft.freightTerm} options={FREIGHT_TERMS} onChange={(freightTerm) => update({ freightTerm })} /></FormField>
      <FormField label="Commodity"><Input value={draft.commodity || ''} onChange={(event) => update({ commodity: event.target.value })} /></FormField>
      <FormField label="Goods description"><Textarea value={draft.goodsDescription || ''} onChange={(event) => update({ goodsDescription: event.target.value })} /></FormField>
    </FormSection>
  </div>
}

export function ImportTab({ draft, update, disabled }: { draft: Partial<Shipment>; update: (patch: Partial<Shipment>) => void; disabled: boolean }) {
  if (disabled) return <EmptyState title="Import info is only required for import files" description="Export and domestic files skip entry, availability and free-time fields." />
  return <FormSection title="Import filing and availability" description="Entry, registry, IT/GO and cargo availability details.">
    <FormField label="Entry no"><Input value={draft.entryNo || ''} onChange={(event) => update({ entryNo: event.target.value })} /></FormField>
    <FormField label="Entry date"><Input type="date" value={toDateInput(draft.entryDate)} onChange={(event) => update({ entryDate: fromDateInput(event.target.value) })} /></FormField>
    <FormField label="IT no"><Input value={draft.itNo || ''} onChange={(event) => update({ itNo: event.target.value })} /></FormField>
    <FormField label="IT date"><Input type="date" value={toDateInput(draft.itDate)} onChange={(event) => update({ itDate: fromDateInput(event.target.value) })} /></FormField>
    <FormField label="GO no"><Input value={draft.goNo || ''} onChange={(event) => update({ goNo: event.target.value })} /></FormField>
    <FormField label="GO date"><Input type="date" value={toDateInput(draft.goDate)} onChange={(event) => update({ goDate: fromDateInput(event.target.value) })} /></FormField>
    <FormField label="Available date"><Input type="date" value={toDateInput(draft.availableDate)} onChange={(event) => update({ availableDate: fromDateInput(event.target.value) })} /></FormField>
    <FormField label="Free time expires"><Input type="date" value={toDateInput(draft.freeTimeExpires)} onChange={(event) => update({ freeTimeExpires: fromDateInput(event.target.value) })} /></FormField>
    <LookupField label="Cargo location" value={draft.cargoLocationPartyId} onChange={(cargoLocationPartyId) => update({ cargoLocationPartyId })} loader={opsApi.lookupParties} role="isWarehouse" />
    <FormField label="Customs status"><Input value={draft.customsStatus || ''} onChange={(event) => update({ customsStatus: event.target.value })} /></FormField>
  </FormSection>
}

export function CargoTab({ air, cargo, setCargo, totals, pasteText, setPasteText }: { air: boolean; cargo: CargoLine[]; setCargo: (rows: CargoLine[]) => void; totals: ReturnType<typeof cargoTotals>; pasteText: string; setPasteText: (value: string) => void }) {
  const paste = () => {
    const rows = pasteText.split(/\r?\n/).filter(Boolean).map((line, index) => {
      const [pieces, packageType, description, marks, lengthCm, widthCm, heightCm, grossKg] = line.split('\t')
      return computeCargoLine({ lineNo: index + 1, pieces: Number(pieces || 0), packageType: packageType || 'PKG', description: description || '', marks: marks || '', lengthCm: Number(lengthCm || 0), widthCm: Number(widthCm || 0), heightCm: Number(heightCm || 0), grossKg: Number(grossKg || 0) }, air)
    })
    if (rows.length) setCargo(rows)
    setPasteText('')
  }
  return <div className="space-y-4"><EditableGrid rows={cargo as unknown as Row[]} onRowsChange={(rows) => setCargo((rows as unknown as CargoLine[]).map((line, index) => computeCargoLine({ ...line, lineNo: index + 1 }, air)))} createRow={() => newCargoLine(cargo.length + 1) as unknown as Row} columns={[{ id: 'pieces', header: 'PCS', type: 'number' }, { id: 'packageType', header: 'Pkg' }, { id: 'description', header: 'Description' }, { id: 'marks', header: 'Marks' }, { id: 'lengthCm', header: 'L cm', type: 'number' }, { id: 'widthCm', header: 'W cm', type: 'number' }, { id: 'heightCm', header: 'H cm', type: 'number' }, { id: 'grossKg', header: 'Gross kg', type: 'number' }, { id: 'cbm', header: 'CBM', type: 'number', readOnly: true }, { id: 'volumetricKg', header: 'Vol kg', type: 'number', readOnly: true }, { id: 'chargeableKg', header: air ? 'Chg kg' : 'W/M', type: 'number', readOnly: true }]} footer={<div className="flex flex-wrap justify-end gap-4"><NumberValue value={totals.pieces} suffix="pcs" /><span>{formatWeightKg(totals.grossKg)}</span><span>{formatCbm(totals.cbm)}</span><span>{air ? `${formatNumber(totals.chargeableKg)} chargeable kg` : `${formatNumber(totals.chargeableKg)} W/M`}</span></div>} />
    <FormSection title="Paste from Excel" description="Paste columns: pcs, package, description, marks, L, W, H, gross kg." defaultOpen={false}><div className="xl:col-span-3 md:col-span-2 space-y-2"><Textarea value={pasteText} onChange={(event) => setPasteText(event.target.value)} /><Button variant="outline" onClick={paste}>Parse pasted rows</Button></div></FormSection></div>
}

export function ContainersTab({ ocean, shipmentId, containers, setContainers }: { ocean: boolean; shipmentId: string; containers: ContainerLine[]; setContainers: (rows: ContainerLine[]) => void }) {
  if (!ocean) return <EmptyState title="Containers apply to ocean files" description="Air and domestic files manage loose cargo in the Cargo tab." />
  return <div className="space-y-3"><EditableGrid rows={containers as unknown as Row[]} onRowsChange={(rows) => setContainers(rows as unknown as ContainerLine[])} createRow={() => blankContainer(shipmentId) as unknown as Row} columns={[{ id: 'equipmentType', header: 'Equipment' }, { id: 'containerNo', header: 'Container #' }, { id: 'sealNo', header: 'Seal' }, { id: 'tareKg', header: 'Tare kg', type: 'number' }, { id: 'vgmKg', header: 'VGM kg', type: 'number' }, { id: 'temperatureC', header: 'Temp °C', type: 'number' }, { id: 'unNumbers', header: 'UN #' }]} footer={<span className="text-sm text-muted-foreground">Equipment: {EQUIPMENT_TYPES.join(', ')}</span>} /><div className="grid gap-2 md:grid-cols-2">{containers.map((line, index) => <WarningText key={line.id ?? index}>{validateIso6346(line.containerNo)}</WarningText>)}</div></div>
}

export function DocsTab({
  air,
  draft,
  cargo = [],
  docs,
  setDocs,
}: {
  air: boolean
  draft: Partial<Shipment>
  cargo?: CargoLine[]
  docs: TransportDoc[]
  setDocs: (rows: TransportDoc[]) => void
}) {
  const [editingDoc, setEditingDoc] = useState<TransportDoc | null>(null)
  const [editingIndex, setEditingIndex] = useState<number>(-1)
  const [deletingDoc, setDeletingDoc] = useState<{ doc: TransportDoc; index: number } | null>(null)

  const createHouse = () => {
    const next = blankDoc(draft, air)
    setDocs([...docs, next])
    setEditingDoc(next)
    setEditingIndex(docs.length)
    toast.success(`Created draft House ${air ? 'AWB' : 'B/L'}`)
  }

  const createMaster = () => {
    const next: TransportDoc = {
      ...blankDoc(draft, air),
      docClass: 'MASTER',
      docType: air ? 'AWB' : 'BL',
    }
    setDocs([...docs, next])
    setEditingDoc(next)
    setEditingIndex(docs.length)
    toast.success(`Created draft Master ${air ? 'AWB' : 'B/L'}`)
  }

  const syncFromShipment = (index: number) => {
    const current = docs[index]
    if (!current) return
    const updated: TransportDoc = {
      ...current,
      shipperName: draft.shipperName || current.shipperName,
      shipperAddress: draft.shipperAddress || current.shipperAddress,
      consigneeName: draft.consigneeName || current.consigneeName,
      consigneeAddress: draft.consigneeAddress || current.consigneeAddress,
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
    if (air && doc.docNo) {
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
          <Button onClick={createHouse} size="sm">
            <Plus className="size-4" />
            New House {air ? 'AWB (HAWB)' : 'B/L (HBL)'}
          </Button>
          <Button onClick={createMaster} variant="outline" size="sm">
            <Plus className="size-4" />
            New Master {air ? 'AWB (MAWB)' : 'B/L (MBL)'}
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">
          {docs.length} transport document{docs.length === 1 ? '' : 's'} linked to this file
        </div>
      </div>

      {/* Document Cards List */}
      {docs.length === 0 ? (
        <EmptyState
          title={`No ${air ? 'Air Waybills' : 'Bills of Lading'} created yet`}
          description={`Click "New House ${air ? 'AWB' : 'B/L'}" to create an official transport document populated with this file's parties and routing.`}
          action={
            <Button onClick={createHouse}>
              <Plus className="size-4" />
              Create first document
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {docs.map((doc, index) => {
            const isAirDoc = doc.docType === 'AWB' || air
            const mawbCheck = isAirDoc && doc.docNo ? validateMawb(doc.docNo) : null
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
                        status={doc.docClass || 'HOUSE'}
                        tone={doc.docClass === 'MASTER' ? 'accent' : 'info'}
                      />
                      <Badge status={doc.docType || (air ? 'AWB' : 'BL')} tone="neutral" />
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
                        <span className="font-semibold text-foreground/80">Shipper: </span>
                        <span className="truncate">{doc.shipperName || draft.shipperName || '—'}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-foreground/80">Consignee: </span>
                        <span className="truncate">{doc.consigneeName || draft.consigneeName || '—'}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-foreground/80">Term: </span>
                        <span>{doc.freightTerm || draft.freightTerm || 'PREPAID'}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-foreground/80">Route: </span>
                        <span>{doc.pol || draft.polCode || '—'} → {doc.pod || draft.podCode || '—'}</span>
                      </div>
                    </div>

                    {/* MAWB format validation badge */}
                    {isAirDoc && doc.docNo && (
                      <div className="pt-0.5">
                        {mawbCheck ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="size-3" />
                            {mawbCheck}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="size-3" />
                            Valid IATA MAWB check digit
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
                      title="Edit transport document fields"
                    >
                      <Edit2 className="size-3.5" />
                      Edit
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => printDoc(doc)}
                      title="Print official transport document"
                    >
                      <Printer className="size-3.5" />
                      Print
                    </Button>

                    {isDraft && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => issueDoc(doc, index)}
                        title="Issue transport document"
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
      <Sheet open={Boolean(editingDoc)} onOpenChange={(open) => { if (!open) setEditingDoc(null) }}>
        <SheetContent
          title={`Edit ${air ? 'Air Waybill' : 'Bill of Lading'} Details`}
          description="Complete IATA/FIATA compliant document particulars. Saved into shipment draft."
          className="overflow-y-auto sm:max-w-2xl"
        >
          {editingDoc && (
            <div className="space-y-4 pt-2">
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={() => syncFromShipment(editingIndex)}>
                  Autofill from shipment file
                </Button>
              </div>

              <FormSection title="Document Identification" description="Class, number, terms, and release format.">
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label="Document Class" required>
                    <Select
                      value={editingDoc.docClass || 'HOUSE'}
                      onValueChange={(val) => setEditingDoc({ ...editingDoc, docClass: val })}
                      options={[
                        { value: 'HOUSE', label: 'HOUSE (Direct client)' },
                        { value: 'MASTER', label: 'MASTER (Carrier direct)' },
                      ]}
                    />
                  </FormField>

                  <FormField label="Document Type" required>
                    <Select
                      value={editingDoc.docType || (air ? 'AWB' : 'BL')}
                      onValueChange={(val) => setEditingDoc({ ...editingDoc, docType: val })}
                      options={[
                        { value: 'AWB', label: 'AWB (Air Waybill)' },
                        { value: 'BL', label: 'B/L (Bill of Lading)' },
                      ]}
                    />
                  </FormField>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label="Document Number" required hint={air ? 'Format: 079-12345675 (3 airline prefix + 7 serial + mod-7)' : undefined}>
                    <Input
                      value={editingDoc.docNo || ''}
                      onChange={(e) => setEditingDoc({ ...editingDoc, docNo: e.target.value.toUpperCase() })}
                      placeholder={air ? '079-12345675' : 'HBL-2026-00001'}
                    />
                  </FormField>

                  <FormField label="Freight Term">
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
                      value={editingDoc.numberOfOriginals ?? 3}
                      onValueChange={(val) => setEditingDoc({ ...editingDoc, numberOfOriginals: val })}
                    />
                  </FormField>
                </div>
              </FormSection>

              <FormSection title="Shipper & Consignee" description="Full names and registered addresses as shown on physical document.">
                <FormField label="Shipper Name" required>
                  <Input
                    value={editingDoc.shipperName || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, shipperName: e.target.value })}
                  />
                </FormField>
                <FormField label="Shipper Address">
                  <Textarea
                    value={editingDoc.shipperAddress || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, shipperAddress: e.target.value })}
                    rows={2}
                  />
                </FormField>

                <FormField label="Consignee Name" required>
                  <Input
                    value={editingDoc.consigneeName || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, consigneeName: e.target.value })}
                  />
                </FormField>
                <FormField label="Consignee Address">
                  <Textarea
                    value={editingDoc.consigneeAddress || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, consigneeAddress: e.target.value })}
                    rows={2}
                  />
                </FormField>
              </FormSection>

              <FormSection title="Notify Party & Issuing Agent" defaultOpen={false}>
                <FormField label="Notify Name">
                  <Input
                    value={editingDoc.notifyName || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, notifyName: e.target.value })}
                    placeholder="SAME AS CONSIGNEE"
                  />
                </FormField>
                <FormField label="Notify Address">
                  <Textarea
                    value={editingDoc.notifyAddress || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, notifyAddress: e.target.value })}
                    rows={2}
                  />
                </FormField>

                <FormField label="Issuing Agent Name">
                  <Input
                    value={editingDoc.agentName || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, agentName: e.target.value })}
                    placeholder="KORNET EXPRESS, INC."
                  />
                </FormField>
                <FormField label="Issuing Agent Address">
                  <Textarea
                    value={editingDoc.agentAddress || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, agentAddress: e.target.value })}
                    rows={2}
                  />
                </FormField>
              </FormSection>

              <FormSection title="Routing & Carrier Details" defaultOpen={false}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label={air ? 'Airport of Departure' : 'Port of Loading (POL)'}>
                    <Input
                      value={editingDoc.pol || ''}
                      onChange={(e) => setEditingDoc({ ...editingDoc, pol: e.target.value.toUpperCase() })}
                    />
                  </FormField>
                  <FormField label={air ? 'Airport of Destination' : 'Port of Discharge (POD)'}>
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

                <FormField label="Handling Information">
                  <Textarea
                    value={editingDoc.handlingInfo || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, handlingInfo: e.target.value })}
                    placeholder="e.g. KEEP DRY, DO NOT STACK, 24HR NOTIFY"
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
                <Button onClick={saveEditedDoc}>
                  Apply Changes
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deletingDoc)}
        onOpenChange={(open) => { if (!open) setDeletingDoc(null) }}
        title="Delete Transport Document"
        description={`Are you sure you want to delete ${deletingDoc?.doc.docNo || 'this transport document'}? This action cannot be undone.`}
        onConfirm={() => void confirmDelete()}
      />
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
