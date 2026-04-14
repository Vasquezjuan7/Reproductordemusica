/**
 * Reconocimiento acústico usando AudD.io
 * Requiere una API key gratuita de https://dashboard.audd.io/
 */
export const recognizeAudioFile = async (file: File, apiKey: string): Promise<{ title: string; artist: string } | null> => {
  if (!apiKey || apiKey === 'test') return null;

  try {
    // Enviamos los primeros 2MB del audio para extraer la huella acústica
    const chunk = file.slice(0, 2 * 1024 * 1024);
    const audioFile = new File([chunk], 'audio.mp3', { type: file.type || 'audio/mpeg' });

    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('api_token', apiKey);

    console.log(`[Aura] Sending audio to AudD for recognition (${(chunk.size / 1024).toFixed(0)} KB)…`);
    
    const res = await fetch('https://api.audd.io/', { method: 'POST', body: formData });
    if (!res.ok) {
      console.warn('[Aura] AudD returned HTTP', res.status);
      return null;
    }

    const data = await res.json();
    console.log('[Aura] AudD response:', JSON.stringify(data));

    if (data.status === 'success' && data.result) {
      return { title: data.result.title, artist: data.result.artist };
    }
    return null;
  } catch (err) {
    console.error('[Aura] AudD recognition failed:', err);
    return null;
  }
};

/** Guarda la API key en localStorage */
export const saveAudDKey = (key: string) => localStorage.setItem('aura_audd_key', key);

/** Lee la API key desde localStorage */
export const getAudDKey = (): string => localStorage.getItem('aura_audd_key') ?? '';
