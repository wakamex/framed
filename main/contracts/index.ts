import log from 'electron-log'
import { decodeFunctionData, parseAbi, type Abi, type Hex } from 'viem'
import { fetchSourcifyContract } from './sources/sourcify'
import { fetchEtherscanContract } from './sources/etherscan'

// this list should be in order of descending priority as each source will
// be searched in turn
const fetchSources = [fetchSourcifyContract, fetchEtherscanContract]

type ContractSourceResult = ContractSource | undefined

export interface ContractSource {
  abi: string
  name: string
  source: string
}

export interface DecodedCallData {
  contractAddress: string
  contractName: string
  source: string
  method: string
  args: Array<{
    name: string
    type: string
    value: string
  }>
}

function tryParseAbi(abiData: string): Abi | undefined {
  try {
    return JSON.parse(abiData) as Abi
  } catch (e) {
    log.warn(`could not parse ABI data: ${abiData}`)
  }
}

export function decodeCallData(calldata: string, abi: string) {
  const parsedAbi = tryParseAbi(abi)

  if (parsedAbi) {
    try {
      const { functionName, args } = decodeFunctionData({ abi: parsedAbi, data: calldata as Hex })

      // Find the matching ABI entry to get input names and types
      const abiEntry = parsedAbi.find(
        (entry) => 'name' in entry && entry.name === functionName && entry.type === 'function'
      )

      const inputs = abiEntry && 'inputs' in abiEntry ? abiEntry.inputs || [] : []

      return {
        method: functionName,
        args: inputs.map((input, i) => ({
          name: input.name || `arg${i}`,
          type: input.type || 'unknown',
          value: args ? args[i]?.toString() ?? '' : ''
        }))
      }
    } catch (e) {
      const sighash = calldata.slice(0, 10)
      log.warn('unknown ABI method for signature', sighash)
    }
  }
}

export async function fetchContract(
  contractAddress: Address,
  chainId: number
): Promise<ContractSourceResult> {
  const fetches = fetchSources.map((getContract) => getContract(contractAddress, chainId))

  let contract: ContractSourceResult = undefined
  let i = 0

  while (!contract && i < fetches.length) {
    contract = await fetches[i]
    i += 1
  }

  if (!contract) {
    log.warn(`could not fetch source code for contract ${contractAddress}`)
  }

  return contract
}
