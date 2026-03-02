import { isNetworkConnected, isNetworkEnabled, chainUsesOptimismFees } from '../../../resources/utils/chains'

function makeNetwork({ primaryConnected, secondaryConnected, on = true } = {}) {
  return {
    on,
    connection: {
      primary: { connected: primaryConnected },
      secondary: { connected: secondaryConnected }
    }
  }
}

describe('isNetworkConnected', () => {
  it('returns true when primary is connected', () => {
    expect(isNetworkConnected(makeNetwork({ primaryConnected: true, secondaryConnected: false }))).toBe(true)
  })

  it('returns true when secondary is connected and primary is not', () => {
    expect(isNetworkConnected(makeNetwork({ primaryConnected: false, secondaryConnected: true }))).toBe(true)
  })

  it('returns true when both primary and secondary are connected', () => {
    expect(isNetworkConnected(makeNetwork({ primaryConnected: true, secondaryConnected: true }))).toBe(true)
  })

  it('returns false when neither primary nor secondary is connected', () => {
    expect(isNetworkConnected(makeNetwork({ primaryConnected: false, secondaryConnected: false }))).toBeFalsy()
  })

  it('is falsy for null network (no crash)', () => {
    expect(isNetworkConnected(null)).toBeFalsy()
  })

  it('is falsy for undefined network (no crash)', () => {
    expect(isNetworkConnected(undefined)).toBeFalsy()
  })

  it('handles missing primary gracefully', () => {
    const network = { on: true, connection: { primary: null, secondary: { connected: true } } }
    expect(isNetworkConnected(network)).toBe(true)
  })

  it('handles missing secondary gracefully', () => {
    const network = { on: true, connection: { primary: null, secondary: null } }
    expect(isNetworkConnected(network)).toBeFalsy()
  })
})

describe('isNetworkEnabled', () => {
  it('returns true when network.on is true', () => {
    expect(isNetworkEnabled({ on: true })).toBe(true)
  })

  it('returns false when network.on is false', () => {
    expect(isNetworkEnabled({ on: false })).toBe(false)
  })
})

describe('chainUsesOptimismFees', () => {
  it('returns true for Optimism mainnet (chainId 10)', () => {
    expect(chainUsesOptimismFees(10)).toBe(true)
  })

  it('returns true for Base (chainId 8453)', () => {
    expect(chainUsesOptimismFees(8453)).toBe(true)
  })

  it('returns true for Zora (chainId 7777777)', () => {
    expect(chainUsesOptimismFees(7777777)).toBe(true)
  })

  it('returns true for all supported Optimism-fee chains', () => {
    const optimismChains = [10, 420, 8453, 84531, 84532, 7777777, 11155420]
    for (const chainId of optimismChains) {
      expect(chainUsesOptimismFees(chainId)).toBe(true)
    }
  })

  it('returns false for Ethereum mainnet (chainId 1)', () => {
    expect(chainUsesOptimismFees(1)).toBe(false)
  })

  it('returns false for Arbitrum (chainId 42161)', () => {
    expect(chainUsesOptimismFees(42161)).toBe(false)
  })
})
