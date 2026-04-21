-- Run in Supabase SQL Editor (Dashboard → SQL) after creating a project.
-- Enable Anonymous sign-ins: Authentication → Providers → Anonymous → ON.

create table if not exists public.drawings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users (id) on delete cascade,
  author_display_name text not null,
  monster_json text not null,
  prompt_text text,
  image_path text not null
);

create index if not exists drawings_created_at_idx on public.drawings (created_at desc);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null,
  monster_json text not null,
  updated_at timestamptz not null default now()
);

-- Table UNIQUE(...) only allows column names, not expressions; use a unique index for case-insensitive names per user.
create unique index if not exists profiles_user_id_display_name_lower_key
  on public.profiles (user_id, lower(display_name));

create table if not exists public.drawing_likes (
  drawing_id uuid not null references public.drawings (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (drawing_id, user_id)
);

alter table public.drawings enable row level security;
alter table public.profiles enable row level security;
alter table public.drawing_likes enable row level security;

create policy "drawings_select_all" on public.drawings for select using (true);
create policy "drawings_insert_own" on public.drawings for insert with check (auth.uid() = user_id);
create policy "drawings_delete_own" on public.drawings for delete using (auth.uid() = user_id);

create policy "profiles_select_all" on public.profiles for select using (true);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = user_id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = user_id);
create policy "profiles_delete_own" on public.profiles for delete using (auth.uid() = user_id);

create policy "likes_select_all" on public.drawing_likes for select using (true);
create policy "likes_insert_own" on public.drawing_likes for insert with check (auth.uid() = user_id);
create policy "likes_delete_own" on public.drawing_likes for delete using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('drawing-images', 'drawing-images', true)
on conflict (id) do nothing;

create policy "Drawing images public read"
on storage.objects for select
using (bucket_id = 'drawing-images');

create policy "Drawing images auth upload"
on storage.objects for insert
with check (
  bucket_id = 'drawing-images'
  and (storage.foldername (name))[1] = auth.uid()::text
);

create policy "Drawing images auth update"
on storage.objects for update
using (
  bucket_id = 'drawing-images'
  and (storage.foldername (name))[1] = auth.uid()::text
);

create policy "Drawing images auth delete"
on storage.objects for delete
using (
  bucket_id = 'drawing-images'
  and (storage.foldername (name))[1] = auth.uid()::text
);
