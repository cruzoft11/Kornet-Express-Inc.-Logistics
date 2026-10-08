import { useEffect } from 'react'

type HotkeyHandler = (event: KeyboardEvent) => void
export interface Hotkey { key: string; description: string; handler: HotkeyHandler; when?: boolean }

function normalize(event: KeyboardEvent) {
  const parts: string[] = []
  if (event.ctrlKey || event.metaKey) parts.push('Mod')
  if (event.altKey) parts.push('Alt')
  if (event.shiftKey) parts.push('Shift')
  parts.push(event.key.length === 1 ? event.key.toUpperCase() : event.key)
  return parts.join('+')
}

export function useHotkeys(hotkeys: Hotkey[]) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isTyping = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable
      const key = normalize(event)
      const bare = event.key.length === 1 ? event.key.toUpperCase() : event.key
      const match = hotkeys.find((h) => h.when !== false && (h.key === key || (!isTyping && h.key === bare)))
      if (!match) return
      event.preventDefault()
      match.handler(event)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [hotkeys])
}
