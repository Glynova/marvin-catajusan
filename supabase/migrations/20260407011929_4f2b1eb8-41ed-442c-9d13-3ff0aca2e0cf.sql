ALTER TABLE public.budget_ads
  ADD COLUMN IF NOT EXISTS cost_of_goods double precision NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS impressions integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clicks integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS add_to_cart integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS initiate_checkout integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS purchases integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS profit double precision NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS margin double precision NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS predicted_roas double precision NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS predicted_profit double precision NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS predicted_margin double precision NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS confidence_score double precision NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recommendation text NOT NULL DEFAULT '';