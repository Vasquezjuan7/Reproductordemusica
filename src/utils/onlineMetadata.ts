export interface OnlineMetadata {
  title?: string;
  artist?: string;
  coverArt?: string;
}

// Prefijos comunes de sitios de descarga de YouTube
const DOWNLOAD_SITE_PREFIXES = [
  /^ytmp3free\.cc[_\-\s]*/i,
  /^yt1s\.com[_\-\s]*/i,
  /^ytmp3\.cc[_\-\s]*/i,
  /^mp3juice[_\-\s]*/i,
  /^snaptube[_\-\s]*/i,
  /^y2mate[_\-\s]*/i,
  /^tubidy[_\-\s]*/i,
  /^[a-z0-9]+\.(cc|io|net|com|org|co)[_\-\s]+/i,
];

/** Términos que indican que un resultado de iTunes es un cover/karaoke */
const JUNK_TERMS = /karaoke|tribute|cover|originally performed|in the style of|made famous|backing track|instrumental|acoustic version|shortened|re-record/i;

/**
 * Limpia nombres de archivos de YouTube u otras fuentes para convertirlos en queries.
 */
export const cleanFilenameForSearch = (filename: string): string => {
  let name = filename.replace(/\.[^/.]+$/, '');

  for (const prefix of DOWNLOAD_SITE_PREFIXES) {
    if (prefix.test(name)) {
      name = name.replace(prefix, '');
      break;
    }
  }

  if (!name.includes(' ') && name.includes('-')) {
    name = name.replace(/-/g, ' ');
  }

  name = name
    .replace(/^\d{1,3}[\s.\-_]+/, '')
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?(official|video|audio|lyric|hd|4k|hq|remix|remaster|live|version|explicit|clean|full|original|extended|radio\s*edit).*?\)/gi, '')
    .replace(/\s*(official\s*(music\s*)?video|lyric[s]?|hd|4k|hq|remix|remaster(ed)?|live\s*version|explicit|radio\s*edit)\s*/gi, ' ')
    .replace(/[_]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return name;
};

/**
 * Busca en MusicBrainz — base de datos musical abierta con +20 millones de canciones.
 * Incluye música latina, K-pop, indie, regional — completamente gratuito, sin API key.
 */
export const searchMusicBrainz = async (query: string): Promise<{ title: string; artist: string } | null> => {
  try {
    const clean = query.trim();
    if (clean.length < 2) return null;

    console.log(`[Aura] MusicBrainz search: "${clean}"`);
    const res = await fetch(
      `https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(clean)}&limit=5&fmt=json`,
      { headers: { 'User-Agent': 'AuraMusicPlayer/1.0 (contact@aura.app)' } }
    );
    if (!res.ok) return null;

    const data = await res.json();
    const recordings: any[] = data.recordings ?? [];
    if (recordings.length === 0) return null;

    // Filtrar versiones live, covers, karaoke
    const JUNK = /karaoke|tribute|cover|live|instrumental|acoustic version/i;
    const clean_results = recordings.filter(r =>
      !JUNK.test(r.title ?? '') &&
      !JUNK.test(r['artist-credit']?.[0]?.artist?.name ?? '') &&
      !(r.disambiguation && JUNK.test(r.disambiguation))
    );

    const best = clean_results[0] ?? recordings[0];
    const artist = best['artist-credit']?.[0]?.artist?.name;
    const title = best.title;

    if (title && artist) {
      return { title, artist };
    }
    return null;
  } catch (err) {
    console.error('[Aura] MusicBrainz search failed:', err);
    return null;
  }
};

/**
 * Busca en Deezer (base de datos mundial enorme, excelente para música latina).
 * Completamente gratuito, sin API key.
 */
export const searchDeezer = async (query: string, knownArtist?: string, knownTitle?: string): Promise<OnlineMetadata | null> => {
  try {
    let searchQuery = query.trim();

    // Si conocemos artista y título, usamos búsqueda avanzada de Deezer
    if (knownArtist && knownTitle) {
      searchQuery = `artist:"${knownArtist}" track:"${knownTitle}"`;
      console.log(`[Aura] Deezer advanced search: ${searchQuery}`);
    } else {
      console.log(`[Aura] Deezer general search: "${searchQuery}"`);
    }

    const res = await fetch(
      `https://api.deezer.com/search?q=${encodeURIComponent(searchQuery)}&limit=10`
    );
    if (!res.ok) return null;

    const data = await res.json();
    if (!data.data || data.data.length === 0) {
      // Fallback: búsqueda general si la avanzada no dio resultados
      if (knownArtist && knownTitle) {
        return searchDeezer(`${knownArtist} ${knownTitle}`);
      }
      return null;
    }

    // Filtrar versiones karaoke/cover
    const originals = data.data.filter(
      (t: any) => !JUNK_TERMS.test(t.title ?? '') && !JUNK_TERMS.test(t.artist?.name ?? '')
    );
    const track = originals.length > 0 ? originals[0] : data.data[0];

    console.log(`[Aura] Deezer match: "${track.artist?.name} - ${track.title}"`);
    return {
      title: track.title,
      artist: track.artist?.name,
      coverArt: track.album?.cover_big ?? track.album?.cover_medium ?? track.album?.cover,
    };
  } catch (error) {
    console.error('[Aura] Deezer search failed:', error);
    return null;
  }
};

