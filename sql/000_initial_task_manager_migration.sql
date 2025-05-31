-- ============================================
-- TASK MANAGER DATABASE MIGRATION
-- Complete drop and recreate script
-- ============================================

-- Drop existing table and policies if they exist
DROP TABLE IF EXISTS task_manager CASCADE;

-- Create table with all supported statuses
CREATE TABLE task_manager (
    task_id VARCHAR(50) PRIMARY KEY,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' 
        CONSTRAINT task_manager_status_check 
        CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
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

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Basic indexes
CREATE INDEX idx_task_status ON task_manager(status);
CREATE INDEX idx_created_at ON task_manager(created_at);
CREATE INDEX idx_updated_at ON task_manager(updated_at);

-- Search optimization indexes
CREATE INDEX idx_external_id ON task_manager(external_id);
CREATE INDEX idx_task_type ON task_manager(task_type);
CREATE INDEX idx_error_message ON task_manager(error_message);

-- Composite indexes for common queries
CREATE INDEX idx_status_updated_at ON task_manager(status, updated_at DESC);
CREATE INDEX idx_external_id_updated_at ON task_manager(external_id, updated_at DESC);

-- GIN indexes for JSON and full-text search
CREATE INDEX idx_result_gin ON task_manager USING GIN(result);
CREATE INDEX idx_error_message_fts ON task_manager 
    USING GIN(to_tsvector('english', COALESCE(error_message, '')));

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE task_manager ENABLE ROW LEVEL SECURITY;

-- Select policy: Everyone can read all tasks
CREATE POLICY "Enable read access for all"
    ON task_manager FOR SELECT
    USING (true);

-- Insert policy: Service role and authenticated users can create tasks
CREATE POLICY "Enable insert for service role and authenticated users"
    ON task_manager FOR INSERT
    WITH CHECK (
        auth.role() IN ('service_role', 'authenticated') 
        OR auth.jwt() IS NOT NULL
    );

-- Update policy: Service role can update anything, anyone can cancel tasks
CREATE POLICY "Enable update for service role and task cancellation"
    ON task_manager FOR UPDATE
    USING (
        -- Service role can update anything
        auth.role() = 'service_role' 
        OR auth.jwt()->>'role' = 'service_role'
        OR (
            -- Anyone (including anon) can cancel pending/in_progress tasks
            status IN ('pending', 'in_progress')
        )
    )
    WITH CHECK (
        -- Service role can set any status
        auth.role() = 'service_role' 
        OR auth.jwt()->>'role' = 'service_role'
        OR (
            -- Anyone can only set status to cancelled
            status = 'cancelled'
        )
    );

-- Delete policy: Only service role can delete
CREATE POLICY "Enable delete for service role"
    ON task_manager FOR DELETE
    USING (
        auth.role() = 'service_role' 
        OR auth.jwt()->>'role' = 'service_role'
    );

-- ============================================
-- HELPER FUNCTION FOR UPDATED_AT
-- ============================================

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function
CREATE TRIGGER update_task_manager_updated_at 
    BEFORE UPDATE ON task_manager
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VERIFY INSTALLATION
-- ============================================

-- Check table structure
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'task_manager'
ORDER BY ordinal_position;

-- Check constraints
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'task_manager'::regclass;

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'task_manager';

-- Check RLS policies
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'task_manager';