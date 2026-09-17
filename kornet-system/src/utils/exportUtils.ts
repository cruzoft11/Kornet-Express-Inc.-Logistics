/**
 * exportUtils.ts
 * ─────────────────────────────────────────────────────────────
 * Reusable CSV / XLSX / PDF export utilities for all FS reports.
 * CSV  — pure browser Blob (no dependency)
 * XLSX — SheetJS (xlsx)
 * PDF  — jsPDF + jspdf-autotable
 * ─────────────────────────────────────────────────────────────
 */

import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { readSelectedCompanyName } from './companyContext'


// ─── Column descriptor ────────────────────────────────────────
export interface ExportCol {
  header: string
  key: string
  numeric?: boolean   // right-align in PDF
  width?: number      // approximate char width hint for XLSX col sizing
}

// ─── Multi-section financial descriptor ──────────────────────
export interface FinSection {
  heading: string
  cols: ExportCol[]
  rows: Record<string, unknown>[]
  totalRow?: Record<string, unknown>
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function safeFilename(title: string, ext: string): string {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const safe = title.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_')
  return `${safe}_${d}.${ext}`
}

function triggerDownload(content: BlobPart, mime: string, filename: string) {
  const blob = new Blob([content], { type: mime })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.style.display = 'none'
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  
  // Fix for Chrome/Edge bug where synchronous revokeObjectURL strips the download attribute filename
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function drawPdfHeader(doc: jsPDF, title: string, subtitle: string) {
  const companyName = readSelectedCompanyName()
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(0, 0, 0)
  doc.text(companyName, 14, 15)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(title, 14, 22)

  doc.setFontSize(8)
  doc.setTextColor(80, 80, 80)
  doc.text(subtitle, 14, 28)

  // separator rule (thin gray line to save ink)
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.2)
  const w = doc.internal.pageSize.getWidth()
  doc.line(14, 31, w - 14, 31)
}

function drawPdfFooter(doc: jsPDF, pageNumber: number) {
  const w = doc.internal.pageSize.getWidth()
  const h = doc.internal.pageSize.getHeight()
  doc.setFontSize(7)
  doc.setTextColor(160, 160, 160)
  doc.text(
    `Page ${pageNumber}   |   Generated: ${new Date().toLocaleString()}`,
    w / 2,
    h - 5,
    { align: 'center' }
  )
}

function buildColStyles(cols: ExportCol[], pageUsableMm = 190): Record<number, object> {
  const styles: Record<number, object> = {}
  const totalWidth = cols.reduce((s, c) => s + (c.width ?? 14), 0)
  cols.forEach((c, i) => {
    const props: Record<string, unknown> = {}
    if (c.numeric) props.halign = 'right'
    // Proportional width in mm for PDF autoTable
    if (c.width && totalWidth > 0) {
      props.cellWidth = (c.width / totalWidth) * pageUsableMm
    }
    if (Object.keys(props).length > 0) styles[i] = props
  })
  return styles
}

// ─────────────────────────────────────────────────────────────
// ████  CSV exports
// ─────────────────────────────────────────────────────────────

/** Export a flat table as CSV. */
export function exportTableCSV(
  title: string,
  cols: ExportCol[],
  rows: Record<string, unknown>[],
  filename?: string
) {
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }
  const lines: string[] = []
  lines.push(cols.map(c => escape(c.header)).join(','))
  for (const row of rows) {
    lines.push(cols.map(c => escape(row[c.key])).join(','))
  }
  triggerDownload(lines.join('\r\n'), 'text/csv;charset=utf-8;', filename ?? safeFilename(title, 'csv'))
}

/**
 * Export a multi-section financial statement as CSV.
 * Sections are separated by blank lines.
 */
