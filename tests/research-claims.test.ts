import { describe, expect, it } from 'vitest';
import { RESEARCH_CLAIMS } from '../lib/home/research-claims';

describe('public research claim registry', () => {
  it('classifies every legacy brief as exploratory with a next-evidence path', () => {
    expect(RESEARCH_CLAIMS.length).toBeGreaterThan(0);
    expect(RESEARCH_CLAIMS.every(claim => claim.status === 'exploratory')).toBe(true);
    expect(RESEARCH_CLAIMS.every(claim => claim.question.length > 20 && claim.nextEvidence.length > 20)).toBe(true);
    expect(new Set(RESEARCH_CLAIMS.map(claim => claim.id)).size).toBe(RESEARCH_CLAIMS.length);
  });
});
