import { z } from 'zod'

export const GasAlertSchema = z.object({
  threshold: z.number().describe('Gas price threshold in gwei'),
  enabled: z.boolean(),
  unit: z.literal('gwei')
})

export const GasAlertsSchema = z.record(z.coerce.string(), GasAlertSchema)

export type GasAlert = z.infer<typeof GasAlertSchema>
export type GasAlerts = z.infer<typeof GasAlertsSchema>
