-- Mirrors new Supabase Auth signups into a public `users` row and gives
-- every new user a personal organization, so app code always has an
-- organization_id to scope data to (see PRD Section 10 note on orgs).

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  plan text not null default 'free',
  created_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references public.users(id),
  plan text not null default 'free',
  created_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'owner',
  primary key (organization_id, user_id)
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  new_org_id uuid;
begin
  insert into public.users (id, email)
  values (new.id, new.email);

  insert into public.organizations (name, owner_id)
  values (coalesce(new.email, 'My workspace'), new.id)
  returning id into new_org_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (new_org_id, new.id, 'owner');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.users enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

create policy "users can read own row" on public.users
  for select using (id = auth.uid());

create policy "users can read own orgs" on public.organizations
  for select using (
    id in (select organization_id from public.organization_members where user_id = auth.uid())
  );

create policy "users can read own membership" on public.organization_members
  for select using (user_id = auth.uid());
