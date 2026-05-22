'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import {
  Search as SearchIcon,
  Home as HomeIcon,
  Star as StarIcon,
  Trash2 as TrashIcon,
  Folder as FolderIcon,
  Plus as PlusIcon,
} from 'lucide-react';

import { useUiStore } from '@/stores/useUiStore';
import { useProjectsStore } from '@/stores/useProjectsStore';
import { useProjects } from '@/lib/hooks/useProjects';
import { useSupabase } from '@/lib/supabase/client';
import { createProject } from '@/lib/services/projects';

type NavItemProps = {
  href: string;
  icon: React.ReactNode;
  label: string;
  exact?: boolean;
};

function NavItem({ href, icon, label, exact }: NavItemProps) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');
  return (
    <Link href={href} className={`shell-nav-item${isActive ? ' is-active' : ''}`}>
      {icon}
      <span>{label}</span>
    </Link>
  );
}

export function Sidebar() {
  const projects = useProjects();
  const upsertProject = useProjectsStore((s) => s.upsertProject);
  const removeProject = useProjectsStore((s) => s.removeProject);
  const search = useUiStore((s) => s.search);
  const setSearch = useUiStore((s) => s.setSearch);
  const { userId } = useAuth();
  const sb = useSupabase();
  const pathname = usePathname();

  const [creatingProject, setCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  async function submitNewProject() {
    const name = newProjectName.trim();
    if (!name || !userId) {
      setCreatingProject(false);
      setNewProjectName('');
      return;
    }
    // Optimistic placeholder
    const tempId = `temp-${Date.now()}`;
    const now = new Date().toISOString();
    upsertProject({
      id: tempId,
      user_id: userId,
      name,
      description: null,
      created_at: now,
      updated_at: now,
    });
    setCreatingProject(false);
    setNewProjectName('');
    try {
      const real = await createProject(sb, { userId, name });
      removeProject(tempId);
      upsertProject(real);
    } catch (err) {
      // Roll back optimistic insert on failure.
      removeProject(tempId);
      // eslint-disable-next-line no-console
      console.error('createProject failed:', err);
    }
  }

  return (
    <aside className="shell-sidebar">
      <div className="shell-search">
        <SearchIcon size={14} />
        <input
          type="text"
          placeholder="Search by title or topic"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <nav className="shell-nav">
        <NavItem href="/home" icon={<HomeIcon size={16} />} label="Home" />
        <NavItem href="/starred" icon={<StarIcon size={16} />} label="Starred" />

        <div className="shell-nav-section">
          <span>Projects</span>
          <button
            type="button"
            className="shell-nav-section-add"
            onClick={() => setCreatingProject((v) => !v)}
            aria-label="New project"
          >
            <PlusIcon size={14} />
          </button>
        </div>

        {creatingProject && (
          <form
            className="shell-create-project"
            onSubmit={(e) => {
              e.preventDefault();
              void submitNewProject();
            }}
          >
            <input
              autoFocus
              type="text"
              placeholder="Project name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onBlur={() => void submitNewProject()}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setCreatingProject(false);
                  setNewProjectName('');
                }
              }}
            />
          </form>
        )}

        <div className="shell-nav-sublist">
          {projects.map((p) => {
            const href = `/projects/${p.id}`;
            const isActive = pathname === href;
            return (
              <Link
                key={p.id}
                href={href}
                className={`shell-nav-subitem${isActive ? ' is-active' : ''}`}
              >
                <FolderIcon size={14} />
                <span>{p.name}</span>
              </Link>
            );
          })}
        </div>

        <NavItem href="/trash" icon={<TrashIcon size={16} />} label="Trash" />
      </nav>
    </aside>
  );
}
