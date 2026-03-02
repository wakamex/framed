import BigNumber from 'bignumber.js'
import log from 'electron-log'
import { addHexPrefix } from '@ethereumjs/util'

jest.mock('../../../../main/store/persist')
jest.mock('../../../../main/store')

import state from '../../../../main/store'
import {
  addNetwork as addNetworkAction,
  removeBalance as removeBalanceAction,
  setBalances as setBalancesAction,
  removeBalances as removeBalancesAction,
  addCustomTokens as addCustomTokensAction,
  removeCustomTokens as removeTokensAction,
  addKnownTokens as addKnownTokensAction,
  removeKnownTokens as removeKnownTokensAction,
  setScanning as setScanningAction,
  initOrigin as initOriginAction,
  clearOrigins as clearOriginsAction,
  removeOrigin as removeOriginAction,
  addOriginRequest as addOriginRequestAction,
  switchOriginChain as switchOriginChainAction,
  removeNetwork as removeNetworkAction,
  updateNetwork as updateNetworkAction,
  activateNetwork as activateNetworkAction,
  setBlockHeight as setBlockHeightAction,
  updateAccount as updateAccountAction,
  navClearReq as clearNavRequestAction,
  navClearSigner as clearNavSignerAction,
  updateTypedDataRequest as updateTypedDataAction,
  syncPath as syncPathAction,
  setPermission as setPermissionAction,
  clearPermissions as clearPermissionsAction,
  toggleAccess as toggleAccessAction,
  trustExtension as trustExtensionAction,
  setGasAlert as setGasAlertAction,
  removeGasAlert as removeGasAlertAction,
  toggleGasAlert as toggleGasAlertAction,
  addContact as addContactAction,
  updateContact as updateContactAction,
  removeContact as removeContactAction,
  addTxRecord as addTxRecordAction,
  updateTxStatus as updateTxStatusAction,
  clearTxHistory as clearTxHistoryAction,
  selectPrimary as selectPrimaryAction,
  selectSecondary as selectSecondaryAction,
  setPrimaryCustom as setPrimaryCustomAction,
  setSecondaryCustom as setSecondaryCustomAction,
  toggleConnection as toggleConnectionAction,
  setPrimary as setPrimaryAction,
  setSecondary as setSecondaryAction,
  setGasFees as setGasFeesAction,
  setGasPrices as setGasPricesAction,
  setGasDefault as setGasDefaultAction,
  setChainColor as setChainColorAction
} from '../../../../main/store/actions'
import { toTokenId } from '../../../../resources/domain/balance'

beforeAll(() => {
  log.transports.console.level = false
})

afterAll(() => {
  log.transports.console.level = 'debug'
})

afterEach(() => {
  state.__clear()
})

const owner = '0xa8be0f701d0f37088600164e71bffc0ad652c251'

const testTokens = {
  zrx: {
    chainId: 1,
    address: '0xe41d2489571d322189246dafa5ebde1f4699f498',
    symbol: 'ZRX',
    decimals: 18
  },
  badger: {
    chainId: 42161,
    address: '0xbfa641051ba0a0ad1b0acf549a89536a0d76472e',
    symbol: 'BADGER',
    decimals: 18
  }
}

describe('#addNetwork', () => {
  const polygonNetwork = {
    id: 137,
    name: 'Polygon',
    type: 'ethereum',
    layer: 'sidechain',
    explorer: 'https://polygonscan.com',
    symbol: 'MATIC'
  }

  beforeEach(() => {
    state.main.networks = { ethereum: {} }
    state.main.networksMeta = { ethereum: {} }
  })

  it('adds a network with the correct id', () => {
    addNetworkAction(polygonNetwork)

    expect(state.main.networks.ethereum['137'].id).toBe(137)
  })

  it('adds a network with the correct id if the id is a number represented as a string', () => {
    addNetworkAction({ ...polygonNetwork, id: '137' })

    expect(state.main.networks.ethereum['137'].id).toBe(137)
  })

  it('adds a network with the correct name', () => {
    addNetworkAction(polygonNetwork)

    expect(state.main.networks.ethereum['137'].name).toBe('Polygon')
  })

  it('adds a network with the correct symbol', () => {
    addNetworkAction(polygonNetwork)

    expect(state.main.networks.ethereum['137'].symbol).toBe('MATIC')
  })

  it('adds a network with the correct explorer', () => {
    addNetworkAction(polygonNetwork)

    expect(state.main.networks.ethereum['137'].explorer).toBe('https://polygonscan.com')
  })

  it('adds a network that is on by default', () => {
    addNetworkAction(polygonNetwork)

    expect(state.main.networks.ethereum['137'].on).toBe(true)
  })

  it('adds a network with the correct primary RPC', () => {
    addNetworkAction({ ...polygonNetwork, primaryRpc: 'https://polygon-rpc.com' })

    expect(state.main.networks.ethereum['137'].primaryRpc).toBeUndefined()
    expect(state.main.networks.ethereum['137'].connection.primary.custom).toBe('https://polygon-rpc.com')
  })

  it('adds a network with the correct secondary RPC', () => {
    addNetworkAction({ ...polygonNetwork, secondaryRpc: 'https://rpc-mainnet.matic.network' })

    expect(state.main.networks.ethereum['137'].secondaryRpc).toBeUndefined()
    expect(state.main.networks.ethereum['137'].connection.secondary.custom).toBe('https://rpc-mainnet.matic.network')
  })

  it('adds a network with the correct default connection presets', () => {
    addNetworkAction(polygonNetwork)

    expect(state.main.networks.ethereum['137'].connection.presets).toEqual({ local: 'direct' })
  })

  it('adds a network with the correct default primary connection settings', () => {
    addNetworkAction(polygonNetwork)

    expect(state.main.networks.ethereum['137'].connection.primary).toEqual({
      on: true,
      current: 'custom',
      status: 'loading',
      connected: false,
      type: '',
      network: '',
      custom: ''
    })
  })

  it('adds a network with the correct default secondary connection settings', () => {
    addNetworkAction(polygonNetwork)

    expect(state.main.networks.ethereum['137'].connection.secondary).toEqual({
      on: false,
      current: 'custom',
      status: 'loading',
      connected: false,
      type: '',
      network: '',
      custom: ''
    })
  })

  it('adds a network with the correct default gas settings', () => {
    addNetworkAction(polygonNetwork)

    expect(state.main.networks.ethereum['137'].gas).toEqual({
      price: {
        selected: 'standard',
        levels: { slow: '', standard: '', fast: '', asap: '', custom: '' }
      }
    })
  })

  it('adds a network with the correct default metadata', () => {
    addNetworkAction(polygonNetwork)

    expect(state.main.networksMeta.ethereum['137']).toEqual({
      blockHeight: 0,
      name: 'Polygon',
      icon: '',
      nativeCurrency: {
        symbol: 'MATIC',
        name: '',
        icon: '',
        decimals: 18
      },
      gas: {
        price: {
          selected: 'standard',
          levels: { slow: '', standard: '', fast: '', asap: '', custom: '' }
        }
      }
    })
  })

  it('does not add the network if id is not a parseable number', () => {
    addNetworkAction({ ...polygonNetwork, id: 'test' })

    expect(Object.keys(state.main.networks.ethereum)).toHaveLength(0)
    expect(Object.keys(state.main.networksMeta.ethereum)).toHaveLength(0)
  })

  it('does not add the network if name is not defined', () => {
    addNetworkAction({ ...polygonNetwork, name: undefined })

    expect(Object.keys(state.main.networks.ethereum)).toHaveLength(0)
    expect(Object.keys(state.main.networksMeta.ethereum)).toHaveLength(0)
  })

  it('does not add the network if explorer is not defined', () => {
    addNetworkAction({ ...polygonNetwork, explorer: undefined })

    expect(Object.keys(state.main.networks.ethereum)).toHaveLength(0)
    expect(Object.keys(state.main.networksMeta.ethereum)).toHaveLength(0)
  })

  it('does not add the network if symbol is not defined', () => {
    addNetworkAction({ ...polygonNetwork, symbol: undefined })

    expect(Object.keys(state.main.networks.ethereum)).toHaveLength(0)
    expect(Object.keys(state.main.networksMeta.ethereum)).toHaveLength(0)
  })

  it('does not add the network if type is not a string', () => {
    addNetworkAction({ ...polygonNetwork, type: 2 })

    expect(Object.keys(state.main.networks.ethereum)).toHaveLength(0)
    expect(Object.keys(state.main.networksMeta.ethereum)).toHaveLength(0)
  })

  it('does not add the network if type is not "ethereum"', () => {
    addNetworkAction({ ...polygonNetwork, type: 'solana' })

    expect(Object.keys(state.main.networks.ethereum)).toHaveLength(0)
    expect(Object.keys(state.main.networksMeta.ethereum)).toHaveLength(0)
  })

  it('does not add the network if the networks already exists', () => {
    state.main.networks.ethereum['137'] = { ...polygonNetwork }

    addNetworkAction({
      id: 137,
      type: 'ethereum',
      name: 'Matic v1',
      explorer: 'https://rpc-mainnet.maticvigil.com',
      symbol: 'MATIC'
    })

    expect(state.main.networks.ethereum['137'].name).toBe('Polygon')
    expect(state.main.networks.ethereum['137'].explorer).toBe('https://polygonscan.com')
  })
})

