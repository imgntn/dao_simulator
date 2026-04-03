/**
 * Payment Streams - Sablier/Superfluid-style Streaming Payments
 *
 * Implements continuous token streaming from sender to recipient.
 * Supports linear, stepped, and cliff-based release schedules.
 */

import type { EventBus } from '../utils/event-bus';

// =============================================================================
// TYPES
// =============================================================================

export type StreamScheduleType =
  | 'linear'     // Continuous linear release
  | 'stepped'    // Release in discrete chunks at intervals
  | 'cliff'      // No release until cliff, then linear
  | 'custom';    // Custom release schedule

export interface StreamSchedule {
  type: StreamScheduleType;
  cliffSteps?: number;       // Steps before any release (for 'cliff' type)
  stepInterval?: number;     // Steps between releases (for 'stepped' type)
  customReleases?: Array<{   // Custom release points (for 'custom' type)
    step: number;
    amount: number;
  }>;
}

export interface PaymentStream {
  streamId: string;
  sender: string;
  recipient: string;
  token: string;
  totalAmount: number;
  startStep: number;
  endStep: number;
  withdrawn: number;
  schedule: StreamSchedule;
  paused: boolean;
  pausedStep: number | null;
  cancelled: boolean;
  cancelledStep: number | null;
  metadata: Record<string, unknown>;
}

export interface PaymentStreamConfig {
  minStreamDuration: number;    // Minimum stream duration in steps
  maxStreamDuration: number;    // Maximum stream duration in steps
  minStreamAmount: number;      // Minimum total amount
  cancellationFee: number;      // Fee percentage for early cancellation (0-1)
  allowPause: boolean;          // Allow pausing streams
}

export interface StreamStats {
  totalStreams: number;
  activeStreams: number;
  completedStreams: number;
  cancelledStreams: number;
  totalStreamed: number;
  totalWithdrawn: number;
}

// =============================================================================
// PAYMENT STREAM CONTROLLER
// =============================================================================

export class PaymentStreamController {
  private streams: Map<string, PaymentStream> = new Map();
  private senderStreams: Map<string, Set<string>> = new Map();    // sender -> streamIds
  private recipientStreams: Map<string, Set<string>> = new Map(); // recipient -> streamIds
  private eventBus: EventBus | null = null;
  private streamCounter: number = 0;

  config: PaymentStreamConfig;

  constructor(config?: Partial<PaymentStreamConfig>) {
    this.config = {
      minStreamDuration: 24,        // 1 day at 1 step/hour
      maxStreamDuration: 8760 * 4,  // 4 years
      minStreamAmount: 1,
      cancellationFee: 0,           // No fee by default
      allowPause: true,
      ...config,
    };
  }

