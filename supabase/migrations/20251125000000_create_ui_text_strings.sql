-- Create ui_text_strings table for Go Daisy multi-language UI strings
-- This table stores pre-translated UI text to avoid real-time DeepL API calls

CREATE TABLE IF NOT EXISTS public.ui_text_strings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Unique identifier for the text (e.g., "home.hero.title", "support.patreon.heading")
  text_key TEXT NOT NULL UNIQUE,

  -- English source text (always required)
  text_en TEXT NOT NULL,

  -- Translations for all supported languages
  text_es TEXT,  -- Spanish
  text_fr TEXT,  -- French
  text_pt TEXT,  -- Portuguese
  text_de TEXT,  -- German
  text_it TEXT,  -- Italian
  text_nl TEXT,  -- Dutch
  text_pl TEXT,  -- Polish
  text_tr TEXT,  -- Turkish
  text_sv TEXT,  -- Swedish

  -- Metadata
  context TEXT,    -- Description of where/how this text is used
  page TEXT,       -- Page or component where this appears (e.g., "support", "whether-weather")
  category TEXT CHECK (category IN ('button', 'heading', 'paragraph', 'label', 'link', 'nav', 'other')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on text_key for fast lookups
CREATE INDEX idx_ui_text_strings_text_key ON public.ui_text_strings(text_key);

-- Create index on page for batch queries
CREATE INDEX idx_ui_text_strings_page ON public.ui_text_strings(page);

-- Create index on category for filtering
CREATE INDEX idx_ui_text_strings_category ON public.ui_text_strings(category);

-- Enable Row Level Security
ALTER TABLE public.ui_text_strings ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read UI text (public content)
CREATE POLICY "ui_text_strings_select_public" ON public.ui_text_strings
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Policy: Only authenticated users can insert/update (for bulk imports)
CREATE POLICY "ui_text_strings_insert_authenticated" ON public.ui_text_strings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "ui_text_strings_update_authenticated" ON public.ui_text_strings
  FOR UPDATE
  TO authenticated
  USING (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_ui_text_strings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ui_text_strings_updated_at
  BEFORE UPDATE ON public.ui_text_strings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_ui_text_strings_updated_at();

-- Add comment
COMMENT ON TABLE public.ui_text_strings IS 'Pre-translated UI strings for Go Daisy app. Stores all 10 supported languages to avoid real-time DeepL API calls.';
