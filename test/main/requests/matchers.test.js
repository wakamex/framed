import { z, ZodError } from 'zod'
import { createRequestMatcher, generateError } from '../../../main/requests/matchers'
import { chainIdMatcher } from '../../../main/requests/methods/caipRequest'

describe('createRequestMatcher', () => {
  const params = z.object({ address: z.string() })

  it('returns a schema that validates a matching request shape', () => {
    const matcher = createRequestMatcher('eth_accounts', params)
    const result = matcher.safeParse({ id: 1, jsonrpc: '2.0', params: { address: '0xabc' } })
    expect(result.success).toBe(true)
  })

  it('rejects non-"2.0" jsonrpc value', () => {
    const matcher = createRequestMatcher('eth_accounts', params)
    const result = matcher.safeParse({ id: 1, jsonrpc: '1.0', params: { address: '0xabc' } })
    expect(result.success).toBe(false)
  })

  it('rejects non-numeric id', () => {
    const matcher = createRequestMatcher('eth_accounts', params)
    const result = matcher.safeParse({ id: 'abc', jsonrpc: '2.0', params: { address: '0xabc' } })
    expect(result.success).toBe(false)
  })

  it('validates custom params shape', () => {
    const customParams = z.object({ value: z.number(), flag: z.boolean() })
    const matcher = createRequestMatcher('custom_method', customParams)
    const result = matcher.safeParse({ id: 42, jsonrpc: '2.0', params: { value: 10, flag: true } })
    expect(result.success).toBe(true)
  })

  it('rejects missing required params fields', () => {
    const matcher = createRequestMatcher('eth_accounts', params)
    const result = matcher.safeParse({ id: 1, jsonrpc: '2.0', params: {} })
    expect(result.success).toBe(false)
  })
})

describe('generateError', () => {
  function makeZodError(issues) {
    return new ZodError(issues)
  }

  it('produces "{field} parameter is required" for Required message', () => {
    const err = makeZodError([{ message: 'Required', path: ['chainId'], code: 'invalid_type' }])
    const result = generateError(err)
    expect(result.message).toBe('chainId parameter is required')
  })

  it('uses last path element for nested Required error', () => {
    const err = makeZodError([
      { message: 'Required', path: ['params', 'nested', 'field'], code: 'invalid_type' }
    ])
    const result = generateError(err)
    expect(result.message).toBe('field parameter is required')
  })

  it('returns non-Required message as-is', () => {
    const err = makeZodError([
      {
        message: 'Chain ID must be CAIP-2 chain representation and start with "eip155"',
        path: ['chainId'],
        code: 'custom'
      }
    ])
    const result = generateError(err)
    expect(result.message).toBe(
      'Chain ID must be CAIP-2 chain representation and start with "eip155"'
    )
  })

  it('handles empty issues array gracefully', () => {
    const err = makeZodError([])
    const result = generateError(err)
    expect(result).toBeInstanceOf(Error)
    expect(result.message).toBe('')
  })

  it('returns an Error instance', () => {
    const err = makeZodError([{ message: 'Some error', path: [], code: 'custom' }])
    const result = generateError(err)
    expect(result).toBeInstanceOf(Error)
  })
})

describe('chainIdMatcher', () => {
  it('transforms "eip155:1" to "0x1"', () => {
    const result = chainIdMatcher.safeParse('eip155:1')
    expect(result.success).toBe(true)
    expect(result.data).toBe('0x1')
  })

  it('transforms "eip155:137" to "0x89"', () => {
    const result = chainIdMatcher.safeParse('eip155:137')
    expect(result.success).toBe(true)
    expect(result.data).toBe('0x89')
  })

  it('rejects non-eip155 prefix', () => {
    const result = chainIdMatcher.safeParse('cosmos:1')
    expect(result.success).toBe(false)
  })

  it('rejects empty string', () => {
    const result = chainIdMatcher.safeParse('')
    expect(result.success).toBe(false)
  })
})
