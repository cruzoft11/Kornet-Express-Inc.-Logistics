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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="liquid-glass-card border border-white/15 text-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col backdrop-blur-2xl relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="px-6 py-4 bg-white/5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-400">
              <span className="material-symbols-outlined text-[18px]">attach_file</span>
            </div>
            <div>
              <h2 className="font-bold text-sm text-white tracking-wide">Operational Document &amp; File Attachments</h2>
              <p className="text-[11px] text-slate-400">Linked to File #{currentShipment?.fileNo || 'KN-OE-2026-0891'}</p>
            </div>
          </div>
          <button
            onClick={() => setModalOpen('attachments', false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Upload Drop Zone */}
        <div className="p-6 border-b border-white/10 bg-black/20">
          <label className="border-2 border-dashed border-white/15 hover:border-cyan-400/50 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all text-center bg-white/5 hover:bg-white/[0.08] backdrop-blur-md group">
            <span className="material-symbols-outlined text-3xl text-cyan-400 group-hover:scale-110 transition-transform mb-2">cloud_upload</span>
            <span className="font-bold text-xs text-white">
              {isUploading ? 'Uploading file...' : 'Click or Drag & Drop documents to attach'}
            </span>
            <span className="text-[10px] text-slate-400 mt-1">Supports PDF, JPG, PNG, DOCX up to 25MB (POD, Title, Inspection Photos)</span>
            <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
          </label>
        </div>

        {/* Attached Files List */}
        <div className="p-6 overflow-y-auto max-h-72 custom-scrollbar">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Attached Documents ({attachments.length})</h3>
          <div className="space-y-2">
            {attachments.map((att, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3.5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/[0.08] backdrop-blur-md transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">
                      {att.type.includes('image') ? 'image' : 'description'}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-xs text-white block">{att.name}</span>
                    <span className="text-[10px] text-slate-400">
                      {att.size} &bull; Uploaded {att.date}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.alert(`Opening document preview for ${att.name}`)}
                    className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-[11px] font-semibold text-slate-200 flex items-center gap-1 transition-all"
                  >
                    <span className="material-symbols-outlined text-[14px]">visibility</span>
                    Preview
                  </button>
                  <button
                    onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                    className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/20 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white/5 border-t border-white/10 flex justify-end">
          <button
            onClick={() => setModalOpen('attachments', false)}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 border border-blue-400/40 transition-all active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