describe('#setBalances', () => {
  beforeEach(() => {
    state.main.balances[owner] = [
      {
        ...testTokens.badger,
        balance: addHexPrefix(new BigNumber(30.5).toString(16))
      }
    ]
  })

  it('adds a new balance', () => {
    setBalancesAction(owner, [
      {
        ...testTokens.zrx,
        balance: addHexPrefix(new BigNumber(7983.2332).toString(16))
      }
    ])

    expect(state.main.balances[owner]).toEqual([
      {
        ...testTokens.badger,
        balance: addHexPrefix(new BigNumber(30.5).toString(16))
      },
      {
        ...testTokens.zrx,
        balance: addHexPrefix(new BigNumber(7983.2332).toString(16))
      }
    ])
  })

  it('updates an existing balance to a positive amount', () => {
    setBalancesAction(owner, [
      {
        ...testTokens.badger,
        balance: addHexPrefix(new BigNumber(41.9).toString(16))
      }
    ])

    expect(state.main.balances[owner]).toEqual([
      {
        ...testTokens.badger,
        balance: addHexPrefix(new BigNumber(41.9).toString(16))
      }
    ])
  })

  it('updates an existing balance to zero', () => {
    setBalancesAction(owner, [
      {
        ...testTokens.badger,
        balance: '0x0'
      }
    ])

    expect(state.main.balances[owner]).toEqual([
      {
        ...testTokens.badger,
        balance: '0x0'
      }
    ])
  })
})

describe('#removeBalance', () => {
  beforeEach(() => {
    state.main.balances[owner] = [
      {
        ...testTokens.zrx,
        balance: addHexPrefix(BigNumber('798.564').toString(16))
      },
      {
        ...testTokens.badger,
        balance: addHexPrefix(BigNumber('15.543').toString(16))
      }
    ]
    state.main.balances['0xd0e3872f5fa8ecb49f1911f605c0da90689a484e'] = [
      {
        ...testTokens.zrx,
        balance: addHexPrefix(BigNumber('8201.343').toString(16))
      },
      {
        ...testTokens.badger,
        balance: addHexPrefix(BigNumber('101.988').toString(16))
      }
    ]
  })

  it('removes a balance from all accounts', () => {
    removeBalanceAction(1, testTokens.zrx.address)

    expect(state.main.balances[owner]).not.toContainEqual(expect.objectContaining({ address: testTokens.zrx.address }))
    expect(state.main.balances[owner]).toHaveLength(1)
    expect(state.main.balances['0xd0e3872f5fa8ecb49f1911f605c0da90689a484e']).not.toContainEqual(
      expect.objectContaining({ address: testTokens.zrx.address })
    )
    expect(state.main.balances['0xd0e3872f5fa8ecb49f1911f605c0da90689a484e']).toHaveLength(1)
  })
})

describe('#addCustomTokens', () => {
  beforeEach(() => {
    state.main.tokens.custom = []
    state.main.balances = {}
  })

  it('adds a token', () => {
    state.main.tokens.custom = [testTokens.zrx]

    addCustomTokensAction([testTokens.badger])

    expect(state.main.tokens.custom).toStrictEqual([testTokens.zrx, testTokens.badger])
  })

  it('overwrites a token', () => {
    state.main.tokens.custom = [testTokens.zrx, testTokens.badger]

    const updatedBadgerToken = {
      ...testTokens.badger,
      symbol: 'BAD'
    }

    addCustomTokensAction([updatedBadgerToken])

    expect(state.main.tokens.custom).toHaveLength(2)
    expect(state.main.tokens.custom[0]).toEqual(testTokens.zrx)
    expect(state.main.tokens.custom[1].symbol).toBe('BAD')
  })

  it('updates an existing balance for a custom token', () => {
    const account = '0xd0e3872f5fa8ecb49f1911f605c0da90689a484e'

    state.main.balances[account] = [
      {
        address: testTokens.badger.address,
        chainId: testTokens.badger.chainId,
        symbol: 'BDG',
        name: 'Old Badger',
        logoURI: 'http://logo.io'
      }
    ]

    const updatedBadgerToken = {
      ...testTokens.badger,
      symbol: 'BADGER',
      name: 'Badger Token'
    }

    addCustomTokensAction([updatedBadgerToken])

    expect(state.main.balances[account]).toStrictEqual([
      {
        address: testTokens.badger.address,
        chainId: testTokens.badger.chainId,
        symbol: 'BADGER',
        name: 'Badger Token',
        logoURI: 'http://logo.io'
      }
    ])
  })
})

