import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535),
  DATABASE_URL: z.url({
    protocol: /^postgres(ql)?$/,
    error: 'Debe ser una URL postgresql://',
  }),
});

export type Env = z.infer<typeof envSchema>;
