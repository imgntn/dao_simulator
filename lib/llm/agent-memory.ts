/**
 * Agent Memory System
 *
 * Short-term (last 10 events, always in prompt) and long-term (top 100 by
 * importance, selectively retrieved) memory for LLM agents.
 * Serializable for checkpoints.
 */

export interface MemoryEntry {
  type: 'vote' | 'proposal_outcome' | 'treasury_event' | 'observation';
  step: number;
  summary: string;
  importance: number; // 0-1
  tags: string[];
  relatedIds?: string[];
}

export class AgentMemory {
  private shortTerm: MemoryEntry[] = [];
  private longTerm: MemoryEntry[] = [];

  private readonly maxShortTerm: number;
  private readonly maxLongTerm: number;
  private readonly autoPromoteThreshold: number;

  constructor(
    maxShortTerm: number = 10,
    maxLongTerm: number = 100,
    autoPromoteThreshold: number = 0.7
  ) {
    this.maxShortTerm = maxShortTerm;
    this.maxLongTerm = maxLongTerm;
    this.autoPromoteThreshold = autoPromoteThreshold;
  }

  /**
   * Add a new memory entry. Goes to short-term first;
   * high-importance entries are auto-promoted to long-term.
   */
  add(entry: MemoryEntry): void {
    this.shortTerm.push(entry);

    // Trim short-term to max size (FIFO).
    // High-importance entries survive eviction because they are also
    // auto-promoted to long-term (below), so FIFO is acceptable here.
    while (this.shortTerm.length > this.maxShortTerm) {
      const evicted = this.shortTerm.shift()!;
      // Auto-promote evicted high-importance entries to long-term
      if (evicted.importance >= this.autoPromoteThreshold) {
        this.addToLongTerm(evicted);
      }
    }

    // Also auto-promote if importance is high enough
    if (entry.importance >= this.autoPromoteThreshold) {
      this.addToLongTerm(entry);
    }
  }

  /**
   * Get the most recent short-term memories
   */
  getShortTerm(limit?: number): MemoryEntry[] {
    const n = limit ?? this.shortTerm.length;
    return this.shortTerm.slice(-n);
  }

  /**
   * Retrieve long-term memories by tags (returns top N by importance)
   */
  retrieveByTags(tags: string[], limit: number = 3): MemoryEntry[] {
    if (tags.length === 0) return this.getTopLongTerm(limit);

    const tagSet = new Set(tags.map((t) => t.toLowerCase()));
    const matches = this.longTerm
      .filter((entry) =>
        entry.tags.some((t) => tagSet.has(t.toLowerCase()))
      )
      .sort((a, b) => b.importance - a.importance);

    return matches.slice(0, limit);
  }

  /**
   * Get top long-term memories by importance
   */
  getTopLongTerm(limit: number = 5): MemoryEntry[] {
    return [...this.longTerm]
      .sort((a, b) => b.importance - a.importance)
      .slice(0, limit);
  }

  /**
   * Build a context string for injection into LLM prompts.
   * Includes last 5 short-term + top 3 tag-matched long-term memories.
   */
  buildPromptContext(tags?: string[]): string {
    const stm = this.getShortTerm(5);
    const ltm = tags ? this.retrieveByTags(tags, 3) : this.getTopLongTerm(3);

    // Deduplicate by summary
    const seen = new Set<string>();
    const entries: MemoryEntry[] = [];

    for (const entry of [...stm, ...ltm]) {
      if (!seen.has(entry.summary)) {
        seen.add(entry.summary);
        entries.push(entry);
      }
    }

    if (entries.length === 0) return '';

    return entries
      .map((e) => `- [Step ${e.step}] ${e.summary}`)
      .join('\n');
  }

  /**
   * Export memory state for serialization
   */
  export(): { shortTerm: MemoryEntry[]; longTerm: MemoryEntry[] } {
    return {
      shortTerm: [...this.shortTerm],
      longTerm: [...this.longTerm],
    };
  }

  /**
   * Import memory state from serialized data
   */
  import(data: { shortTerm: MemoryEntry[]; longTerm: MemoryEntry[] }): void {
    this.shortTerm = [...data.shortTerm];
    this.longTerm = [...data.longTerm];
  }

  /**
   * Clear all memory
   */
  clear(): void {
    this.shortTerm = [];
    this.longTerm = [];
  }

  /**
   * Get memory statistics
   */
  get stats(): { shortTermCount: number; longTermCount: number } {
    return {
      shortTermCount: this.shortTerm.length,
      longTermCount: this.longTerm.length,
    };
  }

  // ==========================================================================
  // PRIVATE
  // ==========================================================================

  private addToLongTerm(entry: MemoryEntry): void {
    // Check for duplicate (same summary already in long-term)
    if (this.longTerm.some((e) => e.summary === entry.summary)) return;

    this.longTerm.push(entry);

    // Trim by importance if over capacity
    if (this.longTerm.length > this.maxLongTerm) {
      this.longTerm.sort((a, b) => b.importance - a.importance);
      this.longTerm = this.longTerm.slice(0, this.maxLongTerm);
    }
  }
}
