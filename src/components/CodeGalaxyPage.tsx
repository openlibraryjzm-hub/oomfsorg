import React, { useState, useMemo, useEffect } from 'react';
import {
  Globe2,
  ArrowRight,
  Plus,
  CheckCircle2,
  X,
  Palette,
  Users,
  Grid,
  Star,
  ShieldCheck,
  Lock,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { SphereItem, MappingMode, MapTheme } from '../types/map';
import { UserProfile } from '../types/auth';
import { GalaxyCanvas, ScreenPositionUpdate } from './GalaxyCanvas';
import { supabase } from '../utils/supabase';
import { fetchTwitterMutualOOMFs, generateMockOOMFs, signInWithTwitterOAuth, handleTwitterOauthCallback } from '../utils/twitterService';

interface CodeGalaxyPageProps {
  spheres: SphereItem[];
  activeSphereId: string;
  onSelectSphere: (sphereId: string) => void;
  onCreateSphere: (newSphere: SphereItem) => void;
  onGoToMap: () => void;
  currentUser?: UserProfile | null;
  onOpenAuthModal?: (mode: 'login' | 'register') => void;
}

export const CodeGalaxyPage: React.FC<CodeGalaxyPageProps> = ({
  spheres,
  activeSphereId,
  onSelectSphere,
  onCreateSphere,
  onGoToMap,
  currentUser,
  onOpenAuthModal,
}) => {
  const [selectedSphereId, setSelectedSphereId] = useState<string | null>(activeSphereId);
  const [hoveredSphereId, setHoveredSphereId] = useState<string | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ x: number; y: number } | null>(null);
  const [activeHoverSphere, setActiveHoverSphere] = useState<SphereItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isSyncingTwitter, setIsSyncingTwitter] = useState<boolean>(false);

  // New Sphere Form State
  const [newSphereName, setNewSphereName] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newMappingMode, setNewMappingMode] = useState<MappingMode>('conquest');
  const [newUserCount, setNewUserCount] = useState<number>(6);
  const [newGridResolution, setNewGridResolution] = useState<number>(512);
  const [newTheme, setNewTheme] = useState<MapTheme>('neon');

  // Pre-fill owner handle when modal opens or user logs in
  useEffect(() => {
    if (currentUser) {
      setNewOwnerName(`@${currentUser.username}`);
    }
  }, [currentUser]);

  const handleTwitterOOMFCreate = async () => {
    setIsSyncingTwitter(true);
    try {
      localStorage.setItem('oomfs_pending_twitter_sync', 'true');
      await signInWithTwitterOAuth();
    } catch (err) {
      console.error('Failed to execute Twitter OAuth redirect:', err);
    } finally {
      setIsSyncingTwitter(false);
    }
  };

  // Target sphere for the active cursor hover label
  const displaySphere = activeHoverSphere;

  // Handle sphere hover & cursor screen position
  const handleHoverSphere = (sphereId: string | null, mousePos?: { x: number; y: number }) => {
    setHoveredSphereId(sphereId);
    if (sphereId && mousePos) {
      const found = spheres.find(s => s.id === sphereId);
      if (found) {
        setActiveHoverSphere(found);
        setPopoverPos(mousePos);
        return;
      }
    }
    setActiveHoverSphere(null);
    setPopoverPos(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSphereName.trim() || !newOwnerName.trim()) return;

    const created: SphereItem = {
      id: `sphere-${Date.now()}`,
      name: newSphereName.trim(),
      ownerName: newOwnerName.trim(),
      description: newDescription.trim() || 'Custom 3D OOMFS Community Globe',
      mappingMode: newMappingMode,
      userCount: newUserCount,
      gridResolution: newGridResolution,
      theme: newTheme,
      seed: Math.floor(Math.random() * 10000),
      createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };

    onCreateSphere(created);
    setSelectedSphereId(created.id);
    setIsCreateModalOpen(false);

    // Reset form
    setNewSphereName('');
    setNewOwnerName(currentUser ? `@${currentUser.username}` : '');
    setNewDescription('');
    setNewUserCount(6);
    setNewGridResolution(512);
    setNewTheme('neon');
  };

  // Layout positioning helper: flip popover left if near right edge of screen
  const isNearRightEdge = popoverPos ? popoverPos.x > (typeof window !== 'undefined' ? window.innerWidth - 320 : 600) : false;
  const popoverLeft = popoverPos ? (isNearRightEdge ? popoverPos.x - 300 : popoverPos.x + 12) : 0;
  const popoverTop = popoverPos ? Math.max(80, Math.min(popoverPos.y - 20, typeof window !== 'undefined' ? window.innerHeight - 260 : 600)) : 0;

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      
      {/* 1. Native 3D Three.js Galaxy Canvas */}
      <GalaxyCanvas
        spheres={spheres}
        selectedSphereId={selectedSphereId}
        hoveredSphereId={hoveredSphereId}
        onSelectSphere={(id) => {
          setSelectedSphereId(id);
          onSelectSphere(id);
        }}
        onDoubleClickSphere={(id) => {
          onSelectSphere(id);
          onGoToMap();
        }}
        onHoverSphere={handleHoverSphere}
      />

      {/* 2. Top Right Floating Create Sphere Button */}
      <div className="absolute top-16 sm:top-20 right-4 z-20 pointer-events-auto">
        <button
          onClick={() => {
            if (!currentUser) {
              if (onOpenAuthModal) onOpenAuthModal('login');
            } else {
              setNewOwnerName(`@${currentUser.username}`);
              setIsCreateModalOpen(true);
            }
          }}
          className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-lg shadow-cyan-500/20 whitespace-nowrap"
        >
          {currentUser ? (
            <>
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Create Sphere</span>
            </>
          ) : (
            <>
              <Lock className="w-3.5 h-3.5" />
              <span>Log In to Create</span>
            </>
          )}
        </button>
      </div>

      {/* 3. Pure Minimalist Hover Label: "/spherename" (No card backdrop, enter on double-click) */}
      {popoverPos && displaySphere && (
        <div
          style={{
            position: 'fixed',
            left: `${popoverPos.x + 14}px`,
            top: `${popoverPos.y - 12}px`,
          }}
          className="z-40 pointer-events-none select-none font-mono text-sm sm:text-base font-black text-cyan-300 drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)] tracking-tight animate-in fade-in duration-100 flex items-center gap-1.5"
        >
          <span>/{displaySphere.name.toLowerCase().replace(/\s+/g, '-')}</span>
        </div>
      )}

      {/* 5. Create New Sphere Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg glass-panel p-6 rounded-3xl border border-cyan-500/40 shadow-2xl flex flex-col gap-5 text-left relative max-h-[90vh] overflow-y-auto bg-slate-950">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Globe2 className="w-5 h-5 text-cyan-400" />
                <h2 className="text-lg font-bold text-white">Create New 3D Sphere Planet</h2>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 1-Click Twitter OOMF Generator Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/80 via-slate-900 to-blue-950/80 border border-cyan-500/30 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span className="font-extrabold text-sm text-white">Auto-Generate Twitter/𝕏 OOMF Sphere</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  1:1 Fair Mode
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Connect your account to fetch exact 1:1 mutual followers (followers &cap; following) and auto-build an equal-partition 3D globe populated with live avatars.
              </p>
              <button
                type="button"
                disabled={isSyncingTwitter}
                onClick={handleTwitterOOMFCreate}
                className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
              >
                {isSyncingTwitter ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Syncing OOMFs...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate OOMF Sphere via Twitter / 𝕏</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center gap-3 my-1">
              <hr className="flex-1 border-slate-800" />
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Or Custom Configuration</span>
              <hr className="flex-1 border-slate-800" />
            </div>

            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4 text-xs">
              
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-300 font-semibold">Sphere Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Genesis Community Globe"
                  value={newSphereName}
                  onChange={e => setNewSphereName(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-slate-300 font-semibold">Sphere Host / Owner *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. @satoshi_oomf"
                  value={newOwnerName}
                  onChange={e => setNewOwnerName(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-slate-300 font-semibold">Description</label>
                <textarea
                  rows={2}
                  placeholder="Brief description of this community sphere..."
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-slate-300 font-semibold">Mapping Paradigm</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewMappingMode('conquest')}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                      newMappingMode === 'conquest'
                        ? 'border-cyan-500 bg-cyan-500/10 text-white'
                        : 'border-slate-800 bg-slate-900 text-slate-400'
                    }`}
                  >
                    <span className="font-bold text-xs">Value Conquest</span>
                    <span className="text-[10px] text-slate-400">Weighted territory sliders</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewMappingMode('discrete_1to1')}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                      newMappingMode === 'discrete_1to1'
                        ? 'border-cyan-500 bg-cyan-500/10 text-white'
                        : 'border-slate-800 bg-slate-900 text-slate-400'
                    }`}
                  >
                    <span className="font-bold text-xs">1:1 Discrete Mode</span>
                    <span className="text-[10px] text-slate-400">1 equal partition per user</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-300 font-semibold flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-cyan-400" /> Active Users
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={newUserCount}
                    onChange={e => setNewUserCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-300 font-semibold flex items-center gap-1">
                    <Grid className="w-3.5 h-3.5 text-amber-400" /> Grid Resolution
                  </label>
                  <select
                    value={newGridResolution}
                    onChange={e => setNewGridResolution(Number(e.target.value))}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  >
                    <option value={256}>256 quads</option>
                    <option value={512}>512 quads</option>
                    <option value={1024}>1024 quads</option>
                    <option value={2048}>2048 quads</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-slate-300 font-semibold flex items-center gap-1">
                  <Palette className="w-3.5 h-3.5 text-purple-400" /> Visual Theme
                </label>
                <select
                  value={newTheme}
                  onChange={e => setNewTheme(e.target.value as MapTheme)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="neon">Neon Cyberpunk</option>
                  <option value="topographic">Topographic Terrain</option>
                  <option value="heatmap">Heatmap Gradient</option>
                  <option value="wireframe">Holographic Wireframe</option>
                  <option value="minimal">Minimal Slate</option>
                  <option value="cyber">Dark Cyber Matrix</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black"
                >
                  Spawn 3D Planet
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default CodeGalaxyPage;
