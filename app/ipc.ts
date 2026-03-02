import link from '../resources/link'
import { useStore } from './store'

// Initialize the renderer: fetch full state from main, subscribe to updates
export function initializeApp(): Promise<void> {
  return new Promise((resolve, reject) => {
    link.rpc('getState', (err: Error | null, state: any) => {
      if (err) {
        reject(new Error('Could not get initial state from main process'))
        return
      }

      // Populate Zustand store with initial state
      useStore.getState().initialize(state)

      // Listen for incremental state updates from main process
      link.on('action', (action: string, ...args: any[]) => {
        if (action === 'stateSync') {
          try {
            const actionBatch = JSON.parse(args[0])
            const updates: Array<{ path: string; value: any }> = []
            for (const actionItem of actionBatch) {
              for (const update of actionItem.updates) {
                updates.push({ path: update.path, value: update.value })
              }
            }
            useStore.getState().applyUpdates(updates)
          } catch (e) {
            console.error('State sync error', e)
          }
        }
      })

      // Signal to main process that renderer is ready
      link.send('tray:ready')

      resolve()
    })
  })
}

// Send an action to the main process store
export function sendAction(action: string, ...args: any[]) {
  link.send('tray:action', action, ...args)
}

// Send an IPC event to the main process
export function sendEvent(channel: string, ...args: any[]) {
  link.send(channel, ...args)
}

// Invoke an IPC method on the main process and await a response
export function invoke<T = any>(channel: string, ...args: any[]): Promise<T> {
  return link.invoke(channel, ...args)
}

// RPC call to main process with callback
export function rpc(method: string, ...args: any[]): Promise<any> {
  return new Promise((resolve, reject) => {
    link.rpc(method, ...args, (err: Error | null, result: any) => {
      if (err) reject(err)
      else resolve(result)
    })
  })
}

// Typed action helpers for common operations
export const actions = {
  clipboardData: (data: string) => sendEvent('tray:clipboardData', data),
  resolveRequest: (req: any, result?: any) => sendEvent('tray:resolveRequest', req, result),
  rejectRequest: (req: any) => sendEvent('tray:rejectRequest', req),
  removeAccount: (id: string) => sendEvent('tray:removeAccount', id),
  renameAccount: (id: string, name: string) => sendEvent('tray:renameAccount', id, name),
  removeSigner: (id: string) => sendEvent('dash:removeSigner', id),
  reloadSigner: (id: string) => sendEvent('dash:reloadSigner', id),
  openExternal: (url: string) => sendEvent('tray:openExternal', url),
  openExplorer: (chain: any, hash?: string, account?: string) =>
    sendEvent('tray:openExplorer', chain, hash, account),
  addChain: (chain: any) => sendEvent('tray:addChain', chain),
  switchChain: (type: string, id: number, req?: any) =>
    sendEvent('tray:switchChain', type, id, req),
  addToken: (token: any, req?: any) => sendEvent('tray:addToken', token, req),
  removeToken: (token: any) => sendEvent('tray:removeToken', token),
  syncPath: (path: string, value: any) => sendEvent('tray:syncPath', path, value),
  installUpdate: () => sendEvent('tray:installAvailableUpdate'),
  dismissUpdate: (version: string, remind: boolean) =>
    sendEvent('tray:dismissUpdate', version, remind),
  resetAllSettings: () => sendEvent('tray:resetAllSettings'),
  getTokenDetails: (contractAddress: string, chainId: number) =>
    invoke('tray:getTokenDetails', contractAddress, chainId)
}
