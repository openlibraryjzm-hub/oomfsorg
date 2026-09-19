import React, { useState, useEffect } from 'react';
import {
  Globe,
  PieChart,
  Target,
  Sliders,
  Users,
  RotateCw,
  Grid,
  Sparkles,
  Palette,
  RefreshCw,
  Search,
  RotateCcw,
  Zap,
  CheckCircle2,
  ImagePlus,
  ImageMinus,
  Box,
  Activity,
  MapPin,
  X,
  ChevronRight,
  ChevronLeft,
  User,
  ArrowRight,
} from 'lucide-react';
import { MapSettings, MapTheme, UserAccount } from '../types/map';
import { Lock } from 'lucide-react';

interface RightDockPanelProps {
  settings: MapSettings;
  users: UserAccount[];
  activeUser: UserAccount | null;
  isHoveredOnly: boolean;
  onUpdateSettings: (updated: Partial<MapSettings>) => void;
  onResetSeed: () => void;
  onSelectUser: (id: number | null) => void;
  onUpdateUserShares: (newShares: number[]) => void;
  onEqualizeShares: () => void;
  onParetoShares: () => void;
  onRandomizeShares: () => void;
  onUploadUserImage?: (userId: number, imageDataUrl: string | undefined) => void;
  onUploadUserImageFile?: (userId: number, file: File | undefined) => void;
  isSphereOwner?: boolean;
  activeSphereOwnerName?: string;
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

export const RightDockPanel: React.FC<RightDockPanelProps> = ({
  settings,
  users,
  activeUser,
  isHoveredOnly,
  onUpdateSettings,
  onResetSeed,
  onSelectUser,
  onUpdateUserShares,
  onEqualizeShares,
  onParetoShares,
  onRandomizeShares,
  onUploadUserImage,
  onUploadUserImageFile,
  isSphereOwner = true,
  activeSphereOwnerName = 'Sphere Owner',
}) => {
  const [typedUserCount, setTypedUserCount] = useState<string>(settings.userCount.toString());
  const [searchTerm, setSearchTerm] = useState('');

  // Keep typed input in sync with settings.userCount when changed elsewhere
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

  const activeTab = settings.activePanelTab || 'config';
  const isOpen = settings.showRightPanel;

  // Sum of target shares
  const totalShareSum = users.reduce((sum, u) => sum + u.targetShare, 0);

  const filteredUsers = users.filter(
    u =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Zero-sum slider change handler
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
    <>
      {/* Toggle Button when Collapsed */}
      {!isOpen && (
        <button
          onClick={() => onUpdateSettings({ showRightPanel: true })}
          className="fixed top-20 right-4 z-30 p-2.5 rounded-2xl glass-panel text-cyan-400 hover:text-white border border-cyan-500/30 shadow-2xl flex items-center gap-2 hover:bg-slate-800/80 transition-all group"
          title="Open Control Dock"
        >
          <Sliders className="w-5 h-5 text-cyan-400 group-hover:rotate-45 transition-transform duration-300" />
          <span className="text-xs font-bold font-mono tracking-wider pr-1">DOCK</span>
          <ChevronLeft className="w-4 h-4 text-slate-400" />
        </button>
      )}

      {/* Main Right Dock Slide Panel */}
      <aside
        className={`fixed top-16 right-0 bottom-0 z-30 w-96 max-w-full glass-panel border-l border-slate-800 shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Top Header & Tab Selector */}
        <div className="p-3 border-b border-slate-800/90 bg-slate-950/80 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                <Sliders className="w-4 h-4 text-cyan-400" />
              </div>
              <h2 className="text-xs font-bold text-white tracking-wide uppercase font-mono">
                Control & Inspector Dock
              </h2>
            </div>

            <button
              onClick={() => onUpdateSettings({ showRightPanel: false })}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              title="Collapse Dock"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* 3 Main Navigation Tabs */}
          <div className="grid grid-cols-3 gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => onUpdateSettings({ activePanelTab: 'config' })}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'config'
                  ? 'bg-blue-600 text-white shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-cyan-300" />
              <span>Config</span>
            </button>

            <button
              onClick={() => onUpdateSettings({ activePanelTab: 'allocator' })}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'allocator'
                  ? 'bg-blue-600 text-white shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <PieChart className="w-3.5 h-3.5 text-emerald-300" />
              <span>Allocator</span>
            </button>

            <button
              onClick={() => onUpdateSettings({ activePanelTab: 'inspector' })}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'inspector'
                  ? 'bg-blue-600 text-white shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Target className="w-3.5 h-3.5 text-purple-300" />
              <span>Inspect</span>
              {activeUser && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />}
            </button>
          </div>
        </div>

        {/* Tab 1: Globe & Grid Configuration */}
        {activeTab === 'config' && (
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            
            {!isSphereOwner && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">View-Only Mode</span>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    Only the sphere owner (<strong className="text-amber-300">{activeSphereOwnerName}</strong>) can change grid resolution, mapping mode, themes, or seeds.
                  </p>
                </div>
              </div>
            )}

            {/* 0. Mapping Mode Switcher */}
            <div className={`flex flex-col gap-2 ${!isSphereOwner ? 'pointer-events-none opacity-50' : ''}`}>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5 text-purple-400">
                  <Globe className="w-4 h-4" /> Mapping Paradigm
                </span>
                <span className="font-mono text-purple-300 font-bold px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-[11px]">
                  {settings.mappingMode === 'discrete_1to1' ? '1:1 Fair Mode' : 'Conquest Mode'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => onUpdateSettings({ mappingMode: 'conquest', selectedUserId: null })}
                  className={`p-2 rounded-xl text-xs font-bold transition-all border flex flex-col items-center gap-0.5 text-center ${
                    settings.mappingMode === 'conquest'
                      ? 'bg-blue-600/30 border-blue-500 text-white shadow-md'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1 text-blue-400 font-extrabold">
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Conquest</span>
                  </div>
                  <span className="text-[9px] font-normal text-slate-400">Variable % Clusters</span>
                </button>

                <button
                  onClick={() => onUpdateSettings({ mappingMode: 'discrete_1to1', selectedUserId: null })}
                  className={`p-2 rounded-xl text-xs font-bold transition-all border flex flex-col items-center gap-0.5 text-center ${
                    settings.mappingMode === 'discrete_1to1'
                      ? 'bg-emerald-600/30 border-emerald-500 text-white shadow-md'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1 text-emerald-400 font-extrabold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>1:1 Equal</span>
                  </div>
                  <span className="text-[9px] font-normal text-slate-400">1 Tile / User (Fair 1/N)</span>
                </button>
              </div>
            </div>

            <hr className="border-slate-800" />

            {/* 1. Grid Resolution Picker (Conquest Mode) or 1:1 Mode Info */}
            {settings.mappingMode === 'conquest' ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span className="flex items-center gap-1.5 text-blue-400">
                    <Grid className="w-4 h-4" /> Grid Resolution
                  </span>
                  <span className="font-mono text-cyan-300 font-bold px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-[11px]">
                    {settings.gridResolution} Quads
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {GRID_PRESETS.map(res => (
                    <button
                      key={res}
                      onClick={() => onUpdateSettings({ gridResolution: res, selectedUserId: null })}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all font-mono border ${
                        settings.gridResolution === res
                          ? 'bg-blue-600/90 border-blue-400 text-white shadow-md shadow-blue-500/20'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      {res}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  {settings.gridResolution === 512 || settings.gridResolution === 2048
                    ? '1:1 Square quad tiles across 3D sphere.'
                    : 'High density quad grid geometry.'}
                </p>
              </div>
            ) : (
              <div className="bg-emerald-950/40 p-3 rounded-xl border border-emerald-500/30 flex flex-col gap-1 text-xs">
                <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 1:1 Fair Distribution Active
                </span>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Globe surface is divided into exactly <strong>{settings.userCount} equal partition tiles</strong>. Every user owns 1 discrete tile (<strong>{(100 / settings.userCount).toFixed(1)}% area</strong>).
                </p>
              </div>
            )}

            <hr className="border-slate-800" />

            {/* 2. Active User Accounts (Typed + Presets) */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5 text-indigo-400">
                  <Users className="w-4 h-4" /> Active Accounts (U)
                </span>
                <span className="font-mono text-indigo-300 font-bold text-xs">
                  U = {settings.userCount}
                </span>
              </div>

              {/* Typed Input Field */}
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
                  Custom U:
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
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-cyan-300 font-bold focus:outline-none focus:border-indigo-500 transition-all"
                  placeholder="Enter user count..."
                />
                <button
                  onClick={() => handleUserCountSubmit(typedUserCount)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-md"
                >
                  Set
                </button>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-1.5">
                {USER_PRESETS.map(preset => (
                  <button
                    key={preset}
                    onClick={() => {
                      onUpdateSettings({ userCount: preset, selectedUserId: null });
                      setTypedUserCount(preset.toString());
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all font-mono ${
                      settings.userCount === preset
                        ? 'bg-indigo-600 text-white shadow-md ring-1 ring-indigo-400'
                        : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {preset} U
                  </button>
                ))}
              </div>
            </div>

            <hr className="border-slate-800" />

            {/* 3. Visual Themes */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5 text-pink-400">
                  <Palette className="w-4 h-4" /> Visual Theme
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {THEMES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => onUpdateSettings({ theme: t.id })}
                    className={`flex items-center gap-2 p-2 rounded-xl text-xs font-medium transition-all border ${
                      settings.theme === t.id
                        ? 'border-pink-500/80 bg-pink-500/10 text-white font-semibold shadow-md'
                        : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full bg-gradient-to-r ${t.color}`} />
                    <span className="truncate">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <hr className="border-slate-800" />

            {/* 4. Display Toggles & Seed Action */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-slate-300">Display Controls</span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => onUpdateSettings({ autoRotate: !settings.autoRotate })}
                  className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-[11px] font-semibold border transition-all ${
                    settings.autoRotate
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <RotateCw className={`w-3.5 h-3.5 ${settings.autoRotate ? 'animate-spin' : ''}`} />
                  Rotate
                </button>

                <button
                  onClick={() => onUpdateSettings({ showGrid: !settings.showGrid })}
                  className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-[11px] font-semibold border transition-all ${
                    settings.showGrid
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Grid className="w-3.5 h-3.5" />
                  Grid
                </button>

                <button
                  onClick={() => onUpdateSettings({ showAtmosphere: !settings.showAtmosphere })}
                  className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-[11px] font-semibold border transition-all ${
                    settings.showAtmosphere
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Glow
                </button>
              </div>

              <button
                onClick={onResetSeed}
                className="mt-1 w-full py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
                <span>Re-Seed Territory Clusters</span>
              </button>
            </div>

          </div>
        )}

        {/* Tab 2: Territory Conquest Allocator */}
        {activeTab === 'allocator' && (
          <div className="flex-1 overflow-hidden flex flex-col">
            
            {!isSphereOwner && (
              <div className="p-3 m-3 mb-0 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">View-Only Mode</span>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    Only the sphere owner (<strong className="text-amber-300">{activeSphereOwnerName}</strong>) can change area allocations or tile textures.
                  </p>
                </div>
              </div>
            )}
            
            {/* Presets Bar & Search */}
            <div className={`p-3 border-b border-slate-800 flex flex-col gap-2 bg-slate-950/40 ${!isSphereOwner ? 'pointer-events-none opacity-50' : ''}`}>
              {settings.mappingMode === 'discrete_1to1' ? (
                <div className="bg-emerald-950/50 p-2 rounded-xl border border-emerald-500/30 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>1:1 Mode: Equal 1/N Area ({ (100 / users.length).toFixed(1) }%)</span>
                  </div>
                  <button
                    onClick={() => onUpdateSettings({ mappingMode: 'conquest' })}
                    className="px-2 py-0.5 rounded bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 font-bold text-[10px] transition-all"
                  >
                    Custom Sliders
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                    <span>{users.length} Active Accounts</span>
                    <span className="text-emerald-400 font-mono font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {totalShareSum.toFixed(1)}% Total
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={onEqualizeShares}
                      className="flex items-center justify-center gap-1 p-2 rounded-xl text-[11px] font-semibold bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-800 transition-all"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
                      Equalize
                    </button>

                    <button
                      onClick={onParetoShares}
                      className="flex items-center justify-center gap-1 p-2 rounded-xl text-[11px] font-semibold bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-800 transition-all"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      Pareto
                    </button>

                    <button
                      onClick={onRandomizeShares}
                      className="flex items-center justify-center gap-1 p-2 rounded-xl text-[11px] font-semibold bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-800 transition-all"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
                      Randomize
                    </button>
                  </div>
                </>
              )}

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search accounts..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Scrollable User Allocation List */}
            <div className={`flex-1 overflow-y-auto p-3 flex flex-col gap-2 ${!isSphereOwner ? 'pointer-events-none opacity-60' : ''}`}>
              {filteredUsers.map((user) => {
                const isSelected = settings.selectedUserId === user.id;
                const userIdx = users.findIndex(u => u.id === user.id);

                return (
                  <div
                    key={user.id}
                    onClick={() => onSelectUser(user.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 ${
                      isSelected
                        ? 'bg-blue-600/15 border-blue-500 shadow-md shadow-blue-500/10'
                        : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-slate-500 w-6">
                          #{userIdx + 1}
                        </span>

                        <span
                          className="w-3 h-3 rounded-full ring-2 ring-white/10"
                          style={{ backgroundColor: user.color }}
                        />

                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white">{user.name}</span>
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-400">
                              {user.code}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {user.category} • {user.tileCount} tiles
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {user.customImage ? (
                          <div className="flex items-center gap-1">
                            <img
                              src={user.customImage}
                              alt="Tile Texture"
                              className="w-5 h-5 rounded object-cover ring-1 ring-cyan-400/50"
                            />
                            <button
                              title="Remove custom tile image"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onUploadUserImageFile) onUploadUserImageFile(user.id, undefined);
                                else if (onUploadUserImage) onUploadUserImage(user.id, undefined);
                              }}
                              className="p-1 rounded bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all"
                            >
                              <ImageMinus className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <label
                            title="Upload tile texture image"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 px-1.5 rounded bg-slate-800/80 hover:bg-blue-600/30 text-slate-400 hover:text-blue-400 border border-slate-700/60 cursor-pointer transition-all flex items-center gap-1"
                          >
                            <ImagePlus className="w-3 h-3" />
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                if (onUploadUserImageFile) {
                                  onUploadUserImageFile(user.id, file);
                                } else if (onUploadUserImage) {
                                  const reader = new FileReader();
                                  reader.onload = (evt) => {
                                    const dataUrl = evt.target?.result as string;
                                    if (dataUrl) onUploadUserImage(user.id, dataUrl);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                        )}

                        <div className="text-right">
                          <span className="text-xs font-bold font-mono text-cyan-300">
                            {user.targetShare.toFixed(1)}%
                          </span>
                          <span className="block text-[9px] text-slate-500 font-mono">
                            {user.actualShare}% act
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Area Range Slider (Conquest Mode) */}
                    {settings.mappingMode === 'conquest' && (
                      <input
                        type="range"
                        min="0.1"
                        max="90"
                        step="0.1"
                        value={user.targetShare}
                        onChange={e => handleSliderChange(userIdx, parseFloat(e.target.value))}
                        onClick={e => e.stopPropagation()}
                        className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Territory Inspector */}
        {activeTab === 'inspector' && (
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {activeUser ? (
              <div className="flex flex-col gap-3">
                {/* Account Header Card */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {activeUser.customImage ? (
                      <img
                        src={activeUser.customImage}
                        alt="Avatar"
                        className="w-7 h-7 rounded-full object-cover ring-2 ring-cyan-400/80 shadow-md"
                      />
                    ) : (
                      <span
                        className="w-5 h-5 rounded-full ring-2 ring-white/20 shadow-md"
                        style={{ backgroundColor: activeUser.color }}
                      />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white tracking-wide">{activeUser.name}</h3>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {activeUser.code}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                        <TagPill category={activeUser.category} />
                        <span>•</span>
                        <span>Account #{activeUser.id}</span>
                      </p>
                    </div>
                  </div>

                  {!isHoveredOnly && (
                    <button
                      onClick={() => onSelectUser(null)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                      title="Clear Selection"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <hr className="border-slate-800" />

                {/* Custom Tile Image Upload Box */}
                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {activeUser.customImage ? (
                      <img
                        src={activeUser.customImage}
                        alt="Tile Texture"
                        className="w-7 h-7 rounded-lg object-cover ring-1 ring-cyan-400/50"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500">
                        <ImagePlus className="w-4 h-4" />
                      </div>
                    )}
                    <div>
                      <span className="text-xs font-semibold text-white block">
                        {activeUser.customImage ? 'Custom Tile Image' : 'Tile Image Texture'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {activeUser.customImage ? `Spread across ${activeUser.tileCount} tiles` : 'Upload image to repeat 1 per tile'}
                      </span>
                    </div>
                  </div>

                  <div>
                    {activeUser.customImage ? (
                      <button
                        onClick={() => {
                          if (onUploadUserImageFile) onUploadUserImageFile(activeUser.id, undefined);
                          else if (onUploadUserImage) onUploadUserImage(activeUser.id, undefined);
                        }}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-medium flex items-center gap-1 transition-all"
                      >
                        <ImageMinus className="w-3.5 h-3.5" />
                        <span>Clear</span>
                      </button>
                    ) : (
                      <label className="p-1.5 px-2.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all">
                        <ImagePlus className="w-3.5 h-3.5 text-blue-400" />
                        <span>Upload</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (onUploadUserImageFile) {
                              onUploadUserImageFile(activeUser.id, file);
                            } else if (onUploadUserImage) {
                              const reader = new FileReader();
                              reader.onload = (evt) => {
                                const dataUrl = evt.target?.result as string;
                                if (dataUrl) onUploadUserImage(activeUser.id, dataUrl);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 flex flex-col gap-1">
                    <span className="flex items-center gap-1 text-slate-400 text-[11px]">
                      <Box className="w-3 h-3 text-blue-400" /> Owned Tiles
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold font-mono text-white">{activeUser.tileCount}</span>
                      <span className="text-[10px] text-slate-400">tiles</span>
                    </div>
                  </div>

                  <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 flex flex-col gap-1">
                    <span className="flex items-center gap-1 text-slate-400 text-[11px]">
                      <Target className="w-3 h-3 text-emerald-400" /> Globe Share
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold font-mono text-emerald-300">{activeUser.actualShare}</span>
                      <span className="text-[10px] text-slate-400">% area</span>
                    </div>
                  </div>
                </div>

                {/* Metric Score Bar */}
                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span className="flex items-center gap-1">
                      <Activity className="w-3 h-3 text-cyan-400" /> Metric Score
                    </span>
                    <span className="text-cyan-300 font-mono font-bold">{activeUser.value}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${activeUser.value}%`,
                        backgroundColor: activeUser.color,
                      }}
                    />
                  </div>
                </div>

                {/* 3D Vector Coordinates Box */}
                <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 flex flex-col gap-1 font-mono text-[11px]">
                  <div className="flex items-center justify-between text-slate-400 text-[10px]">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-purple-400" /> Territory 3D Centroid
                    </span>
                    <span className="text-purple-300">
                      [{activeUser.centroid3D[0].toFixed(2)}, {activeUser.centroid3D[1].toFixed(2)}, {activeUser.centroid3D[2].toFixed(2)}]
                    </span>
                  </div>
                </div>

                {isHoveredOnly && (
                  <p className="text-[10px] text-slate-400 text-center italic">
                    Click territory tile to pin selection
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500 gap-2">
                <Target className="w-8 h-8 text-slate-600 animate-pulse" />
                <span className="text-xs font-semibold text-slate-400">No Territory Selected</span>
                <p className="text-[11px] text-slate-500 max-w-xs">
                  Hover over or click any territory tile on the 3D globe to inspect its account details and coordinates.
                </p>
              </div>
            )}
          </div>
        )}
      </aside>
    </>
  );
};

const TagPill: React.FC<{ category: string }> = ({ category }) => {
  const colors: Record<string, string> = {
    Resource: 'text-amber-400 bg-amber-400/10',
    Urban: 'text-blue-400 bg-blue-400/10',
    Wilderness: 'text-emerald-400 bg-emerald-400/10',
    Industrial: 'text-orange-400 bg-orange-400/10',
    Research: 'text-purple-400 bg-purple-400/10',
    Transit: 'text-cyan-400 bg-cyan-400/10',
  };

  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${colors[category] || 'text-slate-300 bg-slate-800'}`}>
      {category}
    </span>
  );
};
