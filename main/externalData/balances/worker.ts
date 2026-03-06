import log from 'electron-log'

log.transports.console.format = '[scanWorker] {h}:{i}:{s}.{ms} {text}'
log.transports.console.level = process.env.LOG_WORKER ? 'debug' : 'info'
log.transports.file.level = ['development', 'test'].includes(process.env.NODE_ENV || 'development')
  ? false
  : 'verbose'

import { supportsChain as chainSupportsScan } from '../../multicall'
import balancesLoader, { BalanceLoader } from './scan'
import TokenLoader from '../inventory/tokens'
import { toTokenId } from '../../../resources/domain/balance'

import type { RpcProvider } from '../../multicall/constants'
import type { Token } from '../../store/state'

interface ExternalDataWorkerMessage {
  command: string
  args: any[]
}

let heartbeat: NodeJS.Timeout
let balances: BalanceLoader

// IPC-proxied provider: RPC requests are relayed through the parent process
// instead of connecting to the app's public API on port 1248
const pending = new Map<string, { resolve: (v: any) => void; reject: (e: Error) => void }>()
let rpcId = 0

const eth: RpcProvider = {
  request(payload) {
    return new Promise((resolve, reject) => {
      const id = String(rpcId++)
      pending.set(id, { resolve, reject })
      sendToMainProcess({ type: 'rpc', id, payload })
    })
  }
}

const tokenLoader = new TokenLoader()

// Initialize immediately — no loopback connection needed
;(async () => {
  await tokenLoader.start()
  balances = balancesLoader(eth)
  sendToMainProcess({ type: 'ready' })
})()

function sendToMainProcess(data: any) {
  if (process.send) {
    return process.send(data)
  } else {
    log.error(`cannot send to main process! connected: ${process.connected}`)
  }
}

async function updateBlacklist(address: Address, chains: number[]) {
  try {
    const blacklistTokens = tokenLoader.getBlacklist(chains)
    sendToMainProcess({ type: 'tokenBlacklist', address, tokens: blacklistTokens })
  } catch (e) {
    log.error('error updating token blacklist', e)
  }
}

async function tokenBalanceScan(address: Address, tokensToOmit: Token[] = [], chains: number[]) {
  try {
    const omitSet = new Set(tokensToOmit.map(toTokenId))
    const eligibleChains = chains.filter(chainSupportsScan)
    const tokenList = tokenLoader.getTokens(eligibleChains)
    const tokens = tokenList.filter((token) => !omitSet.has(toTokenId(token)))

    const tokenBalances = (await balances.getTokenBalances(address, tokens)).filter(
      (balance) => parseInt(balance.balance) > 0
    )

    sendToMainProcess({ type: 'tokenBalances', address, balances: tokenBalances })
  } catch (e) {
    log.error('error scanning for token balances', e)
  }
}

async function fetchTokenBalances(address: Address, tokens: Token[]) {
  try {
    const blacklistSet = new Set(tokenLoader.getBlacklist().map(toTokenId))
    const filteredTokens = tokens.filter((token) => !blacklistSet.has(toTokenId(token)))
    const tokenBalances = await balances.getTokenBalances(address, filteredTokens)

    sendToMainProcess({ type: 'tokenBalances', address, balances: tokenBalances })
  } catch (e) {
    log.error('error fetching token balances', e)
  }
}

async function chainBalanceScan(address: string, chains: number[]) {
  try {
    const chainBalances = await balances.getCurrencyBalances(address, chains)

    sendToMainProcess({ type: 'chainBalances', balances: chainBalances, address })
  } catch (e) {
    log.error('error scanning chain balance', e)
  }
}

function disconnect() {
  process.disconnect()
  process.kill(process.pid, 'SIGHUP')
}

function resetHeartbeat() {
  clearTimeout(heartbeat)

  heartbeat = setTimeout(() => {
    log.warn('no heartbeat received in 60 seconds, worker exiting')
    disconnect()
  }, 60 * 1000)
}

const messageHandler: { [command: string]: (...params: any) => void } = {
  updateChainBalance: chainBalanceScan,
  fetchTokenBalances: fetchTokenBalances,
  heartbeat: resetHeartbeat,
  tokenBalanceScan: (address, tokensToOmit, chains) => {
    updateBlacklist(address, chains)
    tokenBalanceScan(address, tokensToOmit, chains)
  }
}

process.on('message', (message: any) => {
  // Handle RPC responses from the parent process
  if (message.type === 'rpcResult') {
    const p = pending.get(message.id)
    if (p) {
      pending.delete(message.id)
      if (message.error) p.reject(new Error(message.error))
      else p.resolve(message.result)
    }
    return
  }

  // Handle commands from the controller
  log.debug(`received message: ${message.command} [${message.args}]`)

  const args = message.args || []
  messageHandler[message.command]?.(...args)
})
