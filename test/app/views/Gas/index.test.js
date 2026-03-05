/**
 * @jest-environment jsdom
 */
import { render, screen } from '../../../componentSetup'
import GasView from '../../../../app/views/Gas/index'

// --- Mock store hooks ---
let mockNetworksRef = () => ({})
let mockNetworksMetaRef = () => ({})

jest.mock('../../../../app/store', () => ({
  useNetworks: () => mockNetworksRef(),
  useNetworksMeta: () => mockNetworksMetaRef()
}))

jest.mock('../../../../resources/utils/chains', () => ({
  isNetworkConnected: (chain) => {
    return !!(
      (chain.connection?.primary && chain.connection.primary.connected) ||
      (chain.connection?.secondary && chain.connection.secondary.connected)
    )
  }
}))

jest.mock('../../../../resources/utils', () => ({
  weiToGwei: (wei) => wei / 1e9,
  hexToInt: (hex) => parseInt(hex, 16),
  roundGwei: (gwei) => Math.round(gwei * 100) / 100
}))

// --- Helpers ---

function makeConnection(overrides = {}) {
  return { on: true, current: 'public', status: 'connected', connected: true, custom: '', ...overrides }
}

function gweiToHex(gwei) {
  return '0x' + (gwei * 1e9).toString(16)
}

const connectedChain = {
  id: 1, name: 'Mainnet', on: true, isTestnet: false,
  connection: { primary: makeConnection(), secondary: makeConnection({ on: false, connected: false }) }
}

const now = Date.now()
const gasHistory = Array.from({ length: 10 }, (_, i) => ({ t: now - (9 - i) * 12000, gwei: 20 + i }))

const connectedMeta = {
  blockHeight: 19000000,
  primaryColor: '#627eea',
  nativeCurrency: { symbol: 'ETH', name: 'Ether', decimals: 18, icon: '', usd: { price: 3000, change24hr: 1.5 } },
  gas: {
    history: gasHistory,
    price: {
      selected: 'fast',
      levels: { fast: gweiToHex(30) },
      fees: {
        nextBaseFee: gweiToHex(12),
        maxBaseFeePerGas: gweiToHex(15),
        maxPriorityFeePerGas: gweiToHex(2),
        maxFeePerGas: gweiToHex(17)
      }
    },
    samples: [
      {
        label: 'Send ETH',
        estimates: {
          low: { gasEstimate: '0x' + (21000 * 30e9).toString(16), cost: { usd: 1.89 } },
          high: { gasEstimate: '0x' + (21000 * 30e9).toString(16), cost: { usd: 1.89 } }
        }
      }
    ]
  }
}

beforeEach(() => {
  mockNetworksRef = () => ({})
  mockNetworksMetaRef = () => ({})
})

describe('GasView', () => {
  it('1. shows empty state when no chains are connected', () => {
    render(<GasView />)
    expect(screen.getByText(/no connected chains/i)).toBeTruthy()
  })

  it('2. shows gas price for connected chain', () => {
    mockNetworksRef = () => ({ 1: connectedChain })
    mockNetworksMetaRef = () => ({ 1: connectedMeta })

    render(<GasView />)

    expect(screen.getAllByText('Mainnet').length).toBeGreaterThan(0)
    expect(screen.getByText('30')).toBeTruthy()
    expect(screen.getByText('gwei')).toBeTruthy()
  })

  it('3. shows base fee and priority fee', () => {
    mockNetworksRef = () => ({ 1: connectedChain })
    mockNetworksMetaRef = () => ({ 1: connectedMeta })

    render(<GasView />)

    expect(screen.getByText(/Base: 12g/)).toBeTruthy()
    expect(screen.getByText(/Priority: 2g/)).toBeTruthy()
  })

  it('4. renders sparkline when history exists', () => {
    mockNetworksRef = () => ({ 1: connectedChain })
    mockNetworksMetaRef = () => ({ 1: connectedMeta })

    render(<GasView />)

    // The sparkline renders as SVG paths — if history has >1 point, no "waiting" message
    expect(screen.queryByText(/waiting for data/i)).toBeNull()
    // Gas price should be visible
    expect(screen.getByText('30')).toBeTruthy()
  })

  it('5. shows waiting message when no gas data', () => {
    const emptyMeta = {
      ...connectedMeta,
      gas: { price: { selected: 'standard', levels: {} }, samples: [] }
    }
    mockNetworksRef = () => ({ 1: connectedChain })
    mockNetworksMetaRef = () => ({ 1: emptyMeta })

    render(<GasView />)

    expect(screen.getByText(/waiting for data/i)).toBeTruthy()
  })

  it('6. shows tx cost estimates', () => {
    mockNetworksRef = () => ({ 1: connectedChain })
    mockNetworksMetaRef = () => ({ 1: connectedMeta })

    render(<GasView />)

    expect(screen.getByText('Estimated Transaction Costs')).toBeTruthy()
    expect(screen.getByText('Send ETH')).toBeTruthy()
    expect(screen.getByText('$1.89')).toBeTruthy()
  })

  it('7. hides testnets', () => {
    const testnet = { ...connectedChain, isTestnet: true }
    mockNetworksRef = () => ({ 1: testnet })
    mockNetworksMetaRef = () => ({ 1: connectedMeta })

    render(<GasView />)

    expect(screen.getByText(/no connected chains/i)).toBeTruthy()
  })
})
