-- ============================================================
--   BLUE-RAY ADMIN — Supabase migration
--   Run this in your Supabase project → SQL Editor → New query
-- ============================================================
-- This migration adds the tables, columns and security policies
-- needed for the admin panel:
--   1. Adds status / notes / replied_at to contact_submissions
--   2. Creates site_settings (key/value editable on the site)
--   3. Creates projects (gallery, admin-managed)
--   4. Creates news_posts (announcements / blog)
--   5. Creates a Storage bucket for uploaded images
--   6. Sets up Row Level Security so:
--      - Public (anonymous) visitors can only READ published content
--      - Logged-in admins can read & write everything
-- ============================================================

-- ----------------------------------------------------------------
-- 1. Update contact_submissions for inbox features
-- ----------------------------------------------------------------
alter table public.contact_submissions
  add column if not exists status text not null default 'new'
    check (status in ('new', 'replied', 'archived')),
  add column if not exists admin_notes text,
  add column if not exists replied_at timestamptz;

-- Allow authenticated users (admins) to read, update, delete submissions.
-- Anonymous visitors can still INSERT (as before) — that policy already exists.
drop policy if exists "Admins read submissions"   on public.contact_submissions;
drop policy if exists "Admins update submissions" on public.contact_submissions;
drop policy if exists "Admins delete submissions" on public.contact_submissions;

create policy "Admins read submissions"
  on public.contact_submissions for select
  to authenticated using (true);

create policy "Admins update submissions"
  on public.contact_submissions for update
  to authenticated using (true) with check (true);

create policy "Admins delete submissions"
  on public.contact_submissions for delete
  to authenticated using (true);


-- ----------------------------------------------------------------
-- 2. site_settings (editable strings used on the public site)
-- ----------------------------------------------------------------
create table if not exists public.site_settings (
  key         text primary key,
  value       text,
  label       text not null,            -- friendly label shown in the admin form
  group_name  text not null default 'general',
  type        text not null default 'text' check (type in ('text','textarea','number')),
  sort_order  int  not null default 100,
  updated_at  timestamptz not null default now()
);

alter table public.site_settings enable row level security;

drop policy if exists "Public reads site_settings"  on public.site_settings;
drop policy if exists "Admins write site_settings"  on public.site_settings;

create policy "Public reads site_settings"
  on public.site_settings for select
  to anon, authenticated using (true);

create policy "Admins write site_settings"
  on public.site_settings for all
  to authenticated using (true) with check (true);

-- Seed initial settings (only inserts if missing — safe to re-run)
insert into public.site_settings (key, value, label, group_name, type, sort_order) values
  ('phone_primary',   '+232-78-746182',                                          'Primary phone',           'contact', 'text',     10),
  ('phone_secondary', '+232-88-746182',                                          'Secondary phone',         'contact', 'text',     20),
  ('email_primary',   'info@blueraysl.com',                                      'Primary email',           'contact', 'text',     30),
  ('email_md',        'md@blueraysl.com',                                        'Managing Director email', 'contact', 'text',     40),
  ('email_secondary', 'blueraysl.co@gmail.com',                                  'Backup email',            'contact', 'text',     50),
  ('address_line1',   '5 Fort Street State Avenue',                              'Office address line 1',   'contact', 'text',     60),
  ('address_line2',   'Freetown, Sierra Leone',                                  'Office address line 2',   'contact', 'text',     70),
  ('hours_line1',     'Monday – Friday',                                         'Office hours, line 1',    'contact', 'text',     80),
  ('hours_line2',     '8:30 AM – 5:30 PM (GMT)',                                 'Office hours, line 2',    'contact', 'text',     90),
  ('stat_years',      '9',                                                       'Years in operation',      'stats',   'number', 110),
  ('stat_projects',   '25',                                                      'Projects delivered',      'stats',   'number', 120),
  ('stat_markets',    '6',                                                       'West African markets',    'stats',   'number', 130),
  ('stat_clients',    '6',                                                       'Government clients',      'stats',   'number', 140),
  ('hero_eyebrow',    'Indigenous · Trusted · Across West Africa',               'Hero eyebrow text',       'hero',    'text',   200),
  ('hero_title_1',    'Building West Africa''s',                                 'Hero headline (1st line)','hero',    'text',   210),
  ('hero_title_2',    'Roads, Bridges & Future.',                                'Hero headline (accent)',  'hero',    'text',   220),
  ('hero_subtitle',   'Headquartered in Freetown, Sierra Leone — with regional expansion across Liberia, Guinea, Ghana, Senegal and Nigeria. Blue-Ray delivers construction, mining and engineering projects that governments, multinationals and private owners can rely on.', 'Hero sub-text', 'hero', 'textarea', 230)
on conflict (key) do nothing;


-- ----------------------------------------------------------------
-- 3. projects (admin-editable gallery)
-- ----------------------------------------------------------------
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  caption     text,
  category    text not null default 'roads' check (category in ('roads','bridges','buildings','industrial','mining')),
  image_url   text not null,
  featured    boolean not null default false,
  status      text not null default 'published' check (status in ('draft','published')),
  sort_order  int not null default 100,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.projects enable row level security;

drop policy if exists "Public reads published projects" on public.projects;
drop policy if exists "Admins write projects"           on public.projects;

create policy "Public reads published projects"
  on public.projects for select
  to anon using (status = 'published');

create policy "Admins read all projects"
  on public.projects for select
  to authenticated using (true);

create policy "Admins write projects"
  on public.projects for all
  to authenticated using (true) with check (true);


-- ----------------------------------------------------------------
-- 4. news_posts (announcements / blog)
-- ----------------------------------------------------------------
create table if not exists public.news_posts (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  title         text not null,
  excerpt       text,
  body          text,
  image_url     text,
  status        text not null default 'draft' check (status in ('draft','published')),
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.news_posts enable row level security;

drop policy if exists "Public reads published news" on public.news_posts;
drop policy if exists "Admins write news"           on public.news_posts;

create policy "Public reads published news"
  on public.news_posts for select
  to anon using (status = 'published');

create policy "Admins read all news"
  on public.news_posts for select
  to authenticated using (true);

create policy "Admins write news"
  on public.news_posts for all
  to authenticated using (true) with check (true);


-- ----------------------------------------------------------------
-- 5. Storage bucket for uploaded images
-- ----------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('site-images', 'site-images', true)
on conflict (id) do nothing;

-- Allow public read on the bucket
drop policy if exists "Public read site-images"   on storage.objects;
drop policy if exists "Admins write site-images"  on storage.objects;

create policy "Public read site-images"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'site-images');

create policy "Admins write site-images"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'site-images')
  with check (bucket_id = 'site-images');


-- ----------------------------------------------------------------
-- 6. updated_at triggers
-- ----------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_site_settings_updated on public.site_settings;
create trigger trg_site_settings_updated
  before update on public.site_settings
  for each row execute function public.set_updated_at();

drop trigger if exists trg_projects_updated on public.projects;
create trigger trg_projects_updated
  before update on public.projects
  for each row execute function public.set_updated_at();

drop trigger if exists trg_news_posts_updated on public.news_posts;
create trigger trg_news_posts_updated
  before update on public.news_posts
  for each row execute function public.set_updated_at();
