import log from 'electron-log'

import Pylon, { AssetType } from '@framelabs/pylon-client'

import type { AssetId } from '@framelabs/pylon-client/dist/assetId'
import type { UsdRate } from '../../provider/assets'
import type { NativeCurrency, Rate, Token } from '../../store/state'

import { setNativeCurrencyData, setRates } from '../../store/actions'

interface RateUpdate {
  id: AssetId
  data: {
    usd: number
    usd_24h_change: number
  }
}

export default function rates(pylon: Pylon, state: any) {
  const storeApi = {
    getKnownTokens: (address?: Address) =>
      ((address && (state.main.tokens.known as any)?.[address]) || []) as Token[],
    getCustomTokens: () => (state.main.tokens.custom || []) as Token[],
    setNativeCurrencyData: (chainId: number, currencyData: NativeCurrency) =>
      setNativeCurrencyData('ethereum', chainId, currencyData),
    setNativeCurrencyRate: (chainId: number, rate: Rate) =>
      setNativeCurrencyData('ethereum', chainId, { usd: rate } as any),
    setTokenRates: (rates: Record<Address, UsdRate>) => setRates(rates)
  }

  function handleRatesUpdates(updates: RateUpdate[]) {
    if (updates.length === 0) return

    const nativeCurrencyUpdates = updates.filter((u) => u.id.type === AssetType.NativeCurrency)

    if (nativeCurrencyUpdates.length > 0) {
      log.debug(`got currency rate updates for chains: ${nativeCurrencyUpdates.map((u) => u.id.chainId)}`)

      nativeCurrencyUpdates.forEach((u) => {
        storeApi.setNativeCurrencyRate(u.id.chainId, {
          price: u.data.usd,
          change24hr: u.data.usd_24h_change
        })
      })
    }

    const tokenUpdates = updates.filter((u) => u.id.type === AssetType.Token)

    if (tokenUpdates.length > 0) {
      log.debug(`got token rate updates for addresses: ${tokenUpdates.map((u) => u.id.address)}`)

      const tokenRates = tokenUpdates.reduce((allRates, update) => {
        // address is always defined for tokens
        const address = update.id.address as string

        allRates[address] = {
          usd: {
            price: update.data.usd,
            change24hr: update.data.usd_24h_change
          }
        }

        return allRates
      }, {} as Record<string, UsdRate>)

      storeApi.setTokenRates(tokenRates)
    }
  }

  function updateSubscription(chains: number[], address?: Address) {
    const subscribedCurrencies = chains.map((chainId) => ({ type: AssetType.NativeCurrency, chainId }))
    const knownTokens = storeApi.getKnownTokens(address).filter((token) => chains.includes(token.chainId))
    const customTokens = storeApi
      .getCustomTokens()
      .filter(
        (token) => !knownTokens.some((kt) => kt.address === token.address && kt.chainId === token.chainId)
      )

    const subscribedTokens = [...knownTokens, ...customTokens].map((token) => ({
      type: AssetType.Token,
      chainId: token.chainId,
      address: token.address
    }))

    setAssets([...subscribedCurrencies, ...subscribedTokens])
  }

  function start() {
    log.verbose('starting asset updates')

    pylon.on('rates', handleRatesUpdates)
  }

  function stop() {
    log.verbose('stopping asset updates')

    pylon.off('rates', handleRatesUpdates)

    pylon.rates([])
  }

  function setAssets(assetIds: AssetId[]) {
    log.verbose(
      'subscribing to rates updates for native currencies on chains:',
      assetIds.filter((a) => a.type === AssetType.NativeCurrency).map((a) => a.chainId)
    )
    log.verbose(
      'subscribing to rates updates for tokens:',
      assetIds.filter((a) => a.type === AssetType.Token).map((a) => a.address)
    )

    pylon.rates(assetIds)
  }

  return {
    start,
    stop,
    setAssets,
    updateSubscription
  }
}
