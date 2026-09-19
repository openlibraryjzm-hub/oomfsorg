import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, LogIn, UserPlus, ChevronDown, Shield } from 'lucide-react';
import { AuthModalMode, UserProfile } from '../types/auth';

interface UserMenuProps {
  user: UserProfile | null;
  onOpenAuthModal: (mode: AuthModalMode) => void;
  onSignOut: () => void;
  onViewMyProfile?: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({
  user,
  onOpenAuthModal,
  onSignOut,
  onViewMyProfile,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) {
    return (
      <div className="flex items-center gap-1.5 glass-panel p-1 rounded-2xl shadow-maps border border-slate-800">
        <button
          onClick={() => onOpenAuthModal('login')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 transition-all"
        >
          <LogIn className="w-3.5 h-3.5 text-cyan-400" />
          <span>Log In</span>
        </button>

        <button
          onClick={() => onOpenAuthModal('register')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-cyan-500/20 hover:from-blue-500 hover:to-cyan-400 transition-all"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Register</span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* User Account Pill */}
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="glass-panel px-3 py-1.5 rounded-2xl flex items-center gap-2 text-xs font-semibold shadow-maps border border-slate-800 hover:border-slate-700 transition-all"
      >
        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white text-[11px] font-bold uppercase shadow-sm">
          {user.username.charAt(0)}
        </div>
        <span className="text-slate-200 font-mono">@{user.username}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-slate-900/95 border border-slate-800 rounded-2xl p-2 shadow-2xl backdrop-blur-xl z-50 animate-fadeIn">
          {/* User Details Header */}
          <div className="px-3 py-2.5 border-b border-slate-800/80 mb-1">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-white font-mono">@{user.username}</span>
            </div>
            {user.email && (
              <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
            )}
          </div>

          {/* Actions */}
          {onViewMyProfile && (
            <button
              onClick={() => {
                setDropdownOpen(false);
                onViewMyProfile();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-cyan-300 hover:bg-cyan-500/10 transition-all mb-1"
            >
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span>My Profile Page</span>
            </button>
          )}

          <button
            onClick={() => {
              setDropdownOpen(false);
              onSignOut();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
};
