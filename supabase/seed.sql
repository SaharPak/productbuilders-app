-- Seed data for Product Builders
-- Creates an admin user and 5 sample products with votes and comments

-- Note: Run this AFTER the migration. You'll need to create the admin user
-- through Supabase Auth first (or use the dashboard), then update the UUID below.

-- Insert admin profile (replace UUID with your actual auth.users id)
-- INSERT INTO public.profiles (id, display_name, handle, bio, is_admin)
-- VALUES ('YOUR-AUTH-USER-UUID', 'Sahar', 'saharpk', 'Building productbuilders.app', true);

-- Sample products (replace builder_id with your profile UUID)
-- INSERT INTO public.products (builder_id, name, tagline, description, category, stage, week_of)
-- VALUES
--   ('YOUR-UUID', 'CVRoast', 'AI-powered CV scoring tool. Paste your CV, get roasted.', 'Free, no signup, open source. Uses Claude to analyze your resume against the job description and give brutally honest feedback.', 'AI', 'launched', current_week()),
--   ('YOUR-UUID', 'BuilderBot', 'Telegram bot that tracks your shipping streak', 'Post daily updates, get accountability nudges, compete on the streak leaderboard.', 'Community', 'building', current_week()),
--   ('YOUR-UUID', 'PromptPark', 'Marketplace for production-tested AI prompts', 'Buy and sell prompts that actually work in production. Revenue share with creators.', 'AI', 'idea', current_week()),
--   ('YOUR-UUID', 'DevDash', 'One dashboard for all your dev metrics', 'GitHub, Vercel, Supabase, Railway — all in one place. No more tab switching.', 'Developer Tool', 'building', current_week()),
--   ('YOUR-UUID', 'LangBridge', 'Real-time translation for team standups', 'Plug into Zoom/Meet. Your standup is translated live for international teams.', 'AI', 'launched', current_week());

-- To use: uncomment the above and replace YOUR-UUID / YOUR-AUTH-USER-UUID
-- with your actual Supabase auth user ID.

-- Quick way to get your user ID:
-- 1. Sign up on the app
-- 2. Go to Supabase dashboard → Authentication → Users
-- 3. Copy the UUID
-- 4. Run the INSERTs above with that UUID
