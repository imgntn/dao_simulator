// Agent Plugins - dynamic agent registration system
// Port from utils/agent_plugins.py

import type { DAOMember } from '../agents/base';

type AgentClass = new (...args: any[]) => DAOMember;

/**
 * Agent registry for dynamic agent types
 */
const AGENT_REGISTRY = new Map<string, AgentClass>();

/**
 * Register an agent class under a given name
 */
export function registerAgent(name: string, agentClass: AgentClass): void {
  AGENT_REGISTRY.set(name.toLowerCase(), agentClass);
}

/**
 * Get an agent class by name
 */
export function getAgent(name: string): AgentClass | undefined {
  return AGENT_REGISTRY.get(name.toLowerCase());
}

/**
 * Get all registered agent names
 */
export function listAgents(): string[] {
  return Array.from(AGENT_REGISTRY.keys());
}

/**
 * Check if an agent type is registered
 */
export function hasAgent(name: string): boolean {
  return AGENT_REGISTRY.has(name.toLowerCase());
}

/**
 * Unregister an agent type
 */
export function unregisterAgent(name: string): boolean {
  return AGENT_REGISTRY.delete(name.toLowerCase());
}

/**
 * Clear all registered agents
 */
export function clearAgents(): void {
  AGENT_REGISTRY.clear();
}

/**
 * Get agent registry (for inspection)
 */
export function getAgentRegistry(): Map<string, AgentClass> {
  return new Map(AGENT_REGISTRY);
}
