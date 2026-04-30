import { describe, expect, it } from 'vitest';
import {
  ValidationError,
  validateArray,
  validateBoolean,
  validateChoice,
  validateJsonDict,
  validatePositiveInt,
  validateString,
} from '@/lib/utils/validation';

describe('validation utilities', () => {
  it('parses positive integers from external input', () => {
    expect(validatePositiveInt('42', 'count')).toBe(42);
    expect(validatePositiveInt(7, 'count')).toBe(7);
    expect(() => validatePositiveInt('0', 'count')).toThrow(ValidationError);
    expect(() => validatePositiveInt('101', 'count', 100)).toThrow(
      /must not exceed 100/
    );
  });

  it('validates object payloads and required keys', () => {
    const payload = validateJsonDict({ id: 'sim-1', steps: 3 }, 'payload', [
      'id',
      'steps',
    ]);

    expect(payload.id).toBe('sim-1');
    expect(() => validateJsonDict(null, 'payload')).toThrow(ValidationError);
    expect(() => validateJsonDict(['id'], 'payload')).toThrow(ValidationError);
    expect(() => validateJsonDict({ id: 'sim-1' }, 'payload', ['steps'])).toThrow(
      /missing required keys/
    );
  });

  it('validates string choices without accepting non-string values', () => {
    expect(validateChoice('fast', ['fast', 'safe'] as const, 'mode')).toBe(
      'fast'
    );
    expect(() => validateChoice(1, ['fast', 'safe'] as const, 'mode')).toThrow(
      /must be one of/
    );
  });

  it('validates arrays with item validators', () => {
    expect(
      validateArray(['1', '2'], 'ids', (item) => validatePositiveInt(item), 1, 3)
    ).toEqual([1, 2]);

    expect(() => validateArray([], 'ids', undefined, 1)).toThrow(
      /at least 1/
    );
  });

  it('rejects unsafe strings and accepts boolean-like inputs', () => {
    expect(validateString('  safe  ', 'label')).toBe('safe');
    expect(() => validateString('<script>alert(1)</script>', 'label')).toThrow(
      /unsafe content/
    );
    expect(validateBoolean('true')).toBe(true);
    expect(validateBoolean(0)).toBe(false);
    expect(() => validateBoolean('maybe')).toThrow(ValidationError);
  });
});
