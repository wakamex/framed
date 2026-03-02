import { z } from 'zod'

export const TxRecordSchema = z.object({
  hash: z.string(),
  chainId: z.number(),
  from: z.string(),
  to: z.string(),
  value: z.string(),
  data: z.string().optional(),
  decodedName: z.string().optional(),
  status: z.enum(['pending', 'confirmed', 'failed']),
  submittedAt: z.number(),
  confirmedAt: z.number().optional(),
  gasUsed: z.string().optional(),
  blockNumber: z.number().optional()
})

export type TxRecord = z.infer<typeof TxRecordSchema>

export const TxHistorySchema = z.record(z.string(), z.array(TxRecordSchema))

export type TxHistory = z.infer<typeof TxHistorySchema>
