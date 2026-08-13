-- Run this in Supabase SQL Editor AFTER creating your admin user
-- Replace the email below with the exact email used for the admin account.

alter table public.mobiles enable row level security;

drop policy if exists "Public can view mobiles" on public.mobiles;
create policy "Public can view mobiles"
on public.mobiles for select
to anon, authenticated
using (true);

drop policy if exists "Admin can insert mobiles" on public.mobiles;
create policy "Admin can insert mobiles"
on public.mobiles for insert
to authenticated
with check ((auth.jwt() ->> 'email') = 'YOUR_ADMIN_EMAIL');

drop policy if exists "Admin can update mobiles" on public.mobiles;
create policy "Admin can update mobiles"
on public.mobiles for update
to authenticated
using ((auth.jwt() ->> 'email') = 'YOUR_ADMIN_EMAIL')
with check ((auth.jwt() ->> 'email') = 'YOUR_ADMIN_EMAIL');

drop policy if exists "Admin can delete mobiles" on public.mobiles;
create policy "Admin can delete mobiles"
on public.mobiles for delete
to authenticated
using ((auth.jwt() ->> 'email') = 'YOUR_ADMIN_EMAIL');


-- Image upload storage
-- Replace YOUR_ADMIN_EMAIL above with your real admin email before running.

insert into storage.buckets (id, name, public)
values ('mobile-images', 'mobile-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can view mobile images" on storage.objects;
create policy "Public can view mobile images"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'mobile-images');

drop policy if exists "Admin can upload mobile images" on storage.objects;
create policy "Admin can upload mobile images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'mobile-images'
  and (auth.jwt() ->> 'email') = 'YOUR_ADMIN_EMAIL'
);
