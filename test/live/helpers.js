/**
 * Shared helpers for live integration tests.
 *
 * All live tests are gated behind the LIVE_RPC env var.
 * Run with: LIVE_RPC=1 npx jest --config jest.live.config.json
 */

const SKIP = !process.env.LIVE_RPC

// These must match NETWORK_PRESETS in resources/constants/index.ts
const RPC_ENDPOINTS = {
  // Mainnets
  1: { name: 'Ethereum Mainnet', url: 'https://ethereum-rpc.publicnode.com' },
  10: { name: 'Optimism', url: 'https://optimism-rpc.publicnode.com' },
  137: { name: 'Polygon', url: 'https://polygon-bor-rpc.publicnode.com' },
  8453: { name: 'Base', url: 'https://base-rpc.publicnode.com' },
  42161: { name: 'Arbitrum', url: 'https://arbitrum-one-rpc.publicnode.com' },
  // Testnets
  84532: { name: 'Base Sepolia', url: 'https://base-sepolia-rpc.publicnode.com' },
  11155111: { name: 'Ethereum Sepolia', url: 'https://ethereum-sepolia-rpc.publicnode.com' },
  11155420: { name: 'Optimism Sepolia', url: 'https://optimism-sepolia-rpc.publicnode.com' }
}

// Vitalik's address — known to have ETH and tokens on mainnet
const KNOWN_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'

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

function setupLiveTimers() {
  if (!SKIP) {
    jest.useRealTimers()
    jest.setTimeout(30_000)
  }
}

module.exports = {
  SKIP,
  RPC_ENDPOINTS,
  KNOWN_ADDRESS,
  rpcCall,
  describeOrSkip,
  setupLiveTimers
}
