import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || ''
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface Task {
  task_id: string
  status: string
  external_id: string
  poll_url: string | null
  poll_method: string
  task_type: string | null
  result: any
  error_message: string | null
  created_at: string
  updated_at: string
  attempt_count: number
  max_attempts: number
  timeout_minutes: number
  metadata: any
  user_id: string | null
}