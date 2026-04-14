import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { DoublyLinkedList, type SongData, SongNode } from '../structures/DoublyLinkedList';
import { getDominantColor } from '../utils/colorExtractor';

export interface PlaylistInfo {
  id: string;
  name: string;
  list: DoublyLinkedList;
}

interface PlayerContextType {
  playlists: PlaylistInfo[];
  activePlaylistId: string;
  playingPlaylistId: string | null;
  currentTrack: SongNode | null;
  isPlaying: boolean;
  volume: number;
  progress: number;
  duration: number;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  analyser: AnalyserNode | null;
  vibe: 'bars' | 'rays' | 'storm' | 'orb';
  isBassBoost: boolean;
  
  createPlaylist: (name: string) => void;
  deletePlaylist: (id: string) => void;
  setActivePlaylist: (id: string) => void;
  setVibe: (v: 'bars' | 'rays' | 'storm' | 'orb') => void;
  toggleBassBoost: () => void;
  
  addTrack: (song: SongData) => void;
  removeTrack: (songId: string) => void;
  moveTrackUp: (songId: string) => void;
  moveTrackDown: (songId: string) => void;
  reorderTrack: (fromIndex: number, toIndex: number) => void;
  playSpecificTrack: (playlistId: string, songId: string) => void;
  
  playNext: () => void;
  playPrev: () => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  setVolume: (v: number) => void;
  updateTrackVideo: (songId: string, videoSrc: string) => void;
  
  isShuffle: boolean;
  toggleShuffle: () => void;
  repeatMode: 'off' | 'one' | 'all';
  toggleRepeatMode: () => void;
  playbackRate: number;
  setPlaybackRate: (rate: number) => void;
  isCinemaMode: boolean;
  toggleCinemaMode: () => void;
  
  triggerUpdate: number; // to force re-renders when list mutates
  isEqEnabled: boolean;
  eqGains: number[];
  toggleEq: () => void;
  setEqBandGain: (index: number, gain: number) => void;
  resetEq: () => void;
  isLyricsOpen: boolean;
  toggleLyrics: () => void;
  updateTrackLyrics: (songId: string, lyrics: string) => void;
  sleepTimer: number | null; // minutes remaining
  setSleepTimer: (mins: number | null) => void;
  dominantColor: string | null;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [playlists, setPlaylists] = useState<PlaylistInfo[]>([{ id: 'default', name: 'My Music', list: new DoublyLinkedList() }]);
  const [activePlaylistId, setActivePlaylistId] = useState('default');
  const [playingPlaylistId, setPlayingPlaylistId] = useState<string | null>(null);
  
