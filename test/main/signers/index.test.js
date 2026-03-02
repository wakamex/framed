jest.mock('electron-log', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  transports: { console: {} }
}))

jest.mock('valtio', () => ({
  subscribe: jest.fn((_state, cb) => jest.fn()),
  snapshot: jest.fn((s) => JSON.parse(JSON.stringify(s))),
  proxy: jest.fn((obj) => obj)
}))

jest.mock('../../../main/signers/ledger/adapter', () => {
  const { EventEmitter } = require('events')
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => {
      const adapter = new EventEmitter()
      adapter.adapterType = 'ledger'
      adapter.open = jest.fn()
      adapter.close = jest.fn()
      adapter.remove = jest.fn()
      adapter.reload = jest.fn()
      return adapter
    })
  }
})

jest.mock('../../../main/signers/trezor/adapter', () => {
  const { EventEmitter } = require('events')
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => {
      const adapter = new EventEmitter()
      adapter.adapterType = 'trezor'
      adapter.open = jest.fn()
      adapter.close = jest.fn()
      adapter.remove = jest.fn()
      adapter.reload = jest.fn()
      return adapter
    })
  }
})

jest.mock('../../../main/signers/lattice/adapter', () => {
  const { EventEmitter } = require('events')
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => {
      const adapter = new EventEmitter()
      adapter.adapterType = 'lattice'
      adapter.open = jest.fn()
      adapter.close = jest.fn()
      adapter.remove = jest.fn()
      adapter.reload = jest.fn()
      return adapter
    })
  }
})

jest.mock('../../../main/signers/hot', () => ({
  __esModule: true,
  default: {
    scan: jest.fn(() => jest.fn()),
    createFromPhrase: jest.fn(),
    createFromPrivateKey: jest.fn(),
    createFromKeystore: jest.fn()
  }
}))

jest.mock('../../../main/signers/hot/RingSigner', () => ({
  __esModule: true,
  default: jest.fn()
}))

jest.mock('../../../main/signers/hot/HotSigner', () => ({
  __esModule: true,
  default: jest.fn()
}))

jest.mock('../../../main/store/actions', () => ({
  newSigner: jest.fn(),
  removeSigner: jest.fn(),
  navClearSigner: jest.fn(),
  updateSigner: jest.fn()
}))

function createMockAdapter(type) {
  const { EventEmitter } = require('events')
  const adapter = new EventEmitter()
  adapter.adapterType = type
  adapter.open = jest.fn()
  adapter.close = jest.fn()
  adapter.remove = jest.fn()
  adapter.reload = jest.fn()
  return adapter
}

function createMockSigner(id, type, extras = {}) {
  return {
    id,
    type,
    summary: jest.fn(() => ({ id, type })),
    close: jest.fn(),
    delete: jest.fn(),
    lock: jest.fn(),
    unlock: jest.fn(),
    addPrivateKey: jest.fn(),
    removePrivateKey: jest.fn(),
    addKeystore: jest.fn(),
    ...extras
  }
}

let signers
let LedgerAdapter, TrezorAdapter, LatticeAdapter
let ledgerAdapter, trezorAdapter, latticeAdapter
let hot
let newSigner, removeSigner, navClearSigner, updateSigner

beforeEach(() => {
  jest.resetModules()

  const storeActions = require('../../../main/store/actions')
  newSigner = storeActions.newSigner
  removeSigner = storeActions.removeSigner
  navClearSigner = storeActions.navClearSigner
  updateSigner = storeActions.updateSigner

  hot = require('../../../main/signers/hot').default
  LedgerAdapter = require('../../../main/signers/ledger/adapter').default
  TrezorAdapter = require('../../../main/signers/trezor/adapter').default
  LatticeAdapter = require('../../../main/signers/lattice/adapter').default

  // Importing signers triggers module-level code and constructor
  signers = require('../../../main/signers').default

  // Get adapter instances created at module level (registered in constructor)
  // Use mock.results[0].value since mockImplementation returns an object (not this)
  ledgerAdapter = LedgerAdapter.mock.results[0].value
  trezorAdapter = TrezorAdapter.mock.results[0].value
  latticeAdapter = LatticeAdapter.mock.results[0].value
})

