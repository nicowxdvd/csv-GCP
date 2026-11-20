import { z } from 'zod';

const MB = 1024 * 1024;

const bucketName = z.string().regex(/^[a-z0-9][a-z0-9._-]{1,61}[a-z0-9]$/, 'Nombre de bucket GCS inválido');
const topicName  = z.string().regex(/^[A-Za-z][\w.~+%-]{2,254}$/, 'Nombre de topic Pub/Sub inválido');
const secret     = z.string().min(32, 'Debe tener al menos 32 caracteres');
const httpsUrl   = z.url({ protocol: /^https$/, error: 'Debe ser una URL https://' });
const originList = z.string().default('').transform((raw) => raw.split(',').map((origin) => origin.trim()).filter(Boolean)).pipe(z.array(z.url({ protocol: /^https?$/ })));

const withoutBlanks = (input: unknown) => Object.fromEntries(Object.entries(input as Record<string, unknown>).filter(([, value]) => value !== ''));

const envObject = z.object({
  NODE_ENV:                      z.enum(['development', 'test', 'production']).default('development'),
  APP_ENV:                       z.enum(['development', 'production']),
  APP_ROLE:                      z.enum(['api', 'worker', 'all']).default('all'),
  PORT:                          z.coerce.number().int().min(1).max(65535),
  LOG_LEVEL:                     z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  DATABASE_URL:                  z.url({ protocol: /^postgres(ql)?$/, error: 'Debe ser una URL postgresql://' }),
  REDIS_URL:                     z.url({ protocol: /^rediss?$/, error: 'Debe ser una URL redis:// o rediss://' }),
  GCP_PROJECT_ID:                z.string().regex(/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/, 'ID de proyecto GCP inválido'),
  GCS_STAGING_BUCKET:            bucketName,
  GCS_OUTPUT_BUCKET:             bucketName,
  STORAGE_EMULATOR_HOST:         z.url({ protocol: /^http$/ }).optional(),
  PUBSUB_EMULATOR_HOST:          z.string().regex(/^[\w.-]+:\d{2,5}$/, 'Formato esperado host:puerto').optional(),
  PUBSUB_TOPIC_BATCH_UPLOADED:   topicName.default('csv-batch-uploaded'),
  PUBSUB_TOPIC_BATCH_NORMALIZED: topicName.default('csv-batch-normalized'),
  PUBSUB_TOPIC_BATCH_COMPLETED:  topicName.default('csv-batch-completed'),
  PUBSUB_TOPIC_DEAD_LETTER:      topicName.default('csv-batch-dlq'),
  PUBSUB_PUSH_AUDIENCE:          httpsUrl.optional(),
  PUBSUB_PUSH_SA_EMAIL:          z.email().optional(),
  AUTH_MODE:                     z.enum(['dev-secret', 'jwks']),
  AUTH_DEV_SECRET:               secret.optional(),
  AUTH_JWKS_URL:                 httpsUrl.optional(),
  AUTH_ISSUER:                   z.string().min(1).optional(),
  AUTH_AUDIENCE:                 z.string().min(1).optional(),
  CORS_ORIGINS:                  originList,
  CURSOR_SECRET:                 secret,
  UPLOAD_MAX_BYTES:              z.coerce.number().int().positive().max(30 * MB).default(25 * MB),
  MAX_CSV_ROWS:                  z.coerce.number().int().positive().max(1_000_000).default(100_000),
  MAX_INVALID_ROW_RATIO:         z.coerce.number().min(0).max(1).default(0.2),
  SIGNED_URL_TTL_SECONDS:        z.coerce.number().int().min(60).max(604_800).default(900),
});

export const envSchema = z.preprocess(withoutBlanks, envObject).superRefine((env, ctx) => {
  const fail        = (path: keyof typeof env, message: string) => ctx.addIssue({ code: 'custom', path: [path], message });
  const requireKeys = (keys: (keyof typeof env)[], reason: string) => keys.filter((key) => env[key] === undefined).forEach((key) => fail(key, `Requerida ${reason}`));
  const prefix      = env.APP_ENV === 'production' ? 'prod-' : 'dev-';

  if (env.GCS_STAGING_BUCKET === env.GCS_OUTPUT_BUCKET)
    fail('GCS_OUTPUT_BUCKET', 'Debe ser distinto de GCS_STAGING_BUCKET');
  (['GCS_STAGING_BUCKET', 'GCS_OUTPUT_BUCKET'] as const).filter((key) => !env[key].startsWith(prefix)).forEach((key) => fail(key, `Con APP_ENV=${env.APP_ENV} debe empezar con "${prefix}"`));
  if (env.AUTH_MODE === 'dev-secret')
    requireKeys(['AUTH_DEV_SECRET'], 'con AUTH_MODE=dev-secret');
  if (env.AUTH_MODE === 'jwks')
    requireKeys(['AUTH_JWKS_URL', 'AUTH_ISSUER', 'AUTH_AUDIENCE'], 'con AUTH_MODE=jwks');
  if (env.APP_ENV !== 'production')
    return;
  if (env.NODE_ENV !== 'production')
    fail('NODE_ENV', 'Debe ser production con APP_ENV=production');
  if (env.APP_ROLE === 'all')
    fail('APP_ROLE', 'En producción usar api o worker');
  if (env.AUTH_MODE !== 'jwks')
    fail('AUTH_MODE', 'En producción solo jwks');
  if (!env.REDIS_URL.startsWith('rediss://'))
    fail('REDIS_URL', 'En producción usar rediss:// (TLS)');
  if (env.CORS_ORIGINS.some((origin) => !origin.startsWith('https://')))
    fail('CORS_ORIGINS', 'En producción solo orígenes https://');
  if (env.APP_ROLE === 'worker')
    requireKeys(['PUBSUB_PUSH_AUDIENCE', 'PUBSUB_PUSH_SA_EMAIL'], 'para el worker en producción');
  (['STORAGE_EMULATOR_HOST', 'PUBSUB_EMULATOR_HOST'] as const).filter((key) => env[key]).forEach((key) => fail(key, 'Prohibida en producción'));

});

export type Env = z.infer<typeof envSchema>;
