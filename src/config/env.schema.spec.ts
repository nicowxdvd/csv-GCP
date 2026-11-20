import { envSchema } from './env.schema.js';
import { validateEnv } from './env.validation.js';

const devEnv  = { APP_ENV: 'development', PORT: '3000', DATABASE_URL: 'postgresql://app:app@localhost:5432/csv_gcp', REDIS_URL: 'redis://localhost:6379', GCP_PROJECT_ID: 'csv-gcp-dev', GCS_STAGING_BUCKET: 'dev-local-csv-staging', GCS_OUTPUT_BUCKET: 'dev-local-csv-output', STORAGE_EMULATOR_HOST: 'http://localhost:4443', PUBSUB_EMULATOR_HOST: 'localhost:8085', AUTH_MODE: 'dev-secret', AUTH_DEV_SECRET: 'x'.repeat(32), CURSOR_SECRET: 'y'.repeat(32) };
const prodEnv = { NODE_ENV: 'production', APP_ENV: 'production', APP_ROLE: 'worker', PORT: '8080', DATABASE_URL: 'postgresql://csv_app:secret@10.0.0.3:5432/csv_gcp', REDIS_URL: 'rediss://10.0.0.4:6378', GCP_PROJECT_ID: 'csv-gcp-prod', GCS_STAGING_BUCKET: 'prod-acme-csv-staging', GCS_OUTPUT_BUCKET: 'prod-acme-csv-output', AUTH_MODE: 'jwks', AUTH_JWKS_URL: 'https://issuer.example.com/.well-known/jwks.json', AUTH_ISSUER: 'https://issuer.example.com', AUTH_AUDIENCE: 'csv-api', PUBSUB_PUSH_AUDIENCE: 'https://csv-worker-abc.a.run.app', PUBSUB_PUSH_SA_EMAIL: 'sa-pubsub-push@csv-gcp-prod.iam.gserviceaccount.com', CORS_ORIGINS: 'https://app.example.com', CURSOR_SECRET: 'z'.repeat(32) };

const failedPaths = (input: Record<string, unknown>) => envSchema.safeParse(input).error?.issues.map((issue) => issue.path.join('.')) ?? [];

describe('envSchema', () => {

  it('acepta dev válido y aplica defaults', () => {
    const env = envSchema.parse(devEnv);

    expect(env).toMatchObject({ NODE_ENV: 'development', APP_ROLE: 'all', PORT: 3000, UPLOAD_MAX_BYTES: 25 * 1024 * 1024, CORS_ORIGINS: [], PUBSUB_TOPIC_BATCH_UPLOADED: 'csv-batch-uploaded' });

  });

  it('trata strings vacíos como ausentes', () => {
    const env = envSchema.parse({ ...devEnv, STORAGE_EMULATOR_HOST: '', UPLOAD_MAX_BYTES: '' });

    expect(env).not.toHaveProperty('STORAGE_EMULATOR_HOST');
    expect(env.UPLOAD_MAX_BYTES).toBe(25 * 1024 * 1024);

  });

  it('parsea CORS_ORIGINS separado por comas', () => {
    const env = envSchema.parse({ ...devEnv, CORS_ORIGINS: ' http://localhost:4200 , http://localhost:5173' });

    expect(env.CORS_ORIGINS).toEqual(['http://localhost:4200', 'http://localhost:5173']);

  });

  it('falla si falta una variable requerida', () => {
    expect(failedPaths({ ...devEnv, DATABASE_URL: undefined })).toContain('DATABASE_URL');

  });

  it('falla si staging y output son el mismo bucket', () => {
    expect(failedPaths({ ...devEnv, GCS_OUTPUT_BUCKET: devEnv.GCS_STAGING_BUCKET })).toContain('GCS_OUTPUT_BUCKET');

  });

  it('falla si el prefijo del bucket no coincide con APP_ENV', () => {
    expect(failedPaths({ ...devEnv, GCS_STAGING_BUCKET: 'prod-acme-csv-staging' })).toContain('GCS_STAGING_BUCKET');

  });

  it('exige AUTH_DEV_SECRET con AUTH_MODE=dev-secret', () => {
    expect(failedPaths({ ...devEnv, AUTH_DEV_SECRET: undefined })).toContain('AUTH_DEV_SECRET');

  });

  it('exige JWKS, issuer y audience con AUTH_MODE=jwks', () => {
    expect(failedPaths({ ...devEnv, AUTH_MODE: 'jwks' })).toEqual(expect.arrayContaining(['AUTH_JWKS_URL', 'AUTH_ISSUER', 'AUTH_AUDIENCE']));

  });

  it('acepta producción válida', () => {
    expect(failedPaths(prodEnv)).toEqual([]);

  });

  it.each([
    ['STORAGE_EMULATOR_HOST', { STORAGE_EMULATOR_HOST: 'http://localhost:4443' }],
    ['PUBSUB_EMULATOR_HOST',  { PUBSUB_EMULATOR_HOST: 'localhost:8085' }],
    ['APP_ROLE',              { APP_ROLE: 'all' }],
    ['AUTH_MODE',             { AUTH_MODE: 'dev-secret', AUTH_DEV_SECRET: 'x'.repeat(32) }],
    ['REDIS_URL',             { REDIS_URL: 'redis://10.0.0.4:6379' }],
    ['NODE_ENV',              { NODE_ENV: 'development' }],
    ['CORS_ORIGINS',          { CORS_ORIGINS: 'http://app.example.com' }],
    ['PUBSUB_PUSH_AUDIENCE',  { PUBSUB_PUSH_AUDIENCE: undefined }],
  ])('producción rechaza %s', (path, override) => {
    expect(failedPaths({ ...prodEnv, ...override })).toContain(path);

  });

  it('validateEnv lanza error con el nombre de la variable', () => {
    expect(() => validateEnv({ ...devEnv, PORT: 'abc' })).toThrow(/PORT/);

  });

});