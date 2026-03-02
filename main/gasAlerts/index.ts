import { subscribe } from 'valtio'
import { Notification } from 'electron'
import log from 'electron-log'

import state from '../store'
import { weiHexToGweiInt } from '../../resources/utils'

const NOTIFY_COOLDOWN_MS = 5 * 60 * 1000 // 5 minutes
const lastNotifiedAt: Record<string, number> = {}

function checkGasAlerts() {
  const alerts = (state.main as any).gasAlerts as
    | Record<string, { threshold: number; enabled: boolean; unit: string }>
    | undefined
  if (!alerts) return

  const networksMeta = (state.main.networksMeta as any).ethereum
  if (!networksMeta) return

  const networks = (state.main.networks as any).ethereum
  if (!networks) return

  const now = Date.now()

  for (const [chainId, alert] of Object.entries(alerts)) {
    if (!alert.enabled) continue

    const meta = networksMeta[chainId]
    if (!meta?.gas?.price?.levels?.fast) continue

    const fastGwei = weiHexToGweiInt(meta.gas.price.levels.fast)
    if (!fastGwei || fastGwei <= 0) continue

    if (fastGwei < alert.threshold) {
      const lastTime = lastNotifiedAt[chainId] || 0
      if (now - lastTime < NOTIFY_COOLDOWN_MS) continue

      lastNotifiedAt[chainId] = now

      const chainName = networks[chainId]?.name || `Chain ${chainId}`

      try {
        const notification = new Notification({
          title: `Low Gas Price on ${chainName}`,
          body: `Gas is ${fastGwei.toFixed(1)} gwei (below ${alert.threshold} gwei threshold)`
        })
        notification.show()
      } catch (e) {
        log.error('Gas alert notification error', e)
      }
    }
  }
}

subscribe(state, () => {
  checkGasAlerts()
})

log.info('Gas alert monitor initialized')