describe('#removeCustomTokens', () => {
  beforeEach(() => {
    state.main.tokens.custom = []
    state.main.tokens.known = {}
  })

  it('removes a token', () => {
    state.main.tokens.custom = [testTokens.zrx, testTokens.badger]

    removeTokensAction([{ ...testTokens.zrx }])

    expect(state.main.tokens.custom).toStrictEqual([testTokens.badger])
  })

  it('does not modify tokens if they cannot be found', () => {
    state.main.tokens.custom = [testTokens.zrx, testTokens.badger]

    const tokenToRemove = {
      chainId: 1,
      address: '0x383518188c0c6d7730d91b2c03a03c837814a899',
      symbol: 'OHM'
    }

    removeTokensAction([tokenToRemove])

    expect(state.main.tokens.custom).toStrictEqual([testTokens.zrx, testTokens.badger])
  })

  it('does not remove a token with the same address but different chain id', () => {
    const tokenToRemove = {
      ...testTokens.badger,
      chainId: 1
    }

    state.main.tokens.custom = [testTokens.zrx, testTokens.badger, tokenToRemove]

    removeTokensAction([tokenToRemove])

    expect(state.main.tokens.custom).toStrictEqual([testTokens.zrx, testTokens.badger])
  })

  it('does not remove a token with the same chain id but different address', () => {
    const tokenToRemove = {
      ...testTokens.zrx,
      address: '0xa7a82dd06901f29ab14af63faf3358ad101724a8'
    }

    state.main.tokens.custom = [testTokens.zrx, testTokens.badger, tokenToRemove]

    removeTokensAction([tokenToRemove])

    expect(state.main.tokens.custom).toStrictEqual([testTokens.zrx, testTokens.badger])
  })

  it('removes the token from the list of known tokens for an address', () => {
    const address = '0xa7a82dd06901f29ab14af63faf3358ad101724a8'

    state.main.tokens.known[address] = [{ ...testTokens.zrx }]

    removeTokensAction([{ ...testTokens.zrx }])

    expect(state.main.tokens.known).toStrictEqual({ [address]: [] })
  })
})

describe('#addKnownTokens', () => {
  const account = '0xfaff9f426e8071e03eebbfefe9e7bf4b37565ab9'

  beforeEach(() => {
    state.main.tokens.known = {}
  })

  it('adds a token', () => {
    state.main.tokens.known[account] = [testTokens.zrx]

    addKnownTokensAction(account, [testTokens.badger])

    expect(state.main.tokens.known[account]).toStrictEqual([testTokens.zrx, testTokens.badger])
  })

  it('overwrites a token', () => {
    state.main.tokens.known[account] = [testTokens.zrx, testTokens.badger]

    const updatedBadgerToken = {
      ...testTokens.badger,
      symbol: 'BAD'
    }

    addKnownTokensAction(account, [updatedBadgerToken])

    expect(state.main.tokens.known[account]).toHaveLength(2)
    expect(state.main.tokens.known[account][0]).toEqual(testTokens.zrx)
    expect(state.main.tokens.known[account][1].symbol).toBe('BAD')
  })
})

describe('#setScanning', () => {
  it('immediately sets the state to scanning', () => {
    setScanningAction(owner, true)

    expect(state.main.scanning[owner]).toBe(true)
  })

  it('sets the state back to not scanning after 1 second', () => {
    setScanningAction(owner, true)
    setScanningAction(owner, false)

    // still true immediately
    expect(state.main.scanning[owner]).toBe(true)

    jest.advanceTimersByTime(1000)

    expect(state.main.scanning[owner]).toBe(false)
  })
})

describe('#initOrigin', () => {
  const creationDate = new Date('2022-05-24')

  beforeEach(() => {
    state.main.origins = {}
    jest.setSystemTime(creationDate)
  })

  it('creates a new origin', () => {
    const origin = { name: 'frame.test', chain: { id: 137, type: 'ethereum' } }

    initOriginAction('91f6971d-ba85-52d7-a27e-6af206eb2433', origin)

    expect(state.main.origins['91f6971d-ba85-52d7-a27e-6af206eb2433']).toEqual({
      name: 'frame.test',
      chain: {
        id: 137,
        type: 'ethereum'
      },
      session: {
        requests: 1,
        startedAt: creationDate.getTime(),
        lastUpdatedAt: creationDate.getTime()
      }
    })
  })
})

describe('#clearOrigins', () => {
  beforeEach(() => {
    state.main.origins = {
      '91f6971d-ba85-52d7-a27e-6af206eb2433': {},
      '8073729a-5e59-53b7-9e69-5d9bcff94087': {},
      'd7acc008-6411-5486-bb2d-0c0cfcddbb92': {}
    }
  })

  it('should clear all existing origins', () => {
    clearOriginsAction()

    expect(state.main.origins).toEqual({})
  })
})

describe('#removeOrigin', () => {
  beforeEach(() => {
    state.main.origins = {
      '91f6971d-ba85-52d7-a27e-6af206eb2433': {},
      '8073729a-5e59-53b7-9e69-5d9bcff94087': {},
      'd7acc008-6411-5486-bb2d-0c0cfcddbb92': {}
    }
  })

  it('should remove the specified origin', () => {
    removeOriginAction('8073729a-5e59-53b7-9e69-5d9bcff94087')

    expect(state.main.origins).toEqual({
      '91f6971d-ba85-52d7-a27e-6af206eb2433': {},
      'd7acc008-6411-5486-bb2d-0c0cfcddbb92': {}
    })
  })
})

describe('#addOriginRequest', () => {
  const creationTime = new Date('2022-05-24').getTime()
  const updateTime = creationTime + 1000 * 60 * 60 * 24 * 2 // 2 days
  const endTime = creationTime + 1000 * 60 * 60 * 24 * 1 // 1 day

  beforeEach(() => {
    jest.setSystemTime(updateTime)

    state.main.origins = {
      activeOrigin: {
        chain: { id: 10, type: 'ethereum' },
        session: {
          requests: 3,
          startedAt: creationTime,
          lastUpdatedAt: creationTime
        }
      },
      staleOrigin: {
        chain: { id: 42161, type: 'ethereum' },
        session: {
          requests: 14,
          startedAt: creationTime,
          endedAt: endTime,
          lastUpdatedAt: endTime
        }
      }
    }
  })

  it('updates the timestamp for an existing session', () => {
    addOriginRequestAction('activeOrigin')

    expect(state.main.origins.activeOrigin.session.startedAt).toBe(creationTime)
    expect(state.main.origins.activeOrigin.session.lastUpdatedAt).toBe(updateTime)
  })

  it('increments the request count for an existing session', () => {
    state.main.origins.activeOrigin.session.requests = 3

    addOriginRequestAction('activeOrigin')

    expect(state.main.origins.activeOrigin.session.requests).toBe(4)
  })

  it('handles a request for a previously ended session', () => {
    addOriginRequestAction('staleOrigin')

    expect(state.main.origins.staleOrigin.session.startedAt).toBe(updateTime)
    expect(state.main.origins.staleOrigin.session.endedAt).toBe(undefined)
    expect(state.main.origins.staleOrigin.session.lastUpdatedAt).toBe(updateTime)
  })

  it('resets the request count when starting a new session', () => {
    addOriginRequestAction('staleOrigin')

    expect(state.main.origins.staleOrigin.session.requests).toBe(1)
  })
})

describe('#switchOriginChain', () => {
  beforeEach(() => {
    state.main.origins = {
      '91f6971d-ba85-52d7-a27e-6af206eb2433': {
        chain: { id: 1, type: 'ethereum' }
      }
    }
  })

  it('should switch the chain for an origin', () => {
    switchOriginChainAction('91f6971d-ba85-52d7-a27e-6af206eb2433', 50, 'ethereum')

    expect(state.main.origins['91f6971d-ba85-52d7-a27e-6af206eb2433'].chain).toStrictEqual({
      id: 50,
      type: 'ethereum'
    })
  })
})

