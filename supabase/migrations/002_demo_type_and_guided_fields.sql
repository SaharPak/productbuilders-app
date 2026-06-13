-- Add demo type: builders choose live demo or feedback-only
alter table public.products
  add column demo_type text not null default 'feedback_only'
    check (demo_type in ('live_demo', 'feedback_only'));

-- Which Friday they want to demo (null for feedback_only)
alter table public.products
  add column demo_week date;

-- Demo language preference (for live demos)
alter table public.products
  add column demo_language text check (demo_language in ('farsi', 'english'));

-- Guided submission fields
alter table public.products
  add column problem text check (char_length(problem) <= 500);

alter table public.products
  add column audience text check (char_length(audience) <= 300);

-- Update the view to include new columns (demo_type, demo_week, demo_language, problem, audience)
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
