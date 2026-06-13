-- 004: Review workflow, demo day curation, and RLS hardening
--
-- This migration turns the immediate-publish model into a reviewed model and
-- adds admin-curated demo day selections, while closing two privilege-
-- escalation holes in the original RLS policies.

------------------------------------------------------------
-- 1. Product review workflow
------------------------------------------------------------
-- Extend the status vocabulary:
--   pending   -> submitted, awaiting admin review (new default)
--   live      -> approved & publicly visible
--   rejected  -> declined by an admin
--   hidden    -> temporarily hidden by an admin
--   removed   -> withdrawn/removed
alter table public.products drop constraint if exists products_status_check;
alter table public.products
  add constraint products_status_check
  check (status in ('pending', 'live', 'hidden', 'removed', 'rejected'));

-- New submissions wait for admin approval before going public.
alter table public.products alter column status set default 'pending';

-- Builders must be able to read their own products in any status (e.g. while
-- pending review). The original policies only exposed live products publicly
-- and all products to admins, which would hide a builder's own pending work.
drop policy if exists "Builders can read their own products" on public.products;
create policy "Builders can read their own products"
  on public.products for select using (auth.uid() = builder_id);

------------------------------------------------------------
-- 2. Harden profiles: prevent self-promotion to admin
--
-- The original "Users can update their own profile" policy let any
-- authenticated user set is_admin = true on their own row. This trigger keeps
-- the is_admin flag immutable unless the change is made by an existing admin or
-- via a privileged (service role / SQL editor) connection where auth.uid() is null.
------------------------------------------------------------
create or replace function public.protect_admin_flag()
returns trigger as $$
begin
  if new.is_admin is distinct from old.is_admin
     and auth.uid() is not null
     and not exists (
       select 1 from public.profiles p
       where p.id = auth.uid() and p.is_admin = true
     )
  then
    new.is_admin := old.is_admin; -- silently ignore unauthorized change
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists protect_admin_flag_trigger on public.profiles;
create trigger protect_admin_flag_trigger
  before update on public.profiles
  for each row execute function public.protect_admin_flag();

------------------------------------------------------------
-- 3. Harden products: only admins approve / feature
--
-- The original "Builders can update their own products" policy let a builder
-- self-approve by setting status = 'live'. This trigger restricts status
-- transitions: admins (or privileged connections) can set any status, builders
-- may only withdraw their own product (status = 'removed'), and any other
-- status change by a builder is ignored.
------------------------------------------------------------
create or replace function public.protect_product_status()
returns trigger as $$
begin
  if new.status is distinct from old.status then
    if auth.uid() is null
       or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
    then
      return new; -- service role / SQL editor / admin: allowed
    elsif auth.uid() = old.builder_id and new.status = 'removed' then
      return new; -- builders may withdraw their own product
    else
      new.status := old.status; -- ignore unauthorized status change
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists protect_product_status_trigger on public.products;
create trigger protect_product_status_trigger
  before update on public.products
  for each row execute function public.protect_product_status();

------------------------------------------------------------
-- 4. Demo day curation: admin-selected projects per demo day
--
-- demo_day_winners (from migration 001) stays as the automatic top-3 snapshot.
-- demo_day_projects is the manual line-up an admin curates for a demo day.
------------------------------------------------------------
create table if not exists public.demo_day_projects (
  week_of date references public.demo_days(week_of) on delete cascade not null,
  product_id uuid references public.products(id) on delete cascade not null,
  display_order int not null default 0,
  status text not null default 'selected'
    check (status in ('selected', 'presented', 'cancelled')),
  created_at timestamptz default now(),
  primary key (week_of, product_id)
);

alter table public.demo_day_projects enable row level security;

create policy "Demo day projects are publicly readable"
  on public.demo_day_projects for select using (true);

create policy "Only admins can manage demo day projects"
  on public.demo_day_projects for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create index if not exists idx_demo_day_projects_week
  on public.demo_day_projects (week_of);
create index if not exists idx_demo_day_projects_product
  on public.demo_day_projects (product_id);
