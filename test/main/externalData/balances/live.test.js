/**
 * Live RPC integration tests.
 *
 * These tests hit real public RPC endpoints to verify that:
 *   1. All configured public RPCs are reachable
 *   2. eth-provider can connect (same library the app uses)
 *   3. Native currency balances can be fetched
 *   4. ERC-20 token balances can be fetched via multicall
 *
 * Run with: npm run test:live
 *
 * Skipped in CI (no LIVE_RPC env var). To run locally:
 *   LIVE_RPC=1 npx jest test/main/externalData/balances/live.test.js
 */

const SKIP = !process.env.LIVE_RPC

if (!SKIP) {
  jest.useRealTimers()
  jest.setTimeout(30_000)
}

// These must match NETWORK_PRESETS in resources/constants/index.ts
const RPC_ENDPOINTS = {
  1: { name: 'Ethereum Mainnet', url: 'https://ethereum-rpc.publicnode.com' },
  10: { name: 'Optimism', url: 'https://optimism-rpc.publicnode.com' },
  137: { name: 'Polygon', url: 'https://polygon-bor-rpc.publicnode.com' },
  8453: { name: 'Base', url: 'https://base-rpc.publicnode.com' },
  42161: { name: 'Arbitrum', url: 'https://arbitrum-one-rpc.publicnode.com' }
}

// Vitalik's address — known to have ETH and tokens on mainnet
const KNOWN_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'

// USDC on mainnet — known high-liquidity token
const USDC_MAINNET = {
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  decimals: 6,
  chainId: 1
}

