import log from 'electron-log'
import Chains from '../chains'
import { updateTxStatus } from '../store/actions'

interface PendingTx {
  hash: string
  chainId: number
  from: string
  polls: number
}

const POLL_INTERVAL = 15_000
const MAX_POLLS = 100

class TxTracker {
  private pending: PendingTx[] = []
  private timer: ReturnType<typeof setInterval> | null = null

  start() {
    if (this.timer) return
    this.timer = setInterval(() => this.poll(), POLL_INTERVAL)
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  track(hash: string, chainId: number, from: string) {
    this.pending.push({ hash, chainId, from, polls: 0 })
    this.start()
  }

  private poll() {
    const batch = [...this.pending]
    if (batch.length === 0) {
      this.stop()
      return
    }

    for (const tx of batch) {
      tx.polls++

      Chains.send(
        { method: 'eth_getTransactionReceipt', params: [tx.hash], jsonrpc: '2.0', id: 1 },
        (response: any) => {
          if (response.error) {
            log.warn(`TxTracker: error polling receipt for ${tx.hash}`, response.error)
            return
          }

          const receipt = response.result
          if (receipt) {
            const status: 'confirmed' | 'failed' = parseInt(receipt.status, 16) === 1 ? 'confirmed' : 'failed'
            const gasUsed = receipt.gasUsed || '0x0'
            const blockNumber = parseInt(receipt.blockNumber, 16) || 0

            updateTxStatus(tx.from, tx.hash, status, { gasUsed, blockNumber })
            this.removePending(tx.hash)
          } else if (tx.polls >= MAX_POLLS) {
            log.warn(`TxTracker: giving up on ${tx.hash} after ${MAX_POLLS} polls`)
            updateTxStatus(tx.from, tx.hash, 'failed')
            this.removePending(tx.hash)
          }
        },
        { type: 'ethereum', id: tx.chainId }
      )
    }
  }

  private removePending(hash: string) {
    this.pending = this.pending.filter((tx) => tx.hash !== hash)
    if (this.pending.length === 0) this.stop()
  }
}

export default new TxTracker()
