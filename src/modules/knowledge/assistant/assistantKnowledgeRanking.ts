/**
 * Phase-4 — ranking layer that re-orders assistant results so the most
 * relevant items for the audience and query land first. Pure functions
 * only; no IO, no DB, no AI calls.
 */
import type {
  KnowledgeAudience,
  KnowledgeContextResult,
} from '../knowledge.types';

function normalize(input: string): string {
  return (input ?? '').toLowerCase();
}

function tokenize(input: string): string[] {
  return normalize(input)
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 2);
}

export function rankAssistantResults(
  results: KnowledgeContextResult[],
  audience: KnowledgeAudience,
  query: string,
): KnowledgeContextResult[] {
  const q = normalize(query);
  const tokens = tokenize(query);

  const scored = results.map((r) => {
    const item = r.item;
    let bonus = 0;

    // (1) Audience exact match.
    if (item.audience.includes(audience)) bonus += 5;

    // (2) Category mention in the query.
    if (q && item.categoryId && q.includes(item.categoryId.toLowerCase())) bonus += 3;

    // (3) Title token match.
    const titleTokens = tokenize(item.title.ar) .concat(tokenize(item.title.en ?? ''));
    if (titleTokens.some((t) => q.includes(t))) bonus += 4;

    // (4) Tag match.
    if (item.tags.some((t) => q.includes(t.toLowerCase()))) bonus += 2;

    // (5) Publication status preferred.
    if (item.status === 'published') bonus += 1;

    // (6) Priority (light tiebreaker).
    bonus += (item.priority ?? 0) / 100;

    // Light usage of incoming query tokens to avoid empty-query degeneracy.
    if (tokens.length === 0) bonus += 0.001;

    return { ...r, score: r.score + bonus };
  });

  return scored.sort((a, b) => b.score - a.score);
}