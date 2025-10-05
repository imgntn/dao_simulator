// Violation data structure

import type { Project } from './project';

export class Violation {
  violator: string; // Violator's unique ID
  project: Project | null;
  description: string;
  resolved: boolean = false;

  constructor(violator: string, project: Project | null, description: string) {
    this.violator = violator;
    this.project = project;
    this.description = description;
  }

  resolve(): void {
    this.resolved = true;
  }
}
