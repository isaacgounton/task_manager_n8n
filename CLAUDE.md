# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the n8n Task Manager system - a low-code orchestration solution for managing asynchronous and long-running external jobs (ML processes, data pipelines, report generators, AI creative automation). It's built entirely in n8n workflows with Supabase as the backend database and includes a React frontend for monitoring tasks.

## Architecture

### Core System (n8n Workflows)
The system consists of 4 main n8n workflows:
1. **Create Task Workflow** - POST webhook that creates tasks with unique IDs
2. **Task Monitor Workflow** - Scheduled every 2 mins to poll external APIs and update task status
3. **Task Query Workflow** - GET endpoint to fetch task status by ID
4. **Update Task Workflow** - POST endpoint for external services to update task status via callbacks

### Frontend (React + TypeScript)
- Located in `/frontend` directory
- Real-time task monitoring with Supabase subscriptions
- Media display support (images, videos, audio)
- Running time display for active tasks

### AI Creative Automation Workflows
Located in `/DemoVideoCreation`:
1. **Form Submission** - User input collection
2. **Image Generation** - OpenAI image creation
3. **Video Creation** - Kling API animation
4. **Audio Generation** - ElevenLabs TTS
5. **Lipsync Creation** - FAL Tavus integration

## Commands

### Frontend Development
```bash
cd frontend
npm install        # Install dependencies
npm start          # Start development server (port 3000)
npm run build      # Build for production
npm test           # Run tests
```

### Database Setup
```bash
# Apply the migration script to create task_manager table
psql -h YOUR_SUPABASE_HOST -U postgres -d postgres -f task_manager_migration.sql
```

## n8n Configuration

1. Set up credentials in n8n:
   - **Supabase API** - for database operations
   - **Slack OAuth2** - for failure alerts
   - **httpHeaderAuth** - for API endpoint security (Header: Authorization, Value: YOUR_SECRET_API_KEY)
   - **OpenAI** - for AI operations
   - **ElevenLabs** - for TTS
   - **PiAPI** - for Kling integration
   - **FAL API** - for Tavus lipsync

2. Import workflows from:
   - `/TaskManager/*.json` - Core task management workflows
   - `/DemoVideoCreation/*.json` - AI creative automation workflows

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

2. Monitor tasks:
   - Use React frontend at http://localhost:3000
   - Check n8n execution logs for Task Monitor workflow
   - Query Supabase: `SELECT * FROM task_manager WHERE task_id = 'YOUR_TASK_ID';`

## Key Implementation Details

### Task Management
- Tasks process in batches of 5 to prevent overload
- Default timeout: 120 minutes (configurable per task)
- Default max attempts: 10 (configurable per task)
- Task statuses: pending → in_progress → completed/failed
- Slack alerts sent on task failure
- All timestamps use UTC (timestamptz)

### Task Types
- `data_processing` - General data operations
- `image_processing` - Image generation/manipulation
- `video_processing` - Video creation/animation
- `audio_processing` - Audio generation/TTS
- `lipsync_processing` - Lipsync video creation

### Frontend Architecture
- React 19 with TypeScript
- Supabase client for real-time subscriptions
- Component structure:
  - `TaskViewer.tsx` - Main task monitoring component
  - Media display with proper type handling
  - Auto-refresh every 3 seconds for active tasks

## Production Deployment

1. Frontend deployment:
   - Build: `cd frontend && npm run build`
   - Deploy build directory to static hosting

2. n8n deployment:
   - Use nginx reverse proxy with rate limiting
   - Set up SSL certificates for HTTPS
   - Enable n8n instance monitoring
   - Configure Supabase connection pooling
   - Set appropriate webhook timeout values

## Error Handling

- Each workflow includes error nodes with human-readable messages
- Retry logic built into async operations (Kling, Tavus)
- Task Manager nodes track status throughout pipeline
- Failed tasks trigger Slack notifications

## Testing Individual Workflows

1. **Image Generation**: Test OpenAI integration independently
2. **Video Creation**: Verify Kling API with sample images
3. **Audio Generation**: Test ElevenLabs with sample text
4. **Lipsync**: Ensure Tavus processes video+audio correctly
5. **Task Manager**: Verify database operations and status updates