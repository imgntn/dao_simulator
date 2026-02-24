// LLM module barrel exports

export {
  OllamaClient,
  type OllamaGenerateRequest,
  type OllamaGenerateResponse,
  type OllamaModelInfo,
  type OllamaClientConfig,
} from './ollama-client';

export {
  buildVotingPrompt,
  buildForumPostPrompt,
  buildProposalPrompt,
  parseVoteResponse,
  parseForumPostResponse,
  parseProposalResponse,
  type PromptContext,
  type VoteDecision,
  type ForumPostResult,
  type ProposalIdea,
  type ProposalGenerationContext,
} from './prompt-templates';

export {
  LLMResponseCache,
  type CacheEntry,
} from './response-cache';

export {
  AgentMemory,
  type MemoryEntry,
} from './agent-memory';

export {
  LLMVotingBehavior,
  type LLMVoteRecord,
} from './llm-voting-mixin';
