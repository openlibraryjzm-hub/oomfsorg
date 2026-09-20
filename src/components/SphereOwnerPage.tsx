import React from 'react';
import { ShieldCheck, Server, Globe, Key, Award, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';

interface SphereOwnerPageProps {
  userCount: number;
  tileCount: number;
  ownerName?: string;
  onGoToMap: () => void;
}

export const SphereOwnerPage: React.FC<SphereOwnerPageProps> = ({
  userCount,
  tileCount,
  ownerName = 'oprah',
  onGoToMap,
}) => {
  const displayHandle = ownerName.replace(/^@/, '').toLowerCase().replace(/\s+/g, '-');
  const avatarInitials = `@${displayHandle.slice(0, 2).toUpperCase()}`;

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-6 z-10 overflow-y-auto">
      <div className="max-w-3xl w-full glass-panel p-8 rounded-3xl shadow-2xl border border-indigo-500/30 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-300">
        
        {/* Header Hero Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-cyan-300 font-bold text-xl">
                  {avatarInitials}
                </div>
              </div>
              <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-slate-950 p-1 rounded-full ring-2 ring-slate-950">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-white">@{displayHandle}</h1>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-indigo-400" />
                  Verified Sphere Host
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Host ID: SPHERE-HOST-001 • Master Node Validator
              </p>
            </div>
          </div>

          <button
            onClick={onGoToMap}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/30"
          >
            <span>Inspect Managed Sphere</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Bio / Governance Description */}
        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 text-xs text-slate-300 leading-relaxed flex flex-col gap-2">
          <span className="font-bold text-white flex items-center gap-1.5">
            <Server className="w-4 h-4 text-cyan-400" /> Network Sphere Owner & Infrastructure Host
          </span>
          <p>
            Unlike variable partition accounts, the Sphere Owner maintains the permanent cryptographic seed, resolution grid configuration, and zero-sum area allocation protocol for this 3D sphere instance.
          </p>
        </div>

        {/* Managed Sphere Parameters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 flex flex-col gap-1.5">
            <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-cyan-400" /> Managed Sphere Grid
            </span>
            <span className="text-lg font-bold font-mono text-white">{tileCount} Tiles</span>
            <span className="text-[10px] font-mono text-cyan-300">1:1 Square Resolution</span>
          </div>

          <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 flex flex-col gap-1.5">
            <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> Active Member Partitions
            </span>
            <span className="text-lg font-bold font-mono text-white">{userCount} Accounts</span>
            <span className="text-[10px] font-mono text-amber-300">Zero-Sum Allocator</span>
          </div>

          <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 flex flex-col gap-1.5">
            <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-purple-400" /> Node Staking Class
            </span>
            <span className="text-lg font-bold font-mono text-white">Tier-1 Anchor</span>
            <span className="text-[10px] font-mono text-purple-300">99.98% Uptime</span>
          </div>
        </div>

        {/* Cryptographic Key Details */}
        <div className="bg-slate-950/90 p-4 rounded-2xl border border-slate-800/80 flex flex-col gap-2 font-mono text-[11px]">
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1.5 text-slate-300 font-bold">
              <Key className="w-3.5 h-3.5 text-indigo-400" /> Sphere Anchor Address
            </span>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Active Sync
            </span>
          </div>
          <p className="text-slate-400 break-all bg-slate-900/90 p-2.5 rounded-xl border border-slate-800/60 text-[10px]">
            0x8F92a71C43e90B2D44109eB58aA190472149b56F
          </p>
        </div>

      </div>
    </div>
  );
};
