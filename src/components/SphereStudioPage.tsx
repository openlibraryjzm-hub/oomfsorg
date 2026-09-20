import React, { useState, useEffect } from 'react';
import {
  Globe,
  PieChart,
  Target,
  Sliders,
  Users,
  RotateCw,
  Grid,
  Palette,
  RefreshCw,
  Search,
  RotateCcw,
  Zap,
  CheckCircle2,
  ImagePlus,
  ImageMinus,
  Lock,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { MapSettings, MapTheme, UserAccount } from '../types/map';

interface SphereStudioPageProps {
  settings: MapSettings;
  users: UserAccount[];
  onUpdateSettings: (updated: Partial<MapSettings>) => void;
  onResetSeed: () => void;
  onUpdateUserShares: (newShares: number[]) => void;
  onEqualizeShares: () => void;
  onParetoShares: () => void;
  onRandomizeShares: () => void;
  onUploadUserImageFile?: (userId: number, file: File | undefined) => void;
  isSphereOwner?: boolean;
  activeSphereOwnerName?: string;
  onGoToMap: () => void;
}

const GRID_PRESETS = [256, 512, 1024, 2048];
const USER_PRESETS = [4, 6, 10, 16, 32, 64];

const THEMES: Array<{ id: MapTheme; label: string; color: string }> = [
  { id: 'neon', label: 'Neon Cyber', color: 'from-blue-500 to-pink-500' },
  { id: 'cyber', label: 'Matrix Glow', color: 'from-cyan-400 to-emerald-400' },
  { id: 'topographic', label: 'Topographic', color: 'from-emerald-600 to-teal-400' },
  { id: 'heatmap', label: 'Heatmap Spectrum', color: 'from-blue-600 via-yellow-400 to-red-500' },
  { id: 'minimal', label: 'Slate Minimal', color: 'from-slate-600 to-slate-400' },
  { id: 'wireframe', label: 'Synth Wireframe', color: 'from-purple-500 to-indigo-400' },
];

export const SphereStudioPage: React.FC<SphereStudioPageProps> = ({
  settings,
  users,
  onUpdateSettings,
  onResetSeed,
  onUpdateUserShares,
  onEqualizeShares,
  onParetoShares,
  onRandomizeShares,
  onUploadUserImageFile,
  isSphereOwner = true,
  activeSphereOwnerName = 'Sphere Owner',
  onGoToMap,
}) => {
  const [typedUserCount, setTypedUserCount] = useState<string>(settings.userCount.toString());
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'config' | 'allocator'>('config');

  useEffect(() => {
    setTypedUserCount(settings.userCount.toString());
  }, [settings.userCount]);

  const handleUserCountSubmit = (valStr: string) => {
    const val = parseInt(valStr, 10);
    if (!isNaN(val) && val >= 1) {
      const clamped = Math.min(val, settings.gridResolution);
      onUpdateSettings({ userCount: clamped, selectedUserId: null });
      setTypedUserCount(clamped.toString());
    }
  };

  const totalShareSum = users.reduce((sum, u) => sum + u.targetShare, 0);

  const filteredUsers = users.filter(
    u =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSliderChange = (changedIdx: number, newVal: number) => {
    const currentShares = users.map(u => u.targetShare);
    const count = currentShares.length;

    if (count <= 1) return;

    const targetVal = Math.min(95, Math.max(0.1, newVal));
    const oldVal = currentShares[changedIdx];
    const diff = targetVal - oldVal;
    const remainingSum = 100 - oldVal;

    const nextShares = currentShares.map((s, idx) => {
      if (idx === changedIdx) return targetVal;
      if (remainingSum <= 0.001) return (100 - targetVal) / (count - 1);
      const ratio = s / remainingSum;
      return Math.max(0.1, s - diff * ratio);
    });

    const sumNext = nextShares.reduce((a, b) => a + b, 0);
    const normalized = nextShares.map(s => Math.round((s / sumNext) * 1000) / 10);
    const normSum = Math.round(normalized.reduce((a, b) => a + b, 0) * 10) / 10;
    const sumDiff = Math.round((100 - normSum) * 10) / 10;
    if (sumDiff !== 0) {
      const maxIdx = normalized.indexOf(Math.max(...normalized));
      normalized[maxIdx] = Math.round((normalized[maxIdx] + sumDiff) * 10) / 10;
    }

    onUpdateUserShares(normalized);
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-white p-4 sm:p-8 font-mono pb-24">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        
        {/* Top Header Navigation */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl">
          <div className="flex items-center gap-3">
            <button
              onClick={onGoToMap}
              className="p-2.5 rounded-2xl bg-zinc-900 hover:bg-white hover:text-black border border-zinc-700 text-white transition-all shadow-md"
              title="Return to 3D Sphere Map"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <Globe className="w-6 h-6 text-white animate-spin-slow" />
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Sphere Studio</h1>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Sphere Planet Owner: <strong className="text-white">{activeSphereOwnerName}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onGoToMap}
              className="px-5 py-2.5 rounded-2xl bg-white text-black font-extrabold text-xs shadow-lg hover:bg-zinc-200 transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Launch 3D Map</span>
            </button>
          </div>
        </div>

        {!isSphereOwner && (
          <div className="p-4 rounded-3xl bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm flex items-start gap-3">
            <Lock className="w-5 h-5 text-white shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold text-white">View-Only Mode</span>
              <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                Only the sphere owner (<strong className="text-white">{activeSphereOwnerName}</strong>) can modify grid resolution, mapping paradigm, themes, or area allocations.
              </p>
            </div>
          </div>
        )}

        {/* Tab Selector */}
        <div className="grid grid-cols-2 gap-2 bg-zinc-950 p-1.5 rounded-2xl border border-zinc-800">
          <button
            onClick={() => setActiveTab('config')}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-extrabold transition-all ${
              activeTab === 'config'
                ? 'bg-white text-black shadow-lg'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Globe & Grid Config</span>
          </button>

          <button
            onClick={() => setActiveTab('allocator')}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-extrabold transition-all ${
              activeTab === 'allocator'
                ? 'bg-white text-black shadow-lg'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <PieChart className="w-4 h-4" />
            <span>Territory Conquest Allocator</span>
          </button>
        </div>

        {/* Tab 1: Globe & Grid Configuration */}
        {activeTab === 'config' && (
          <div className={`flex flex-col gap-6 p-6 rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl ${!isSphereOwner ? 'pointer-events-none opacity-60' : ''}`}>
            
            {/* Mapping Paradigm */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  <Globe className="w-4 h-4" /> Mapping Paradigm
                </span>
                <span className="font-mono text-white font-bold px-3 py-1 rounded-full bg-zinc-900 border border-zinc-700 text-xs">
                  {settings.mappingMode === 'discrete_1to1' ? '1:1 Fair Mode' : 'Conquest Mode'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => onUpdateSettings({ mappingMode: 'conquest', selectedUserId: null })}
                  className={`p-4 rounded-2xl text-xs font-bold transition-all border flex flex-col gap-1.5 text-left ${
                    settings.mappingMode === 'conquest'
                      ? 'bg-white text-black border-white shadow-xl'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex items-center justify-between font-extrabold text-sm">
                    <span className="flex items-center gap-2">
                      <Sliders className="w-4 h-4" /> Conquest Mode
                    </span>
                  </div>
                  <span className="text-xs opacity-80 leading-relaxed">
                    Variable zero-sum target area percentages. Accounts own multi-tile contiguous territory clusters.
                  </span>
                </button>

                <button
                  onClick={() => onUpdateSettings({ mappingMode: 'discrete_1to1', selectedUserId: null })}
                  className={`p-4 rounded-2xl text-xs font-bold transition-all border flex flex-col gap-1.5 text-left ${
                    settings.mappingMode === 'discrete_1to1'
                      ? 'bg-white text-black border-white shadow-xl'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex items-center justify-between font-extrabold text-sm">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> 1:1 Equal Fair Mode
                    </span>
                  </div>
                  <span className="text-xs opacity-80 leading-relaxed">
                    Every active account receives exactly 1 discrete partition tile (1/N equal area).
                  </span>
                </button>
              </div>
            </div>

            <hr className="border-zinc-800" />

            {/* Grid Resolution Picker */}
            {settings.mappingMode === 'conquest' && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white flex items-center gap-2">
                    <Grid className="w-4 h-4" /> Grid Resolution
                  </span>
                  <span className="font-mono text-white font-bold px-3 py-1 rounded-full bg-zinc-900 border border-zinc-700 text-xs">
                    {settings.gridResolution} Quads
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {GRID_PRESETS.map(res => (
                    <button
                      key={res}
                      onClick={() => onUpdateSettings({ gridResolution: res, selectedUserId: null })}
                      className={`py-3 px-4 rounded-2xl text-sm font-extrabold transition-all font-mono border ${
                        settings.gridResolution === res
                          ? 'bg-white text-black border-white shadow-xl'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white'
                      }`}
                    >
                      {res} Quads
                    </button>
                  ))}
                </div>
              </div>
            )}

            <hr className="border-zinc-800" />

            {/* Active User Accounts (U) */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4" /> Active Accounts (U)
                </span>
                <span className="font-mono text-white font-bold text-xs">
                  U = {settings.userCount}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-xs text-zinc-400 font-medium whitespace-nowrap">
                  Custom User Count U:
                </label>
                <input
                  type="number"
                  min="1"
                  max={settings.gridResolution}
                  value={typedUserCount}
                  onChange={e => setTypedUserCount(e.target.value)}
                  onBlur={() => handleUserCountSubmit(typedUserCount)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleUserCountSubmit(typedUserCount);
                  }}
                  className="w-full px-4 py-2.5 rounded-2xl bg-zinc-900 border border-zinc-700 text-sm font-mono text-white font-bold focus:outline-none focus:border-white transition-all"
                  placeholder="Enter user count..."
                />
                <button
                  onClick={() => handleUserCountSubmit(typedUserCount)}
                  className="px-5 py-2.5 rounded-2xl bg-white hover:bg-zinc-200 text-black font-black text-xs transition-all shadow-md shrink-0"
                >
                  Set U
                </button>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {USER_PRESETS.map(preset => (
                  <button
                    key={preset}
                    onClick={() => {
                      onUpdateSettings({ userCount: preset, selectedUserId: null });
                      setTypedUserCount(preset.toString());
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all font-mono border ${
                      settings.userCount === preset
                        ? 'bg-white text-black border-white shadow-md font-black'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white'
                    }`}
                  >
                    {preset} Accounts
                  </button>
                ))}
              </div>
            </div>

            <hr className="border-zinc-800" />

            {/* Visual Themes */}
            <div className="flex flex-col gap-3">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <Palette className="w-4 h-4" /> Visual Themes
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {THEMES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => onUpdateSettings({ theme: t.id })}
                    className={`flex items-center gap-3 p-3 rounded-2xl text-xs font-bold transition-all border ${
                      settings.theme === t.id
                        ? 'border-white bg-zinc-800 text-white shadow-lg ring-1 ring-white/50'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full bg-gradient-to-r ${t.color} shrink-0`} />
                    <span className="truncate">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <hr className="border-zinc-800" />

            {/* Display Controls & Seed */}
            <div className="flex flex-col gap-3">
              <span className="text-sm font-bold text-white">Display Controls & Re-Seed</span>
              
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => onUpdateSettings({ autoRotate: !settings.autoRotate })}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-bold border transition-all ${
                    settings.autoRotate
                      ? 'bg-white text-black border-white'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <RotateCw className={`w-4 h-4 ${settings.autoRotate ? 'animate-spin' : ''}`} />
                  <span>Auto-Rotation</span>
                </button>

                <button
                  onClick={() => onUpdateSettings({ showGrid: !settings.showGrid })}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-bold border transition-all ${
                    settings.showGrid
                      ? 'bg-white text-black border-white'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Grid className="w-4 h-4" />
                  <span>Tile Grid Lines</span>
                </button>
              </div>

              <button
                onClick={onResetSeed}
                className="w-full py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700 text-xs font-extrabold flex items-center justify-center gap-2 transition-all shadow-lg"
              >
                <RefreshCw className="w-4 h-4 text-white" />
                <span>Re-Seed Procedural 3D Territory Clusters</span>
              </button>
            </div>

          </div>
        )}

        {/* Tab 2: Territory Conquest Allocator */}
        {activeTab === 'allocator' && (
          <div className={`flex flex-col gap-4 p-6 rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl ${!isSphereOwner ? 'pointer-events-none opacity-60' : ''}`}>
            
            {/* Presets & Search Bar */}
            <div className="flex flex-col gap-3">
              {settings.mappingMode === 'discrete_1to1' ? (
                <div className="bg-zinc-900 p-3.5 rounded-2xl border border-zinc-700 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-white font-bold">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>1:1 Fair Distribution Active ({(100 / users.length).toFixed(1)}% area per user)</span>
                  </div>
                  <button
                    onClick={() => onUpdateSettings({ mappingMode: 'conquest' })}
                    className="px-3 py-1 rounded-xl bg-white text-black font-extrabold text-xs transition-all hover:bg-zinc-200"
                  >
                    Custom Area Sliders
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-xs text-zinc-300 font-medium">
                    <span>{users.length} Active User Accounts</span>
                    <span className="text-white font-mono font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      {totalShareSum.toFixed(1)}% Total Allocation
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={onEqualizeShares}
                      className="flex items-center justify-center gap-1.5 p-2.5 rounded-2xl text-xs font-bold bg-zinc-900 hover:bg-white hover:text-black text-white border border-zinc-700 transition-all shadow-md"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Equalize
                    </button>

                    <button
                      onClick={onParetoShares}
                      className="flex items-center justify-center gap-1.5 p-2.5 rounded-2xl text-xs font-bold bg-zinc-900 hover:bg-white hover:text-black text-white border border-zinc-700 transition-all shadow-md"
                    >
                      <Zap className="w-4 h-4" />
                      Pareto 80/20
                    </button>

                    <button
                      onClick={onRandomizeShares}
                      className="flex items-center justify-center gap-1.5 p-2.5 rounded-2xl text-xs font-bold bg-zinc-900 hover:bg-white hover:text-black text-white border border-zinc-700 transition-all shadow-md"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Randomize
                    </button>
                  </div>
                </>
              )}

              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search accounts by handle, code, or category..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-zinc-900 border border-zinc-700 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-all"
                />
              </div>
            </div>

            {/* Scrollable Account List */}
            <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-1">
              {filteredUsers.map((user) => {
                const userIdx = users.findIndex(u => u.id === user.id);

                return (
                  <div
                    key={user.id}
                    className="p-4 rounded-2xl border bg-zinc-900/90 border-zinc-800 flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-bold text-zinc-400 w-8">
                          #{userIdx + 1}
                        </span>

                        <span
                          className="w-4 h-4 rounded-full ring-2 ring-white/40 shrink-0"
                          style={{ backgroundColor: user.color }}
                        />

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-extrabold text-white">{user.name}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                              {user.code}
                            </span>
                          </div>
                          <span className="text-xs text-zinc-400 font-medium">
                            {user.category} • {user.tileCount} tiles owned
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {user.customImage ? (
                          <div className="flex items-center gap-2">
                            <img
                              src={user.customImage}
                              alt="Tile Texture"
                              className="w-7 h-7 rounded-lg object-cover ring-1 ring-white"
                            />
                            <button
                              title="Remove custom tile image"
                              onClick={() => {
                                if (onUploadUserImageFile) onUploadUserImageFile(user.id, undefined);
                              }}
                              className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-300 border border-red-500/40 text-xs font-bold transition-all"
                            >
                              <ImageMinus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <label
                            title="Upload tile texture image"
                            className="p-1.5 px-3 rounded-xl bg-white hover:bg-zinc-200 text-black border border-white font-extrabold text-xs cursor-pointer transition-all flex items-center gap-1.5"
                          >
                            <ImagePlus className="w-3.5 h-3.5" />
                            <span>Upload Image</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                if (onUploadUserImageFile) {
                                  onUploadUserImageFile(user.id, file);
                                }
                              }}
                            />
                          </label>
                        )}

                        <div className="text-right font-mono">
                          <span className="text-sm font-extrabold text-white">
                            {user.targetShare.toFixed(1)}%
                          </span>
                          <span className="block text-[10px] text-zinc-400">
                            {user.actualShare}% act
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Area Range Slider */}
                    {settings.mappingMode === 'conquest' && (
                      <input
                        type="range"
                        min="0.1"
                        max="90"
                        step="0.1"
                        value={user.targetShare}
                        onChange={e => handleSliderChange(userIdx, parseFloat(e.target.value))}
                        className="w-full accent-white h-2 bg-zinc-800 rounded-lg cursor-pointer"
                      />
                    )}
                  </div>
                );
              })}
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
