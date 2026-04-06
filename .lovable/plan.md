

## AI Ads Campaign Management Dashboard — Implementation Plan

### What Already Exists
The project has a working `BudgetAllocation` component embedded as a tab in `/admin/ads-intelligence`. It supports single-campaign CRUD, budget sliders, ad management, scoring, and evaluation. The database tables `budget_campaigns` and `budget_ads` already exist with RLS policies.

### What We're Building
A multi-campaign management system with dedicated routes, inline editing, delete confirmation, and a campaigns list page — all integrated into the existing admin portal.

---

### Technical Plan

**1. Database Migration — Add `campaign_metrics` table**

Create a new `campaign_metrics` table to store computed metrics per campaign:
- `id`, `campaign_id` (FK to budget_campaigns), `total_spend`, `revenue`, `roas`, `active_ads`, `score`, `created_at`
- RLS: admin-only access via `has_role()`

No changes needed to `budget_campaigns` or `budget_ads` — they already have the required columns.

**2. New Route: `/admin/campaigns`** — Campaign List Page

Create `src/pages/AdminCampaigns.tsx`:
- Fetch all `budget_campaigns` with computed metrics from `budget_ads`
- Display as card grid with campaign name, budget, ROAS, active ads, score
- "Create Campaign" button opens inline form (name + budget)
- Each card links to `/admin/campaign/:id`
- Delete button per card with confirmation dialog

**3. New Route: `/admin/campaign/:id`** — Campaign Dashboard Page

Create `src/pages/AdminCampaignDetail.tsx`:
- Refactor existing `BudgetAllocation` logic into this dedicated page
- Add campaign header with:
  - "← Back to Campaigns" button
  - Inline editable campaign name (click to edit, blur/Enter to save)
  - Inline editable total budget (number input, auto-recalculates phase budgets)
  - "Delete Campaign" button with AlertDialog confirmation
- Budget Distribution section with synced sliders + input fields
- KPI cards: Total Spend, Revenue, ROAS, Active Ads, Score
- Phase tables (Testing, Evaluation, Scaling) with status badges
- "Run Evaluation" button with loading state
- Auto Optimize toggle
- Export CSV / PNG buttons
- Fully responsive: 1-col mobile, 2-col tablet, 4-col desktop

**4. Update Routing in `App.tsx`**

Add two new routes:
```
/admin/campaigns → AdminCampaigns
/admin/campaign/:id → AdminCampaignDetail
```

**5. Update Navigation**

Add "Campaigns" link in `AdminAdsIntelligence` and `AdminLeads` nav sections. Keep the existing Budget Allocation tab but have it redirect to `/admin/campaigns`.

**6. Key Behaviors**

- **Inline Name Edit**: Click campaign name → input field → blur/Enter saves via `UPDATE budget_campaigns SET name = ...`
- **Budget Edit**: Number input → onChange updates state + recalculates phase budgets → saves to DB
- **Slider + Input Sync**: Both update the same state; auto-balance other phases to sum to 100%
- **Run Evaluation**: Recalculates ROAS, score, status for all ads; reallocates budget to SCALE winners; persists all changes; shows loading spinner
- **Delete Campaign**: AlertDialog → deletes from `budget_campaigns` + `budget_ads` → redirects to `/admin/campaigns`
- **Metrics**: ROAS = revenue/spend; Score = 30 (ROAS<1), 60 (1-2), 90 (>2); also keeps existing weighted scoring for individual ads
- **Export**: CSV includes campaign name, budget, allocation %, all ad metrics; PNG screenshots dashboard

**7. Files to Create/Edit**

| File | Action |
|------|--------|
| `supabase/migrations/...` | Create `campaign_metrics` table |
| `src/pages/AdminCampaigns.tsx` | New — campaign list |
| `src/pages/AdminCampaignDetail.tsx` | New — campaign dashboard |
| `src/App.tsx` | Add 2 routes |
| `src/pages/AdminAdsIntelligence.tsx` | Add nav link to campaigns |
| `src/components/BudgetAllocation.tsx` | Keep as-is (backward compat) |

