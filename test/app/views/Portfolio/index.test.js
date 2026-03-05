/**
 * @jest-environment jsdom
 */
import { render, screen, act } from '../../../componentSetup'
import PortfolioView from '../../../../app/views/Portfolio/index'

const NATIVE_CURRENCY = '0x0000000000000000000000000000000000000000'

jest.mock('../../../../resources/constants', () => ({
  NATIVE_CURRENCY: '0x0000000000000000000000000000000000000000',
  NETWORK_PRESETS: {},
  ADDRESS_DISPLAY_CHARS: 8,
  MAX_HEX: ''
}))

const mockUseAllBalances = jest.fn()
const mockUseAccounts = jest.fn()
const mockUseNetworks = jest.fn()
const mockUseNetworksMeta = jest.fn()
const mockUseRates = jest.fn()

jest.mock('../../../../app/store', () => ({
  useAllBalances: (...args) => mockUseAllBalances(...args),
  useAccounts: (...args) => mockUseAccounts(...args),
  useNetworks: (...args) => mockUseNetworks(...args),
  useNetworksMeta: (...args) => mockUseNetworksMeta(...args),
  useRates: (...args) => mockUseRates(...args)
}))

const mockUseCompact = jest.fn()

jest.mock('../../../../app/hooks/useCompact', () => ({
  useCompact: (...args) => mockUseCompact(...args)
}))

function setupDefaults() {
  mockUseAllBalances.mockReturnValue({
    '0xabc123': [
      {
        symbol: 'ETH',
        name: 'Ether',
        displayBalance: '1.5',
        address: NATIVE_CURRENCY,
        chainId: 1
      },
      {
        symbol: 'USDC',
        name: 'USD Coin',
        displayBalance: '1000',
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        chainId: 1
      }
    ]
  })
  mockUseAccounts.mockReturnValue({
    '0xabc123': { address: '0xabc123', name: 'Main', ensName: 'vitalik.eth' }
  })
  mockUseNetworks.mockReturnValue({ '1': { name: 'Ethereum' } })
  mockUseNetworksMeta.mockReturnValue({
    '1': { nativeCurrency: { usd: { price: 2000 } } }
  })
  mockUseRates.mockReturnValue({})
  mockUseCompact.mockReturnValue(false)
}

