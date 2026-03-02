import log from 'electron-log'

import TokenLoader from '../../../../main/externalData/inventory/tokens'

beforeAll(() => {
  log.transports.console.level = false
})

afterAll(() => {
  log.transports.console.level = 'debug'
})

let tokenLoader

beforeEach(() => {
  tokenLoader = new TokenLoader()
})

describe('loading tokens', () => {
  it('loads the default token list initially', () => {
    const tokens = tokenLoader.getTokens([137])

    expect(tokens.length).toBeGreaterThan(50)
    expect(tokens.find((token) => token.name === 'Aave')).toBeTruthy()
  })

  it('loads the default token list for mainnet', () => {
    const tokens = tokenLoader.getTokens([1])

    expect(tokens.length).toBeGreaterThan(0)
  })

  it('fails to load tokens for an unknown chain', () => {
    const tokens = tokenLoader.getTokens([-1])

    expect(tokens.length).toBe(0)
  })

  it('start resolves immediately', async () => {
    await tokenLoader.start()
    expect(tokenLoader.getTokens([1]).length).toBeGreaterThan(0)
  })
})

describe('#getBlacklist', () => {
  it('returns blacklisted tokens from the default list', () => {
    const blacklistedTokens = tokenLoader.getBlacklist()

    // The default list may or may not have blacklisted tokens
    expect(Array.isArray(blacklistedTokens)).toBe(true)
  })

  it('returns blacklisted tokens from a specific chain', () => {
    const blacklistedTokens = tokenLoader.getBlacklist([137])

    expect(Array.isArray(blacklistedTokens)).toBe(true)
  })
})
