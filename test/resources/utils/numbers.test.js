import { formatNumber, isUnlimited, formatDisplayDecimal, max } from '../../../resources/utils/numbers'

const MAX_HEX = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'

describe('formatNumber', () => {
  it('small number (<1M) returns raw value with no symbol', () => {
    // Symbol is empty string so result ends with trailing space
    expect(formatNumber(500000)).toBe('~500000 ')
  })

  it('1,500,000 returns "~1.5 million"', () => {
    expect(formatNumber(1500000)).toBe('~1.5 million')
  })

  it('2,000,000,000 returns "~2 billion"', () => {
    expect(formatNumber(2000000000)).toBe('~2 billion')
  })

  it('exact value (no approximation) has no "~" prefix', () => {
    // 1234500000 / 1e9 = 1.2345 — toFixed(4) equals toString(), so no ~
    expect(formatNumber(1234500000)).toBe('1.2345 billion')
  })

  it('trailing zeros are stripped', () => {
    // 1500000 / 1e6 = 1.5 — toFixed(4) gives '1.5000' which becomes '1.5'
    expect(formatNumber(1500000)).toBe('~1.5 million')
  })

  it('0 produces "NaN ?" due to fallback division', () => {
    // 0 doesn't match any digitsLookup entry (all >= 1), so falls back to
    // {value:0, symbol:'?'}, and 0/0 = NaN
    expect(formatNumber(0)).toBe('NaN ?')
  })

  it('custom digits parameter controls precision', () => {
    expect(formatNumber(1234567, 2)).toBe('~1.23 million')
    expect(formatNumber(1234567, 4)).toBe('~1.2346 million')
  })

  it('very large number (1e18) returns quintillion', () => {
    expect(formatNumber(1e18)).toBe('~1 quintillion')
  })
})

describe('isUnlimited', () => {
  it('returns true for the MAX_HEX value', () => {
    expect(isUnlimited(MAX_HEX)).toBe(true)
  })

  it('returns false for normal amounts', () => {
    expect(isUnlimited('1000')).toBe(false)
    expect(isUnlimited('0')).toBe(false)
  })
})

describe('formatDisplayDecimal', () => {
  it('shifts amount by -decimals correctly', () => {
    // BigNumber('1000000').shiftedBy(-6) = 1, then formatNumber(1) = '~1 '
    expect(formatDisplayDecimal('1000000', 6)).toBe('~1 ')
  })

  it('very large amount (>9e12) with non-zero decimals returns "~unlimited"', () => {
    // 1e14 shifted by -1 = 1e13 > 9e12, decimals=1 truthy => '~unlimited'
    expect(formatDisplayDecimal('100000000000000', 1)).toBe('~unlimited')
  })

  it('very large amount with decimals=0 returns "unknown"', () => {
    // 1e14 shifted by 0 = 1e14 > 9e12, decimals=0 falsy => 'unknown'
    expect(formatDisplayDecimal('100000000000000', 0)).toBe('unknown')
  })

  it('normal amount delegates to formatNumber', () => {
    // BigNumber('1500000').shiftedBy(0) = 1500000 <= 9e12, formatNumber(1500000)
    expect(formatDisplayDecimal('1500000', 0)).toBe('~1.5 million')
  })
})
