-- Allow admins to read all products (including hidden/removed)
create policy "Admins can read all products"
  on public.products for select using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );
