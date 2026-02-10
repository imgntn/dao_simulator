/**
 * Forum Data Structures
 *
 * Models forum topics and posts for the forum simulation module.
 * Forum sentiment influences proposal creation and voting behavior.
 */

// =============================================================================
// INTERFACES
// =============================================================================

export type ForumPostType = 'support' | 'oppose' | 'question' | 'amendment' | 'neutral';

export interface ForumTopic {
  id: string;
  title: string;
  author: string;
  category: 'proposal_discussion' | 'general' | 'governance' | 'technical' | 'funding';
  createdStep: number;
  posts: ForumPost[];
  views: number;
  linkedProposalId?: string;
}

export interface ForumPost {
  id: string;
  topicId: string;
  author: string;
  content: ForumPostType;
  sentiment: number; // -1 to 1
  createdStep: number;
  replyToId?: string;
}

// =============================================================================
// FORUM STATE
// =============================================================================

export class ForumState {
  topics: ForumTopic[] = [];
  private topicCounter: number = 0;
  private postCounter: number = 0;
  private topicIndex: Map<string, ForumTopic> = new Map();

  /**
   * Create a new forum topic
   */
  createTopic(
    author: string,
    category: ForumTopic['category'],
    step: number,
    linkedProposalId?: string
  ): ForumTopic {
    const id = `topic_${this.topicCounter++}`;
    const topic: ForumTopic = {
      id,
      title: `${category}_${id}`,
      author,
      category,
      createdStep: step,
      posts: [],
      views: 0,
      linkedProposalId,
    };

    this.topics.push(topic);
    this.topicIndex.set(id, topic);
    return topic;
  }

  /**
   * Add a post to a topic
   */
  addPost(
    topicId: string,
    author: string,
    sentiment: number,
    step: number,
    content: ForumPostType = 'neutral',
    replyToId?: string
  ): ForumPost | null {
    const topic = this.topicIndex.get(topicId);
    if (!topic) return null;

    const post: ForumPost = {
      id: `post_${this.postCounter++}`,
      topicId,
      author,
      content,
      sentiment: Math.max(-1, Math.min(1, sentiment)),
      createdStep: step,
      replyToId,
    };

    topic.posts.push(post);
    topic.views += 1 + Math.floor(Math.random() * 5); // Simulate view increase
    return post;
  }

  /**
   * Get topics active within the last N steps
   */
  getActiveTopics(sinceStep: number): ForumTopic[] {
    return this.topics.filter(t => {
      const lastActivity = t.posts.length > 0
        ? t.posts[t.posts.length - 1].createdStep
        : t.createdStep;
      return lastActivity >= sinceStep;
    });
  }

  /**
   * Get the average sentiment of posts in a topic
   */
  getTopicSentiment(topicId: string): number {
    const topic = this.topicIndex.get(topicId);
    if (!topic || topic.posts.length === 0) return 0;

    const totalSentiment = topic.posts.reduce((sum, p) => sum + p.sentiment, 0);
    return totalSentiment / topic.posts.length;
  }

  /**
   * Get topic linked to a specific proposal
   */
  getProposalTopic(proposalId: string): ForumTopic | undefined {
    return this.topics.find(t => t.linkedProposalId === proposalId);
  }

  /**
   * Get total topic and post counts
   */
  getStats(): { topicCount: number; postCount: number; avgSentiment: number } {
    const postCount = this.topics.reduce((sum, t) => sum + t.posts.length, 0);
    const allSentiments = this.topics.flatMap(t => t.posts.map(p => p.sentiment));
    const avgSentiment = allSentiments.length > 0
      ? allSentiments.reduce((a, b) => a + b, 0) / allSentiments.length
      : 0;

    return {
      topicCount: this.topics.length,
      postCount,
      avgSentiment,
    };
  }

  /**
   * Reset forum state
   */
  reset(): void {
    this.topics = [];
    this.topicIndex.clear();
    this.topicCounter = 0;
    this.postCounter = 0;
  }
}
