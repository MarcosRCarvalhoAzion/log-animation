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

  // URL to lane mapping
  const getUrlLane = useCallback((url: string) => {
    const baseUrl = url.split('?')[0]; // Remove query params
    const urlHash = baseUrl.split('').reduce((hash, char) => {
      return ((hash << 5) - hash + char.charCodeAt(0)) & 0xffffffff;
    }, 0);
    return Math.abs(urlHash) % 8; // 8 lanes
  }, []);

  const createParticle = useCallback((log: LogEntry): LogParticle => {
    const canvas = canvasRef.current;
    if (!canvas) throw new Error('Canvas not initialized');

    // Calculate lane position
    const laneIndex = getUrlLane(log.url);
    const laneHeight = canvas.height / 8;
    const laneY = (laneIndex * laneHeight) + (laneHeight / 2);

    // Logstalgia style: start from left, move right
    const startX = -20;
    const startY = laneY;
    const barrierX = canvas.width / 2;
    const targetX = log.statusCode < 400 ? canvas.width + 20 : barrierX;
    const targetY = startY; // Keep same Y level
    
    return {
      id: log.id,
      x: startX,
      y: startY,
      targetX,
      targetY,
      color: '#888888', // Start with neutral color
      size: Math.random() * 3 + 4,
      speed: (Math.random() * 2 + 3) * speed,
      log,
      trail: [],
      isAlive: true,
      glowIntensity: Math.random() * 0.5 + 0.5,
      phase: 'moving' as 'moving' | 'blocked' | 'exploding',
      laneIndex,
      showingStatus: false,
      statusDisplayTime: 0,
      statusStickX: 0
    };
  }, [speed, getUrlLane]);

  const updateParticle = useCallback((particle: LogParticle, deltaTime: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const barrierX = canvas.width / 2;
    const barrierZone = 60; // Zone around barrier for status display
    
    // Handle different phases
    if (particle.phase === 'exploding') {
      // Explosion animation with fade out
      particle.size += deltaTime * 30;
      particle.glowIntensity -= deltaTime * 1.5;
      if (particle.size > 50 || particle.glowIntensity <= 0) {
        particle.isAlive = false;
      }
      return;
    }
    
    // Move horizontally (left to right)
    particle.x += particle.speed * deltaTime * 100;
    
    // Check if particle is in barrier zone
    const inBarrierZone = Math.abs(particle.x - barrierX) < barrierZone;
    
    // Colorize and show status when approaching/passing barrier
    if (inBarrierZone && !particle.showingStatus) {
      particle.color = getStatusColor(particle.log.statusCode);
      particle.showingStatus = true;
      particle.statusDisplayTime = 0.5; // Show for 500ms
      particle.statusStickX = barrierX; // Stick to barrier center
    }
    
    // Update status display timer
    if (particle.showingStatus) {
      particle.statusDisplayTime -= deltaTime;
      if (particle.statusDisplayTime <= 0) {
        particle.showingStatus = false;
      }
    }
    
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
        particle.x = barrierX;
        return;
      } else {
        // Success - continue through barrier
        particle.phase = 'blocked';
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

  // Separate function to draw status boxes on top
  const drawStatusBoxes = useCallback((ctx: CanvasRenderingContext2D) => {
    particlesRef.current.forEach(particle => {
      if (particle.showingStatus) {
        const opacity = particle.phase === 'exploding' ? particle.glowIntensity : 1;
        if (opacity > 0.5) {
          const statusText = particle.log.statusCode.toString();
          const statusX = particle.statusStickX;
          const statusY = particle.y - particle.size - 8;
          
          // Measure text for background box
          ctx.font = '12px monospace';
          ctx.textAlign = 'center';
          const textMetrics = ctx.measureText(statusText);
          const textWidth = textMetrics.width;
          const textHeight = 12;
          
          // Draw black background box
          ctx.fillStyle = '#000000';
          ctx.fillRect(
            statusX - textWidth / 2 - 4,
            statusY - textHeight - 2,
            textWidth + 8,
            textHeight + 4
          );
          
          // Draw white text
          ctx.fillStyle = '#ffffff';
          ctx.fillText(statusText, statusX, statusY);
        }
      }
    });
  }, []);

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
  const processedLogIds = useRef<Set<string>>(new Set());
  
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

      // Add particles for truly NEW logs only (never processed before)
      const currentLogs = logsRef.current;
      const trulyNewLogs = currentLogs.filter(log => !processedLogIds.current.has(log.id));
      
      trulyNewLogs.forEach(log => {
        // Mark this log as processed to ensure it's never shown again
        processedLogIds.current.add(log.id);
        
        // Create and add the particle
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

      // Draw horizontal lanes
      const laneHeight = canvas.height / 8;
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 1;
      for (let i = 1; i < 8; i++) {
        const y = i * laneHeight;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
      
      // Draw lane labels
      ctx.fillStyle = '#666666';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      const sampleUrls = ['/api/users', '/api/products', '/api/orders', '/dashboard', '/login', '/api/analytics', '/static/css', '/api/reports'];
      for (let i = 0; i < 8; i++) {
        const y = (i * laneHeight) + (laneHeight / 2) + 3;
        ctx.fillText(sampleUrls[i] || `/lane-${i}`, 10, y);
      }

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

      // Draw status boxes on top of everything
      drawStatusBoxes(ctx);
      

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [createParticle, updateParticle, drawParticle, drawStatusBoxes]); // Removed 'logs' dependency

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