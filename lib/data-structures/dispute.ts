// Dispute data structure

import type { DAO } from './dao';
import type { Project } from './project';

export class Dispute {
  dao: DAO;
  partiesInvolved: string[]; // Array of member unique IDs
  description: string;
  importance: number;
  project: Project | null;
  member: string | null; // Member unique ID
  resolution: string | null = null;
  resolved: boolean = false;
  uniqueId: string = '';

  constructor(
    dao: DAO,
    partiesInvolved: string[],
    description: string,
    importance: number = 1,
    project: Project | null = null,
    member: string | null = null
  ) {
    this.dao = dao;
    this.partiesInvolved = partiesInvolved;
    this.description = description;
    this.importance = importance;
    this.project = project;
    this.member = member;
  }

  resolve(resolution: string): void {
    this.resolution = resolution;
    this.resolved = true;
  }
}