export function exportFinancialCSV(
  title: string,
  subtitle: string,
  sections: FinSection[],
  filename?: string
) {
  const companyName = readSelectedCompanyName()
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }
  const lines: string[] = [escape(companyName), escape(title), escape(subtitle), '']
  for (const sec of sections) {
    lines.push(escape(sec.heading))
    lines.push(sec.cols.map(c => escape(c.header)).join(','))
    for (const row of sec.rows) {
      lines.push(sec.cols.map(c => escape(row[c.key])).join(','))
    }
    if (sec.totalRow) {
      lines.push(sec.cols.map(c => escape(sec.totalRow![c.key])).join(','))
    }
    lines.push('')
  }
  triggerDownload(lines.join('\r\n'), 'text/csv;charset=utf-8;', filename ?? safeFilename(title, 'csv'))
}

// ─────────────────────────────────────────────────────────────
// ████  XLSX exports
// ─────────────────────────────────────────────────────────────

/** Export a flat table as XLSX. */
export function exportTableXLSX(
  title: string,
  cols: ExportCol[],
  rows: Record<string, unknown>[],
  filename?: string
) {
  const companyName = readSelectedCompanyName()
  const aoa: unknown[][] = [
    [companyName],
    [title],
    [],
    cols.map(c => c.header),
    ...rows.map(row => cols.map(c => row[c.key] ?? ''))
  ]
  const ws = XLSX.utils.aoa_to_sheet(aoa)

  // bold the header row (row 4, 0-indexed = 3)
  ws['!cols'] = cols.map(c => ({ wch: Math.max(c.header.length + 2, c.width ?? 14) }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31))
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  triggerDownload(wbout, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', filename ?? safeFilename(title, 'xlsx'))
}

/**
 * Export a multi-section financial statement as XLSX.
 * Each section gets its own header row, data rows, optional total row,
 * followed by a blank separator row — all on one sheet.
 */
export function exportFinancialXLSX(
  title: string,
  subtitle: string,
  sections: FinSection[],
  filename?: string
) {
  const companyName = readSelectedCompanyName()
  const aoa: unknown[][] = [
    [companyName],
    [title],
    [subtitle],
    []
  ]
  for (const sec of sections) {
    aoa.push([sec.heading])
    aoa.push(sec.cols.map(c => c.header))
    for (const row of sec.rows) {
      aoa.push(sec.cols.map(c => row[c.key] ?? ''))
    }
    if (sec.totalRow) {
      aoa.push(sec.cols.map(c => sec.totalRow![c.key] ?? ''))
    }
    aoa.push([])
  }
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  const maxCols = Math.max(...sections.map(s => s.cols.length))
  ws['!cols'] = Array.from({ length: maxCols }, (_, i) => {
    const w = Math.max(...sections.map(s => s.cols[i]?.width ?? s.cols[i]?.header.length ?? 10))
    return { wch: w + 4 }
  })
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31))
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  triggerDownload(wbout, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', filename ?? safeFilename(title, 'xlsx'))
}

// ─────────────────────────────────────────────────────────────
// ████  PDF exports
// ─────────────────────────────────────────────────────────────

/** Export a flat table as PDF. Auto-selects landscape for wide tables (>6 cols). */
export function exportTablePDF(
  title: string,
  subtitle: string,
  cols: ExportCol[],
  rows: Record<string, unknown>[],
  footerRow?: Record<string, unknown>,
  filename?: string
) {
  const landscape = cols.length > 6
  const doc = new jsPDF({
    orientation: landscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'legal'
  })

  drawPdfHeader(doc, title, subtitle)

  const head  = [cols.map(c => c.header)]
  const body  = rows.map(row => cols.map(c => {
    const v = row[c.key]; return v == null ? '' : String(v)
  }))

  // add total/footer row with distinct styling handled via willDrawCell
  const footerRowIdx = footerRow ? body.length : -1
  if (footerRow) {
    body.push(cols.map(c => {
      const v = footerRow[c.key]; return v == null ? '' : String(v)
    }))
  }

  autoTable(doc, {
    startY: 34,
    head,
    body,
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: { top: 2, bottom: 2, left: 3, right: 3 },
      textColor: [0, 0, 0],
      lineColor: [220, 220, 220],
      lineWidth: 0.1
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 8,
      lineColor: [100, 100, 100],
      lineWidth: 0.2
    },
    alternateRowStyles: { fillColor: [255, 255, 255] },
    columnStyles: buildColStyles(cols, landscape ? 332 : 188),
    margin: { left: 14, right: 14 },
    willDrawCell: (data) => {
      if (data.section === 'body' && data.row.index === footerRowIdx) {
        doc.setFillColor(255, 255, 255)
        doc.setFont('helvetica', 'bold')
      }
    },
    didDrawPage: (data) => { drawPdfFooter(doc, data.pageNumber) }
  })

  triggerDownload(doc.output('blob'), 'application/pdf', filename ?? safeFilename(title, 'pdf'))
}

