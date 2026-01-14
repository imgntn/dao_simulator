// Marketing Campaign Events - various marketing strategies for DAOs
// Port from data_structures/marketing_events.py

import type { DAO } from './dao';
import type { DAOModel } from '../engine/model';
import { PassiveMember } from '../agents/passive-member';
import { randomChoice } from '../utils/random';

/**
 * Base class for marketing campaigns
 */
export abstract class MarketingCampaign {
  dao: DAO;
  budget: number;

  constructor(dao: DAO, budget: number = 50) {
    this.dao = dao;
    this.budget = budget;
  }

  abstract execute(sim: DAOModel): void;
}

/**
 * Demand Boost Campaign - increase token price by spending treasury funds
 */
export class DemandBoostCampaign extends MarketingCampaign {
  priceBoost: number;

  constructor(dao: DAO, budget: number = 50, priceBoost: number = 0.1) {
    super(dao, budget);
    this.priceBoost = priceBoost;
  }

  execute(sim: DAOModel): void {
    const spent = this.dao.treasury.withdraw(
      'DAO_TOKEN',
      this.budget,
      sim.currentStep
    );

    const oldPrice = this.dao.treasury.getTokenPrice('DAO_TOKEN');
    const newPrice = oldPrice * (1 + this.priceBoost);
    this.dao.treasury.updateTokenPrice('DAO_TOKEN', newPrice);

    if (this.dao.eventBus) {
      this.dao.eventBus.publish('marketing_campaign', {
        step: sim.currentStep,
        type: 'demand_boost',
        budget: spent,
        oldPrice,
        newPrice,
      });
    }
  }
}

/**
 * Recruitment Campaign - attract new members to the DAO
 */
export class RecruitmentCampaign extends MarketingCampaign {
  recruits: number;

  constructor(dao: DAO, budget: number = 50, recruits: number = 2) {
    super(dao, budget);
    this.recruits = recruits;
  }

  execute(sim: DAOModel): void {
    const spent = this.dao.treasury.withdraw(
      'DAO_TOKEN',
      this.budget,
      sim.currentStep
    );

    const price = this.dao.treasury.getTokenPrice('DAO_TOKEN');
    const newIds: string[] = [];

    for (let i = 0; i < this.recruits; i++) {
      const uid = `Recruit_${sim.currentStep}_${i}`;
      const member = new PassiveMember(
        uid,
        sim,
        100,
        0,
        'global'
      );

      this.dao.addMember(member);
      sim.schedule.add(member);
      newIds.push(uid);
    }

    if (this.dao.eventBus) {
      this.dao.eventBus.publish('marketing_campaign', {
        step: sim.currentStep,
        type: 'recruitment',
        budget: spent,
        newMembers: newIds,
        oldPrice: price,
        newPrice: price,
      });
    }
  }
}

/**
 * Social Media Campaign - small social media push to boost token demand
 */
export class SocialMediaCampaign extends MarketingCampaign {
  priceBoost: number;

  constructor(dao: DAO, budget: number = 20, priceBoost: number = 0.05) {
    super(dao, budget);
    this.priceBoost = priceBoost;
  }

  execute(sim: DAOModel): void {
    const spent = this.dao.treasury.withdraw(
      'DAO_TOKEN',
      this.budget,
      sim.currentStep
    );

    const oldPrice = this.dao.treasury.getTokenPrice('DAO_TOKEN');
    const newPrice = oldPrice * (1 + this.priceBoost);
    this.dao.treasury.updateTokenPrice('DAO_TOKEN', newPrice);

    if (this.dao.eventBus) {
      this.dao.eventBus.publish('marketing_campaign', {
        step: sim.currentStep,
        type: 'social_media',
        budget: spent,
        oldPrice,
        newPrice,
      });
    }
  }
}

/**
 * Referral Bonus Campaign - reward existing members for recruiting friends
 */
export class ReferralBonusCampaign extends MarketingCampaign {
  recruits: number;
  bonus: number;

  constructor(
    dao: DAO,
    budget: number = 60,
    recruits: number = 1,
    bonus: number = 10
  ) {
    super(dao, budget);
    this.recruits = recruits;
    this.bonus = bonus;
  }

  execute(sim: DAOModel): void {
    const spent = this.dao.treasury.withdraw(
      'DAO_TOKEN',
      this.budget,
      sim.currentStep
    );

    const price = this.dao.treasury.getTokenPrice('DAO_TOKEN');
    const newIds: string[] = [];

    // Choose a random referrer
    const referrer =
      this.dao.members.length > 0
        ? randomChoice(this.dao.members)
        : null;

    if (referrer) {
      referrer.tokens += this.bonus;
    }

    // Add new members
    for (let i = 0; i < this.recruits; i++) {
      const uid = `Referral_${sim.currentStep}_${i}`;
      const member = new PassiveMember(
        uid,
        sim,
        100,
        0,
        'global'
      );

      this.dao.addMember(member);
      sim.schedule.add(member);
      newIds.push(uid);
    }

    if (this.dao.eventBus) {
      this.dao.eventBus.publish('marketing_campaign', {
        step: sim.currentStep,
        type: 'referral_bonus',
        budget: spent,
        newMembers: newIds,
        referrer: referrer?.uniqueId || null,
        oldPrice: price,
        newPrice: price,
      });
    }
  }
}