describe('#removeNetwork', () => {
  beforeEach(() => {
    state.main.origins = {
      '91f6971d-ba85-52d7-a27e-6af206eb2433': {
        chain: { id: 1, type: 'ethereum' }
      },
      '8073729a-5e59-53b7-9e69-5d9bcff94087': {
        chain: { id: 4, type: 'ethereum' }
      },
      'd7acc008-6411-5486-bb2d-0c0cfcddbb92': {
        chain: { id: 50, type: 'cosmos' }
      },
      '695112ec-43e2-52a8-8f69-5c36837d6d13': {
        chain: { id: 4, type: 'ethereum' }
      }
    }
    state.main.networks = {
      ethereum: {
        1: {},
        4: {},
        137: {}
      },
      cosmos: {
        50: {}
      }
    }
    state.main.networksMeta = {
      ethereum: {
        1: {},
        4: {},
        137: {}
      },
      cosmos: {
        50: {}
      }
    }
  })

  it('should delete the network and meta', () => {
    removeNetworkAction({ id: 4, type: 'ethereum' })

    expect(state.main.networks.ethereum).toStrictEqual({ 1: {}, 137: {} })
    expect(state.main.networksMeta.ethereum).toStrictEqual({ 1: {}, 137: {} })
  })

  it('should switch the chain for origins using the deleted network to mainnet', () => {
    removeNetworkAction({ id: 4, type: 'ethereum' })

    expect(state.main.origins).toStrictEqual({
      '91f6971d-ba85-52d7-a27e-6af206eb2433': {
        chain: { id: 1, type: 'ethereum' }
      },
      '8073729a-5e59-53b7-9e69-5d9bcff94087': {
        chain: { id: 1, type: 'ethereum' }
      },
      'd7acc008-6411-5486-bb2d-0c0cfcddbb92': {
        chain: { id: 50, type: 'cosmos' }
      },
      '695112ec-43e2-52a8-8f69-5c36837d6d13': {
        chain: { id: 1, type: 'ethereum' }
      }
    })
  })

  describe('when passed the last network of a given type', () => {
    it('should not delete the last network of a given type', () => {
      removeNetworkAction({ id: 50, type: 'cosmos' })

      expect(state.main.networks.cosmos[50]).toStrictEqual({})
      expect(state.main.networksMeta.cosmos[50]).toStrictEqual({})
    })

    it('should not update its origins', () => {
      removeNetworkAction({ id: 50, type: 'cosmos' })

      expect(state.main.origins).toStrictEqual({
        '91f6971d-ba85-52d7-a27e-6af206eb2433': {
          chain: { id: 1, type: 'ethereum' }
        },
        '8073729a-5e59-53b7-9e69-5d9bcff94087': {
          chain: { id: 4, type: 'ethereum' }
        },
        'd7acc008-6411-5486-bb2d-0c0cfcddbb92': {
          chain: { id: 50, type: 'cosmos' }
        },
        '695112ec-43e2-52a8-8f69-5c36837d6d13': {
          chain: { id: 4, type: 'ethereum' }
        }
      })
    })
  })
})

describe('#updateNetwork', () => {
  beforeEach(() => {
    state.main.origins = {
      '91f6971d-ba85-52d7-a27e-6af206eb2433': {
        chain: { id: 1, type: 'ethereum' }
      },
      '8073729a-5e59-53b7-9e69-5d9bcff94087': {
        chain: { id: 4, type: 'ethereum' }
      },
      'd7acc008-6411-5486-bb2d-0c0cfcddbb92': {
        chain: { id: 50, type: 'ethereum' }
      },
      '695112ec-43e2-52a8-8f69-5c36837d6d13': {
        chain: { id: 4, type: 'ethereum' }
      }
    }
    state.main.networks = {
      ethereum: {
        1: {},
        4: {},
        137: {}
      },
      cosmos: {
        50: {}
      }
    }
    state.main.networksMeta = {
      ethereum: {
        1: {},
        4: {},
        137: {}
      },
      cosmos: {
        50: {}
      }
    }
  })

  it('should update the network', () => {
    updateNetworkAction(
      { id: '0x4', type: 'ethereum', name: '', explorer: '', symbol: '' },
      { id: '0x42', type: 'ethereum', name: 'test', explorer: 'explorer.test', symbol: 'TEST' }
    )

    expect(state.main.networks.ethereum).toStrictEqual({
      1: {},
      66: { id: 66, type: 'ethereum', name: 'test', explorer: 'explorer.test', symbol: 'TEST' },
      137: {}
    })
  })

  it('should trim string properties', () => {
    updateNetworkAction(
      { id: '0x4', type: 'ethereum', name: '', explorer: '', symbol: '' },
      { id: '0x42', type: 'ethereum', name: 'test     ', explorer: '   explorer.test    ', symbol: 'TEST  ' }
    )

    expect(state.main.networks.ethereum).toStrictEqual({
      1: {},
      66: { id: 66, type: 'ethereum', name: 'test', explorer: 'explorer.test', symbol: 'TEST' },
      137: {}
    })
  })

  it('should update the chainId for origins using the updated network', () => {
    updateNetworkAction(
      { id: '0x4', type: 'ethereum', name: '', explorer: '', symbol: '' },
      { id: '0x42', type: 'ethereum', name: 'test', explorer: 'explorer.test', symbol: 'TEST' }
    )

    expect(state.main.origins).toStrictEqual({
      '91f6971d-ba85-52d7-a27e-6af206eb2433': {
        chain: expect.objectContaining({ id: 1, type: 'ethereum' })
      },
      '8073729a-5e59-53b7-9e69-5d9bcff94087': {
        chain: expect.objectContaining({ id: 66, type: 'ethereum' })
      },
      'd7acc008-6411-5486-bb2d-0c0cfcddbb92': {
        chain: expect.objectContaining({ id: 50, type: 'ethereum' })
      },
      '695112ec-43e2-52a8-8f69-5c36837d6d13': {
        chain: expect.objectContaining({ id: 66, type: 'ethereum' })
      }
    })
  })

  it('should correctly update the networksMeta', () => {
    const icon = 'http://icon.com'
    const nativeCurrencyIcon = 'http://icon2.com'
    const nativeCurrencyName = 'TEST_NAME'
    const symbol = 'TEST'
    updateNetworkAction(
      { id: '0x4', type: 'ethereum', name: '', explorer: '', symbol: '' },
      {
        id: '0x4',
        type: 'ethereum',
        name: 'test',
        explorer: 'explorer.test',
        symbol,
        nativeCurrencyName,
        nativeCurrencyIcon,
        icon
      }
    )

    expect(state.main.networksMeta.ethereum[4]).toStrictEqual({
      icon,
      nativeCurrency: { symbol, name: nativeCurrencyName, icon: nativeCurrencyIcon },
      symbol
    })
  })
})

describe('#activateNetwork', () => {
  beforeEach(() => {
    state.main.networks = {
      ethereum: {
        137: {
          on: false
        }
      }
    }
    state.main.origins = {
      'frame.test': {
        chain: {
          id: 137
        }
      }
    }
  })

  it('activates the given chain', () => {
    state.main.networks.ethereum[137].on = false

    activateNetworkAction('ethereum', 137, true)

    expect(state.main.networks.ethereum[137].on).toBe(true)
  })

  it('switches the chain for origins from the deactivated chain to mainnet', () => {
    state.main.origins['frame.test'].chain.id = 137

    activateNetworkAction('ethereum', 137, false)

    expect(state.main.origins['frame.test'].chain.id).toBe(1)
  })
})

describe('#setBlockHeight', () => {
  beforeEach(() => {
    state.main.networksMeta = {
      ethereum: {
        1: {
          blockHeight: 0
        },
        4: {
          blockHeight: 0
        },
        137: {
          blockHeight: 0
        }
      }
    }
  })

  it('should update the block height for the expected chain', () => {
    setBlockHeightAction(4, 500)

    expect(state.main.networksMeta.ethereum).toStrictEqual({
      1: { blockHeight: 0 },
      4: { blockHeight: 500 },
      137: { blockHeight: 0 }
    })
  })
})

