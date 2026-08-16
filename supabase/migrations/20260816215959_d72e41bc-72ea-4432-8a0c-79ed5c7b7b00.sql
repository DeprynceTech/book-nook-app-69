revoke execute on function public.has_role(uuid, public.app_role) from anon, public;
revoke execute on function public.is_business_member(uuid) from anon, public;
revoke execute on function public.can_manage_business(uuid) from anon, public;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;
grant execute on function public.is_business_member(uuid) to authenticated, service_role;
grant execute on function public.can_manage_business(uuid) to authenticated, service_role;

insert into public.subscription_plans (id, code, name, description, price_monthly, currency, max_appointments, max_customers, max_staff, max_locations, sms_enabled, whatsapp_enabled, analytics_enabled, custom_branding, api_access, sort_order) values
('11111111-0000-4000-8000-000000000001','trial','Free Trial','Everything you need to take your first bookings online.',0,'USD',30,100,1,1,false,false,false,false,false,1),
('11111111-0000-4000-8000-000000000002','starter','Starter','For growing teams that need reminders and customer records.',19,'USD',null,500,3,1,true,false,true,false,false,2),
('11111111-0000-4000-8000-000000000003','professional','Professional','Unlimited everything, WhatsApp reminders and custom branding.',49,'USD',null,null,null,3,true,true,true,true,false,3),
('11111111-0000-4000-8000-000000000004','enterprise','Enterprise','Multi-location, API access, reporting and priority support.',149,'USD',null,null,null,50,true,true,true,true,true,4);

insert into public.businesses (id, name, slug, category, description, email, phone, address, city, country, currency, timezone, brand_color, onboarding_completed) values
('22222222-0000-4000-8000-000000000001','Bella Beauty Salon','bella-beauty','salon','Premium hair, nails and beauty care in the heart of Kampala.','hello@bellabeauty.co','+256 700 111 222','Plot 22, Kira Road','Kampala','Uganda','UGX','Africa/Kampala','#be185d',true),
('22222222-0000-4000-8000-000000000002','FreshCut Barbershop','freshcut','barber','Sharp fades, clean beards, no waiting.','book@freshcut.co','+256 700 333 444','Ntinda Complex','Kampala','Uganda','UGX','Africa/Kampala','#0f766e',true),
('22222222-0000-4000-8000-000000000003','Focus Photography','focus-photography','photographer','Weddings, portraits and corporate shoots.','studio@focusphoto.co','+256 700 555 666','Lugogo Bypass','Kampala','Uganda','UGX','Africa/Kampala','#4338ca',true),
('22222222-0000-4000-8000-000000000004','PrimeCare Clinic','primecare','clinic','General and dental consultations with same-day slots.','care@primecare.co','+256 700 777 888','Bukoto Street','Kampala','Uganda','UGX','Africa/Kampala','#0369a1',true),
('22222222-0000-4000-8000-000000000005','Alpha Consulting','alpha-consulting','consultant','Business strategy and career consulting sessions.','team@alphaconsulting.co','+256 700 999 000','Acacia Avenue','Kampala','Uganda','UGX','Africa/Kampala','#b45309',true);

insert into public.locations (id, business_id, name, address, city, phone) values
('33333333-0000-4000-8000-000000000001','22222222-0000-4000-8000-000000000001','Kampala Flagship','Plot 22, Kira Road','Kampala','+256 700 111 222'),
('33333333-0000-4000-8000-000000000002','22222222-0000-4000-8000-000000000001','Entebbe Branch','Berkeley Road','Entebbe','+256 700 111 333'),
('33333333-0000-4000-8000-000000000003','22222222-0000-4000-8000-000000000002','Ntinda','Ntinda Complex','Kampala','+256 700 333 444'),
('33333333-0000-4000-8000-000000000004','22222222-0000-4000-8000-000000000003','Studio','Lugogo Bypass','Kampala','+256 700 555 666'),
('33333333-0000-4000-8000-000000000005','22222222-0000-4000-8000-000000000004','Main Clinic','Bukoto Street','Kampala','+256 700 777 888'),
('33333333-0000-4000-8000-000000000006','22222222-0000-4000-8000-000000000005','Head Office','Acacia Avenue','Kampala','+256 700 999 000');

