'use client';

import { UserButton } from '@clerk/nextjs';

export function TopBar() {
  return (
    <header className="shell-topbar">
      <span className="shell-wordmark">Synapse</span>
      <div className="shell-profile">
        <UserButton />
      </div>
    </header>
  );
}
