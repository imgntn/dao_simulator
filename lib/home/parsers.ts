/**
 * Home Parsers & Utilities
 *
 * File-system helpers and markdown parsing functions extracted
 * from the monolithic homepage for reuse across components.
 */

import fs from 'fs';
import path from 'path';
import type { ParsedBrief } from './content';
import { projectPath } from '@/lib/utils/server-paths';

// ---------------------------------------------------------------------------
// File-system helpers
// ---------------------------------------------------------------------------

export function toPath(relativePath: string): string {
  return projectPath(...relativePath.split('/'));
}

export function readText(relativePath: string): string | null {
  const absolute = toPath(relativePath);
  if (!fs.existsSync(absolute)) return null;
  return fs.readFileSync(absolute, 'utf8');
}

export function exists(relativePath: string): boolean {
  return fs.existsSync(toPath(relativePath));
}

export function artifactHref(relativePath: string): string {
  return `/api/artifacts/${relativePath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')}`;
}

export function findLatestFile(relativeDir: string, matcher: RegExp): string | null {
  const absolute = toPath(relativeDir);
  if (!fs.existsSync(absolute)) return null;

  return (
    fs
      .readdirSync(absolute, { withFileTypes: true })
      .filter((entry) => entry.isFile() && matcher.test(entry.name))
      .map((entry) => entry.name)
      .sort((a, b) => b.localeCompare(a))[0] ?? null
  );
}

// ---------------------------------------------------------------------------
// Markdown utilities
// ---------------------------------------------------------------------------

export function countWords(markdown: string): number {
  return markdown.replace(/#|\*|_|`|\[|\]|\(|\)/g, ' ').split(/\s+/).filter(Boolean).length;
}

export function collapseSection(lines: string[]): string {
  return lines.join('\n').trim();
}

export function stripMarkdownInline(source: string): string {
  return source
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_{1,2}([^_]+)_{1,2}/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractListItems(sectionMarkdown: string): string[] {
  return sectionMarkdown
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, ''))
    .map(stripMarkdownInline)
    .filter(Boolean);
}

export function parseBriefMarkdown(markdown: string): ParsedBrief {
  const sections: Record<string, string[]> = {};
  let currentHeading: string | null = null;

  for (const rawLine of markdown.replace(/\r\n/g, '\n').split('\n')) {
    const headingMatch = rawLine.match(/^##\s+(.*)$/);
    if (headingMatch) {
      currentHeading = headingMatch[1].trim().toLowerCase();
      sections[currentHeading] = sections[currentHeading] ?? [];
      continue;
    }

    if (currentHeading) {
      sections[currentHeading].push(rawLine);
    }
  }

  const overviewRaw = collapseSection(
    sections['the plain english version'] ?? sections['executive overview'] ?? []
  );
  const takeawaysRaw = collapseSection(sections['key takeaways'] ?? []);
  const notesRaw = collapseSection(sections['notes'] ?? []);

  return {
    overview: overviewRaw ? stripMarkdownInline(overviewRaw) : null,
    takeaways: extractListItems(takeawaysRaw),
    notes: extractListItems(notesRaw),
  };
}

export function sectionLabel(id: string): string {
  return id.toUpperCase();
}
