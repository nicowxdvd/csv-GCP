import { validateEnv } from './env.validation.js';

describe('validateEnv', () => {
  const valid = { PORT: '3000', DATABASE_URL: 'postgresql://app:app@localhost:5432/csv_gcp' };

  it('parses and coerces a valid config', () => {
    expect(validateEnv(valid)).toEqual({ NODE_ENV: 'development', PORT: 3000, DATABASE_URL: valid.DATABASE_URL });

  });

  it('fails listing every missing variable', () => {
    expect(() => validateEnv({})).toThrow(/PORT[\s\S]*DATABASE_URL/);

  });

  it('rejects non-postgres URLs', () => {
    expect(() => validateEnv({ ...valid, DATABASE_URL: 'mysql://localhost/db' })).toThrow(/DATABASE_URL/);

  });

});