describe('#updateAccount', () => {
  beforeEach(() => {
    jest.setSystemTime(new Date('2022-11-17T11:01:58.135Z'))

    state.main.accounts = {
      1: {
        id: '1',
        name: 'cool account',
        lastSignerType: 'ledger',
        balances: {}
      }
    }
    state.main.accountsMeta = {
      'e42ee170-4601-5428-bac5-d8d92fe049e8': {
        name: 'cool account',
        lastUpdated: 1568682918135
      }
    }
  })

  it('should update the account', () => {
    updateAccountAction({ id: '1', name: 'cool account', lastSignerType: 'seed', status: 'ok' })

    expect(state.main.accounts).toStrictEqual({
      1: { id: '1', name: 'cool account', lastSignerType: 'seed', status: 'ok', balances: {} }
    })
  })

  it('should not update account balances', () => {
    updateAccountAction({ id: '1', name: 'cool account', lastSignerType: 'seed', status: 'ok', balances: 'ignored' })

    expect(state.main.accounts).toStrictEqual({
      1: { id: '1', name: 'cool account', lastSignerType: 'seed', status: 'ok', balances: {} }
    })
  })

  it('should create a new account', () => {
    updateAccountAction({ id: '2', name: 'new cool account', lastSignerType: 'seed', status: 'ok' })

    expect(state.main.accounts).toStrictEqual({
      1: { id: '1', name: 'cool account', lastSignerType: 'ledger', balances: {} },
      2: { id: '2', name: 'new cool account', lastSignerType: 'seed', status: 'ok', balances: {} }
    })
  })

  it('should update existing accountMeta with the expected data', () => {
    updateAccountAction({ id: '1', name: 'not so cool account', lastSignerType: 'seed', status: 'ok' })

    expect(state.main.accountsMeta).toStrictEqual({
      'e42ee170-4601-5428-bac5-d8d92fe049e8': { name: 'not so cool account', lastUpdated: 1668682918135 }
    })
  })

  it('should create new accountMeta with the expected data', () => {
    updateAccountAction({ id: '2', name: 'not so cool account', lastSignerType: 'seed', status: 'ok' })

    expect(state.main.accountsMeta).toStrictEqual({
      'e42ee170-4601-5428-bac5-d8d92fe049e8': { name: 'cool account', lastUpdated: 1568682918135 },
      '0d6c930e-3495-56cc-993f-8da3a6150003': { name: 'not so cool account', lastUpdated: 1668682918135 }
    })
  })

  it(`should not create a new value for a default label`, () => {
    updateAccountAction({ id: '2', name: 'hot account', lastSignerType: 'seed', status: 'ok' })

    expect(state.main.accountsMeta).toStrictEqual({
      'e42ee170-4601-5428-bac5-d8d92fe049e8': { name: 'cool account', lastUpdated: 1568682918135 }
    })
  })

  it(`should not update an existing value with a default label`, () => {
    updateAccountAction({ id: '1', name: 'hot account', lastSignerType: 'seed', status: 'ok' })

    expect(state.main.accountsMeta).toStrictEqual({
      'e42ee170-4601-5428-bac5-d8d92fe049e8': { name: 'cool account', lastUpdated: 1568682918135 }
    })
  })
})

describe('#removeBalances', () => {
  beforeEach(() => {
    state.main.balances[owner] = Object.values(testTokens).map((token) => ({
      ...token,
      balance: addHexPrefix(new BigNumber(120).toString(16))
    }))
  })

  it('should remove all tokens from the removal set from an accounts balance', () => {
    const removalSet = new Set(Object.values(testTokens).map(toTokenId))
    removeBalancesAction(owner, removalSet)
    expect(state.main.balances[owner].length).toBe(0)
  })

  it('should only remove tokens from the removal set from an accounts balance', () => {
    const removalSet = new Set()
    removalSet.add(toTokenId(testTokens.badger))
    removeBalancesAction(owner, removalSet)
    expect(state.main.balances[owner].length).toBe(1)
  })
})

describe('#removeKnownTokens', () => {
  beforeEach(() => {
    state.main.tokens.known[owner] = Object.values(testTokens)
  })

  it('should remove all tokens from the removal set from an accounts known tokens', () => {
    const removalSet = new Set(Object.values(testTokens).map(toTokenId))
    removeKnownTokensAction(owner, removalSet)
    expect(state.main.tokens.known[owner].length).toBe(0)
  })

  it('should only remove tokens from the removal set from an accounts known tokens', () => {
    const removalSet = new Set([toTokenId(testTokens.badger)])
    removeKnownTokensAction(owner, removalSet)
    expect(state.main.tokens.known[owner].length).toBe(1)
  })
})

describe('#navClearSigner', () => {
  beforeEach(() => {
    state.windows = { dash: { show: false, nav: [], footer: { height: 40 } }, panel: { show: false, nav: [], footer: { height: 40 } } }
  })

  it('should remove a specific signer from the nav', () => {
    state.windows.dash.nav = [
      {
        view: 'expandedSigner',
        data: {
          signer: '1a'
        }
      },
      {
        view: 'expandedSigner',
        data: {
          signer: '2b'
        }
      }
    ]

    const [req1, _req2] = state.windows.dash.nav

    clearNavSignerAction('2b')

    expect(state.windows.dash.nav).toStrictEqual([req1])
  })
})

describe('#navClearReq', () => {
  beforeEach(() => {
    state.windows = { dash: { show: false, nav: [], footer: { height: 40 } }, panel: { show: false, nav: [], footer: { height: 40 } } }
  })

  it('should remove a specific request from the nav', () => {
    state.windows.panel.nav = [
      {
        view: 'requestView',
        data: {
          requestId: '1a'
        }
      },
      {
        view: 'requestView',
        data: {
          requestId: '2b'
        }
      },
      {
        view: 'expandedModule',
        data: {
          id: 'requests'
        }
      }
    ]

    const [req1, , inbox] = state.windows.panel.nav

    clearNavRequestAction('2b')

    expect(state.windows.panel.nav).toStrictEqual([req1, inbox])
  })

  it('should remove the request inbox when not requested', () => {
    state.windows.panel.nav = [
      {
        view: 'requestView',
        data: {
          requestId: '1c'
        }
      },
      {
        view: 'expandedModule',
        data: {
          id: 'requests'
        }
      }
    ]

    clearNavRequestAction('1c', false)

    expect(state.windows.panel.nav).toStrictEqual([])
  })
})

describe('#updateTypedDataRequest', () => {
  const request = '79928538-c971-4cf0-8498-fa4e8017398b'

  beforeEach(() => {
    state.main.accounts[owner] = {
      requests: {
        [request]: {
          handlerId: '79928538-c971-4cf0-8498-fa4e8017398b',
          type: 'signTypedData',
          typedMessage: {
            data: {
              oldAttribute: true
            }
          }
        },
        some_other_id: {
          handlerId: 'wow_such_valid_handerId'
        }
      }
    }
  })

  it('should add a new property to a request ', () => {
    expect(state.main.accounts[owner].requests[request].doesNotExistYet).toBeUndefined()
    updateTypedDataAction(owner, request, {
      doesNotExistYet: true
    })

    expect(state.main.accounts[owner].requests[request].doesNotExistYet).toBeTruthy()
  })

  it('should not change any properties which are not altered in an update', () => {
    updateTypedDataAction(owner, request, {
      doesNotExistYet: true
    })

    expect(state.main.accounts[owner].requests[request].typedMessage.data.oldAttribute).toBeTruthy()
  })
})

