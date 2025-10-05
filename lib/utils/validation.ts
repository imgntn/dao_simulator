// Input validation utilities
// Port from utils/validation.py

/**
 * Custom validation error
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate that a value is a positive integer
 */
export function validatePositiveInt(
  value: any,
  fieldName: string = 'value',
  maxValue?: number
): number {
  const intVal = parseInt(value, 10);

  if (isNaN(intVal)) {
    throw new ValidationError(`${fieldName} must be a valid integer`);
  }

  if (intVal <= 0) {
    throw new ValidationError(`${fieldName} must be positive`);
  }

  if (maxValue !== undefined && intVal > maxValue) {
    throw new ValidationError(`${fieldName} must not exceed ${maxValue}`);
  }

  return intVal;
}

/**
 * Validate that a value is a non-negative number
 */
export function validateNonNegativeFloat(
  value: any,
  fieldName: string = 'value'
): number {
  const floatVal = parseFloat(value);

  if (isNaN(floatVal)) {
    throw new ValidationError(`${fieldName} must be a valid number`);
  }

  if (floatVal < 0) {
    throw new ValidationError(`${fieldName} must be non-negative`);
  }

  return floatVal;
}

/**
 * Validate that a value is a safe string
 */
export function validateString(
  value: any,
  fieldName: string = 'value',
  maxLength: number = 1000,
  allowEmpty: boolean = false
): string {
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`);
  }

  if (!allowEmpty && !value.trim()) {
    throw new ValidationError(`${fieldName} cannot be empty`);
  }

  if (value.length > maxLength) {
    throw new ValidationError(
      `${fieldName} must not exceed ${maxLength} characters`
    );
  }

  // Basic XSS prevention - reject strings with script tags
  const scriptRegex = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/i;
  if (scriptRegex.test(value)) {
    throw new ValidationError(`${fieldName} contains unsafe content`);
  }

  return value.trim();
}

/**
 * Validate that a value is a valid JSON object
 */
export function validateJsonDict(
  value: any,
  fieldName: string = 'data',
  requiredKeys?: string[]
): Record<string, any> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ValidationError(`${fieldName} must be an object`);
  }

  if (requiredKeys) {
    const missingKeys = requiredKeys.filter((key) => !(key in value));
    if (missingKeys.length > 0) {
      throw new ValidationError(
        `${fieldName} missing required keys: ${missingKeys.join(', ')}`
      );
    }
  }

  return value;
}

/**
 * Validate that a value is one of the allowed choices
 */
export function validateChoice<T extends string>(
  value: any,
  choices: readonly T[],
  fieldName: string = 'value'
): T {
  if (!choices.includes(value)) {
    throw new ValidationError(
      `${fieldName} must be one of: ${choices.join(', ')}`
    );
  }

  return value as T;
}

/**
 * Sanitize and validate agent ID
 */
export function sanitizeAgentId(agentId: any): number {
  return validatePositiveInt(agentId, 'agent_id', 10000);
}

/**
 * Sanitize and validate proposal ID
 */
export function sanitizeProposalId(proposalId: any): number {
  return validatePositiveInt(proposalId, 'proposal_id', 100000);
}

/**
 * Sanitize and validate simulation steps
 */
export function sanitizeSimulationSteps(steps: any): number {
  return validatePositiveInt(steps, 'steps', 10000);
}

/**
 * Sanitize and validate token amounts
 */
export function sanitizeTokenAmount(amount: any): number {
  const validated = validateNonNegativeFloat(amount, 'token_amount');
  if (validated > 1_000_000_000) {
    throw new ValidationError('token_amount exceeds maximum allowed value');
  }
  return validated;
}

/**
 * Validate percentage value (0-1 or 0-100)
 */
export function validatePercentage(
  value: any,
  fieldName: string = 'percentage',
  asDecimal: boolean = true
): number {
  const floatVal = validateNonNegativeFloat(value, fieldName);
  const maxValue = asDecimal ? 1 : 100;

  if (floatVal > maxValue) {
    throw new ValidationError(
      `${fieldName} must be between 0 and ${maxValue}`
    );
  }

  return floatVal;
}

/**
 * Validate range (min, max)
 */
export function validateRange(
  min: any,
  max: any,
  fieldName: string = 'range'
): [number, number] {
  const minVal = validateNonNegativeFloat(min, `${fieldName}_min`);
  const maxVal = validateNonNegativeFloat(max, `${fieldName}_max`);

  if (minVal > maxVal) {
    throw new ValidationError(`${fieldName} min must be less than max`);
  }

  return [minVal, maxVal];
}

/**
 * Validate array of specific type
 */
export function validateArray<T>(
  value: any,
  fieldName: string = 'array',
  validator?: (item: any, index: number) => T,
  minLength?: number,
  maxLength?: number
): T[] {
  if (!Array.isArray(value)) {
    throw new ValidationError(`${fieldName} must be an array`);
  }

  if (minLength !== undefined && value.length < minLength) {
    throw new ValidationError(
      `${fieldName} must have at least ${minLength} items`
    );
  }

  if (maxLength !== undefined && value.length > maxLength) {
    throw new ValidationError(
      `${fieldName} must have at most ${maxLength} items`
    );
  }

  if (validator) {
    return value.map((item, index) => validator(item, index));
  }

  return value;
}

/**
 * Validate email format (basic)
 */
export function validateEmail(value: any, fieldName: string = 'email'): string {
  const str = validateString(value, fieldName, 255);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(str)) {
    throw new ValidationError(`${fieldName} must be a valid email address`);
  }

  return str;
}

/**
 * Validate URL format
 */
export function validateUrl(value: any, fieldName: string = 'url'): string {
  const str = validateString(value, fieldName, 2000);

  try {
    new URL(str);
  } catch {
    throw new ValidationError(`${fieldName} must be a valid URL`);
  }

  return str;
}

/**
 * Sanitize HTML to prevent XSS
 */
export function sanitizeHtml(value: string): string {
  return value
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate boolean value
 */
export function validateBoolean(
  value: any,
  fieldName: string = 'value'
): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'true' || lower === '1') return true;
    if (lower === 'false' || lower === '0') return false;
  }

  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
  }

  throw new ValidationError(`${fieldName} must be a boolean value`);
}
