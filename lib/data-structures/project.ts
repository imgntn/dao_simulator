// Project data structure

import type { DAO } from './dao';

export class Project {
  dao: DAO;
  creator: string; // Creator's unique ID
  uniqueId: string;
  title: string;
  description: string;
  fundingGoal: number;
  duration: number;
  currentFunding: number = 0;
  requiredSkills: string[];
  workDone: Map<string, number> = new Map(); // member ID -> work amount
  status: string = 'open';
  comments: Array<{ member: string; sentiment: string }> = [];
  startTime: number = 0;
  fundingLocked: boolean = false;

  constructor(
    dao: DAO,
    creator: string,
    title: string,
    description: string,
    fundingGoal: number,
    duration: number = 30,
    requiredSkills: string[] = []
  ) {
    this.dao = dao;
    this.creator = creator;
    this.uniqueId = '';  // Will be set by DAO when added
    this.title = title;
    this.description = description;
    this.fundingGoal = fundingGoal;
    this.duration = duration;
    this.requiredSkills = requiredSkills;
  }

  addComment(memberId: string, sentiment: string): void {
    this.comments.push({ member: memberId, sentiment });
  }

  updateWorkDone(memberId: string, workAmount: number): void {
    const current = this.workDone.get(memberId) || 0;
    this.workDone.set(memberId, current + workAmount);
  }

  receiveWork(memberId: string, workAmount: number): void {
    this.updateWorkDone(memberId, workAmount);
  }

  totalWork(): number {
    let total = 0;
    for (const work of this.workDone.values()) {
      total += work;
    }
    return total;
  }

  memberShare(memberId: string): number {
    const total = this.totalWork();
    if (total === 0) return 0;

    const memberWork = this.workDone.get(memberId) || 0;
    return memberWork / total;
  }

  toDict(): any {
    return {
      uniqueId: this.uniqueId,
      title: this.title,
      description: this.description,
      fundingGoal: this.fundingGoal,
      duration: this.duration,
      currentFunding: this.currentFunding,
      requiredSkills: [...this.requiredSkills],
      status: this.status,
      comments: this.comments.map(c => ({
        member: c.member,
        sentiment: c.sentiment,
      })),
      startTime: this.startTime,
      fundingLocked: this.fundingLocked,
      creator: this.creator,
    };
  }

  static fromDict(data: any, dao: DAO): Project {
    const project = new Project(
      dao,
      data.creator || '',
      data.title || '',
      data.description || '',
      data.fundingGoal || 0,
      data.duration || 30,
      data.requiredSkills || []
    );

    project.uniqueId = data.uniqueId || '';
    project.currentFunding = data.currentFunding || 0;
    project.status = data.status || 'open';
    project.startTime = data.startTime || 0;
    project.fundingLocked = data.fundingLocked || false;
    project.comments = [];

    return project;
  }
}
