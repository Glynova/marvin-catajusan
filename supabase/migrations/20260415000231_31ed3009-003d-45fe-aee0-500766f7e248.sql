-- 1. Drop unnecessary anon policies on conversations, messages, processed_messages
DROP POLICY IF EXISTS "Service can insert conversations" ON public.conversations;
DROP POLICY IF EXISTS "Service can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Service can insert processed messages" ON public.processed_messages;
DROP POLICY IF EXISTS "Service can select processed messages" ON public.processed_messages;

-- 2. Prevent privilege escalation on user_roles: ensure only admins can INSERT
-- The existing "Admins can manage roles" ALL policy already covers admin INSERT.
-- We need to make sure non-admin authenticated users cannot INSERT.
-- Since "Admins can manage roles" is permissive ALL for authenticated with has_role check,
-- and there's no other INSERT policy, non-admins should already be blocked.
-- But to be explicit and safe, we drop and recreate the ALL policy as separate operation policies.
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Admins can select all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Keep the existing "Users can view own roles" SELECT policy as-is

-- 3. Add UPDATE policy for portfolio-media storage bucket
CREATE POLICY "Admins can update portfolio media"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'portfolio-media' AND public.has_role(auth.uid(), 'admin'::app_role));

-- 4. Tighten leads INSERT to anon only (public form), remove authenticated from it
DROP POLICY IF EXISTS "Anyone can insert leads" ON public.leads;
CREATE POLICY "Public can insert leads"
  ON public.leads FOR INSERT TO anon
  WITH CHECK (true);

-- Also allow authenticated users to insert leads (admin adding leads manually)
CREATE POLICY "Admins can insert leads"
  ON public.leads FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 5. Restrict portfolio_items public listing to SELECT only (already correct),
-- but ensure the overly permissive INSERT WITH CHECK (true) doesn't exist for anon
-- (checking current state - the "Admins can manage portfolio" ALL policy covers admin CRUD,
-- and "Anyone can view portfolio" is SELECT only - this looks correct already)