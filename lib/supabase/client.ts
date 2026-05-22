'use client';

import { useAuth } from '@clerk/nextjs';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { useMemo } from 'react';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Surfaces immediately in dev rather than silently failing on first query.
  // eslint-disable-next-line no-console
  console.error(
    '[supabase] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY missing from env.',
  );
}

export function useSupabase(): SupabaseClient {
  const { getToken } = useAuth();

  return useMemo(
    () =>
      createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        // Guarded for SSR: getToken throws "clerk_runtime_not_browser" if invoked
        // during server render. We swallow that and let the client re-attach on
        // hydration. Any other failure is logged but not thrown.
        accessToken: async () => {
          if (typeof window === 'undefined') return null;
          try {
            return (await getToken({ template: 'supabase' })) ?? null;
          } catch (err) {
            // eslint-disable-next-line no-console
            console.warn('[supabase] getToken failed:', err);
            return null;
          }
        },
      }),
    [getToken],
  );
}
