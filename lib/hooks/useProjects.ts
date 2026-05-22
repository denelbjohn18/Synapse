'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect } from 'react';
import { useSupabase } from '@/lib/supabase/client';
import { listProjects } from '@/lib/services/projects';
import { useProjectsStore } from '@/stores/useProjectsStore';

export function useProjects() {
  const { userId, isLoaded, isSignedIn } = useAuth();
  const sb = useSupabase();
  const setProjects = useProjectsStore((s) => s.setProjects);
  const setLoading = useProjectsStore((s) => s.setLoading);
  const setError = useProjectsStore((s) => s.setError);
  const loaded = useProjectsStore((s) => s.loaded);
  const projects = useProjectsStore((s) => s.projects);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId || loaded) return;
    let cancelled = false;
    setLoading(true);
    listProjects(sb, userId)
      .then((data) => {
        if (!cancelled) setProjects(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, userId, loaded, sb, setProjects, setLoading, setError]);

  return projects;
}
