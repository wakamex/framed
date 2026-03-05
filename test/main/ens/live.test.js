/**
 * Live ENS resolution tests.
 *
 * Uses raw eth_call via rpcCall helper to test ENS registry and resolver
 * on Ethereum mainnet. Imports pure-data ABIs and addresses from app artifacts.
 *
 * Run with: LIVE_RPC=1 npx jest test/main/ens/live.test.js --no-coverage --testTimeout=30000
 */

const { encodeFunctionData, decodeFunctionResult } = require('viem')
const namehash = require('eth-ens-namehash')
const { RPC_ENDPOINTS, rpcCall, describeOrSkip, setupLiveTimers } = require('../../live/helpers')

setupLiveTimers()

const ensInterfaces = require('../../../main/ens/artifacts/interfaces').default
const registryAddresses = require('../../../main/ens/artifacts/addresses').default

const MAINNET_RPC = RPC_ENDPOINTS[1].url
const ENS_REGISTRY = registryAddresses[1]

// Reverse registrar namehash: addr.reverse
const REVERSE_REGISTRAR_NAMEHASH = namehash.hash('addr.reverse')

describeOrSkip('ENS registry on mainnet', () => {
  it('ENS registry contract has code at the expected address', async () => {
    const code = await rpcCall(MAINNET_RPC, 'eth_getCode', [ENS_REGISTRY, 'latest'])
    expect(code).not.toBe('0x')
    expect(code.length).toBeGreaterThan(10)
  })
})

describeOrSkip('ENS forward resolution', () => {
  it('resolves vitalik.eth to a known address', async () => {
    const node = namehash.hash('vitalik.eth')

    // Step 1: Get resolver for vitalik.eth from registry
    const resolverCalldata = encodeFunctionData({
      abi: ensInterfaces.registry,
      functionName: 'resolver',
      args: [node]
    })

    const resolverResult = await rpcCall(MAINNET_RPC, 'eth_call', [
      { to: ENS_REGISTRY, data: resolverCalldata },
      'latest'
    ])

    const resolverAddress = decodeFunctionResult({
      abi: ensInterfaces.registry,
      functionName: 'resolver',
      data: resolverResult
    })

    expect(resolverAddress).not.toBe('0x0000000000000000000000000000000000000000')

    // Step 2: Call addr(node) on the resolver
    const addrCalldata = encodeFunctionData({
      abi: ensInterfaces.resolver,
      functionName: 'addr',
      args: [node]
    })

    const addrResult = await rpcCall(MAINNET_RPC, 'eth_call', [
      { to: resolverAddress, data: addrCalldata },
      'latest'
    ])

    const resolved = decodeFunctionResult({
      abi: ensInterfaces.resolver,
      functionName: 'addr',
      data: addrResult
    })

    // Vitalik's known address (case-insensitive comparison)
    expect(resolved.toLowerCase()).toBe('0xd8da6bf26964af9d7eed9e03e53415d37aa96045')
  })

  it('non-existent name returns zero resolver', async () => {
    const node = namehash.hash('thisdoesnotexist12345678.eth')

    const resolverCalldata = encodeFunctionData({
      abi: ensInterfaces.registry,
      functionName: 'resolver',
      args: [node]
    })

    const resolverResult = await rpcCall(MAINNET_RPC, 'eth_call', [
      { to: ENS_REGISTRY, data: resolverCalldata },
      'latest'
    ])

    const resolverAddress = decodeFunctionResult({
      abi: ensInterfaces.registry,
      functionName: 'resolver',
      data: resolverResult
    })

    expect(resolverAddress).toBe('0x0000000000000000000000000000000000000000')
  })
})

describeOrSkip('ENS reverse resolution', () => {
  it('reverse resolves vitalik address to vitalik.eth', async () => {
    // Reverse node: <address-without-0x>.addr.reverse
    const address = '0xd8da6bf26964af9d7eed9e03e53415d37aa96045'
    const reverseNode = namehash.hash(`${address.slice(2)}.addr.reverse`)

    // Step 1: Get resolver for the reverse record
    const resolverCalldata = encodeFunctionData({
      abi: ensInterfaces.registry,
      functionName: 'resolver',
      args: [reverseNode]
    })

    const resolverResult = await rpcCall(MAINNET_RPC, 'eth_call', [
      { to: ENS_REGISTRY, data: resolverCalldata },
      'latest'
    ])

    const resolverAddress = decodeFunctionResult({
      abi: ensInterfaces.registry,
      functionName: 'resolver',
      data: resolverResult
    })

    expect(resolverAddress).not.toBe('0x0000000000000000000000000000000000000000')

    // Step 2: Call name(node) on the reverse resolver
    const nameCalldata = encodeFunctionData({
      abi: ensInterfaces.resolver,
      functionName: 'name',
      args: [reverseNode]
    })

    const nameResult = await rpcCall(MAINNET_RPC, 'eth_call', [
      { to: resolverAddress, data: nameCalldata },
      'latest'
    ])

    const name = decodeFunctionResult({
      abi: ensInterfaces.resolver,
      functionName: 'name',
      data: nameResult
    })

    expect(name).toBe('vitalik.eth')
  })
})
