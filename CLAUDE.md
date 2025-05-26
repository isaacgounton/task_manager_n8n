# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the n8n Task Manager system - a low-code orchestration solution for managing asynchronous and long-running external jobs (ML processes, data pipelines, report generators). It's built entirely in n8n workflows with Supabase as the backend database.

## Architecture

The system consists of 4 main n8n workflows:
1. **Create Task Workflow** - POST webhook that creates tasks with unique IDs
2. **Task Monitor Workflow** - Scheduled every 2 mins to poll external APIs and update task status
3. **Task Query Workflow** - GET endpoint to fetch task status by ID
4. **Update Task Workflow** - POST endpoint for external services to update task status via callbacks

## Database Setup

Before deploying workflows, run the Supabase migration:
```bash
# Apply the migration script to create task_manager table
psql -h YOUR_SUPABASE_HOST -U postgres -d postgres -f task_manager_migration.sql
```

## n8n Configuration

1. Set up credentials in n8n:
   - **Supabase API** - for database operations
   - **Slack OAuth2** - for failure alerts
   - **httpHeaderAuth** - for API endpoint security (Header: Authorization, Value: YOUR_SECRET_API_KEY)

2. Import workflows:
   - Import the 4 workflows from the n8n workflow files
   - Update Supabase and Slack credentials in each workflow
   - Activate the Task Monitor workflow schedule

## API Endpoints

All endpoints require Authorization header:
```bash
Authorization: YOUR_SECRET_API_KEY
```

- **POST /webhook/create-task** - Create new async task
- **GET /webhook/task-status/{taskId}** - Query task status
- **POST /webhook/update-task/{taskId}** - Update task (for callbacks)

## Development Workflow

1. Test task creation:
```bash
curl -X POST http://localhost:5678/webhook/create-task \
  -H "Authorization: YOUR_SECRET_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "external_id": "test123",
    "poll_url": "https://api.example.com/status/test123",
    "task_type": "test",
    "max_attempts": 5
  }'
```

2. Monitor task processing:
   - Check n8n execution logs for Task Monitor workflow
   - Query Supabase: `SELECT * FROM task_manager WHERE task_id = 'YOUR_TASK_ID';`

3. Test status query:
```bash
curl -X GET http://localhost:5678/webhook/task-status/YOUR_TASK_ID \
  -H "Authorization: YOUR_SECRET_API_KEY"
```

## Key Implementation Details

- Tasks process in batches of 5 to prevent overload
- Default timeout: 120 minutes (configurable per task)
- Default max attempts: 10 (configurable per task)
- Task statuses: pending → in_progress → completed/failed
- Slack alerts sent on task failure
- All timestamps use UTC (timestamptz)

## Production Deployment

1. Use nginx reverse proxy with rate limiting (config provided in nginx.conf)
2. Set up SSL certificates for HTTPS
3. Enable n8n instance monitoring
4. Configure Supabase connection pooling for high load
5. Set appropriate webhook timeout values in n8n settings