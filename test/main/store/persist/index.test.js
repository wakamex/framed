jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/tmp/test-persist'),
    on: jest.fn()
  }
}))

jest.mock('electron-log')

// Use prototype-based methods so super.set() / super.clear() resolve correctly
// when PersistStore extends this mock class.
jest.mock('conf', () => {
  class ConfMock {
    constructor(opts) {
      this.opts = opts
      this.data = {}
    }

    set(key, val) {
      if (typeof key === 'object') {
        Object.assign(this.data, key)
      } else {
        this.data[key] = val
      }
    }

    get(key) {
      return this.data[key]
    }

    clear() {
      this.data = {}
    }
  }
  return ConfMock
})

jest.mock('../../../../main/store/migrate', () => ({ latest: 42 }))

const electron = require('electron')
const Conf = require('conf')

function loadStore() {
  let store
  jest.isolateModules(() => {
    store = require('../../../../main/store/persist').default
  })
  return store
}

describe('PersistStore', () => {
  let setSpy, clearSpy

  beforeEach(() => {
    setSpy = jest.spyOn(Conf.prototype, 'set')
    clearSpy = jest.spyOn(Conf.prototype, 'clear')
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('constructor', () => {
    it('calls electron.app.getPath("userData") for default cwd', () => {
      loadStore()
      expect(electron.app.getPath).toHaveBeenCalledWith('userData')
    })

    it('registers "quit" handler on electron.app', () => {
      loadStore()
      expect(electron.app.on).toHaveBeenCalledWith('quit', expect.any(Function))
    })

    it('starts 30s interval for writeUpdates', () => {
      const store = loadStore()
      const writeSpy = jest.spyOn(store, 'writeUpdates')
      jest.advanceTimersByTime(30000)
      expect(writeSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('queue(path, value)', () => {
    it('stores update with prefixed path', () => {
      const store = loadStore()
      store.queue('foo.bar', { x: 1 })
      expect(store.updates['main.__.42.foo.bar']).toBeDefined()
    })

    it('deep-clones value so mutations to original do not affect queued entry', () => {
      const store = loadStore()
      const obj = { a: 1 }
      store.queue('key', obj)
      obj.a = 999
      expect(store.updates['main.__.42.key']).toEqual({ a: 1 })
    })

    it('re-queuing same path replaces previous entry and moves it to last position', () => {
      const store = loadStore()
      store.queue('first', { v: 1 })
      store.queue('second', { v: 2 })
      store.queue('first', { v: 3 })
      const keys = Object.keys(store.updates)
      // 'first' was re-queued, so it should appear last (insertion-order maintained)
      expect(keys[keys.length - 1]).toBe('main.__.42.first')
      expect(store.updates['main.__.42.first']).toEqual({ v: 3 })
    })
  })

  describe('writeUpdates()', () => {
    it('calls super.set with all queued updates', () => {
      const store = loadStore()
      setSpy.mockClear()
      store.queue('a', 1)
      store.queue('b', 2)
      store.writeUpdates()
      expect(setSpy).toHaveBeenCalledWith({
        'main.__.42.a': 1,
        'main.__.42.b': 2
      })
    })

    it('resets queue to null after writing', () => {
      const store = loadStore()
      store.queue('x', 1)
      store.writeUpdates()
      expect(store.updates).toBeNull()
    })

    it('is a no-op when no updates are queued', () => {
      const store = loadStore()
      store.updates = {}
      setSpy.mockClear()
      store.writeUpdates()
      expect(setSpy).not.toHaveBeenCalled()
    })

    it('is a no-op when blockUpdates is true', () => {
      const store = loadStore()
      store.queue('x', 1)
      store.blockUpdates = true
      setSpy.mockClear()
      store.writeUpdates()
      expect(setSpy).not.toHaveBeenCalled()
    })
  })

  describe('set(path, value)', () => {
    it('calls super.set immediately with prefixed path', () => {
      const store = loadStore()
      setSpy.mockClear()
      store.set('settings.theme', 'dark')
      expect(setSpy).toHaveBeenCalledWith('main.__.42.settings.theme', 'dark')
    })

    it('is a no-op when blockUpdates is true', () => {
      const store = loadStore()
      store.blockUpdates = true
      setSpy.mockClear()
      store.set('settings.theme', 'dark')
      expect(setSpy).not.toHaveBeenCalled()
    })
  })

  describe('clear()', () => {
    it('sets blockUpdates to true', () => {
      const store = loadStore()
      store.clear()
      expect(store.blockUpdates).toBe(true)
    })

    it('calls super.clear()', () => {
      const store = loadStore()
      store.clear()
      expect(clearSpy).toHaveBeenCalled()
    })

    it('blocks set() after clear()', () => {
      const store = loadStore()
      store.clear()
      setSpy.mockClear()
      store.set('foo', 'bar')
      expect(setSpy).not.toHaveBeenCalled()
    })
  })

  describe('timer triggers', () => {
    it('advancing 30s triggers writeUpdates and writes queued entries via super.set', () => {
      const store = loadStore()
      setSpy.mockClear()
      store.queue('z', { val: 42 })
      jest.advanceTimersByTime(30000)
      expect(setSpy).toHaveBeenCalledWith(
        expect.objectContaining({ 'main.__.42.z': { val: 42 } })
      )
    })
  })
})
