
-- Create table
CREATE TABLE IF NOT EXISTS task_manager (
    task_id VARCHAR(50) PRIMARY KEY,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    external_id VARCHAR(255),
    poll_url TEXT,
    poll_method VARCHAR(10) DEFAULT 'GET',
    task_type VARCHAR(50),
    result JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    attempt_count INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 10,
    timeout_minutes INTEGER DEFAULT 120,
    metadata JSONB,
    user_id UUID
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_task_status ON task_manager(status);
CREATE INDEX IF NOT EXISTS idx_created_at ON task_manager(created_at);

-- Enable Row-Level Security
ALTER TABLE task_manager ENABLE ROW LEVEL SECURITY;

-- Remove old policies
DROP POLICY IF EXISTS "Tasks are viewable by everyone" ON task_manager;
DROP POLICY IF EXISTS "Authenticated users can create tasks" ON task_manager;
DROP POLICY IF EXISTS "Only service role can update tasks" ON task_manager;
DROP POLICY IF EXISTS "Only service role can delete tasks" ON task_manager;

-- Select policy: allow everyone (or restrict by user_id if needed)
CREATE POLICY "Enable read access for all"
    ON task_manager FOR SELECT
    USING (true);

-- Insert policy: allow authenticated and service roles
CREATE POLICY "Enable insert for service role and authenticated users"
    ON task_manager FOR INSERT
    WITH CHECK (
        auth.role() IN ('service_role', 'authenticated') OR
        auth.jwt() IS NOT NULL
    );

-- Update policy: only service role
CREATE POLICY "Enable update for service role"
    ON task_manager FOR UPDATE
    USING (
        auth.role() = 'service_role' OR
        auth.jwt()->>'role' = 'service_role'
    );

-- Delete policy: only service role
CREATE POLICY "Enable delete for service role"
    ON task_manager FOR DELETE
    USING (
        auth.role() = 'service_role' OR
        auth.jwt()->>'role' = 'service_role'
    );

-- ============================================
-- SEARCH OPTIMIZATION INDEXES
-- Added to improve search performance
-- ============================================

-- Index for external_id - used for grouping and filtering workflows
CREATE INDEX IF NOT EXISTS idx_external_id ON task_manager(external_id);

-- Index for task_type - enables fast filtering by task type
CREATE INDEX IF NOT EXISTS idx_task_type ON task_manager(task_type);

-- Index for updated_at - improves time-based queries and sorting
CREATE INDEX IF NOT EXISTS idx_updated_at ON task_manager(updated_at);

-- GIN index for JSONB result field - enables efficient searches within JSON data
CREATE INDEX IF NOT EXISTS idx_result_gin ON task_manager USING GIN(result);

-- Index for error_message - speeds up error searches
CREATE INDEX IF NOT EXISTS idx_error_message ON task_manager(error_message);

-- Composite index for common query patterns - optimizes status + time queries
CREATE INDEX IF NOT EXISTS idx_status_updated_at ON task_manager(status, updated_at DESC);

-- Composite index for external_id + time - optimizes workflow grouping with time sorting
CREATE INDEX IF NOT EXISTS idx_external_id_updated_at ON task_manager(external_id, updated_at DESC);

-- Full-text search index for error messages - enables fast text search in errors
CREATE INDEX IF NOT EXISTS idx_error_message_fts ON task_manager 
USING GIN(to_tsvector('english', COALESCE(error_message, '')));
