import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Shipment, CheckDisbursement } from '../stores/logisticsStore'

const KORNET_LEGAL_NAME = 'KORNET EXPRESS, INC.'
const KORNET_ADDRESS = 'JJM Building, No. 5 Ninoy Aquino Avenue, Brgy. San Dionisio, Parañaque City, Metro Manila 1700'
const KORNET_CONTACT = 'Tel: (+63) 2-8826-0012 to 14 | Email: cs.impex@kornet.com.ph'
const KORNET_ACCREDITATIONS = 'FMC OTI-NVOCC Licensed • CAB Registered • PCCBI Accredited Agent'

/**
 * Download official FMC Bill of Lading PDF
 */
export function downloadBolPdf(shipment: Shipment) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()

  // Header Box
  doc.setFillColor(7, 85, 143) // Kornet Blue
  doc.rect(0, 0, pageWidth, 24, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(KORNET_LEGAL_NAME, 14, 10)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`${KORNET_ACCREDITATIONS} | ${KORNET_CONTACT}`, 14, 15)
  doc.text(KORNET_ADDRESS, 14, 20)

  // Document Title Banner
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('OCEAN BILL OF LADING — NON-NEGOTIABLE COPY', 14, 32)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`B/L Number: ${shipment.blOrAwbNo || 'BL-PENDING'}`, pageWidth - 70, 32)
  doc.text(`Booking Ref: ${shipment.bookingNo || shipment.fileNo}`, pageWidth - 70, 37)
  doc.text(`Issue Date: ${new Date().toISOString().split('T')[0]}`, pageWidth - 70, 42)

  // Shipper & Consignee Box
  autoTable(doc, {
    startY: 45,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [240, 244, 248], textColor: [15, 23, 42], fontStyle: 'bold' },
    head: [['1. SHIPPER / EXPORTER', '2. CONSIGNEE / IMPORTER']],
    body: [
      [
        `${shipment.shipper || 'N/A'}\n${shipment.shipperAddress || 'Address on file'}\nTIN: ${shipment.shipperTin || 'N/A'}`,
        `${shipment.consignee || 'N/A'}\n${shipment.consigneeAddress || 'Address on file'}\nTIN: ${shipment.consigneeTin || 'N/A'}\n\nNOTIFY PARTY:\n${shipment.notifyParty || 'SAME AS CONSIGNEE'}`
      ]
    ]
  })

  const afterParties = (doc as any).lastAutoTable.finalY + 4

  // Vessel & Ports Grid
  autoTable(doc, {
    startY: afterParties,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [240, 244, 248], textColor: [15, 23, 42], fontStyle: 'bold' },
    head: [['VESSEL & VOYAGE', 'PORT OF LOADING', 'PORT OF DISCHARGE', 'FREIGHT TERMS']],
    body: [
      [
        `${shipment.vesselOrFlight || 'MV CARRIER'} / V.${shipment.voyageOrFlightNo || '001'}`,
        shipment.portOfLoading || shipment.origin || 'Manila South Harbor (MNS)',
        shipment.portOfDischarge || shipment.destination || 'Port of Destination',
        'FREIGHT PREPAID'
      ]
    ]
  })

  const afterRouting = (doc as any).lastAutoTable.finalY + 4

  // Cargo Items Table
  autoTable(doc, {
    startY: afterRouting,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [7, 85, 143], textColor: [255, 255, 255], fontStyle: 'bold' },
    head: [['CONTAINER / SEAL NO.', 'MARKS & NUMBERS', 'PACKAGES & DESCRIPTION OF GOODS', 'GROSS WEIGHT', 'MEASUREMENT']],
    body: [
      [
        `CTR: ${shipment.containerNo || 'MSKU-992144-8'}\nSEAL: ${shipment.sealNo || 'SL-884102'}\nTYPE: ${shipment.equipmentType || "40' HC"}`,
        shipment.marksAndNumbers || `SHIPPER: ${shipment.shipper}\nCONSIGNEE: ${shipment.consignee}`,
        `${shipment.pieces || 1} ${shipment.packageType || 'CARTON(S)'}\n${shipment.natureOfGoods || 'General Merchandise'}\nHS Code: ${shipment.commodityCode || 'N/A'}${shipment.isHazmat ? '\nHAZMAT: UN' + (shipment.unNumber || '') : ''}`,
        `${(shipment.weightKg || 0).toLocaleString()} KGS\n(${((shipment.weightKg || 0) / 1000).toFixed(3)} MT)`,
        `${(shipment.volumeCbm || 0).toFixed(2)} CBM`
      ]
    ]
  })

  const afterCargo = (doc as any).lastAutoTable.finalY + 4

  // Charges Breakdown Table
  const billingRows = (shipment.billingLines || []).map((b) => [
    b.code,
    b.desc,
    b.prepaidOrCollect || 'Prepaid',
    b.currency || 'PHP',
    b.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  ])
  const totalBilled = (shipment.billingLines || []).reduce((sum, b) => sum + b.amount, 0)

  autoTable(doc, {
    startY: afterCargo,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [240, 244, 248], textColor: [15, 23, 42], fontStyle: 'bold' },
    head: [['CHARGE CODE', 'CHARGE DESCRIPTION', 'TERMS', 'CURR', 'AMOUNT']],
    body: [
      ...billingRows,
      [
        { content: 'TOTAL PREPAID CHARGES:', colSpan: 4, styles: { fontStyle: 'bold', halign: 'right' } },
        { content: `PHP ${totalBilled.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, styles: { fontStyle: 'bold', textColor: [7, 85, 143] } }
      ]
    ]
  })

  const afterCharges = (doc as any).lastAutoTable.finalY + 8

  // Legal Clauses & Signatures
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139)
  doc.text(
    'RECEIVED by the Carrier the Goods as specified above in apparent good order and condition unless otherwise stated.\n' +
    'The Carrier undertakes to transport the Goods to the Port of Discharge subject to the standard Hague-Visby rules and FMC tariff provisions.\n' +
    'In witness whereof three (3) original Bills of Lading have been signed, one of which being accomplished, the others shall stand void.',
    14,
    afterCharges
  )

  // Signatures
  doc.setDrawColor(148, 163, 184)
  doc.line(14, afterCharges + 24, 75, afterCharges + 24)
  doc.line(pageWidth - 75, afterCharges + 24, pageWidth - 14, afterCharges + 24)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 41, 59)
  doc.text('Shipper / Agent Authorization', 14, afterCharges + 28)
  doc.text('For KORNET EXPRESS, INC. As Carrier', pageWidth - 75, afterCharges + 28)

  doc.save(`${shipment.fileNo}_Bill_of_Lading.pdf`)
}

/**
 * Download official IATA Air Waybill PDF
 */
export function downloadAwbPdf(shipment: Shipment) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()

  // Header Box
  doc.setFillColor(79, 70, 229) // Indigo
  doc.rect(0, 0, pageWidth, 24, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(KORNET_LEGAL_NAME, 14, 10)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`${KORNET_ACCREDITATIONS} | ${KORNET_CONTACT}`, 14, 15)
  doc.text(KORNET_ADDRESS, 14, 20)

  // Title
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('IATA STANDARD AIR WAYBILL — NON-NEGOTIABLE', 14, 32)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`AWB Number: ${shipment.blOrAwbNo || '079-12345678'}`, pageWidth - 70, 32)
  doc.text(`File Reference: ${shipment.fileNo}`, pageWidth - 70, 37)
  doc.text(`Date of Flight: ${new Date().toISOString().split('T')[0]}`, pageWidth - 70, 42)

  // Parties Box
  autoTable(doc, {
    startY: 45,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [240, 244, 248], textColor: [15, 23, 42], fontStyle: 'bold' },
    head: [["SHIPPER'S NAME AND ADDRESS", "CONSIGNEE'S NAME AND ADDRESS"]],
    body: [
      [
        `${shipment.shipper || 'N/A'}\n${shipment.shipperAddress || 'Address on file'}\nTIN: ${shipment.shipperTin || 'N/A'}`,
        `${shipment.consignee || 'N/A'}\n${shipment.consigneeAddress || 'Address on file'}\nTIN: ${shipment.consigneeTin || 'N/A'}`
      ]
    ]
  })

  const afterParties = (doc as any).lastAutoTable.finalY + 4

  // Flight details
  autoTable(doc, {
    startY: afterParties,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [240, 244, 248], textColor: [15, 23, 42], fontStyle: 'bold' },
    head: [['AIRPORT OF DEPARTURE', 'AIRPORT OF DESTINATION', 'CARRIER & FLIGHT NO.', 'HANDLING INFO']],
    body: [
      [
        shipment.origin || 'Clark International Airport (CRK)',
        shipment.destination || 'Destination Airport',
        `${shipment.vesselOrFlight || 'Philippine Airlines'} / ${shipment.voyageOrFlightNo || 'PR-102'}`,
        shipment.isHazmat ? 'DANGEROUS GOODS AS PER ATTACHED DGD' : 'STANDARD CARGO STOWAGE'
      ]
    ]
  })

  const afterFlight = (doc as any).lastAutoTable.finalY + 4

  // Rating table
  const grossKg = shipment.weightKg || 0
  const chargeableKg = shipment.chargeableWeightKg || grossKg
  autoTable(doc, {
    startY: afterFlight,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
    head: [['NO. OF PIECES', 'GROSS WEIGHT', 'CHARGEABLE WEIGHT', 'RATE CLASS', 'NATURE AND QUANTITY OF GOODS']],
    body: [
      [
        `${shipment.pieces || 1} PKGS`,
        `${grossKg.toLocaleString()} KG`,
        `${chargeableKg.toLocaleString()} KG`,
        shipment.rateClass || 'Q (Quantity Rate)',
        `${shipment.natureOfGoods || 'Aviation Courier / Electronic Goods'}\nVol: ${(shipment.volumeCbm || 0).toFixed(3)} CBM`
      ]
    ]
  })

  const afterCargo = (doc as any).lastAutoTable.finalY + 4

  // Total amount
  const billingRows = (shipment.billingLines || []).map((b) => [
    b.code,
    b.desc,
    b.prepaidOrCollect || 'Prepaid',
    b.currency || 'PHP',
    b.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  ])
  const totalBilled = (shipment.billingLines || []).reduce((sum, b) => sum + b.amount, 0)

  autoTable(doc, {
    startY: afterCargo,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [240, 244, 248], textColor: [15, 23, 42], fontStyle: 'bold' },
    head: [['AIR BILLING CHARGES', 'DESCRIPTION', 'TERMS', 'CURR', 'AMOUNT']],
    body: [
      ...billingRows,
      [
        { content: 'TOTAL PREPAID AIR FREIGHT:', colSpan: 4, styles: { fontStyle: 'bold', halign: 'right' } },
        { content: `PHP ${totalBilled.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, styles: { fontStyle: 'bold', textColor: [79, 70, 229] } }
      ]
    ]
  })

  doc.save(`${shipment.fileNo}_IATA_Air_Waybill.pdf`)
}

