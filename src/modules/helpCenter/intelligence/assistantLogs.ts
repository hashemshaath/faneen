import { supabase } from '@/integrations/supabase/client';
import { normalizeQuery } from './textNormalize';
import type { HelpAudience } from '../types';

export type AssistantEvent =
  | 'question_asked'
  | 'answer_found'
  | 'low_confidence'
  | 'content_gap_submitted';

export interface LogAssistantInput {
  event: AssistantEvent;
  query?: string | null;
  page_key?: string | null;
  audience?: HelpAudience | null;
  confidence?: number | null;
  sources_count?: number;
}

/**
 * Fire-and-forget assistant analytics event.
 * Strictly no PII, no answer text, no user identifiers.
 * Failures are swallowed so the UI never breaks on telemetry.
 */
export async function logAssistantEvent(input: LogAssistantInput): Promise<void> {
  try {
    const norm = input.query ? normalizeQuery(input.query).slice(0, 500) : null;
    await supabase.from('help_assistant_logs').insert({
      event: input.event,
      query_normalized: norm,
      page_key: input.page_key ?? null,
      audience: input.audience ?? null,
      confidence: input.confidence ?? null,
      sources_count: Math.max(0, (input.sources_count ?? 0) | 0),
    });
  } catch {
    /* ignore — analytics only */
  }
}