insert into public.services (id, business_id, location_id, name, description, category, price, duration_minutes, buffer_minutes) values
('44444444-0000-4000-8000-000000000001','22222222-0000-4000-8000-000000000001','33333333-0000-4000-8000-000000000001','Haircut','Wash, cut and finish.','Hair',20000,45,10),
('44444444-0000-4000-8000-000000000002','22222222-0000-4000-8000-000000000001','33333333-0000-4000-8000-000000000001','Hair Styling','Blow dry and styling.','Hair',35000,60,10),
('44444444-0000-4000-8000-000000000003','22222222-0000-4000-8000-000000000001','33333333-0000-4000-8000-000000000001','Hair Coloring','Full colour treatment.','Hair',80000,120,15),
('44444444-0000-4000-8000-000000000004','22222222-0000-4000-8000-000000000001','33333333-0000-4000-8000-000000000001','Manicure','Nail shaping and polish.','Nails',25000,40,5),
('44444444-0000-4000-8000-000000000005','22222222-0000-4000-8000-000000000001','33333333-0000-4000-8000-000000000001','Pedicure','Foot care and polish.','Nails',30000,50,5),
('44444444-0000-4000-8000-000000000006','22222222-0000-4000-8000-000000000002','33333333-0000-4000-8000-000000000003','Haircut','Classic or fade.','Hair',15000,30,5),
('44444444-0000-4000-8000-000000000007','22222222-0000-4000-8000-000000000002','33333333-0000-4000-8000-000000000003','Beard Trim','Shape, line up and oil.','Grooming',10000,20,5),
('44444444-0000-4000-8000-000000000008','22222222-0000-4000-8000-000000000002','33333333-0000-4000-8000-000000000003','Hair & Beard Package','Full grooming session.','Grooming',22000,50,10),
('44444444-0000-4000-8000-000000000009','22222222-0000-4000-8000-000000000003','33333333-0000-4000-8000-000000000004','Wedding Photography','Full day coverage.','Events',2500000,480,60),
('44444444-0000-4000-8000-000000000010','22222222-0000-4000-8000-000000000003','33333333-0000-4000-8000-000000000004','Portrait Session','Studio portrait session.','Studio',350000,90,30),
('44444444-0000-4000-8000-000000000011','22222222-0000-4000-8000-000000000003','33333333-0000-4000-8000-000000000004','Corporate Photography','Team and brand shoot.','Corporate',900000,240,30),
('44444444-0000-4000-8000-000000000012','22222222-0000-4000-8000-000000000004','33333333-0000-4000-8000-000000000005','General Consultation','Standard doctor consultation.','General',50000,30,10),
('44444444-0000-4000-8000-000000000013','22222222-0000-4000-8000-000000000004','33333333-0000-4000-8000-000000000005','Dental Consultation','Dental check and advice.','Dental',80000,45,10),
('44444444-0000-4000-8000-000000000014','22222222-0000-4000-8000-000000000004','33333333-0000-4000-8000-000000000005','Follow-up','Review appointment.','General',30000,20,5),
('44444444-0000-4000-8000-000000000015','22222222-0000-4000-8000-000000000005','33333333-0000-4000-8000-000000000006','Business Consultation','Deep dive on your business.','Advisory',200000,60,15),
('44444444-0000-4000-8000-000000000016','22222222-0000-4000-8000-000000000005','33333333-0000-4000-8000-000000000006','Strategy Session','Quarterly strategy workshop.','Advisory',450000,120,15),
('44444444-0000-4000-8000-000000000017','22222222-0000-4000-8000-000000000005','33333333-0000-4000-8000-000000000006','Career Consultation','One-on-one career coaching.','Coaching',120000,45,15);

