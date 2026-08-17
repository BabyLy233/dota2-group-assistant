import { z } from 'zod'

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']).default('info'),
  STRATZ_API_KEY: z.string().optional(),
  STRATZ_PROXY_URL: z.string().url().optional(),
  DATABASE_PATH: z.string().default('./data/dota.db'),
  ASTRBOT_API_URL: z.string().url().default('http://localhost:6185'),
  ASTRBOT_API_KEY: z.string().optional(),
  ASTRBOT_QQ_GROUP_UMO: z.string().default('aiocqhttp_default:GroupMessage:685470084'),
})

export type Env = z.infer<typeof envSchema>

export function loadEnv(): Env {
  return envSchema.parse(process.env)
}
