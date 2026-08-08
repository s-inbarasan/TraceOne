-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Base updated_at trigger function
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

DROP TRIGGER IF EXISTS set_timestamp_users ON users;
CREATE TRIGGER set_timestamp_users
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- Trigger to automatically create a row in public.users when a user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

DROP TRIGGER IF EXISTS set_timestamp_projects ON projects;
CREATE TRIGGER set_timestamp_projects
BEFORE UPDATE ON projects
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- 3. Repositories table
CREATE TABLE IF NOT EXISTS repositories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    github_id BIGINT NOT NULL,
    full_name TEXT NOT NULL,
    default_branch TEXT NOT NULL DEFAULT 'main',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(project_id, github_id)
);

DROP TRIGGER IF EXISTS set_timestamp_repositories ON repositories;
CREATE TRIGGER set_timestamp_repositories
BEFORE UPDATE ON repositories
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- 4. Providers table (LLM & Integration providers)
CREATE TABLE IF NOT EXISTS providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    base_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default AI & integration providers
INSERT INTO providers (name, base_url) VALUES
  ('Gemini', 'https://generativelanguage.googleapis.com'),
  ('OpenAI', 'https://api.openai.com/v1'),
  ('Anthropic', 'https://api.anthropic.com/v1'),
  ('NVIDIA', 'https://integrate.api.nvidia.com/v1'),
  ('GitHub', 'https://api.github.com')
ON CONFLICT (name) DO NOTHING;

-- 5. API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    encrypted_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(user_id, provider_id)
);

DROP TRIGGER IF EXISTS set_timestamp_api_keys ON api_keys;
CREATE TRIGGER set_timestamp_api_keys
BEFORE UPDATE ON api_keys
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- 6. Incidents table (Grouped API errors)
CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'ignored')),
    severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    error_type TEXT NOT NULL,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    event_count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_incidents_project_id ON incidents(project_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);

DROP TRIGGER IF EXISTS set_timestamp_incidents ON incidents;
CREATE TRIGGER set_timestamp_incidents
BEFORE UPDATE ON incidents
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- 7. API Logs table (Raw ingestion)
CREATE TABLE IF NOT EXISTS api_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    method TEXT NOT NULL,
    path TEXT NOT NULL,
    status_code INTEGER NOT NULL,
    error_message TEXT,
    stack_trace TEXT,
    headers JSONB,
    body JSONB,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_logs_project_id ON api_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_incident_id ON api_logs(incident_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_timestamp ON api_logs(timestamp);

-- 8. Investigations table
CREATE TABLE IF NOT EXISTS investigations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    root_cause TEXT,
    confidence_score NUMERIC(5,2),
    risk_analysis TEXT,
    time_estimate_minutes INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_timestamp_investigations ON investigations;
CREATE TRIGGER set_timestamp_investigations
BEFORE UPDATE ON investigations
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- 9. Analysis Runs table
CREATE TABLE IF NOT EXISTS analysis_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    investigation_id UUID NOT NULL REFERENCES investigations(id) ON DELETE CASCADE,
    step_name TEXT NOT NULL,
    output TEXT,
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 10. Patches table
CREATE TABLE IF NOT EXISTS patches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    investigation_id UUID NOT NULL REFERENCES investigations(id) ON DELETE CASCADE,
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    original_content TEXT NOT NULL,
    updated_content TEXT NOT NULL,
    unified_diff TEXT NOT NULL,
    explanation TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_timestamp_patches ON patches;
CREATE TRIGGER set_timestamp_patches
BEFORE UPDATE ON patches
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- 11. Pull Requests table
CREATE TABLE IF NOT EXISTS pull_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    investigation_id UUID NOT NULL REFERENCES investigations(id) ON DELETE CASCADE,
    repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    github_pr_id BIGINT,
    github_pr_number INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    branch_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'merged', 'closed')),
    url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_timestamp_pull_requests ON pull_requests;
CREATE TRIGGER set_timestamp_pull_requests
BEFORE UPDATE ON pull_requests
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- -------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- -------------------------------------------------------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE investigations ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE patches ENABLE ROW LEVEL SECURITY;
ALTER TABLE pull_requests ENABLE ROW LEVEL SECURITY;

-- Allow users to view and update their own profile
CREATE POLICY "Users can manage own profile" ON users
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Allow users to manage their own projects
CREATE POLICY "Users can manage own projects" ON projects
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Allow users to manage repositories linked to their projects
CREATE POLICY "Users can manage project repositories" ON repositories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = repositories.project_id AND projects.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = repositories.project_id AND projects.user_id = auth.uid())
  );

-- Providers can be read by any authenticated user
CREATE POLICY "Authenticated users can read providers" ON providers
  FOR SELECT USING (auth.role() = 'authenticated');

-- Users can manage their own API keys
CREATE POLICY "Users can manage own api_keys" ON api_keys
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Users can manage incidents for their projects
CREATE POLICY "Users can manage project incidents" ON incidents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = incidents.project_id AND projects.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = incidents.project_id AND projects.user_id = auth.uid())
  );

-- Anyone / Service can insert API logs, but users can read logs for their projects
CREATE POLICY "Allow public log ingestion" ON api_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view project api_logs" ON api_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = api_logs.project_id AND projects.user_id = auth.uid())
  );

-- Investigations policies
CREATE POLICY "Users can manage investigations" ON investigations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM incidents
      JOIN projects ON projects.id = incidents.project_id
      WHERE incidents.id = investigations.incident_id AND projects.user_id = auth.uid()
    )
  );

-- Analysis runs policies
CREATE POLICY "Users can manage analysis_runs" ON analysis_runs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM investigations
      JOIN incidents ON incidents.id = investigations.incident_id
      JOIN projects ON projects.id = incidents.project_id
      WHERE investigations.id = analysis_runs.investigation_id AND projects.user_id = auth.uid()
    )
  );

-- Patches policies
CREATE POLICY "Users can manage patches" ON patches
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM investigations
      JOIN incidents ON incidents.id = investigations.incident_id
      JOIN projects ON projects.id = incidents.project_id
      WHERE investigations.id = patches.investigation_id AND projects.user_id = auth.uid()
    )
  );

-- Pull requests policies
CREATE POLICY "Users can manage pull_requests" ON pull_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM investigations
      JOIN incidents ON incidents.id = investigations.incident_id
      JOIN projects ON projects.id = incidents.project_id
      WHERE investigations.id = pull_requests.investigation_id AND projects.user_id = auth.uid()
    )
  );
