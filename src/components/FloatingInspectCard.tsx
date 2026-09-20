import React from 'react';
import { UserAccount } from '../types/map';
import { Box, Target, Activity, MapPin, User, X } from 'lucide-react';

interface FloatingInspectCardProps {
  user: UserAccount | null;
  isPinned: boolean;
  onClose: () => void;
}

export const FloatingInspectCard: React.FC<FloatingInspectCardProps> = ({
  user,
  isPinned,
  onClose,
}) => {
  if (!user) return null;

  return (
    <div className="fixed bottom-6 right-6 z-30 pointer-events-auto w-80 bg-black/90 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl p-4 text-white font-mono flex flex-col gap-3 transition-all duration-200 ease-out select-none animate-in fade-in slide-in-from-bottom-3">
      {/* Header Row: Custom Avatar / Image + Name & Code */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {user.customImage ? (
            <img
              src={user.customImage}
              alt="Avatar"
              className="w-10 h-10 rounded-2xl object-cover ring-2 ring-white shadow-md shrink-0"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-2xl ring-2 ring-white/50 shadow-md flex items-center justify-center shrink-0 text-white font-bold text-sm"
              style={{ backgroundColor: user.color }}
            >
              <User className="w-5 h-5 text-white" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-white tracking-wide">{user.name}</h3>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                {user.code}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold text-white bg-zinc-800 border border-zinc-700 font-mono">
                {user.category}
              </span>
              <span className="text-[10px] text-zinc-400">• Account #{user.id}</span>
            </div>
          </div>
        </div>

        {isPinned && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all shrink-0"
            title="Unpin Selection"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <hr className="border-zinc-800" />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-zinc-900/90 p-2.5 rounded-2xl border border-zinc-800 flex flex-col gap-0.5">
          <span className="flex items-center gap-1 text-zinc-400 text-[10px]">
            <Box className="w-3 h-3 text-white" /> Owned Tiles
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-base font-extrabold font-mono text-white">{user.tileCount}</span>
            <span className="text-[10px] text-zinc-400">tiles</span>
          </div>
        </div>

        <div className="bg-zinc-900/90 p-2.5 rounded-2xl border border-zinc-800 flex flex-col gap-0.5">
          <span className="flex items-center gap-1 text-zinc-400 text-[10px]">
            <Target className="w-3 h-3 text-white" /> Globe Share
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-base font-extrabold font-mono text-white">{user.actualShare}%</span>
            <span className="text-[10px] text-zinc-400">area</span>
          </div>
        </div>
      </div>

      {/* Metric Score Bar */}
      <div className="bg-zinc-900/90 p-2.5 rounded-2xl border border-zinc-800 flex flex-col gap-1">
        <div className="flex items-center justify-between text-zinc-300 text-[10px]">
          <span className="flex items-center gap-1 font-semibold text-white">
            <Activity className="w-3 h-3 text-white" /> Metric Score
          </span>
          <span className="text-white font-mono font-bold">{user.value}%</span>
        </div>
        <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-500"
            style={{ width: `${user.value}%` }}
          />
        </div>
      </div>

      {/* 3D Vector Centroid Coordinates Box */}
      <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-800 flex items-center justify-between font-mono text-[10px]">
        <span className="flex items-center gap-1 text-zinc-400">
          <MapPin className="w-3 h-3 text-white" /> 3D Centroid
        </span>
        <span className="text-white font-bold">
          [{user.centroid3D[0].toFixed(2)}, {user.centroid3D[1].toFixed(2)}, {user.centroid3D[2].toFixed(2)}]
        </span>
      </div>
    </div>
  );
};
