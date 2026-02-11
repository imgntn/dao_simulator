/**
 * Forum Simulation Engine
 *
 * Simulates forum topic creation and discussion activity.
 * Forum sentiment influences voting decisions and proposal creation.
 */

import { ForumState } from '../data-structures/forum';
import type { ForumPostType } from '../data-structures/forum';
import type { CalibrationProfile } from '../digital-twins/calibration-loader';
import { random } from '../utils/random';

// Steps per day for rate conversion
const STEPS_PER_DAY = 24;

export class ForumSimulation {
  private forumState: ForumState;
  private globalTopicRate: number;   // probability per step (global, not per-agent)
  private perAgentTopicRate: number;  // fallback per-agent rate (non-calibrated)
  private calibrated: boolean;
  private replyRate: number;         // probability per agent per active topic per step
  private influenceWeight: number;   // how much forum sentiment affects voting

  constructor(
    forumState: ForumState,
    calibration?: CalibrationProfile | null,
    influenceWeight: number = 0.3
  ) {
    this.forumState = forumState;
    this.influenceWeight = influenceWeight;

    if (calibration?.forum) {
      // Calibrate: use a global per-step rate so topic count is independent of agent count.
      // avg_topics_per_month / (30 days * 24 steps/day) = topics per step
      this.globalTopicRate = calibration.forum.avg_topics_per_month / (30 * STEPS_PER_DAY);
      this.perAgentTopicRate = 0;
      this.calibrated = true;
      this.replyRate = Math.max(0.001, calibration.forum.reply_rate * 0.01);
    } else {
      // Default rates (per-agent)
      this.globalTopicRate = 0;
      this.perAgentTopicRate = 0.001;
      this.calibrated = false;
      this.replyRate = 0.005;
    }
  }

  /**
   * Run one step of forum simulation
   */
  step(agentIds: string[], currentStep: number, openProposalIds: string[] = []): void {
    const activeTopics = this.forumState.getActiveTopics(currentStep - STEPS_PER_DAY * 7);

    if (this.calibrated) {
      // Global topic creation: one roll per step, pick a random agent as author
      if (random() < this.globalTopicRate) {
        const agentId = agentIds[Math.floor(random() * agentIds.length)];
        const category = this.randomCategory();
        const linkedProposal = openProposalIds.length > 0 && random() < 0.4
          ? openProposalIds[Math.floor(random() * openProposalIds.length)]
          : undefined;
        this.forumState.createTopic(agentId, category, currentStep, linkedProposal);
      }
    } else {
      // Non-calibrated: per-agent topic creation
      for (const agentId of agentIds) {
        if (random() < this.perAgentTopicRate) {
          const category = this.randomCategory();
          const linkedProposal = openProposalIds.length > 0 && random() < 0.4
            ? openProposalIds[Math.floor(random() * openProposalIds.length)]
            : undefined;
          this.forumState.createTopic(agentId, category, currentStep, linkedProposal);
        }
      }
    }

    // Replies: per-agent (more agents = more discussion, which is realistic)
    for (const agentId of agentIds) {
      if (activeTopics.length > 0 && random() < this.replyRate) {
        const topic = activeTopics[Math.floor(random() * activeTopics.length)];
        const sentiment = (random() - 0.5) * 2; // random sentiment -1 to 1
        const content = this.sentimentToContent(sentiment);
        this.forumState.addPost(topic.id, agentId, sentiment, currentStep, content);
      }
    }
  }

  /**
   * Get forum sentiment for a specific proposal
   * Returns a value from -1 (very negative) to 1 (very positive)
   */
  getProposalSentiment(proposalId: string): number {
    const topic = this.forumState.getProposalTopic(proposalId);
    if (!topic) return 0;
    return this.forumState.getTopicSentiment(topic.id);
  }

  /**
   * Get the voting bias from forum sentiment for a proposal.
   * Returns a value in the range `[-influenceWeight, +influenceWeight]` (default ±0.3).
   * Positive values bias toward "for", negative toward "against".
   *
   * This value is added to the agent's belief score in `decideVote()` before
   * the final `clamp(belief)` to [0, 1].
   */
  getVotingBias(proposalId: string): number {
    return this.getProposalSentiment(proposalId) * this.influenceWeight;
  }

  /**
   * Get the overall forum activity level (topics per step)
   */
  getForumStats(): { topicCount: number; postCount: number; avgSentiment: number } {
    return this.forumState.getStats();
  }

  /**
   * Get the underlying forum state
   */
  getState(): ForumState {
    return this.forumState;
  }

  private randomCategory(): 'proposal_discussion' | 'general' | 'governance' | 'technical' | 'funding' {
    const r = random();
    if (r < 0.3) return 'proposal_discussion';
    if (r < 0.5) return 'governance';
    if (r < 0.7) return 'general';
    if (r < 0.85) return 'technical';
    return 'funding';
  }

  private sentimentToContent(sentiment: number): ForumPostType {
    if (sentiment > 0.3) return 'support';
    if (sentiment < -0.3) return 'oppose';
    if (random() < 0.3) return 'question';
    if (random() < 0.2) return 'amendment';
    return 'neutral';
  }
}
