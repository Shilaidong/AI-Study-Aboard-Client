-- ============================================================
-- UniApply Luxe — Supabase Database Schema
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. User Profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  gpa TEXT,
  major TEXT,
  target_major TEXT,
  experiences TEXT[] DEFAULT '{}',
  application_type TEXT CHECK (application_type IN ('Undergraduate', 'Graduate')),
  special_requests TEXT,
  raw_text TEXT DEFAULT '',
  questionnaire TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Chat Messages (Knowledge Base)
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'ai')),
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  attachments JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(user_id, created_at);

-- 3. College Recommendations (cached)
CREATE TABLE IF NOT EXISTS college_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  colleges JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_college_rec_user_id ON college_recommendations(user_id);

-- 4. Resumes
CREATE TABLE IF NOT EXISTS resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  latex_code TEXT NOT NULL DEFAULT '',
  title TEXT DEFAULT 'My Resume',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);

-- 5. Essays
CREATE TABLE IF NOT EXISTS essays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt TEXT DEFAULT '',
  content TEXT DEFAULT '',
  word_count INTEGER DEFAULT 0,
  score JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_essays_user_id ON essays(user_id);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE college_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE essays ENABLE ROW LEVEL SECURITY;

-- User Profiles: users can only access their own row
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE USING (auth.uid() = id);

-- Chat Messages
CREATE POLICY "Users can view own messages"
  ON chat_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own messages"
  ON chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own messages"
  ON chat_messages FOR DELETE USING (auth.uid() = user_id);

-- College Recommendations
CREATE POLICY "Users can view own recommendations"
  ON college_recommendations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own recommendations"
  ON college_recommendations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own recommendations"
  ON college_recommendations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own recommendations"
  ON college_recommendations FOR DELETE USING (auth.uid() = user_id);

-- Resumes
CREATE POLICY "Users can view own resumes"
  ON resumes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own resumes"
  ON resumes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own resumes"
  ON resumes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own resumes"
  ON resumes FOR DELETE USING (auth.uid() = user_id);

-- Essays
CREATE POLICY "Users can view own essays"
  ON essays FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own essays"
  ON essays FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own essays"
  ON essays FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own essays"
  ON essays FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- Auto-create profile on user signup (trigger)
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