insert into public.staff (id, business_id, location_id, name, email, phone, role) values
('55555555-0000-4000-8000-000000000001','22222222-0000-4000-8000-000000000001','33333333-0000-4000-8000-000000000001','Sarah Nakato','sarah@bellabeauty.co','+256 701 000 001','Senior Stylist'),
('55555555-0000-4000-8000-000000000002','22222222-0000-4000-8000-000000000001','33333333-0000-4000-8000-000000000001','Grace Achieng','grace@bellabeauty.co','+256 701 000 002','Nail Technician'),
('55555555-0000-4000-8000-000000000003','22222222-0000-4000-8000-000000000002','33333333-0000-4000-8000-000000000003','Denis Okello','denis@freshcut.co','+256 701 000 003','Master Barber'),
('55555555-0000-4000-8000-000000000004','22222222-0000-4000-8000-000000000002','33333333-0000-4000-8000-000000000003','Brian Mugisha','brian@freshcut.co','+256 701 000 004','Barber'),
('55555555-0000-4000-8000-000000000005','22222222-0000-4000-8000-000000000003','33333333-0000-4000-8000-000000000004','Peter Ssemwogerere','peter@focusphoto.co','+256 701 000 005','Lead Photographer'),
('55555555-0000-4000-8000-000000000006','22222222-0000-4000-8000-000000000004','33333333-0000-4000-8000-000000000005','Dr. Aisha Kimuli','aisha@primecare.co','+256 701 000 006','General Practitioner'),
('55555555-0000-4000-8000-000000000007','22222222-0000-4000-8000-000000000004','33333333-0000-4000-8000-000000000005','Dr. Tom Waiswa','tom@primecare.co','+256 701 000 007','Dentist'),
('55555555-0000-4000-8000-000000000008','22222222-0000-4000-8000-000000000005','33333333-0000-4000-8000-000000000006','Martha Alinda','martha@alphaconsulting.co','+256 701 000 008','Principal Consultant');

insert into public.staff_services (business_id, staff_id, service_id)
select s.business_id, s.id, sv.id from public.staff s join public.services sv on sv.business_id = s.business_id
where not (s.id = '55555555-0000-4000-8000-000000000002' and sv.category = 'Hair')
  and not (s.id = '55555555-0000-4000-8000-000000000006' and sv.category = 'Dental')
  and not (s.id = '55555555-0000-4000-8000-000000000007' and sv.category = 'General');

insert into public.working_hours (business_id, day_of_week, is_open, open_time, close_time, break_start, break_end)
select b.id, d, d between 1 and 6, '09:00'::time, case when d = 6 then '15:00'::time else '18:00'::time end, '13:00'::time, '14:00'::time
from public.businesses b cross join generate_series(0,6) d;

insert into public.customers (id, business_id, full_name, email, phone, notes) values
('66666666-0000-4000-8000-000000000001','22222222-0000-4000-8000-000000000001','Patricia Nabirye','patricia@example.com','+256 772 100 001','Prefers Saturday mornings.'),
('66666666-0000-4000-8000-000000000002','22222222-0000-4000-8000-000000000001','Joan Kirabo','joan@example.com','+256 772 100 002','Allergic to ammonia dyes.'),
('66666666-0000-4000-8000-000000000003','22222222-0000-4000-8000-000000000001','Ritah Namaganda','ritah@example.com','+256 772 100 003',null),
('66666666-0000-4000-8000-000000000004','22222222-0000-4000-8000-000000000002','Samuel Kato','samuel@example.com','+256 772 100 004','Regular every two weeks.'),
('66666666-0000-4000-8000-000000000005','22222222-0000-4000-8000-000000000002','Ivan Tumusiime','ivan@example.com','+256 772 100 005',null),
('66666666-0000-4000-8000-000000000006','22222222-0000-4000-8000-000000000002','Robert Ssali','robert@example.com','+256 772 100 006',null),
('66666666-0000-4000-8000-000000000007','22222222-0000-4000-8000-000000000003','Diana & Mark','diana@example.com','+256 772 100 007','Wedding in December.'),
('66666666-0000-4000-8000-000000000008','22222222-0000-4000-8000-000000000003','Kampala Tech Ltd','ops@kampalatech.example','+256 772 100 008','Annual corporate shoot.'),
('66666666-0000-4000-8000-000000000009','22222222-0000-4000-8000-000000000004','Esther Aine','esther@example.com','+256 772 100 009',null),
('66666666-0000-4000-8000-000000000010','22222222-0000-4000-8000-000000000004','Michael Owor','michael@example.com','+256 772 100 010','Follow-up required monthly.'),
('66666666-0000-4000-8000-000000000011','22222222-0000-4000-8000-000000000005','Brenda Atim','brenda@example.com','+256 772 100 011',null),
('66666666-0000-4000-8000-000000000012','22222222-0000-4000-8000-000000000005','Kevin Mubiru','kevin@example.com','+256 772 100 012','Scaling a logistics startup.');

