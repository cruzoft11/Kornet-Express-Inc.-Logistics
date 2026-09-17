import { useCallback } from 'react'
import { useIntegrationsStore } from '../stores/integrationsStore'

/**
 * Returns a guard function that verifies a required integration is connected
 * before an action proceeds. When the integration is not connected it opens the
 * Integrations settings panel and returns `false`, so callers can bail out.
 *
 * Usage:
 *   const requireIntegration = useRequireIntegration()
 *   if (!requireIntegration('boc-e2m', 'Bureau of Customs e2m')) return
 */
export function useRequireIntegration() {
  const isConnected = useIntegrationsStore((s) => s.isConnected)
  const openSettings = useIntegrationsStore((s) => s.openSettings)

  return useCallback(
    (key: string, label?: string): boolean => {
      if (isConnected(key)) return true
      openSettings()
      // eslint-disable-next-line no-alert
      alert(
        `${label ?? key} is not connected.\n\n` +
          'Enable it in Settings › Integrations before using this feature.'
      )
      return false
    },
    [isConnected, openSettings]
  )
}
