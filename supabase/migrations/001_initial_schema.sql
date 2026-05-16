-- Product Builders — initial schema

-- Profiles (extends auth.users)
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null,
  handle text unique,
  avatar_url text,
  bio text,
  is_admin boolean default false,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are publicly readable"
  on public.profiles for select using (true);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Products
create table public.products (
  id uuid primary key default gen_random_uuid(),
  builder_id uuid references public.profiles not null,
  name text not null check (char_length(name) <= 50),
  tagline text not null check (char_length(tagline) <= 120),
  description text check (char_length(description) <= 1000),
  url text,
  image_url text,
  category text not null check (category in ('AI', 'Developer Tool', 'Web App', 'Mobile', 'Community', 'Other')),
  stage text not null check (stage in ('idea', 'building', 'launched')),
  status text default 'live' check (status in ('live', 'hidden', 'removed')),
  week_of date not null,
  created_at timestamptz default now()
);

alter table public.products enable row level security;

create policy "Live products are publicly readable"
  on public.products for select using (status = 'live');

create policy "Authenticated users can submit products"
  on public.products for insert with check (auth.uid() = builder_id);

create policy "Builders can update their own products"
  on public.products for update using (auth.uid() = builder_id);

create policy "Admins can update any product"
  on public.products for update using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- Votes
create table public.votes (
  user_id uuid references public.profiles not null,
  product_id uuid references public.products not null,
  created_at timestamptz default now(),
  primary key (user_id, product_id)
);

alter table public.votes enable row level security;

create policy "Votes are publicly readable"
  on public.votes for select using (true);

create policy "Authenticated users can vote"
  on public.votes for insert with check (auth.uid() = user_id);

create policy "Users can remove their own votes"
  on public.votes for delete using (auth.uid() = user_id);

-- Comments
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products not null,
  author_id uuid references public.profiles not null,
  body text not null check (char_length(body) <= 500),
  status text default 'live' check (status in ('live', 'hidden')),
  created_at timestamptz default now()
);

alter table public.comments enable row level security;

create policy "Live comments are publicly readable"
  on public.comments for select using (status = 'live');

create policy "Authenticated users can comment"
  on public.comments for insert with check (auth.uid() = author_id);

create policy "Authors can update their own comments"
  on public.comments for update using (auth.uid() = author_id);

create policy "Admins can update any comment"
  on public.comments for update using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- Demo days
create table public.demo_days (
  week_of date primary key,
  demo_date timestamptz not null,
  status text default 'upcoming' check (status in ('upcoming', 'completed')),
  notes text,
  recording_url text
);

alter table public.demo_days enable row level security;

create policy "Demo days are publicly readable"
  on public.demo_days for select using (true);

create policy "Only admins can manage demo days"
  on public.demo_days for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- Demo day winners
create table public.demo_day_winners (
  week_of date references public.demo_days not null,
  rank smallint not null check (rank between 1 and 3),
  product_id uuid references public.products not null,
  vote_count integer not null,
  primary key (week_of, rank)
);

alter table public.demo_day_winners enable row level security;

create policy "Winners are publicly readable"
  on public.demo_day_winners for select using (true);

create policy "Only admins can manage winners"
  on public.demo_day_winners for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- View: products with counts
create or replace view public.product_with_counts as
select
  p.*,
  coalesce(v.vote_count, 0)::int as vote_count,
  coalesce(c.comment_count, 0)::int as comment_count,
  jsonb_build_object(
    'display_name', pr.display_name,
    'handle', pr.handle,
    'avatar_url', pr.avatar_url
  ) as builder
from public.products p
left join (
  select product_id, count(*)::int as vote_count
  from public.votes group by product_id
) v on v.product_id = p.id
left join (
  select product_id, count(*)::int as comment_count
  from public.comments where status = 'live' group by product_id
) c on c.product_id = p.id
left join public.profiles pr on pr.id = p.builder_id
where p.status = 'live';

-- Helper: current week Monday
create or replace function public.current_week() returns date as $$
  select date_trunc('week', now() at time zone 'Europe/Helsinki')::date;
$$ language sql stable;

-- Rate limit: max 3 products per user per week
create or replace function public.check_submission_rate_limit()
returns trigger as $$
begin
  if (
    select count(*) from public.products
    where builder_id = new.builder_id and week_of = new.week_of
  ) >= 3 then
    raise exception 'Maximum 3 submissions per week';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger enforce_submission_rate_limit
  before insert on public.products
  for each row execute function public.check_submission_rate_limit();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Builder'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Indexes
create index idx_products_week_of on public.products (week_of);
create index idx_products_builder_id on public.products (builder_id);
create index idx_products_status on public.products (status);
create index idx_votes_product_id on public.votes (product_id);
create index idx_comments_product_id on public.comments (product_id);

-- Enable realtime for votes
alter publication supabase_realtime add table public.votes;
