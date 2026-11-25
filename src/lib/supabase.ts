import { createClient } from '@supabase/supabase-js';

function normalizeSupabaseUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  try {
    return new URL(trimmed).origin;
  } catch {
    return trimmed.replace(/\/rest\/v1\/?.*$/i, '').replace(/\/+$/, '');
  }
}

const rawSupabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://ravyjxtnrzvbcwpfumea.supabase.co';
const supabaseUrl = normalizeSupabaseUrl(rawSupabaseUrl);
const supabaseAnonKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdnlqeHRucnp2YmN3cGZ1bWVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU0MjEzMjIsImV4cCI6MjExMDk5NzMyMn0.nq_qC1dcXVMY4tBenRPmTZkrAWosY2JmAqyMh-VJATU'
).trim();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
