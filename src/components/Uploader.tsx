import React, { useRef, useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import * as jsmediatags from 'jsmediatags';
import { fetchiTunesMetadata, cleanFilenameForSearch } from '../utils/onlineMetadata';

export const Uploader: React.FC = () => {
  const { addTrack } = usePlayer();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState('');

  // jsmediatags puede quedarse congelado con algunos archivos, así que le ponemos un timeout de 2 segundos.
  const extractTags = (file: File): Promise<any> =>
    new Promise((resolve) => {
      const timer = setTimeout(() => {
        console.warn(`[Aura] Timeout leyendo ID3 de "${file.name}"`);
        resolve(null);
      }, 2000);

      try {
        jsmediatags.read(file, {
          onSuccess: (tag) => {
            clearTimeout(timer);
            resolve(tag.tags);
          },
          onError: () => {
            clearTimeout(timer);
            resolve(null);
          },
        });
      } catch (e) {
        clearTimeout(timer);
        resolve(null);
      }
    });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setIsProcessing(true);

    for (const file of Array.from(files)) {
      const isAudio = file.type.startsWith('audio/');
      const isVideo = file.type.startsWith('video/');

      if (isVideo) {
        const objectUrl = URL.createObjectURL(file);
        addTrack({
          id: crypto.randomUUID(),
          title: file.name.replace(/\.[^/.]+$/, ''),
          artist: 'Unknown Artist',
          audioSrc: objectUrl,
          videoSrc: objectUrl,
        });
        continue;
      }

      if (!isAudio) continue;

      try {
        const objectUrl = URL.createObjectURL(file);
        let title = '';
        let artist = 'Unknown Artist';
        let coverArt: string | undefined;

        // Nivel de confianza:
        // 3 = ID3 tags completos  → NO tocar title/artist, solo buscar portada
        // 2 = "Artista - Título"  → buscar portada con artistTerm+trackTerm exacto
        // 1 = Slug YouTube limpio → buscar portada con query general, iTunes corrige title/artist
        // 0 = Nombre inútil       → solo iTunes general, aceptar lo que devuelva
        let confidence = 0;

        // ──────────────────────────────────────────────────
        // PASO 1: ID3 Tags del archivo
        // ──────────────────────────────────────────────────
        setStatus(`Leyendo "${file.name}"…`);
        const tags = await extractTags(file);

        if (tags) {
          if (tags.title)  title  = tags.title;
          if (tags.artist) artist = tags.artist;
          if (tags.lyrics?.lyrics) { /* lyrics stored in ID3 */ }
          else if (tags.USLT) { /* USLT lyrics stored in ID3 */ }

          if (tags.picture) {
            try {
              const d = tags.picture.data;
              let b64 = '';
              for (let i = 0; i < d.length; i++) b64 += String.fromCharCode(d[i]);
              coverArt = `data:${tags.picture.format};base64,${window.btoa(b64)}`;
            } catch { /* imagen corrupta */ }
          }

          if (title && artist !== 'Unknown Artist') confidence = 3;
          else if (title) confidence = 1;
        }

        // ──────────────────────────────────────────────────
        // PASO 2: Parseo del nombre del archivo (si no hay ID3 completo)
        // ──────────────────────────────────────────────────
        if (confidence < 3) {
          const rawName = file.name.replace(/\.[^/.]+$/, '');

          // Patrón "Artista - Título" explícito
          const dashMatch = rawName.match(/^(.+?)\s+-\s+(.+)$/);
          if (dashMatch) {
            artist = dashMatch[1].trim();
            title  = cleanFilenameForSearch(dashMatch[2]);
            confidence = 2;
          } else {
            // Slug de YouTube u otro formato
            const cleaned = cleanFilenameForSearch(file.name);
            if (cleaned && cleaned.length > 2) {
              title = cleaned;
              confidence = 1;
            } else {
              title = rawName;
              confidence = 0;
            }
          }
        }

        // ──────────────────────────────────────────────────
        // PASO 3: iTunes para portada (y corrección de metadata si confianza baja)
        // ──────────────────────────────────────────────────
        {
          const knownArtist = confidence >= 2 ? artist : undefined;
          const knownTitle  = confidence >= 2 ? title  : undefined;
          const generalQ    = artist !== 'Unknown Artist' ? `${artist} ${title}` : title;

          setStatus(`Identificando "${generalQ}"…`);
          const itunes = await fetchiTunesMetadata(generalQ, knownArtist, knownTitle);

          if (itunes) {
            if (itunes.coverArt) coverArt = itunes.coverArt;

            // Solo permitir que iTunes corrija title/artist cuando la confianza es baja
            if (confidence <= 1) {
              if (itunes.title)  title  = itunes.title;
              if (itunes.artist) artist = itunes.artist;
            }
          }
        }

        // ──────────────────────────────────────────────────
        // PASO 4: Asignar Valores Finales y Guardar
        // ──────────────────────────────────────────────────
        if (!title) title = file.name.replace(/\.[^/.]+$/, '');

        console.log(`[Aura] ✅ "${artist} - ${title}" (confidence: ${confidence})`);
        addTrack({ id: crypto.randomUUID(), title, artist, audioSrc: objectUrl, coverArt });
      } catch (err) {
        console.error(`[Aura] Error fatal procesando "${file.name}":`, err);
        // Fallback de emergencia si el archivo rompe algo interno
        addTrack({
          id: crypto.randomUUID(),
          title: file.name.replace(/\.[^/.]+$/, ''),
          artist: 'Unknown Artist',
          audioSrc: URL.createObjectURL(file),
        });
      }
    }

    setStatus('');
    setIsProcessing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 flex flex-col items-center gap-3">
      <input type="file" ref={fileInputRef} onChange={handleFileUpload}
        accept="audio/*,video/*" multiple className="hidden" />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isProcessing}
        className="flex items-center justify-center min-w-[280px] px-6 py-3 bg-gradient-to-r from-primary to-indigo-500 hover:scale-[1.02] active:scale-[0.98] transition-all text-white font-semibold rounded-full shadow-lg disabled:opacity-60 disabled:cursor-wait"
      >
        {isProcessing ? 'Procesando…' : 'Subir canciones o videos (MP3/MP4)'}
      </button>
      {isProcessing && status && (
        <p className="text-xs text-text-muted animate-pulse text-center max-w-xs">{status}</p>
      )}
    </div>
  );
};
