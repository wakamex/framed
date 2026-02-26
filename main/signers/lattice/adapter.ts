import log from 'electron-log'

import { subscribe } from 'valtio'
import { SignerAdapter } from '../adapters'
import state from '../../store'
import { updateLattice, removeLattice } from '../../store/actions'
import Lattice from './Lattice'
import { Derivation } from '../Signer/derive'

interface GlobalLatticeSettings {
  baseUrl: string
  accountLimit: number
  derivation: Derivation
}

interface LatticeSettings extends GlobalLatticeSettings {
  deviceName: string
  tag: string
  privKey: string
  paired: boolean
}

function getLatticeSettings(deviceId: string): LatticeSettings {
  const { baseUrl, derivation, accountLimit } = getGlobalLatticeSettings()
  const device = state.main.lattice[deviceId] as any

  return { ...device, baseUrl, derivation, accountLimit }
}

function getGlobalLatticeSettings(): GlobalLatticeSettings {
  const accountLimit = state.main.latticeSettings.accountLimit
  const derivation = state.main.latticeSettings.derivation
  const endpointMode = state.main.latticeSettings.endpointMode
  const baseUrl =
    endpointMode === 'custom' ? state.main.latticeSettings.endpointCustom : 'https://signing.gridpl.us'

  return { baseUrl, derivation, accountLimit }
}

export default class LatticeAdapter extends SignerAdapter {
  private knownSigners: { [deviceId: string]: Lattice }

  private signerObserver: any
  private settingsObserver: any

  constructor() {
    super('lattice')

    this.knownSigners = {}
  }

  open() {
    this.settingsObserver = subscribe(state, () => {
      const { baseUrl, derivation, accountLimit } = getGlobalLatticeSettings()

      Object.values(this.knownSigners).forEach((lattice) => {
        if (!lattice.connection) return

        let needsUpdate = false,
          reloadAddresses = false

        if (derivation !== lattice.derivation) {
          lattice.derivation = derivation
          lattice.addresses = []

          reloadAddresses = true
        }

        if (accountLimit !== lattice.accountLimit) {
          lattice.accountLimit = accountLimit

          reloadAddresses = reloadAddresses || lattice.addresses.length < lattice.accountLimit
          needsUpdate = true
        }
        if (baseUrl !== lattice.connection.baseUrl) {
          // if any connection settings have changed, re-connect
          this.reload(lattice)
        } else if (reloadAddresses) {
          lattice.deriveAddresses()
        } else if (needsUpdate) {
          this.emit('update', lattice)
        }
      })
    })

    this.signerObserver = subscribe(state, () => {
      const devices: { [id: string]: LatticeSettings } = (state.main.lattice as any) || {}

      Object.entries(devices).forEach(([deviceId, device]) => {
        if (deviceId in this.knownSigners) return

        log.info('Initializing Lattice device', { deviceId })

        const { deviceName, tag, baseUrl, privKey, accountLimit } = getLatticeSettings(deviceId)

        const lattice = new Lattice(deviceId, deviceName, tag)
        lattice.accountLimit = accountLimit

        const emitUpdate = () => this.emit('update', lattice)

        lattice.on('update', emitUpdate)

        lattice.on('connect', (paired: boolean) => {
          updateLattice(deviceId, { paired })

          if (paired) {
            // Lattice recognizes the private key and remembers if this
            // client is already paired between sessions
            const { derivation } = getLatticeSettings(deviceId)

            lattice.deriveAddresses(derivation)
          }
        })

        lattice.on('paired', (hasActiveWallet: boolean) => {
          updateLattice(deviceId, { paired: true })

          if (hasActiveWallet) {
            const { derivation } = getLatticeSettings(deviceId)
            lattice.deriveAddresses(derivation)
          }
        })

        lattice.on('error', () => {
          if (lattice.connection && !lattice.connection.isPaired) {
            updateLattice(deviceId, { paired: false })
          }

          lattice.disconnect()

          emitUpdate()
        })

        lattice.on('close', () => {
          delete this.knownSigners[deviceId]

          this.emit('remove', lattice.id)
        })

        this.knownSigners[deviceId] = lattice
        this.emit('add', lattice)

        if (device.paired) {
          // don't attempt to automatically connect if the Lattice isn't
          // paired as this could happen without the user noticing
          lattice.connect(baseUrl, privKey).catch(() => {
            updateLattice(deviceId, { paired: false })
          })
        }
      })
    })
  }

  close() {
    if (this.signerObserver) {
      this.signerObserver()
      this.signerObserver = null
    }

    if (this.settingsObserver) {
      this.settingsObserver()
      this.settingsObserver = null
    }

    this.knownSigners = {}
  }

  remove(lattice: Lattice) {
    log.info(`removing Lattice ${lattice.deviceId}`)

    removeLattice(lattice.deviceId)

    if (lattice.deviceId in this.knownSigners) {
      lattice.close()
    }
  }

  async reload(lattice: Lattice) {
    log.info(`reloading Lattice ${lattice.deviceId}`)

    lattice.disconnect()

    const { baseUrl, privKey } = getLatticeSettings(lattice.deviceId)

    try {
      await lattice.connect(baseUrl, privKey)
    } catch (e) {
      log.error('could not reload Lattice', e)
    }
  }
}
