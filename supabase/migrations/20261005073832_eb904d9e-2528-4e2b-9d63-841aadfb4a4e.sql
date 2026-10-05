drop policy "ss public read" on public.staff_services;
create policy "ss public read" on public.staff_services for select using (
  exists (select 1 from public.businesses b where b.id = business_id and b.is_published and not b.is_suspended)
);

drop policy "wh public read" on public.working_hours;
create policy "wh public read" on public.working_hours for select using (
  exists (select 1 from public.businesses b where b.id = business_id and b.is_published and not b.is_suspended)
);

drop policy "hol public read" on public.holidays;
create policy "hol public read" on public.holidays for select using (
  exists (select 1 from public.businesses b where b.id = business_id and b.is_published and not b.is_suspended)
);