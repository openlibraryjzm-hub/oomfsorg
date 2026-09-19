import React from 'react';
import { MapSettings } from '../types/map';
import { AuthModalMode, UserProfile } from '../types/auth';

export type NavigationTab = 'galaxy' | 'map' | 'owner' | 'member';

interface HeaderProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  settings?: MapSettings;
  userCount?: number;
  tileCount?: number;
  onToggleRightPanel?: () => void;
  user: UserProfile | null;
  activeSphereOwnerName?: string;
  onOpenAuthModal?: (mode: AuthModalMode) => void;
  onSignOut?: () => void;
  onViewMyProfile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  user,
  activeSphereOwnerName,
  onViewMyProfile,
}) => {
  // Format owner handle: prioritize active sphere owner being viewed, fallback to signed in user or 'oprah'
  const rawOwner = activeSphereOwnerName || user?.username || 'oprah';
  const displayOwner = rawOwner.replace(/^@/, '').toLowerCase().replace(/\s+/g, '-');

  return (
    <header className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
      <div className="flex items-center pointer-events-auto">
        {/* Frameless, larger & compact URL brand typography: oomfs.org/owner */}
        <div className="flex items-center font-mono text-lg sm:text-xl font-bold tracking-tight drop-shadow-lg select-none">
          <button
            onClick={() => {
              if (activeTab === 'galaxy') {
                onSelectTab('map');
              } else {
                onSelectTab('galaxy');
              }
            }}
            title={activeTab === 'galaxy' ? 'Return to 3D Sphere Map' : 'Code Galaxy Network View'}
            className={`transition-colors hover:text-white ${
              activeTab === 'galaxy' ? 'text-cyan-300 underline underline-offset-4 decoration-cyan-400' : 'text-slate-200'
            }`}
          >
            oomfs.org/
          </button>
          <button
            onClick={() => {
              if (activeTab === 'member') {
                onSelectTab('map');
              } else if (onViewMyProfile) {
                onViewMyProfile();
              } else {
                onSelectTab('member');
              }
            }}
            title={activeTab === 'member' ? 'Return to 3D Sphere Map' : `View @${displayOwner}'s Profile`}
            className={`transition-colors hover:text-cyan-200 ${
              activeTab === 'member' ? 'text-cyan-300 underline underline-offset-4 decoration-cyan-400' : 'text-cyan-400'
            }`}
          >
            {displayOwner}
          </button>
        </div>
      </div>
    </header>
  );
};