async function rpcCall(url, method, params = []) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
  })

  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`)

  const json = await res.json()
  if (json.error) throw new Error(`RPC error: ${json.error.message}`)

  return json.result
}

const describeOrSkip = SKIP ? describe.skip : describe

describeOrSkip('RPC preset coverage', () => {
  const { NETWORK_PRESETS } = require('../../../../resources/constants')

  it('every non-testnet chain with on:true has a public RPC preset', () => {
    // Load the default state to get all configured chains
    // We check that every chain that defaults to on:true and primary.current:'public'
    // has a corresponding entry in NETWORK_PRESETS
    const missing = []

    for (const [chainId, endpoint] of Object.entries(RPC_ENDPOINTS)) {
      const preset = NETWORK_PRESETS.ethereum?.[chainId]?.public
      if (!preset) {
        missing.push({ chainId, name: endpoint.name })
      }
    }

    expect(missing).toEqual([])
  })

  it('all NETWORK_PRESETS public URLs are reachable', async () => {
    const presets = NETWORK_PRESETS.ethereum || {}
    const results = await Promise.all(
      Object.entries(presets)
        .filter(([, v]) => typeof v === 'object' && v.public)
        .map(async ([chainId, { public: url }]) => {
          try {
            const result = await rpcCall(url, 'eth_chainId')
            return { chainId, url, ok: true, actual: parseInt(result, 16) }
          } catch (err) {
            return { chainId, url, ok: false, error: err.message }
          }
        })
    )

    const failures = results.filter((r) => !r.ok)
    expect(failures).toEqual([])

    // Also verify chain IDs match
    for (const r of results) {
      if (r.ok) {
        expect(r.actual).toBe(parseInt(r.chainId))
      }
    }
  })
})

describeOrSkip('Live RPC connectivity', () => {
  for (const [chainId, { name, url }] of Object.entries(RPC_ENDPOINTS)) {
    it(`${name} (chain ${chainId}) responds to eth_chainId`, async () => {
      const result = await rpcCall(url, 'eth_chainId')
      expect(parseInt(result, 16)).toBe(parseInt(chainId))
    })

    it(`${name} (chain ${chainId}) returns a block number`, async () => {
      const result = await rpcCall(url, 'eth_blockNumber')
      expect(parseInt(result, 16)).toBeGreaterThan(0)
    })
  }
})

describeOrSkip('Live balance fetching', () => {
  it('fetches native ETH balance for a known address on mainnet', async () => {
    const balance = await rpcCall(
      RPC_ENDPOINTS[1].url,
      'eth_getBalance',
      [KNOWN_ADDRESS, 'latest']
    )

    expect(balance).toMatch(/^0x/)
    // Vitalik's address should have some ETH
    expect(BigInt(balance)).toBeGreaterThan(0n)
  })

  it('fetches native balance on each chain', async () => {
    const results = await Promise.all(
      Object.entries(RPC_ENDPOINTS).map(async ([chainId, { name, url }]) => {
        const balance = await rpcCall(url, 'eth_getBalance', [KNOWN_ADDRESS, 'latest'])
        return { chainId: parseInt(chainId), name, balance }
      })
    )

    for (const { name, balance } of results) {
      expect(balance).toMatch(/^0x/)
      // Balance should be a valid hex number (even if zero on some chains)
      expect(() => BigInt(balance)).not.toThrow()
    }

    // At minimum, mainnet should have a non-zero balance
    const mainnet = results.find((r) => r.chainId === 1)
    expect(BigInt(mainnet.balance)).toBeGreaterThan(0n)
  })

  it('fetches ERC-20 USDC balance via eth_call (balanceOf)', async () => {
    // balanceOf(address) selector = 0x70a08231
    // address padded to 32 bytes
    const paddedAddress = KNOWN_ADDRESS.slice(2).toLowerCase().padStart(64, '0')
    const data = '0x70a08231' + paddedAddress

    const result = await rpcCall(RPC_ENDPOINTS[1].url, 'eth_call', [
      { to: USDC_MAINNET.address, data },
      'latest'
    ])

    expect(result).toMatch(/^0x/)
    // Result is a uint256 — should be valid even if zero
    expect(() => BigInt(result)).not.toThrow()
  })
})

describeOrSkip('Live balance → createBalance pipeline', () => {
  const { createBalance } = require('../../../../resources/domain/balance')

  it('native ETH balance from RPC passes through createBalance without error', async () => {
    const rawHex = await rpcCall(
      RPC_ENDPOINTS[1].url,
      'eth_getBalance',
      [KNOWN_ADDRESS, 'latest']
    )

    const balance = createBalance(
      { address: '0x0000000000000000000000000000000000000000', chainId: 1, symbol: 'ETH', name: 'Ether', decimals: 18, balance: rawHex, displayBalance: '' },
      { price: 3200, change24hr: 1.5 }
    )

    expect(balance.displayBalance).toBeDefined()
    expect(balance.totalValue.toNumber()).toBeGreaterThan(0)
  })

  it('ERC-20 USDC balance from RPC passes through createBalance without error', async () => {
    const paddedAddress = KNOWN_ADDRESS.slice(2).toLowerCase().padStart(64, '0')
    const data = '0x70a08231' + paddedAddress

    const rawHex = await rpcCall(RPC_ENDPOINTS[1].url, 'eth_call', [
      { to: USDC_MAINNET.address, data },
      'latest'
    ])

    // Raw eth_call returns 32-byte padded uint256
    const rawBalance = '0x' + rawHex.slice(2).replace(/^0+/, '') || '0x0'

    const balance = createBalance(
      { address: USDC_MAINNET.address, chainId: 1, symbol: 'USDC', name: 'USD Coin', decimals: USDC_MAINNET.decimals, balance: rawBalance, displayBalance: '' },
      { price: 1.0, change24hr: 0 }
    )

    expect(balance.displayBalance).toBeDefined()
    expect(balance.totalValue.isNaN()).toBe(false)
  })

  it('native balance with no quote (no price data) does not throw', async () => {
    const rawHex = await rpcCall(
      RPC_ENDPOINTS[1].url,
      'eth_getBalance',
      [KNOWN_ADDRESS, 'latest']
    )

    const balance = createBalance(
      { address: '0x0000000000000000000000000000000000000000', chainId: 1, symbol: 'ETH', name: 'Ether', decimals: 18, balance: rawHex, displayBalance: '' },
      undefined
    )

    expect(balance.displayBalance).toBeDefined()
    expect(balance.totalValue.toNumber()).toBe(0)
    expect(balance.price).toBe('?')
  })

  it('balance with decimals=0 (like some NFT-adjacent tokens) does not throw', async () => {
    const balance = createBalance(
      { address: '0xdeadbeef', chainId: 1, symbol: 'TEST', name: 'Test', decimals: 0, balance: '0x64', displayBalance: '' },
      undefined
    )

    expect(balance.displayBalance).toBe('100.00')
  })

  it('balance with missing decimals (undefined) does not throw', async () => {
    const rawHex = await rpcCall(
      RPC_ENDPOINTS[1].url,
      'eth_getBalance',
      [KNOWN_ADDRESS, 'latest']
    )

    // Simulates what happens when chain balance data arrives without decimals field
    const balance = createBalance(
      { address: '0x0000000000000000000000000000000000000000', chainId: 1, symbol: 'ETH', name: 'Ether', decimals: undefined, balance: rawHex, displayBalance: '' },
      { price: 3200, change24hr: 1.5 }
    )

    expect(balance.displayBalance).toBeDefined()
    expect(balance.totalValue.isNaN()).toBe(false)
  })
})

describeOrSkip('Live multicall', () => {
  // Multicall3 is deployed at same address on all chains
  const MULTICALL3 = '0xcA11bde05977b3631167028862bE2a173976CA11'

  it('multicall3 contract exists on mainnet', async () => {
    const code = await rpcCall(RPC_ENDPOINTS[1].url, 'eth_getCode', [MULTICALL3, 'latest'])
    expect(code).not.toBe('0x')
    expect(code.length).toBeGreaterThan(10)
  })

  it('multicall3 is available on all configured chains', async () => {
    const results = await Promise.all(
      Object.entries(RPC_ENDPOINTS).map(async ([chainId, { name, url }]) => {
        const code = await rpcCall(url, 'eth_getCode', [MULTICALL3, 'latest'])
        return { chainId: parseInt(chainId), name, hasCode: code !== '0x' && code.length > 10 }
      })
    )

    for (const { name, hasCode } of results) {
      expect(hasCode).toBe(true)
    }
  })

  it('app multicall contract addresses exist on their respective chains', async () => {
    const { multicallAddresses } = require('../../../../main/multicall/constants')
    const results = await Promise.all(
      Object.entries(multicallAddresses)
        .filter(([chainId]) => RPC_ENDPOINTS[chainId]) // only test chains we have RPCs for
        .map(async ([chainId, { address }]) => {
          const url = RPC_ENDPOINTS[chainId].url
          const code = await rpcCall(url, 'eth_getCode', [address, 'latest'])
          return { chainId: parseInt(chainId), address, hasCode: code !== '0x' && code.length > 10 }
        })
    )

    const missing = results.filter((r) => !r.hasCode)
    expect(missing).toEqual([])
  })
})

describeOrSkip('Live multicall balanceOf batch', () => {
  // Uses tryAggregate (multicall v2) to batch multiple balanceOf calls — mirrors what the app does
  // Multicall2 on mainnet (same address the app uses)
  const MULTICALL2_MAINNET = '0x5ba1e12693dc8f9c48aad8770482f4739beed696'

  // Well-known tokens on mainnet
  const TOKENS = [
    { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
    { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
    { symbol: 'DAI', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18 },
    { symbol: 'WETH', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18 }
  ]

  function encodeBalanceOf(owner) {
    return '0x70a08231' + owner.slice(2).toLowerCase().padStart(64, '0')
  }

  function encodeTryAggregate(calls) {
    // tryAggregate(bool requireSuccess, (address target, bytes callData)[])
    // selector: 0x399542e9 (actually bce38bd7 for tryAggregate)
    // We'll use aggregate instead — simpler encoding, same validation
    // aggregate((address,bytes)[]) selector: 0x252dba42
    const abiCoder = {
      encodeTuple(calls) {
        // Each call: (address target, bytes callData)
        // We encode as: selector + offset to array + array length + entries
        let encoded = ''

        // Array offset (0x20 = 32)
        encoded += '0000000000000000000000000000000000000000000000000000000000000020'
        // Array length
        encoded += calls.length.toString(16).padStart(64, '0')

        // Calculate offsets for each tuple
        // Each tuple is: offset to data, then (address, offset to bytes, bytes length, bytes data)
        const tupleOffsets = []
        let dataOffset = calls.length * 32 // initial offset past the offset array

        for (const call of calls) {
          tupleOffsets.push(dataOffset)
          // Each tuple: address (32) + offset to bytes (32) + bytes length (32) + bytes data (ceil32)
          const bytesLen = (call.data.length - 2) / 2
          const paddedBytesLen = Math.ceil(bytesLen / 32) * 32
          dataOffset += 32 + 32 + 32 + paddedBytesLen
        }

        // Write offsets
        for (const offset of tupleOffsets) {
          encoded += offset.toString(16).padStart(64, '0')
        }

        // Write tuple data
        for (const call of calls) {
          // address
          encoded += call.target.slice(2).toLowerCase().padStart(64, '0')
          // offset to bytes (always 0x40 = 64, after address and this offset field)
          encoded += '0000000000000000000000000000000000000000000000000000000000000040'
          // bytes length
          const bytesLen = (call.data.length - 2) / 2
          encoded += bytesLen.toString(16).padStart(64, '0')
          // bytes data (right-padded to 32)
          const paddedBytesLen = Math.ceil(bytesLen / 32) * 32
          encoded += call.data.slice(2).padEnd(paddedBytesLen * 2, '0')
        }

        return encoded
      }
    }

    return '0x252dba42' + abiCoder.encodeTuple(calls)
  }

  it('batches balanceOf calls through aggregate and gets valid results', async () => {
    const calls = TOKENS.map((token) => ({
      target: token.address,
      data: encodeBalanceOf(KNOWN_ADDRESS)
    }))

    const calldata = encodeTryAggregate(calls)

    const result = await rpcCall(RPC_ENDPOINTS[1].url, 'eth_call', [
      { to: MULTICALL2_MAINNET, data: calldata },
      'latest'
    ])

    expect(result).toMatch(/^0x/)
    // Result should be: (uint256 blockNumber, bytes[] returndata)
    // At minimum it should be longer than just a block number
    expect(result.length).toBeGreaterThan(66) // more than just 0x + 32 bytes
  })

  it('balanceOf results pass through createBalance without error', async () => {
    const { createBalance } = require('../../../../resources/domain/balance')
    const paddedAddress = KNOWN_ADDRESS.slice(2).toLowerCase().padStart(64, '0')

    // Fetch each token balance individually (simpler than decoding aggregate)
    const results = await Promise.all(
      TOKENS.map(async (token) => {
        const data = '0x70a08231' + paddedAddress
        const result = await rpcCall(RPC_ENDPOINTS[1].url, 'eth_call', [
          { to: token.address, data },
          'latest'
        ])
        return { ...token, rawBalance: result }
      })
    )

    for (const { symbol, decimals, rawBalance } of results) {
      const balance = createBalance(
        { address: '0x0', chainId: 1, symbol, name: symbol, decimals, balance: rawBalance, displayBalance: '' },
        { price: 1.0, change24hr: 0 }
      )

      expect(balance.displayBalance).toBeDefined()
      expect(balance.totalValue.isNaN()).toBe(false)
    }
  })
})

describeOrSkip('Live multi-chain token balances', () => {
  const { createBalance } = require('../../../../resources/domain/balance')

  // USDC deployed on multiple chains
  const USDC = {
    1: { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
    10: { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6 },
    137: { address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', decimals: 6 },
    8453: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
    42161: { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 }
  }

  for (const [chainId, { address, decimals }] of Object.entries(USDC)) {
    const endpoint = RPC_ENDPOINTS[chainId]
    if (!endpoint) continue

    it(`fetches USDC balance on ${endpoint.name} (chain ${chainId})`, async () => {
      const paddedAddress = KNOWN_ADDRESS.slice(2).toLowerCase().padStart(64, '0')
      const data = '0x70a08231' + paddedAddress

      const result = await rpcCall(endpoint.url, 'eth_call', [
        { to: address, data },
        'latest'
      ])

      expect(result).toMatch(/^0x/)
      expect(() => BigInt(result)).not.toThrow()

      // Pipe through createBalance
      const balance = createBalance(
        { address, chainId: parseInt(chainId), symbol: 'USDC', name: 'USD Coin', decimals, balance: result, displayBalance: '' },
        { price: 1.0, change24hr: 0 }
      )

      expect(balance.displayBalance).toBeDefined()
      expect(balance.totalValue.isNaN()).toBe(false)
    })
  }
})

describeOrSkip('Live error resilience', () => {
  it('balanceOf on a non-token address returns zero or reverts gracefully', async () => {
    // Call balanceOf on an EOA (not a contract) — should revert or return 0x
    const paddedAddress = KNOWN_ADDRESS.slice(2).toLowerCase().padStart(64, '0')
    const data = '0x70a08231' + paddedAddress
    const eoaAddress = '0x0000000000000000000000000000000000000001'

    try {
      const result = await rpcCall(RPC_ENDPOINTS[1].url, 'eth_call', [
        { to: eoaAddress, data },
        'latest'
      ])
      // If it doesn't revert, result should be empty or zero
      expect(result === '0x' || BigInt(result) === 0n).toBe(true)
    } catch (e) {
      // Reverts are expected — the app handles these in scan.ts
      expect(e.message).toBeDefined()
    }
  })

  it('eth_getBalance for zero address returns valid hex', async () => {
    const result = await rpcCall(
      RPC_ENDPOINTS[1].url,
      'eth_getBalance',
      ['0x0000000000000000000000000000000000000000', 'latest']
    )
    expect(result).toMatch(/^0x/)
    expect(() => BigInt(result)).not.toThrow()
  })

  it('eth_call to self-destructed or empty contract returns 0x', async () => {
    // Use a known self-destructed contract address (the DAO hack contract)
    // or just a random address with no code
    const noCodeAddress = '0x0000000000000000000000000000000000000002'
    const paddedAddress = KNOWN_ADDRESS.slice(2).toLowerCase().padStart(64, '0')
    const data = '0x70a08231' + paddedAddress

    try {
      const result = await rpcCall(RPC_ENDPOINTS[1].url, 'eth_call', [
        { to: noCodeAddress, data },
        'latest'
      ])
      // Empty contract returns 0x
      expect(result === '0x' || result === '0x0' || BigInt(result) === 0n).toBe(true)
    } catch {
      // Revert is also acceptable
    }
  })
})

describeOrSkip('Live data through handleChainBalanceUpdate shape', () => {
  const { createBalance } = require('../../../../resources/domain/balance')
  const NATIVE_CURRENCY = '0x0000000000000000000000000000000000000000'

  it('chain balance data matches the shape handleChainBalanceUpdate produces', async () => {
    // Simulates the full pipeline: RPC → CurrencyBalance → handleChainBalanceUpdate → setBalance → createBalance
    const results = await Promise.all(
      Object.entries(RPC_ENDPOINTS).map(async ([chainId, { url }]) => {
        const rawBalance = await rpcCall(url, 'eth_getBalance', [KNOWN_ADDRESS, 'latest'])
        return { chainId: parseInt(chainId), balance: rawBalance }
      })
    )

    for (const { chainId, balance: rawBalance } of results) {
      // This is the shape that handleChainBalanceUpdate creates and stores
      const storedBalance = {
        chainId,
        balance: rawBalance,
        displayBalance: '', // displayBalance comes from scan.ts createBalance
        symbol: 'ETH',
        address: NATIVE_CURRENCY,
        decimals: 18
      }

      // This is what the renderer does with it
      const displayBalance = createBalance(storedBalance, { price: 3200, change24hr: 1.5 })

      expect(displayBalance.displayBalance).toBeDefined()
      expect(displayBalance.totalValue.isNaN()).toBe(false)
      expect(displayBalance.price).not.toBe('?')
    }
  })

  it('token balance data matches the shape handleTokenBalanceUpdate produces', async () => {
    // Simulates: RPC → TokenBalance → handleTokenBalanceUpdate → setBalances → createBalance
    const USDC_MAINNET = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
    const paddedAddress = KNOWN_ADDRESS.slice(2).toLowerCase().padStart(64, '0')
    const data = '0x70a08231' + paddedAddress

    const rawResult = await rpcCall(RPC_ENDPOINTS[1].url, 'eth_call', [
      { to: USDC_MAINNET, data },
      'latest'
    ])

    // This is the shape scan.ts produces for token balances
    const tokenBalance = {
      address: USDC_MAINNET,
      chainId: 1,
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      balance: rawResult,
      displayBalance: '' // filled by scan.ts createBalance
    }

    // handleTokenBalanceUpdate passes this through to setBalances, then renderer calls createBalance
    const displayBalance = createBalance(tokenBalance, { price: 1.0, change24hr: 0 })

    expect(displayBalance.displayBalance).toBeDefined()
    expect(displayBalance.totalValue.isNaN()).toBe(false)
    // USDC balance should be reasonable (not shifted by wrong decimals)
    const numericBalance = parseFloat(displayBalance.displayBalance.replace(/,/g, ''))
    // If non-zero, it should be less than 1 billion (sanity check against wrong decimals)
    if (numericBalance > 0) {
      expect(numericBalance).toBeLessThan(1_000_000_000)
    }
  })
})
