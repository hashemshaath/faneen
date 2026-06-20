import type { KnowledgeItem } from './knowledge.types';

/**
 * Runtime validator for KnowledgeItem entries — used by registry tests and
 * by dev-time assertions. Returns a list of human-readable issues; empty
 * array means the item is valid.
 */
export function validateKnowledgeItem(item: KnowledgeItem): string[] {
  const issues: string[] = [];
  if (!item.id || !/^[a-z0-9][a-z0-9-]*$/.test(item.id)) {
    issues.push(`invalid id: "${item.id}"`);
  }
  if (!item.title?.ar?.trim()) issues.push(`missing Arabic title (id=${item.id})`);
  if (item.status === 'published' && !item.body?.ar?.trim()) {
    issues.push(`published item missing Arabic body (id=${item.id})`);
  }
  if (!Array.isArray(item.audience) || item.audience.length === 0) {
    issues.push(`audience must be a non-empty array (id=${item.id})`);
  }
  if (!item.source?.trim()) issues.push(`missing source (id=${item.id})`);
  if (!Array.isArray(item.tags)) issues.push(`tags must be an array (id=${item.id})`);
  return issues;
}

export function assertValidRegistry(items: readonly KnowledgeItem[]): void {
  const allIssues: string[] = [];
  const seenIds = new Set<string>();
  for (const it of items) {
    if (seenIds.has(it.id)) allIssues.push(`duplicate id: ${it.id}`);
    seenIds.add(it.id);
    allIssues.push(...validateKnowledgeItem(it));
  }
  if (allIssues.length > 0) {
    throw new Error(`KnowledgeRegistry invalid:\n - ${allIssues.join('\n - ')}`);
  }
}