// ---- New test blocks ----

describe('#syncPath', () => {
  it('sets a top-level value at the given path', () => {
    syncPathAction('panel.accountFilter', 'testFilter')

    expect(state.panel.accountFilter).toBe('testFilter')
  })

  it('sets a nested value at the given path', () => {
    syncPathAction('selected.view', 'accounts')

    expect(state.selected.view).toBe('accounts')
  })

  it('creates intermediate objects if path does not exist', () => {
    syncPathAction('customKey.nested.deep', 42)

    expect(state.customKey.nested.deep).toBe(42)
  })

  it('does not set paths starting with "main"', () => {
    const before = state.main.launch
    syncPathAction('main.launch', !before)

    expect(state.main.launch).toBe(before)
  })

  it('does not set anything for empty path', () => {
    syncPathAction('', 'value')

    // no error thrown and state unchanged
    expect(state.panel.accountFilter).toBe('')
  })

  it('does not set anything for wildcard path', () => {
    syncPathAction('*', 'value')

    expect(state['*']).toBeUndefined()
  })
})

describe('#setPermission', () => {
  const address = '0xabc123'
  const permission = { handlerId: 'frame.test', provider: true }

  beforeEach(() => {
    state.main.permissions = {}
  })

  it('adds a permission for an address and origin', () => {
    setPermissionAction(address, permission)

    expect(state.main.permissions[address]['frame.test']).toEqual(permission)
  })

  it('creates the address entry if it does not exist', () => {
    setPermissionAction(address, permission)

    expect(state.main.permissions[address]).toBeDefined()
  })

  it('can store multiple permissions for the same address', () => {
    const perm2 = { handlerId: 'other.origin', provider: false }
    setPermissionAction(address, permission)
    setPermissionAction(address, perm2)

    expect(Object.keys(state.main.permissions[address])).toHaveLength(2)
  })
})

describe('#clearPermissions', () => {
  const address = '0xabc123'

  beforeEach(() => {
    state.main.permissions = {
      [address]: {
        'frame.test': { handlerId: 'frame.test', provider: true },
        'other.origin': { handlerId: 'other.origin', provider: false }
      }
    }
  })

  it('removes all permissions for the address', () => {
    clearPermissionsAction(address)

    expect(state.main.permissions[address]).toEqual({})
  })

  it('does not affect permissions for other addresses', () => {
    const other = '0xdef456'
    state.main.permissions[other] = { 'frame.test': { handlerId: 'frame.test', provider: true } }

    clearPermissionsAction(address)

    expect(state.main.permissions[other]).toBeDefined()
    expect(Object.keys(state.main.permissions[other])).toHaveLength(1)
  })
})

describe('#toggleAccess', () => {
  const address = '0xabc123'
  const handlerId = 'frame.test'

  beforeEach(() => {
    state.main.permissions = {
      [address]: {
        [handlerId]: { handlerId, provider: true }
      }
    }
  })

  it('flips provider from true to false', () => {
    toggleAccessAction(address, handlerId)

    expect(state.main.permissions[address][handlerId].provider).toBe(false)
  })

  it('flips provider from false to true', () => {
    state.main.permissions[address][handlerId].provider = false
    toggleAccessAction(address, handlerId)

    expect(state.main.permissions[address][handlerId].provider).toBe(true)
  })

  it('does nothing if address has no permissions', () => {
    toggleAccessAction('0xnonexistent', handlerId)

    // should not throw
    expect(state.main.permissions['0xnonexistent']).toBeUndefined()
  })

  it('does nothing if handlerId does not exist', () => {
    toggleAccessAction(address, 'nonexistent.origin')

    // original entry unchanged
    expect(state.main.permissions[address][handlerId].provider).toBe(true)
  })
})

describe('#trustExtension', () => {
  beforeEach(() => {
    state.main.knownExtensions = {}
  })

  it('marks an extension as trusted', () => {
    trustExtensionAction('ext-id-1', true)

    expect(state.main.knownExtensions['ext-id-1']).toBe(true)
  })

  it('marks an extension as untrusted', () => {
    trustExtensionAction('ext-id-1', false)

    expect(state.main.knownExtensions['ext-id-1']).toBe(false)
  })

  it('can update trust status', () => {
    trustExtensionAction('ext-id-1', true)
    trustExtensionAction('ext-id-1', false)

    expect(state.main.knownExtensions['ext-id-1']).toBe(false)
  })
})

describe('#setGasAlert', () => {
  beforeEach(() => {
    state.main.gasAlerts = {}
  })

  it('creates a gas alert with threshold and enabled flag', () => {
    setGasAlertAction('1', 50, true)

    expect(state.main.gasAlerts['1']).toEqual({ threshold: 50, enabled: true, unit: 'gwei' })
  })

  it('creates a disabled gas alert', () => {
    setGasAlertAction('1', 100, false)

    expect(state.main.gasAlerts['1']).toEqual({ threshold: 100, enabled: false, unit: 'gwei' })
  })

  it('overwrites an existing alert', () => {
    setGasAlertAction('1', 50, true)
    setGasAlertAction('1', 75, false)

    expect(state.main.gasAlerts['1']).toEqual({ threshold: 75, enabled: false, unit: 'gwei' })
  })
})

describe('#toggleGasAlert', () => {
  beforeEach(() => {
    state.main.gasAlerts = {
      '1': { threshold: 50, enabled: true, unit: 'gwei' }
    }
  })

  it('flips enabled from true to false', () => {
    toggleGasAlertAction('1')

    expect(state.main.gasAlerts['1'].enabled).toBe(false)
  })

  it('flips enabled from false to true', () => {
    state.main.gasAlerts['1'].enabled = false
    toggleGasAlertAction('1')

    expect(state.main.gasAlerts['1'].enabled).toBe(true)
  })

  it('does not change threshold when toggling', () => {
    toggleGasAlertAction('1')

    expect(state.main.gasAlerts['1'].threshold).toBe(50)
  })

  it('does nothing if the alert does not exist', () => {
    toggleGasAlertAction('999')

    expect(state.main.gasAlerts['999']).toBeUndefined()
  })
})

describe('#removeGasAlert', () => {
  beforeEach(() => {
    state.main.gasAlerts = {
      '1': { threshold: 50, enabled: true, unit: 'gwei' },
      '137': { threshold: 30, enabled: false, unit: 'gwei' }
    }
  })

  it('deletes the alert for the given chain', () => {
    removeGasAlertAction('1')

    expect(state.main.gasAlerts['1']).toBeUndefined()
  })

  it('does not affect alerts for other chains', () => {
    removeGasAlertAction('1')

    expect(state.main.gasAlerts['137']).toBeDefined()
  })
})

