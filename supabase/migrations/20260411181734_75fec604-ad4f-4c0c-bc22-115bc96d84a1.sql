
ALTER TABLE public.ai_assistant_settings 
  ADD COLUMN IF NOT EXISTS default_tone text NOT NULL DEFAULT 'formal',
  ADD COLUMN IF NOT EXISTS default_model text NOT NULL DEFAULT 'google/gemini-3-flash-preview',
  ADD COLUMN IF NOT EXISTS translation_instructions text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS content_instructions text NOT NULL DEFAULT '';
