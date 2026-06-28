-- ============================================================================
-- CalorieDef — Household sharing setup
-- Run this ONCE in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Safe to re-run (idempotent). It:
--   1. Creates households + household_members tables
--   2. Adds helper + RPC functions (security definer)
--   3. Adds household_id to app_state and migrates existing rows
--   4. Rewrites Row Level Security so a row is shared by everyone in its household
-- ============================================================================

-- 1. TABLES ------------------------------------------------------------------
create table if not exists public.households (
  id          uuid primary key default gen_random_uuid(),
  invite_code text unique not null default upper(substr(md5(random()::text), 1, 6)),
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null default 'member',
  joined_at    timestamptz not null default now(),
  primary key (household_id, user_id)
);

-- Lock these down: no direct table access — everything goes through the
-- security-definer functions below.
alter table public.households        enable row level security;
alter table public.household_members enable row level security;

-- 2. HELPER + RPC FUNCTIONS --------------------------------------------------

-- Is the current user a member of this household? (used by app_state RLS)
create or replace function public.is_household_member(hid uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from public.household_members m
    where m.household_id = hid and m.user_id = auth.uid()
  );
$$;

-- Return the caller's household id, creating a household for them if they have none.
create or replace function public.ensure_household()
returns uuid language plpgsql security definer
set search_path = public as $$
declare hid uuid;
begin
  select household_id into hid
    from public.household_members where user_id = auth.uid() limit 1;
  if hid is null then
    insert into public.households(created_by) values (auth.uid()) returning id into hid;
    insert into public.household_members(household_id, user_id, role)
      values (hid, auth.uid(), 'owner');
  end if;
  return hid;
end;
$$;

-- Join an existing household by its invite code. Returns the household id, or null if the code is unknown.
create or replace function public.join_household(code text)
returns uuid language plpgsql security definer
set search_path = public as $$
declare hid uuid;
begin
  select id into hid from public.households where invite_code = upper(trim(code));
  if hid is null then return null; end if;
  insert into public.household_members(household_id, user_id, role)
    values (hid, auth.uid(), 'member')
    on conflict (household_id, user_id) do nothing;
  return hid;
end;
$$;

-- The caller's household id, invite code and role.
create or replace function public.my_household()
returns table(household_id uuid, invite_code text, role text)
language sql security definer stable
set search_path = public as $$
  select h.id, h.invite_code, m.role
  from public.household_members m
  join public.households h on h.id = m.household_id
  where m.user_id = auth.uid()
  limit 1;
$$;

grant execute on function public.is_household_member(uuid) to authenticated;
grant execute on function public.ensure_household()       to authenticated;
grant execute on function public.join_household(text)     to authenticated;
grant execute on function public.my_household()           to authenticated;

-- 3. app_state: add household_id + migrate existing rows ----------------------
alter table public.app_state add column if not exists household_id uuid references public.households(id) on delete cascade;
create unique index if not exists app_state_household_uidx on public.app_state(household_id);

-- Give every existing (user-keyed) row its own household, owned by that user.
do $$
declare r record; hid uuid;
begin
  for r in select * from public.app_state where household_id is null and user_id is not null loop
    insert into public.households(created_by) values (r.user_id) returning id into hid;
    insert into public.household_members(household_id, user_id, role)
      values (hid, r.user_id, 'owner') on conflict do nothing;
    update public.app_state set household_id = hid where ctid = r.ctid;
  end loop;
end;
$$;

-- 4. app_state RLS: access is by household membership ------------------------
alter table public.app_state enable row level security;

drop policy if exists app_state_household_select on public.app_state;
drop policy if exists app_state_household_insert on public.app_state;
drop policy if exists app_state_household_update on public.app_state;

create policy app_state_household_select on public.app_state
  for select using (public.is_household_member(household_id));
create policy app_state_household_insert on public.app_state
  for insert with check (public.is_household_member(household_id));
create policy app_state_household_update on public.app_state
  for update using (public.is_household_member(household_id))
              with check (public.is_household_member(household_id));

-- Done. Existing single-user policies (user_id = auth.uid()) can stay; they are
-- additive and harmless, but you may drop them once household sync is confirmed.
