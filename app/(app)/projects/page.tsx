'use client';

import Link from 'next/link';
import { Folder } from 'lucide-react';
import { useProjects } from '@/lib/hooks/useProjects';
import { useBoards } from '@/lib/hooks/useBoards';

export default function ProjectsPage() {
  const projects = useProjects();
  const { boards, loaded } = useBoards();

  return (
    <div>
      <header className="boards-page-header">
        <h1 className="boards-page-title">Projects</h1>
      </header>

      {!loaded ? (
        <div className="boards-empty">
          <div className="boards-empty-msg">Loading…</div>
        </div>
      ) : projects.length === 0 ? (
        <div className="boards-empty">
          <div className="boards-empty-title">No projects yet</div>
          <div className="boards-empty-msg">
            Click the + next to Projects in the sidebar to create your first folder.
          </div>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map((p) => {
            const count = boards.filter(
              (b) => b.project_id === p.id && b.deleted_at === null,
            ).length;
            return (
              <Link key={p.id} href={`/projects/${p.id}`} className="project-card">
                <Folder size={20} className="project-card-icon" />
                <p className="project-card-name">{p.name}</p>
                <p className="project-card-meta">
                  {count} {count === 1 ? 'board' : 'boards'}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
