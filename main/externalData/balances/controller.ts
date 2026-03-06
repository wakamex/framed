import log from 'electron-log'
import { ChildProcess, fork } from 'child_process'
import { EventEmitter } from 'stream'

import { toTokenId } from '../../../resources/domain/balance'
import { resolveWorkerPath } from '../../worker/paths'
import Chains from '../../chains'

import type { CurrencyBalance, TokenBalance } from './scan'
import type { Token } from '../../store/state'

const BOOTSTRAP_TIMEOUT_SECONDS = 20

interface WorkerMessage {
  type: string
}

interface RpcMessage extends WorkerMessage {
  type: 'rpc'
  id: string
  payload: { method: string; params?: any[]; chainId?: string }
}

interface TokenBalanceMessage extends Omit<WorkerMessage, 'type'> {
  type: 'tokenBalances'
  address: Address
  balances: TokenBalance[]
}

interface TokenBlacklistMessage extends Omit<WorkerMessage, 'type'> {
  type: 'tokenBlacklist'
  address: Address
  tokens: Token[]
}

interface ChainBalanceMessage extends Omit<WorkerMessage, 'type'> {
  type: 'chainBalances'
  address: Address
  balances: CurrencyBalance[]
}

export default class BalancesWorkerController extends EventEmitter {
  private readonly worker: ChildProcess

  private bootstrapTimeout?: NodeJS.Timeout
  private heartbeat?: NodeJS.Timeout

  constructor() {
    super()

    const workerArgs = process.env.NODE_ENV === 'development' ? ['--inspect=127.0.0.1:9230'] : []
    const workerPath = resolveWorkerPath(__dirname, 'balances.js')
    this.worker = fork(workerPath, [], { execArgv: workerArgs })

    log.info('created balances worker, pid:', this.worker.pid)

    // restart the worker if no ready event is received within a reasonable time frame
    this.bootstrapTimeout = setTimeout(() => {
      log.warn(
        `Balances worker with pid ${this.worker.pid} did not report as ready after ${BOOTSTRAP_TIMEOUT_SECONDS} seconds, killing worker`
      )
      this.stopWorker()
    }, BOOTSTRAP_TIMEOUT_SECONDS * 1000)

    this.worker.on('message', (message: WorkerMessage) => {
      log.debug(`balances controller received message: ${JSON.stringify(message)}`)

      if (message.type === 'rpc') {
        this.handleRpcRequest(message as RpcMessage)
        return
      }

      if (message.type === 'ready') {
        this.clearBootstrapTimeout()

        log.info(`balances worker ready, pid: ${this.worker.pid}`)

        this.heartbeat = setInterval(() => this.sendHeartbeat(), 1000 * 20)

        this.emit('ready')
      }

      if (message.type === 'chainBalances') {
        const { address, balances } = message as ChainBalanceMessage
        this.emit('chainBalances', address, balances)
      }

      if (message.type === 'tokenBalances') {
        const { address, balances } = message as TokenBalanceMessage
        this.emit('tokenBalances', address, balances)
      }

      if (message.type === 'tokenBlacklist') {
        const { address, tokens } = message as TokenBlacklistMessage
        const tokenSet = new Set(tokens.map(toTokenId))
        this.emit('tokenBlacklist', address, tokenSet)
      }
    })

    this.worker.on('close', (code, signal) => {
      // emitted after exit or error and when all stdio streams are closed
      log.warn(`balances worker exited with code ${code}, signal: ${signal}, pid: ${this.worker.pid}`)
      this.worker.removeAllListeners()

      this.emit('close')
      this.removeAllListeners()
    })

    this.worker.on('disconnect', () => {
      log.warn(`balances worker disconnected`)
      this.stopWorker()
    })

    this.worker.on('error', (err) => {
      log.warn(`balances worker sent error, pid: ${this.worker.pid}`, err)
      this.stopWorker()
    })
  }

  close() {
    log.info(`closing worker controller`)

    this.stopWorker()
  }

  isRunning() {
    return !!this.heartbeat
  }

  updateChainBalances(address: Address, chains: number[]) {
    this.sendCommandToWorker('updateChainBalance', [address, chains])
  }

  updateKnownTokenBalances(address: Address, tokens: Token[]) {
    this.sendCommandToWorker('fetchTokenBalances', [address, tokens])
  }

  scanForTokenBalances(address: Address, tokens: Token[], chains: number[]) {
    this.sendCommandToWorker('tokenBalanceScan', [address, tokens, chains])
  }

  // private
  private handleRpcRequest(message: RpcMessage) {
    const { id, payload } = message
    const chainIdNum = payload.chainId ? parseInt(payload.chainId, 16) : undefined
    const targetChain = chainIdNum ? { type: 'ethereum', id: chainIdNum } : undefined

    try {
      Chains.send(
        { method: payload.method, params: payload.params || [] },
        (response) => {
          try {
            if (!this.isWorkerReachable()) return

            if (response.error) {
              this.worker.send({ type: 'rpcResult', id, error: response.error.message })
            } else {
              this.worker.send({ type: 'rpcResult', id, result: response.result })
            }
          } catch (e) {
            log.error('error sending RPC result to worker', e)
          }
        },
        targetChain
      )
    } catch (e) {
      log.error('error forwarding RPC request from worker', e)
      try {
        if (this.isWorkerReachable()) {
          this.worker.send({ type: 'rpcResult', id, error: 'RPC relay failed' })
        }
      } catch {}
    }
  }

  private stopWorker() {
    if (this.heartbeat) {
      clearInterval(this.heartbeat)
      this.heartbeat = undefined
    }

    this.clearBootstrapTimeout()

    this.worker.kill('SIGTERM')
  }

  private isWorkerReachable() {
    return this.worker.connected && this.worker.channel && this.worker.listenerCount('error') > 0
  }

  // sending messages
  private sendCommandToWorker(command: string, args: unknown[] = []) {
    log.debug(`sending command ${command} to worker`)

    try {
      if (!this.isWorkerReachable()) {
        log.error(`attempted to send command "${command}" to worker but worker cannot be reached!`)
        return
      }

      this.worker.send({ command, args })
    } catch (e) {
      log.error(`unknown error sending command "${command}" to worker`, e)
    }
  }

  private sendHeartbeat() {
    this.sendCommandToWorker('heartbeat')
  }

  private clearBootstrapTimeout() {
    if (this.bootstrapTimeout) {
      clearTimeout(this.bootstrapTimeout)
      this.bootstrapTimeout = undefined
    }
  }
}
