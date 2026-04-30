export interface EnvValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export interface EnvValidationOptions {
  env?: Record<string, string | undefined>;
  nodeEnv?: string;
  phase?: string;
}

const PLACEHOLDER_VALUES = new Set([
  '',
  'changeme',
  'change-me',
  'your-secret-api-key-here',
  'generate-a-secret-key-here',
  'dev-secret-do-not-use-in-production',
  'admin123',
  'password',
]);

function readEnv(env: Record<string, string | undefined>, key: string): string {
  return (env[key] ?? '').trim();
}

function isPlaceholder(value: string): boolean {
  return PLACEHOLDER_VALUES.has(value.toLowerCase());
}

function requireStrongSecret(
  env: Record<string, string | undefined>,
  key: string,
  minLength: number,
  errors: string[]
): void {
  const value = readEnv(env, key);
  if (!value) {
    errors.push(`${key} is required in production.`);
    return;
  }
  if (isPlaceholder(value)) {
    errors.push(`${key} must not use a placeholder or development value.`);
    return;
  }
  if (value.length < minLength) {
    errors.push(`${key} must be at least ${minLength} characters.`);
  }
}

export function validateRuntimeEnv(options: EnvValidationOptions = {}): EnvValidationResult {
  const env = options.env ?? process.env;
  const nodeEnv = options.nodeEnv ?? env.NODE_ENV;
  const phase = options.phase ?? env.NEXT_PHASE;
  const errors: string[] = [];
  const warnings: string[] = [];

  if (nodeEnv !== 'production' || phase === 'phase-production-build') {
    return { ok: true, errors, warnings };
  }

  requireStrongSecret(env, 'NEXTAUTH_SECRET', 32, errors);
  requireStrongSecret(env, 'API_KEY', 24, errors);
  requireStrongSecret(env, 'ADMIN_PASSWORD', 12, errors);

  const adminUsername = readEnv(env, 'ADMIN_USERNAME');
  if (!adminUsername) {
    errors.push('ADMIN_USERNAME is required in production.');
  } else if (isPlaceholder(adminUsername)) {
    errors.push('ADMIN_USERNAME must not use a placeholder or development value.');
  }

  if (env.USE_REDIS === 'true' && !readEnv(env, 'REDIS_URL')) {
    errors.push('REDIS_URL is required when USE_REDIS=true.');
  }

  if (readEnv(env, 'SMTP_USER') && !readEnv(env, 'SMTP_PASS')) {
    warnings.push('SMTP_PASS is missing; outbound email will fail.');
  }

  if (readEnv(env, 'SMTP_PASS') && !readEnv(env, 'SMTP_USER')) {
    warnings.push('SMTP_USER is missing; outbound email will fail.');
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function assertRuntimeEnv(options: EnvValidationOptions = {}): void {
  const result = validateRuntimeEnv(options);
  if (!result.ok) {
    throw new Error(`Invalid production environment:\n${result.errors.join('\n')}`);
  }
}
