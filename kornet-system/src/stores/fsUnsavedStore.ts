import { create } from 'zustand'

interface FsUnsavedState {
  hasUnsavedChanges: boolean
  setHasUnsavedChanges: (value: boolean) => void
}

export const useFsUnsavedStore = create<FsUnsavedState>((set) => ({
  hasUnsavedChanges: false,
  setHasUnsavedChanges: (value) => set({ hasUnsavedChanges: value })
}))
