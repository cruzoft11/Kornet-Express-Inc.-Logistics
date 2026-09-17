import React, { useState } from 'react'
import { useLogisticsStore } from '../../stores/logisticsStore'

export default function AttachmentModal() {
  const { modalOpen, setModalOpen, selectedFileNo, shipments } = useLogisticsStore()
  const [attachments, setAttachments] = useState<{ name: string; size: string; type: string; date: string }[]>([
    { name: 'Commercial_Invoice_Packing_List.pdf', size: '1.2 MB', type: 'application/pdf', date: '2026-09-02' },
    { name: 'Customs_Declaration_AES_Approval.pdf', size: '480 KB', type: 'application/pdf', date: '2026-09-04' },
    { name: 'Container_Seal_Verification_Photo.jpg', size: '2.8 MB', type: 'image/jpeg', date: '2026-09-08' }
  ])
  const [isUploading, setIsUploading] = useState(false)

  if (!modalOpen.attachments) return null

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setTimeout(() => {
      setAttachments((prev) => [
        {
          name: file.name,
          size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
          type: file.type || 'application/octet-stream',
          date: new Date().toISOString().split('T')[0]
        },
        ...prev
      ])
      setIsUploading(false)
    }, 600)
  }

  const currentShipment = shipments.find((s) => s.fileNo === selectedFileNo) || shipments[0]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl shadow-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-blue-400">attach_file</span>
            <div>
              <h2 className="font-bold text-sm">Operational Document & File Attachments</h2>
              <p className="text-[11px] text-slate-400">Linked to File #{currentShipment?.fileNo || 'KN-OE-2026-0891'}</p>
            </div>
          </div>
          <button
            onClick={() => setModalOpen('attachments', false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Upload Drop Zone */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
          <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors text-center bg-white dark:bg-slate-800">
            <span className="material-symbols-outlined text-3xl text-blue-600 mb-2">cloud_upload</span>
            <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
              {isUploading ? 'Uploading file...' : 'Click or Drag & Drop documents to attach'}
            </span>
            <span className="text-[10px] text-slate-400 mt-1">Supports PDF, JPG, PNG, DOCX up to 25MB (POD, Title, Inspection Photos)</span>
            <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
          </label>
        </div>

        {/* Attached Files List */}
        <div className="p-6 overflow-y-auto max-h-72">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Attached Documents ({attachments.length})</h3>
          <div className="space-y-2">
            {attachments.map((att, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">
                      {att.type.includes('image') ? 'image' : 'description'}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block">{att.name}</span>
                    <span className="text-[10px] text-slate-400">
                      {att.size} • Uploaded {att.date}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.alert(`Opening document preview for ${att.name}`)}
                    className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-[11px] font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">visibility</span>
                    Preview
                  </button>
                  <button
                    onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                    className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end">
          <button
            onClick={() => setModalOpen('attachments', false)}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
