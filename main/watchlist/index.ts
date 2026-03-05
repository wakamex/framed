import { isAddress } from 'viem'

export interface WatchListEntry {
  name: string
  address: string
}

export interface WatchListResult {
  name: string
  address: string
  error?: string
}

export interface ParsedWatchList {
  results: WatchListResult[]
  toAdd: WatchListEntry[]
}

export function parseWatchListCsv(csv: string): ParsedWatchList {
  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))

  if (!lines.length) throw new Error('CSV file is empty')

  const firstFields = lines[0].split(',').map((f) => f.trim().toLowerCase())
  const hasHeader = firstFields.includes('name') || firstFields.includes('address')
  const dataLines = hasHeader ? lines.slice(1) : lines

  const results: WatchListResult[] = []
  const toAdd: WatchListEntry[] = []
  const seen = new Set<string>()

  for (const line of dataLines) {
    const parts = line.split(',').map((p) => p.trim())
    if (parts.length < 2) {
      results.push({ name: parts[0] || '', address: '', error: 'Invalid row format' })
      continue
    }

    const [name, address] = parts

    if (!isAddress(address)) {
      results.push({ name, address, error: `Invalid address: ${address}` })
      continue
    }

    const normalized = address.toLowerCase()
    if (seen.has(normalized)) {
      results.push({ name, address })
      continue
    }
    seen.add(normalized)

    toAdd.push({ address, name })
    results.push({ name, address })
  }

  return { results, toAdd }
}

export async function loadWatchListCsv(source: string): Promise<string> {
  if (source.startsWith('http://') || source.startsWith('https://')) {
    const res = await fetch(source)
    if (!res.ok) throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`)
    return res.text()
  }
  // For local files, caller provides the CSV content directly
  throw new Error('Local file loading requires caller to provide CSV content')
}