describe('#addContact', () => {
  beforeEach(() => {
    state.main.addressBook = {}
    jest.setSystemTime(new Date('2024-01-01'))
  })

  it('adds an entry with address and name', () => {
    addContactAction({ address: '0xabc', name: 'Alice' })

    const entries = Object.values(state.main.addressBook)
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ address: '0xabc', name: 'Alice', notes: '' })
  })

  it('adds an entry with notes', () => {
    addContactAction({ address: '0xabc', name: 'Alice', notes: 'My friend' })

    const entries = Object.values(state.main.addressBook)
    expect(entries[0].notes).toBe('My friend')
  })

  it('uses empty string for notes when not provided', () => {
    addContactAction({ address: '0xabc', name: 'Alice' })

    const entries = Object.values(state.main.addressBook)
    expect(entries[0].notes).toBe('')
  })

  it('assigns a unique id to each contact', () => {
    addContactAction({ address: '0xabc', name: 'Alice' })
    addContactAction({ address: '0xdef', name: 'Bob' })

    const ids = Object.keys(state.main.addressBook)
    expect(ids).toHaveLength(2)
    expect(ids[0]).not.toBe(ids[1])
  })

  it('records createdAt timestamp', () => {
    addContactAction({ address: '0xabc', name: 'Alice' })

    const entries = Object.values(state.main.addressBook)
    expect(entries[0].createdAt).toBe(new Date('2024-01-01').getTime())
  })
})

describe('#updateContact', () => {
  const contactId = 'test-contact-id'

  beforeEach(() => {
    state.main.addressBook = {
      [contactId]: { address: '0xabc', name: 'Alice', notes: 'original note', createdAt: 1000 }
    }
  })

  it('updates the name of an existing contact', () => {
    updateContactAction(contactId, { name: 'Alicia' })

    expect(state.main.addressBook[contactId].name).toBe('Alicia')
  })

  it('updates the address of an existing contact', () => {
    updateContactAction(contactId, { address: '0xnew' })

    expect(state.main.addressBook[contactId].address).toBe('0xnew')
  })

  it('updates the notes of an existing contact', () => {
    updateContactAction(contactId, { notes: 'new note' })

    expect(state.main.addressBook[contactId].notes).toBe('new note')
  })

  it('only updates specified fields', () => {
    updateContactAction(contactId, { name: 'Alicia' })

    expect(state.main.addressBook[contactId].address).toBe('0xabc')
    expect(state.main.addressBook[contactId].notes).toBe('original note')
  })

  it('does nothing if contact does not exist', () => {
    updateContactAction('nonexistent-id', { name: 'Ghost' })

    expect(state.main.addressBook['nonexistent-id']).toBeUndefined()
  })
})

describe('#removeContact', () => {
  const contactId = 'test-contact-id'

  beforeEach(() => {
    state.main.addressBook = {
      [contactId]: { address: '0xabc', name: 'Alice', notes: '', createdAt: 1000 },
      'other-id': { address: '0xdef', name: 'Bob', notes: '', createdAt: 2000 }
    }
  })

  it('deletes the contact by id', () => {
    removeContactAction(contactId)

    expect(state.main.addressBook[contactId]).toBeUndefined()
  })

  it('does not affect other contacts', () => {
    removeContactAction(contactId)

    expect(state.main.addressBook['other-id']).toBeDefined()
  })
})

describe('#addTxRecord', () => {
  const address = '0xUserAddress'

  beforeEach(() => {
    state.main.txHistory = {}
  })

  it('adds a transaction record to history', () => {
    const record = { hash: '0xhash1', status: 'pending' }
    addTxRecordAction(address, record)

    expect(state.main.txHistory[address.toLowerCase()]).toHaveLength(1)
    expect(state.main.txHistory[address.toLowerCase()][0]).toEqual(record)
  })

  it('prepends new records (most recent first)', () => {
    const record1 = { hash: '0xhash1', status: 'confirmed' }
    const record2 = { hash: '0xhash2', status: 'pending' }
    addTxRecordAction(address, record1)
    addTxRecordAction(address, record2)

    expect(state.main.txHistory[address.toLowerCase()][0]).toEqual(record2)
    expect(state.main.txHistory[address.toLowerCase()][1]).toEqual(record1)
  })

  it('normalizes address to lowercase', () => {
    const record = { hash: '0xhash1', status: 'pending' }
    addTxRecordAction('0xUSERADDRESS', record)

    expect(state.main.txHistory['0xuseraddress']).toHaveLength(1)
  })

  it('creates the history array if it does not exist', () => {
    const record = { hash: '0xhash1', status: 'pending' }
    addTxRecordAction('0xnew', record)

    expect(state.main.txHistory['0xnew']).toEqual([record])
  })
})

describe('#updateTxStatus', () => {
  const address = '0xUserAddress'
  const hash = '0xhash1'

  beforeEach(() => {
    state.main.txHistory = {
      [address.toLowerCase()]: [
        { hash, status: 'pending' },
        { hash: '0xhash2', status: 'pending' }
      ]
    }
  })

  it('updates the status of a matching transaction', () => {
    updateTxStatusAction(address, hash, 'confirmed')

    expect(state.main.txHistory[address.toLowerCase()][0].status).toBe('confirmed')
  })

  it('does not change other transactions', () => {
    updateTxStatusAction(address, hash, 'confirmed')

    expect(state.main.txHistory[address.toLowerCase()][1].status).toBe('pending')
  })

  it('sets receipt fields when receipt is provided', () => {
    const receipt = { gasUsed: '21000', blockNumber: 500 }
    updateTxStatusAction(address, hash, 'confirmed', receipt)

    const record = state.main.txHistory[address.toLowerCase()][0]
    expect(record.gasUsed).toBe('21000')
    expect(record.blockNumber).toBe(500)
    expect(record.confirmedAt).toBeDefined()
  })

  it('does nothing if address has no history', () => {
    updateTxStatusAction('0xunknown', hash, 'confirmed')

    // should not throw
    expect(state.main.txHistory['0xunknown']).toBeUndefined()
  })

  it('does nothing if hash is not found', () => {
    updateTxStatusAction(address, '0xnotfound', 'confirmed')

    expect(state.main.txHistory[address.toLowerCase()][0].status).toBe('pending')
  })
})

describe('#clearTxHistory', () => {
  const address = '0xUserAddress'

  beforeEach(() => {
    state.main.txHistory = {
      [address.toLowerCase()]: [
        { hash: '0xhash1', status: 'confirmed' },
        { hash: '0xhash2', status: 'pending' }
      ]
    }
  })

  it('empties the history for the given address', () => {
    clearTxHistoryAction(address)

    expect(state.main.txHistory[address.toLowerCase()]).toEqual([])
  })

  it('normalizes address to lowercase', () => {
    clearTxHistoryAction('0xUSERADDRESS')

    expect(state.main.txHistory['0xuseraddress']).toEqual([])
  })
})

describe('#selectPrimary', () => {
  beforeEach(() => {
    state.main.networks = {
      ethereum: {
        1: {
          connection: {
            primary: { on: true, current: 'infura', status: 'connected', connected: true, type: '', network: '', custom: '' },
            secondary: { on: false, current: 'custom', status: 'loading', connected: false, type: '', network: '', custom: '' }
          }
        }
      }
    }
  })

  it('updates the primary connection preset', () => {
    selectPrimaryAction('ethereum', '1', 'alchemy')

    expect(state.main.networks.ethereum[1].connection.primary.current).toBe('alchemy')
  })
})

describe('#selectSecondary', () => {
  beforeEach(() => {
    state.main.networks = {
      ethereum: {
        1: {
          connection: {
            primary: { on: true, current: 'infura', status: 'connected', connected: true, type: '', network: '', custom: '' },
            secondary: { on: false, current: 'custom', status: 'loading', connected: false, type: '', network: '', custom: '' }
          }
        }
      }
    }
  })

  it('updates the secondary connection preset', () => {
    selectSecondaryAction('ethereum', '1', 'alchemy')

    expect(state.main.networks.ethereum[1].connection.secondary.current).toBe('alchemy')
  })
})