/**
 * Download official Cargo Shipping Manifest PDF
 */
export function downloadManifestPdf(shipment: Shipment) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setFillColor(7, 85, 143)
  doc.rect(0, 0, pageWidth, 20, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(`${KORNET_LEGAL_NAME} — CARGO SHIPPING MANIFEST`, 14, 10)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`Official Bureau of Customs & Port Authority Cargo Discharge Manifest | ${KORNET_ACCREDITATIONS}`, 14, 16)

  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text(`Vessel/Flight: ${shipment.vesselOrFlight || 'N/A'} ${shipment.voyageOrFlightNo || ''}`, 14, 27)
  doc.text(`Port of Loading: ${shipment.portOfLoading || shipment.origin || 'N/A'}`, 100, 27)
  doc.text(`Port of Discharge: ${shipment.portOfDischarge || shipment.destination || 'N/A'}`, 190, 27)
  doc.text(`Manifest Date: ${new Date().toISOString().split('T')[0]}`, pageWidth - 60, 27)

  autoTable(doc, {
    startY: 32,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [7, 85, 143], textColor: [255, 255, 255], fontStyle: 'bold' },
    head: [['B/L OR AWB NO.', 'SHIPPER', 'CONSIGNEE', 'CONTAINER / SEAL', 'PKGS', 'GOODS DESCRIPTION', 'GROSS WT (KG)', 'CBM', 'CUSTOMS STATUS']],
    body: [
      [
        shipment.blOrAwbNo || shipment.fileNo,
        shipment.shipper,
        shipment.consignee,
        `${shipment.containerNo || 'N/A'} / ${shipment.sealNo || 'N/A'}`,
        `${shipment.pieces || 1} ${shipment.packageType || 'PCS'}`,
        shipment.natureOfGoods || 'General Merchandise',
        (shipment.weightKg || 0).toLocaleString(),
        (shipment.volumeCbm || 0).toFixed(2),
        shipment.customsLane ? `BOC Lane: ${shipment.customsLane}` : 'Pending Assessment'
      ]
    ]
  })

  doc.save(`${shipment.fileNo}_Cargo_Manifest.pdf`)
}

