📌 Async Task Manager in n8n – Project Description & Setup Manual
🧭 Overview
The n8n Task Manager system is a low-code orchestration solution designed to manage asynchronous or long-running external jobs (like ML processes, data pipelines, or report generators) by:

Creating task entries with unique IDs

Polling external APIs for status

Handling retries, timeouts, and failures

Exposing APIs for querying task state

Sending Slack alerts for failed tasks

It integrates Supabase as a task store and is fully implemented in n8n workflows, without needing third-party queues or services.

🏗️ Project Architecture
🔄 Workflow Overview (Based on Diagram from Page 3)
Create Task Workflow
Accepts task parameters via webhook, generates a UUID, and inserts into the task_manager table.

Task Monitor Workflow
Runs every 2 mins. Retrieves pending or in_progress tasks, polls external APIs, updates task status, and alerts on failure.

Task Query Workflow
GET endpoint that lets clients fetch task status by ID.

Update Task Workflow
POST endpoint to manually update task status if the external service uses callbacks instead of polling.

🗃️ Database Design
🧱 Supabase Table: task_manager
Column	Type	Description
task_id	varchar (PK)	Globally unique task identifier
status	varchar	pending, in_progress, completed, failed
external_id	varchar	Job ID from external API
poll_url	text	Status check URL
poll_method	varchar	HTTP method for polling
task_type	varchar	Type/category of task
result	jsonb	Final result or link to data
error_message	text	Error description
created_at	timestamptz	Task creation timestamp
updated_at	timestamptz	Last update timestamp
attempt_count	int	Poll attempt counter
max_attempts	int	Max allowed retries
timeout_minutes	int	Deadline before auto-failure
metadata	jsonb	Custom user-supplied data
user_id	uuid	Optional user reference

🛡️ Supabase Policies
✅ SELECT: anyone can read tasks

✅ INSERT: authenticated and service_role roles

✅ UPDATE/DELETE: only service_role role

These allow n8n to write freely while optionally allowing UI apps to read safely.

🧰 Workflow Setup Guide
1. Webhook - Create Task
Trigger: POST to /create-task

Input:

json
Copy
Edit
{
  "external_id": "abc123",
  "poll_url": "https://api.xyz.com/status/abc123",
  "poll_method": "GET",
  "task_type": "data_processing",
  "max_attempts": 10,
  "timeout_minutes": 60
}
Output: Returns full task object with generated task_id

2. Scheduled Task Monitor
Trigger: Every 2 minutes

Logic:

Fetch tasks where status IN ('pending', 'in_progress')

For each:

Call poll_url

Interpret status (done/completed/failed/in_progress)

Update DB

Alert (Slack) on failure

Batching: Processes tasks in groups of 5

3. Webhook - Task Status Query
Trigger: GET /task-status/:taskId

Output:

json
Copy
Edit
{
  "task_id": "abc123",
  "status": "completed",
  "result": "https://result-link.com/file.csv"
}
4. Webhook - Manual Task Update
Trigger: POST /update-task/:taskId

Input: Can update fields like status, result, error_message

Use Case: External service sends status update directly to n8n

📦 Installation Instructions
🛠 Prerequisites
n8n self-hosted (v1.0+)

Supabase project with task_manager table

Slack app (for alerts)

🔌 Connect Services
In n8n, set up credentials:

Supabase API

Slack OAuth2

Optional: httpHeaderAuth for secured endpoints

Import the 4 workflows into your n8n instance:

Create Task

Monitor Tasks

Query Task

Update Task

Add Supabase and Slack credentials to appropriate nodes.

Test with sample POST /create-task to insert a task.

💡 Example Use Case
A user requests a long report. You:

Call /create-task with polling info.

n8n creates the task and returns a task_id.

Task Monitor picks it up and polls the status every 2 mins.

Once done, it updates status = completed.

UI or user checks /task-status/:taskId to retrieve result.

🧭 Future Enhancements (Phase 2)
Dashboard UI (e.g., React + REST API endpoints)

Task filtering by user_id

Task retry & cancel endpoints

Task cleanup (e.g., archive after 30 days)

This system is designed to evolve easily thanks to its modular, centralized architecture.

Let me know if you’d like:

A .zip export of all workflows

Supabase schema migration script

Auto-deployment via Docker

Public/production-ready API routes with auth

🗃️ Supabase Schema Migration Script
This script sets up the task_manager table with sensible defaults, indexes for performance, and Row-Level Security (RLS) policies optimized for public queries, authenticated users, and service roles.

✅ Full SQL Script
sql
Copy
Edit
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
🔐 Public API Routes with Authentication
Your n8n workflows expose API endpoints for external or frontend usage. Here's how to make them production-grade and secure.

🔧 Step-by-Step Setup
1. Authentication via Header Token
Each webhook must use HTTP Header Authentication in n8n.

In Webhook Node Settings:

Authentication: Header Auth

Set up httpHeaderAuth credential in n8n:

yaml
Copy
Edit
Name: TaskManager
Header Name: Authorization
Header Value: Bearer YOUR_SECRET_API_KEY
Pass this in every client request:

h
Copy
Edit
Authorization: Bearer YOUR_SECRET_API_KEY
2. Routes to Expose
Route	Method	Purpose	Auth	Notes
/create-task	POST	Create new task	✅	Returns task_id immediately
/task-status/:taskId	GET	Fetch task status	✅	Public dashboard/UI polling
/update-task/:taskId	POST	External service callback	✅	Updates task status/data

These match the workflows you've uploaded and are webhook-compatible with third-party systems or frontend apps.

3. Security Best Practices
Use random UUID-based task_id to avoid guessing.

Rotate your API_KEY periodically.

Log unauthorized access attempts (you can use an n8n workflow for this).

Use a rate-limiter (proxy-level or workflow-level) for abuse protection.

🌐 Example Secure API Usage
✅ Create Task
bash
Copy
Edit
curl -X POST https://api.yourdomain.com/webhook/create-task \
-H "Authorization: Bearer YOUR_SECRET_API_KEY" \
-H "Content-Type: application/json" \
-d '{
  "external_id": "abc123",
  "poll_url": "https://api.example.com/status/abc123",
  "poll_method": "GET",
  "task_type": "ml_training",
  "max_attempts": 5,
  "timeout_minutes": 60
}'
✅ Check Status
bash
Copy
Edit
curl -X GET https://api.yourdomain.com/webhook/task-status/dd69a407-82f2 \
-H "Authorization: Bearer YOUR_SECRET_API_KEY"
✅ External API Callback (Update)
bash
Copy
Edit
curl -X POST https://api.yourdomain.com/webhook/update-task/dd69a407-82f2 \
-H "Authorization: Bearer YOUR_SECRET_API_KEY" \
-H "Content-Type: application/json" \
-d '{
  "status": "completed",
  "result": {"summary": "Job done successfully"}
}'
✅ Final Checklist for Production
Task	Status
✅ Supabase schema and RLS applied	✔️
✅ API token created in n8n credentials	✔️
✅ Webhook routes authenticated	✔️
✅ Rate limiting via NGINX/Cloudflare	⚠️ (Recommended)
✅ Logging enabled in Supabase/n8n	⚠️ (Optional)
✅ Backup/monitor workflows exported	✔️