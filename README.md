# Task Manager N8N

A powerful, low-code orchestration system built with n8n workflows for managing asynchronous and long-running tasks. This solution enables you to track external jobs (ML processes, data pipelines, API integrations, AI workflows) with automated polling, status updates, and real-time monitoring through a React frontend.

## Requirements

### n8n (Cloud or Self-Hosted)
- **n8n Cloud** (recommended for quick start) or **n8n Community Edition** (self-hosted)
- The free tier of n8n Cloud is sufficient for testing and small-scale deployments
- **How to get started with n8n Cloud:**
  1. Visit [n8n.io](https://n8n.io)
  2. Click "Start free trial" (14-day trial, then free tier available)
  3. Create your account with email or Google/GitHub login
  4. Your n8n instance will be ready immediately at `your-name.app.n8n.cloud`

### Supabase Database
- A Supabase project for storing task data
- The **free tier is sufficient** (includes 500MB database, unlimited API requests)
- **How to create a Supabase account:**
  1. Go to [supabase.com](https://supabase.com)
  2. Click "Start your project" and sign up with GitHub or email
  3. Create a new project (choose a region close to your users)
  4. Save your project URL and API keys from Settings → API
  5. The database will be ready in ~2 minutes

## Database Setup

### 1. Import the Database Schema
Once your Supabase project is ready:
1. Go to the SQL Editor in your Supabase dashboard (left sidebar)
2. Click "New query"
3. Copy and paste the contents of `task_manager_migration.sql`
4. Click "Run" to create the table and security policies

![Supabase SQL Editor](images/supabase-sql-editor.png)

### 2. Get Supabase Credentials

#### For Frontend (React App)
1. In Supabase dashboard, go to Settings → API
2. You'll need:
   - **Project URL**: `https://your-project.supabase.co`
   - **Anon Public Key**: Safe to use in frontend apps
3. Create a `.env` file in the `frontend/` directory:
   ```env
   REACT_APP_SUPABASE_URL=https://your-project.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=your-anon-public-key
   ```

![Supabase API Settings](images/supabase-api-settings.png)

#### For n8n (PostgreSQL Connection)
1. In Supabase dashboard, go to Settings → Database
2. You'll need the connection details:
   - **Host**: Your project database host
   - **Database name**: `postgres`
   - **Port**: `5432`
   - **User**: `postgres`
   - **Password**: Your database password (shown once during project creation)

![Supabase Database Settings](images/supabase-database-settings.png)

3. In n8n, create a new PostgreSQL credential with these details

## n8n Workflow Setup

### 1. Create a Folder for Organization
1. In your n8n dashboard, click on "Workflows" in the left sidebar
2. Click the folder icon to create a new folder
3. Name it "Task Manager" (or any name you prefer for organization)
4. This helps keep your task management workflows separate from other automations

![n8n Folder Creation](images/n8n-folder-creation.png)

### 2. Import Task Manager Workflows
1. Navigate to your Task Manager folder
2. Import the following workflow files from the `TaskManager/` directory:
   - `N8N_Task_Creation_Workflow.json` - Creates new tasks via webhook
   - `N8N_Task_Monitor_Workflow.json` - Monitors and updates task status
   - `N8N_Get_Status_Query_Workflow.json` - Query task status endpoint
   - `N8N_Task_Update_Workflow.json` - Manual task updates via webhook
   
3. To import each workflow:
   - Click "Add workflow" → "Import from File" 
   - Select the JSON file
   - The workflow will open in the editor

4. After importing, you'll need to:
   - Update the PostgreSQL credentials in each workflow
   - Activate each workflow (toggle the "Active" switch)
   - Note the webhook URLs for your API endpoints

### 3. Configure and Test Task Manager Nodes
1. Open the `N8N_Task_Manager_Nodes.json` workflow
2. Find the URL node in the workflow
3. Update the URL to point to your n8n instance:
   - If using n8n Cloud: `https://your-name.app.n8n.cloud/webhook/xxx`
   - If self-hosted: `https://your-domain.com/webhook/xxx`


4. Test the setup:
   - Click on the `TM_SIMPLE_NODE` 
   - Click "Execute Node" to run it manually
   - You should receive a TaskID response like: `2d9c4c2e-c39a-4da2-aaad-2cd096e2009d`
   - This confirms your Task Manager is working correctly

![Successful TaskID Response](images/taskid-response.png)

5. If successful, the task will be created in your Supabase database
   - You can verify this in Supabase Table Editor → task_manager table

## Demo Workflows - AI Creative Automation

### 1. Import Demo Workflows
Create a separate folder for the demo workflows to see Task Manager in action:

1. Create a new folder in n8n called "AI Creative Demo" (or similar)
2. Import the following workflows from the `DemoVideoCreation/` directory:
   - `01__VL__Form_submission.json` - User input form for creative parameters
   - `02__VL__Image_Generation.json` - AI image generation with OpenAI
   - `03__VL__Video_Creation.json` - Video animation with Kling
   - `04__VL__Audio.json` - Text-to-speech with ElevenLabs
   - `05__VL__Lipsync_Creation.json` - Lipsync video generation

### 2. Understanding the Demo Architecture
These workflows demonstrate a complete AI creative pipeline that:
- Accepts user input (image description, style, voice)
- Generates images using AI
- Creates animated videos
- Produces voice narration
- Combines everything into a lipsync video

**Watch the full explanation**: [YouTube Tutorial - Task Manager Demo](https://www.youtube.com/watch?v=PckWZW2fhwQ)

### 3. Required API Credentials for Demo
To run the demo workflows, you'll need:
- **OpenAI API** - For image generation
- **ElevenLabs API** - For text-to-speech ([Get started here](https://try.elevenlabs.io/ruugnmjj7522))
- **PiAPI** - For Kling video generation ([Sign up here](https://piapi.ai/workspace?via=valics))
- **FAL API** - For Tavus lipsync

Note: These are optional - the core Task Manager works without them

## Frontend Application (Optional)

### Running the Task Monitor UI
If you want a visual interface to monitor your tasks:

1. Navigate to the `frontend/` directory
2. Check the `frontend/README.md` for detailed setup instructions
3. Quick start:
   ```bash
   cd frontend
   npm install
   npm start
   ```
4. The React app will run locally at `http://localhost:3000`

### Features
- Real-time task status monitoring
- Visual display of task results (images, videos, audio)
- Running time tracking for active tasks
- Auto-refresh for live updates
- Supabase real-time subscriptions

Note: Make sure you've configured the `.env` file with your Supabase credentials before starting

## Support & Community

For questions, support, or discussions about this project:

- **GitHub**: Open an issue in this repository
- **Community Forum**: [RoboNuggets on Skool](https://www.skool.com/robonuggets/about?ref=eab1a6d8a1aa4769b1979373715509a2)
- **Free Community**: [RoboNuggets Free on Skool](https://www.skool.com/robonuggets-free/about?ref=eab1a6d8a1aa4769b1979373715509a2)
