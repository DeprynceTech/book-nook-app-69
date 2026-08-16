-- ENUMS
create type public.app_role as enum ('super_admin','owner','manager','staff','customer');
create type public.appointment_status as enum ('pending','confirmed','completed','cancelled','rescheduled','no_show');
create type public.payment_status as enum ('unpaid','pending','successful','failed','refunded');
create type public.subscription_status as enum ('trialing','active','past_due','cancelled','expired');

create or replace function public.update_updated_at_column() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql set search_path = public;

-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid());
create policy "own profile write" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());

-- ROLES
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
create policy "read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'super_admin'));

-- PLANS
create table public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  price_monthly numeric(12,2) not null default 0,
  currency text not null default 'USD',
  max_appointments int,
  max_customers int,
  max_staff int,
  max_locations int not null default 1,
  sms_enabled boolean not null default false,
  whatsapp_enabled boolean not null default false,
  analytics_enabled boolean not null default false,
  custom_branding boolean not null default false,
  api_access boolean not null default false,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.subscription_plans to anon, authenticated;
grant all on public.subscription_plans to service_role;
alter table public.subscription_plans enable row level security;
create policy "plans public read" on public.subscription_plans for select to anon, authenticated using (is_active);
create policy "plans admin all" on public.subscription_plans for all to authenticated using (public.has_role(auth.uid(),'super_admin')) with check (public.has_role(auth.uid(),'super_admin'));

-- BUSINESSES
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  name text not null,
  slug text not null unique,
  category text not null default 'other',
  description text,
  logo_url text,
  cover_url text,
  email text,
  phone text,
  website text,
  address text,
  city text,
  country text,
  currency text not null default 'UGX',
  timezone text not null default 'Africa/Kampala',
  brand_color text not null default '#0f766e',
  is_published boolean not null default true,
  is_suspended boolean not null default false,
  onboarding_completed boolean not null default false,
  cancellation_hours int not null default 24,
  reschedule_hours int not null default 12,
  reminder_hours int[] not null default '{24,2}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.businesses (owner_id);
grant select, insert, update on public.businesses to authenticated;
grant select on public.businesses to anon;
grant all on public.businesses to service_role;
alter table public.businesses enable row level security;

create table public.business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null default 'staff',
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);
create index on public.business_members (user_id);
grant select, insert, update, delete on public.business_members to authenticated;
grant all on public.business_members to service_role;
alter table public.business_members enable row level security;

create or replace function public.is_business_member(_business_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.businesses b where b.id = _business_id and b.owner_id = auth.uid()
  ) or exists (
    select 1 from public.business_members m where m.business_id = _business_id and m.user_id = auth.uid()
  ) or public.has_role(auth.uid(),'super_admin')
$$;

create or replace function public.can_manage_business(_business_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.businesses b where b.id = _business_id and b.owner_id = auth.uid()
  ) or exists (
    select 1 from public.business_members m where m.business_id = _business_id and m.user_id = auth.uid() and m.role in ('owner','manager')
  ) or public.has_role(auth.uid(),'super_admin')
$$;

create policy "biz public read" on public.businesses for select to anon, authenticated using (is_published and not is_suspended);
create policy "biz member read" on public.businesses for select to authenticated using (public.is_business_member(id));
create policy "biz owner insert" on public.businesses for insert to authenticated with check (owner_id = auth.uid());
create policy "biz manage update" on public.businesses for update to authenticated using (public.can_manage_business(id)) with check (public.can_manage_business(id));

create policy "members read" on public.business_members for select to authenticated using (user_id = auth.uid() or public.is_business_member(business_id));
create policy "members manage" on public.business_members for all to authenticated using (public.can_manage_business(business_id)) with check (public.can_manage_business(business_id));

