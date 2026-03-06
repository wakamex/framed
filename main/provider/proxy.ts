import { EventEmitter } from 'stream'
import { v5 as uuid } from 'uuid'

const internalOriginId = uuid('frame-internal', uuid.DNS)

class ProviderProxyConnection extends EventEmitter {
  connected = false

  constructor() {
    super()

    process.nextTick(() => {
      this.connected = true
      this.emit('connect')
    })
  }

  override on(event: string | symbol, listener: (...args: unknown[]) => void) {
    super.on(event, listener)

    if (event === 'connect' && this.connected) {
      process.nextTick(() => {
        if (this.listeners('connect').includes(listener)) listener()
      })
    }

    return this
  }

  async send(payload: JSONRPCRequestPayload) {
    if (payload.method === 'eth_subscribe') {
      this.emit('provider:subscribe', { ...payload, _origin: internalOriginId })
    } else {
      this.emit('provider:send', { ...payload, _origin: internalOriginId })
    }
  }

  close() {
    this.connected = false
    this.emit('close')
  }
}

export default new ProviderProxyConnection()
