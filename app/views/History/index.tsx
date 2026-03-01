import { useState } from 'react'
import { useTxHistory, useAccounts, useNetworks } from '../../store'
import { actions } from '../../ipc'
import Modal from '../../components/Modal'
import type { TxRecord } from '../../types'

function truncateHash(hash: string): string {
  if (!hash || hash.length < 12) return hash
  return hash.slice(0, 6) + '...' + hash.slice(-4)
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function StatusBadge({ status }: { status: TxRecord['status'] }) {
  const colors = {
    confirmed: 'bg-green-500/20 text-green-400',
    pending: 'bg-yellow-500/20 text-yellow-400',
    failed: 'bg-red-500/20 text-red-400'
  }

  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colors[status]}`}>
      {status}
    </span>
  )
}

export default function HistoryView() {
  const accounts = useAccounts()
  const accountIds = Object.keys(accounts)
  const [selectedAddress, setSelectedAddress] = useState(accountIds[0] || '')
  const txHistory = useTxHistory(selectedAddress)
  const networks = useNetworks()
  const [confirmClear, setConfirmClear] = useState(false)

  const sorted = [...txHistory].sort((a, b) => b.submittedAt - a.submittedAt)

  const handleClear = () => {
    actions.clearTxHistory(selectedAddress)
    setConfirmClear(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide">Transaction History</h2>
        {sorted.length > 0 && (
          <button
            onClick={() => setConfirmClear(true)}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-1 rounded hover:bg-gray-800"
          >
            Clear
          </button>
        )}
      </div>

      {/* Account selector */}
      {accountIds.length > 1 && (
        <select
          value={selectedAddress}
          onChange={(e) => setSelectedAddress(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:border-gray-600"
        >
          {accountIds.map((id) => (
            <option key={id} value={id}>
              {accounts[id]?.name || truncateHash(id)}
            </option>
          ))}
        </select>
      )}

      {/* Transaction list */}
      {sorted.length === 0 ? (
        <div className="text-center py-12 text-gray-500 text-sm">
          No transactions yet
        </div>
      ) : (
        <div className="space-y-1">
          {sorted.map((tx) => {
            const chain = Object.values(networks).find((n) => n.id === tx.chainId)
            return (
              <div
                key={tx.hash}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-gray-800/50"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-gray-300">{truncateHash(tx.hash)}</span>
                    <StatusBadge status={tx.status} />
                    {tx.decodedName && (
                      <span className="text-xs text-gray-500">{tx.decodedName}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-500">{formatTime(tx.submittedAt)}</span>
                    {chain && <span className="text-xs text-gray-600">{chain.name}</span>}
                  </div>
                </div>
                {chain && (
                  <button
                    onClick={() => actions.openExplorer({ type: 'ethereum', id: tx.chainId }, tx.hash)}
                    className="text-xs text-gray-500 hover:text-gray-300 ml-2 shrink-0"
                  >
                    Explorer
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Confirm clear */}
      <Modal open={confirmClear} onClose={() => setConfirmClear(false)} title="Clear History">
        <p className="text-sm text-gray-300 mb-4">
          Remove all transaction history for this account?
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setConfirmClear(false)} className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200 rounded">Cancel</button>
          <button onClick={handleClear} className="px-3 py-1.5 text-sm bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded">Clear</button>
        </div>
      </Modal>
    </div>
  )
}
