import React, { useState, useEffect, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { Mic2, X, Save } from 'lucide-react';

interface SyncedLine {
  time: number;
  text: string;
}

const parseLRC = (text: string): SyncedLine[] => {
  const lines = text.split('\n');
  const result: SyncedLine[] = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
  lines.forEach(line => {
    const match = line.match(timeRegex);
    if (match) {
      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      const ms = parseInt(match[3].padEnd(3, '0'));
      const time = minutes * 60 + seconds + ms / 1000;
      const textVal = line.replace(timeRegex, '').trim();
      if (textVal) {
         result.push({time, text: textVal});
      }
    }
  });
  return result;
};

export const LyricsView: React.FC = () => {
  const { isLyricsOpen, toggleLyrics, currentTrack, updateTrackLyrics, progress } = usePlayer();
  const [isEditing, setIsEditing] = useState(false);
  const [lyricsText, setLyricsText] = useState('');
  const [syncedLines, setSyncedLines] = useState<SyncedLine[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentTrack) {
      const text = currentTrack.song.lyrics || '';
      setLyricsText(text);
      setIsEditing(!text);
      
      const parsed = parseLRC(text);
      setSyncedLines(parsed);
    } else {
      setLyricsText('');
      setSyncedLines([]);
    }
  }, [currentTrack]);

  // Find active line index based on current audio progress
  const activeIndex = syncedLines.reduce((acc, line, i) => {
    if (progress >= line.time) return i;
    return acc;
  }, -1);

  // Auto-scroll to active line
  useEffect(() => {
     if (activeIndex !== -1 && containerRef.current) {
        const activeEl = containerRef.current.children[activeIndex] as HTMLElement;
        if (activeEl) {
           activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
     }
  }, [activeIndex]);

  if (!isLyricsOpen) return null;

  const handleSave = () => {
    if (currentTrack) {
      updateTrackLyrics(currentTrack.song.id, lyricsText);
      setIsEditing(false);
      setSyncedLines(parseLRC(lyricsText));
    }
  };

  return (
    <div 
        className="fixed top-0 right-0 h-full pb-32 pt-8 w-full md:w-[450px] glass z-40 p-6 flex flex-col border-l border-white/20 dark:border-slate-800/40 shadow-2xl backdrop-blur-2xl bg-white/40 dark:bg-slate-900/40 transition-transform"
    >
      <div className="flex justify-between items-center mb-6 pl-2 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-primary to-indigo-400 rounded-full text-white shadow-md">
            <Mic2 className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-500 to-indigo-400 tracking-tight">Lyrics</h2>
        </div>
        <button onClick={toggleLyrics} className="text-text-muted hover:text-foreground transition-colors p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full">
          <X className="w-6 h-6" />
        </button>
      </div>

      {!currentTrack ? (
        <div className="flex-1 flex flex-col items-center justify-center text-text-muted opacity-60">
          <Mic2 className="w-16 h-16 mb-4" />
          <p className="font-medium">No track selected</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 bg-white/20 dark:bg-black/20 rounded-2xl p-5 border border-white/30 dark:border-white/5 shadow-inner">
          <div className="mb-6 flex gap-4 items-center border-b border-black/5 dark:border-white/5 pb-4 shrink-0">
             {currentTrack.song.coverArt ? (
                <img src={currentTrack.song.coverArt} className="w-12 h-12 rounded-lg shadow-md object-cover" />
             ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-highlight rounded-lg shadow-md flex items-center justify-center">
                    <span className="text-white font-bold">{currentTrack.song.title.charAt(0)}</span>
                </div>
             )}
             <div className="overflow-hidden">
                 <h3 className="font-bold text-lg truncate leading-tight dark:text-white">{currentTrack.song.title}</h3>
                 <p className="text-sm text-text-muted truncate mt-0.5">{currentTrack.song.artist}</p>
             </div>
          </div>

          {!isEditing && currentTrack.song.lyrics ? (
            <div className="flex-1 overflow-y-auto pr-3 rounded-lg pb-4 relative" style={{scrollbarWidth: 'thin'}}>
              
              {syncedLines.length > 0 ? (
                 <div className="flex flex-col gap-6 py-[20vh] px-2" ref={containerRef}>
                   {syncedLines.map((line, i) => {
                      const isActive = i === activeIndex;
                      const isPast = i < activeIndex;
                      return (
                         <p 
                            key={i} 
                            className={`text-[22px] font-extrabold tracking-tight transition-all duration-300 transform origin-left leading-snug cursor-pointer ${isActive ? 'text-primary scale-105 opacity-100 drop-shadow-md' : isPast ? 'text-foreground opacity-60' : 'text-text-muted opacity-40 hover:opacity-80'}`}
                         >
                            {line.text}
                         </p>
                      )
                   })}
                 </div>
              ) : (
                 <div className="whitespace-pre-wrap text-[17px] leading-relaxed font-medium text-foreground tracking-wide opacity-90 my-2">
                   {currentTrack.song.lyrics}
                 </div>
              )}

              <div className="mt-8 flex justify-end sticky bottom-0">
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="text-xs px-4 py-2 bg-black/10 dark:bg-white/10 backdrop-blur-md rounded-full font-bold hover:bg-primary hover:text-white transition-colors shadow-lg"
                  >
                    Edit Sync/Lyrics
                  </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              <textarea 
                className="flex-1 w-full bg-white/50 dark:bg-slate-900/50 border border-white/30 dark:border-white/10 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none font-mono text-sm leading-relaxed whitespace-pre"
                style={{scrollbarWidth: 'thin'}}
                placeholder="[00:15.22] Paste synced (.lrc) lyrics here..."
                value={lyricsText}
                onChange={(e) => setLyricsText(e.target.value)}
              />
              <button 
                onClick={handleSave}
                className="mt-4 flex items-center justify-center gap-2 w-full py-3.5 bg-gradient-to-r from-primary to-indigo-500 text-white rounded-xl shadow-[0_8px_16px_rgba(37,99,235,0.2)] hover:shadow-[0_8px_20px_rgba(37,99,235,0.3)] transition-all font-semibold active:scale-[0.98]"
              >
                <Save className="w-5 h-5" />
                Save Lyrics
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
