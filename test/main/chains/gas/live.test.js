/**
 * Live gas estimation tests.
 *
 * Tests eth_feeHistory and eth_gasPrice against real RPCs, then feeds
 * real data through the app's gas calculators.
 *
 * Run with: LIVE_RPC=1 npx jest test/main/chains/gas/live.test.js --no-coverage --testTimeout=30000
 */

const { RPC_ENDPOINTS, rpcCall, describeOrSkip, setupLiveTimers } = require('../../../live/helpers')
const { createGasCalculator } = require('../../../../main/chains/gas')

setupLiveTimers()

// Only mainnet chains for gas tests
const MAINNET_CHAINS = {
  1: 'Ethereum Mainnet',
  10: 'Optimism',
  137: 'Polygon',
  8453: 'Base',
  42161: 'Arbitrum'
}

describeOrSkip('Live eth_feeHistory', () => {
  it('eth_feeHistory on mainnet returns expected shape', async () => {
    const result = await rpcCall(RPC_ENDPOINTS[1].url, 'eth_feeHistory', [
      '0xa', // 10 blocks
      'latest',
      [10, 50, 90] // reward percentiles
    ])

    expect(result).toHaveProperty('baseFeePerGas')
    expect(result).toHaveProperty('gasUsedRatio')
    expect(result).toHaveProperty('reward')
    expect(Array.isArray(result.baseFeePerGas)).toBe(true)
    expect(Array.isArray(result.gasUsedRatio)).toBe(true)
    expect(Array.isArray(result.reward)).toBe(true)

    // baseFeePerGas has N+1 entries (includes next block)
    expect(result.baseFeePerGas.length).toBe(result.gasUsedRatio.length + 1)
    // Each reward entry has 3 percentiles
    expect(result.reward[0].length).toBe(3)
  })
})

describeOrSkip('Live gas calculator with real feeHistory', () => {
  for (const [chainId, name] of Object.entries(MAINNET_CHAINS)) {
    it(`calculates gas fees for ${name} (chain ${chainId})`, async () => {
      const result = await rpcCall(RPC_ENDPOINTS[chainId].url, 'eth_feeHistory', [
        '0xa', // 10 blocks
        'latest',
        [10, 50, 90]
      ])

      // Convert raw feeHistory into Block[] format the calculator expects
      const blocks = result.gasUsedRatio.map((ratio, i) => ({
        baseFee: parseInt(result.baseFeePerGas[i], 16),
        rewards: result.reward[i].map((r) => parseInt(r, 16)),
        gasUsedRatio: ratio
      }))

      // Add the trailing entry with next block's base fee
      blocks.push({
        baseFee: parseInt(result.baseFeePerGas[result.baseFeePerGas.length - 1], 16),
        rewards: [0, 0, 0],
        gasUsedRatio: 0
      })

      const calculator = createGasCalculator(chainId)
      const fees = calculator.calculateGas(blocks)

      // All values should be valid hex strings
      expect(fees.nextBaseFee).toMatch(/^0x[0-9a-f]+$/i)
      expect(fees.maxBaseFeePerGas).toMatch(/^0x[0-9a-f]+$/i)
      expect(fees.maxPriorityFeePerGas).toMatch(/^0x[0-9a-f]+$/i)
      expect(fees.maxFeePerGas).toMatch(/^0x[0-9a-f]+$/i)

      // maxFeePerGas should be >= maxBaseFeePerGas
      expect(parseInt(fees.maxFeePerGas, 16)).toBeGreaterThanOrEqual(
        parseInt(fees.maxBaseFeePerGas, 16)
      )
    })
  }
})

describeOrSkip('Polygon gas floor', () => {
  it('Polygon maxPriorityFeePerGas is at least 30 gwei', async () => {
    const result = await rpcCall(RPC_ENDPOINTS[137].url, 'eth_feeHistory', [
      '0xa',
      'latest',
      [10, 50, 90]
    ])

    const blocks = result.gasUsedRatio.map((ratio, i) => ({
      baseFee: parseInt(result.baseFeePerGas[i], 16),
      rewards: result.reward[i].map((r) => parseInt(r, 16)),
      gasUsedRatio: ratio
    }))

    blocks.push({
      baseFee: parseInt(result.baseFeePerGas[result.baseFeePerGas.length - 1], 16),
      rewards: [0, 0, 0],
      gasUsedRatio: 0
    })

    const calculator = createGasCalculator('137')
    const fees = calculator.calculateGas(blocks)

    const priorityFee = parseInt(fees.maxPriorityFeePerGas, 16)
    expect(priorityFee).toBeGreaterThanOrEqual(30e9) // 30 gwei
  })
})

describeOrSkip('OP Stack gas calculator path', () => {
  it('Optimism uses OpStackGasCalculator', async () => {
    const result = await rpcCall(RPC_ENDPOINTS[10].url, 'eth_feeHistory', [
      '0xa',
      'latest',
      [10, 50]
    ])

    const blocks = result.gasUsedRatio.map((ratio, i) => ({
      baseFee: parseInt(result.baseFeePerGas[i], 16),
      rewards: result.reward[i].map((r) => parseInt(r, 16)),
      gasUsedRatio: ratio
    }))

    blocks.push({
      baseFee: parseInt(result.baseFeePerGas[result.baseFeePerGas.length - 1], 16),
      rewards: [0, 0],
      gasUsedRatio: 0
    })

    const calculator = createGasCalculator('10')
    const fees = calculator.calculateGas(blocks)

    expect(fees.nextBaseFee).toMatch(/^0x[0-9a-f]+$/i)
    expect(fees.maxFeePerGas).toMatch(/^0x[0-9a-f]+$/i)
  })

  it('Base uses OpStackGasCalculator', async () => {
    const result = await rpcCall(RPC_ENDPOINTS[8453].url, 'eth_feeHistory', [
      '0xa',
      'latest',
      [10, 50]
    ])

    const blocks = result.gasUsedRatio.map((ratio, i) => ({
      baseFee: parseInt(result.baseFeePerGas[i], 16),
      rewards: result.reward[i].map((r) => parseInt(r, 16)),
      gasUsedRatio: ratio
    }))

    blocks.push({
      baseFee: parseInt(result.baseFeePerGas[result.baseFeePerGas.length - 1], 16),
      rewards: [0, 0],
      gasUsedRatio: 0
    })

    const calculator = createGasCalculator('8453')
    const fees = calculator.calculateGas(blocks)

    expect(fees.nextBaseFee).toMatch(/^0x[0-9a-f]+$/i)
    expect(fees.maxFeePerGas).toMatch(/^0x[0-9a-f]+$/i)
  })
})

describeOrSkip('Live eth_gasPrice sanity check', () => {
  for (const [chainId, name] of Object.entries(MAINNET_CHAINS)) {
    it(`eth_gasPrice on ${name} (chain ${chainId}) returns valid value`, async () => {
      const result = await rpcCall(RPC_ENDPOINTS[chainId].url, 'eth_gasPrice')
      expect(result).toMatch(/^0x/)
      const gasPrice = parseInt(result, 16)
      expect(gasPrice).toBeGreaterThan(0)
    })
  }
})