describe('constructor', () => {
  it('registers Ledger, Trezor, and Lattice adapters', () => {
    expect(LedgerAdapter).toHaveBeenCalledTimes(1)
    expect(TrezorAdapter).toHaveBeenCalledTimes(1)
    expect(LatticeAdapter).toHaveBeenCalledTimes(1)
  })

  it('calls open() on each registered adapter', () => {
    expect(ledgerAdapter.open).toHaveBeenCalled()
    expect(trezorAdapter.open).toHaveBeenCalled()
    expect(latticeAdapter.open).toHaveBeenCalled()
  })

  it('initializes hot scanner', () => {
    expect(hot.scan).toHaveBeenCalledWith(signers)
  })
})

describe('#addAdapter', () => {
  let adapter

  beforeEach(() => {
    adapter = createMockAdapter('test')
    signers.addAdapter(adapter)
  })

  it('binds add event so it propagates to signers.add', () => {
    const signer = createMockSigner('test-signer', 'test')
    adapter.emit('add', signer)
    expect(newSigner).toHaveBeenCalledWith(expect.objectContaining({ id: 'test-signer' }))
  })

  it('binds remove event so it propagates to signers.remove', () => {
    const signer = createMockSigner('test-signer', 'test')
    signers.add(signer)

    adapter.emit('remove', 'test-signer')
    expect(removeSigner).toHaveBeenCalledWith('test-signer')
  })

  it('binds update event so it propagates to signers.update', () => {
    const signer = createMockSigner('test-signer', 'test')
    signers.add(signer)

    adapter.emit('update', signer)
    expect(updateSigner).toHaveBeenCalledWith(expect.objectContaining({ id: 'test-signer' }))
  })

  it('calls adapter.open()', () => {
    expect(adapter.open).toHaveBeenCalled()
  })

  it('stores adapter in adapters map', () => {
    expect(signers.adapters['test']).toBeDefined()
    expect(signers.adapters['test'].adapter).toBe(adapter)
  })
})

describe('#removeAdapter', () => {
  let adapter

  beforeEach(() => {
    adapter = createMockAdapter('test')
    signers.addAdapter(adapter)
  })

  it('removes adapter from adapters map', () => {
    signers.removeAdapter(adapter)
    expect(signers.adapters['test']).toBeUndefined()
  })

  it('unbinds add event listener so it no longer propagates', () => {
    const signer = createMockSigner('test-signer', 'test')
    signers.removeAdapter(adapter)

    newSigner.mockClear()
    adapter.emit('add', signer)
    expect(newSigner).not.toHaveBeenCalled()
  })

  it('unbinds remove event listener so it no longer propagates', () => {
    const signer = createMockSigner('test-signer', 'test')
    signers.add(signer)
    signers.removeAdapter(adapter)

    removeSigner.mockClear()
    adapter.emit('remove', 'test-signer')
    expect(removeSigner).not.toHaveBeenCalled()
  })
})

describe('#exists', () => {
  it('returns true for an existing signer', () => {
    const signer = createMockSigner('signer-1', 'hot')
    signers.add(signer)
    expect(signers.exists('signer-1')).toBe(true)
  })

  it('returns false for a non-existing signer', () => {
    expect(signers.exists('non-existent')).toBe(false)
  })
})

describe('#add', () => {
  it('stores the signer and calls newSigner with summary', () => {
    const signer = createMockSigner('signer-1', 'hot')
    signers.add(signer)

    expect(signers.get('signer-1')).toBe(signer)
    expect(newSigner).toHaveBeenCalledWith({ id: 'signer-1', type: 'hot' })
  })

  it('is a no-op for duplicate id', () => {
    const signer = createMockSigner('signer-1', 'hot')
    signers.add(signer)
    signers.add(signer)

    expect(newSigner).toHaveBeenCalledTimes(1)
  })
})

describe('#get', () => {
  it('returns the correct signer by id', () => {
    const signer = createMockSigner('signer-1', 'hot')
    signers.add(signer)

    expect(signers.get('signer-1')).toBe(signer)
  })

  it('returns undefined for non-existing id', () => {
    expect(signers.get('non-existent')).toBeUndefined()
  })
})

