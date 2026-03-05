/**
 * Live L1 gas cost estimation tests for OP Stack chains.
 *
 * Verifies GasPriceOracle precompile existence and L1 fee estimation
 * on Optimism and Base via raw RPC calls and the app's estimateL1GasCost.
 *
 * Run with: LIVE_RPC=1 npx jest test/main/provider/live.test.js --no-coverage --testTimeout=30000
 */

const { encodeFunctionData, decodeFunctionResult, parseAbi } = require('viem')
const { RPC_ENDPOINTS, rpcCall, describeOrSkip, setupLiveTimers } = require('../../live/helpers')
const { estimateL1GasCost } = require('../../../main/provider/l1Gas')

setupLiveTimers()

const GAS_PRICE_ORACLE = '0x420000000000000000000000000000000000000F'

const gasPriceOracleAbi = parseAbi([
  'function getL1Fee(bytes _data) view returns (uint256)'
])

// Minimal RPC-backed provider wrapper for estimateL1GasCost
function createRpcProvider(rpcUrl) {
  return {
    request: async ({ method, params }) => rpcCall(rpcUrl, method, params)
  }
}

describeOrSkip('GasPriceOracle precompile existence', () => {
  it('has code on Optimism', async () => {
    const code = await rpcCall(RPC_ENDPOINTS[10].url, 'eth_getCode', [GAS_PRICE_ORACLE, 'latest'])
    expect(code).not.toBe('0x')
    expect(code.length).toBeGreaterThan(10)
  })

  it('has code on Base', async () => {
    const code = await rpcCall(RPC_ENDPOINTS[8453].url, 'eth_getCode', [GAS_PRICE_ORACLE, 'latest'])
    expect(code).not.toBe('0x')
    expect(code.length).toBeGreaterThan(10)
  })
})

describeOrSkip('Raw getL1Fee via eth_call', () => {
  it('returns a non-zero L1 fee on Optimism', async () => {
    // Encode a simple tx as bytes for getL1Fee
    const txBytes = '0x' + 'ff'.repeat(100)

    const calldata = encodeFunctionData({
      abi: gasPriceOracleAbi,
      functionName: 'getL1Fee',
      args: [txBytes]
    })

    const result = await rpcCall(RPC_ENDPOINTS[10].url, 'eth_call', [
      { to: GAS_PRICE_ORACLE, data: calldata },
      'latest'
    ])

    const fee = decodeFunctionResult({
      abi: gasPriceOracleAbi,
      functionName: 'getL1Fee',
      data: result
    })

    expect(fee).toBeGreaterThan(0n)
  })

  it('returns a non-zero L1 fee on Base', async () => {
    const txBytes = '0x' + 'ff'.repeat(100)

    const calldata = encodeFunctionData({
      abi: gasPriceOracleAbi,
      functionName: 'getL1Fee',
      args: [txBytes]
    })

    const result = await rpcCall(RPC_ENDPOINTS[8453].url, 'eth_call', [
      { to: GAS_PRICE_ORACLE, data: calldata },
      'latest'
    ])

    const fee = decodeFunctionResult({
      abi: gasPriceOracleAbi,
      functionName: 'getL1Fee',
      data: result
    })

    expect(fee).toBeGreaterThan(0n)
  })
})

describeOrSkip('estimateL1GasCost via app function', () => {
  it('estimates L1 cost for a simple transfer on Optimism', async () => {
    const provider = createRpcProvider(RPC_ENDPOINTS[10].url)

    const cost = await estimateL1GasCost(provider, {
      to: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      value: '0x1',
      data: '0x',
      chainId: 10
    })

    expect(cost).toBeGreaterThan(0n)
  })

  it('getL1Fee returns consistent results for different data sizes', async () => {
    // Post-Ecotone, L1 fees use blob pricing so data size impact may be minimal.
    // We verify both calls succeed and return valid positive fees.
    const smallTxBytes = '0x' + 'ff'.repeat(20)
    const largeTxBytes = '0x' + 'abcdef01'.repeat(2048) // 8192 bytes

    const smallCalldata = encodeFunctionData({
      abi: gasPriceOracleAbi,
      functionName: 'getL1Fee',
      args: [smallTxBytes]
    })

    const largeCalldata = encodeFunctionData({
      abi: gasPriceOracleAbi,
      functionName: 'getL1Fee',
      args: [largeTxBytes]
    })

    const [smallResult, largeResult] = await Promise.all([
      rpcCall(RPC_ENDPOINTS[10].url, 'eth_call', [
        { to: GAS_PRICE_ORACLE, data: smallCalldata }, 'latest'
      ]),
      rpcCall(RPC_ENDPOINTS[10].url, 'eth_call', [
        { to: GAS_PRICE_ORACLE, data: largeCalldata }, 'latest'
      ])
    ])

    const smallFee = decodeFunctionResult({
      abi: gasPriceOracleAbi, functionName: 'getL1Fee', data: smallResult
    })
    const largeFee = decodeFunctionResult({
      abi: gasPriceOracleAbi, functionName: 'getL1Fee', data: largeResult
    })

    expect(smallFee).toBeGreaterThan(0n)
    expect(largeFee).toBeGreaterThan(0n)
    // With blob pricing, larger data should cost at least as much
    expect(largeFee).toBeGreaterThanOrEqual(smallFee)
  })

  it('estimates L1 cost on Base', async () => {
    const provider = createRpcProvider(RPC_ENDPOINTS[8453].url)

    const cost = await estimateL1GasCost(provider, {
      to: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      value: '0x1',
      data: '0x',
      chainId: 8453
    })

    expect(cost).toBeGreaterThan(0n)
  })
})
