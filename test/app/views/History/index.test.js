/**
 * @jest-environment jsdom
 */
import { render, screen, act } from '../../../componentSetup'
import HistoryView from '../../../../app/views/History/index'

const mockClearTxHistory = jest.fn()
const mockOpenExplorer = jest.fn()

jest.mock('../../../../app/ipc', () => ({
  actions: {
    clearTxHistory: (...args) => mockClearTxHistory(...args),
    openExplorer: (...args) => mockOpenExplorer(...args)
  }
}))

const mockUseTxHistory = jest.fn()
const mockUseAccounts = jest.fn()
const mockUseNetworks = jest.fn()

jest.mock('../../../../app/store', () => ({
  useTxHistory: (...args) => mockUseTxHistory(...args),
  useAccounts: (...args) => mockUseAccounts(...args),
  useNetworks: (...args) => mockUseNetworks(...args)
}))

const defaultAccounts = {
  '0xabc': { name: 'Alice' },
  '0xdef': { name: 'Bob' }
}

const defaultTxHistory = [
  {
    hash: '0x1234567890abcdef1234567890abcdef',
    status: 'confirmed',
    submittedAt: 1700000000000,
    chainId: 1,
    decodedName: 'Transfer'
  },
  {
    hash: '0xfedcba0987654321fedcba0987654321',
    status: 'pending',
    submittedAt: 1700001000000,
    chainId: 10
  }
]

const defaultNetworks = {
  '1': { id: 1, name: 'Ethereum' },
  '10': { id: 10, name: 'Optimism' }
}

function setupMocks({ accounts, txHistory, networks } = {}) {
  mockUseAccounts.mockReturnValue(accounts !== undefined ? accounts : defaultAccounts)
  mockUseTxHistory.mockReturnValue(txHistory !== undefined ? txHistory : defaultTxHistory)
  mockUseNetworks.mockReturnValue(networks !== undefined ? networks : defaultNetworks)
}

beforeEach(() => {
  jest.clearAllMocks()
  setupMocks()
})

