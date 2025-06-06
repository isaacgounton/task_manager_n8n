# Task Manager Frontend

A React-based real-time task monitoring dashboard for the n8n Task Manager system. This frontend provides visual monitoring of asynchronous tasks with support for media display (images, videos, audio) and live status updates.

## Features

- **Real-time Updates**: Automatic refresh every 3 seconds for active tasks
- **Supabase Integration**: Live subscriptions for instant task status changes
- **Media Display**: Built-in support for images, videos, and audio playback
- **Task Filtering**: Filter by status (pending, in_progress, completed, failed)
- **Running Time**: Live tracking of task execution duration
- **Responsive Design**: Works on desktop and mobile devices

## Prerequisites

- Node.js 14+ and npm
- Supabase account with task_manager table configured
- n8n Task Manager workflow running and accessible

## Installation

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment configuration:
   ```bash
   cp .env.example .env
   ```
   
   Or create `.env` manually with:
   ```env
   REACT_APP_SUPABASE_URL=https://your-project.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=your-anon-public-key
   REACT_APP_N8N_INDEX_URL=https://url-to-n8n/
   ```

4. Get your Supabase credentials:
   - Go to your Supabase project dashboard
   - Navigate to Settings → API
   - Copy the Project URL and anon/public key

## Development

Start the development server:
```bash
npm start
```

The app will run at [http://localhost:3000](http://localhost:3000)

## Production Build

Build for production deployment:
```bash
npm run build
```

The optimized build will be in the `build/` directory.

## Deployment Options

### Static Hosting (Recommended)
Deploy the `build/` directory to any static hosting service:
- Vercel
- Netlify  
- GitHub Pages
- AWS S3 + CloudFront
- Any web server (nginx, Apache)

### Docker
```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
```

## Configuration

### Environment Variables
- `REACT_APP_SUPABASE_URL`: Your Supabase project URL
- `REACT_APP_SUPABASE_ANON_KEY`: Supabase anonymous/public key (safe for frontend)

### Task Status Colors
- **Pending**: Gray
- **In Progress**: Blue (with animated indicator)
- **Completed**: Green
- **Failed**: Red

## Architecture

### Components
- **TaskViewer**: Main component handling task display and real-time updates
- **Media Display**: Automatic detection and rendering of media results
- **Status Filters**: Toggle buttons for filtering tasks by status

### Data Flow
1. Initial load fetches all tasks from Supabase
2. Establishes real-time subscription for updates
3. Auto-refresh every 3 seconds for running time updates
4. Unsubscribes on component unmount

## Troubleshooting

### Tasks Not Updating
1. Check Supabase connection in browser console
2. Verify `.env` variables are set correctly
3. Ensure RLS policies allow SELECT on task_manager table

### Media Not Displaying
1. Check CORS settings on media hosting service
2. Verify media URLs are publicly accessible
3. Check browser console for loading errors

### Connection Issues
1. Verify Supabase project is active
2. Check network connectivity
3. Ensure anon key matches your Supabase project

## Development Notes

- Built with Create React App
- TypeScript for type safety
- Supabase client v2 for real-time features
- CSS modules for styling
- No additional UI framework dependencies

## Scripts

- `npm start`: Start development server
- `npm test`: Run tests
- `npm run build`: Create production build
- `npm run eject`: Eject from Create React App (not recommended)