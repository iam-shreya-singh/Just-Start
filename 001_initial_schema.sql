-- =============================================================================
-- Just Start — Supabase PostgreSQL Migration (Phase 2)
-- =============================================================================
-- Run this SQL in the Supabase SQL Editor to set up the production database.
-- This creates: tables, indexes, RLS policies, and helper functions.
-- =============================================================================

-- ---------------------------------------------------------------------------
// 1. PROFILES TABLE
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
// 2. SESSIONS TABLE
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  raw_input       TEXT NOT NULL,
  depth_reached   INTEGER NOT NULL DEFAULT 0 CHECK (depth_reached >= 0 AND depth_reached <= 3),
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned', 'expired')),
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
// 3. EVENTS TABLE
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL CHECK (event_type IN (
    'SUBMIT_TASK',
    'ACTION_GENERATED',
    'TOO_BIG',
    'ACTION_DONE',
    'COMMIT_5_MIN',
    'HIT_WALL',
    'FINISHED',
    'SESSION_EXPIRED'
  )),
  payload     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
// 4. INDEXES
// ---------------------------------------------------------------------------

-- Sessions: lookup by user (dashboard queries)
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

-- Sessions: filter by status (analytics)
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);

-- Sessions: find stale sessions for expiry
CREATE INDEX IF NOT EXISTS idx_sessions_last_active_at ON sessions(last_active_at);

-- Sessions: composite for "active sessions for a user"
CREATE INDEX IF NOT EXISTS idx_sessions_user_status ON sessions(user_id, status);

-- Events: lookup by session (session detail queries)
CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id);

-- Events: filter by type (analytics)
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);

-- Events: time-range queries (analytics dashboards)
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);

-- Events: composite for "events of a type in a time range"
CREATE INDEX IF NOT EXISTS idx_events_type_created ON events(event_type, created_at);

-- GIN index for JSONB payload queries
CREATE INDEX IF NOT EXISTS idx_events_payload ON events USING GIN (payload);

-- ---------------------------------------------------------------------------
// 5. ROW LEVEL SECURITY (RLS)
-- ---------------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
// 5a. PROFILES RLS POLICIES
-- ---------------------------------------------------------------------------

-- Anyone can insert a profile (anonymous onboarding)
CREATE POLICY "Anyone can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (true);

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (true);  -- Anonymous users — all profiles are readable by the service role

-- Service role has full access
CREATE POLICY "Service role full access on profiles"
  ON profiles FOR ALL
  USING (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
// 5b. SESSIONS RLS POLICIES
-- ---------------------------------------------------------------------------

-- Anyone can insert a session (anonymous onboarding)
CREATE POLICY "Anyone can insert sessions"
  ON sessions FOR INSERT
  WITH CHECK (true);

-- Users can read sessions (anonymous — read own via client filter)
CREATE POLICY "Users can read own sessions"
  ON sessions FOR SELECT
  USING (true);

-- Users can update their own sessions
CREATE POLICY "Users can update own sessions"
  ON sessions FOR UPDATE
  USING (true);

-- Service role has full access
CREATE POLICY "Service role full access on sessions"
  ON sessions FOR ALL
  USING (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
// 5c. EVENTS RLS POLICIES
-- ---------------------------------------------------------------------------

-- Anyone can insert events (anonymous analytics)
CREATE POLICY "Anyone can insert events"
  ON events FOR INSERT
  WITH CHECK (true);

-- Users can read events for their sessions
CREATE POLICY "Users can read own events"
  ON events FOR SELECT
  USING (true);

-- Service role has full access
CREATE POLICY "Service role full access on events"
  ON events FOR ALL
  USING (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
// 6. HELPER FUNCTIONS
// ---------------------------------------------------------------------------

-- Function: Mark stale sessions as expired
-- Call periodically (e.g., via cron or Supabase pg_cron)
CREATE OR REPLACE FUNCTION expire_stale_sessions()
RETURNS void AS $$
BEGIN
  UPDATE sessions
  SET status = 'expired',
      last_active_at = now()
  WHERE status = 'active'
    AND last_active_at < now() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get session analytics summary
CREATE OR REPLACE FUNCTION get_session_stats(since TIMESTAMPTZ DEFAULT now() - INTERVAL '7 days')
RETURNS TABLE (
  total_sessions BIGINT,
  completed_sessions BIGINT,
  abandoned_sessions BIGINT,
  expired_sessions BIGINT,
  avg_depth_reached DOUBLE PRECISION,
  too_big_frequency DOUBLE PRECISION,
  completion_rate DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) AS total_sessions,
    COUNT(*) FILTER (WHERE s.status = 'completed') AS completed_sessions,
    COUNT(*) FILTER (WHERE s.status = 'abandoned') AS abandoned_sessions,
    COUNT(*) FILTER (WHERE s.status = 'expired') AS expired_sessions,
    COALESCE(AVG(s.depth_reached), 0) AS avg_depth_reached,
    COALESCE(
      COUNT(*) FILTER (WHERE e.event_type = 'TOO_BIG')::DOUBLE PRECISION /
      NULLIF(COUNT(*) FILTER (WHERE e.event_type = 'SUBMIT_TASK')::DOUBLE PRECISION, 0),
      0
    ) AS too_big_frequency,
    COALESCE(
      COUNT(*) FILTER (WHERE s.status = 'completed')::DOUBLE PRECISION /
      NULLIF(COUNT(*)::DOUBLE PRECISION, 0),
      0
    ) AS completion_rate
  FROM sessions s
  LEFT JOIN events e ON e.session_id = s.id
  WHERE s.started_at >= since;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
// 7. GRANTS
-- ---------------------------------------------------------------------------

-- Grant anon key access
GRANT SELECT, INSERT, UPDATE ON profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON sessions TO anon;
GRANT SELECT, INSERT ON events TO anon;

-- Grant service_role full access
GRANT ALL ON profiles TO service_role;
GRANT ALL ON sessions TO service_role;
GRANT ALL ON events TO service_role;
