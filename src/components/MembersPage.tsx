import React, { useState } from 'react';
import { UserAccount } from '../types/map';
import { Search, MapPin, Box, Target, Activity, ImagePlus } from 'lucide-react';

interface MembersPageProps {
  users: UserAccount[];
  onSelectUserOnMap: (userId: number) => void;
}

export const MembersPage: React.FC<MembersPageProps> = ({ users, onSelectUserOnMap }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = users.filter(
    u =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-start p-6 z-10 overflow-y-auto">
      <div className="max-w-5xl w-full flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
        
        {/* Top Title & Search Bar */}
        <div className="glass-panel p-6 rounded-3xl shadow-xl border border-blue-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              Sphere Partition Members
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Active member accounts occupying multi-tile territories on the current sphere.
            </p>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search members..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        {/* Member Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map(user => (
            <div
              key={user.id}
              className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-blue-500/50 transition-all flex flex-col justify-between gap-4 group"
            >
              {/* Card Top */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {user.customImage ? (
                    <img
                      src={user.customImage}
                      alt={user.name}
                      className="w-10 h-10 rounded-xl object-cover ring-2 ring-cyan-400/50 shadow-md"
                    />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-xs shadow-md ring-1 ring-white/20"
                      style={{ backgroundColor: user.color }}
                    >
                      #{user.id}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-all">
                        {user.name}
                      </h3>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        {user.code}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {user.category} Account
                    </span>
                  </div>
                </div>

                <span
                  className="w-3 h-3 rounded-full ring-2 ring-white/10"
                  style={{ backgroundColor: user.color }}
                />
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80 flex flex-col gap-0.5">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Box className="w-3 h-3 text-blue-400" /> Owned Tiles
                  </span>
                  <span className="text-sm font-bold text-white">{user.tileCount} tiles</span>
                </div>

                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80 flex flex-col gap-0.5">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Target className="w-3 h-3 text-emerald-400" /> Surface Share
                  </span>
                  <span className="text-sm font-bold text-emerald-300">{user.actualShare}%</span>
                </div>
              </div>

              {/* Metric Score & Locate Button */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Score: <strong className="text-cyan-300">{user.value}%</strong></span>
                </div>

                <button
                  onClick={() => onSelectUserOnMap(user.id)}
                  className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/40 text-cyan-300 border border-blue-500/30 text-xs font-semibold flex items-center gap-1 transition-all"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Locate on Globe</span>
                </button>
              </div>

            </div>
          ))}
        </div>

      </div>
    </div>
  );
};
