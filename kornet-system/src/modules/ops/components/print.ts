import type { CargoLine, DocumentPayload, Quote, Shipment, TransportDoc } from '@/api/ops'
import { formatDate, formatMoney, formatNumber } from '@/lib/format'
import { financialTotals } from '../utils'

function esc(value: unknown) {
  return String(value ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] ?? c))
}

export function openPrintWindow(title: string, html: string) {
  const win = window.open('', '_blank', 'width=1024,height=768')
  if (!win) throw new Error('Popup was blocked. Allow popups to print documents.')
  win.document.write(`<!doctype html><html><head><title>${esc(title)}</title><style>body{font-family:Inter,Arial,sans-serif;margin:32px;color:#111827}.doc{max-width:980px;margin:0 auto}.header{display:flex;justify-content:space-between;border-bottom:2px solid #111827;padding-bottom:12px;margin-bottom:18px}.muted{color:#6b7280}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.box{border:1px solid #d1d5db;border-radius:8px;padding:12px;margin-bottom:12px}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #d1d5db;padding:7px;text-align:left;vertical-align:top}th{background:#f3f4f6}.right{text-align:right}.mono{font-family:ui-monospace,Menlo,Consolas,monospace}.stamp{font-size:11px;color:#6b7280;margin-top:18px}@media print{button{display:none}body{margin:18px}}</style></head><body><button onclick="window.print()">Print</button><div class="doc">${html}</div></body></html>`)
  win.document.close()
  win.focus()
}

export function quotePrintHtml(quote: Quote) {
  const totals = financialTotals(quote.charges ?? [])
  const charges = (quote.charges ?? []).map((line) => `<tr><td>${esc(line.billingCode)}</td><td>${esc(line.description)}</td><td>${esc(line.unit)}</td><td class="right mono">${formatNumber(line.qty)}</td><td class="right mono">${formatMoney(line.rate, line.currency)}</td><td class="right mono">${formatMoney(line.amountPhp ?? line.amount, 'PHP')}</td></tr>`).join('')
  return `<div class="header"><div><h1>Kornet Express Quote</h1><div class="muted mono">${esc(quote.quoteNo)}</div></div><div class="right"><strong>Status:</strong> ${esc(quote.status)}<br/><strong>Date:</strong> ${formatDate(quote.date)}<br/><strong>Valid until:</strong> ${formatDate(quote.validUntil)}</div></div><div class="grid"><div class="box"><strong>Customer</strong><br/>${esc(quote.customerPartyId)}<br/>${esc(quote.contact)}</div><div class="box"><strong>Lane</strong><br/>${esc(quote.placeOfReceipt)} / ${esc(quote.pol)} → ${esc(quote.pod)} / ${esc(quote.finalDestination)}<br/>${esc(quote.mode)} ${esc(quote.direction)} · ${esc(quote.incoterm)}</div></div><div class="box"><strong>Cargo summary</strong><br/>${esc(quote.commodity)}<br/>${esc(quote.notes)}</div><table><thead><tr><th>Code</th><th>Description</th><th>Basis</th><th>Qty</th><th>Rate</th><th>Amount PHP</th></tr></thead><tbody>${charges}</tbody><tfoot><tr><th colspan="5" class="right">Total</th><th class="right mono">${formatMoney(totals.bill)}</th></tr></tfoot></table><p class="stamp">Generated ${formatDate(new Date())}</p>`
}

