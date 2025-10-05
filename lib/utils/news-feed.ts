// News Feed - collect notable events and publish summaries
// Port from utils/news_feed.py

import type { EventBus } from './event-bus';

const STOPWORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'to',
  'of',
  'in',
  'on',
  'at',
  'for',
  'with',
  'is',
  'no',
  'not',
  'step',
]);

export class NewsFeed {
  eventBus: EventBus;
  maxItems: number;
  private counts: Map<string, number> = new Map();
  wordCounts: Map<string, number> = new Map();
  summaries: string[] = [];

  constructor(eventBus: EventBus, maxItems: number = 20) {
    this.eventBus = eventBus;
    this.maxItems = maxItems;

    // Subscribe to all events
    this.eventBus.subscribe('*', this.handleEvent.bind(this));
  }

  /**
   * Get trending words
   */
  getTrending(n: number = 10): Array<[string, number]> {
    return Array.from(this.wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, n);
  }

  /**
   * Handle events and generate summaries
   */
  private handleEvent(event: string, data: Record<string, any>): void {
    if (event === 'step_end') {
      const step = data.step || 0;
      let summary: string;

      if (this.counts.size > 0) {
        const parts: string[] = [];

        this.counts.forEach((cnt, name) => {
          let label = name.replace(/_/g, ' ');
          if (cnt > 1) {
            label += 's';
          }
          parts.push(`${cnt} ${label}`);
        });

        summary = `Step ${step}: ${parts.join(', ')}`;
      } else {
        summary = `Step ${step}: no notable activity`;
      }

      // Add to summaries (keep only maxItems)
      this.summaries.unshift(summary);
      if (this.summaries.length > this.maxItems) {
        this.summaries.pop();
      }

      // Update trending words
      const tokens = summary.toLowerCase().split(/\s+/);
      for (let tok of tokens) {
        tok = tok.replace(/[.,:;!?"'\n\r]/g, '');

        if (!tok || STOPWORDS.has(tok) || /^\d+$/.test(tok)) {
          continue;
        }

        const current = this.wordCounts.get(tok) || 0;
        this.wordCounts.set(tok, current + 1);
      }

      // Publish news update
      this.eventBus.publish('news_update', {
        step,
        summary,
      });

      // Clear counts for next step
      this.counts.clear();
    } else {
      // Track notable events
      const notable = new Set([
        'proposal_created',
        'nft_minted',
        'nft_sold',
        'guild_created',
        'guild_joined',
        'guild_left',
        'project_completed',
        'tokens_staked',
      ]);

      if (notable.has(event)) {
        const current = this.counts.get(event) || 0;
        this.counts.set(event, current + 1);
      }
    }
  }

  /**
   * Get recent summaries
   */
  getRecentSummaries(n: number = 10): string[] {
    return this.summaries.slice(0, n);
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.counts.clear();
    this.wordCounts.clear();
    this.summaries = [];
  }
}
