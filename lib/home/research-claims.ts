import { DECISION_BRIEF_SECTIONS } from './content';

export type ResearchClaimStatus = 'exploratory';

export interface ResearchClaim {
  id: string;
  title: string;
  question: string;
  sourcePath: string;
  status: ResearchClaimStatus;
  nextEvidence: string;
}

/**
 * The public claim registry intentionally classifies every legacy brief as
 * exploratory until the frozen confirmatory campaign is complete.
 */
export const RESEARCH_CLAIMS: ResearchClaim[] = DECISION_BRIEF_SECTIONS.map(section => ({
  id: section.id,
  title: section.title,
  question: section.question,
  sourcePath: section.filePath,
  status: 'exploratory',
  nextEvidence: 'Frozen confirmatory campaign with paired seeds, preregistered metrics, and an archived manifest.',
}));