  /**
   * Set event bus for publishing events
   */
  setEventBus(eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  /**
   * Create a new payment stream
   */
  createStream(
    sender: string,
    recipient: string,
    token: string,
    totalAmount: number,
    durationSteps: number,
    schedule: StreamSchedule,
    currentStep: number,
    metadata?: Record<string, unknown>
  ): PaymentStream | null {
    // Validate parameters
    if (totalAmount < this.config.minStreamAmount) {
      return null;
    }
    if (durationSteps < this.config.minStreamDuration) {
      return null;
    }
    if (durationSteps > this.config.maxStreamDuration) {
      return null;
    }
    if (sender === recipient) {
      return null;
    }

    // Generate stream ID
    this.streamCounter++;
    const streamId = `stream_${this.streamCounter}`;

    const stream: PaymentStream = {
      streamId,
      sender,
      recipient,
      token,
      totalAmount,
      startStep: currentStep,
      endStep: currentStep + durationSteps,
      withdrawn: 0,
      schedule,
      paused: false,
      pausedStep: null,
      cancelled: false,
      cancelledStep: null,
      metadata: metadata || {},
    };

    // Store stream
    this.streams.set(streamId, stream);

    // Update sender index
    if (!this.senderStreams.has(sender)) {
      this.senderStreams.set(sender, new Set());
    }
    this.senderStreams.get(sender)!.add(streamId);

    // Update recipient index
    if (!this.recipientStreams.has(recipient)) {
      this.recipientStreams.set(recipient, new Set());
    }
    this.recipientStreams.get(recipient)!.add(streamId);

    this.emit('stream_created', {
      step: currentStep,
      streamId,
      sender,
      recipient,
      token,
      totalAmount,
      durationSteps,
      schedule: schedule.type,
    });

    return stream;
  }

  /**
   * Calculate streamable (withdrawable) amount at current step
   */
  getStreamableAmount(streamId: string, currentStep: number): number {
    const stream = this.streams.get(streamId);
    if (!stream || stream.cancelled || stream.paused) {
      return 0;
    }

    const elapsed = currentStep - stream.startStep;
    if (elapsed <= 0) {
      return 0;
    }

    const totalDuration = stream.endStep - stream.startStep;
    let streamed: number;

    switch (stream.schedule.type) {
      case 'linear':
        // Linear vesting
        if (currentStep >= stream.endStep) {
          streamed = stream.totalAmount;
        } else {
          streamed = (stream.totalAmount * elapsed) / totalDuration;
        }
        break;

      case 'cliff': {
        // Nothing until cliff, then linear
        const cliffSteps = stream.schedule.cliffSteps || 0;
        if (elapsed < cliffSteps) {
          streamed = 0;
        } else if (currentStep >= stream.endStep) {
          streamed = stream.totalAmount;
        } else {
          const postCliffElapsed = elapsed - cliffSteps;
          const postCliffDuration = totalDuration - cliffSteps;
          streamed = (stream.totalAmount * postCliffElapsed) / postCliffDuration;
        }
        break;
      }

      case 'stepped': {
        // Release in discrete chunks
        const stepInterval = stream.schedule.stepInterval || Math.floor(totalDuration / 10);
        const completedSteps = Math.floor(elapsed / stepInterval);
        const totalSteps = Math.ceil(totalDuration / stepInterval);
        streamed = (stream.totalAmount * Math.min(completedSteps, totalSteps)) / totalSteps;
        break;
      }

      case 'custom':
        // Sum up all releases that have passed
        streamed = 0;
        if (stream.schedule.customReleases) {
          for (const release of stream.schedule.customReleases) {
            if (release.step <= currentStep) {
              streamed += release.amount;
            }
          }
        }
        streamed = Math.min(streamed, stream.totalAmount);
        break;

      default:
        streamed = 0;
    }

    // Return available to withdraw (streamed minus already withdrawn)
    return Math.max(0, streamed - stream.withdrawn);
  }

  /**
   * Withdraw streamed tokens
   */
  withdraw(streamId: string, currentStep: number): number {
    const stream = this.streams.get(streamId);
    if (!stream || stream.cancelled) {
      return 0;
    }

    const available = this.getStreamableAmount(streamId, currentStep);
    if (available <= 0) {
      return 0;
    }

    stream.withdrawn += available;

    this.emit('stream_withdrawn', {
      step: currentStep,
      streamId,
      recipient: stream.recipient,
      amount: available,
      totalWithdrawn: stream.withdrawn,
      remaining: stream.totalAmount - stream.withdrawn,
    });

    return available;
  }

  /**
   * Cancel a stream (returns remaining to sender)
   */
  cancel(streamId: string, canceller: string, currentStep: number): {
    recipientAmount: number;
    senderAmount: number;
  } | null {
    const stream = this.streams.get(streamId);
    if (!stream || stream.cancelled) {
      return null;
    }

    // Only sender can cancel
    if (canceller !== stream.sender) {
      return null;
    }

    // Calculate amounts
    const streamable = this.getStreamableAmount(streamId, currentStep);
    const recipientAmount = stream.withdrawn + streamable;
    let senderAmount = stream.totalAmount - recipientAmount;

    // Apply cancellation fee
    if (this.config.cancellationFee > 0) {
      const fee = senderAmount * this.config.cancellationFee;
      senderAmount -= fee;
    }

    stream.cancelled = true;
    stream.cancelledStep = currentStep;
    stream.withdrawn = recipientAmount;

    this.emit('stream_cancelled', {
      step: currentStep,
      streamId,
      sender: stream.sender,
      recipient: stream.recipient,
      recipientAmount,
      senderAmount,
    });

    return { recipientAmount, senderAmount };
  }

  /**
   * Pause a stream
   */
  pause(streamId: string, pauser: string, currentStep: number): boolean {
    if (!this.config.allowPause) {
      return false;
    }

    const stream = this.streams.get(streamId);
    if (!stream || stream.cancelled || stream.paused) {
      return false;
    }

    // Only sender can pause
    if (pauser !== stream.sender) {
      return false;
    }

    stream.paused = true;
    stream.pausedStep = currentStep;

    this.emit('stream_paused', {
      step: currentStep,
      streamId,
      sender: stream.sender,
      recipient: stream.recipient,
    });

    return true;
  }

  /**
   * Resume a paused stream
   */
  resume(streamId: string, resumer: string, currentStep: number): boolean {
    const stream = this.streams.get(streamId);
    if (!stream || stream.cancelled || !stream.paused) {
      return false;
    }

    // Only sender can resume
    if (resumer !== stream.sender) {
      return false;
    }

    // Extend end step by pause duration
    if (stream.pausedStep !== null) {
      const pauseDuration = currentStep - stream.pausedStep;
      stream.endStep += pauseDuration;
    }

    stream.paused = false;
    stream.pausedStep = null;

    this.emit('stream_resumed', {
      step: currentStep,
      streamId,
      sender: stream.sender,
      recipient: stream.recipient,
      newEndStep: stream.endStep,
    });

    return true;
  }

  /**
   * Process all streams for current step
   * Returns list of streams that completed
   */
  processStreams(currentStep: number): PaymentStream[] {
    const completed: PaymentStream[] = [];

    for (const stream of this.streams.values()) {
      if (stream.cancelled || stream.paused) continue;

      // Check if stream completed
      if (currentStep >= stream.endStep && stream.withdrawn < stream.totalAmount) {
        const remaining = stream.totalAmount - stream.withdrawn;
        stream.withdrawn = stream.totalAmount;
        completed.push(stream);

        this.emit('stream_completed', {
          step: currentStep,
          streamId: stream.streamId,
          sender: stream.sender,
          recipient: stream.recipient,
          totalAmount: stream.totalAmount,
          finalWithdrawal: remaining,
        });
      }
    }

    return completed;
  }

  /**
   * Get stream by ID
   */
  getStream(streamId: string): PaymentStream | undefined {
    return this.streams.get(streamId);
  }

  /**
   * Get all streams for a sender
   */
  getSenderStreams(sender: string): PaymentStream[] {
    const ids = this.senderStreams.get(sender);
    if (!ids) return [];
    return Array.from(ids)
      .map(id => this.streams.get(id))
      .filter((s): s is PaymentStream => s !== undefined);
  }

  /**
   * Get all streams for a recipient
   */
  getRecipientStreams(recipient: string): PaymentStream[] {
    const ids = this.recipientStreams.get(recipient);
    if (!ids) return [];
    return Array.from(ids)
      .map(id => this.streams.get(id))
      .filter((s): s is PaymentStream => s !== undefined);
  }

  /**
   * Get all active streams
   */
  getActiveStreams(currentStep: number): PaymentStream[] {
    return Array.from(this.streams.values()).filter(s =>
      !s.cancelled &&
      !s.paused &&
      s.startStep <= currentStep &&
      s.endStep > currentStep
    );
  }

  /**
   * Get statistics
   */
  getStats(): StreamStats {
    let activeStreams = 0;
    let completedStreams = 0;
    let cancelledStreams = 0;
    let totalStreamed = 0;
    let totalWithdrawn = 0;

    for (const stream of this.streams.values()) {
      totalStreamed += stream.totalAmount;
      totalWithdrawn += stream.withdrawn;

      if (stream.cancelled) {
        cancelledStreams++;
      } else if (stream.withdrawn >= stream.totalAmount) {
        completedStreams++;
      } else {
        activeStreams++;
      }
    }

    return {
      totalStreams: this.streams.size,
      activeStreams,
      completedStreams,
      cancelledStreams,
      totalStreamed,
      totalWithdrawn,
    };
  }

  /**
   * Emit event
   */
  private emit(event: string, data: Record<string, unknown>): void {
    if (this.eventBus) {
      this.eventBus.publish(event, data as { step: number; [key: string]: unknown });
    }
  }

  /**
   * Serialize to plain object
   */
  toDict(): unknown {
    return {
      config: this.config,
      streamCounter: this.streamCounter,
      streams: Array.from(this.streams.entries()),
      senderStreams: Array.from(this.senderStreams.entries()).map(([sender, ids]) => [
        sender,
        Array.from(ids),
      ]),
      recipientStreams: Array.from(this.recipientStreams.entries()).map(([recipient, ids]) => [
        recipient,
        Array.from(ids),
      ]),
    };
  }

  /**
   * Restore from serialized data
   */
  static fromDict(data: any): PaymentStreamController {
    const controller = new PaymentStreamController(data.config);
    controller.streamCounter = data.streamCounter || 0;

    if (data.streams) {
      for (const [id, stream] of data.streams) {
        controller.streams.set(id, stream);
      }
    }

    if (data.senderStreams) {
      for (const [sender, ids] of data.senderStreams) {
        controller.senderStreams.set(sender, new Set(ids));
      }
    }

    if (data.recipientStreams) {
      for (const [recipient, ids] of data.recipientStreams) {
        controller.recipientStreams.set(recipient, new Set(ids));
      }
    }

    return controller;
  }
}

/**
 * Factory function to create payment stream controller with Sablier defaults
 */
export function createSablierStreamController(): PaymentStreamController {
  return new PaymentStreamController({
    minStreamDuration: 3600,      // 1 hour minimum
    maxStreamDuration: 8760 * 10, // 10 years max
    minStreamAmount: 0.0001,
    cancellationFee: 0,
    allowPause: true,
  });
}

/**
 * Factory function to create payment stream controller with Superfluid defaults
 */
export function createSuperfluidStreamController(): PaymentStreamController {
  return new PaymentStreamController({
    minStreamDuration: 1,         // 1 step minimum (real-time)
    maxStreamDuration: 8760 * 100, // Essentially unlimited
    minStreamAmount: 0,
    cancellationFee: 0,
    allowPause: false,            // Superfluid doesn't have pause
  });
}