export function shipmentDocumentHtml(payload: DocumentPayload) {
  const shipment = payload.shipment
  const companyName = String(payload.company?.name ?? 'Kornet Express')
  const cargo = payload.cargo.map((line) => `<tr><td class="right mono">${formatNumber(line.pieces)}</td><td>${esc(line.packageType)}</td><td>${esc(line.description)}</td><td>${esc(line.marks)}</td><td class="right mono">${formatNumber(line.grossKg)}</td><td class="right mono">${formatNumber(line.cbm)}</td></tr>`).join('')
  const containers = payload.containers.map((line) => `<tr><td>${esc(line.equipmentType)}</td><td class="mono">${esc(line.containerNo)}</td><td>${esc(line.sealNo)}</td><td class="right mono">${formatNumber(line.vgmKg)}</td><td>${esc(line.unNumbers)}</td></tr>`).join('')
  const charges = payload.charges.map((line) => `<tr><td>${esc(line.billingCode)}</td><td>${esc(line.description)}</td><td class="right mono">${formatMoney(line.amountPhp ?? line.amount, 'PHP')}</td></tr>`).join('')
  return `<div class="header"><div><h1>${esc(payload.kind.replace(/-/g, ' ').toUpperCase())}</h1><div>${esc(companyName)}</div></div><div class="right"><strong>File:</strong> <span class="mono">${esc(shipment.fileNo)}</span><br/><strong>Status:</strong> ${esc(shipment.status)}<br/><strong>Generated:</strong> ${formatDate(payload.generatedAt)}</div></div><div class="grid"><div class="box"><strong>Shipper</strong><br/>${esc(shipment.shipperName)}<br/>${esc(shipment.shipperAddress)}</div><div class="box"><strong>Consignee</strong><br/>${esc(shipment.consigneeName)}<br/>${esc(shipment.consigneeAddress)}</div><div class="box"><strong>Routing</strong><br/>${esc(shipment.placeOfReceipt)} / ${esc(shipment.polCode)} → ${esc(shipment.podCode)} / ${esc(shipment.finalDestination)}<br/>ETD ${formatDate(shipment.etd)} · ETA ${formatDate(shipment.eta)}</div><div class="box"><strong>Carrier</strong><br/>${esc(shipment.carrierPartyId)}<br/>${esc(shipment.vessel || shipment.flightNo)} ${esc(shipment.voyage)}</div></div><h3>Cargo</h3><table><thead><tr><th>PCS</th><th>Pkg</th><th>Description</th><th>Marks</th><th>Gross kg</th><th>CBM</th></tr></thead><tbody>${cargo}</tbody></table>${payload.containers.length ? `<h3>Containers</h3><table><thead><tr><th>Type</th><th>Container</th><th>Seal</th><th>VGM</th><th>Hazmat</th></tr></thead><tbody>${containers}</tbody></table>` : ''}${payload.charges.length ? `<h3>Shown charges</h3><table><thead><tr><th>Code</th><th>Description</th><th>Amount PHP</th></tr></thead><tbody>${charges}</tbody></table>` : ''}`
}

