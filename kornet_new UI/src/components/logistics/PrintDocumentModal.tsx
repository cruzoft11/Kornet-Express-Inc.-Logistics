import { useLogisticsStore } from '../../stores/logisticsStore'
import { downloadBolPdf, downloadAwbPdf, downloadManifestPdf, downloadCheckVoucherPdf } from '../../utils/freightPdf'

export default function PrintDocumentModal() {
  const { printDocPayload, modalOpen, setModalOpen } = useLogisticsStore()

  if (!printDocPayload || !modalOpen.printDoc) return null

  const handlePrint = () => {
    window.print()
  }

  const handleClose = () => {
    setModalOpen('printDoc', false)
  }

  const { type, title, data } = printDocPayload

  const handleDirectDownloadPdf = () => {
    if (!data) return
    if (type === 'BOL') {
      downloadBolPdf(data)
    } else if (type === 'AWB') {
      downloadAwbPdf(data)
    } else if (type === 'MANIFEST') {
      downloadManifestPdf(data)
    } else if (type === 'CHECK_VOUCHER') {
      downloadCheckVoucherPdf(data)
    } else {
      window.print()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto print:p-0 print:bg-white animate-in fade-in duration-200">
      <div className="liquid-glass-card border border-white/15 text-slate-900 rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:border-none print:w-full print:rounded-none bg-white">
        {/* Modal Toolbar (hidden when printing) */}
        <div className="px-6 py-4 bg-[#08192e] text-white flex items-center justify-between print:hidden border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-cyan-400">
              <span className="material-symbols-outlined text-[18px]">print</span>
            </div>
            <span className="font-bold text-sm tracking-wide text-white">{title}</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              Official FMC / IATA Document Format
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDirectDownloadPdf}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 border border-emerald-400/40 flex items-center gap-1.5 transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              Download PDF
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 border border-blue-400/40 flex items-center gap-1.5 transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              Print Document
            </button>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        {/* Printable Document Sheet */}
        <div className="p-8 overflow-y-auto flex-1 font-serif text-[13px] leading-relaxed bg-white print:p-2">
          {/* Document Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-950 uppercase font-sans">
                  KORNET EXPRESS, INC.
                </h1>
                <p className="text-xs text-slate-600 font-sans mt-0.5 font-bold">
                  FMC Licensed Ocean Transportation Intermediary & IATA Air Cargo Agent • CAB Registered • PCCBI Member
                </p>
                <p className="text-[11px] text-slate-500 font-sans">
                  JJM Building, No. 5 Ninoy Aquino Avenue, Brgy. San Dionisio, Parañaque City, Metro Manila 1700 • Tel: (+63) 2-8826-0012 to 14 • cs.impex@kornet.com.ph
                </p>
              </div>
              <div className="text-right font-sans">
                <div className="inline-block border-2 border-slate-900 px-3 py-1 bg-slate-50">
                  <span className="block text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                    {type === 'BOL' ? 'BILL OF LADING NO.' : type === 'AWB' ? 'AIR WAYBILL NO.' : type === 'DOCK_RECEIPT' ? 'DOCK RECEIPT NO.' : type === 'BARCODE_LABELS' ? 'CARGO STAGING LABEL' : 'DOCUMENT NO.'}
                  </span>
                  <span className="text-base font-black text-slate-950 tracking-wider">
                    {data?.blOrAwbNo || data?.orderNo || data?.guideNo || data?.checkNo || data?.vin || 'KE-LABEL-2026'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">FILE REF: {data?.fileNo || data?.reference || data?.vin || 'GENERAL STAGING'}</p>
              </div>
            </div>
          </div>

          {/* Document Content Switcher */}
          {type === 'BOL' && (
            <div>
              <div className="grid grid-cols-2 gap-4 border border-slate-400 mb-4 p-3 font-sans text-xs">
                <div className="border-r border-slate-300 pr-3">
                  <span className="font-bold text-[10px] uppercase text-slate-500 block">1. Shipper / Exporter:</span>
                  <p className="font-bold text-slate-900 mt-0.5">{data.shipper || 'N/A'}</p>
                  <p className="text-slate-600 text-[11px]">{data.origin || 'United States'}</p>
                </div>
                <div>
                  <span className="font-bold text-[10px] uppercase text-slate-500 block">2. Consigned to:</span>
                  <p className="font-bold text-slate-900 mt-0.5">{data.consignee || 'N/A'}</p>
                  <p className="text-slate-600 text-[11px]">{data.destination || 'Philippines'}</p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 border border-slate-400 p-2 font-sans text-[11px] mb-4 bg-slate-50/50">
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-500 block">Port of Loading</span>
                  <span className="font-bold text-slate-800">{data.portOfLoading || data.origin}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-500 block">Port of Discharge</span>
                  <span className="font-bold text-slate-800">{data.portOfDischarge || data.destination}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-500 block">Vessel & Voyage</span>
                  <span className="font-bold text-slate-800">{data.vesselOrFlight} {data.voyageOrFlightNo}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase text-slate-500 block">Freight Terms</span>
                  <span className="font-bold text-emerald-800 uppercase">FREIGHT PREPAID</span>
                </div>
              </div>

              <table className="w-full border-collapse border border-slate-400 text-left font-sans text-xs mb-6">
                <thead>
                  <tr className="bg-slate-200 text-slate-800 text-[10px] uppercase font-black">
                    <th className="border border-slate-400 p-2">Container & Seal No.</th>
                    <th className="border border-slate-400 p-2">No. of Pcs / Pkgs</th>
                    <th className="border border-slate-400 p-2">Description of Packages & Goods</th>
                    <th className="border border-slate-400 p-2">Gross Weight</th>
                    <th className="border border-slate-400 p-2">Measurement</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-400 p-2 align-top font-mono text-[11px]">
                      {data.containerNo || 'MSKU-992144-8'}<br />
                      SEAL: {data.sealNo || 'SL-884102'}
                    </td>
                    <td className="border border-slate-400 p-2 align-top font-bold">
                      {data.pieces || 1} UNIT(S)
                    </td>
                    <td className="border border-slate-400 p-2 align-top">
                      <p className="font-bold text-slate-900">{data.natureOfGoods || 'Vehicles & Automotive Equipment'}</p>
                      <p className="text-[10px] text-slate-600 mt-1 whitespace-pre-line font-mono">{data.marksAndNumbers || 'STOWED IN 40HC CONTAINER'}</p>
                    </td>
                    <td className="border border-slate-400 p-2 align-top font-bold">
                      {data.weightKg ? `${data.weightKg.toLocaleString()} KGS` : '3,366 LBS'}
                    </td>
                    <td className="border border-slate-400 p-2 align-top font-bold">
                      {data.volumeCbm ? `${data.volumeCbm} CBM` : '68.5 CBM'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {type === 'AWB' && (
            <div>
              <div className="border border-slate-400 p-3 font-sans text-xs mb-4 grid grid-cols-2 gap-4">
                <div>
                  <span className="font-bold text-[10px] uppercase text-slate-500 block">Shipper's Name and Address</span>
                  <p className="font-bold text-slate-900">{data.shipper}</p>
                  <p className="text-slate-600 text-[11px]">{data.origin}</p>
                </div>
                <div>
                  <span className="font-bold text-[10px] uppercase text-slate-500 block">Consignee's Name and Address</span>
                  <p className="font-bold text-slate-900">{data.consignee}</p>
                  <p className="text-slate-600 text-[11px]">{data.destination}</p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 border border-slate-400 p-2 font-sans text-[11px] mb-4 bg-slate-50">
                <div>
                  <span className="text-[9px] font-bold text-slate-500 block uppercase">Airport of Departure</span>
                  <span className="font-bold">{data.origin}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-500 block uppercase">Airport of Destination</span>
                  <span className="font-bold">{data.destination}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-500 block uppercase">Flight / Date</span>
                  <span className="font-bold">{data.vesselOrFlight}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-500 block uppercase">Handling Info</span>
                  <span className="font-bold text-blue-700">TEMPERATURE CONTROLLED</span>
                </div>
              </div>

              <table className="w-full border-collapse border border-slate-400 font-sans text-xs mb-6">
                <thead>
                  <tr className="bg-slate-200 text-[10px] uppercase font-black">
                    <th className="border border-slate-400 p-2">Pcs</th>
                    <th className="border border-slate-400 p-2">Gross Weight</th>
                    <th className="border border-slate-400 p-2">Kg/Lb</th>
                    <th className="border border-slate-400 p-2">Rate Class</th>
                    <th className="border border-slate-400 p-2">Chargeable Weight</th>
                    <th className="border border-slate-400 p-2">Nature and Quantity of Goods</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-400 p-2 font-bold">{data.pieces}</td>
                    <td className="border border-slate-400 p-2 font-bold">{data.weightKg}</td>
                    <td className="border border-slate-400 p-2">KGS</td>
                    <td className="border border-slate-400 p-2">{data.rateClass || 'Q'}</td>
                    <td className="border border-slate-400 p-2 font-black text-blue-900">{data.chargeableWeightKg || data.weightKg} KGS</td>
                    <td className="border border-slate-400 p-2">{data.natureOfGoods}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {type === 'DOCK_RECEIPT' && (
            <div>
              <div className="bg-amber-50 border border-amber-300 p-3 rounded mb-4 font-sans text-xs">
                <span className="font-bold text-amber-900 uppercase">Warehouse Staging & Cartage Receipt:</span>
                <p className="text-amber-800 text-[11px] mt-0.5">
                  Cargo received at dock facility in good order and condition except as noted.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 border border-slate-400 p-3 font-sans text-xs mb-4">
                <div>
                  <span className="font-bold text-[10px] uppercase text-slate-500 block">Driver / Truck Details:</span>
                  <p className="font-bold text-slate-900">{data.driver || 'Assigned Carrier'}</p>
                  <p className="text-slate-600 text-[11px]">Route: {data.route || 'Port Corridor'}</p>
                </div>
                <div>
                  <span className="font-bold text-[10px] uppercase text-slate-500 block">Scheduled Delivery:</span>
                  <p className="font-bold text-slate-900">{data.scheduledDate}</p>
                  <p className="text-slate-600 text-[11px]">Barcode Ref: {data.barcode}</p>
                </div>
              </div>
            </div>
          )}

          {type === 'CHECK_VOUCHER' && (
            <div>
              <div className="border-2 border-emerald-800 p-4 rounded-lg bg-emerald-50/40 mb-6 font-sans">
                <div className="flex justify-between items-center border-b border-emerald-300 pb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">Bank Account / Drawee:</span>
                    <span className="font-bold text-sm text-slate-900">{data.bankName}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">Check Amount:</span>
                    <span className="text-xl font-black text-emerald-900">${data.amount?.toFixed(2)}</span>
                  </div>
                </div>
                <div className="pt-3 flex justify-between items-center text-xs">
                  <div>
                    <span className="text-slate-500 font-semibold">Pay To The Order Of:</span>
                    <p className="text-base font-black text-slate-950 mt-0.5">{data.vendor}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 font-semibold">Check Date:</span>
                    <p className="font-bold text-slate-900">{data.date}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {type === 'BARCODE_LABELS' && (
            <div className="max-w-md mx-auto border-4 border-slate-900 rounded-2xl p-6 bg-white shadow-sm font-sans">
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3 mb-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">PHILIPPINE CARGO ROUTING</span>
                  <h3 className="text-xl font-black text-slate-950">KORNET EXPRESS</h3>
                  <p className="text-[10px] text-slate-600 font-bold">EXPRESS FREIGHT & CARGO TAG</p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-bold text-slate-400 block">HUB DESTINATION</span>
                  <span className="text-sm font-black text-blue-700 uppercase">
                    {data?.destination?.includes('Cebu') ? 'CEB / VISAYAS' : data?.destination?.includes('Davao') ? 'DVO / MINDANAO' : 'MNL / LUZON'}
                  </span>
                </div>
              </div>

              {/* Barcode graphic simulation */}
              <div className="my-4 p-4 bg-slate-50 border-2 border-slate-300 rounded-xl text-center">
                <div className="h-16 flex items-center justify-center gap-1 overflow-hidden px-4">
                  {[4,2,6,1,3,5,2,4,1,6,3,2,5,1,4,2,6,3,5,1,2,4,6,1,3,2,5,4,2,6,1,3,5,2,4,1,6].map((w, i) => (
                    <div
                      key={i}
                      className="bg-slate-950 h-full"
                      style={{ width: `${w * 2}px` }}
                    />
                  ))}
                </div>
                <p className="font-mono text-sm font-black tracking-widest text-slate-900 mt-2">
                  *{data?.blOrAwbNo || data?.fileNo || data?.vin || 'KN-STG-2026-0001'}*
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs border-b border-slate-300 pb-3 mb-3">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Total Package Count</span>
                  <strong className="text-slate-900 text-sm">{data?.pieces || 1} PKG</strong>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Gross Weight</span>
                  <strong className="text-slate-900 text-sm">
                    {data?.weightKg ? `${data.weightKg.toLocaleString()} KG` : 'STANDARD STAGED'}
                  </strong>
                </div>
              </div>

              <div className="text-xs space-y-1 mb-4">
                <p><span className="text-slate-500 font-semibold">SHIPPER:</span> <strong>{data?.shipper || 'KORNET STAGING WAREHOUSE'}</strong></p>
                <p><span className="text-slate-500 font-semibold">CONSIGNEE:</span> <strong>{data?.consignee || 'Not provided'}</strong></p>
                <p><span className="text-slate-500 font-semibold">DESTINATION:</span> <strong>{data?.destination || 'PORT OF MANILA'}</strong></p>
              </div>

              <div className="p-2.5 bg-slate-100 rounded-lg text-center text-[10px] font-bold uppercase tracking-wider text-slate-700 flex justify-around">
                <span>&uarr; THIS SIDE UP</span>
                <span>&bull;</span>
                <span>KEEP DRY</span>
                <span>&bull;</span>
                <span>FRAGILE</span>
              </div>
            </div>
          )}

          {/* Signature and Verification Footer */}
          <div className="pt-8 border-t border-slate-300 mt-8 grid grid-cols-3 gap-6 font-sans text-[11px]">
            <div>
              <span className="block border-b border-slate-400 pb-8 mb-1"></span>
              <span className="text-slate-500 font-bold block uppercase text-[9px]">Authorized Signatory</span>
              <span className="font-semibold text-slate-900">Kornet Express Logistics Corp</span>
            </div>
            <div>
              <span className="block border-b border-slate-400 pb-8 mb-1"></span>
              <span className="text-slate-500 font-bold block uppercase text-[9px]">Carrier / Driver Acceptance</span>
              <span className="font-semibold text-slate-900">Received By (Signature)</span>
            </div>
            <div>
              <span className="block border-b border-slate-400 pb-8 mb-1"></span>
              <span className="text-slate-500 font-bold block uppercase text-[9px]">Customs / Security Clearance</span>
              <span className="font-semibold text-slate-900">Official Stamp & Date</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
