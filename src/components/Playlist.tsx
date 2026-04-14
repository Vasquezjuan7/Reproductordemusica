import React from 'react';
import { usePlayer } from '../context/PlayerContext';
import { Play, Trash2, Disc3, ChevronUp, ChevronDown, Video, VideoOff } from 'lucide-react';

export const Playlist: React.FC = () => {
  const { playlists, activePlaylistId, currentTrack, playingPlaylistId, playSpecificTrack, removeTrack, moveTrackUp, moveTrackDown, isPlaying, updateTrackVideo, reorderTrack } = usePlayer();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [updatingSongId, setUpdatingSongId] = React.useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  
  const activePlaylist = playlists.find(p => p.id === activePlaylistId);
  if (!activePlaylist) return null;
  
  const tracks = activePlaylist.list.toArray();

  if (tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-text-muted p-10 mt-8 glass rounded-2xl">
        <Disc3 className="w-16 h-16 opacity-20 mb-4 animate-pulse-slow" />
        <p className="text-lg font-medium text-center">"{activePlaylist.name}" is empty</p>
        <p className="text-sm mt-2">Upload some local tracks to add to this playlist!</p>
      </div>
    );
  }
  
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && updatingSongId) {
      const videoUrl = URL.createObjectURL(file);
      updateTrackVideo(updatingSongId, videoUrl);
    }
    setUpdatingSongId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="w-full glass rounded-2xl p-6 mt-8 shadow-xl">
      <div className="mb-6 pb-4 border-b border-white/10 dark:border-slate-800/50">
         <h2 className="text-3xl font-extrabold flex items-center gap-3 text-foreground">
           {activePlaylist.name}
         </h2>
         <p className="text-text-muted mt-1 text-sm">{tracks.length} track{tracks.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="space-y-2">
        {tracks.map((track, index) => {
          // A track is considered "currently playing" if it matches ID AND we are looking at the playlist that's actually playing
          const isCurrent = currentTrack?.song.id === track.id && playingPlaylistId === activePlaylistId;
          
          return (
            <div 
              key={track.id}
              draggable
              onDragStart={(e) => {
                setDraggedIndex(index);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (draggedIndex !== null && draggedIndex !== index) {
                  reorderTrack(draggedIndex, index);
                }
                setDraggedIndex(null);
              }}
              className={`flex items-center justify-between p-3 rounded-lg transition-all duration-300 group hover:bg-secondary/60 dark:hover:bg-slate-800/60 cursor-grab active:cursor-grabbing ${
                isCurrent ? 'bg-primary/10 dark:bg-primary/20 shadow-inner' : ''
              } ${draggedIndex === index ? 'opacity-50 blur-[1px]' : ''}`}
            >
              <div className="flex items-center gap-4 flex-1" onClick={() => playSpecificTrack(activePlaylistId, track.id)}>
                <div className="w-10 h-10 relative flex items-center justify-center">
                   {isCurrent && isPlaying ? (
                       <div className="flex items-end justify-center gap-[3px] h-4">
                           <div className="w-1 bg-primary animate-[bounce_1s_infinite] h-full rounded-t-sm"></div>
                           <div className="w-1 bg-primary animate-[bounce_1.2s_infinite] h-2 rounded-t-sm"></div>
                           <div className="w-1 bg-primary animate-[bounce_0.8s_infinite] h-3 rounded-t-sm"></div>
                       </div>
                   ) : (
                       <span className={`text-sm font-medium transition-colors ${isCurrent ? 'text-primary' : 'text-text-muted group-hover:text-primary group-hover:scale-0'}`}>
                         {index + 1}
                       </span>
                   )}
                   <Play className={`w-4 h-4 text-primary absolute transition-transform scale-0 ${isCurrent && isPlaying ? '' : 'group-hover:scale-100'}`} />
                </div>
                
                <div className="flex flex-col">
                  <span className={`font-semibold text-base transition-colors ${isCurrent ? 'text-primary' : 'text-foreground'}`}>{track.title}</span>
                  <span className="text-sm text-text-muted">{track.artist}</span>
                </div>
              </div>

               <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setUpdatingSongId(track.id);
                      fileInputRef.current?.click();
                    }}
                    className={`p-2 rounded-full transition-colors focus:outline-none ${track.videoSrc ? 'text-primary bg-primary/10' : 'text-text-muted hover:text-primary hover:bg-primary/10'}`}
                    title={track.videoSrc ? "Change background video" : "Add background video"}
                  >
                    {track.videoSrc ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4 opacity-50" />}
                  </button>

                  <div className="flex flex-col mr-2">
                    <button 
                       onClick={(e) => { e.stopPropagation(); moveTrackUp(track.id); }}
                       className={`p-1 text-text-muted hover:text-primary transition-colors focus:outline-none ${index === 0 ? 'invisible' : ''}`}
                       title="Move Up"
                    >
                       <ChevronUp className="w-4 h-4" />
                    </button>
                    <button 
                       onClick={(e) => { e.stopPropagation(); moveTrackDown(track.id); }}
                       className={`p-1 text-text-muted hover:text-primary transition-colors focus:outline-none ${index === tracks.length - 1 ? 'invisible' : ''}`}
                       title="Move Down"
                    >
                       <ChevronDown className="w-4 h-4" />
                    </button>
                 </div>
                 <button 
                    onClick={(e) => { e.stopPropagation(); removeTrack(track.id); }}
                    className="p-2 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors focus:outline-none"
                    title="Remove from playlist"
                 >
                    <Trash2 className="w-4 h-4" />
                 </button>
              </div>
            </div>
          );
        })}
      </div>
      
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleVideoUpload} 
        accept="video/*" 
        className="hidden" 
      />
    </div>
  );
};