/**
 * Export a multi-section financial statement as PDF.
 * Each section is rendered as a separate labelled table.
 * Continues on same page if room, adds a new page otherwise.
 */
export function exportFinancialPDF(
  title: string,
  subtitle: string,
  sections: FinSection[],
  filename?: string
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'legal' })
  drawPdfHeader(doc, title, subtitle)

  let currentY = 36
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 14

  for (const sec of sections) {
    // Section heading band
    if (currentY + 12 > pageHeight - 20) {
      doc.addPage()
      drawPdfHeader(doc, title, subtitle)
      currentY = 36
    }

    doc.setDrawColor(180, 180, 180)
    doc.setLineWidth(0.2)
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    const w = doc.internal.pageSize.getWidth() - margin * 2
    doc.roundedRect(margin, currentY, w, 6, 1, 1, 'S')
    doc.text(sec.heading, margin + 3, currentY + 4.2)
    currentY += 8

    const head = [sec.cols.map(c => c.header)]
    const body = sec.rows.map(row => sec.cols.map(c => {
      const v = row[c.key]; return v == null ? '' : String(v)
    }))
    const footerIdx = sec.totalRow ? body.length : -1
    if (sec.totalRow) {
      body.push(sec.cols.map(c => {
        const v = sec.totalRow![c.key]; return v == null ? '' : String(v)
      }))
    }

    autoTable(doc, {
      startY: currentY,
      head,
      body,
      styles: {
        font: 'helvetica',
        fontSize: 8,
        cellPadding: { top: 1.5, bottom: 1.5, left: 3, right: 3 },
        textColor: [0, 0, 0],
        lineColor: [220, 220, 220],
        lineWidth: 0.1
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 7.5,
        lineColor: [120, 120, 120],
        lineWidth: 0.2
      },
      alternateRowStyles: { fillColor: [255, 255, 255] },
      columnStyles: buildColStyles(sec.cols, 188),
      margin: { left: margin, right: margin },
      willDrawCell: (data) => {
        if (data.section === 'body' && data.row.index === footerIdx) {
          doc.setFillColor(255, 255, 255)
          doc.setFont('helvetica', 'bold')
        }
      },
      didDrawPage: (data) => { drawPdfFooter(doc, data.pageNumber) }
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    currentY = (doc as any).lastAutoTable.finalY + 6
  }

  triggerDownload(doc.output('blob'), 'application/pdf', filename ?? safeFilename(title, 'pdf'))
}

// ─────────────────────────────────────────────────────────────
// ████ Voucher PDF (1 CDV per page)
// ─────────────────────────────────────────────────────────────

export function exportVouchersPDF(
  masters: any[],
  lines: any[],
  companyName: string,
  acctDescMap: Record<string, string>,
  includeCheckNo: boolean = false,
  includeSignatories: boolean = true
) {
  const doc = new jsPDF({ orientation: 'portrait', format: 'letter', unit: 'mm' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 14
  const usableW = pageWidth - margin * 2

  const fmt = (n: any) => (!n || isNaN(Number(n)) || Number(n) === 0) ? '' : Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  masters.forEach((master, index) => {
    if (index > 0) doc.addPage()

    // Header Content
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text(companyName, margin, margin)
    
    doc.setFontSize(14)
    doc.text("Check Disbursement Voucher", margin, margin + 8)

    // CDV Details block
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text("CDV No.", margin, margin + 18)
    doc.text("Date", margin + 30, margin + 18)
    doc.text("Payee", margin + 60, margin + 18)
    if (includeCheckNo) {
      doc.text("Check No.", pageWidth - margin - 30, margin + 18)
    }

    doc.setFont('helvetica', 'normal')
    doc.text(master.jJvNo || '', margin, margin + 23)
    const dateStr = master.jDate ? new Date(master.jDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : ''
    doc.text(dateStr, margin + 30, margin + 23)
    doc.text(master.jPayTo || '', margin + 60, margin + 23)
    if (includeCheckNo) {
      doc.text(master.jCkNo || '', pageWidth - margin - 30, margin + 23)
    }

    // Draw thin line separator
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.2)
    doc.line(margin, margin + 26, pageWidth - margin, margin + 26)

    // Filter lines for this master
    const voucherLines = lines.filter((l: any) => l.jCkNo === master.jCkNo)
    let totalDebit = 0
    let totalCredit = 0

    const body = voucherLines.map((l: any) => {
      const isDebit = l.jDOrC?.toUpperCase() === 'D'
      const isCredit = l.jDOrC?.toUpperCase() === 'C'
      const amt = Number(l.jCkAmt) || 0
      
      if (isDebit) totalDebit += amt
      if (isCredit) totalCredit += amt

      return [
        l.acctCode || '',
        acctDescMap[l.acctCode] || '',
        isDebit ? fmt(amt) : '',
        isCredit ? fmt(amt) : ''
      ]
    })

    // Totals row
    body.push([
      '',
      'Totals ->',
      fmt(totalDebit),
      fmt(totalCredit)
    ])

    autoTable(doc, {
      startY: margin + 28,
      head: [['Acct#', 'Account Description', 'Debit', 'Credit']],
      body,
      styles: {
        font: 'helvetica',
        fontSize: 8,
        cellPadding: { top: 1.5, bottom: 1.5, left: 3, right: 3 },
        textColor: [0, 0, 0],
        lineColor: [220, 220, 220],
        lineWidth: 0.1
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 7.5,
        lineColor: [120, 120, 120],
        lineWidth: 0.2
      },
      alternateRowStyles: { fillColor: [255, 255, 255] },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 30, halign: 'right' }
      },
      willDrawCell: (data) => {
        if (data.section === 'body' && data.row.index === body.length - 1) {
          doc.setFillColor(255, 255, 255)
          doc.setFont('helvetica', 'bold')
        }
      }
    })

    // @ts-ignore
    let currentY = doc.lastAutoTable.finalY + 10

    // Remarks
    doc.setFont('helvetica', 'bold')
    doc.text("EXPLANATION/Remarks:", margin, currentY)
    doc.setFont('helvetica', 'normal')
    const remarksStr = (master.jDesc || '').toUpperCase()
    const remarks = doc.splitTextToSize(remarksStr, usableW - 45)
    doc.text(remarks, margin + 45, currentY)
    
    currentY += remarks.length * 5 + 15

    // Check if we need a new page for the footer box
    const footerHeight = 25
    if (includeSignatories) {
      if (currentY + footerHeight > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage()
        currentY = margin + 10
      }

      // Signature Footer (thin line hollow box)
      doc.setDrawColor(180, 180, 180)
      doc.setLineWidth(0.2)
      // Draw outer box
      doc.rect(margin, currentY, usableW, footerHeight)
      
      // Draw vertical dashed lines to split into 5 boxes
      const boxW = usableW / 5
      for (let i = 1; i < 5; i++) {
          doc.setLineDashPattern([1, 1], 0)
          doc.line(margin + boxW * i, currentY, margin + boxW * i, currentY + footerHeight)
      }
      doc.setLineDashPattern([], 0) // reset

      doc.setFontSize(8)
      doc.text("PREPARED BY:", margin + 2, currentY + 4)
      doc.text("APPROVED BY:", margin + boxW + 2, currentY + 4)
      doc.text("PAYMENT RECEIVED BY:", margin + boxW * 2 + 2, currentY + 4)
      doc.text("DATE RELEASED:", margin + boxW * 3 + 2, currentY + 4)
      doc.text("PAYEE'S O/R-NO.:", margin + boxW * 4 + 2, currentY + 4)
    }

  })

  triggerDownload(doc.output('blob'), 'application/pdf', `CDVs_Printout_${Date.now()}.pdf`)
}