  const [currentTrack, setCurrentTrack] = useState<SongNode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [triggerUpdate, setTriggerUpdate] = useState(0);
  const forceUpdate = () => setTriggerUpdate(prev => prev + 1);
  const [vibe, setVibe] = useState<'bars' | 'rays' | 'storm' | 'orb'>('bars');
  const [isBassBoost, setIsBassBoost] = useState(false);
  const [isEqEnabled, setIsEqEnabled] = useState(false);
  const [eqGains, setEqGains] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);
  const [sleepTimer, setSleepTimerState] = useState<number | null>(null);
  const [dominantColor, setDominantColor] = useState<string | null>(null);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'one' | 'all'>('off');
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [isCinemaMode, setIsCinemaMode] = useState(false);
  
  const sleepEndRef = useRef<number | null>(null);
  const isFadingRef = useRef<boolean>(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioCtxRef = useRef<{ 
    ctx: AudioContext, 
    analyser: AnalyserNode, 
    filter: BiquadFilterNode,
    eqNodes: BiquadFilterNode[]
  } | null>(null);

  // EQ Frequencies: 60Hz, 150Hz, 400Hz, 1kHz, 2.4kHz, 15kHz
  const EQ_FREQS = [60, 150, 400, 1000, 2400, 15000];

  // Initialize Audio Nodes
  const initAudioNodes = useCallback(() => {
    if (!audioRef.current || audioCtxRef.current) return;
    
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      const bassFilter = ctx.createBiquadFilter();
      const compressor = ctx.createDynamicsCompressor();
      const source = ctx.createMediaElementSource(audioRef.current);

      // Set up filter for Bass Boost
      bassFilter.type = 'lowshelf';
      bassFilter.frequency.value = 100;
      bassFilter.gain.value = isBassBoost ? 6 : 0;

      // Set up EQ nodes
      const eqNodes = EQ_FREQS.map((freq) => {
        const node = ctx.createBiquadFilter();
        node.type = 'peaking';
        node.frequency.value = freq;
        node.Q.value = 1;
        node.gain.value = 0;
        return node;
      });

      // Connect: Source -> Bass Filter -> EQ Nodes -> Analyser -> Compressor -> Destination
      source.connect(bassFilter);
      let lastNode: AudioNode = bassFilter;
      
      eqNodes.forEach(node => {
        lastNode.connect(node);
        lastNode = node;
      });

      lastNode.connect(analyser);
      analyser.connect(compressor);
      compressor.connect(ctx.destination);

      analyser.fftSize = 256;
      audioCtxRef.current = { ctx, analyser, filter: bassFilter, eqNodes };
      setAnalyser(analyser); 
    } catch (e) {
      console.error("Failed to init audio nodes:", e);
    }
  }, [isBassBoost]);

  // Sync Bass Boost
  useEffect(() => {
    if (audioCtxRef.current) {
        audioCtxRef.current.filter.gain.value = isBassBoost ? 6 : 0;
    }
  }, [isBassBoost]);

  // Sync Equalizer
  useEffect(() => {
    if (audioCtxRef.current && audioCtxRef.current.eqNodes) {
      audioCtxRef.current.eqNodes.forEach((node, i) => {
        // Only apply gain if EQ is enabled, otherwise 0
        node.gain.setTargetAtTime(isEqEnabled ? eqGains[i] : 0, 0, 0.1);
      });
    }
  }, [eqGains, isEqEnabled]);

  const toggleBassBoost = () => setIsBassBoost(prev => !prev);
  const toggleEq = () => setIsEqEnabled(prev => !prev);

  const setEqBandGain = (index: number, gain: number) => {
    setEqGains(prev => {
      const next = [...prev];
      next[index] = gain;
      return next;
    });
  };

  const resetEq = () => setEqGains([0, 0, 0, 0, 0, 0]);

  // Sync state with Audio Element and Media Session
  useEffect(() => {
    if (audioRef.current && isPlaying && !isFadingRef.current) {
      audioRef.current.volume = volume;
    }
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [volume, isPlaying, playbackRate]);

  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => togglePlay());
      navigator.mediaSession.setActionHandler('pause', () => togglePlay());
      navigator.mediaSession.setActionHandler('previoustrack', () => playPrev());
      navigator.mediaSession.setActionHandler('nexttrack', () => playNext());
    }
  }, [playingPlaylistId, playlists, currentTrack, isPlaying]);

  useEffect(() => {
    if (!currentTrack) {
        setIsPlaying(false);
        if(audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = "";
        }
        return;
    }

    if(audioRef.current) {
        if(audioRef.current.src !== currentTrack.song.audioSrc) {
            audioRef.current.src = currentTrack.song.audioSrc;
            audioRef.current.load();
        }

        // Extract color
        if (currentTrack.song.coverArt) {
            getDominantColor(currentTrack.song.coverArt).then(color => setDominantColor(color));
        } else {
            setDominantColor(null);
        }
        
        if(isPlaying) {
             initAudioNodes();
             if (audioCtxRef.current?.ctx.state === 'suspended') {
                 audioCtxRef.current.ctx.resume();
             }
             audioRef.current.play().catch(e => console.error("Playback failed:", e));

             if ('mediaSession' in navigator) {
                 navigator.mediaSession.metadata = new MediaMetadata({
                   title: currentTrack.song.title,
                   artist: currentTrack.song.artist,
                   artwork: currentTrack.song.coverArt ? [
                     { src: currentTrack.song.coverArt, sizes: '512x512', type: 'image/png' }
                   ] : []
                 });
             }
         } else {
             audioRef.current.pause();
         }
     }
  }, [isPlaying, currentTrack, initAudioNodes]);

  // Sleep Timer logic
  const setSleepTimer = (mins: number | null) => {
      setSleepTimerState(mins);
      if (mins) {
          sleepEndRef.current = Date.now() + mins * 60 * 1000;
      } else {
          sleepEndRef.current = null;
      }
  };

  useEffect(() => {
      if (sleepTimer === null) return;
      const interval = setInterval(() => {
          if (sleepEndRef.current) {
              const remaining = sleepEndRef.current - Date.now();
              if (remaining <= 0) {
                  // Timer end
                  setSleepTimerState(null);
                  sleepEndRef.current = null;
                  fadeAndPause();
              } else {
                  // Actualiza el estado cada minuto para la UI
                  setSleepTimerState(Math.ceil(remaining / 60000));
              }
          }
      }, 1000);
      return () => clearInterval(interval);
  }, [sleepTimer]);

  // Soft fade transitions
  const fadeAndPause = async () => {
    if (!audioRef.current || !isPlaying) return setIsPlaying(false);
    isFadingRef.current = true;
    const startVol = audioRef.current.volume;
    for (let tempVol = startVol; tempVol > 0; tempVol -= 0.05) {
      if (audioRef.current) audioRef.current.volume = Math.max(0, tempVol);
      await new Promise(r => setTimeout(r, 50)); // Fade over ~1 second
    }
    setIsPlaying(false);
    if (audioRef.current) audioRef.current.volume = startVol;
    isFadingRef.current = false;
  };

  const fadeToNextTrack = async (action: () => void) => {
    if (audioRef.current && isPlaying && !isFadingRef.current) {
        isFadingRef.current = true;
        const startVol = audioRef.current.volume;
        for (let tempVol = startVol; tempVol > 0; tempVol -= 0.05) {
          if (audioRef.current) audioRef.current.volume = Math.max(0, tempVol);
          await new Promise(r => setTimeout(r, 50));
        }
        action(); // Change the track
        if (audioRef.current) audioRef.current.volume = 0;
        
        // Fade in
        for (let tempVol = 0; tempVol <= startVol; tempVol += 0.05) {
          if (audioRef.current) audioRef.current.volume = Math.min(startVol, tempVol);
          await new Promise(r => setTimeout(r, 50));
        }
        if (audioRef.current) audioRef.current.volume = startVol;
        isFadingRef.current = false;
    } else {
        action();
    }
  };

  const createPlaylist = (name: string) => {
    const newId = crypto.randomUUID();
    setPlaylists(prev => [...prev, { id: newId, name, list: new DoublyLinkedList() }]);
    setActivePlaylistId(newId);
  };

  const deletePlaylist = (id: string) => {
    if (playlists.length === 1) return; // Disallow deleting the last playlist
    setPlaylists(prev => prev.filter(p => p.id !== id));
    if (activePlaylistId === id) {
       setActivePlaylistId(playlists.find(p => p.id !== id)!.id);
    }
    if (playingPlaylistId === id) {
       setPlayingPlaylistId(null);
       setCurrentTrack(null);
    }
  };

  const setActivePlaylist = (id: string) => {
    setActivePlaylistId(id);
  };

  const addTrack = (song: SongData) => {
    const activeList = playlists.find(p => p.id === activePlaylistId)?.list;
    if (activeList) {
      activeList.addTrackEnd(song);
      setPlaylists([...playlists]); // Immutable update triggers React re-render
      forceUpdate();
    }
  };

  const removeTrack = (songId: string) => {
    const activeList = playlists.find(p => p.id === activePlaylistId)?.list;
    if (activeList) {
      activeList.removeTrack(songId);
      if (playingPlaylistId === activePlaylistId && (!activeList.currentTrack || activeList.currentTrack.song.id === songId)) {
          setCurrentTrack(activeList.currentTrack);
          if (!activeList.currentTrack) setIsPlaying(false);
      }
      setPlaylists([...playlists]); // Immutable update
      forceUpdate();
    }
  };

  const moveTrackUp = (songId: string) => {
    const activeList = playlists.find(p => p.id === activePlaylistId)?.list;
    if (activeList && activeList.moveTrackUp(songId)) {
        setPlaylists([...playlists]); // Immutable update
        forceUpdate();
    }
  };

  const moveTrackDown = (songId: string) => {
    const activeList = playlists.find(p => p.id === activePlaylistId)?.list;
    if (activeList && activeList.moveTrackDown(songId)) {
        setPlaylists([...playlists]); // Immutable update
        forceUpdate();
    }
  };

  const reorderTrack = (fromIndex: number, toIndex: number) => {
    const activeList = playlists.find(p => p.id === activePlaylistId)?.list;
    if (activeList) {
        activeList.reorder(fromIndex, toIndex);
        setPlaylists([...playlists]);
        forceUpdate();
    }
  };

  const playSpecificTrack = (playlistId: string, songId: string) => {
      const targetPlaylist = playlists.find(p => p.id === playlistId);
      if (!targetPlaylist) return;

      let current = targetPlaylist.list.head;
      while(current) {
          if (current.song.id === songId) {
              targetPlaylist.list.currentTrack = current;
              setCurrentTrack(current);
              setPlayingPlaylistId(playlistId);
              setIsPlaying(true);
              break;
          }
          current = current.next;
      }
      forceUpdate();
  };

  const updateTrackVideo = (songId: string, videoSrc: string) => {
    let found = false;
    playlists.forEach(p => {
      let current = p.list.head;
      while (current) {
        if (current.song.id === songId) {
          current.song.videoSrc = videoSrc;
          found = true;
          // If this is the current track, we need to force an update for the visualizer
          if (currentTrack?.song.id === songId) {
            setCurrentTrack({...current});
          }
        }
        current = current.next;
      }
    });

    if (found) {
      setPlaylists([...playlists]);
      forceUpdate();
    }
  };

  const toggleLyrics = () => setIsLyricsOpen(prev => !prev);

  const updateTrackLyrics = (songId: string, lyrics: string) => {
    let found = false;
    playlists.forEach(p => {
      let current = p.list.head;
      while (current) {
        if (current.song.id === songId) {
          current.song.lyrics = lyrics;
          found = true;
          // If this is the current track, force update
          if (currentTrack?.song.id === songId) {
            setCurrentTrack({...current} as any);
          }
        }
        current = current.next;
      }
    });

    if (found) {
      setPlaylists([...playlists]);
      forceUpdate();
    }
  };

  const toggleShuffle = () => setIsShuffle(prev => !prev);
  const toggleRepeatMode = () => {
    setRepeatMode(prev => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  };
  const setPlaybackRate = (rate: number) => setPlaybackRateState(rate);
  const toggleCinemaMode = () => {
    if (!isCinemaMode) {
      document.documentElement.requestFullscreen().catch(e => console.warn("Fullscreen failed", e));
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(e => console.warn("Exit fullscreen failed", e));
      }
    }
    setIsCinemaMode(prev => !prev);
  };

  const playNext = useCallback((forceNext: boolean = false) => {
    if (!playingPlaylistId) return;
    fadeToNextTrack(() => {
        const playingList = playlists.find(p => p.id === playingPlaylistId)?.list;
        if (playingList) {
           if (!forceNext && repeatMode === 'one' && currentTrack) {
               // Replay same track
               if (audioRef.current) audioRef.current.currentTime = 0;
               setIsPlaying(true);
           } else {
               let next: SongNode | null = null;
               
               if (isShuffle) {
                   const arr = playingList.toArray();
                   if (arr.length > 1) {
                       let randomIndex;
                       do {
                           randomIndex = Math.floor(Math.random() * arr.length);
                       } while (currentTrack && arr[randomIndex].id === currentTrack.song.id);
                       
                       // Find node
                       let curr = playingList.head;
                       while (curr) {
                           if (curr.song.id === arr[randomIndex].id) {
                               next = curr;
                               playingList.currentTrack = curr;
                               break;
                           }
                           curr = curr.next;
                       }
                   } else {
                       next = playingList.nextTrack();
                   }
               } else {
                   next = playingList.nextTrack();
                   if (!next && repeatMode === 'all') {
                       next = playingList.head;
                       playingList.currentTrack = playingList.head;
                   }
               }
               
               if (next) {
                 setCurrentTrack(next);
                 setIsPlaying(true);
               } else {
                 setIsPlaying(false);
               }
           }
           forceUpdate();
        }
    });
  }, [playingPlaylistId, playlists, isShuffle, repeatMode, currentTrack]);

  const playPrev = () => {
    if (!playingPlaylistId) return;
    fadeToNextTrack(() => {
        const playingList = playlists.find(p => p.id === playingPlaylistId)?.list;
        if (playingList) {
           const prev = playingList.prevTrack();
           if (prev) {
             setCurrentTrack(prev);
             setIsPlaying(true);
           }
           forceUpdate();
        }
    });
  };

  const togglePlay = () => {
    if (currentTrack) {
      if (isPlaying) {
          fadeAndPause();
      } else {
          setIsPlaying(true);
      }
    }
  };

  const setVolume = (v: number) => {
    setVolumeState(v);
  };

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setProgress(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      playNext();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentTrack, playNext]); 

  return (
    <PlayerContext.Provider value={{
      playlists,
      activePlaylistId,
      playingPlaylistId,
      currentTrack,
      isPlaying,
      volume,
      progress,
      duration,
      audioRef,
      analyser,
      createPlaylist,
      deletePlaylist,
      setActivePlaylist,
      addTrack,
      removeTrack,
      moveTrackUp,
      moveTrackDown,
      playNext,
      playPrev,
      togglePlay,
      setVolume,
      seek,
      playSpecificTrack,
      updateTrackVideo,
      triggerUpdate,
      vibe,
      setVibe,
      isBassBoost,
      toggleBassBoost,
      isEqEnabled,
      eqGains,
      toggleEq,
      setEqBandGain,
      resetEq,
      isLyricsOpen,
      toggleLyrics,
      updateTrackLyrics,
      sleepTimer,
      setSleepTimer,
      reorderTrack,
      dominantColor,
      isShuffle,
      toggleShuffle,
      repeatMode,
      toggleRepeatMode,
      playbackRate,
      setPlaybackRate,
      isCinemaMode,
      toggleCinemaMode
    }}>
      {children}
      <audio ref={audioRef} style={{ display: 'none' }} />
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};
