import { useEffect, useRef, useState, useCallback } from 'react';
import { LogEntry, LogParticle } from '@/types/log';
import { getStatusColor } from '@/utils/logGenerator';

interface LogCanvasProps {
  logs: LogEntry[];
  speed: number;
  onParticleClick?: (log: LogEntry) => void;
}

export const LogCanvas = ({ logs, speed, onParticleClick }: LogCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const particlesRef = useRef<LogParticle[]>([]);
  const [hoveredParticle, setHoveredParticle] = useState<LogParticle | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const createParticle = useCallback((log: LogEntry): LogParticle => {
    const canvas = canvasRef.current;
    if (!canvas) throw new Error('Canvas not initialized');

    // Logstalgia style: start from left, move right
    const startX = -20;
    const startY = Math.random() * canvas.height;
    const barrierX = canvas.width / 2;
    const targetX = log.statusCode < 400 ? canvas.width + 20 : barrierX; // Success continues, errors stop at barrier
    const targetY = startY; // Keep same Y level
    
    return {
      id: log.id,
      x: startX,
      y: startY,
      targetX,
      targetY,
      color: getStatusColor(log.statusCode),
      size: Math.random() * 3 + 4,
      speed: (Math.random() * 2 + 3) * speed, // Much faster
      log,
      trail: [],
      isAlive: true,
      glowIntensity: Math.random() * 0.5 + 0.5,
      phase: 'moving' as 'moving' | 'blocked' | 'exploding'
    };
  }, [speed]);

  const updateParticle = useCallback((particle: LogParticle, deltaTime: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const barrierX = canvas.width / 2;
    
    // Handle different phases
    if (particle.phase === 'exploding') {
      // Explosion animation with fade out
      particle.size += deltaTime * 30;
      particle.glowIntensity -= deltaTime * 1.5; // Fade out
      if (particle.size > 50 || particle.glowIntensity <= 0) {
        particle.isAlive = false;
      }
      return;
    }
    
    // Move horizontally (left to right)
    particle.x += particle.speed * deltaTime * 100;
    
    // Add current position to trail
    particle.trail.push({ 
      x: particle.x, 
      y: particle.y, 
      opacity: 1 
    });

    // Limit trail length and fade
    if (particle.trail.length > 10) {
      particle.trail.shift();
    }
    particle.trail.forEach((point, index) => {
      point.opacity = (index + 1) / particle.trail.length * 0.8;
    });
    
    // Check if particle reached barrier
    if (particle.x >= barrierX && particle.phase === 'moving') {
      if (particle.log.statusCode >= 400) {
        // Block and explode
        particle.phase = 'exploding';
        particle.x = barrierX; // Stop at barrier
        return;
      } else {
        // Success - continue through barrier
        particle.phase = 'blocked'; // Just a phase marker
      }
    }
    
    // Remove particle when it goes off screen
    if (particle.x > canvas.width + 50) {
      particle.isAlive = false;
    }
  }, []);

  const drawParticle = useCallback((ctx: CanvasRenderingContext2D, particle: LogParticle) => {
    // Calculate opacity based on phase
    const opacity = particle.phase === 'exploding' ? particle.glowIntensity : 1;
    
    // Draw trail
    particle.trail.forEach((point, index) => {
      if (index < particle.trail.length - 1) {
        const nextPoint = particle.trail[index + 1];
        const trailOpacity = point.opacity * opacity;
        
        ctx.strokeStyle = particle.color + Math.floor(trailOpacity * 255).toString(16).padStart(2, '0');
        ctx.lineWidth = particle.size * 0.3;
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        ctx.lineTo(nextPoint.x, nextPoint.y);
        ctx.stroke();
      }
    });

    // Draw glow effect with fade
    const glowSize = particle.size * (particle.phase === 'exploding' ? 2 : 3) * Math.max(particle.glowIntensity, 0.1);
    const gradient = ctx.createRadialGradient(
      particle.x, particle.y, 0,
      particle.x, particle.y, glowSize
    );
    
    const glowOpacity = Math.max(opacity * 0.8, 0);
    gradient.addColorStop(0, particle.color + Math.floor(glowOpacity * 255).toString(16).padStart(2, '0'));
    gradient.addColorStop(0.5, particle.color + Math.floor(glowOpacity * 0.3 * 255).toString(16).padStart(2, '0'));
    gradient.addColorStop(1, particle.color + '00');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, glowSize, 0, Math.PI * 2);
    ctx.fill();

    // Draw main particle with fade
    const mainOpacity = Math.max(opacity, 0);
    ctx.fillStyle = particle.color + Math.floor(mainOpacity * 255).toString(16).padStart(2, '0');
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();

    // Add extra glow for hovered particle
    if (hoveredParticle?.id === particle.id && opacity > 0.1) {
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = 20;
      ctx.fillStyle = particle.color + Math.floor(mainOpacity * 255).toString(16).padStart(2, '0');
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size + 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }, [hoveredParticle]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    setMousePos({ x: event.clientX, y: event.clientY });

    // Check for particle hover
    const hoveredParticle = particlesRef.current.find(particle => {
      const distance = Math.sqrt((particle.x - x) ** 2 + (particle.y - y) ** 2);
      return distance <= particle.size + 5;
    });

    setHoveredParticle(hoveredParticle || null);
  }, []);

  const handleClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (hoveredParticle && onParticleClick) {
      onParticleClick(hoveredParticle.log);
    }
  }, [hoveredParticle, onParticleClick]);

  // Store logs in a ref to avoid useEffect dependency
  const logsRef = useRef<LogEntry[]>([]);
  
  // Update logs ref when logs change
  useEffect(() => {
    logsRef.current = logs;
  }, [logs]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let lastTime = 0;

    const animate = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      // Clear canvas completely to prevent flashing
      ctx.fillStyle = 'hsl(220, 20%, 8%)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add new particles from new logs without interrupting existing ones
      const currentLogs = logsRef.current;
      const newLogs = currentLogs.filter(log => !particlesRef.current.find(p => p.id === log.id));
      const recentNewLogs = newLogs.slice(-5); // Only add most recent new logs
      
      recentNewLogs.forEach(log => {
        const particle = createParticle(log);
        particlesRef.current.push(particle);
      });

      // Update and draw particles
      particlesRef.current = particlesRef.current.filter(particle => {
        if (!particle.isAlive) return false;
        
        updateParticle(particle, deltaTime);
        drawParticle(ctx, particle);
        
        return particle.isAlive;
      });

      // Draw barrier (Logstalgia style)
      const barrierX = canvas.width / 2;
      
      // Vertical barrier line
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(barrierX, 0);
      ctx.lineTo(barrierX, canvas.height);
      ctx.stroke();
      
      // Barrier glow effect
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 10;
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(barrierX, 0);
      ctx.lineTo(barrierX, canvas.height);
      ctx.stroke();
      ctx.shadowBlur = 0;
      

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [createParticle, updateParticle, drawParticle]); // Removed 'logs' dependency

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        onMouseMove={handleMouseMove}
        onClick={handleClick}
      />
      
      {/* Tooltip */}
      {hoveredParticle && (
        <div 
          className="fixed z-50 bg-card border border-primary/30 rounded-lg p-3 text-sm pointer-events-none glow-primary"
          style={{
            left: mousePos.x + 10,
            top: mousePos.y - 60,
            maxWidth: '300px'
          }}
        >
          <div className="space-y-1">
            <div className="font-orbitron text-glow-primary font-bold">
              {hoveredParticle.log.method} {hoveredParticle.log.statusCode}
            </div>
            <div className="text-foreground/80">
              <span className="text-glow-accent">IP:</span> {hoveredParticle.log.ip}
            </div>
            <div className="text-foreground/80">
              <span className="text-glow-accent">URL:</span> {hoveredParticle.log.url}
            </div>
            <div className="text-foreground/80 text-xs">
              {hoveredParticle.log.timestamp.toLocaleTimeString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};