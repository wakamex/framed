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
    // If store.ts has a bad import (circular dep, missing global, etc.),
    // the require() above would have already thrown, failing this file.
    expect(state).toBeDefined()
    expect(typeof setSelectedAccount).toBe('function')
  })
})
