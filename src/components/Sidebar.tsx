import React, { useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { ListMusic, Plus, Trash2, Library } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { playlists, activePlaylistId, setActivePlaylist, createPlaylist, deletePlaylist, isCinemaMode } = usePlayer();
  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPlaylistName.trim()) {
      createPlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setIsCreating(false);
    }
  };

  if (isCinemaMode) return null;

  return (
    <div className="w-64 glass rounded-2xl h-[calc(100vh-140px)] p-4 flex flex-col hidden md:flex shrink-0 transition-all duration-700">
      <div className="flex items-center gap-3 px-2 mb-6 text-foreground font-bold text-lg">
        <Library className="w-5 h-5 text-primary" />
        Your Library
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar pr-2">
        {playlists.map((pl) => (
          <div 
            key={pl.id}
            onClick={() => setActivePlaylist(pl.id)}
            className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors group ${
              activePlaylistId === pl.id 
                ? 'bg-primary/20 text-primary font-semibold' 
                : 'hover:bg-secondary/50 dark:hover:bg-slate-800/50 text-text-muted hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-3 truncate">
              <ListMusic className="w-4 h-4 shrink-0" />
              <span className="truncate">{pl.name}</span>
            </div>
            
            {playlists.length > 1 && (
               <button 
                 onClick={(e) => { e.stopPropagation(); deletePlaylist(pl.id); }}
                 className="opacity-0 group-hover:opacity-100 p-1 text-text-muted hover:text-red-500 transition-all focus:outline-none"
                 title="Delete Playlist"
               >
                 <Trash2 className="w-4 h-4" />
               </button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        {isCreating ? (
          <form onSubmit={handleCreate} className="flex flex-col gap-2">
            <input 
              autoFocus
              type="text" 
              placeholder="Playlist Name..."
              className="w-full bg-secondary dark:bg-slate-800 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              onBlur={() => setIsCreating(false)}
            />
          </form>
        ) : (
          <button 
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 text-sm font-medium text-text-muted hover:text-primary transition-colors w-full px-2 py-2"
          >
            <Plus className="w-4 h-4" />
            New Playlist
          </button>
        )}
      </div>
    </div>
  );
};
