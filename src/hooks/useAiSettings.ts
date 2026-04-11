import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type ToneType = 'formal' | 'casual' | 'marketing' | 'academic' | 'creative' | 'technical';
export type AiModel = 'google/gemini-3-flash-preview' | 'google/gemini-2.5-flash' | 'google/gemini-2.5-pro' | 'openai/gpt-5-mini' | 'openai/gpt-5';
export type ResponseStyle = 'concise' | 'balanced' | 'detailed';

export interface AiSettings {
  system_prompt: string;
  response_style: ResponseStyle;
  language_preference: string;
  include_knowledge: boolean;
  max_knowledge_entries: number;
  /** Global defaults - used by FieldAiActions, blog tools, etc. */
  default_tone: ToneType;
  default_model: AiModel;
  /** Custom translation instructions appended to all translate prompts */
  translation_instructions: string;
  /** Custom content improvement instructions appended to all improve prompts */
  content_instructions: string;
}

export const DEFAULT_AI_SETTINGS: AiSettings = {
  system_prompt: '',
  response_style: 'balanced',
  language_preference: 'auto',
  include_knowledge: true,
  max_knowledge_entries: 5,
  default_tone: 'formal',
  default_model: 'google/gemini-3-flash-preview',
  translation_instructions: '',
  content_instructions: '',
};

/** Singleton cache so multiple components share the same loaded settings */
let _cached: AiSettings | null = null;
let _cacheUserId: string | null = null;

export function useAiSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AiSettings>(_cached || DEFAULT_AI_SETTINGS);
  const [loading, setLoading] = useState(!_cached);

  const load = useCallback(async () => {
    if (!user) return;
    if (_cached && _cacheUserId === user.id) {
      setSettings(_cached);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await supabase
        .from('ai_assistant_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        const s: AiSettings = {
          system_prompt: data.system_prompt || '',
          response_style: (data.response_style as ResponseStyle) || 'balanced',
          language_preference: data.language_preference || 'auto',
          include_knowledge: data.include_knowledge ?? true,
          max_knowledge_entries: data.max_knowledge_entries ?? 5,
          default_tone: ((data as any).default_tone as ToneType) || 'formal',
          default_model: ((data as any).default_model as AiModel) || 'google/gemini-3-flash-preview',
          translation_instructions: (data as any).translation_instructions || '',
          content_instructions: (data as any).content_instructions || '',
        };
        _cached = s;
        _cacheUserId = user.id;
        setSettings(s);
      }
    } catch (e) {
      console.error('Failed to load AI settings', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async (newSettings: AiSettings) => {
    if (!user) return;
    _cached = newSettings;
    _cacheUserId = user.id;
    setSettings(newSettings);
    const { error } = await supabase.from('ai_assistant_settings').upsert({
      user_id: user.id,
      system_prompt: newSettings.system_prompt,
      response_style: newSettings.response_style,
      language_preference: newSettings.language_preference,
      include_knowledge: newSettings.include_knowledge,
      max_knowledge_entries: newSettings.max_knowledge_entries,
    }, { onConflict: 'user_id' });
    if (error) throw error;
  }, [user]);

  /** Invalidate cache so next consumer re-fetches */
  const invalidate = useCallback(() => {
    _cached = null;
    _cacheUserId = null;
  }, []);

  return useMemo(() => ({ settings, loading, save, reload: load, invalidate }), [settings, loading, save, load, invalidate]);
}
