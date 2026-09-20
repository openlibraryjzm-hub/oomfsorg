import React, { useState, useEffect } from 'react';
import { MapSettings, SphereItem } from '../types/map';
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
  spheres?: SphereItem[];
  onSelectSphere?: (sphereId: string) => void;
  onOpenAuthModal?: (mode: AuthModalMode) => void;
  onSignOut?: () => void;
  onViewMyProfile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  user,
  activeSphereOwnerName,
  spheres = [],
  onSelectSphere,
  onViewMyProfile,
}) => {
  // Format owner handle: prioritize active sphere owner being viewed, fallback to signed in user or 'oprah'
  const rawOwner = activeSphereOwnerName || user?.username || 'oprah';
  const displayOwner = rawOwner.replace(/^@/, '').toLowerCase().replace(/\s+/g, '-');

  const [inputValue, setInputValue] = useState<string>(displayOwner);
  const [hasTyped, setHasTyped] = useState<boolean>(false);

  // Sync displayOwner with inputValue when active sphere changes and user is not actively typing
  useEffect(() => {
    if (!hasTyped) {
      setInputValue(displayOwner);
    }
  }, [displayOwner, hasTyped]);

  const handleInputSubmit = () => {
    const trimmed = inputValue.trim().toLowerCase().replace(/^@/, '');
    const userWasTyping = hasTyped;
    setHasTyped(false);

    // If unchanged, navigate to profile page / return to map
    if (!userWasTyping || !trimmed || trimmed === displayOwner) {
      setInputValue(displayOwner);
      return;
    }

    // Search spheres collection for matching owner handle, sphere ID, or sphere name
    if (spheres.length > 0 && onSelectSphere) {
      const matched = spheres.find(s => {
        const ownerSlug = s.ownerName.toLowerCase().replace(/^@/, '').replace(/\s+/g, '-');
        const ownerRaw = s.ownerName.toLowerCase().replace(/^@/, '');
        const sphereId = s.id.toLowerCase();
        const sphereName = s.name.toLowerCase();

        return (
          trimmed === ownerSlug ||
          trimmed === ownerRaw ||
          trimmed === sphereId ||
          trimmed === sphereName ||
          sphereName.includes(trimmed)
        );
      });

      if (matched) {
        onSelectSphere(matched.id);
        onSelectTab('map');
        const matchedSlug = matched.ownerName.toLowerCase().replace(/^@/, '').replace(/\s+/g, '-');
        setInputValue(matchedSlug);
        return;
      }
    }

    // If no match found, reset to displayOwner
    setInputValue(displayOwner);
  };

  const handleProfileNavigation = () => {
    if (activeTab === 'member') {
      onSelectTab('map');
    } else if (onViewMyProfile) {
      onViewMyProfile();
    } else {
      onSelectTab('member');
    }
  };

  return (
    <header className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
      <div className="flex items-center pointer-events-auto">
        {/* Frameless, larger & compact URL brand typography: oomfs.org/{owner} */}
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
            className={`transition-colors font-mono text-lg sm:text-xl font-black ${
              activeTab === 'galaxy' ? 'text-blue-600 underline underline-offset-4 decoration-blue-500' : 'text-slate-900 hover:text-blue-600'
            }`}
          >
            oomfs.org/
          </button>

          <input
            type="text"
            value={inputValue}
            onChange={e => {
              setHasTyped(true);
              setInputValue(e.target.value);
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                if (!hasTyped || inputValue.trim().toLowerCase().replace(/^@/, '') === displayOwner) {
                  handleProfileNavigation();
                } else {
                  handleInputSubmit();
                }
                e.currentTarget.blur();
              } else if (e.key === 'Escape') {
                setHasTyped(false);
                setInputValue(displayOwner);
                e.currentTarget.blur();
              }
            }}
            onBlur={handleInputSubmit}
            title="Type a sphere owner or sphere name and press Enter (or click off) to jump to sphere"
            style={{ width: `${Math.max(1, inputValue.length)}ch` }}
            className={`bg-transparent focus:outline-none transition-colors font-mono text-lg sm:text-xl font-black caret-cyan-600 ${
              activeTab === 'member'
                ? 'text-cyan-600 underline underline-offset-4 decoration-cyan-500'
                : 'text-cyan-700 hover:text-cyan-600'
            }`}
          />
        </div>
      </div>
    </header>
  );
};




