begin;

-- ============================================================
-- LOCAL DEVELOPMENT ADMIN ONLY
-- Never run this seed against staging or production. The
-- credential below is intentionally fixed for local testing.
-- ============================================================

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
values (
  '00000000-0000-0000-0000-000000000000'::uuid,
  '00000000-0000-4000-8000-000000000001'::uuid,
  'authenticated',
  'authenticated',
  'admin1@gmail.com',
  extensions.crypt('admin@123456', extensions.gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"name": "Admin1"}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
)
on conflict (id) do update
set
  email = excluded.email,
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = excluded.email_confirmed_at,
  raw_app_meta_data = excluded.raw_app_meta_data,
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = now();

insert into auth.identities (
  id,
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
values (
  '00000000-0000-4000-8000-000000000001'::uuid,
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001'::uuid,
  jsonb_build_object(
    'sub', '00000000-0000-4000-8000-000000000001',
    'email', 'admin1@gmail.com',
    'email_verified', true,
    'phone_verified', false
  ),
  'email',
  now(),
  now(),
  now()
)
on conflict (provider_id, provider) do update
set
  identity_data = excluded.identity_data,
  updated_at = now();

insert into public.profiles (
  user_id,
  name,
  email,
  role,
  status
)
values (
  '00000000-0000-4000-8000-000000000001'::uuid,
  'Admin1',
  'admin1@gmail.com',
  'admin',
  'active'
)
on conflict (user_id) do update
set
  name = excluded.name,
  email = excluded.email,
  role = excluded.role,
  status = excluded.status;

-- ============================================================
-- Venues
-- ============================================================

insert into public.venues (
  venue_id,
  name,
  venue_type,
  total_capacity,
  layout,
  created_at
)
values (
  'dda1239b-d6e9-491c-a1b2-ceb486d6a979'::uuid,
  'Axiata Arena',
  'arena',
  12000,
  '{"stage": {"h": 110, "w": 300, "x": 350, "y": 70}}'::jsonb,
  '2026-07-01 12:33:35.246136+00'::timestamptz
)
on conflict (venue_id) do update
set
  name = excluded.name,
  venue_type = excluded.venue_type,
  total_capacity = excluded.total_capacity,
  layout = excluded.layout;

insert into public.venues (
  venue_id,
  name,
  venue_type,
  total_capacity,
  layout,
  created_at
)
values (
  '2fae62b9-4032-4226-86fd-dc622c9377f2'::uuid,
  'Stadium Merdeka',
  'stadium',
  20000,
  '{"stage": {"h": 120, "w": 300, "x": 350, "y": 60}}'::jsonb,
  '2026-07-01 12:33:35.246136+00'::timestamptz
)
on conflict (venue_id) do update
set
  name = excluded.name,
  venue_type = excluded.venue_type,
  total_capacity = excluded.total_capacity,
  layout = excluded.layout;

-- ============================================================
-- Venue zones
-- ============================================================

insert into public.venue_zones (
  zone_id,
  venue_id,
  code,
  label,
  capacity,
  category,
  shape,
  created_at
)
values
  (
    'e5c2b22b-8835-46a7-ae66-b7654b96d600'::uuid,
    '2fae62b9-4032-4226-86fd-dc622c9377f2'::uuid,
    'FLD',
    'Field (GA)',
    8000,
    'standing',
    '{"h": 520, "w": 440, "x": 280, "y": 250, "type": "rect"}'::jsonb,
    '2026-07-01 12:33:35.246136+00'::timestamptz
  ),
  (
    'c0404d36-2300-4ffd-842a-7837508c2424'::uuid,
    '2fae62b9-4032-4226-86fd-dc622c9377f2'::uuid,
    'GS-L',
    'Grandstand Left',
    3000,
    'seated',
    '{"h": 500, "w": 180, "x": 60, "y": 250, "type": "rect"}'::jsonb,
    '2026-07-01 12:33:35.246136+00'::timestamptz
  ),
  (
    'ecab872c-817e-4af1-a36f-f8be4cfe2bef'::uuid,
    '2fae62b9-4032-4226-86fd-dc622c9377f2'::uuid,
    'GS-R',
    'Grandstand Right',
    3000,
    'seated',
    '{"h": 500, "w": 180, "x": 760, "y": 250, "type": "rect"}'::jsonb,
    '2026-07-01 12:33:35.246136+00'::timestamptz
  ),
  (
    '525ef8c8-4e6f-4abe-ae3d-e4a91d159cbf'::uuid,
    'dda1239b-d6e9-491c-a1b2-ceb486d6a979'::uuid,
    'A',
    'Zone A',
    300,
    'seated',
    '{"h": 130, "w": 400, "x": 300, "y": 240, "type": "rect"}'::jsonb,
    '2026-07-01 12:33:35.246136+00'::timestamptz
  ),
  (
    '4bad097f-bbf1-4ab6-a676-10140d7b47aa'::uuid,
    'dda1239b-d6e9-491c-a1b2-ceb486d6a979'::uuid,
    'B',
    'Zone B',
    500,
    'seated',
    '{"h": 150, "w": 500, "x": 250, "y": 420, "type": "rect"}'::jsonb,
    '2026-07-01 12:33:35.246136+00'::timestamptz
  ),
  (
    '596626ab-f054-4d1c-8205-aa675ed732f2'::uuid,
    'dda1239b-d6e9-491c-a1b2-ceb486d6a979'::uuid,
    'C',
    'Zone C',
    300,
    'seated',
    '{"h": 150, "w": 400, "x": 300, "y": 620, "type": "rect"}'::jsonb,
    '2026-07-01 12:33:35.246136+00'::timestamptz
  ),
  (
    '30e024a9-6df6-4804-841d-18ff09a41521'::uuid,
    'dda1239b-d6e9-491c-a1b2-ceb486d6a979'::uuid,
    'D',
    'Zone D',
    500,
    'seated',
    '{"h": 510, "w": 150, "x": 80, "y": 260, "type": "rect"}'::jsonb,
    '2026-07-01 12:33:35.246136+00'::timestamptz
  ),
  (
    '6a008d57-c98c-4f14-bc51-ff89773c514a'::uuid,
    'dda1239b-d6e9-491c-a1b2-ceb486d6a979'::uuid,
    'E',
    'Zone E',
    500,
    'seated',
    '{"h": 510, "w": 150, "x": 770, "y": 260, "type": "rect"}'::jsonb,
    '2026-07-01 12:33:35.246136+00'::timestamptz
  )
on conflict (zone_id) do update
set
  venue_id = excluded.venue_id,
  code = excluded.code,
  label = excluded.label,
  capacity = excluded.capacity,
  category = excluded.category,
  shape = excluded.shape;

-- ============================================================
-- Seed verification
-- Abort and roll back the seed if any required demo record is missing.
-- ============================================================

do $$
declare
  seeded_venue_count integer;
  seeded_zone_count integer;
begin
  if not exists (
    select 1
    from auth.users
    where id = '00000000-0000-4000-8000-000000000001'::uuid
      and email = 'admin1@gmail.com'
      and encrypted_password is not null
      and extensions.crypt('admin@123456', encrypted_password) = encrypted_password
  ) then
    raise exception 'Seed verification failed: the login-capable admin Auth user is missing.';
  end if;

  if not exists (
    select 1
    from auth.identities
    where user_id = '00000000-0000-4000-8000-000000000001'::uuid
      and provider = 'email'
  ) then
    raise exception 'Seed verification failed: the admin email identity is missing.';
  end if;

  if not exists (
    select 1
    from public.profiles
    where user_id = '00000000-0000-4000-8000-000000000001'::uuid
      and email = 'admin1@gmail.com'
      and role = 'admin'
      and status = 'active'
  ) then
    raise exception 'Seed verification failed: the active admin profile is missing.';
  end if;

  select count(*)
  into seeded_venue_count
  from public.venues
  where venue_id in (
    'dda1239b-d6e9-491c-a1b2-ceb486d6a979'::uuid,
    '2fae62b9-4032-4226-86fd-dc622c9377f2'::uuid
  );

  if seeded_venue_count <> 2 then
    raise exception 'Seed verification failed: expected 2 venues, found %.', seeded_venue_count;
  end if;

  select count(*)
  into seeded_zone_count
  from public.venue_zones
  where zone_id in (
    'e5c2b22b-8835-46a7-ae66-b7654b96d600'::uuid,
    'c0404d36-2300-4ffd-842a-7837508c2424'::uuid,
    'ecab872c-817e-4af1-a36f-f8be4cfe2bef'::uuid,
    '525ef8c8-4e6f-4abe-ae3d-e4a91d159cbf'::uuid,
    '4bad097f-bbf1-4ab6-a676-10140d7b47aa'::uuid,
    '596626ab-f054-4d1c-8205-aa675ed732f2'::uuid,
    '30e024a9-6df6-4804-841d-18ff09a41521'::uuid,
    '6a008d57-c98c-4f14-bc51-ff89773c514a'::uuid
  );

  if seeded_zone_count <> 8 then
    raise exception 'Seed verification failed: expected 8 venue zones, found %.', seeded_zone_count;
  end if;
end
$$;

commit;
