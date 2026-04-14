import React, { useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Shuffle, Repeat, Repeat1, Gauge } from 'lucide-react';

const formatTime = (time: number) => {
  if (isNaN(time)) return "0:00";
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

export const AudioPlayer: React.FC = () => {
  const { 
    currentTrack, 
    isPlaying, 
    togglePlay, 
    playNext, 
    playPrev, 
    progress, 
    duration, 
    seek,
    volume,
    setVolume,
    isShuffle,
    toggleShuffle,
    repeatMode,
    toggleRepeatMode,
    playbackRate,
    setPlaybackRate,
    isCinemaMode
  } = usePlayer();

  const [showPlayer, setShowPlayer] = React.useState(true);
  const hideTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isCinemaMode) {
      setShowPlayer(true);
      return;
    }

    const resetTimeout = () => {
      setShowPlayer(true);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = setTimeout(() => {
        setShowPlayer(false);
      }, 3000);
    };

    window.addEventListener('mousemove', resetTimeout);
    resetTimeout();

    return () => {
      window.removeEventListener('mousemove', resetTimeout);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [isCinemaMode]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    seek(Number(e.target.value));
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(Number(e.target.value));
  };

  // Usamos referencias para evitar recrear el evento en cada segundo de progreso
  const progressRef = React.useRef(progress);
  progressRef.current = progress;
  const durationRef = React.useRef(duration);
  durationRef.current = duration;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si el usuario está escribiendo en algún hipotético campo de texto
      if (document.activeElement?.tagName === 'INPUT' && (document.activeElement as HTMLInputElement).type !== 'range') {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault(); // Evita que la página haga scroll hacia abajo
          togglePlay();
          break;
        case 'ArrowRight':
          e.preventDefault();
          seek(Math.min(progressRef.current + 5, durationRef.current || 0));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seek(Math.max(progressRef.current - 5, 0));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, seek]);

  return (
    <div className={`fixed bottom-0 left-0 w-full glass z-50 p-4 border-t transition-transform duration-700 ${showPlayer ? 'translate-y-0' : 'translate-y-full'}`}>
      <div className="max-w-screen-xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Track Info */}
        <div className="flex items-center gap-4 w-full md:w-1/3">
          {currentTrack ? (
            <>
              <div className={`relative w-14 h-14 flex items-center justify-center shrink-0 rounded-full shadow-[0_0_15px_rgba(0,0,0,0.5)] overflow-hidden transition-transform duration-500 border border-slate-700 ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`}
                   style={{ background: 'conic-gradient(#1a1a1a, #333, #1a1a1a, #333, #1a1a1a)' }}
              >
                  {currentTrack.song.coverArt ? (
                     <img src={currentTrack.song.coverArt} alt="Cover" className="w-6 h-6 rounded-full object-cover z-10 border border-slate-900 pointer-events-none" />
                  ) : (
                    <div className="w-6 h-6 bg-gradient-to-br from-primary to-highlight rounded-full flex items-center justify-center z-10 border border-slate-900">
                        <span className="text-white font-bold text-[9px]">{currentTrack.song.title.charAt(0)}</span>
                    </div>
                  )}
                  {/* Center Hole */}
                  <div className="absolute w-1.5 h-1.5 bg-[#0a0a0a] rounded-full z-20 shadow-inner"></div>
                  {/* Vinyl Grooves */}
                  <div className="absolute inset-0 rounded-full border-[4px] border-white/5 pointer-events-none m-[4px]"></div>
                  <div className="absolute inset-0 rounded-full border-[2px] border-white/5 pointer-events-none m-[8px]"></div>
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="font-semibold truncate">{currentTrack.song.title}</span>
                <span className="text-sm text-text-muted truncate">{currentTrack.song.artist}</span>
              </div>
            </>
          ) : (
             <div className="flex items-center gap-4 text-text-muted">
                <div className="w-14 h-14 bg-secondary dark:bg-slate-800 rounded-md"></div>
                <div className="flex flex-col">
                  <span className="font-semibold text-sm">No track selected</span>
                </div>
             </div>
          )}
        </div>

        {/* Controls & Progress */}
        <div className="flex flex-col items-center w-full md:w-1/3 gap-2">
          <div className="flex items-center gap-6">
            <button 
              onClick={toggleShuffle} 
              className={`transition-colors focus:outline-none ${isShuffle ? 'text-primary' : 'text-text-muted hover:text-foreground'}`}
              title="Shuffle"
            >
              <Shuffle className="w-5 h-5" />
            </button>
            <button onClick={playPrev} className="text-foreground hover:text-primary transition-colors focus:outline-none">
              <SkipBack className="w-6 h-6" />
            </button>
            <button 
              onClick={togglePlay} 
              className="w-12 h-12 flex items-center justify-center bg-primary text-white rounded-full hover:scale-105 transition-transform shadow-lg focus:outline-none"
              disabled={!currentTrack}
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 pl-1" />}
            </button>
            <button onClick={playNext} className="text-foreground hover:text-primary transition-colors focus:outline-none">
              <SkipForward className="w-6 h-6" />
            </button>
            <button 
              onClick={toggleRepeatMode} 
              className={`transition-colors focus:outline-none ${repeatMode !== 'off' ? 'text-primary' : 'text-text-muted hover:text-foreground'}`}
              title={`Repeat: ${repeatMode}`}
            >
              {repeatMode === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
            </button>
          </div>
          
          <div className="flex items-center w-full gap-3 text-xs font-medium text-text-muted">
             <span>{formatTime(progress)}</span>
             <input 
                type="range" 
                 min={0} 
                 max={duration || 100} 
                 value={progress} 
                 onChange={handleSeek}
                 disabled={!currentTrack}
                 className="w-full h-1.5 bg-secondary dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-primary"
             />
             <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume & Extras */}
        <div className="flex items-center justify-end w-full md:w-1/3 gap-3">
            <button 
               onClick={() => {
                 const rates = [0.5, 1, 1.25, 1.5, 2];
                 const nextIndex = (rates.indexOf(playbackRate) + 1) % rates.length;
                 setPlaybackRate(rates[nextIndex]);
               }}
               className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 bg-secondary dark:bg-slate-800 rounded-md text-text-muted hover:text-primary transition-colors"
               title="Playback Speed"
            >
               <Gauge className="w-3.5 h-3.5" />
               <span>{playbackRate}x</span>
            </button>
            <button onClick={() => setVolume(volume === 0 ? 1 : 0)} className="text-text-muted hover:text-primary transition-colors">
                {volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <input 
                type="range" 
                min={0} max={1} step={0.01} 
                value={volume} 
                onChange={handleVolume}
                className="w-24 h-1.5 bg-secondary dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-primary"
            />
        </div>

      </div>
    </div>
  );
};
