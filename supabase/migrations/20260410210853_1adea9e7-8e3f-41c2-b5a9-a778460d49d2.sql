
-- Add category and project_location columns to portfolio_items
ALTER TABLE public.portfolio_items 
ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'general',
ADD COLUMN IF NOT EXISTS project_location text,
ADD COLUMN IF NOT EXISTS completion_date date;

-- Add index for category filtering
CREATE INDEX IF NOT EXISTS idx_portfolio_items_category ON public.portfolio_items (category);
