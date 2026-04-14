import React, { useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { BarChart3, Zap, CloudLightning, CircleDot, Ear, Sparkles, SlidersHorizontal, Moon, Clock, Tv } from 'lucide-react';
import { Equalizer } from './Equalizer';

export const ProControls: React.FC = () => {
  const { vibe, setVibe, isBassBoost, toggleBassBoost, isEqEnabled, sleepTimer, setSleepTimer, isCinemaMode, toggleCinemaMode } = usePlayer();
  const [showEQ, setShowEQ] = useState(false);

  const vibes = [
    { id: 'bars', icon: BarChart3, label: 'Neon Bars', animation: 'animate-bounce' },
    { id: 'rays', icon: Zap, label: 'Nova Rays', animation: 'animate-spin-slow' },
    { id: 'storm', icon: CloudLightning, label: 'Electric Storm', animation: 'animate-flicker' },
    { id: 'orb', icon: CircleDot, label: 'Zen Orb', animation: 'animate-breathe' },
  ] as const;

  return (
    <div className={`fixed right-8 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-40 items-end transition-all duration-700 ${isCinemaMode ? 'opacity-20 hover:opacity-100' : ''}`}>
      {/* Cinema Mode Toggle */}
      <button
         onClick={toggleCinemaMode}
         className={`group relative w-12 h-12 rounded-xl transition-all duration-500 flex items-center justify-center overflow-hidden ${
           isCinemaMode 
             ? 'bg-primary text-white shadow-xl shadow-primary/40 scale-110 animate-pulse' 
             : 'bg-secondary/50 dark:bg-slate-800/50 text-text-muted hover:text-primary'
         }`}
         title="Cinema Mode (Full Screen)"
      >
         <Tv className="w-5 h-5" />
         <div className="absolute right-full mr-4 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
           {isCinemaMode ? 'Exit Cinema Mode' : 'Cinema Mode (Minimalist)'}
           <div className="absolute top-1/2 -translate-y-1/2 -right-1 border-[6px] border-transparent border-l-slate-900" />
         </div>
      </button>

      {!isCinemaMode && (
        <>
          {/* Equalizer Floating Panel */}
      {showEQ && (
        <div className="absolute right-full mr-6 top-0">
             <Equalizer />
        </div>
      )}

      {/* Vibe Selector Panel */}
      <div className="glass rounded-2xl p-3 flex flex-col gap-2 shadow-2xl border border-white/20 dark:border-slate-800/40">
        <div className="px-2 py-1 mb-1 border-b border-white/10 dark:border-slate-800/20 text-center">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Ambiente</span>
        </div>
        {vibes.map((v) => (
          <button
            key={v.id}
            onClick={() => setVibe(v.id)}
            className={`group relative p-3 rounded-xl transition-all duration-300 flex items-center justify-center ${
              vibe === v.id 
                ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-110' 
                : 'text-text-muted hover:bg-secondary/80 dark:hover:bg-slate-800/80 hover:text-primary'
            }`}
          >
            <v.icon className={`w-5 h-5 ${vibe === v.id ? v.animation : ''}`} />
            
            {/* Tooltip */}
            <div className="absolute right-full mr-4 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
              {v.label}
              <div className="absolute top-1/2 -translate-y-1/2 -right-1 border-[6px] border-transparent border-l-slate-900" />
            </div>
          </button>
        ))}
      </div>

      {/* Pro Audio Tools (Bass & EQ) */}
      <div className="glass rounded-2xl p-3 shadow-2xl border border-white/20 dark:border-slate-800/40 flex flex-col gap-3">
         {/* Bass Boost */}
         <button
            onClick={toggleBassBoost}
            className={`group relative w-12 h-12 rounded-xl transition-all duration-500 flex items-center justify-center overflow-hidden ${
              isBassBoost 
                ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-xl shadow-purple-500/20' 
                : 'bg-secondary/50 dark:bg-slate-800/50 text-text-muted hover:text-primary'
            }`}
         >
            <div className={`flex flex-col items-center gap-0.5 transition-transform duration-500 ${isBassBoost ? 'scale-110' : ''}`}>
                <Ear className={`w-5 h-5 ${isBassBoost ? 'animate-bounce' : ''}`} />
                <span className="text-[8px] font-bold uppercase transition-all">Bass</span>
            </div>
            {isBassBoost && <div className="absolute inset-0 bg-white/10 animate-pulse pointer-events-none" />}
            
            <div className="absolute right-full mr-4 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
              {isBassBoost ? 'Disable Bass Boost' : 'Enable Bass Boost'}
              <div className="absolute top-1/2 -translate-y-1/2 -right-1 border-[6px] border-transparent border-l-slate-900" />
            </div>
         </button>

         {/* Equalizer Toggle */}
         <button
            onClick={() => setShowEQ(!showEQ)}
            className={`group relative w-12 h-12 rounded-xl transition-all duration-500 flex items-center justify-center overflow-hidden ${
              showEQ || isEqEnabled
                ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-xl shadow-green-500/20' 
                : 'bg-secondary/50 dark:bg-slate-800/50 text-text-muted hover:text-primary'
            }`}
         >
            <div className={`flex flex-col items-center gap-0.5 transition-transform duration-500 ${showEQ ? 'scale-110' : ''}`}>
                <SlidersHorizontal className={`w-5 h-5 ${isEqEnabled && !showEQ ? 'animate-pulse' : ''}`} />
                <span className="text-[8px] font-bold uppercase">EQ</span>
            </div>
            
            <div className="absolute right-full mr-4 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
              {showEQ ? 'Close Equalizer' : 'Open Equalizer'}
              <div className="absolute top-1/2 -translate-y-1/2 -right-1 border-[6px] border-transparent border-l-slate-900" />
            </div>
         </button>

         {/* Sleep Timer */}
         <button
            onClick={() => {
               if (sleepTimer === null) setSleepTimer(15);
               else if (sleepTimer <= 15) setSleepTimer(30);
               else if (sleepTimer <= 30) setSleepTimer(60);
               else setSleepTimer(null);
            }}
            className={`group relative w-12 h-12 rounded-xl transition-all duration-500 flex items-center justify-center overflow-hidden ${
              sleepTimer !== null
                ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-xl shadow-blue-500/20' 
                : 'bg-secondary/50 dark:bg-slate-800/50 text-text-muted hover:text-primary'
            }`}
         >
            <div className={`flex flex-col items-center gap-0.5 transition-transform duration-500 ${sleepTimer ? 'scale-110' : ''}`}>
                {sleepTimer !== null ? (
                    <Clock className="w-5 h-5 animate-pulse-slow" />
                ) : (
                    <Moon className="w-5 h-5" />
                )}
                <span className="text-[8px] font-bold uppercase">{sleepTimer ? `${sleepTimer}m` : 'Sleep'}</span>
            </div>
            
            <div className="absolute right-full mr-4 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
              {sleepTimer ? `Sleep in ${sleepTimer} mins (Click to change)` : 'Set Sleep Timer (15/30/60m)'}
              <div className="absolute top-1/2 -translate-y-1/2 -right-1 border-[6px] border-transparent border-l-slate-900" />
            </div>
         </button>
      </div>
      </>
      )}

      {/* Pro Badge */}
      <div className="flex justify-center w-full">
            <div className="px-3 py-1 bg-primary/10 dark:bg-primary/20 rounded-full border border-primary/20 backdrop-blur-sm flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-primary animate-spin-slow" />
                <span className="text-[9px] font-extrabold text-primary tracking-widest uppercase">Aura Pro</span>
            </div>
      </div>
    </div>
  );
};
