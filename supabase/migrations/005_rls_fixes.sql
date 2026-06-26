-- RLS fixes: builder self-read, live-only votes/comments, demo archive visibility

CREATE POLICY "Builders can read their own products"
  ON public.products FOR SELECT
  USING (auth.uid() = builder_id);

CREATE POLICY "Demo winner products are publicly readable"
  ON public.products FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.demo_day_winners w
      WHERE w.product_id = products.id
    )
  );

DROP POLICY IF EXISTS "Authenticated users can vote" ON public.votes;
CREATE POLICY "Authenticated users can vote on live products"
  ON public.votes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.products
      WHERE id = product_id AND status = 'live'
    )
  );

DROP POLICY IF EXISTS "Authenticated users can comment" ON public.comments;
CREATE POLICY "Authenticated users can comment on live products"
  ON public.comments FOR INSERT
  WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1 FROM public.products
      WHERE id = product_id AND status = 'live'
    )
  );

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_bio_length
  CHECK (bio IS NULL OR char_length(bio) <= 200);
