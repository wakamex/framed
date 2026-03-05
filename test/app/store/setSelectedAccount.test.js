/**
 * @jest-environment jsdom
 */

// Mock the link module (required by store's transitive deps)
jest.mock('../../../resources/link', () => ({
  rpc: jest.fn(),
  send: jest.fn(),
  on: jest.fn(),
  invoke: jest.fn()
}))

const { setSelectedAccount, state } = require('../../../app/store')

afterEach(() => {
  jest.clearAllMocks()
  state.selectedAccount = null
})

describe('setSelectedAccount', () => {
  it('sets selectedAccount on state', () => {
    setSelectedAccount('0xabc')
    expect(state.selectedAccount).toBe('0xabc')
  })

  it('clears selectedAccount when called with null', () => {
    state.selectedAccount = '0xabc'
    setSelectedAccount(null)
    expect(state.selectedAccount).toBeNull()
  })

  it('does not throw (no circular dependency or import crash)', () => {
    expect(() => setSelectedAccount('0xdef')).not.toThrow()
  })

  it('store module imports without errors', () => {
    // This test catches import-time crashes (circular deps, missing globals, etc.)
    // If store.ts imports a module that references window/DOM at load time incorrectly,
    // the require() above would have already thrown, failing this test file entirely.
    expect(state).toBeDefined()
    expect(typeof setSelectedAccount).toBe('function')
  })
})
