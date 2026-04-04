
-- Budget Allocation Campaign table
CREATE TABLE public.budget_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT '',
  total_budget FLOAT NOT NULL DEFAULT 0,
  testing_pct FLOAT NOT NULL DEFAULT 30,
  evaluation_pct FLOAT NOT NULL DEFAULT 30,
  scaling_pct FLOAT NOT NULL DEFAULT 40,
  auto_optimize BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.budget_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage budget campaigns" ON public.budget_campaigns
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Ad entries within a campaign
CREATE TABLE public.budget_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.budget_campaigns(id) ON DELETE CASCADE,
  creative_name TEXT NOT NULL DEFAULT '',
  audience TEXT NOT NULL DEFAULT '',
  phase TEXT NOT NULL DEFAULT 'testing',
  spend FLOAT NOT NULL DEFAULT 0,
  revenue FLOAT NOT NULL DEFAULT 0,
  ctr FLOAT NOT NULL DEFAULT 0,
  cpc FLOAT NOT NULL DEFAULT 0,
  conversions INT NOT NULL DEFAULT 0,
  roas FLOAT NOT NULL DEFAULT 0,
  score FLOAT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'HOLD',
  budget FLOAT NOT NULL DEFAULT 0,
  frequency FLOAT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.budget_ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage budget ads" ON public.budget_ads
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