describe('#setPrimaryCustom', () => {
  beforeEach(() => {
    state.main.networks = {
      ethereum: {
        1: {
          connection: {
            primary: { on: true, current: 'custom', status: 'loading', connected: false, type: '', network: '', custom: '' },
            secondary: { on: false, current: 'custom', status: 'loading', connected: false, type: '', network: '', custom: '' }
          }
        }
      }
    }
  })

  it('sets the custom primary RPC URL', () => {
    setPrimaryCustomAction('ethereum', '1', 'https://my-node.com')

    expect(state.main.networks.ethereum[1].connection.primary.custom).toBe('https://my-node.com')
  })

  it('does nothing if netType is falsy', () => {
    setPrimaryCustomAction('', '1', 'https://my-node.com')

    expect(state.main.networks.ethereum[1].connection.primary.custom).toBe('')
  })

  it('does nothing if netId is falsy', () => {
    setPrimaryCustomAction('ethereum', '', 'https://my-node.com')

    expect(state.main.networks.ethereum[1].connection.primary.custom).toBe('')
  })
})

describe('#setSecondaryCustom', () => {
  beforeEach(() => {
    state.main.networks = {
      ethereum: {
        1: {
          connection: {
            primary: { on: true, current: 'custom', status: 'loading', connected: false, type: '', network: '', custom: '' },
            secondary: { on: false, current: 'custom', status: 'loading', connected: false, type: '', network: '', custom: '' }
          }
        }
      }
    }
  })

  it('sets the custom secondary RPC URL', () => {
    setSecondaryCustomAction('ethereum', '1', 'https://backup-node.com')

    expect(state.main.networks.ethereum[1].connection.secondary.custom).toBe('https://backup-node.com')
  })
})

describe('#toggleConnection', () => {
  beforeEach(() => {
    state.main.networks = {
      ethereum: {
        1: {
          connection: {
            primary: { on: true, current: 'custom', status: 'connected', connected: true, type: '', network: '', custom: '' },
            secondary: { on: false, current: 'custom', status: 'loading', connected: false, type: '', network: '', custom: '' }
          }
        }
      }
    }
  })

  it('toggles connection off when currently on', () => {
    toggleConnectionAction('ethereum', '1', 'primary')

    expect(state.main.networks.ethereum[1].connection.primary.on).toBe(false)
  })

  it('toggles connection on when currently off', () => {
    toggleConnectionAction('ethereum', '1', 'secondary')

    expect(state.main.networks.ethereum[1].connection.secondary.on).toBe(true)
  })

  it('forces connection on when explicit value is true', () => {
    toggleConnectionAction('ethereum', '1', 'primary', true)

    expect(state.main.networks.ethereum[1].connection.primary.on).toBe(true)
  })

  it('forces connection off when explicit value is false', () => {
    toggleConnectionAction('ethereum', '1', 'primary', false)

    expect(state.main.networks.ethereum[1].connection.primary.on).toBe(false)
  })
})

describe('#setPrimary', () => {
  beforeEach(() => {
    state.main.networks = {
      ethereum: {
        1: {
          connection: {
            primary: { on: true, current: 'custom', status: 'loading', connected: false, type: '', network: '', custom: '' },
            secondary: { on: false, current: 'custom', status: 'loading', connected: false, type: '', network: '', custom: '' }
          }
        }
      }
    }
  })

  it('merges status fields into primary connection', () => {
    setPrimaryAction('ethereum', '1', { status: 'connected', connected: true })

    const primary = state.main.networks.ethereum[1].connection.primary
    expect(primary.status).toBe('connected')
    expect(primary.connected).toBe(true)
    expect(primary.on).toBe(true)
  })
})

describe('#setSecondary', () => {
  beforeEach(() => {
    state.main.networks = {
      ethereum: {
        1: {
          connection: {
            primary: { on: true, current: 'custom', status: 'loading', connected: false, type: '', network: '', custom: '' },
            secondary: { on: false, current: 'custom', status: 'loading', connected: false, type: '', network: '', custom: '' }
          }
        }
      }
    }
  })

  it('merges status fields into secondary connection', () => {
    setSecondaryAction('ethereum', '1', { status: 'connected', connected: true })

    const secondary = state.main.networks.ethereum[1].connection.secondary
    expect(secondary.status).toBe('connected')
    expect(secondary.connected).toBe(true)
  })
})

describe('#setGasFees', () => {
  beforeEach(() => {
    state.main.networksMeta = {
      ethereum: {
        1: {
          gas: {
            price: {
              selected: 'standard',
              levels: { slow: '', standard: '', fast: '', asap: '', custom: '' }
            }
          }
        }
      }
    }
  })

  it('sets EIP-1559 fee data', () => {
    const fees = { maxFeePerGas: '0x1234', maxPriorityFeePerGas: '0x100', baseFeePerGas: '0x500' }
    setGasFeesAction('ethereum', '1', fees)

    expect(state.main.networksMeta.ethereum[1].gas.price.fees).toEqual(fees)
  })
})

describe('#setGasPrices', () => {
  beforeEach(() => {
    state.main.networksMeta = {
      ethereum: {
        1: {
          gas: {
            price: {
              selected: 'standard',
              levels: { slow: '', standard: '', fast: '', asap: '', custom: '' }
            }
          }
        }
      }
    }
  })

  it('sets legacy gas price levels', () => {
    const prices = { slow: '0x1', standard: '0x2', fast: '0x3', asap: '0x4', custom: '' }
    setGasPricesAction('ethereum', '1', prices)

    expect(state.main.networksMeta.ethereum[1].gas.price.levels).toEqual(prices)
  })
})

describe('#setGasDefault', () => {
  beforeEach(() => {
    state.main.networksMeta = {
      ethereum: {
        1: {
          gas: {
            price: {
              selected: 'standard',
              levels: { slow: '', standard: '', fast: '', asap: '', custom: '' }
            }
          }
        }
      }
    }
  })

  it('sets the default gas level', () => {
    setGasDefaultAction('ethereum', '1', 'fast')

    expect(state.main.networksMeta.ethereum[1].gas.price.selected).toBe('fast')
  })

  it('records lastLevel for non-custom level', () => {
    setGasDefaultAction('ethereum', '1', 'fast')

    expect(state.main.networksMeta.ethereum[1].gas.price.lastLevel).toBe('fast')
  })

  it('sets the custom price when level is custom', () => {
    setGasDefaultAction('ethereum', '1', 'custom', '0x9999')

    expect(state.main.networksMeta.ethereum[1].gas.price.levels.custom).toBe('0x9999')
  })

  it('does not set lastLevel when level is custom', () => {
    setGasDefaultAction('ethereum', '1', 'custom', '0x9999')

    expect(state.main.networksMeta.ethereum[1].gas.price.lastLevel).toBeUndefined()
  })
})

describe('#setChainColor', () => {
  beforeEach(() => {
    state.main.networksMeta = {
      ethereum: {
        1: { blockHeight: 0, primaryColor: 'accent1' }
      }
    }
  })

  it('sets the chain display color', () => {
    setChainColorAction(1, 'accent2')

    expect(state.main.networksMeta.ethereum[1].primaryColor).toBe('accent2')
  })
})
