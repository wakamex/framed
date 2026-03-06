import { useMemo } from 'react'
import type { Chain, ChainMetadata, GasSample } from '../../types'
import { useNetworks, useNetworksMeta, useColorway } from '../../store'
import { isNetworkConnected } from '../../../resources/utils/chains'
import { weiToGwei, hexToInt, roundGwei } from '../../../resources/utils'
import { getColor, Colorway } from '../../../resources/colors'

function gweiFromHex(hex?: string): number | null {
  if (!hex) return null
  const val = weiToGwei(hexToInt(hex))
  return val > 0 ? val : null
}

function formatGwei(gwei: number | null): string {
  if (gwei === null) return '—'
  return String(roundGwei(gwei))
}

function formatUsd(usd: number | null | undefined): string {
  if (usd === null || usd === undefined) return '—'
  if (usd < 0.01) return '<$0.01'
  if (usd < 1) return `$${usd.toFixed(3)}`
  return `$${usd.toFixed(2)}`
}

interface GasPoint {
  t: number
  gwei: number
}

interface ChainGasData {
  id: string
  name: string
  symbol: string
  color: string | null
  connected: boolean
  gasPrice: number | null
  baseFee: number | null
  priorityFee: number | null
  history: GasPoint[]
  samples: GasSample[]
}

function resolveChainColor(primaryColor: string | undefined, colorway: string): string | null {
  if (!primaryColor) return null
  if (primaryColor.startsWith('#')) return primaryColor
  try {
    const resolved = getColor(primaryColor as any, colorway as Colorway)
    return resolved?.hex || null
  } catch {
    return null
  }
}

function useChainGasData(): ChainGasData[] {
  const networks = useNetworks()
  const networksMeta = useNetworksMeta()
  const colorway = useColorway()

  return useMemo(() => {
    return Object.entries(networks)
      .filter(([, chain]) => (chain as Chain).on && !chain.isTestnet)
      .map(([id, chain]) => {
        const meta = networksMeta[id] as ChainMetadata | undefined
        const gas = meta?.gas
        const connected = isNetworkConnected(chain as Chain)

        const levels = gas?.price?.levels
        const gasPrice = gweiFromHex(levels?.fast) ?? gweiFromHex(levels?.standard) ?? gweiFromHex(levels?.slow)

        return {
          id,
          name: (chain as Chain).name,
          symbol: meta?.nativeCurrency?.symbol || 'ETH',
          color: resolveChainColor(meta?.primaryColor, colorway),
          connected,
          gasPrice,
          baseFee: gweiFromHex(gas?.price?.fees?.nextBaseFee),
          priorityFee: gweiFromHex(gas?.price?.fees?.maxPriorityFeePerGas),
          history: (gas?.history as GasPoint[]) || [],
          samples: gas?.samples || []
        }
      })
      .sort((a, b) => {
        if (a.connected !== b.connected) return a.connected ? -1 : 1
        return a.name.localeCompare(b.name)
      })
  }, [networks, networksMeta, colorway])
}

export default function GasView() {
  const chains = useChainGasData()
  const connectedChains = chains.filter((c) => c.connected)
  const hasData = connectedChains.some((c) => c.gasPrice !== null)
  const chainsWithHistory = connectedChains.filter((c) => c.history.length > 1)

  return (
    <div className="space-y-6 max-w-4xl">
      <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide">Gas Tracker</h2>

      {connectedChains.length > 0 ? (
        <>
          {/* Combined chart */}
          {chainsWithHistory.length > 0 && (
            <GasChart chains={chainsWithHistory} />
          )}

          {/* Per-chain summary cards */}
          <div className="space-y-3">
            {connectedChains.map((chain) => (
              <ChainGasCard key={chain.id} chain={chain} />
            ))}
          </div>
        </>
      ) : (
        <div className="text-sm text-gray-500 py-8 text-center">
          No connected chains. Enable chains in the Chains view to track gas.
        </div>
      )}

      {hasData && connectedChains.length > 0 && (
        <TxCostTable chains={connectedChains} />
      )}
    </div>
  )
}

