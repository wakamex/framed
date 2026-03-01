import { useMemo, useState } from 'react'
import { useAllBalances, useAccounts, useNetworks, useNetworksMeta } from '../../store'
import { useCompact } from '../../hooks/useCompact'
import { NATIVE_CURRENCY } from '../../../resources/constants'
import type { Balance } from '../../types'

interface AggregatedBalance {
  symbol: string
  name: string
  displayBalance: number
  usdValue: number | null
  chainId: number
}

function formatUsd(value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
}

function formatBalance(value: number): string {
  if (value === 0) return '0'
  if (value < 0.0001) return '<0.0001'
  return value.toLocaleString('en-US', { maximumFractionDigits: 4 })
}

function CollapsibleSection({ title, defaultOpen = true, children }: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-xs uppercase tracking-wide text-gray-500">{title}</span>
        <span className="text-gray-500 text-xs">{open ? '\u25B2' : '\u25BC'}</span>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

export default function PortfolioView() {
  const allBalances = useAllBalances()
  const accounts = useAccounts()
  const networks = useNetworks()
  const networksMeta = useNetworksMeta()
  const compact = useCompact()

  const { totalUsd, byChain, byAccount } = useMemo(() => {
    let totalUsd = 0

    const chainMap = new Map<number, { name: string; balances: AggregatedBalance[]; totalUsd: number }>()
    const accountMap = new Map<string, { label: string; balances: AggregatedBalance[]; totalUsd: number }>()

    // Build address-to-account lookup to avoid O(n) find per balance entry
    const accountsByAddress = new Map(
      Object.values(accounts).map((a) => [a.address, a])
    )

    for (const [accountAddress, balances] of Object.entries(allBalances)) {
      if (!balances || balances.length === 0) continue

      const account = accountsByAddress.get(accountAddress)
      const accountLabel = account?.ensName ?? account?.name ?? accountAddress

      if (!accountMap.has(accountAddress)) {
        accountMap.set(accountAddress, { label: accountLabel, balances: [], totalUsd: 0 })
      }
      const acctEntry = accountMap.get(accountAddress)!

      for (const bal of balances as Balance[]) {
        const amount = parseFloat(bal.displayBalance)
        if (amount === 0) continue

        const isNative = bal.address === NATIVE_CURRENCY
        const chainMeta = networksMeta[String(bal.chainId)]
        const usdPrice = isNative ? (chainMeta?.nativeCurrency?.usd?.price ?? null) : null
        const usdValue = usdPrice != null ? amount * usdPrice : null

        const entry: AggregatedBalance = {
          symbol: bal.symbol,
          name: bal.name,
          displayBalance: amount,
          usdValue,
          chainId: bal.chainId,
        }

        // Chain grouping
        if (!chainMap.has(bal.chainId)) {
          const chainName = networks[String(bal.chainId)]?.name ?? `Chain ${bal.chainId}`
          chainMap.set(bal.chainId, { name: chainName, balances: [], totalUsd: 0 })
        }
        const chainEntry = chainMap.get(bal.chainId)!
        chainEntry.balances.push(entry)
        if (usdValue != null) {
          chainEntry.totalUsd += usdValue
        }

        // Account grouping
        acctEntry.balances.push(entry)
        if (usdValue != null) {
          acctEntry.totalUsd += usdValue
        }

        // Global total
        if (usdValue != null) {
          totalUsd += usdValue
        }
      }
    }

    // Sort chains by total USD descending
    const byChain = Array.from(chainMap.entries())
      .sort(([, a], [, b]) => b.totalUsd - a.totalUsd)

    // Sort accounts by total USD descending
    const byAccount = Array.from(accountMap.entries())
      .sort(([, a], [, b]) => b.totalUsd - a.totalUsd)

    return { totalUsd, byChain, byAccount }
  }, [allBalances, accounts, networks, networksMeta])

  const hasBalances = byChain.length > 0 || byAccount.length > 0

  if (!hasBalances) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 text-sm">No balances found</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary card */}
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
        <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Total Portfolio Value</div>
        <div className="text-3xl font-semibold text-gray-100">{formatUsd(totalUsd)}</div>
      </div>

      {/* By Chain */}
      <CollapsibleSection title="By Chain">
        <div className="space-y-3">
          {byChain.map(([chainId, data]) => (
            <ChainGroup key={chainId} data={data} compact={compact} />
          ))}
        </div>
      </CollapsibleSection>

      {/* By Account */}
      <CollapsibleSection title="By Account">
        <div className="space-y-3">
          {byAccount.map(([address, data]) => (
            <AccountGroup key={address} address={address} data={data} compact={compact} />
          ))}
        </div>
      </CollapsibleSection>
    </div>
  )
}

function ChainGroup({ data, compact }: {
  data: { name: string; balances: AggregatedBalance[]; totalUsd: number }
  compact: boolean
}) {
  return (
    <div className="border border-gray-800 rounded-md p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-200">{data.name}</span>
        <span className="text-sm text-gray-400">{formatUsd(data.totalUsd)}</span>
      </div>
      <BalanceTable balances={data.balances} compact={compact} />
    </div>
  )
}

function AccountGroup({ address, data, compact }: {
  address: string
  data: { label: string; balances: AggregatedBalance[]; totalUsd: number }
  compact: boolean
}) {
  const displayAddress = `${address.slice(0, 6)}...${address.slice(-4)}`

  return (
    <div className="border border-gray-800 rounded-md p-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-sm font-medium text-gray-200">{data.label}</span>
          {data.label !== address && (
            <span className="text-xs text-gray-500 ml-2">{displayAddress}</span>
          )}
        </div>
        <span className="text-sm text-gray-400">{formatUsd(data.totalUsd)}</span>
      </div>
      <BalanceTable balances={data.balances} compact={compact} />
    </div>
  )
}

function BalanceTable({ balances, compact }: { balances: AggregatedBalance[]; compact: boolean }) {
  if (compact) {
    return (
      <div className="space-y-2">
        {balances.map((b, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <div>
              <span className="text-gray-300">{b.name}</span>
              <span className="text-gray-500 ml-1">({b.symbol})</span>
            </div>
            <div className="text-right">
              <span className="text-gray-300">{formatBalance(b.displayBalance)}</span>
              <span className="text-gray-500 ml-2">
                {b.usdValue != null ? formatUsd(b.usdValue) : '\u2014'}
              </span>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-gray-500 border-b border-gray-800">
          <th className="text-left pb-1 font-normal">Token</th>
          <th className="text-right pb-1 font-normal">Balance</th>
          <th className="text-right pb-1 font-normal">USD Value</th>
        </tr>
      </thead>
      <tbody>
        {balances.map((b, i) => (
          <tr key={i} className="border-b border-gray-800/50 last:border-0">
            <td className="py-1.5 text-gray-300">
              {b.name} <span className="text-gray-500">({b.symbol})</span>
            </td>
            <td className="py-1.5 text-right text-gray-300">{formatBalance(b.displayBalance)}</td>
            <td className="py-1.5 text-right text-gray-400">
              {b.usdValue != null ? formatUsd(b.usdValue) : '\u2014'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
