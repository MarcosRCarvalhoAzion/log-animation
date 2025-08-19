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

    const startX = Math.random() * canvas.width;
    const startY = -20;
    const targetX = canvas.width / 2 + (Math.random() - 0.5) * 100;
    const targetY = canvas.height / 2;
    
    return {
      id: log.id,
      x: startX,
      y: startY,
      targetX,
      targetY,
      color: getStatusColor(log.statusCode),
      size: Math.random() * 4 + 3,
      speed: (Math.random() * 2 + 1) * speed,
      log,
      trail: [],
      isAlive: true,
      glowIntensity: Math.random() * 0.5 + 0.5
    };
  }, [speed]);

  const updateParticle = useCallback((particle: LogParticle, deltaTime: number) => {
    const dx = particle.targetX - particle.x;
    const dy = particle.targetY - particle.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 5) {
      particle.isAlive = false;
      return;
    }

    // Add current position to trail
    particle.trail.push({ 
      x: particle.x, 
      y: particle.y, 
      opacity: 1 
    });

    // Limit trail length and fade
    if (particle.trail.length > 15) {
      particle.trail.shift();
    }
    particle.trail.forEach((point, index) => {
      point.opacity = (index + 1) / particle.trail.length * 0.8;
    });

    // Move particle towards target
    const moveX = (dx / distance) * particle.speed * deltaTime;
    const moveY = (dy / distance) * particle.speed * deltaTime;
    
    particle.x += moveX;
    particle.y += moveY;

    // Add some randomness for organic movement
    particle.x += (Math.random() - 0.5) * 0.5;
    particle.y += (Math.random() - 0.5) * 0.5;
  }, []);

  const drawParticle = useCallback((ctx: CanvasRenderingContext2D, particle: LogParticle) => {
    // Draw trail
    particle.trail.forEach((point, index) => {
      if (index < particle.trail.length - 1) {
        const nextPoint = particle.trail[index + 1];
        const gradient = ctx.createLinearGradient(point.x, point.y, nextPoint.x, nextPoint.y);
        gradient.addColorStop(0, particle.color.replace(')', `, ${point.opacity})`).replace('hsl', 'hsla'));
        gradient.addColorStop(1, particle.color.replace(')', `, ${nextPoint.opacity})`).replace('hsl', 'hsla'));
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = particle.size * 0.3;
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        ctx.lineTo(nextPoint.x, nextPoint.y);
        ctx.stroke();
      }
    });

    // Draw glow effect
    const glowSize = particle.size * 3 * particle.glowIntensity;
    const gradient = ctx.createRadialGradient(
      particle.x, particle.y, 0,
      particle.x, particle.y, glowSize
    );
    gradient.addColorStop(0, particle.color.replace(')', ', 0.8)').replace('hsl', 'hsla'));
    gradient.addColorStop(0.5, particle.color.replace(')', ', 0.3)').replace('hsl', 'hsla'));
    gradient.addColorStop(1, particle.color.replace(')', ', 0)').replace('hsl', 'hsla'));
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, glowSize, 0, Math.PI * 2);
    ctx.fill();

    // Draw main particle
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();

    // Add extra glow for hovered particle
    if (hoveredParticle?.id === particle.id) {
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = 20;
      ctx.fillStyle = particle.color;
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

      // Clear canvas with fade effect
      ctx.fillStyle = 'hsla(220, 20%, 8%, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add new particles from new logs
      logs.slice(-5).forEach(log => {
        if (!particlesRef.current.find(p => p.id === log.id)) {
          particlesRef.current.push(createParticle(log));
        }
      });

      // Update and draw particles
      particlesRef.current = particlesRef.current.filter(particle => {
        if (!particle.isAlive) return false;
        
        updateParticle(particle, deltaTime);
        drawParticle(ctx, particle);
        
        return particle.isAlive;
      });

      // Draw center target
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Outer ring
      ctx.strokeStyle = 'hsl(var(--primary))';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 50, 0, Math.PI * 2);
      ctx.stroke();
      
      // Inner core with glow
      const coreGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 20);
      coreGradient.addColorStop(0, 'hsl(var(--primary))');
      coreGradient.addColorStop(1, 'hsla(var(--primary), 0)');
      ctx.fillStyle = coreGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 20, 0, Math.PI * 2);
      ctx.fill();

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [logs, createParticle, updateParticle, drawParticle]);

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