-- LOCATIONS
create table public.locations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  address text, city text, phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index on public.locations (business_id);
grant select, insert, update, delete on public.locations to authenticated;
grant select on public.locations to anon;
grant all on public.locations to service_role;
alter table public.locations enable row level security;
create policy "loc public read" on public.locations for select to anon, authenticated using (is_active);
create policy "loc manage" on public.locations for all to authenticated using (public.can_manage_business(business_id)) with check (public.can_manage_business(business_id));

-- SERVICES
create table public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  location_id uuid references public.locations(id) on delete set null,
  name text not null,
  description text,
  category text,
  image_url text,
  price numeric(12,2) not null default 0,
  duration_minutes int not null default 30,
  buffer_minutes int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.services (business_id);
grant select, insert, update, delete on public.services to authenticated;
grant select on public.services to anon;
grant all on public.services to service_role;
alter table public.services enable row level security;
create policy "svc public read" on public.services for select to anon, authenticated using (is_active);
create policy "svc manage" on public.services for all to authenticated using (public.can_manage_business(business_id)) with check (public.can_manage_business(business_id));

-- STAFF
create table public.staff (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  location_id uuid references public.locations(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text, phone text, role text default 'Staff', photo_url text, bio text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index on public.staff (business_id);
grant select, insert, update, delete on public.staff to authenticated;
grant select on public.staff to anon;
grant all on public.staff to service_role;
alter table public.staff enable row level security;
create policy "staff public read" on public.staff for select to anon, authenticated using (is_active);
create policy "staff manage" on public.staff for all to authenticated using (public.can_manage_business(business_id)) with check (public.can_manage_business(business_id));

create table public.staff_services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  unique (staff_id, service_id)
);
create index on public.staff_services (business_id);
grant select, insert, update, delete on public.staff_services to authenticated;
grant select on public.staff_services to anon;
grant all on public.staff_services to service_role;
alter table public.staff_services enable row level security;
create policy "ss public read" on public.staff_services for select to anon, authenticated using (true);
create policy "ss manage" on public.staff_services for all to authenticated using (public.can_manage_business(business_id)) with check (public.can_manage_business(business_id));

-- WORKING HOURS
create table public.working_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  staff_id uuid references public.staff(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  is_open boolean not null default true,
  open_time time not null default '09:00',
  close_time time not null default '17:00',
  break_start time,
  break_end time
);
create index on public.working_hours (business_id, day_of_week);
grant select, insert, update, delete on public.working_hours to authenticated;
grant select on public.working_hours to anon;
grant all on public.working_hours to service_role;
alter table public.working_hours enable row level security;
create policy "wh public read" on public.working_hours for select to anon, authenticated using (true);
create policy "wh manage" on public.working_hours for all to authenticated using (public.can_manage_business(business_id)) with check (public.can_manage_business(business_id));

create table public.holidays (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  date date not null,
  label text
);
create index on public.holidays (business_id, date);
grant select, insert, update, delete on public.holidays to authenticated;
grant select on public.holidays to anon;
grant all on public.holidays to service_role;
alter table public.holidays enable row level security;
create policy "hol public read" on public.holidays for select to anon, authenticated using (true);
create policy "hol manage" on public.holidays for all to authenticated using (public.can_manage_business(business_id)) with check (public.can_manage_business(business_id));

-- CUSTOMERS
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  email text, phone text, address text, date_of_birth date, notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.customers (business_id);
create index on public.customers (business_id, phone);
grant select, insert, update, delete on public.customers to authenticated;
grant all on public.customers to service_role;
alter table public.customers enable row level security;
create policy "cust tenant" on public.customers for all to authenticated using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));

-- APPOINTMENTS
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  location_id uuid references public.locations(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  staff_id uuid references public.staff(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  price numeric(12,2) not null default 0,
  status appointment_status not null default 'pending',
  payment_status payment_status not null default 'unpaid',
  source text not null default 'dashboard',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.appointments (business_id, starts_at);
create index on public.appointments (staff_id, starts_at);
create index on public.appointments (customer_id);
create index on public.appointments (status);
grant select, insert, update, delete on public.appointments to authenticated;
grant all on public.appointments to service_role;
alter table public.appointments enable row level security;
create policy "appt tenant" on public.appointments for all to authenticated using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));

