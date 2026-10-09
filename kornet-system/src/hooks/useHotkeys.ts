type HotkeyHandler = (event: KeyboardEvent) => void
export interface Hotkey { key: string; description: string; handler: HotkeyHandler; when?: boolean }

export function useHotkeys(_hotkeys: Hotkey[]) {
  // All shortcut keys disabled per user requirement
}