describe('#remove', () => {
  it('deletes the signer and calls removeSigner and navClearSigner', () => {
    const signer = createMockSigner('signer-1', 'ledger')
    signers.add(signer)

    signers.remove('signer-1')

    expect(signers.get('signer-1')).toBeUndefined()
    expect(removeSigner).toHaveBeenCalledWith('signer-1')
    expect(navClearSigner).toHaveBeenCalledWith('signer-1')
  })

  it('delegates hardware (ledger) signer removal to ledger adapter', () => {
    const signer = createMockSigner('signer-1', 'ledger')
    signers.add(signer)

    signers.remove('signer-1')

    expect(ledgerAdapter.remove).toHaveBeenCalledWith(signer)
  })

  it('maps ring type to hot adapter key for removal', () => {
    const signer = createMockSigner('signer-1', 'ring')
    signers.add(signer)

    // Add a mock hot adapter so the ring→hot mapping is exercised
    const hotAdapter = createMockAdapter('hot')
    signers.adapters['hot'] = { adapter: hotAdapter, listeners: [] }

    signers.remove('signer-1')

    expect(hotAdapter.remove).toHaveBeenCalledWith(signer)
  })

  it('maps seed type to hot adapter key for removal', () => {
    const signer = createMockSigner('signer-1', 'seed')
    signers.add(signer)

    const hotAdapter = createMockAdapter('hot')
    signers.adapters['hot'] = { adapter: hotAdapter, listeners: [] }

    signers.remove('signer-1')

    expect(hotAdapter.remove).toHaveBeenCalledWith(signer)
  })

  it('calls signer.close() and signer.delete() for unknown adapter type (backwards compat)', () => {
    const signer = createMockSigner('signer-1', 'unknown')
    signers.add(signer)

    signers.remove('signer-1')

    expect(signer.close).toHaveBeenCalled()
    expect(signer.delete).toHaveBeenCalled()
  })

  it('is a no-op for non-existent id', () => {
    signers.remove('non-existent')

    expect(removeSigner).not.toHaveBeenCalled()
    expect(navClearSigner).not.toHaveBeenCalled()
  })
})

describe('#update', () => {
  it('updates existing signer and calls updateSigner', () => {
    const signer = createMockSigner('signer-1', 'hot')
    signers.add(signer)

    const updatedSigner = createMockSigner('signer-1', 'hot')
    signers.update(updatedSigner)

    expect(signers.get('signer-1')).toBe(updatedSigner)
    expect(updateSigner).toHaveBeenCalledWith(expect.objectContaining({ id: 'signer-1' }))
  })

  it('adds signer via add() if id does not exist yet', () => {
    const signer = createMockSigner('signer-1', 'hot')
    signers.update(signer)

    expect(signers.get('signer-1')).toBe(signer)
    expect(newSigner).toHaveBeenCalledWith(expect.objectContaining({ id: 'signer-1' }))
  })
})

describe('#reload', () => {
  it('calls hot scan function for ring signers', () => {
    const signer = createMockSigner('signer-1', 'ring')
    signers.add(signer)

    const hotScanFn = signers.scans.hot

    signers.reload('signer-1')

    expect(signer.close).toHaveBeenCalled()
    expect(signers.get('signer-1')).toBeUndefined()
    expect(hotScanFn).toHaveBeenCalled()
  })

  it('calls hot scan function for seed signers', () => {
    const signer = createMockSigner('signer-1', 'seed')
    signers.add(signer)

    const hotScanFn = signers.scans.hot

    signers.reload('signer-1')

    expect(signer.close).toHaveBeenCalled()
    expect(hotScanFn).toHaveBeenCalled()
  })

  it('delegates to hardware adapter.reload for hardware signers', () => {
    const signer = createMockSigner('signer-1', 'ledger')
    signers.add(signer)

    signers.reload('signer-1')

    expect(ledgerAdapter.reload).toHaveBeenCalledWith(signer)
  })

  it('does nothing for non-existent id', () => {
    signers.reload('non-existent')

    expect(ledgerAdapter.reload).not.toHaveBeenCalled()
  })
})

describe('#createFromPhrase', () => {
  it('delegates to hot.createFromPhrase', () => {
    const cb = jest.fn()
    signers.createFromPhrase('test phrase', 'password', cb)

    expect(hot.createFromPhrase).toHaveBeenCalledWith(signers, 'test phrase', 'password', cb)
  })
})