-- WAITLIST
create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  staff_id uuid references public.staff(id) on delete set null,
  customer_name text not null, customer_phone text, customer_email text,
  preferred_date date, preferred_time time, notes text,
  status text not null default 'waiting',
  created_at timestamptz not null default now()
);
create index on public.waitlist (business_id);
grant select, insert, update, delete on public.waitlist to authenticated;
grant all on public.waitlist to service_role;
alter table public.waitlist enable row level security;
create policy "wl tenant" on public.waitlist for all to authenticated using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));

-- SUBSCRIPTIONS / PAYMENTS
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id),
  status subscription_status not null default 'trialing',
  trial_ends_at timestamptz,
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null default (now() + interval '30 days'),
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.subscriptions (business_id);
create index on public.subscriptions (status);
grant select, insert, update on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;
alter table public.subscriptions enable row level security;
create policy "sub tenant read" on public.subscriptions for select to authenticated using (public.is_business_member(business_id));
create policy "sub manage" on public.subscriptions for all to authenticated using (public.can_manage_business(business_id)) with check (public.can_manage_business(business_id));

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  amount numeric(12,2) not null default 0,
  currency text not null default 'USD',
  provider text not null default 'manual',
  method text,
  reference text,
  status payment_status not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.payments (business_id);
create index on public.payments (status);
grant select on public.payments to authenticated;
grant all on public.payments to service_role;
alter table public.payments enable row level security;
create policy "pay tenant read" on public.payments for select to authenticated using (public.is_business_member(business_id));

-- NOTIFICATIONS
create table public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  type text not null,
  channel text not null,
  subject text,
  body text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index on public.notification_templates (business_id);
grant select, insert, update, delete on public.notification_templates to authenticated;
grant all on public.notification_templates to service_role;
alter table public.notification_templates enable row level security;
create policy "tpl read" on public.notification_templates for select to authenticated using (business_id is null or public.is_business_member(business_id));
create policy "tpl manage" on public.notification_templates for all to authenticated using (business_id is not null and public.can_manage_business(business_id)) with check (business_id is not null and public.can_manage_business(business_id));

create table public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  recipient text not null,
  type text not null,
  channel text not null,
  provider text not null default 'internal',
  status text not null default 'queued',
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.notification_logs (business_id, created_at desc);
grant select on public.notification_logs to authenticated;
grant all on public.notification_logs to service_role;
alter table public.notification_logs enable row level security;
create policy "notif tenant read" on public.notification_logs for select to authenticated using (public.is_business_member(business_id));

-- AUDIT
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  actor_name text,
  action text not null,
  entity text not null,
  entity_id uuid,
  previous_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);
create index on public.audit_logs (business_id, created_at desc);
grant select on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;
create policy "audit tenant read" on public.audit_logs for select to authenticated using (business_id is not null and public.is_business_member(business_id));

-- SUPPORT
create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  subject text not null,
  message text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);
grant select, insert, update on public.support_tickets to authenticated;
grant all on public.support_tickets to service_role;
alter table public.support_tickets enable row level security;
create policy "ticket tenant" on public.support_tickets for all to authenticated using (business_id is not null and public.is_business_member(business_id)) with check (business_id is not null and public.is_business_member(business_id));

-- updated_at triggers
create trigger t1 before update on public.businesses for each row execute function public.update_updated_at_column();
create trigger t2 before update on public.services for each row execute function public.update_updated_at_column();
create trigger t3 before update on public.customers for each row execute function public.update_updated_at_column();
create trigger t4 before update on public.appointments for each row execute function public.update_updated_at_column();
create trigger t5 before update on public.subscriptions for each row execute function public.update_updated_at_column();
create trigger t6 before update on public.profiles for each row execute function public.update_updated_at_column();