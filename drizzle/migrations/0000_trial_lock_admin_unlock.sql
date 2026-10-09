DROP POLICY IF EXISTS "sub manage" ON public.subscriptions;
CREATE POLICY "sub owner start trial" ON public.subscriptions FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_business(business_id) AND status = 'trialing' AND trial_ends_at <= now() + interval '7 days 1 hour');
CREATE POLICY "sub admin manage" ON public.subscriptions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "pay admin insert" ON public.payments FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));
GRANT INSERT ON public.payments TO authenticated;

CREATE OR REPLACE FUNCTION public.business_has_access(_business_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select exists (
    select 1 from public.subscriptions s
    where s.business_id = _business_id
      and ((s.status = 'active' and s.current_period_end > now())
        or (s.status = 'trialing' and coalesce(s.trial_ends_at, s.current_period_end) > now()))
  )
$$;
GRANT EXECUTE ON FUNCTION public.business_has_access(uuid) TO authenticated, service_role;