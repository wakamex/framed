import { shell } from 'electron'
import { openExternal, openBlockExplorer, externalWhitelist } from '../../../main/windows/window'

jest.mock('electron', () => ({
  BrowserWindow: jest.fn(() => ({
    webContents: {
      once: jest.fn(),
      on: jest.fn(),
      setWindowOpenHandler: jest.fn(),
      getOSProcessId: jest.fn(() => 1234)
    }
  })),
  shell: {
    openExternal: jest.fn()
  }
}))

jest.mock('electron-log', () => ({
  verbose: jest.fn(),
  info: jest.fn(),
  error: jest.fn()
}))

jest.mock('valtio', () => ({
  subscribe: jest.fn((_state, cb) => jest.fn()),
  snapshot: jest.fn((s) => JSON.parse(JSON.stringify(s))),
  proxy: jest.fn((obj) => obj)
}))

jest.mock('../../../main/store', () => ({
  main: {
    networks: {
      ethereum: {
        1: { explorer: 'https://etherscan.io' },
        137: { explorer: 'https://polygonscan.com/' }
      }
    }
  }
}))

beforeEach(() => {
  jest.clearAllMocks()
})

describe('openExternal', () => {
  it('calls shell.openExternal for a whitelisted URL', () => {
    openExternal('https://opensea.io')
    expect(shell.openExternal).toHaveBeenCalledWith('https://opensea.io')
  })

  it('does NOT call shell.openExternal for a blocked URL', () => {
    openExternal('https://evil.com')
    expect(shell.openExternal).not.toHaveBeenCalled()
  })

  it('does nothing when url is undefined', () => {
    openExternal(undefined)
    expect(shell.openExternal).not.toHaveBeenCalled()
  })

  it('does nothing when url is empty string', () => {
    openExternal('')
    expect(shell.openExternal).not.toHaveBeenCalled()
  })

  it('allows a valid GitHub release page URL', () => {
    openExternal('https://github.com/wakamex/framed/releases/tag/v1.2.3')
    expect(shell.openExternal).toHaveBeenCalledWith(
      'https://github.com/wakamex/framed/releases/tag/v1.2.3'
    )
  })

  it('blocks an invalid GitHub URL that is not a release page', () => {
    openExternal('https://github.com/wakamex/framed/pull/123')
    expect(shell.openExternal).not.toHaveBeenCalled()
  })

  it('allows a whitelisted URL with a path suffix', () => {
    openExternal('https://opensea.io/some/path')
    expect(shell.openExternal).toHaveBeenCalledWith('https://opensea.io/some/path')
  })

  it('allows exact match of a whitelisted entry', () => {
    openExternal('https://discord.gg/UH7NGqY')
    expect(shell.openExternal).toHaveBeenCalledWith('https://discord.gg/UH7NGqY')
  })
})

describe('openBlockExplorer', () => {
  it('constructs a /tx/{hash} URL when hash is provided', () => {
    openBlockExplorer({ id: 1, type: 'ethereum' }, '0xabc123')
    expect(shell.openExternal).toHaveBeenCalledWith('https://etherscan.io/tx/0xabc123')
  })

  it('constructs an /address/{account} URL when account is provided', () => {
    openBlockExplorer({ id: 1, type: 'ethereum' }, undefined, '0xdeadbeef')
    expect(shell.openExternal).toHaveBeenCalledWith('https://etherscan.io/address/0xdeadbeef')
  })

  it('opens the base explorer URL when neither hash nor account is provided', () => {
    openBlockExplorer({ id: 1, type: 'ethereum' })
    expect(shell.openExternal).toHaveBeenCalledWith('https://etherscan.io')
  })

  it('strips trailing slashes from the explorer base URL', () => {
    openBlockExplorer({ id: 137, type: 'ethereum' }, '0xhash')
    expect(shell.openExternal).toHaveBeenCalledWith('https://polygonscan.com/tx/0xhash')
  })

  it('does nothing when the chain has no explorer configured', () => {
    openBlockExplorer({ id: 999, type: 'ethereum' }, '0xhash')
    expect(shell.openExternal).not.toHaveBeenCalled()
  })

  it('does nothing when the chain type is unknown', () => {
    openBlockExplorer({ id: 1, type: 'unknownType' }, '0xhash')
    expect(shell.openExternal).not.toHaveBeenCalled()
  })
})

describe('externalWhitelist', () => {
  it('contains expected entries', () => {
    expect(externalWhitelist).toEqual([
      'https://chrome.google.com/webstore/detail/frame-alpha/ldcoohedfbjoobcadoglnnmmfbdlmmhf',
      'https://addons.mozilla.org/en-US/firefox/addon/frame-extension',
      'https://github.com/wakamex/framed/issues/new',
      'https://github.com/wakamex/framed/blob/master/LICENSE',
      'https://github.com/wakamex/framed/blob/0.5/LICENSE',
      'https://shop.ledger.com/pages/ledger-nano-x?r=1fb484cde64f',
      'https://shop.trezor.io/?offer_id=10&aff_id=3270',
      'https://discord.gg/UH7NGqY',
      'https://opensea.io'
    ])
  })

  it('is an array', () => {
    expect(Array.isArray(externalWhitelist)).toBe(true)
  })
})

describe('whitelist security boundary', () => {
  it('allows URL that starts with a whitelisted entry followed by a slash', () => {
    // 'https://etherscan.io' is not in whitelist but opensea.io is
    openExternal('https://opensea.io/tx/0x123')
    expect(shell.openExternal).toHaveBeenCalledWith('https://opensea.io/tx/0x123')
  })

  it('blocks URL that looks like a whitelisted host but with extra domain suffix (subdomain attack)', () => {
    // 'https://opensea.io.evil.com' should NOT match 'https://opensea.io'
    openExternal('https://opensea.io.evil.com')
    expect(shell.openExternal).not.toHaveBeenCalled()
  })

  it('blocks URL that is a prefix of a whitelisted entry but does not end with slash', () => {
    // 'https://opensea.i' is NOT a valid match for 'https://opensea.io'
    openExternal('https://opensea.i')
    expect(shell.openExternal).not.toHaveBeenCalled()
  })

  it('does not allow partial prefix matches that could spoof whitelisted URLs', () => {
    // The entry is 'https://discord.gg/UH7NGqY', so 'https://discord.gg/UH7NGqYevil' should be blocked
    // because it's not equal and doesn't start with 'https://discord.gg/UH7NGqY/'
    openExternal('https://discord.gg/UH7NGqYevil')
    expect(shell.openExternal).not.toHaveBeenCalled()
  })

  it('allows exact match of opensea.io', () => {
    openExternal('https://opensea.io')
    expect(shell.openExternal).toHaveBeenCalledWith('https://opensea.io')
  })

  it('blocks a github URL that is not on the whitelist and not a release page', () => {
    openExternal('https://github.com/wakamex/framed/releases/latest')
    expect(shell.openExternal).not.toHaveBeenCalled()
  })
})
