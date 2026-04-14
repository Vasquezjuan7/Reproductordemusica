import React, { useEffect, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';

// --- Particle/Class definitions for different modes ---

class FloatingParticle {
  x: number; y: number; vx: number; vy: number;
  size: number; alpha: number;
  constructor(width: number, height: number, speedMod: number) {
    this.x = Math.random() * width;
    this.y = height + 10;
    this.vx = (Math.random() - 0.5) * 2;
    this.vy = -(Math.random() * 3 + 2) * speedMod;
    this.size = Math.random() * 4 + 2;
    this.alpha = Math.random() * 0.8 + 0.2;
  }
  update() { this.x += this.vx; this.y += this.vy; this.alpha -= 0.005; }
  draw(ctx: CanvasRenderingContext2D, color: string) {
    if (this.alpha <= 0) return;
    ctx.save(); ctx.globalAlpha = this.alpha; ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill(); ctx.restore();
  }
}

class Ray {
  x: number; width: number; speed: number; hue: number; angle: number; rotSpeed: number;
  constructor(x: number, width: number, speed: number, hue: number) {
    this.x = x; this.width = width; this.speed = speed; this.hue = hue;
    this.angle = (Math.random() - 0.5) * 0.5;
    this.rotSpeed = (Math.random() - 0.5) * 0.02;
  }
  update(width: number, intensity: number) {
    this.x += this.speed * (1 + intensity);
    this.angle += this.rotSpeed * (1 + intensity);
    if (this.x > width + 200) this.x = -200;
    if (this.x < -200) this.x = width + 200;
  }
  draw(ctx: CanvasRenderingContext2D, _width: number, height: number, intensity: number, isDark: boolean, time: number) {
    const alpha = (isDark ? 0.7 : 0.5) * intensity;
    if (alpha <= 0.05) return;
    
    ctx.save();
    ctx.translate(this.x, height / 2);
    ctx.rotate(this.angle);
    
    // Laser-specific vibrant colors
    const laserHues = [0, 120, 180, 280, 320]; // Red, Green, Cyan, Purple, Pink
    const baseHue = laserHues[Math.floor(this.hue % laserHues.length)];
    const dynamicHue = (baseHue + time * 20) % 360;
    
    // Outer glow
    const outerGrad = ctx.createLinearGradient(-this.width, -height, this.width, height);
    outerGrad.addColorStop(0, 'transparent');
    outerGrad.addColorStop(0.5, `hsla(${dynamicHue}, 100%, 50%, ${alpha * 0.4})`);
    outerGrad.addColorStop(1, 'transparent');
    
    ctx.fillStyle = outerGrad;
    ctx.fillRect(-this.width, -height, this.width * 2, height * 2);

    // Inner core (The "laser" itself)
    const coreGrad = ctx.createLinearGradient(-1, -height, 1, height);
    coreGrad.addColorStop(0, 'transparent');
    coreGrad.addColorStop(0.5, `hsla(${dynamicHue}, 100%, 80%, ${alpha})`);
    coreGrad.addColorStop(1, 'transparent');
    
    ctx.fillStyle = coreGrad;
    ctx.fillRect(-1.5, -height, 3, height * 2);
    
    ctx.restore();
  }
}

class RainDrop {
  x: number; y: number; length: number; speed: number; alpha: number;
  constructor(width: number, height: number) {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.length = Math.random() * 25 + 10;
    this.speed = Math.random() * 10 + 10;
    this.alpha = Math.random() * 0.4 + 0.1;
  }
  update(height: number, intensity: number) {
    this.y += this.speed * (1 + intensity * 0.3);
    if (this.y > height) this.y = -this.length;
  }
  draw(ctx: CanvasRenderingContext2D, isDark: boolean) {
    const a = isDark ? this.alpha : this.alpha * 1.5;
    ctx.strokeStyle = isDark ? `rgba(255, 255, 255, ${a})` : `rgba(30, 40, 80, ${a})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x, this.y + this.length); ctx.stroke();
  }
}

// --- Main Visualizer Component ---

export const Visualizer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { isPlaying, vibe, analyser, currentTrack, triggerUpdate, dominantColor } = usePlayer();
  const animationRef = useRef<number>(0);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer>>(new Uint8Array(0) as Uint8Array<ArrayBuffer>);
  const videoScaleRef = useRef<number>(1);
  
  // Refs for persistent objects in different modes
  const barParticles = useRef<FloatingParticle[]>([]);
  const rays = useRef<Ray[]>([]);
  const rainDrops = useRef<RainDrop[]>([]);
  const lastStrike = useRef<number>(0);

  // Video Sync Effect
  useEffect(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    if (currentTrack?.song.videoSrc) {
      if (video.src !== currentTrack.song.videoSrc) {
        video.src = currentTrack.song.videoSrc;
        video.load();
      }
      if (isPlaying) {
        video.play().catch(e => console.warn("Video play blocked:", e));
      } else {
        video.pause();
      }
    } else {
      video.pause();
      video.src = "";
    }
  }, [currentTrack, isPlaying]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // We depend on currentTrack to ensure the visualizer re-attaches to the audio stream 
    // whenever a new song begins.
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      // Init Ray mode (High-Intensity Lasers)
      const r: Ray[] = [];
      for(let i=8; i>0; i--) r.push(new Ray(Math.random()*canvas.width, Math.random()*15+15, (Math.random()-0.5)*6, Math.random()*360));
      rays.current = r;

      // Init Storm mode
      const d: RainDrop[] = [];
      for(let i=0; i<120; i++) d.push(new RainDrop(canvas.width, canvas.height));
      rainDrops.current = d;
    };
    window.addEventListener('resize', resize);
    resize();

    let time = 0;
    let rotation = 0;

    const drawLightning = (x: number, y: number, segments: number, isDark: boolean) => {
        if (segments <= 0) return;
        const nextX = x + (Math.random() - 0.5) * 120;
        const nextY = y + (Math.random() * 50 + 30);
        ctx.strokeStyle = isDark ? 'rgba(191, 0, 255, 0.9)' : 'rgba(120, 0, 200, 0.9)';
        ctx.lineWidth = segments / 1.5;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(nextX, nextY); ctx.stroke();
        drawLightning(nextX, nextY, segments - 1, isDark);
    };

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      
      if (!analyser) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      // Self-healing dataArray: Ensure it's the correct size
      if (dataArrayRef.current.length !== analyser.frequencyBinCount) {
        dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;
      }
      
      const dataArray = dataArrayRef.current;
      analyser.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const isDark = document.documentElement.classList.contains('dark');
      const bass = Array.from(dataArray.slice(0, 5)).reduce((a,b)=>a+b,0) / 5;
      const treble = Array.from(dataArray.slice(100, 120)).reduce((a,b)=>a+b,0) / 20;
      const intensity = isPlaying ? (bass/255) : 0;
      
      // Update video scale based on bass
      if (videoRef.current && currentTrack?.song.videoSrc) {
        const targetScale = 1 + (intensity * 0.05); // Subtle 5% pulse
        videoScaleRef.current += (targetScale - videoScaleRef.current) * 0.2; // Smooth transition
        videoRef.current.style.transform = `scale(${videoScaleRef.current})`;
      }

      time += isPlaying ? 0.005 + (bass * 0.0001) : 0.002;
      const baseHue = (time * 100) % 360;

      // --- Rendering Logic per Vibe ---

      if (vibe === 'bars') {
          if (isPlaying && bass > 180 && Math.random() < 0.5) {
              barParticles.current.push(new FloatingParticle(canvas.width, canvas.height, (bass / 255) * 1.5));
          }
          const pColor = isDark ? `hsl(${baseHue}, 100%, 70%)` : `hsl(${baseHue}, 80%, 50%)`;
          barParticles.current.forEach((p, index) => {
              p.update(); p.draw(ctx, pColor);
              if (p.alpha <= 0 || p.y < -50) barParticles.current.splice(index, 1);
          });
          const bSize = canvas.width / dataArray.length * 2.5;
          let bx = 0;
          for(let i=0; i<dataArray.length; i++) {
              const h = isPlaying ? (dataArray[i]/255) * (canvas.height*0.45) : 5;
              const grad = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - h);
              grad.addColorStop(0, `hsla(${(baseHue+i)%360}, 90%, 60%, 1)`);
              grad.addColorStop(1, 'transparent');
              ctx.fillStyle = grad;
              ctx.beginPath(); ctx.roundRect(bx, canvas.height - h, bSize-2, h, [10,10,0,0]); ctx.fill();
              bx += bSize;
          }
      } 
      else if (vibe === 'rays') {
          // Strobe effect on high treble or strong bass
          if (isPlaying && (treble > 180 || bass > 230) && Math.random() < 0.3) {
              ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.1)';
              ctx.fillRect(0,0,canvas.width, canvas.height);
          }

          let ox = 0, oy = 0;
          if (isPlaying && bass > 210) { ox = (Math.random()-0.5)*15; oy = (Math.random()-0.5)*15; }
          ctx.save(); ctx.translate(ox, oy);
          
          rays.current.forEach((r, i) => {
              const rInt = isPlaying ? (dataArray[Math.floor((i/rays.current.length) * dataArray.length)] / 255) : 0.1;
              r.update(canvas.width, intensity); 
              r.draw(ctx, canvas.width, canvas.height, rInt + (intensity*0.6), isDark, time);
          });
          ctx.restore();
      }
      else if (vibe === 'storm') {
          rainDrops.current.forEach(d => { d.update(canvas.height, intensity); d.draw(ctx, isDark); });
          const now = Date.now();
          if (isPlaying && bass > 200 && now - lastStrike.current > 400) {
              lastStrike.current = now;
              const sx = Math.random() * canvas.width;
              ctx.fillStyle = isDark ? 'rgba(191, 0, 255, 0.12)' : 'rgba(191, 0, 255, 0.06)';
              ctx.fillRect(0,0,canvas.width, canvas.height);
              drawLightning(sx, 0, 18, isDark);
          }
      }
      else if (vibe === 'orb') {
          const cx = canvas.width/2, cy = canvas.height/2;
          rotation += isPlaying ? (bass / 255) * 0.05 + 0.005 : 0.002;
          const orbR = 100 + intensity * 80;
          const grad = ctx.createRadialGradient(cx, cy, orbR * 0.5, cx, cy, orbR*2.5);
          grad.addColorStop(0, dominantColor ? dominantColor.replace('rgb', 'rgba').replace(')', `, ${isPlaying ? 0.6 : 0.1})`) : `hsla(${baseHue}, 80%, 60%, ${isPlaying ? 0.6 : 0.1})`);
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.beginPath(); ctx.arc(cx, cy, orbR*2.5, 0, Math.PI*2); ctx.fill();
          
          const bars = 100; const step = (Math.PI*2)/bars;
          ctx.beginPath();
          for(let i=0; i<bars; i++) {
              const v = dataArray[i % dataArray.length];
              const r = orbR + (v/255) * 50;
              const a = rotation + (i * step);
              const x = cx + Math.cos(a)*r, y = cy + Math.sin(a)*r;
              if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
          }
          ctx.closePath(); ctx.lineWidth = 2 + intensity*3;
          ctx.strokeStyle = isDark ? `hsla(${(baseHue+180)%360}, 100%, 75%, 0.7)` : `hsla(${(baseHue+180)%360}, 100%, 50%, 0.5)`;
          ctx.stroke();
      }
    };
    draw();
    return () => { window.removeEventListener('resize', resize); if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [isPlaying, vibe, analyser, currentTrack, triggerUpdate]);

  return (
    <div className="fixed inset-0 pointer-events-none -z-10 bg-[var(--background)] transition-colors duration-500 overflow-hidden">
       {currentTrack?.song.videoSrc && (
         <div className="absolute inset-0 z-0">
           <video 
              ref={videoRef}
              loop 
              muted 
              playsInline
              className="w-full h-full object-cover opacity-60 transition-opacity duration-700"
              style={{ filter: 'brightness(0.7) contrast(1.1)' }}
           />
           <div className="absolute inset-0 bg-black/30 dark:bg-black/50 z-10 transition-colors" />
         </div>
       )}
       <canvas ref={canvasRef} className="w-full h-full relative z-20"></canvas>
    </div>
  );
};
