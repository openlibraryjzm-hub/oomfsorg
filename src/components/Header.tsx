import React from 'react';
import { Sliders } from 'lucide-react';
import { MapSettings } from '../types/map';
import { AuthModalMode, UserProfile } from '../types/auth';

export type NavigationTab = 'galaxy' | 'map' | 'owner' | 'member' | 'studio';

interface HeaderProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  settings?: MapSettings;
  userCount?: number;
  tileCount?: number;
  onToggleRightPanel?: () => void;
  onToggleConfig?: () => void;
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
  // 1. Sphere Owner Handle (Left side next to oomfs.org)
  const rawSphereOwner = activeSphereOwnerName || user?.username || 'oprah';
  const displaySphereOwner = rawSphereOwner.replace(/^@/, '').toLowerCase().replace(/\s+/g, '-');

  // 2. Signed-in User Account Handle (Far right side)
  const rawMyUsername = user?.username || 'oprah';
  const displayMyUsername = rawMyUsername.replace(/^@/, '').toLowerCase().replace(/\s+/g, '-');

  const isMemberOrOwnerTab = activeTab === 'owner' || activeTab === 'member';

  return (
    <header className="fixed top-4 left-4 right-4 z-40 flex items-center justify-between pointer-events-none">
      {/* Left side: Brand + Sphere Owner */}
      <div className="flex items-center pointer-events-auto">
        <div className="flex items-center font-mono text-xl sm:text-2xl font-black tracking-tight drop-shadow-lg select-none">
          <button
            onClick={() => {
              if (activeTab === 'galaxy') {
                onSelectTab('map');
              } else {
                onSelectTab('galaxy');
              }
            }}
            title={activeTab === 'galaxy' ? 'Return to 3D Sphere Map' : 'Code Galaxy Constellation View'}
            className={`transition-colors font-mono text-xl sm:text-2xl font-black ${
              activeTab === 'galaxy'
                ? 'text-blue-600 underline underline-offset-4 decoration-blue-500'
                : 'text-slate-900 hover:text-blue-600'
            }`}
          >
            oomfs.org
          </button>

          <span className="mx-2 sm:mx-3 text-slate-700 font-bold select-none">•</span>

          <button
            onClick={() => {
              if (isMemberOrOwnerTab) {
                onSelectTab('map');
              } else {
                onSelectTab('owner');
              }
            }}
            title={isMemberOrOwnerTab ? 'Return to 3D Sphere Map' : `View @${displaySphereOwner}'s Sphere Host Profile`}
            className={`transition-colors font-mono text-lg sm:text-xl font-black ${
              activeTab === 'owner'
                ? 'text-slate-900 underline underline-offset-4 decoration-slate-900'
                : 'text-slate-900 hover:text-cyan-600'
            }`}
          >
            @{displaySphereOwner}
          </button>
        </div>
      </div>

      {/* Far Right Side: Signed-in Account Profile Link */}
      <div className="flex items-center pointer-events-auto">
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
          title={activeTab === 'member' ? 'Return to 3D Sphere Map' : (user ? `My Account Profile (@${displayMyUsername})` : 'Sign In / View Profile')}
          className={`transition-colors font-mono text-lg sm:text-xl font-black drop-shadow-lg select-none ${
            activeTab === 'member'
              ? 'text-cyan-600 underline underline-offset-4 decoration-cyan-500'
              : 'text-slate-900 hover:text-cyan-600'
          }`}
        >
          @{displayMyUsername}
        </button>
      </div>
    </header>
  );
};




