// Player Agent - controlled via external API calls
// Port from agents/player_agent.py

import { DAOMember } from './base';
import type { DAOModel } from '../engine/model';
import type { Proposal } from '../data-structures/proposal';
import { createRandomProposal } from '../utils/proposal-utils';

type PlayerAction =
  | { type: 'vote'; proposal: Proposal; vote: boolean }
  | { type: 'comment'; proposal: Proposal; sentiment: string }
  | { type: 'create_proposal' }
  | { type: 'delegate'; proposal: Proposal; amount: number }
  | { type: 'swap'; tokenIn: string; tokenOut: string; amount: number }
  | { type: 'add_liquidity'; tokenA: string; tokenB: string; amountA: number; amountB: number }
  | { type: 'remove_liquidity'; tokenA: string; tokenB: string; share: number };

export class PlayerAgent extends DAOMember {
  actions: PlayerAction[] = [];

  constructor(
    uniqueId: string,
    model: DAOModel,
    tokens: number = 100,
    reputation: number = 50,
    location: string = 'node_0'
  ) {
    super(uniqueId, model, tokens, reputation, location);
  }

  /**
   * Helper: Swap tokens via treasury
   */
  private treasurySwap(tokenIn: string, tokenOut: string, amount: number): number {
    const treasury = this.model.dao.treasury;
    const step = this.model.currentStep;

    treasury.deposit(tokenIn, amount, step);
    try {
      const out = treasury.swap(tokenIn, tokenOut, amount, step);
      const gained = treasury.withdraw(tokenOut, out, step);
      return gained;
    } catch {
      // Swap failed, refund
      treasury.withdraw(tokenIn, amount, step);
      return 0;
    }
  }

  /**
   * Helper: Add liquidity to pool
   */
  private treasuryAddLiquidity(
    tokenA: string,
    tokenB: string,
    amtA: number,
    amtB: number
  ): void {
    const treasury = this.model.dao.treasury;
    const step = this.model.currentStep;

    treasury.deposit(tokenA, amtA, step);
    treasury.deposit(tokenB, amtB, step);
    treasury.addLiquidity(tokenA, tokenB, amtA, amtB, step);
  }

  /**
   * Helper: Remove liquidity from pool
   */
  private treasuryRemoveLiquidity(
    tokenA: string,
    tokenB: string,
    share: number
  ): [number, number] {
    const treasury = this.model.dao.treasury;
    const step = this.model.currentStep;

    const [amtA, amtB] = treasury.removeLiquidity(tokenA, tokenB, share, step);
    const gainedA = treasury.withdraw(tokenA, amtA, step);
    const gainedB = treasury.withdraw(tokenB, amtB, step);

    return [gainedA, gainedB];
  }

  /**
   * Enqueue an action to be executed in the next step
   */
  enqueue(action: PlayerAction): void {
    this.actions.push(action);
  }

  step(): void {
    if (this.actions.length === 0) {
      return;
    }

    const action = this.actions.shift()!;

    switch (action.type) {
      case 'vote':
        action.proposal.addVote(this.uniqueId, action.vote, 1);
        this.votes.set(action.proposal.uniqueId, {
          vote: action.vote,
          weight: 1,
        });
        this.markActive();
        break;

      case 'comment':
        this.leaveComment(action.proposal, action.sentiment);
        break;

      case 'create_proposal': {
        const proposal = createRandomProposal(this.model.dao, this);
        this.model.dao.addProposal(proposal);
        this.markActive();
        break;
      }

      case 'delegate':
        if (action.amount > 0 && this.tokens >= action.amount) {
          this.tokens -= action.amount;
          (action.proposal as any).receiveDelegatedSupport?.(
            this.uniqueId,
            action.amount
          );
          this.markActive();
        }
        break;

      case 'swap':
        if (action.amount > 0 && this.tokens >= action.amount) {
          const gained = this.treasurySwap(
            action.tokenIn,
            action.tokenOut,
            action.amount
          );
          this.tokens -= action.amount;
          this.tokens += gained;
          this.markActive();
        }
        break;

      case 'add_liquidity': {
        const total = action.amountA + action.amountB;
        if (total > 0 && this.tokens >= total) {
          this.treasuryAddLiquidity(
            action.tokenA,
            action.tokenB,
            action.amountA,
            action.amountB
          );
          this.tokens -= total;
          this.markActive();
        }
        break;
      }

      case 'remove_liquidity':
        if (action.share > 0 && action.share <= 1) {
          const [amtA, amtB] = this.treasuryRemoveLiquidity(
            action.tokenA,
            action.tokenB,
            action.share
          );
          this.tokens += amtA + amtB;
          this.markActive();
        }
        break;
    }
  }
}
