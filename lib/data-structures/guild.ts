// Guild data structure

import type { DAO } from './dao';
import type { DAOMember } from '../agents/base';
import { Treasury } from './treasury';
import type { Project } from './project';

export class Guild {
  name: string;
  dao: DAO;
  members: DAOMember[] = [];
  projects: Project[] = [];
  treasury: Treasury;
  reputation: Map<string, number> = new Map();

  constructor(name: string, dao: DAO, creator?: DAOMember) {
    this.name = name;
    this.dao = dao;
    this.treasury = new Treasury(dao.eventBus);

    if (creator) {
      this.addMember(creator);
    }
  }

  addMember(member: DAOMember): void {
    if (!this.members.includes(member)) {
      this.members.push(member);
      member.guild = this;

      if (this.dao.eventBus) {
        this.dao.eventBus.publish('guild_joined', {
          step: this.dao.currentStep,
          guild: this.name,
          member: member.uniqueId,
        });
      }
    }
  }

  removeMember(member: DAOMember): void {
    const index = this.members.indexOf(member);
    if (index > -1) {
      this.members.splice(index, 1);
      member.guild = null;

      if (this.dao.eventBus) {
        this.dao.eventBus.publish('guild_left', {
          step: this.dao.currentStep,
          guild: this.name,
          member: member.uniqueId,
        });
      }
    }
  }

  deposit(token: string, amount: number): void {
    this.treasury.deposit(token, amount, this.dao.currentStep);
  }

  withdraw(token: string, amount: number): number {
    return this.treasury.withdraw(token, amount, this.dao.currentStep);
  }

  toDict(): any {
    return {
      name: this.name,
      members: this.members.map(m => m.uniqueId),
      projects: this.projects.map(p => p.toDict()),
      treasury: this.treasury.toDict(),
    };
  }

  static fromDict(data: any, dao: DAO, membersByIdMap: Map<string, DAOMember>): Guild {
    const guild = new Guild(data.name || 'Unknown Guild', dao);
    guild.treasury = Treasury.fromDict(data.treasury || {}, dao.eventBus);

    for (const memberId of data.members || []) {
      const member = membersByIdMap.get(memberId);
      if (member) {
        guild.members.push(member);
        member.guild = guild;
      }
    }

    // Projects will be loaded separately to avoid circular dependencies

    return guild;
  }
}
