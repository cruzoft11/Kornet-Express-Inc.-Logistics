import type { DocumentPayload, Quote } from '@/api/ops'
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
