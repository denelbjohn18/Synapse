'use client';

import { use } from 'react';
import { BoardListPage } from '@/components/boards/BoardListPage';
import { useProjects } from '@/lib/hooks/useProjects';

type Params = { projectId: string };

export default function ProjectDetailPage({ params }: { params: Promise<Params> }) {
  const { projectId } = use(params);
  const projects = useProjects();
  const project = projects.find((p) => p.id === projectId);
  return (
    <BoardListPage
      filter={{ kind: 'project', projectId }}
      title={project?.name ?? 'Project'}
    />
  );
}
