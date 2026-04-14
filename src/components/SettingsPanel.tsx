import React, { useState, useEffect } from 'react';
import { Settings, X, Key, ExternalLink, CheckCircle } from 'lucide-react';
import { saveAudDKey, getAudDKey } from '../utils/audioRecognition';

export const SettingsPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setApiKey(getAudDKey());
  }, []);

  const handleSave = () => {
    saveAudDKey(apiKey.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const hasKey = getAudDKey().length > 5;

  return (
    <>
      {/* Botón flotante de configuración */}
      <button
        onClick={() => setIsOpen(true)}
        title="Configurar reconocimiento de canciones"
        className={`fixed bottom-36 right-6 z-50 p-3 rounded-full shadow-xl transition-all hover:scale-110 ${
          hasKey
            ? 'bg-green-500 text-white'
            : 'bg-gradient-to-br from-primary to-indigo-500 text-white animate-pulse'
        }`}
      >
        <Key className="w-5 h-5" />
      </button>

      {/* Panel de configuración */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md glass rounded-2xl p-6 shadow-2xl border border-white/20 dark:border-slate-700/40">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-tr from-primary to-indigo-400 rounded-full text-white">
                  <Settings className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold dark:text-white">Reconocimiento de canciones</h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-text-muted hover:text-foreground p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-text-muted mb-4 leading-relaxed">
              Para que la app reconozca cualquier canción automáticamente (como Shazam), necesitas una
              clave gratuita de <strong>AudD.io</strong>. Da <strong>1,000 reconocimientos gratis</strong> al mes.
            </p>

            <a
              href="https://dashboard.audd.io/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-primary hover:underline text-sm font-semibold mb-6"
            >
              <ExternalLink className="w-4 h-4" />
              Obtener clave gratuita en dashboard.audd.io
            </a>

            <div className="flex flex-col gap-3">
              <label className="text-sm font-semibold dark:text-white">Tu API Key de AudD:</label>
              <input
                type="password"
                placeholder="Pega aquí tu API key…"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-white/20 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono text-sm dark:text-white"
              />
              <button
                onClick={handleSave}
                className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-primary to-indigo-500 text-white rounded-xl font-semibold shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all"
              >
                {saved ? (
                  <><CheckCircle className="w-5 h-5" /> ¡Guardado!</>
                ) : (
                  <><Key className="w-5 h-5" /> Guardar clave</>
                )}
              </button>
            </div>

            {hasKey && (
              <p className="mt-4 text-xs text-green-500 font-semibold text-center">
                ✅ Reconocimiento acústico activo — sube cualquier MP3 y lo identificará automáticamente
              </p>
            )}
            {!hasKey && (
              <p className="mt-4 text-xs text-text-muted text-center">
                Sin clave: se usará el nombre del archivo para identificar canciones.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
};
