/**
 * Live DefiLlama rate fetching tests.
 *
 * Validates that the DefiLlama API is reachable and returns expected data shapes
 * for native currency prices and token rates.
 *
 * Run with: LIVE_RPC=1 npx jest test/main/externalData/assets/live.test.js --no-coverage --testTimeout=30000
 */

const { describeOrSkip, setupLiveTimers } = require('../../../live/helpers')

setupLiveTimers()

// Mirror the mapping from main/externalData/assets/index.ts
const CHAIN_ID_TO_LLAMA = {
  1: 'ethereum',
  10: 'optimism',
  137: 'polygon',
  8453: 'base',
  42161: 'arbitrum'
}

const NATIVE_CURRENCY = '0x0000000000000000000000000000000000000000'

describeOrSkip('DefiLlama API reachability', () => {
  it('coins.llama.fi/prices/current endpoint is reachable', async () => {
    const coinId = `ethereum:${NATIVE_CURRENCY}`
    const res = await fetch(`https://coins.llama.fi/prices/current/${coinId}`)
    expect(res.ok).toBe(true)

    const data = await res.json()
    expect(data).toHaveProperty('coins')
  })
})

describeOrSkip('DefiLlama native currency prices', () => {
  for (const [chainId, llamaChain] of Object.entries(CHAIN_ID_TO_LLAMA)) {
    it(`fetches native currency price for ${llamaChain} (chain ${chainId})`, async () => {
      const coinId = `${llamaChain}:${NATIVE_CURRENCY}`
      const res = await fetch(`https://coins.llama.fi/prices/current/${coinId}`)
      expect(res.ok).toBe(true)

      const data = await res.json()
      const coin = data.coins[coinId]
      expect(coin).toBeDefined()
      expect(typeof coin.price).toBe('number')
      expect(coin.price).toBeGreaterThan(0)
    })
  }
})

describeOrSkip('DefiLlama token and batch requests', () => {
  const USDC_MAINNET = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'

  it('USDC stablecoin price is in range (0.90-1.10)', async () => {
    const coinId = `ethereum:${USDC_MAINNET}`
    const res = await fetch(`https://coins.llama.fi/prices/current/${coinId}`)
    expect(res.ok).toBe(true)

    const data = await res.json()
    const coin = data.coins[coinId]
    expect(coin).toBeDefined()
    expect(coin.price).toBeGreaterThanOrEqual(0.9)
    expect(coin.price).toBeLessThanOrEqual(1.1)
  })

  it('24hr change endpoint returns expected shape', async () => {
    const coinId = `ethereum:${NATIVE_CURRENCY}`
    const res = await fetch(`https://coins.llama.fi/percentage/${coinId}`)
    expect(res.ok).toBe(true)

    const data = await res.json()
    expect(data).toHaveProperty('coins')
    // The change value should be a number (can be negative)
    expect(typeof data.coins[coinId]).toBe('number')
  })

  it('batch request with comma-separated coin IDs returns all entries', async () => {
    const coinIds = Object.entries(CHAIN_ID_TO_LLAMA).map(
      ([, chain]) => `${chain}:${NATIVE_CURRENCY}`
    )
    const param = coinIds.join(',')
    const res = await fetch(`https://coins.llama.fi/prices/current/${param}`)
    expect(res.ok).toBe(true)

    const data = await res.json()
    for (const coinId of coinIds) {
      expect(data.coins[coinId]).toBeDefined()
      expect(data.coins[coinId].price).toBeGreaterThan(0)
    }
  })

  it('invalid coin ID returns empty (not error)', async () => {
    const coinId = 'ethereum:0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef'
    const res = await fetch(`https://coins.llama.fi/prices/current/${coinId}`)
    expect(res.ok).toBe(true)

    const data = await res.json()
    // Invalid token should simply be absent from the response
    expect(data.coins[coinId]).toBeUndefined()
  })
})
