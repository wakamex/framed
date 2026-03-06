describe('ProviderProxyConnection', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  async function loadProxy() {
    return (await import('../../../main/provider/proxy')).default
  }

  it('becomes connected on the next tick', async () => {
    const proxy = await loadProxy()

    expect(proxy.connected).toBe(false)

    jest.runAllTicks()

    expect(proxy.connected).toBe(true)
  })

  it('replays connect for late listeners', async () => {
    const proxy = await loadProxy()

    jest.runAllTicks()

    const listener = jest.fn()
    proxy.on('connect', listener)

    jest.runAllTicks()

    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('does not replay connect after close', async () => {
    const proxy = await loadProxy()

    jest.runAllTicks()
    proxy.close()

    const listener = jest.fn()
    proxy.on('connect', listener)

    jest.runAllTicks()

    expect(proxy.connected).toBe(false)
    expect(listener).not.toHaveBeenCalled()
  })
})
