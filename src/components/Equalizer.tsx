import React, { useRef, useEffect, useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { RotateCcw } from 'lucide-react';

const EQ_FREQS = ["60Hz", "150Hz", "400Hz", "1KHz", "2.4KHz", "15KHz"];

export const Equalizer: React.FC = () => {
  const { eqGains, setEqBandGain, resetEq, isEqEnabled, toggleEq } = usePlayer();
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  const padding = 40;
  const width = 600;
  const height = 240;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // Map gain (-12 to 12) to Y coordinate
  const gainToY = (gain: number) => {
    const normalized = (gain + 12) / 24; // 0 to 1
    return padding + chartHeight - normalized * chartHeight;
  };

  // Map Y coordinate to gain
  const yToGain = (y: number) => {
    const normalized = (padding + chartHeight - y) / chartHeight;
    const gain = normalized * 24 - 12;
    return Math.max(-12, Math.min(12, gain));
  };

  const getPoints = () => {
    return eqGains.map((gain, i) => ({
      x: padding + (i * chartWidth) / (eqGains.length - 1),
      y: gainToY(gain),
    }));
  };

  const points = getPoints();

  // Create SVG path for the smooth curve
  const getPathData = () => {
    if (points.length < 2) return "";
    
    // Draw smooth curve using cubic bezier control points
    let data = `M ${points[0].x} ${points[0].y}`;
    
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i];
        const p1 = points[i + 1];
        const cp1x = p0.x + (p1.x - p0.x) / 2;
        const cp1y = p0.y;
        const cp2x = p0.x + (p1.x - p0.x) / 2;
        const cp2y = p1.y;
        data += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
    }
    return data;
  };

  // Path data for the filled area under the curve
  const getFillPathData = () => {
    const path = getPathData();
    if (!path) return "";
    return `${path} L ${points[points.length - 1].x} ${padding + chartHeight} L ${points[0].x} ${padding + chartHeight} Z`;
  };

  const handleMouseDown = (idx: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    setDraggingIdx(idx);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (draggingIdx === null || !svgRef.current) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const gain = yToGain(y);
    setEqBandGain(draggingIdx, parseFloat(gain.toFixed(1)));
  };

  const handleMouseUp = () => {
    setDraggingIdx(null);
  };

  useEffect(() => {
    if (draggingIdx !== null) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingIdx]);

  return (
    <div className="glass rounded-3xl p-6 shadow-2xl border border-white/20 dark:border-slate-800/40 w-[650px] animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex items-center justify-between mb-6">
        <div className="flex flex-col">
            <h3 className="text-sm font-bold uppercase tracking-widest text-text-muted mb-1">Ecualizador</h3>
            <div className="flex gap-4">
               <span className="text-[10px] text-primary font-bold">Valores predefinidos</span>
               <span className="text-[10px] text-text-muted hover:text-white cursor-pointer transition-colors">Manual</span>
            </div>
        </div>

        <div className="flex items-center gap-4">
            <button 
                onClick={resetEq}
                className="p-2 rounded-lg hover:bg-white/5 text-text-muted hover:text-white transition-all flex items-center gap-2"
                title="Restablecer"
            >
                <RotateCcw className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase">Restablecer</span>
            </button>

            <div 
                onClick={toggleEq}
                className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors duration-300 ${isEqEnabled ? 'bg-primary' : 'bg-slate-700'}`}
            >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 ${isEqEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
            </div>
        </div>
      </div>

      <div className="relative bg-slate-900/40 rounded-2xl overflow-hidden border border-white/5">
        {/* Background Grid Lines */}
        <div className="absolute inset-0 pointer-events-none opacity-10">
            <div className="absolute top-[padding] w-full border-t border-white" />
            <div className="absolute top-[50%] w-full border-t border-white" />
            <div className="absolute bottom-[padding] w-full border-t border-white" />
        </div>

        <svg 
            ref={svgRef}
            viewBox={`0 0 ${width} ${height}`} 
            className={`w-full h-auto cursor-ns-resize transition-opacity duration-300 ${!isEqEnabled ? 'opacity-30 grayscale' : ''}`}
        >
            <defs>
                <linearGradient id="eqGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                </linearGradient>
            </defs>

            {/* Area Fill */}
            <path d={getFillPathData()} fill="url(#eqGradient)" />

            {/* Main Path */}
            <path 
                d={getPathData()} 
                fill="none" 
                stroke="#22c55e" 
                strokeWidth="3" 
                strokeLinecap="round"
                className="drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]"
            />

            {/* Horizontal Center Line */}
            <line x1={padding} y1={height/2} x2={width-padding} y2={height/2} stroke="white" strokeOpacity="0.1" strokeDasharray="4 4" />

            {/* Control Points */}
            {points.map((p, i) => (
                <g key={i}>
                    {/* Interaction radius */}
                    <circle 
                        cx={p.x} cy={p.y} r="20" 
                        fill="transparent" 
                        className="cursor-pointer"
                        onMouseDown={handleMouseDown(i)}
                    />
                    {/* Visual dot */}
                    <circle 
                        cx={p.x} cy={p.y} r="6" 
                        fill="white" 
                        className={`pointer-events-none transition-transform duration-200 ${draggingIdx === i ? 'scale-125' : ''}`}
                    />
                    <circle 
                        cx={p.x} cy={p.y} r="10" 
                        fill="none" 
                        stroke="white" 
                        strokeWidth="2" 
                        strokeOpacity="0.2"
                        className="pointer-events-none"
                    />
                </g>
            ))}

            {/* dB Labels */}
            <text x="10" y={padding + 5} className="text-[10px] fill-text-muted font-bold">+12dB</text>
            <text x="10" y={height - padding + 5} className="text-[10px] fill-text-muted font-bold">-12dB</text>

            {/* Frequency Labels */}
            {EQ_FREQS.map((label, i) => (
                <text 
                    key={i} 
                    x={points[i].x} 
                    y={height - 15} 
                    textAnchor="middle" 
                    className="text-[10px] fill-text-muted font-bold"
                >
                    {label}
                </text>
            ))}
        </svg>
      </div>
    </div>
  );
};