function ChainGasCard({ chain }: { chain: ChainGasData }) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: chain.color || undefined }}
          />
          <span className="text-sm font-medium text-gray-200">{chain.name}</span>
        </div>
        {chain.gasPrice !== null ? (
          <div className="flex items-center gap-3">
            {(chain.baseFee !== null || chain.priorityFee !== null) && (
              <div className="flex gap-3 text-xs text-gray-500">
                {chain.baseFee !== null && <span>Base: {formatGwei(chain.baseFee)}g</span>}
                {chain.priorityFee !== null && <span>Priority: {formatGwei(chain.priorityFee)}g</span>}
              </div>
            )}
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-semibold text-gray-100 tabular-nums">{formatGwei(chain.gasPrice)}</span>
              <span className="text-xs text-gray-500">gwei</span>
            </div>
          </div>
        ) : (
          <span className="text-sm text-gray-600">Waiting for data...</span>
        )}
      </div>
    </div>
  )
}

// --- Combined multi-series gas chart ---

const CHART_W = 600
const CHART_H = 140
const PADDING = { top: 12, right: 12, bottom: 28, left: 48 }
const PLOT_W = CHART_W - PADDING.left - PADDING.right
const PLOT_H = CHART_H - PADDING.top - PADDING.bottom

function formatTime(ts: number): string {
  const d = new Date(ts)
  const h = d.getHours()
  const m = d.getMinutes().toString().padStart(2, '0')
  const ampm = h >= 12 ? 'p' : 'a'
  const h12 = h % 12 || 12
  return `${h12}:${m}${ampm}`
}

function niceGweiTicks(min: number, max: number): number[] {
  const range = max - min || 1
  const rawStep = range / 4
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)))
  const steps = [1, 2, 5, 10]
  const step = steps.find((s) => s * mag >= rawStep)! * mag

  const start = Math.floor(min / step) * step
  const ticks: number[] = []
  for (let v = start; v <= max + step * 0.01; v += step) {
    ticks.push(Math.round(v * 1000) / 1000)
  }
  return ticks
}