describe('#createFromPrivateKey', () => {
  it('delegates to hot.createFromPrivateKey', () => {
    const cb = jest.fn()
    signers.createFromPrivateKey('0xprivkey', 'password', cb)

    expect(hot.createFromPrivateKey).toHaveBeenCalledWith(signers, '0xprivkey', 'password', cb)
  })
})

describe('#createFromKeystore', () => {
  it('delegates to hot.createFromKeystore', () => {
    const cb = jest.fn()
    const keystore = { version: 3 }
    signers.createFromKeystore(keystore, 'ksPwd', 'pwd', cb)

    expect(hot.createFromKeystore).toHaveBeenCalledWith(signers, keystore, 'ksPwd', 'pwd', cb)
  })
})

describe('#addPrivateKey', () => {
  it('delegates to signer.addPrivateKey for ring signers', () => {
    const signer = createMockSigner('signer-1', 'ring')
    signers.add(signer)

    const cb = jest.fn()
    signers.addPrivateKey('signer-1', '0xprivkey', 'password', cb)

    expect(signer.addPrivateKey).toHaveBeenCalledWith('0xprivkey', 'password', cb)
  })

  it('returns an error for non-ring signers', () => {
    const signer = createMockSigner('signer-1', 'seed')
    signers.add(signer)

    const cb = jest.fn()
    signers.addPrivateKey('signer-1', '0xprivkey', 'password', cb)

    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Private keys can only be added to ring signers' }),
      undefined
    )
  })
})

describe('#removePrivateKey', () => {
  it('delegates to signer.removePrivateKey for ring signers', () => {
    const signer = createMockSigner('signer-1', 'ring')
    signers.add(signer)

    const cb = jest.fn()
    signers.removePrivateKey('signer-1', 0, 'password', cb)

    expect(signer.removePrivateKey).toHaveBeenCalledWith(0, 'password', cb)
  })

  it('returns an error for non-ring signers', () => {
    const signer = createMockSigner('signer-1', 'seed')
    signers.add(signer)

    const cb = jest.fn()
    signers.removePrivateKey('signer-1', 0, 'password', cb)

    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Private keys can only be removed from ring signers' }),
      undefined
    )
  })
})

describe('#addKeystore', () => {
  it('delegates to signer.addKeystore for ring signers', () => {
    const signer = createMockSigner('signer-1', 'ring')
    signers.add(signer)

    const cb = jest.fn()
    const keystore = { version: 3 }
    signers.addKeystore('signer-1', keystore, 'ksPwd', 'pwd', cb)

    expect(signer.addKeystore).toHaveBeenCalledWith(keystore, 'ksPwd', 'pwd', cb)
  })

  it('returns an error for non-ring signers', () => {
    const signer = createMockSigner('signer-1', 'seed')
    signers.add(signer)

    const cb = jest.fn()
    signers.addKeystore('signer-1', {}, 'ksPwd', 'pwd', cb)

    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Keystores can only be used with ring signers' }),
      undefined
    )
  })
})

describe('#lock', () => {
  it('delegates to signer.lock', () => {
    const signer = createMockSigner('signer-1', 'seed')
    signers.add(signer)

    const cb = jest.fn()
    signers.lock('signer-1', cb)

    expect(signer.lock).toHaveBeenCalledWith(cb)
  })

  it('does nothing if signer has no lock method', () => {
    const signer = createMockSigner('signer-1', 'ledger')
    delete signer.lock
    signers.add(signer)

    expect(() => signers.lock('signer-1', jest.fn())).not.toThrow()
  })
})

describe('#unlock', () => {
  it('delegates to signer.unlock', () => {
    const signer = createMockSigner('signer-1', 'seed')
    signers.add(signer)

    const cb = jest.fn()
    signers.unlock('signer-1', 'password', cb)

    expect(signer.unlock).toHaveBeenCalledWith('password', {}, cb)
  })

  it('does nothing if signer has no unlock method', () => {
    const signer = createMockSigner('signer-1', 'ledger')
    delete signer.unlock
    signers.add(signer)

    expect(() => signers.unlock('signer-1', 'password', jest.fn())).not.toThrow()
  })
})
