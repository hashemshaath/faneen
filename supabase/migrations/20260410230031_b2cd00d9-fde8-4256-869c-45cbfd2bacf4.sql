
CREATE TABLE public.ai_knowledge_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  source_type text NOT NULL DEFAULT 'text',
  source_name text,
  tags text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  char_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.ai_knowledge_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own knowledge" ON public.ai_knowledge_entries
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.ai_assistant_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  system_prompt text DEFAULT '',
  response_style text DEFAULT 'balanced',
  language_preference text DEFAULT 'auto',
  include_knowledge boolean DEFAULT true,
  max_knowledge_entries integer DEFAULT 5,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.ai_assistant_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own settings" ON public.ai_assistant_settings
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_ai_knowledge_updated_at BEFORE UPDATE ON public.ai_knowledge_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_settings_updated_at BEFORE UPDATE ON public.ai_assistant_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
