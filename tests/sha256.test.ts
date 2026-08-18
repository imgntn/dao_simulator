import { describe, expect, it } from 'vitest';
import { sha256Hex } from '../lib/utils/sha256';

describe('browser-compatible SHA-256', () => {
  it.each([
    ['', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
    ['abc', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'],
    [
      'The quick brown fox jumps over the lazy dog',
      'd7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592',
    ],
    ['DAO 🏛️', '91a08b62ec6edf990521f0bf93a37535e0b4a2a002db61e4908fb68ae458433a'],
  ])('matches the standard vector for %j', (input, expected) => {
    expect(sha256Hex(input)).toBe(expected);
  });
});
