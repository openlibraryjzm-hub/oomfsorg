import React from 'react';
import { Globe, PieChart, ShieldCheck, Map, User } from 'lucide-react';
import { MapSettings } from '../types/map';
import { AuthModalMode, UserProfile } from '../types/auth';
import { UserMenu } from './UserMenu';

export type NavigationTab = 'galaxy' | 'map' | 'owner' | 'member';

interface HeaderProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  settings: MapSettings;
  userCount: number;
  tileCount: number;
  onToggleRightPanel: () => void;
  user: UserProfile | null;
  onOpenAuthModal: (mode: AuthModalMode) => void;
  onSignOut: () => void;
  onViewMyProfile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  settings,
  userCount,
  tileCount,
  onToggleRightPanel,
  user,
  onOpenAuthModal,
  onSignOut,
  onViewMyProfile,
}) => {
  return (
    <header className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
      <div className="flex flex-wrap items-center gap-2.5 pointer-events-auto">
        {/* 1. Top Navigation Bar (Left to Right: oomfs.org -> Map -> Sphere Owner -> My Profile) */}
        <div className="glass-panel p-1.5 rounded-2xl flex items-center gap-1 shadow-maps border border-slate-800">
          
          {/* Brand Link: oomfs.org (triggers Code Galaxy View) */}
          <button
            onClick={() => onSelectTab('galaxy')}
            title="Code Galaxy Network View"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all font-bold text-xs ${
              activeTab === 'galaxy'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/20'
                : 'hover:bg-slate-800/80 text-cyan-400 hover:text-white'
            }`}
          >
            <div className="w-5 h-5 rounded-lg bg-cyan-400/20 flex items-center justify-center text-cyan-300">
              <Globe className="w-3.5 h-3.5" />
            </div>
            <span className="font-mono text-sm tracking-tight text-white">oomfs.org</span>
          </button>

          <div className="w-[1px] h-5 bg-slate-800 mx-0.5" />

          {/* Tab 2: Map */}
          <button
            onClick={() => onSelectTab('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'map'
                ? 'bg-blue-600/30 text-white border border-blue-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Map className="w-3.5 h-3.5 text-blue-400" />
            <span>Map</span>
          </button>

          {/* Tab 3: Sphere Owner */}
          <button
            onClick={() => onSelectTab('owner')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'owner'
                ? 'bg-indigo-600/30 text-white border border-indigo-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Sphere Owner</span>
          </button>

          {/* Tab 4: Member / Profile Tab */}
          <button
            onClick={() => {
              if (onViewMyProfile) onViewMyProfile();
              else onSelectTab('member');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'member'
                ? 'bg-cyan-600/30 text-white border border-cyan-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <User className="w-3.5 h-3.5 text-cyan-400" />
            <span>{user ? 'My Profile' : 'Member Profile'}</span>
          </button>

        </div>

        {/* Control Dock Toggle Button (visible when on Map view) */}
        {activeTab === 'map' && (
          <button
            onClick={onToggleRightPanel}
            className={`glass-panel px-3 py-2 rounded-2xl flex items-center gap-2 text-xs font-semibold shadow-maps border transition-all ${
              settings.showRightPanel
                ? 'bg-blue-600/30 border-blue-500 text-white'
                : 'text-slate-300 hover:text-white hover:border-slate-700'
            }`}
          >
            <PieChart className="w-4 h-4 text-blue-400" />
            <span>Control Dock ({userCount} Users • {tileCount} Quad Grid)</span>
          </button>
        )}
      </div>

      {/* User Account Menu Widget (Top Right) */}
      <div className="pointer-events-auto">
        <UserMenu
          user={user}
          onOpenAuthModal={onOpenAuthModal}
          onSignOut={onSignOut}
          onViewMyProfile={onViewMyProfile}
        />
      </div>
    </header>
  );
};

