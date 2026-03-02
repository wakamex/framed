// NPM modules
const { encodeFunctionData, decodeFunctionResult } = require('viem')
const namehash = require('eth-ens-namehash')
const contentHash = require('content-hash')

// Frame modules
const provider = require('../provider').default
const store = require('../store').default

// Local modules
const interfaces = require('./artifacts/interfaces')
const registryAddresses = require('./artifacts/addresses')

const registryAbi = interfaces.registry
const resolverAbi = interfaces.resolver

/* PUBLIC */
exports.resolveName = async (name) => {
  // Get resolver address
  const resolverAddress = await getResolverAddress(name)

  // If no resolver found -> return null
  if (!resolverAddress) return null

  // Encode function input
  const node = namehash.hash(name)
  const input = encodeFunctionData({ abi: resolverAbi, functionName: 'addr', args: [node] })

  // Make JSON RPC call
  const params = { to: resolverAddress, data: input }
  const output = await makeCall('eth_call', params)

  // If output empty -> return null
  if (output === '0x') return null

  // Decode output and return value
  const [address] = decodeFunctionResult({ abi: resolverAbi, functionName: 'addr', data: output })

  return address
}

exports.resolveAddress = async (address) => {
  // Construct name
  const name = `${address.slice(2)}.addr.reverse`

  // Get resolver address
  const resolverAddress = await getResolverAddress(name)

  // If no resolver found -> return null
  if (!resolverAddress) return null

  // Encode function input
  const node = namehash.hash(name)
  const input = encodeFunctionData({ abi: resolverAbi, functionName: 'name', args: [node] })

  // Make JSON RPC call
  const params = { to: resolverAddress, data: input }
  const output = await makeCall('eth_call', params)

  // If output empty -> return null
  if (output === '0x') return null

  // Decode output and return value
  const [resolvedName] = decodeFunctionResult({ abi: resolverAbi, functionName: 'name', data: output })
  return resolvedName
}

exports.resolveContent = async (name) => {
  // Get resolver address
  const resolverAddress = await getResolverAddress(name)

  // If no resolver found -> return null
  if (!resolverAddress) return null

  // Encode function input
  const node = namehash.hash(name)
  const input = encodeFunctionData({ abi: resolverAbi, functionName: 'contenthash', args: [node] })

  // Make JSON RPC call
  const params = { to: resolverAddress, data: input }
  const output = await makeCall('eth_call', params)

  // If output empty -> return null
  if (output === '0x') return null

  // Decode output and return the content hash in text format
  const [contentHashBytes] = decodeFunctionResult({ abi: resolverAbi, functionName: 'contenthash', data: output })

  if (contentHashBytes === null) return null

  const hash = contentHash.decode(contentHashBytes)
  return hash
}

/* PRIVATE */
const getResolverAddress = async (name) => {
  // Hash name
  const hash = namehash.hash(name)

  // Get registry contract address for selected network
  const networkId = store('main.currentNetwork.id')
  const registryAddress = registryAddresses[networkId]

  // Encode function input
  const input = encodeFunctionData({ abi: registryAbi, functionName: 'resolver', args: [hash] })

  // Make JSON RPC call
  const params = { to: registryAddress, data: input }
  const output = await makeCall('eth_call', params)

  // If output empty -> return null
  if (output === '0x') return null

  // Decode output and return value
  const [resolverAddress] = decodeFunctionResult({ abi: registryAbi, functionName: 'resolver', data: output })
  return resolverAddress
}

const makeCall = (method, params) => {
  return new Promise((resolve) => {
    // Construct JSON RPC payload
    const payload = { jsonrpc: '2.0', id: 1, method: method, params: [params, 'latest'] }

    // Send payload to provider and resolve promise with result
    provider.send(payload, ({ result }) => resolve(result))
  })
}