export function transportDocPrintHtml(doc: Partial<TransportDoc>, shipment: Partial<Shipment>, cargo: CargoLine[] = []) {
  const isDomestic = doc.docType === 'DR' || doc.docType === 'WAYBILL' || shipment.mode === 'DOMESTIC'
  const isAir = !isDomestic && (doc.docType === 'AWB' || shipment.mode === 'AIR')

  // 1. Domestic Delivery Receipt & Trip Waybill Format
  if (isDomestic) {
    const cargoRows = cargo.map((l, idx) => `<tr>
      <td class="mono right">${idx + 1}</td>
      <td class="right mono">${formatNumber(l.pieces)}</td>
      <td>${esc(l.packageType || 'PKG')}</td>
      <td><strong>${esc(l.description || 'General Merchandise')}</strong>${l.marks ? `<br/><span class="muted" style="font-size:11px">Marks: ${esc(l.marks)}</span>` : ''}</td>
      <td class="right mono">${formatNumber(l.grossKg)} kg</td>
      <td class="right mono">${formatNumber(l.cbm)} cbm</td>
    </tr>`).join('')

    return `<div class="header">
      <div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-weight:900;font-size:24px;color:#07558f;letter-spacing:-0.5px">KORNET</span>
          <span style="font-weight:900;font-size:24px;color:#d9232e;letter-spacing:-0.5px">EXPRESS</span>
        </div>
        <div class="muted" style="font-size:12px;font-weight:600;letter-spacing:0.5px">DOMESTIC LOGISTICS &amp; TRUCKING SERVICES</div>
        <div class="muted" style="font-size:11px">Metro Manila &middot; Cavite &middot; Laguna &middot; Batangas &middot; Inter-Island Distribution</div>
      </div>
      <div class="right">
        <h2 style="font-size:18px;margin:0 0 4px 0;color:#111827">DELIVERY RECEIPT (DR)</h2>
        <div class="mono" style="font-size:15px;font-weight:bold;color:#07558f">${esc(doc.docNo || shipment.bookingNo || 'DR-DRAFT')}</div>
        <div class="muted" style="font-size:11px">File Ref: <span class="mono">${esc(shipment.fileNo || '—')}</span></div>
        <div class="muted" style="font-size:11px">Date: <strong>${formatDate(doc.issueDate || new Date())}</strong></div>
      </div>
    </div>

    <div class="grid">
      <div class="box">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#4b5563;margin-bottom:4px">Shipper / Origin Facility (Pick-up)</div>
        <strong style="font-size:13px">${esc(doc.shipperName || shipment.shipperName || 'KORNET CONSIGNOR')}</strong><br/>
        <div style="font-size:12px;color:#374151;white-space:pre-line;margin-top:2px">${esc(doc.shipperAddress || shipment.shipperAddress || shipment.placeOfReceipt || 'Warehouse Facility')}</div>
      </div>
      <div class="box">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#4b5563;margin-bottom:4px">Consignee / Destination Site (Drop-off)</div>
        <strong style="font-size:13px">${esc(doc.consigneeName || shipment.consigneeName || 'CONSIGNEE / RECIPIENT')}</strong><br/>
        <div style="font-size:12px;color:#374151;white-space:pre-line;margin-top:2px">${esc(doc.consigneeAddress || shipment.consigneeAddress || shipment.finalDestination || 'Destination Facility')}</div>
      </div>
    </div>

    <div class="grid">
      <div class="box">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#4b5563;margin-bottom:4px">Fleet &amp; Dispatch Information</div>
        <div style="font-size:12px;line-height:1.6">
          <strong>Plate Number:</strong> <span class="mono" style="background:#e5e7eb;padding:2px 6px;border-radius:4px;font-weight:700">${esc(shipment.vessel || 'NBD-0000')}</span><br/>
          <strong>Vehicle Type:</strong> ${esc(shipment.remarks?.includes('Truck:') ? shipment.remarks : 'Commercial Van / Truck')}<br/>
          <strong>Driver Name &amp; Contact:</strong> ${esc(shipment.flightNo || 'Assigned Fleet Driver')}<br/>
          <strong>Driver License:</strong> ${esc(shipment.voyage || 'On File')}
        </div>
      </div>
      <div class="box">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#4b5563;margin-bottom:4px">Dispatch Authorizations &amp; Corridor</div>
        <div style="font-size:12px;line-height:1.6">
          <strong>Trip Ticket #:</strong> <span class="mono">${esc(shipment.bookingNo || '—')}</span><br/>
          <strong>Gate Pass #:</strong> <span class="mono">${esc(shipment.carrierBookingRef || '—')}</span><br/>
          <strong>Customer PO / Ref #:</strong> <span class="mono">${esc(shipment.customerRef || '—')}</span><br/>
          <strong>Corridor / Route:</strong> ${esc(shipment.polCode || 'Origin')} &rarr; ${esc(shipment.podCode || 'Destination')}
        </div>
      </div>
    </div>

    ${doc.handlingInfo ? `<div class="box" style="background:#f9fafb">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#4b5563;margin-bottom:2px">Special Gate / Handling Instructions</div>
      <div style="font-size:12px">${esc(doc.handlingInfo)}</div>
    </div>` : ''}

    <h3 style="font-size:13px;text-transform:uppercase;letter-spacing:0.5px;margin:16px 0 6px 0">Itemized Manifest / Cargo Particulars</h3>
    <table>
      <thead>
        <tr>
          <th style="width:36px" class="right">Item</th>
          <th style="width:60px" class="right">Qty</th>
          <th style="width:70px">Pkg</th>
          <th>Description of Articles</th>
          <th style="width:90px" class="right">Gross Wt</th>
          <th style="width:80px" class="right">Volume</th>
        </tr>
      </thead>
      <tbody>
        ${cargoRows || '<tr><td colspan="6" class="muted" style="text-align:center;padding:16px">No specific item lines listed</td></tr>'}
      </tbody>
    </table>

    <div style="margin-top:16px;padding:10px 14px;border:1px solid #d1d5db;border-radius:6px;font-size:11px;color:#374151;background:#fafafa;line-height:1.45">
      <strong>DELIVERY ACKNOWLEDGMENT &amp; CONDITION:</strong> Received the above described merchandise/articles in good order and complete condition, without damage, loss or defect, subject to Kornet Express standard terms of inland carriage. Any exceptions must be noted in writing prior to driver departure.
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:24px">
      <div style="border:1px solid #d1d5db;border-radius:6px;padding:12px;font-size:11px">
        <div style="font-weight:bold;margin-bottom:24px;color:#111827">DISPATCHED BY (DRIVER / TRANSPORTER)</div>
        <div style="border-top:1px dashed #9ca3af;padding-top:4px">Printed Name: <strong>${esc(shipment.flightNo || 'Driver Full Name')}</strong></div>
        <div style="margin-top:4px">Signature: ____________________________________</div>
        <div style="margin-top:4px">Date &amp; Time Dispatched: _______________________</div>
      </div>
      <div style="border:1px solid #d1d5db;border-radius:6px;padding:12px;font-size:11px">
        <div style="font-weight:bold;margin-bottom:24px;color:#111827">RECEIVED IN GOOD ORDER (CONSIGNEE)</div>
        <div style="border-top:1px dashed #9ca3af;padding-top:4px">Printed Name &amp; Designation: _____________________</div>
        <div style="margin-top:4px">Signature: ____________________________________</div>
        <div style="margin-top:4px">Date &amp; Time Received: _________________________</div>
        <div style="margin-top:4px;color:#6b7280;font-size:10px">Company Stamp / Guard Seal:</div>
      </div>
    </div>`
  }

  // 2. IATA Air Waybill Format (IATA Res 600a)
  if (isAir) {
    const isMaster = doc.docClass === 'MASTER'
    const title = isMaster ? 'MASTER AIR WAYBILL (MAWB)' : 'HOUSE AIR WAYBILL (HAWB)'
    const cargoRows = cargo.map((l) => `<tr>
      <td class="right mono">${formatNumber(l.pieces)}</td>
      <td class="right mono">${formatNumber(l.grossKg)} kg</td>
      <td class="mono center">${esc(l.packageType || 'K')}</td>
      <td class="right mono font-bold">${formatNumber(l.chargeableKg)} kg</td>
      <td>${esc(l.description || 'AIR CARGO')}</td>
    </tr>`).join('')

    return `<div class="header">
      <div>
        <div style="font-size:11px;font-weight:bold;letter-spacing:1px;color:#6b7280">IATA RESOLUTION 600a COMPLIANT</div>
        <h1 style="font-size:20px;margin:2px 0 4px 0">${esc(title)}</h1>
        <div class="muted">ISSUED BY: <strong>KORNET EXPRESS, INC.</strong> &middot; CARGO AGENT</div>
      </div>
      <div class="right">
        <div style="font-size:11px;color:#6b7280">AIR WAYBILL NUMBER</div>
        <strong style="font-size:17px" class="mono">${esc(doc.docNo || 'DRAFT-AWB')}</strong><br/>
        <span class="muted" style="font-size:11px">Status: <strong>${esc(doc.status || 'DRAFT')}</strong></span> &middot;
        <span class="muted" style="font-size:11px">Class: <strong>${esc(doc.docClass || 'HOUSE')}</strong></span>
      </div>
    </div>

    <div class="grid">
      <div class="box">
        <div style="font-size:10px;font-weight:bold;color:#6b7280;text-transform:uppercase">1. Shipper's Name and Address</div>
        <strong style="font-size:12px">${esc(doc.shipperName || shipment.shipperName || '—')}</strong><br/>
        <div style="font-size:11px;white-space:pre-line">${esc(doc.shipperAddress || shipment.shipperAddress || '')}</div>
      </div>
      <div class="box">
        <div style="font-size:10px;font-weight:bold;color:#6b7280;text-transform:uppercase">2. Consignee's Name and Address</div>
        <strong style="font-size:12px">${esc(doc.consigneeName || shipment.consigneeName || '—')}</strong><br/>
        <div style="font-size:11px;white-space:pre-line">${esc(doc.consigneeAddress || shipment.consigneeAddress || '')}</div>
      </div>
    </div>

    <div class="grid">
      <div class="box">
        <div style="font-size:10px;font-weight:bold;color:#6b7280;text-transform:uppercase">3. Issuing Carrier's Agent &amp; City</div>
        <div style="font-size:11px">
          <strong>${esc(doc.agentName || 'KORNET EXPRESS, INC.')}</strong><br/>
          ${esc(doc.agentAddress || 'Manila, Philippines')}<br/>
          <span style="font-size:10px;color:#6b7280">IATA Cargo Agent Code: 05-4-9999</span>
        </div>
      </div>
      <div class="box">
        <div style="font-size:10px;font-weight:bold;color:#6b7280;text-transform:uppercase">Accounting Information &amp; Also Notify</div>
        <div style="font-size:11px">
          <strong>Also Notify:</strong> ${esc(doc.notifyName || 'SAME AS CONSIGNEE')}<br/>
          ${esc(doc.accountingInfo || 'FREIGHT PREPAID &middot; ACCOUNT KORNET EXPRESS')}
        </div>
      </div>
    </div>

    <div class="grid">
      <div class="box">
        <div style="font-size:10px;font-weight:bold;color:#6b7280;text-transform:uppercase">Airport of Departure &amp; Requested Routing</div>
        <div style="font-size:12px">
          <strong class="mono" style="font-size:14px">${esc(doc.pol || shipment.polCode || 'MNL')}</strong> &rarr;
          <strong class="mono" style="font-size:14px">${esc(doc.pod || shipment.podCode || '—')}</strong><br/>
          <span style="font-size:11px">Carrier / Flight: <strong>${esc(shipment.flightNo || 'TBD')}</strong> &middot; Date: ${formatDate(shipment.etd)}</span>
        </div>
      </div>
      <div class="box">
        <div style="font-size:10px;font-weight:bold;color:#6b7280;text-transform:uppercase">Currency &amp; Declared Values</div>
        <div style="font-size:11px">
          <strong>Currency:</strong> ${esc(shipment.currency || 'PHP')} &middot;
          <strong>Payment:</strong> ${esc(doc.freightTerm || shipment.freightTerm || 'PREPAID')}<br/>
          <strong>Declared for Carriage:</strong> ${doc.declaredValueCarriage ? formatMoney(doc.declaredValueCarriage) : 'NVD'}<br/>
          <strong>Declared for Customs:</strong> ${doc.declaredValueCustoms ? formatMoney(doc.declaredValueCustoms) : 'NCV'}
        </div>
      </div>
    </div>

    ${doc.handlingInfo ? `<div class="box" style="background:#fffbeb;border-color:#fde68a">
      <div style="font-size:10px;font-weight:bold;color:#92400e;text-transform:uppercase">Special Handling Information</div>
      <div style="font-size:11px;font-weight:600;color:#78350f">${esc(doc.handlingInfo)}</div>
    </div>` : ''}

    <h3 style="font-size:12px;text-transform:uppercase;margin:12px 0 6px 0">Nature and Quantity of Goods (including Dimensions)</h3>
    <table>
      <thead>
        <tr>
          <th class="right">No. of Pieces</th>
          <th class="right">Gross Weight</th>
          <th class="center">Class</th>
          <th class="right">Chargeable Weight</th>
          <th>Nature and Quantity of Goods</th>
        </tr>
      </thead>
      <tbody>
        ${cargoRows || '<tr><td colspan="5" class="muted center" style="padding:14px">No cargo lines specified</td></tr>'}
      </tbody>
    </table>

    <div style="margin-top:14px;padding:8px 12px;border:1px dashed #9ca3af;font-size:10px;color:#4b5563;line-height:1.4">
      Shipper certifies that the particulars on the face hereof are correct and that insofar as any part of the consignment contains dangerous goods, such part is properly described by name and is in proper condition for carriage by air according to applicable Dangerous Goods Regulations.
    </div>

    <div style="display:flex;justify-content:space-between;margin-top:24px;padding-top:12px;border-top:1px solid #d1d5db;font-size:11px">
      <div>
        Place of Issue: <strong>${esc(doc.issuePlace || 'MANILA, PH')}</strong><br/>
        Date of Issue: <strong>${formatDate(doc.issueDate || new Date())}</strong>
      </div>
      <div style="text-align:right">
        Signature of Issuing Carrier or Agent:<br/><br/>
        <strong>KORNET EXPRESS, INC.</strong>
      </div>
    </div>`
  }

  // 3. Ocean Bill of Lading Format (FIATA / Carrier Standard)
  const isMaster = doc.docClass === 'MASTER'
  const title = isMaster ? 'OCEAN BILL OF LADING (MBL)' : 'HOUSE BILL OF LADING (HBL)'
  const cargoRows = cargo.map((l) => `<tr>
    <td class="right mono">${formatNumber(l.pieces)}</td>
    <td>${esc(l.packageType)}</td>
    <td><strong>${esc(l.description)}</strong>${l.marks ? `<br/><span class="muted" style="font-size:11px">Marks: ${esc(l.marks)}</span>` : ''}</td>
    <td class="right mono">${formatNumber(l.grossKg)} kg</td>
    <td class="right mono">${formatNumber(l.cbm)} cbm</td>
    <td class="right mono">${formatNumber(l.chargeableKg)} W/M</td>
  </tr>`).join('')

  return `<div class="header">
    <div>
      <h1 style="font-size:22px;margin:0 0 4px 0">${esc(title)}</h1>
      <div class="muted">KORNET EXPRESS, INC. &middot; INTERNATIONAL FREIGHT FORWARDER</div>
    </div>
    <div class="right">
      <div style="font-size:11px;color:#6b7280">BILL OF LADING NUMBER</div>
      <strong style="font-size:16px" class="mono">${esc(doc.docNo || 'DRAFT-BL')}</strong><br/>
      <strong>Class:</strong> ${esc(doc.docClass || 'HOUSE')} &middot;
      <strong>Status:</strong> ${esc(doc.status || 'DRAFT')}
    </div>
  </div>

  <div class="grid">
    <div class="box">
      <div style="font-size:10px;font-weight:bold;color:#6b7280;text-transform:uppercase">Shipper / Exporter</div>
      <strong style="font-size:12px">${esc(doc.shipperName || shipment.shipperName || '—')}</strong><br/>
      <div style="font-size:11px;white-space:pre-line">${esc(doc.shipperAddress || shipment.shipperAddress || '')}</div>
    </div>
    <div class="box">
      <div style="font-size:10px;font-weight:bold;color:#6b7280;text-transform:uppercase">Consignee</div>
      <strong style="font-size:12px">${esc(doc.consigneeName || shipment.consigneeName || '—')}</strong><br/>
      <div style="font-size:11px;white-space:pre-line">${esc(doc.consigneeAddress || shipment.consigneeAddress || '')}</div>
    </div>
    <div class="box">
      <div style="font-size:10px;font-weight:bold;color:#6b7280;text-transform:uppercase">Notify Party</div>
      <strong style="font-size:12px">${esc(doc.notifyName || shipment.notifyName || 'SAME AS CONSIGNEE')}</strong><br/>
      <div style="font-size:11px;white-space:pre-line">${esc(doc.notifyAddress || shipment.notifyAddress || '')}</div>
    </div>
    <div class="box">
      <div style="font-size:10px;font-weight:bold;color:#6b7280;text-transform:uppercase">Issuing Carrier / Particulars</div>
      <div style="font-size:11px">
        <strong>Agent:</strong> ${esc(doc.agentName || 'KORNET EXPRESS, INC.')}<br/>
        <strong>Freight Term:</strong> ${esc(doc.freightTerm || shipment.freightTerm || 'PREPAID')}<br/>
        <strong>Originals:</strong> ${esc(doc.numberOfOriginals ?? 3)}<br/>
        <strong>Release:</strong> ${esc(doc.releaseType || 'ORIGINAL')}
      </div>
    </div>
  </div>

  <div class="grid">
    <div class="box">
      <div style="font-size:10px;font-weight:bold;color:#6b7280;text-transform:uppercase">Ocean Vessel &amp; Voyage</div>
      <div style="font-size:12px">
        <strong>Vessel:</strong> ${esc(shipment.vessel || 'TBD')}<br/>
        <strong>Voyage:</strong> ${esc(shipment.voyage || '—')}<br/>
        <strong>Port of Loading:</strong> <span class="mono">${esc(doc.pol || shipment.polCode || '—')}</span><br/>
        <strong>Port of Discharge:</strong> <span class="mono">${esc(doc.pod || shipment.podCode || '—')}</span>
      </div>
    </div>
    <div class="box">
      <div style="font-size:10px;font-weight:bold;color:#6b7280;text-transform:uppercase">Declared Values &amp; Delivery Terms</div>
      <div style="font-size:11px">
        <strong>Place of Receipt:</strong> ${esc(shipment.placeOfReceipt || '—')}<br/>
        <strong>Final Destination:</strong> ${esc(shipment.finalDestination || '—')}<br/>
        <strong>Declared for Carriage:</strong> ${doc.declaredValueCarriage ? formatMoney(doc.declaredValueCarriage) : 'NVD'}<br/>
        <strong>Declared for Customs:</strong> ${doc.declaredValueCustoms ? formatMoney(doc.declaredValueCustoms) : 'NCV'}
      </div>
    </div>
  </div>

  ${doc.handlingInfo ? `<div class="box"><strong>Handling Instructions:</strong><br/>${esc(doc.handlingInfo)}</div>` : ''}

  <h3 style="font-size:12px;text-transform:uppercase;margin:12px 0 6px 0">Particulars of Goods Furnished by Shipper</h3>
  <table>
    <thead>
      <tr>
        <th class="right">PCS</th>
        <th>Pkg</th>
        <th>Description of Packages and Goods</th>
        <th class="right">Gross Weight</th>
        <th class="right">Measurement</th>
        <th class="right">W/M</th>
      </tr>
    </thead>
    <tbody>
      ${cargoRows || '<tr><td colspan="6" class="muted center" style="padding:16px">No cargo lines specified</td></tr>'}
    </tbody>
  </table>

  <div style="margin-top:16px;padding:10px;border:1px dashed #d1d5db;border-radius:6px;font-size:10px;color:#6b7280;line-height:1.4">
    SHIPPED on board in apparent good order and condition. In witness whereof, the Carrier by its agent has signed the number of original Bills of Lading stated above, all of this tenor and date, one of which being accomplished, the others shall stand void.
  </div>

  <div style="display:flex;justify-content:space-between;margin-top:24px;padding-top:14px;border-top:1px solid #d1d5db;font-size:11px">
    <div>
      Place of Issue: <strong>${esc(doc.issuePlace || 'MANILA, PH')}</strong><br/>
      Date of Issue: <strong>${formatDate(doc.issueDate || new Date())}</strong>
    </div>
    <div style="text-align:right">
      For and on behalf of KORNET EXPRESS, INC. as Carrier / Agent:<br/><br/>
      <strong>AUTHORIZED SIGNATURE</strong>
    </div>
  </div>`
}