describe('PortfolioView', () => {
  beforeEach(() => {
    setupDefaults()
  })

  it('shows "No balances found" when there are no balances', () => {
    mockUseAllBalances.mockReturnValue({})
    render(<PortfolioView />)
    expect(screen.getByText('No balances found')).toBeDefined()
  })

  it('displays total portfolio value formatted as USD', () => {
    render(<PortfolioView />)
    // 1.5 ETH * $2000 = $3000; USDC has no native pricing
    // $3,000 appears in portfolio total, chain total, account total, and ETH row
    const matches = screen.getAllByText('$3,000')
    expect(matches.length).toBeGreaterThan(0)
    // The portfolio total is in the large div
    expect(matches[0].textContent).toBe('$3,000')
  })

  it('renders By Chain section with chain name', () => {
    render(<PortfolioView />)
    expect(screen.getByText('Ethereum')).toBeDefined()
  })

  it('renders By Account section with account label', () => {
    render(<PortfolioView />)
    // account label should be ensName
    expect(screen.getByText('vitalik.eth')).toBeDefined()
  })

  it('uses ensName over name over raw address for account label', () => {
    mockUseAccounts.mockReturnValue({
      '0xabc123': { address: '0xabc123', name: 'Main', ensName: 'vitalik.eth' }
    })
    render(<PortfolioView />)
    expect(screen.getByText('vitalik.eth')).toBeDefined()
    // Name should not be used as label when ensName is present
    expect(screen.queryByText('Main')).toBeNull()
  })

  it('falls back to name when ensName is absent', () => {
    // No ensName property → account?.ensName is undefined → falls back to name
    mockUseAccounts.mockReturnValue({
      '0xabc123': { address: '0xabc123', name: 'Main Wallet' }
    })
    render(<PortfolioView />)
    expect(screen.getByText('Main Wallet')).toBeDefined()
  })

  it('falls back to raw address when both ensName and name are absent', () => {
    mockUseAccounts.mockReturnValue({
      '0xabc123': { address: '0xabc123' }
    })
    render(<PortfolioView />)
    // Label will be the address itself
    expect(screen.getByText('0xabc123')).toBeDefined()
  })

  it('calculates USD value correctly for native tokens (amount * price)', () => {
    // 1.5 ETH * $2000/ETH = $3000
    render(<PortfolioView />)
    const matches = screen.getAllByText('$3,000')
    expect(matches.length).toBeGreaterThan(0)
  })

  it('shows "—" for non-native token USD value', () => {
    render(<PortfolioView />)
    // USDC is not native so it has no USD price → "—"
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThan(0)
  })

  it('shows multiple chain groups sorted by USD descending', () => {
    mockUseAllBalances.mockReturnValue({
      '0xabc123': [
        { symbol: 'ETH', name: 'Ether', displayBalance: '1.5', address: NATIVE_CURRENCY, chainId: 1 },
        { symbol: 'MATIC', name: 'Matic', displayBalance: '100', address: NATIVE_CURRENCY, chainId: 137 }
      ]
    })
    mockUseNetworks.mockReturnValue({ '1': { name: 'Ethereum' }, '137': { name: 'Polygon' } })
    mockUseNetworksMeta.mockReturnValue({
      '1': { nativeCurrency: { usd: { price: 2000 } } },
      '137': { nativeCurrency: { usd: { price: 1 } } }
    })

    render(<PortfolioView />)

    // Both chains should be visible
    expect(screen.getByText('Ethereum')).toBeDefined()
    expect(screen.getByText('Polygon')).toBeDefined()

    // Ethereum ($3000) should appear before Polygon ($100) in the DOM
    const chainNames = screen.getAllByText(/^(Ethereum|Polygon)$/)
    expect(chainNames[0].textContent).toBe('Ethereum')
    expect(chainNames[1].textContent).toBe('Polygon')
  })

  it('shows multiple account groups sorted by USD descending', () => {
    mockUseAllBalances.mockReturnValue({
      '0xabc123': [
        { symbol: 'ETH', name: 'Ether', displayBalance: '10', address: NATIVE_CURRENCY, chainId: 1 }
      ],
      '0xdef456': [
        { symbol: 'ETH', name: 'Ether', displayBalance: '0.5', address: NATIVE_CURRENCY, chainId: 1 }
      ]
    })
    // No ensName → falls back to name
    mockUseAccounts.mockReturnValue({
      '0xabc123': { address: '0xabc123', name: 'Rich Account' },
      '0xdef456': { address: '0xdef456', name: 'Poor Account' }
    })

    render(<PortfolioView />)

    // Both accounts visible
    expect(screen.getByText('Rich Account')).toBeDefined()
    expect(screen.getByText('Poor Account')).toBeDefined()

    // Rich Account (10 ETH * $2000 = $20,000) should appear first
    const labels = screen.getAllByText(/^(Rich Account|Poor Account)$/)
    expect(labels[0].textContent).toBe('Rich Account')
    expect(labels[1].textContent).toBe('Poor Account')
  })

  it('toggles section visibility when CollapsibleSection title is clicked', async () => {
    const { user } = render(<PortfolioView />)

    // "Ethereum" (chain content) should be visible initially
    expect(screen.getByText('Ethereum')).toBeDefined()

    // Click "By Chain" button to collapse
    await user.click(screen.getByText('By Chain'))

    // After collapsing, chain content should be hidden
    expect(screen.queryByText('Ethereum')).toBeNull()

    // Click again to expand
    await user.click(screen.getByText('By Chain'))
    expect(screen.getByText('Ethereum')).toBeDefined()
  })

  it('excludes entries with zero displayBalance from balance table', () => {
    mockUseAllBalances.mockReturnValue({
      '0xabc123': [
        // Zero-balance ETH should be excluded
        { symbol: 'ETH', name: 'Ether', displayBalance: '0', address: NATIVE_CURRENCY, chainId: 1 },
        // Non-zero USDC should still appear
        { symbol: 'USDC', name: 'USD Coin', displayBalance: '100', address: '0xA0b8', chainId: 1 }
      ]
    })

    render(<PortfolioView />)
    // USDC (non-zero) should be visible (appears in both chain and account sections)
    const usdcRows = screen.getAllByText('USD Coin')
    expect(usdcRows.length).toBeGreaterThan(0)
    // ETH (zero balance) should not appear as a token row
    expect(screen.queryByText('Ether')).toBeNull()
  })

  it('renders stacked div layout in compact mode', () => {
    mockUseCompact.mockReturnValue(true)
    render(<PortfolioView />)
    // Compact mode uses divs, not a table
    expect(document.querySelector('table')).toBeNull()
  })

  it('renders table with Token/Balance/USD Value headers in normal mode', () => {
    mockUseCompact.mockReturnValue(false)
    render(<PortfolioView />)
    // Both By Chain and By Account sections have tables, so getAllByText
    const tokenHeaders = screen.getAllByText('Token')
    expect(tokenHeaders.length).toBeGreaterThan(0)
    const balanceHeaders = screen.getAllByText('Balance')
    expect(balanceHeaders.length).toBeGreaterThan(0)
    const usdHeaders = screen.getAllByText('USD Value')
    expect(usdHeaders.length).toBeGreaterThan(0)
  })

  it('shows "<0.0001" for tiny balance values', () => {
    mockUseAllBalances.mockReturnValue({
      '0xabc123': [
        {
          symbol: 'ETH',
          name: 'Ether',
          displayBalance: '0.000001',
          address: NATIVE_CURRENCY,
          chainId: 1
        }
      ]
    })

    render(<PortfolioView />)
    // Appears in both chain and account sections
    const matches = screen.getAllByText('<0.0001')
    expect(matches.length).toBeGreaterThan(0)
  })

  it('truncates account address in "0xfirst6...last4" format', () => {
    // When label !== address (ensName present), truncated address is shown alongside label
    mockUseAccounts.mockReturnValue({
      '0xabcdef1234567890': {
        address: '0xabcdef1234567890',
        name: 'Wallet',
        ensName: 'vitalik.eth'
      }
    })
    mockUseAllBalances.mockReturnValue({
      '0xabcdef1234567890': [
        { symbol: 'ETH', name: 'Ether', displayBalance: '1', address: NATIVE_CURRENCY, chainId: 1 }
      ]
    })

    render(<PortfolioView />)
    // First 6 chars + '...' + last 4 chars
    expect(screen.getByText('0xabcd...7890')).toBeDefined()
  })

  it('aggregates balances from multiple accounts for the same chain', () => {
    mockUseAllBalances.mockReturnValue({
      '0xabc123': [
        { symbol: 'ETH', name: 'Ether', displayBalance: '1', address: NATIVE_CURRENCY, chainId: 1 }
      ],
      '0xdef456': [
        { symbol: 'ETH', name: 'Ether', displayBalance: '2', address: NATIVE_CURRENCY, chainId: 1 }
      ]
    })
    mockUseAccounts.mockReturnValue({
      '0xabc123': { address: '0xabc123', name: 'Alice' },
      '0xdef456': { address: '0xdef456', name: 'Bob' }
    })

    render(<PortfolioView />)

    // Chain total: 1 + 2 = 3 ETH * $2000 = $6,000
    // Also appears as portfolio total
    const matches = screen.getAllByText('$6,000')
    expect(matches.length).toBeGreaterThan(0)
  })

  it('uses token rates for ERC-20 USD values', () => {
    const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
    mockUseAllBalances.mockReturnValue({
      '0xabc123': [
        { symbol: 'USDC', name: 'USD Coin', displayBalance: '1000', address: USDC_ADDRESS, chainId: 1 }
      ]
    })
    mockUseRates.mockReturnValue({
      [USDC_ADDRESS]: { usd: { price: 1.0, change24hr: 0 } }
    })

    render(<PortfolioView />)

    // 1000 USDC * $1 = $1,000
    const matches = screen.getAllByText('$1,000')
    expect(matches.length).toBeGreaterThan(0)
  })

  it('shows "—" for tokens without rate data', () => {
    mockUseAllBalances.mockReturnValue({
      '0xabc123': [
        { symbol: 'OBSCURE', name: 'Obscure Token', displayBalance: '500', address: '0xdeadbeef', chainId: 1 }
      ]
    })
    mockUseRates.mockReturnValue({})

    render(<PortfolioView />)

    // No rate data → USD value should be "—"
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThan(0)
  })

  it('does not display $? for any balance', () => {
    mockUseAllBalances.mockReturnValue({
      '0xabc123': [
        { symbol: 'ETH', name: 'Ether', displayBalance: '1', address: NATIVE_CURRENCY, chainId: 1 },
        { symbol: 'UNKNOWN', name: 'Unknown', displayBalance: '100', address: '0xdeadbeef', chainId: 1 }
      ]
    })
    mockUseRates.mockReturnValue({})

    render(<PortfolioView />)

    // "$?" should never appear in the rendered output
    expect(screen.queryByText('$?')).toBeNull()
  })
})