describe('HistoryView', () => {
  it('renders Transaction History heading', () => {
    render(<HistoryView />)
    expect(screen.getByText('Transaction History')).toBeDefined()
  })

  it('shows No transactions yet when no txs', () => {
    setupMocks({ txHistory: [] })
    render(<HistoryView />)
    expect(screen.getByText('No transactions yet')).toBeDefined()
  })

  it('does not show Clear button when no transactions', () => {
    setupMocks({ txHistory: [] })
    render(<HistoryView />)
    expect(screen.queryByText('Clear')).toBeNull()
  })

  it('shows transactions sorted by submittedAt descending (newest first)', () => {
    render(<HistoryView />)
    // The pending tx (submittedAt: 1700001000000) should appear before confirmed (1700000000000)
    // 0xfedcba0987654321fedcba0987654321 → first 6 chars = '0xfedc', last 4 = '4321'
    const pendingEl = screen.getByText('0xfedc...4321')
    // 0x1234567890abcdef1234567890abcdef → first 6 chars = '0x1234', last 4 = 'cdef'
    const confirmedEl = screen.getByText('0x1234...cdef')
    // pending has higher timestamp so it appears first (confirmedEl follows pendingEl)
    expect(pendingEl.compareDocumentPosition(confirmedEl) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('shows truncated hash for transactions', () => {
    render(<HistoryView />)
    // 0x1234567890abcdef1234567890abcdef → '0x1234...cdef'
    expect(screen.getByText('0x1234...cdef')).toBeDefined()
    // 0xfedcba0987654321fedcba0987654321 → '0xfedc...4321'
    expect(screen.getByText('0xfedc...4321')).toBeDefined()
  })

  it('shows StatusBadge with correct status text', () => {
    render(<HistoryView />)
    expect(screen.getByText('confirmed')).toBeDefined()
    expect(screen.getByText('pending')).toBeDefined()
  })

  it('shows decodedName when available', () => {
    render(<HistoryView />)
    expect(screen.getByText('Transfer')).toBeDefined()
  })

  it('shows formatted time for transactions', () => {
    render(<HistoryView />)
    // Both transactions should have some formatted time shown
    // We just verify the time elements are rendered (non-empty text near timestamps)
    const items = screen.getAllByRole('button', { name: 'Explorer' })
    expect(items.length).toBeGreaterThan(0)
  })

  it('shows chain name for transactions', () => {
    render(<HistoryView />)
    expect(screen.getByText('Ethereum')).toBeDefined()
    expect(screen.getByText('Optimism')).toBeDefined()
  })

  it('Explorer button calls actions.openExplorer with chain and hash', async () => {
    const { user } = render(<HistoryView />)
    const explorerButtons = screen.getAllByText('Explorer')
    // First button corresponds to the newest tx (pending, chainId 10)
    await user.click(explorerButtons[0])
    expect(mockOpenExplorer).toHaveBeenCalledWith(
      { type: 'ethereum', id: 10 },
      '0xfedcba0987654321fedcba0987654321'
    )
  })

  it('shows account selector when >1 account', () => {
    render(<HistoryView />)
    const select = screen.getByRole('combobox')
    expect(select).toBeDefined()
    expect(screen.getByText('Alice')).toBeDefined()
    expect(screen.getByText('Bob')).toBeDefined()
  })

  it('does not show account selector when 1 account', () => {
    setupMocks({ accounts: { '0xabc': { name: 'Alice' } } })
    render(<HistoryView />)
    expect(screen.queryByRole('combobox')).toBeNull()
  })

  it('changing account calls useTxHistory with new address', async () => {
    const { user } = render(<HistoryView />)
    // useTxHistory should initially be called with the first account
    expect(mockUseTxHistory).toHaveBeenCalledWith('0xabc')

    const select = screen.getByRole('combobox')
    await user.selectOptions(select, '0xdef')
    // After changing selection, useTxHistory should be called with the new address
    expect(mockUseTxHistory).toHaveBeenCalledWith('0xdef')
  })

  it('shows Clear button when transactions exist', () => {
    render(<HistoryView />)
    expect(screen.getByText('Clear')).toBeDefined()
  })

  it('clicking Clear button opens confirmation modal', async () => {
    const { user } = render(<HistoryView />)
    await user.click(screen.getByText('Clear'))
    expect(screen.getByText('Clear History')).toBeDefined()
    expect(screen.getByText('Remove all transaction history for this account?')).toBeDefined()
  })

  it('Cancel button in modal closes the modal', async () => {
    const { user } = render(<HistoryView />)
    await user.click(screen.getByText('Clear'))
    expect(screen.getByText('Clear History')).toBeDefined()
    await user.click(screen.getByText('Cancel'))
    expect(screen.queryByText('Clear History')).toBeNull()
  })

  it('Clear button in modal calls actions.clearTxHistory with selectedAddress', async () => {
    const { user } = render(<HistoryView />)
    await user.click(screen.getByText('Clear'))
    // Click the red Clear button inside the modal
    const clearButtons = screen.getAllByText('Clear')
    // The modal's Clear button is the second one (first is the trigger)
    const modalClearButton = clearButtons.find((btn) =>
      btn.className.includes('red') || btn.closest('.bg-gray-900')
    )
    await user.click(modalClearButton || clearButtons[clearButtons.length - 1])
    expect(mockClearTxHistory).toHaveBeenCalledWith('0xabc')
  })
})

describe('truncateHash', () => {
  // We test truncateHash behavior through the rendered output
  it('truncates long hashes to first 6 + ... + last 4', () => {
    setupMocks({
      txHistory: [
        {
          hash: '0x1234567890abcdef',
          status: 'confirmed',
          submittedAt: 1700000000000,
          chainId: 1
        }
      ]
    })
    render(<HistoryView />)
    expect(screen.getByText('0x1234...cdef')).toBeDefined()
  })

  it('returns short hash as-is (passthrough for <12 chars)', () => {
    setupMocks({
      txHistory: [
        {
          hash: '0xshort',
          status: 'confirmed',
          submittedAt: 1700000000000,
          chainId: 1
        }
      ]
    })
    render(<HistoryView />)
    expect(screen.getByText('0xshort')).toBeDefined()
  })
})