/**
 * Busca en iTunes como respaldo (útil cuando Deezer no tiene la canción).
 */
export const fetchiTunesMetadata = async (query: string, knownArtist?: string, knownTitle?: string): Promise<OnlineMetadata | null> => {
  try {
    const base = 'https://itunes.apple.com/search?entity=song&limit=10';

    // Estrategia 1: parámetros específicos artista + canción
    if (knownArtist && knownTitle) {
      const url = `${base}&artistTerm=${encodeURIComponent(knownArtist)}&trackTerm=${encodeURIComponent(knownTitle)}`;
      console.log(`[Aura] iTunes specific: artist="${knownArtist}" track="${knownTitle}"`);
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const originals = (data.results ?? []).filter(
          (t: any) => !JUNK_TERMS.test(t.trackName ?? '') && !JUNK_TERMS.test(t.artistName ?? '')
        );
        const track = originals[0] ?? data.results?.[0];
        if (track) {
          console.log(`[Aura] iTunes match: "${track.artistName} - ${track.trackName}"`);
          return {
            title: track.trackName,
            artist: track.artistName,
            coverArt: track.artworkUrl100?.replace('100x100bb', '600x600bb'),
          };
        }
      }
    }

    // Estrategia 2: búsqueda general
    const trimmed = query.trim();
    if (trimmed.length > 1) {
      console.log(`[Aura] iTunes general: "${trimmed}"`);
      const res = await fetch(`${base}&term=${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const data = await res.json();
        const originals = (data.results ?? []).filter(
          (t: any) => !JUNK_TERMS.test(t.trackName ?? '') && !JUNK_TERMS.test(t.artistName ?? '')
        );
        const track = originals[0] ?? data.results?.[0];
        if (track) {
          console.log(`[Aura] iTunes match: "${track.artistName} - ${track.trackName}"`);
          return {
            title: track.trackName,
            artist: track.artistName,
            coverArt: track.artworkUrl100?.replace('100x100bb', '600x600bb'),
          };
        }
      }
    }

    return null;
  } catch (error) {
    console.error('[Aura] iTunes failed:', error);
    return null;
  }
};

/**
 * Busca letras sincronizadas en LRCLIB con múltiples estrategias.
 * Prioriza letras karaoke (.lrc) sobre letras planas.
 */
export const fetchLRCLIBLyrics = async (title: string, artist: string): Promise<string | null> => {
  try {
    // Intento 1: búsqueda exacta por artista + track
    const res1 = await fetch(
      `https://lrclib.net/api/search?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`
    );
    if (res1.ok) {
      const data = await res1.json();
      if (data?.length > 0) {
        const best = data.find((t: any) => t.syncedLyrics) ?? data.find((t: any) => t.plainLyrics) ?? data[0];
        const lyrics = best?.syncedLyrics ?? best?.plainLyrics;
        if (lyrics) {
          console.log(`[Aura] LRCLIB found lyrics (exact) for "${artist} - ${title}"`);
          return lyrics;
        }
      }
    }

    // Intento 2: búsqueda combinada como query general
    const res2 = await fetch(
      `https://lrclib.net/api/search?q=${encodeURIComponent(`${artist} ${title}`)}`
    );
    if (res2.ok) {
      const data = await res2.json();
      if (data?.length > 0) {
        const best = data.find((t: any) => t.syncedLyrics) ?? data.find((t: any) => t.plainLyrics);
        const lyrics = best?.syncedLyrics ?? best?.plainLyrics;
        if (lyrics) {
          console.log(`[Aura] LRCLIB found lyrics (general) for "${artist} - ${title}"`);
          return lyrics;
        }
      }
    }

    // Intento 3: solo el título (a veces el artista desconocido confunde la búsqueda)
    const res3 = await fetch(
      `https://lrclib.net/api/search?q=${encodeURIComponent(title)}`
    );
    if (res3.ok) {
      const data = await res3.json();
      if (data?.length > 0) {
        const best = data.find((t: any) => t.syncedLyrics) ?? data.find((t: any) => t.plainLyrics);
        const lyrics = best?.syncedLyrics ?? best?.plainLyrics;
        if (lyrics) {
          console.log(`[Aura] LRCLIB found lyrics (title-only) for "${title}"`);
          return lyrics;
        }
      }
    }

    console.log(`[Aura] LRCLIB: no lyrics found for "${artist} - ${title}"`);
    return null;
  } catch (error) {
    console.error('[Aura] LRCLIB failed:', error);
    return null;
  }
};
