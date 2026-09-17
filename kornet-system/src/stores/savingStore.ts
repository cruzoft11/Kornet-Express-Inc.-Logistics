import { create } from 'zustand'

export type SavingState = 'idle' | 'typing' | 'saving' | 'saved'

interface SavingStore {
  status: SavingState
  setStatus: (status: SavingState) => void
  triggerChange: () => void
  triggerSave: () => void
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let savedTimer: ReturnType<typeof setTimeout> | null = null

export const useSavingStore = create<SavingStore>((set) => ({
  status: 'idle',
  setStatus: (status) => set({ status }),
  triggerChange: () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    if (savedTimer) clearTimeout(savedTimer)
    
    set({ status: 'typing' })
    
    // Simulate auto-save trigger after 800ms of no typing
    debounceTimer = setTimeout(() => {
      set({ status: 'saving' })
      
      // Simulate save completion after 1000ms
      savedTimer = setTimeout(() => {
        set({ status: 'saved' })
        
        // Return to idle state after 3000ms
        savedTimer = setTimeout(() => {
          set({ status: 'idle' })
        }, 3000)
      }, 1000)
    }, 800)
  },
  triggerSave: () => {
    // Immediate save call trigger (e.g. when axios.post succeeds)
    if (debounceTimer) clearTimeout(debounceTimer)
    if (savedTimer) clearTimeout(savedTimer)
    set({ status: 'saving' })
    savedTimer = setTimeout(() => {
      set({ status: 'saved' })
      savedTimer = setTimeout(() => {
        set({ status: 'idle' })
      }, 3000)
    }, 800)
  }
}))
