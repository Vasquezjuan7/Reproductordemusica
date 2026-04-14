import React from 'react';
import { PlayerProvider } from './context/PlayerContext';
import { AudioPlayer } from './components/AudioPlayer';
import { Playlist } from './components/Playlist';
import { Uploader } from './components/Uploader';
import { Visualizer } from './components/Visualizer';
import { ThemeToggle } from './components/ThemeToggle';
import { Sidebar } from './components/Sidebar';
import { Music2 } from 'lucide-react';
import { usePlayer } from './context/PlayerContext';
import { ProControls } from './components/ProControls';

const MainApp: React.FC = () => {
  const { isPlaying, dominantColor, isCinemaMode } = usePlayer();

  return (
    <div 
        className="min-h-screen pb-32 pt-8 px-4 font-sans text-foreground flex flex-col items-center relative transition-colors duration-1000 z-0"
    >
      {/* Fondo Teñido Dinámico */}
      <div 
         className="absolute inset-0 z-[-1] transition-all duration-1000 pointer-events-none opacity-15 dark:opacity-30"
         style={{
            background: `radial-gradient(circle at 50% 0%, ${dominantColor || 'transparent'} 0%, transparent 80%)`
         }}
      />

      <Visualizer />
      <ProControls />
      
      {!isCinemaMode && (
        <div className="w-full max-w-7xl mx-auto flex justify-between items-center mb-8 relative z-10 glass rounded-full px-6 py-4 shadow-lg border border-white/20 dark:border-slate-800/40">
          <div className="flex items-center gap-4">
            <div className={`bg-gradient-to-tr from-primary to-indigo-400 p-2.5 rounded-full shadow-md text-white transition-all duration-500 ${isPlaying ? 'animate-beat' : 'animate-float'}`}>
              <Music2 className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-500 to-indigo-400">Aura</h1>
          </div>
          <ThemeToggle />
        </div>
      )}

      <div className={`relative z-10 w-full max-w-7xl mx-auto items-stretch gap-8 flex-1 transition-all duration-700 ${isCinemaMode ? 'opacity-0 scale-95 pointer-events-none' : 'flex'}`}>
         {/* Left col: Sidebar */}
         <Sidebar />
         
         {/* Right col: Content */}
         <div className="flex-1 flex flex-col max-w-4xl min-w-0">
             <div className="mb-4">
                <Uploader />
             </div>
             <Playlist />
         </div>
      </div>

      <AudioPlayer />
    </div>
  );
};

export default function App() {
  return (
    <PlayerProvider>
      <MainApp />
    </PlayerProvider>
  );
}
