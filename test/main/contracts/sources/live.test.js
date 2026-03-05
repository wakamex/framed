/**
 * Live Sourcify contract source fetching tests.
 *
 * Tests via raw fetch to the Sourcify API, validating response shapes
 * match what main/contracts/sources/sourcify.ts expects.
 *
 * Run with: LIVE_RPC=1 npx jest test/main/contracts/sources/live.test.js --no-coverage --testTimeout=30000
 */

const { describeOrSkip, setupLiveTimers } = require('../../../live/helpers')

setupLiveTimers()

// USDC on mainnet — well-known verified contract
const USDC_MAINNET = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'

// USDC on Polygon — verified on a different chain
const USDC_POLYGON = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359'

function getEndpointUrl(contractAddress, chainId) {
  return `https://sourcify.dev/server/files/any/${chainId}/${contractAddress}`
}

describeOrSkip('Sourcify API - USDC on mainnet', () => {
  it('returns 200 with status partial or full', async () => {
    const res = await fetch(getEndpointUrl(USDC_MAINNET, 1))
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(['partial', 'full']).toContain(data.status)
  })

  it('response contains files array with metadata', async () => {
    const res = await fetch(getEndpointUrl(USDC_MAINNET, 1))
    const data = await res.json()

    expect(Array.isArray(data.files)).toBe(true)
    expect(data.files.length).toBeGreaterThan(0)

    // First file should be the metadata JSON that the app parses
    const metadataFile = data.files.find((f) => f.name === 'metadata.json')
    expect(metadataFile).toBeDefined()

    const metadata = JSON.parse(metadataFile.content)
    expect(metadata).toHaveProperty('output')
    expect(metadata.output).toHaveProperty('abi')
    expect(Array.isArray(metadata.output.abi)).toBe(true)
  })

  it('ABI contains functions (USDC is a proxy so ABI has proxy functions)', async () => {
    const res = await fetch(getEndpointUrl(USDC_MAINNET, 1))
    const data = await res.json()

    const metadataFile = data.files.find((f) => f.name === 'metadata.json')
    const metadata = JSON.parse(metadataFile.content)
    const abi = metadata.output.abi

    const functions = abi.filter((e) => e.type === 'function')
    expect(functions.length).toBeGreaterThan(0)
    // Each function entry should have a name
    for (const fn of functions) {
      expect(typeof fn.name).toBe('string')
    }
  })

  it('response parses the same way as the app (sourcify.ts)', async () => {
    const res = await fetch(getEndpointUrl(USDC_MAINNET, 1))
    const data = await res.json()

    // Replicate the parsing logic from sourcify.ts:
    // It finds metadata.json and parses it
    expect(res.status).toBe(200)
    expect(['partial', 'full']).toContain(data.status)

    const metadataFile = data.files.find((f) => f.name === 'metadata.json')
    expect(metadataFile).toBeDefined()

    const metadata = JSON.parse(metadataFile.content)
    const { abi, devdoc } = metadata.output

    // The app builds: { abi: JSON.stringify(abi), name: title, source: 'sourcify' }
    const result = {
      abi: JSON.stringify(abi),
      name: devdoc?.title,
      source: 'sourcify'
    }

    expect(typeof result.abi).toBe('string')
    expect(JSON.parse(result.abi).length).toBeGreaterThan(0)
    expect(result.source).toBe('sourcify')
  })
})

describeOrSkip('Sourcify API - cross-chain and error cases', () => {
  it('fetches verified contract on Polygon', async () => {
    const res = await fetch(getEndpointUrl(USDC_POLYGON, 137))
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(['partial', 'full']).toContain(data.status)
    expect(data.files.length).toBeGreaterThan(0)
  })

  it('non-existent contract returns non-200 gracefully', async () => {
    const fakeAddress = '0x0000000000000000000000000000000000000001'
    const res = await fetch(getEndpointUrl(fakeAddress, 1))

    // Sourcify returns 404 for unverified/non-existent contracts
    expect(res.status).not.toBe(200)
  })
})
