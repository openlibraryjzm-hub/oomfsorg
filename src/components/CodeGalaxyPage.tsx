import React, { useState, useMemo, useEffect } from 'react';
import {
  Sparkles,
  Network,
  Globe2,
  Cpu,
  ArrowRight,
  Layers,
  Plus,
  Search,
  CheckCircle2,
  Terminal,
  X,
  Palette,
  Users,
  Grid,
  Compass,
  Star,
  ShieldCheck,
  Lock
} from 'lucide-react';
import { SphereItem, MappingMode, MapTheme } from '../types/map';
import { UserProfile } from '../types/auth';
import { GalaxyCanvas } from './GalaxyCanvas';

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
  // Command Filter state (defaulting to '/all')
  const [activeCommand, setActiveCommand] = useState<string>('/all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSphereId, setSelectedSphereId] = useState<string | null>(activeSphereId);
  const [hoveredSphereId, setHoveredSphereId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

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

  // Filtered Spheres based on Command and Search Query
  const filteredSpheres = useMemo(() => {
    return spheres.filter(sphere => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        sphere.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sphere.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sphere.description.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (activeCommand === '/mine') {
        if (!currentUser) return false;
        const myHandle = `@${currentUser.username}`.toLowerCase();
        const rawUsername = currentUser.username.toLowerCase();
        const sphereOwner = sphere.ownerName.toLowerCase();
        return sphereOwner === myHandle || sphereOwner === rawUsername;
      }
      if (activeCommand === '/conquest') return sphere.mappingMode === 'conquest';
      if (activeCommand === '/discrete_1to1') return sphere.mappingMode === 'discrete_1to1';
      if (activeCommand === '/high-res') return sphere.gridResolution >= 1024;
      return true; // Default '/all' returns all
    });
  }, [spheres, activeCommand, searchQuery, currentUser]);

  // Selected Sphere Details
  const focusedSphere = useMemo(() => {
    const idToFind = hoveredSphereId || selectedSphereId || activeSphereId;
    return spheres.find(s => s.id === idToFind) || spheres[0];
  }, [spheres, hoveredSphereId, selectedSphereId, activeSphereId]);

  // Is focused sphere owned by currently logged-in user?
  const isSphereOwnedByCurrentUser = useMemo(() => {
    if (!currentUser || !focusedSphere) return false;
    const myHandle = `@${currentUser.username}`.toLowerCase();
    const rawUsername = currentUser.username.toLowerCase();
    const sphereOwner = focusedSphere.ownerName.toLowerCase();
    return sphereOwner === myHandle || sphereOwner === rawUsername;
  }, [currentUser, focusedSphere]);

  // Totals
  const totalUsersMapped = useMemo(() => spheres.reduce((acc, s) => acc + s.userCount, 0), [spheres]);
  const totalQuadsMapped = useMemo(() => spheres.reduce((acc, s) => acc + s.gridResolution, 0), [spheres]);

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

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      
      {/* 1. Native 3D Three.js Galaxy Canvas (Starfield Universe + 3D Sphere Planet Nodes) */}
      <GalaxyCanvas
        spheres={filteredSpheres}
        selectedSphereId={selectedSphereId}
        hoveredSphereId={hoveredSphereId}
        onSelectSphere={(id) => {
          setSelectedSphereId(id);
          onSelectSphere(id);
        }}
        onHoverSphere={setHoveredSphereId}
      />

      {/* 2. Top Header HUD Overlay */}
      <div className="absolute top-4 left-4 right-4 z-20 pointer-events-none flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        
        {/* Title & Metrics Card */}
        <div className="glass-panel p-4 rounded-2xl border border-cyan-500/30 pointer-events-auto flex items-center gap-4 bg-slate-950/80 backdrop-blur-md shadow-2xl">
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            <Globe2 className="w-6 h-6 animate-pulse" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-white font-black text-lg tracking-tight">Code Galaxy 3D</span>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-mono border border-cyan-500/40">
                v2.0 WebGL
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
              <span>{spheres.length} Spheres</span>
              <span>•</span>
              <span>{totalUsersMapped} Nodes</span>
              <span>•</span>
              <span>{totalQuadsMapped.toLocaleString()} Quads</span>
            </div>
          </div>
        </div>

        {/* Command Preset Dock & Create Button */}
        <div className="glass-panel p-3 rounded-2xl border border-slate-800 pointer-events-auto flex items-center gap-3 bg-slate-950/80 backdrop-blur-md shadow-2xl flex-wrap">
          
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-xs text-slate-400 font-mono flex items-center gap-1 mr-1">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" /> Presets:
            </span>

            {[
              { cmd: '/all', label: '/all' },
              ...(currentUser ? [{ cmd: '/mine', label: '/mine' }] : []),
              { cmd: '/conquest', label: '/conquest' },
              { cmd: '/discrete_1to1', label: '/discrete 1:1' },
              { cmd: '/high-res', label: '/high-res' },
            ].map(p => (
              <button
                key={p.cmd}
                onClick={() => setActiveCommand(p.cmd)}
                className={`px-3 py-1.5 rounded-xl font-mono text-xs transition-all whitespace-nowrap border ${
                  activeCommand === p.cmd
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold shadow-md shadow-cyan-500/10'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="relative w-40">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Create Sphere Button - Requires Logged-In User */}
          <button
            onClick={() => {
              if (!currentUser) {
                if (onOpenAuthModal) onOpenAuthModal('login');
              } else {
                setNewOwnerName(`@${currentUser.username}`);
                setIsCreateModalOpen(true);
              }
            }}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-lg shadow-cyan-500/20 whitespace-nowrap"
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

      </div>

      {/* 3. 3D Controls Instruction Tip (Floating Bottom-Left) */}
      <div className="absolute bottom-6 left-6 z-20 pointer-events-none hidden md:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-950/90 backdrop-blur-md border border-cyan-500/30 text-[11px] font-mono text-slate-300 shadow-xl">
        <Compass className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '10s' }} />
        <span><strong className="text-cyan-300">Click empty space</strong> for 360° Pan-Look Mode • <strong className="text-cyan-300">WASD</strong> to Fly • Click 3D Node</span>
      </div>

      {/* 4. Selected 3D Node Inspector HUD Card (Floating Bottom-Center/Right) */}
      {focusedSphere && (
        <div className="absolute bottom-6 right-6 z-20 max-w-md w-full glass-panel p-5 rounded-3xl border border-cyan-500/40 bg-slate-950/90 backdrop-blur-md shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom-5 duration-200">
          
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono font-bold uppercase">
                  {focusedSphere.mappingMode === 'conquest' ? 'Value Conquest' : '1:1 Discrete'}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-mono">
                  {focusedSphere.theme}
                </span>

                {/* Your Sphere Badge */}
                {isSphereOwnedByCurrentUser && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" /> Your Sphere
                  </span>
                )}
              </div>
              <h3 className="text-xl font-black text-white">{focusedSphere.name}</h3>
            </div>

            {focusedSphere.id === activeSphereId && (
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold flex items-center gap-1 shrink-0">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Loaded Map
              </span>
            )}
          </div>

          <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
            {focusedSphere.description}
          </p>

          <div className="grid grid-cols-3 gap-2 bg-slate-900/80 p-3 rounded-2xl border border-slate-800/80 text-xs font-mono">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500">Host / Owner</span>
              <button
                onClick={() => setSearchQuery(focusedSphere.ownerName)}
                title="Click to filter by owner"
                className="text-cyan-400 font-semibold truncate hover:underline text-left flex items-center gap-1"
              >
                <ShieldCheck className="w-3 h-3 shrink-0 text-cyan-400" />
                <span className="truncate">{focusedSphere.ownerName}</span>
              </button>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500">Users</span>
              <span className="text-cyan-400 font-semibold">{focusedSphere.userCount} nodes</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500">Grid</span>
              <span className="text-amber-400 font-semibold">{focusedSphere.gridResolution} quads</span>
            </div>
          </div>

          <button
            onClick={() => {
              onSelectSphere(focusedSphere.id);
              onGoToMap();
            }}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/20 active:scale-95"
          >
            <span>Enter 3D Sphere Map</span>
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </button>

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