describe('PortfolioView exhaustive price availability', () => {
  beforeEach(() => {
    setupDefaults()
  })

  it('shows USD value for every ERC-20 token that has a rate', () => {
    const USDC = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
    const DAI = '0x6b175474e89094c44da98b954eedeac495271d0f'
    const EUL = '0xd9fcd98c322942075a5c3860693e9f4f03aae07b'

    mockUseAllBalances.mockReturnValue({
      '0xabc123': [
        { symbol: 'ETH', name: 'Ether', displayBalance: '2', address: NATIVE_CURRENCY, chainId: 1 },
        { symbol: 'USDC', name: 'USD Coin', displayBalance: '5000', address: USDC, chainId: 1 },
        { symbol: 'DAI', name: 'Dai', displayBalance: '3000', address: DAI, chainId: 1 },
        { symbol: 'EUL', name: 'Euler', displayBalance: '200', address: EUL, chainId: 1 }
      ]
    })
    mockUseNetworksMeta.mockReturnValue({
      '1': { nativeCurrency: { usd: { price: 2500 } } }
    })
    mockUseRates.mockReturnValue({
      [USDC]: { usd: { price: 1.0, change24hr: 0.01 } },
      [DAI]: { usd: { price: 1.0, change24hr: -0.02 } },
      [EUL]: { usd: { price: 5.0, change24hr: 3.0 } }
    })

    render(<PortfolioView />)

    // No "—" should appear since all tokens have prices
    expect(screen.queryAllByText('—').length).toBe(0)

    // Total: 2*2500 + 5000*1 + 3000*1 + 200*5 = 5000+5000+3000+1000 = 14000
    const totalMatches = screen.getAllByText('$14,000')
    expect(totalMatches.length).toBeGreaterThan(0)
  })

  it('shows USD for native currency and "—" only for tokens without rates', () => {
    const USDC = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
    const OBSCURE = '0xdeadbeef00000000000000000000000000000001'

    mockUseAllBalances.mockReturnValue({
      '0xabc123': [
        { symbol: 'ETH', name: 'Ether', displayBalance: '1', address: NATIVE_CURRENCY, chainId: 1 },
        { symbol: 'USDC', name: 'USD Coin', displayBalance: '100', address: USDC, chainId: 1 },
        { symbol: 'OBS', name: 'Obscure', displayBalance: '999', address: OBSCURE, chainId: 1 }
      ]
    })
    mockUseRates.mockReturnValue({
      [USDC]: { usd: { price: 1.0, change24hr: 0 } }
      // OBSCURE has no rate entry
    })

    render(<PortfolioView />)

    // Only OBSCURE should show "—" (appears twice: once in chain section, once in account section)
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBe(2)

    // ETH ($2000) + USDC ($100) = $2100 total
    const totalMatches = screen.getAllByText('$2,100')
    expect(totalMatches.length).toBeGreaterThan(0)
  })

  it('aggregates USD values from ERC-20 tokens across multiple accounts', () => {
    const USDC = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'

    mockUseAllBalances.mockReturnValue({
      '0xabc123': [
        { symbol: 'USDC', name: 'USD Coin', displayBalance: '1000', address: USDC, chainId: 1 }
      ],
      '0xdef456': [
        { symbol: 'USDC', name: 'USD Coin', displayBalance: '2000', address: USDC, chainId: 1 }
      ]
    })
    mockUseAccounts.mockReturnValue({
      '0xabc123': { address: '0xabc123', name: 'Alice' },
      '0xdef456': { address: '0xdef456', name: 'Bob' }
    })
    mockUseNetworksMeta.mockReturnValue({
      '1': { nativeCurrency: { usd: { price: 2000 } } }
    })
    mockUseRates.mockReturnValue({
      [USDC]: { usd: { price: 1.0, change24hr: 0 } }
    })

    render(<PortfolioView />)

    // Total: 1000 + 2000 = $3,000
    const totalMatches = screen.getAllByText('$3,000')
    expect(totalMatches.length).toBeGreaterThan(0)

    // No dashes since USDC has a rate
    expect(screen.queryAllByText('—').length).toBe(0)
  })

  it('shows USD for ERC-20 tokens on multiple chains', () => {
    const USDC_MAINNET = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
    const USDC_OPTIMISM = '0x7f5c764cbc14f9669b88837ca1490cca17c31607'

    mockUseAllBalances.mockReturnValue({
      '0xabc123': [
        { symbol: 'USDC', name: 'USD Coin', displayBalance: '1000', address: USDC_MAINNET, chainId: 1 },
        { symbol: 'USDC', name: 'USD Coin', displayBalance: '500', address: USDC_OPTIMISM, chainId: 10 }
      ]
    })
    mockUseNetworks.mockReturnValue({
      '1': { name: 'Ethereum' },
      '10': { name: 'Optimism' }
    })
    mockUseNetworksMeta.mockReturnValue({
      '1': { nativeCurrency: { usd: { price: 2000 } } },
      '10': { nativeCurrency: { usd: { price: 2000 } } }
    })
    mockUseRates.mockReturnValue({
      [USDC_MAINNET]: { usd: { price: 1.0, change24hr: 0 } },
      [USDC_OPTIMISM]: { usd: { price: 1.0, change24hr: 0 } }
    })

    render(<PortfolioView />)

    // No dashes — all tokens have prices
    expect(screen.queryAllByText('—').length).toBe(0)

    // Total: $1000 + $500 = $1,500
    const totalMatches = screen.getAllByText('$1,500')
    expect(totalMatches.length).toBeGreaterThan(0)
  })

  it('handles mix of priced and unpriced tokens without "$?" anywhere', () => {
    const USDC = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'

    mockUseAllBalances.mockReturnValue({
      '0xabc123': [
        { symbol: 'ETH', name: 'Ether', displayBalance: '1', address: NATIVE_CURRENCY, chainId: 1 },
        { symbol: 'USDC', name: 'USD Coin', displayBalance: '500', address: USDC, chainId: 1 },
        { symbol: 'SCAM', name: 'Scam Token', displayBalance: '999999', address: '0xscam', chainId: 1 },
        { symbol: 'DUST', name: 'Dust Token', displayBalance: '0.0001', address: '0xdust', chainId: 1 }
      ]
    })
    mockUseRates.mockReturnValue({
      [USDC]: { usd: { price: 1.0, change24hr: 0 } }
    })

    render(<PortfolioView />)

    // "$?" should NEVER appear
    expect(screen.queryByText('$?')).toBeNull()
    expect(screen.queryByText(/\$\?/)).toBeNull()
  })
})