/**
 * Download Cash Disbursement Voucher (CDV) PDF
 */
export function downloadCheckVoucherPdf(check: CheckDisbursement) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setFillColor(15, 23, 42)
  doc.rect(0, 0, pageWidth, 22, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(KORNET_LEGAL_NAME, 14, 10)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('CASH DISBURSEMENT VOUCHER (CDV) — FINANCIAL STATEMENTS SYSTEM', 14, 16)

  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text(`Check No: ${check.checkNo}`, pageWidth - 60, 30)
  doc.text(`Voucher / JV: ${check.jeNo || 'AUTO-JV'}`, pageWidth - 60, 35)
  doc.text(`Date: ${check.date}`, pageWidth - 60, 40)

  autoTable(doc, {
    startY: 45,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [240, 244, 248], textColor: [15, 23, 42], fontStyle: 'bold' },
    head: [['PAYEE / VENDOR NAME', 'BANK ACCOUNT', 'AMOUNT (PHP)']],
    body: [
      [
        check.vendor,
        `${check.bankName || 'BDO Operations Checking'} (PHP)`,
        `PHP ${check.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ]
    ]
  })

  const afterMain = (doc as any).lastAutoTable.finalY + 4

  const appliedRows = (check.invoicesApplied || []).map((inv) => [
    inv.invoiceNo,
    inv.reference,
    inv.glExpense || '5010 (Carrier Expense)',
    inv.apAccount || '2010 (A/P Trade)',
    `PHP ${inv.applied.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  ])

  autoTable(doc, {
    startY: afterMain,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    head: [['FILE / INVOICE REF', 'PARTICULARS', 'DEBIT GL (EXPENSE)', 'CREDIT GL (AP / BANK)', 'AMOUNT']],
    body: [
      ...appliedRows,
      [
        { content: 'TOTAL DISBURSEMENT:', colSpan: 4, styles: { fontStyle: 'bold', halign: 'right' } },
        { content: `PHP ${check.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, styles: { fontStyle: 'bold' } }
      ]
    ]
  })

  const afterTable = (doc as any).lastAutoTable.finalY + 14

  doc.setFontSize(8)
  doc.text('Prepared By: ____________________', 14, afterTable)
  doc.text('Audited By: ____________________', 80, afterTable)
  doc.text('Approved By: ____________________', 145, afterTable)

  doc.save(`CDV_${check.checkNo}_${check.vendor.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`)
}