insert into public.appointments (business_id, location_id, customer_id, service_id, staff_id, starts_at, ends_at, price, status, payment_status, source, notes)
select c.business_id, sv.location_id, c.id, sv.id, st.id,
  slot, slot + make_interval(mins => sv.duration_minutes),
  sv.price,
  (case when slot < now() then (array['completed','completed','completed','cancelled','no_show']::public.appointment_status[])[1 + (n % 5)]
        else (array['confirmed','confirmed','pending']::public.appointment_status[])[1 + (n % 3)] end),
  (case when slot < now() then 'successful'::public.payment_status else 'unpaid'::public.payment_status end),
  (case when n % 2 = 0 then 'public_booking' else 'dashboard' end),
  null
from (
  select c.*, row_number() over (partition by c.business_id order by c.id) as rn from public.customers c
) c
join lateral (
  select sv.* from public.services sv where sv.business_id = c.business_id order by sv.id offset ((c.rn::int) % 3) limit 1
) sv on true
join lateral (
  select st.* from public.staff st where st.business_id = c.business_id order by st.id limit 1
) st on true
cross join lateral (
  select n, date_trunc('hour', now()) + make_interval(days => (n - 6), hours => (n % 6) + 1) as slot
  from generate_series(1, 11) n
) g;

insert into public.subscriptions (business_id, plan_id, status, trial_ends_at, current_period_start, current_period_end) values
('22222222-0000-4000-8000-000000000001','11111111-0000-4000-8000-000000000003','active',null, now() - interval '10 days', now() + interval '20 days'),
('22222222-0000-4000-8000-000000000002','11111111-0000-4000-8000-000000000002','active',null, now() - interval '5 days', now() + interval '25 days'),
('22222222-0000-4000-8000-000000000003','11111111-0000-4000-8000-000000000002','trialing', now() + interval '9 days', now() - interval '5 days', now() + interval '9 days'),
('22222222-0000-4000-8000-000000000004','11111111-0000-4000-8000-000000000004','active',null, now() - interval '20 days', now() + interval '10 days'),
('22222222-0000-4000-8000-000000000005','11111111-0000-4000-8000-000000000001','trialing', now() + interval '18 days', now() - interval '12 days', now() + interval '18 days');

insert into public.payments (business_id, subscription_id, amount, currency, provider, method, reference, status, paid_at)
select s.business_id, s.id, p.price_monthly, p.currency, 'stripe', 'card', 'txn_' || substr(replace(s.id::text,'-',''),1,10), 'successful', now() - interval '10 days'
from public.subscriptions s join public.subscription_plans p on p.id = s.plan_id where p.price_monthly > 0;

insert into public.notification_templates (business_id, type, channel, subject, body) values
(null,'booking_confirmation','email','Your booking at {{business}} is confirmed','Hi {{customer}}, your {{service}} with {{staff}} is confirmed for {{datetime}}.'),
(null,'reminder','email','Reminder: {{service}} at {{business}}','Hi {{customer}}, this is a reminder for your {{service}} on {{datetime}}.'),
(null,'reminder','sms',null,'Reminder: {{service}} at {{business}} on {{datetime}}.'),
(null,'cancellation','email','Your appointment was cancelled','Hi {{customer}}, your {{service}} on {{datetime}} has been cancelled.'),
(null,'followup','whatsapp',null,'Thanks for visiting {{business}}, {{customer}}! Book again anytime: {{booking_url}}');