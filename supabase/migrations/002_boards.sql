-- Phase 3 migration: add boards table, repoint clusters to board_id, update RLS.
-- Run this once in the Supabase SQL editor (or via the CLI) on the Synapse project.
-- Assumes Phase 1 (projects, clusters, topics tables) is already in place and that
-- clusters/topics contain no production data (test data was cleared per memory).

-- 1. Boards table -----------------------------------------------------------
create table if not exists public.boards (
  id              uuid primary key default gen_random_uuid(),
  user_id         text not null,                                                -- Clerk subject (jwt.sub)
  project_id      uuid references public.projects(id) on delete set null,       -- nullable: unfiled boards live at root
  name            text not null default 'Untitled board',
  starred         boolean not null default false,
  last_opened_at  timestamptz not null default now(),
  deleted_at      timestamptz,                                                  -- soft delete
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists boards_user_id_idx
  on public.boards(user_id)
  where deleted_at is null;

create index if not exists boards_user_last_opened_idx
  on public.boards(user_id, last_opened_at desc)
  where deleted_at is null;

create index if not exists boards_project_id_idx
  on public.boards(project_id)
  where deleted_at is null;

-- 2. updated_at trigger -----------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists boards_touch on public.boards;
create trigger boards_touch
  before update on public.boards
  for each row execute function public.touch_updated_at();

-- 3. Repoint clusters: project_id -> board_id -------------------------------
-- Safe because test data was cleared. If you ever need to keep data, backfill
-- a default board per project first, then drop project_id.
alter table public.clusters add column if not exists board_id uuid;
alter table public.clusters
  add constraint clusters_board_id_fkey
  foreign key (board_id) references public.boards(id) on delete cascade
  not valid;                                                                  -- skip validation against any orphan rows
alter table public.clusters validate constraint clusters_board_id_fkey;

alter table public.clusters drop column if exists project_id;

create index if not exists clusters_board_id_idx on public.clusters(board_id);

-- 4. RLS on boards ----------------------------------------------------------
alter table public.boards enable row level security;

drop policy if exists "boards owner all" on public.boards;
create policy "boards owner all"
  on public.boards for all
  using       (user_id = auth.jwt() ->> 'sub')
  with check  (user_id = auth.jwt() ->> 'sub');

-- 5. Re-issue clusters/topics RLS to traverse via board ---------------------
-- Drop any existing policies on clusters/topics first (names may vary from the
-- permissive Phase 1 policies; this catches the common variants).
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies where schemaname='public' and tablename='clusters'
  loop
    execute format('drop policy %I on public.clusters', pol.policyname);
  end loop;
  for pol in
    select policyname from pg_policies where schemaname='public' and tablename='topics'
  loop
    execute format('drop policy %I on public.topics', pol.policyname);
  end loop;
end $$;

create policy "clusters via board"
  on public.clusters for all
  using (
    exists (
      select 1 from public.boards b
      where b.id = clusters.board_id
        and b.user_id = auth.jwt() ->> 'sub'
    )
  )
  with check (
    exists (
      select 1 from public.boards b
      where b.id = clusters.board_id
        and b.user_id = auth.jwt() ->> 'sub'
    )
  );

create policy "topics via cluster"
  on public.topics for all
  using (
    exists (
      select 1 from public.clusters c
      join public.boards b on b.id = c.board_id
      where c.id = topics.cluster_id
        and b.user_id = auth.jwt() ->> 'sub'
    )
  )
  with check (
    exists (
      select 1 from public.clusters c
      join public.boards b on b.id = c.board_id
      where c.id = topics.cluster_id
        and b.user_id = auth.jwt() ->> 'sub'
    )
  );

-- 6. Update projects RLS to use Clerk JWT too (keeps Phase 1 consistent) ----
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies where schemaname='public' and tablename='projects'
  loop
    execute format('drop policy %I on public.projects', pol.policyname);
  end loop;
end $$;

create policy "projects owner all"
  on public.projects for all
  using       (user_id = auth.jwt() ->> 'sub')
  with check  (user_id = auth.jwt() ->> 'sub');
