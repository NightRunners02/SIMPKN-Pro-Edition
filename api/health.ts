import type { IncomingMessage, ServerResponse } from 'node:http';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://ravyjxtnrzvbcwpfumea.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdnlqeHRucnp2YmN3cGZ1bWVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU0MjEzMjIsImV4cCI6MjExMDk5NzMyMn0.nq_qC1dcXVMY4tBenRPmTZkrAWosY2JmAqyMh-VJATU';

function clean(value?: string): string {
  return (value || '').trim().replace(/^["']+|["']+$/g, '').trim();
}

function normalizeUrl(raw: string): string {
  const cleaned = clean(raw) || DEFAULT_SUPABASE_URL;
  try {
    return new URL(cleaned).origin;
  } catch {
    return cleaned.replace(/\/rest\/v1\/?.*$/i, '').replace(/\/+$/, '') || DEFAULT_SUPABASE_URL;
  }
}

export default async function handler(_req: IncomingMessage, res: ServerResponse) {
  const supabaseUrl = normalizeUrl(
    process.env.VITE_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      DEFAULT_SUPABASE_URL
  );
  const supabaseAnonKey =
    clean(
      process.env.VITE_SUPABASE_ANON_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.SUPABASE_ANON_KEY
    ) || DEFAULT_SUPABASE_ANON_KEY;

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    const [profilesRes, regRes, settingsRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('pkn_registrations').select('id', { count: 'exact', head: true }),
      supabase.from('system_settings').select('id, current_academic_year, current_semester').eq('id', 'primary').maybeSingle(),
    ]);

    const errors = [profilesRes.error?.message, regRes.error?.message, settingsRes.error?.message].filter(Boolean);

    res.statusCode = errors.length > 0 ? 500 : 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(
      JSON.stringify({
        ok: errors.length === 0,
        environment: process.env.VERCEL_ENV || 'production',
        supabaseUrl,
        counts: {
          profiles: profilesRes.count ?? 0,
          pkn_registrations: regRes.count ?? 0,
        },
        academicPeriod: settingsRes.data
          ? `${settingsRes.data.current_academic_year} ${settingsRes.data.current_semester}`
          : null,
        errors,
      })
    );
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify({
        ok: false,
        supabaseUrl,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    );
  }
}
