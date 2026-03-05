import fs from 'fs'
import path from 'path'
import { parseWatchListCsv, loadWatchListCsv } from '../../../main/watchlist'

// Uses real isAddress from viem — no mocks

describe('parseWatchListCsv', () => {
  it('parses a simple CSV with header', () => {
    const csv = 'name,address\nAlice,0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045\n'
    const { results, toAdd } = parseWatchListCsv(csv)

    expect(results).toHaveLength(1)
    expect(results[0]).toEqual({ name: 'Alice', address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' })
    expect(toAdd).toHaveLength(1)
    expect(toAdd[0]).toEqual({ name: 'Alice', address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' })
  })

  it('parses CSV without header', () => {
    const csv = 'Bob,0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045\n'
    const { results, toAdd } = parseWatchListCsv(csv)

    expect(results).toHaveLength(1)
    expect(toAdd).toHaveLength(1)
    expect(results[0].name).toBe('Bob')
  })

  it('deduplicates addresses case-insensitively', () => {
    const csv = [
      'name,address',
      'First,0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      'Second,0xD8DA6BF26964AF9D7EED9E03E53415D37AA96045'
    ].join('\n')

    const { results, toAdd } = parseWatchListCsv(csv)

    expect(results).toHaveLength(2) // both rows in results
    expect(toAdd).toHaveLength(1) // only first unique address to add
    expect(toAdd[0].name).toBe('First')
  })

  it('rejects invalid addresses with real viem validation', () => {
    const csv = [
      'name,address',
      'Good,0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      'TooShort,0x1234',
      'NotHex,0xZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ',
      'Plain,hello'
    ].join('\n')

    const { results, toAdd } = parseWatchListCsv(csv)

    expect(toAdd).toHaveLength(1)
    expect(toAdd[0].name).toBe('Good')

    expect(results).toHaveLength(4)
    expect(results[0].error).toBeUndefined()
    expect(results[1].error).toMatch(/Invalid address/)
    expect(results[2].error).toMatch(/Invalid address/)
    expect(results[3].error).toMatch(/Invalid address/)
  })

  it('handles rows with too few columns', () => {
    const csv = 'name,address\nJustAName\n'
    const { results, toAdd } = parseWatchListCsv(csv)

    expect(toAdd).toHaveLength(0)
    expect(results).toHaveLength(1)
    expect(results[0].error).toBe('Invalid row format')
  })

  it('skips comment lines and blank lines', () => {
    const csv = [
      '# this is a comment',
      'name,address',
      '',
      '  ',
      'Alice,0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      '# another comment'
    ].join('\n')

    const { results, toAdd } = parseWatchListCsv(csv)

    expect(results).toHaveLength(1)
    expect(toAdd).toHaveLength(1)
    expect(results[0].name).toBe('Alice')
  })

  it('throws on empty CSV', () => {
    expect(() => parseWatchListCsv('')).toThrow('CSV file is empty')
    expect(() => parseWatchListCsv('\n\n')).toThrow('CSV file is empty')
    expect(() => parseWatchListCsv('# only comments\n')).toThrow('CSV file is empty')
  })

  it('handles Windows-style line endings', () => {
    const csv = 'name,address\r\nAlice,0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045\r\n'
    const { results, toAdd } = parseWatchListCsv(csv)

    expect(results).toHaveLength(1)
    expect(toAdd).toHaveLength(1)
  })

  it('trims whitespace from fields', () => {
    const csv = 'name,address\n  Alice  ,  0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045  \n'
    const { results } = parseWatchListCsv(csv)

    expect(results[0].name).toBe('Alice')
    expect(results[0].address).toBe('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045')
  })
})

describe('parseWatchListCsv with real watchlist file', () => {
  const fixturePath = path.join(__dirname, 'fixtures', 'watchlist.csv')

  // Skip if fixture doesn't exist (CI may not have it)
  const hasFixture = fs.existsSync(fixturePath)
  const testOrSkip = hasFixture ? it : it.skip

  testOrSkip('parses the full watchlist fixture without errors', () => {
    const csv = fs.readFileSync(fixturePath, 'utf8')
    const { results, toAdd } = parseWatchListCsv(csv)

    // All rows should parse (no format errors)
    const formatErrors = results.filter((r) => r.error?.includes('Invalid row format'))
    expect(formatErrors).toHaveLength(0)

    // All addresses should be valid
    const addressErrors = results.filter((r) => r.error?.includes('Invalid address'))
    expect(addressErrors).toHaveLength(0)

    // Should have a reasonable number of unique addresses
    expect(toAdd.length).toBeGreaterThan(0)
    expect(toAdd.length).toBeLessThanOrEqual(results.length)

    // Every toAdd entry should have a name and valid address
    for (const entry of toAdd) {
      expect(entry.name).toBeTruthy()
      expect(entry.address).toMatch(/^0x[0-9a-fA-F]{40}$/)
    }
  })

  testOrSkip('deduplicates addresses in the fixture', () => {
    const csv = fs.readFileSync(fixturePath, 'utf8')
    const { results, toAdd } = parseWatchListCsv(csv)

    const uniqueAddresses = new Set(toAdd.map((e) => e.address.toLowerCase()))
    expect(uniqueAddresses.size).toBe(toAdd.length)

    // Results should have more or equal rows than unique addresses
    expect(results.length).toBeGreaterThanOrEqual(toAdd.length)
  })
})

describe('loadWatchListCsv', () => {
  it('rejects non-URL non-file sources', async () => {
    await expect(loadWatchListCsv('file')).rejects.toThrow('Local file loading requires caller')
  })

  it('fetches from URL', async () => {
    const csv = 'name,address\nTest,0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045\n'
    global.fetch = jest.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(csv) }) as any

    const result = await loadWatchListCsv('https://example.com/list.csv')
    expect(result).toBe(csv)
    expect(global.fetch).toHaveBeenCalledWith('https://example.com/list.csv')

    delete (global as any).fetch
  })

  it('throws on failed fetch', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' }) as any

    await expect(loadWatchListCsv('https://example.com/missing.csv')).rejects.toThrow('404')

    delete (global as any).fetch
  })
})
