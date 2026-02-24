import { create } from 'zustand'

// State shape mirrors the main process state
// Only the subset needed by the renderer is typed here
interface NetworkConnection {
  on: boolean
  current: string
  status: string
  connected: boolean
  custom: string
  type: string
  network: string
}

interface Network {
  id: number
  type: string
  name: string
  layer: string
  isTestnet: boolean
  on: boolean
  explorer: string
  connection: {
    primary: NetworkConnection
    secondary: NetworkConnection
  }
}

interface GasLevels {
  slow: string
  standard: string
  fast: string
  asap: string
  custom: string
}

interface NetworkMeta {
  blockHeight: number
  icon: string
  primaryColor: string
  gas: {
    price: {
      selected: string
      levels: GasLevels
    }
  }
}

interface Shortcut {
  modifierKeys: string[]
  shortcutKey: string
  enabled: boolean
  configuring: boolean
}

interface Origin {
  chain: { id: number; type: string }
  name: string
  session: {
    requests: number
    startedAt: number
    endedAt?: number
    lastUpdatedAt: number
  }
}

interface Permission {
  origin: string
  provider: boolean
  handlerId: string
}

export interface MainState {
  _version: number
  instanceId: string
  colorway: 'light' | 'dark'
  launch: boolean
  reveal: boolean
  autohide: boolean
  menubarGasPrice: boolean
  showLocalNameWithENS: boolean
  mute: Record<string, boolean>
  shortcuts: {
    summon: Shortcut
  }
  networks: {
    ethereum: Record<string, Network>
  }
  networksMeta: {
    ethereum: Record<string, NetworkMeta>
  }
  accounts: Record<string, any>
  accountsMeta: Record<string, any>
  origins: Record<string, Origin>
  permissions: Record<string, Record<string, Permission>>
  balances: Record<string, any[]>
  tokens: { custom: any[]; known: Record<string, any> }
  signers: Record<string, any>
  savedSigners: Record<string, any>
  lattice: Record<string, any>
  latticeSettings: {
    accountLimit: number
    derivation: string
    endpointMode: string
    endpointCustom: string
  }
  ledger: {
    derivation: string
    liveAccountLimit: number
  }
  trezor: {
    derivation: string
  }
  privacy: {
    errorReporting: boolean
  }
  updater: {
    dontRemind: string[]
  }
}

export interface AppState {
  // Main process state (synced from main)
  main: MainState
  platform: string

  // Local UI state
  initialized: boolean
  currentView: 'accounts' | 'signers' | 'chains' | 'settings' | 'send' | 'tokens'
  selectedAccount: string | null

  // Actions
  initialize: (state: any) => void
  applyUpdates: (updates: Array<{ path: string; value: any }>) => void
  setView: (view: AppState['currentView']) => void
  setSelectedAccount: (id: string | null) => void
}

function setNestedValue(obj: any, path: string, value: any): any {
  const keys = path.split('.')
  const result = { ...obj }
  let current = result

  for (let i = 0; i < keys.length - 1; i++) {
    current[keys[i]] = { ...current[keys[i]] }
    current = current[keys[i]]
  }

  current[keys[keys.length - 1]] = value
  return result
}

export const useStore = create<AppState>((set) => ({
  // Initial state (populated by IPC on startup)
  main: {} as MainState,
  platform: '',

  // Local UI state
  initialized: false,
  currentView: 'accounts',
  selectedAccount: null,

  // Initialize with full state from main process
  initialize: (state: any) =>
    set({
      main: state.main,
      platform: state.platform,
      initialized: true
    }),

  // Apply incremental state updates from main process
  applyUpdates: (updates) =>
    set((prev) => {
      let next = { ...prev }
      for (const update of updates) {
        next = setNestedValue(next, update.path, update.value)
      }
      return next
    }),

  // Local UI actions
  setView: (view) => set({ currentView: view }),
  setSelectedAccount: (id) => set({ selectedAccount: id })
}))

// Typed selector helpers
export const useMainState = () => useStore((s) => s.main)
export const useNetworks = () => useStore((s) => s.main?.networks?.ethereum ?? {})
export const useAccounts = () => useStore((s) => s.main?.accounts ?? {})
export const useSigners = () => useStore((s) => s.main?.signers ?? {})
export const useCurrentView = () => useStore((s) => s.currentView)
