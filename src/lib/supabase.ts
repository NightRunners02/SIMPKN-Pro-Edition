import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://ravyjxtnrzvbcwpfumea.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdnlqeHRucnp2YmN3cGZ1bWVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU0MjEzMjIsImV4cCI6MjExMDk5NzMyMn0.nq_qC1dcXVMY4tBenRPmTZkrAWosY2JmAqyMh-VJATU';

function sanitizeEnvValue(rawValue?: string): string {
  if (!rawValue) return '';
  return rawValue.trim().replace(/^["']+|["']+$/g, '').trim();
}

function normalizeSupabaseUrl(rawUrl: string): string {
  const cleaned = sanitizeEnvValue(rawUrl);
  if (!cleaned) return DEFAULT_SUPABASE_URL;
  try {
    return new URL(cleaned).origin;
  } catch {
    return cleaned.replace(/\/rest\/v1\/?.*$/i, '').replace(/\/+$/, '') || DEFAULT_SUPABASE_URL;
  }
}

const envSupabaseUrl = sanitizeEnvValue(import.meta.env.VITE_SUPABASE_URL);
const envSupabaseAnonKey = sanitizeEnvValue(import.meta.env.VITE_SUPABASE_ANON_KEY);

export const supabaseUrl = normalizeSupabaseUrl(envSupabaseUrl || DEFAULT_SUPABASE_URL);
const supabaseAnonKey = envSupabaseAnonKey || DEFAULT_SUPABASE_ANON_KEY;

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
  global: {
    headers: {
      'x-application-name': 'simpkn-informatika-umm',
    },
  },
});
