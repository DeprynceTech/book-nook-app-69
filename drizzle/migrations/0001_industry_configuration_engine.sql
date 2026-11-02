CREATE TABLE public.industry_templates (key text PRIMARY KEY, name text NOT NULL, config jsonb NOT NULL DEFAULT '{}'::jsonb, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.industry_templates TO anon, authenticated;
GRANT ALL ON public.industry_templates TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.industry_templates TO authenticated;
ALTER TABLE public.industry_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "industry read" ON public.industry_templates FOR SELECT TO anon,authenticated USING (true);
CREATE POLICY "industry admin" ON public.industry_templates FOR ALL TO authenticated USING(public.has_role(auth.uid(),'super_admin')) WITH CHECK(public.has_role(auth.uid(),'super_admin'));
ALTER TABLE public.businesses ADD COLUMN industry_key text REFERENCES public.industry_templates(key), ADD COLUMN industry_overrides jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.services ADD COLUMN configuration jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.appointments ADD COLUMN booking_answers jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.subscription_plans ADD COLUMN industry_features jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE OR REPLACE FUNCTION public.business_industry_feature(_business_id uuid, _feature text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.subscriptions s JOIN public.subscription_plans p ON p.id=s.plan_id WHERE s.business_id=_business_id AND ((s.status='active' AND s.current_period_end>now()) OR (s.status='trialing' AND coalesce(s.trial_ends_at,s.current_period_end)>now())) AND p.industry_features->>_feature='true') $$;
GRANT EXECUTE ON FUNCTION public.business_industry_feature(uuid,text) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.validate_industry_config() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF jsonb_typeof(NEW.configuration)<>'object' OR octet_length(NEW.configuration::text)>20000 THEN RAISE EXCEPTION 'Invalid service configuration'; END IF;
 IF NEW.configuration->>'staffMode' IS NOT NULL AND NEW.configuration->>'staffMode' NOT IN ('optional','required','automatic') THEN RAISE EXCEPTION 'Invalid staff selection mode'; END IF;
 IF NEW.configuration ? 'questions' AND (jsonb_typeof(NEW.configuration->'questions')<>'array' OR jsonb_array_length(NEW.configuration->'questions')>12) THEN RAISE EXCEPTION 'Invalid booking questions'; END IF;
 IF TG_OP='INSERT' OR NEW.configuration IS DISTINCT FROM OLD.configuration THEN
 IF jsonb_array_length(coalesce(NEW.configuration->'questions','[]'::jsonb))>0 AND NOT public.business_industry_feature(NEW.business_id,'custom_questions') THEN RAISE EXCEPTION 'Your plan does not include custom questions'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER service_industry_validation BEFORE INSERT OR UPDATE OF configuration ON public.services FOR EACH ROW EXECUTE FUNCTION public.validate_industry_config();
CREATE OR REPLACE FUNCTION public.protect_appointment_reservation() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.ends_at<=NEW.starts_at THEN RAISE EXCEPTION 'Invalid appointment interval'; END IF;
 IF NEW.service_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.services WHERE id=NEW.service_id AND business_id=NEW.business_id) THEN RAISE EXCEPTION 'Service belongs to another business'; END IF;
 IF NEW.staff_id IS NOT NULL THEN
 IF NOT EXISTS(SELECT 1 FROM public.staff WHERE id=NEW.staff_id AND business_id=NEW.business_id AND is_active) THEN RAISE EXCEPTION 'Team member unavailable'; END IF;
 IF EXISTS(SELECT 1 FROM public.staff_services WHERE business_id=NEW.business_id AND staff_id=NEW.staff_id) AND NOT EXISTS(SELECT 1 FROM public.staff_services WHERE business_id=NEW.business_id AND staff_id=NEW.staff_id AND service_id=NEW.service_id) THEN RAISE EXCEPTION 'Team member does not offer this service'; END IF;
 END IF;
 IF NEW.status IN ('pending','confirmed','rescheduled') THEN
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.business_id::text,0));
 IF EXISTS(SELECT 1 FROM public.appointments a WHERE a.business_id=NEW.business_id AND a.id<>NEW.id AND a.status IN ('pending','confirmed','rescheduled') AND (NEW.staff_id IS NULL OR a.staff_id IS NULL OR a.staff_id=NEW.staff_id) AND a.starts_at<NEW.ends_at AND NEW.starts_at<a.ends_at) THEN RAISE EXCEPTION 'That appointment slot is already reserved'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER appointment_reservation_guard BEFORE INSERT OR UPDATE OF starts_at,ends_at,staff_id,status ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.protect_appointment_reservation();