function GasChart({ chains }: { chains: ChainGasData[] }) {
  const { tMin, tMax, vMin, vMax, timeTicks, gweiTicks } = useMemo(() => {
    let tMin = Infinity, tMax = -Infinity, vMin = Infinity, vMax = -Infinity
    for (const chain of chains) {
      for (const p of chain.history) {
        if (p.t < tMin) tMin = p.t
        if (p.t > tMax) tMax = p.t
        if (p.gwei < vMin) vMin = p.gwei
        if (p.gwei > vMax) vMax = p.gwei
      }
    }

    // Add 5% padding to value range
    const vRange = vMax - vMin || 1
    vMin = Math.max(0, vMin - vRange * 0.05)
    vMax = vMax + vRange * 0.05

    const gweiTicks = niceGweiTicks(vMin, vMax)
    // Expand bounds to include tick edges
    if (gweiTicks.length > 0) {
      vMin = Math.min(vMin, gweiTicks[0])
      vMax = Math.max(vMax, gweiTicks[gweiTicks.length - 1])
    }

    // Time ticks: pick ~4-6 evenly spaced labels
    const tRange = tMax - tMin || 1
    const numTimeTicks = Math.min(6, Math.max(2, Math.ceil(tRange / 60000)))
    const timeTicks: number[] = []
    for (let i = 0; i <= numTimeTicks; i++) {
      timeTicks.push(tMin + (tRange * i) / numTimeTicks)
    }

    return { tMin, tMax, vMin, vMax, timeTicks, gweiTicks }
  }, [chains])

  const toX = (t: number) => PADDING.left + ((t - tMin) / (tMax - tMin || 1)) * PLOT_W
  const toY = (v: number) => PADDING.top + PLOT_H - ((v - vMin) / (vMax - vMin || 1)) * PLOT_H

  return (
    <div className="bg-gray-800/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Gas History</span>
        <div className="flex items-center gap-3 flex-wrap">
          {chains.map((chain) => (
            <div key={chain.id} className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 rounded-full" style={{ backgroundColor: chain.color || '#6b7280' }} />
              <span className="text-xs text-gray-400">{chain.name}</span>
            </div>
          ))}
        </div>
      </div>

      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="w-full" style={{ height: 160 }}>
        {/* Y-axis gridlines and labels */}
        {gweiTicks.map((v) => (
          <g key={`y-${v}`}>
            <line
              x1={PADDING.left} x2={CHART_W - PADDING.right}
              y1={toY(v)} y2={toY(v)}
              stroke="#374151" strokeWidth="0.5"
            />
            <text
              x={PADDING.left - 6} y={toY(v) + 3.5}
              textAnchor="end" fill="#6b7280" fontSize="9"
            >
              {v < 1 ? v.toFixed(2) : v < 10 ? v.toFixed(1) : Math.round(v)}
            </text>
          </g>
        ))}

        {/* X-axis labels */}
        {timeTicks.map((t, i) => (
          <text
            key={`t-${i}`}
            x={toX(t)} y={CHART_H - 4}
            textAnchor="middle" fill="#6b7280" fontSize="9"
          >
            {formatTime(t)}
          </text>
        ))}

        {/* Data series */}
        {chains.map((chain) => {
          if (chain.history.length < 2) return null
          const points = chain.history.map((p) => `${toX(p.t)},${toY(p.gwei)}`).join(' L')
          return (
            <path
              key={chain.id}
              d={`M${points}`}
              fill="none"
              stroke={chain.color || '#6b7280'}
              strokeWidth="1.5"
              strokeLinejoin="round"
              style={{ filter: 'brightness(1.3)' }}
            />
          )
        })}
      </svg>
    </div>
  )
}

function TxCostTable({ chains }: { chains: ChainGasData[] }) {
  const sampleLabels = useMemo(() => {
    const labels = new Set<string>()
    for (const chain of chains) {
      for (const sample of chain.samples) {
        labels.add(sample.label)
      }
    }
    return Array.from(labels)
  }, [chains])

  if (sampleLabels.length === 0) return null

  return (
    <div>
      <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
        Estimated Transaction Costs
      </h3>
      <div className="bg-gray-800/50 rounded-lg overflow-hidden">
        <div
          className="grid gap-2 px-4 py-2.5 border-b border-gray-700/50 text-xs font-medium text-gray-500 uppercase tracking-wide"
          style={{ gridTemplateColumns: `1fr 70px repeat(${sampleLabels.length}, minmax(100px, 1fr))` }}
        >
          <div>Chain</div>
          <div className="text-right">Gwei</div>
          {sampleLabels.map((label) => (
            <div key={label} className="text-right">{label}</div>
          ))}
        </div>

        {chains.map((chain) => (
          <div
            key={chain.id}
            className="grid gap-2 px-4 py-3 border-b border-gray-800/50 last:border-0 hover:bg-gray-800/30 transition-colors"
            style={{ gridTemplateColumns: `1fr 70px repeat(${sampleLabels.length}, minmax(100px, 1fr))` }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: chain.color || undefined }}
              />
              <span className="text-sm text-gray-200 truncate">{chain.name}</span>
            </div>
            <div className="text-right text-sm text-gray-300 tabular-nums">
              {chain.gasPrice !== null ? formatGwei(chain.gasPrice) : '—'}
            </div>
            {sampleLabels.map((label) => {
              const sample = chain.samples.find((s) => s.label === label)
              const cost = sample?.estimates?.low?.cost?.usd ?? sample?.estimates?.high?.cost?.usd

              return (
                <div key={label} className="text-right">
                  {sample ? (
                    <span className="text-sm text-gray-200 tabular-nums">{formatUsd(cost)}</span>
                  ) : (
                    <span className="text-sm text-gray-600">—</span>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
