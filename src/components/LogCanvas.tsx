import { useEffect, useRef, useState, useCallback } from 'react';
import { LogEntry, LogParticle, FeedGlow } from '../types/log';
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
  const hoveredParticleRef = useRef<LogParticle | null>(null);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const stickyHoverInfoRef = useRef<{ particle: LogParticle; position: { x: number; y: number } } | null>(null);
  const speedRef = useRef(speed);
  const [renderTrigger, setRenderTrigger] = useState(0);

  // Update speed ref when speed prop changes
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

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

    // Calculate lane position with randomization
    const laneIndex = getUrlLane(log.url);
    const laneHeight = canvas.height / 8;
    const laneTop = laneIndex * laneHeight;
    const laneBottom = (laneIndex + 1) * laneHeight;
    
    // Add padding to keep particles away from lane edges
    const lanePadding = 8;
    const minY = laneTop + lanePadding;
    const maxY = laneBottom - lanePadding;
    
    // Randomize Y position within lane boundaries
    const randomY = minY + Math.random() * (maxY - minY);

    // Logstalgia style: start from left, move right
    const startX = -20;
    const startY = randomY;
    const barrierX = canvas.width / 2;
    const targetX = log.statusCode < 400 ? canvas.width + 20 : barrierX;
    const targetY = startY; // Keep same Y level throughout journey
    
    return {
      id: log.id,
      x: startX,
      y: startY,
      targetX,
      targetY,
      color: '#888888', // Start with neutral color
      size: Math.random() * 3 + 4,
      speed: (Math.random() * 2 + 3) * speedRef.current,
      log,
      trail: [],
      isAlive: true,
      glowIntensity: Math.random() * 0.5 + 0.5,
      phase: 'moving' as 'moving' | 'blocked' | 'exploding',
      laneIndex,
      showingStatus: false,
      statusDisplayTime: 0,
      statusStickX: 0,
      statusStartY: 0,
      statusCurrentY: 0,
      hasShownStatus: false
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
    
    // Move horizontally (left to right) - apply current speed multiplier
    particle.x += particle.speed * speedRef.current * deltaTime * 100;
    
    // Check if particle has reached the barrier
    const hasReachedBarrier = particle.x >= barrierX && particle.phase === 'moving';
    
    // Show status when particle actually hits the barrier (only once)
    if (hasReachedBarrier && !particle.hasShownStatus) {
      particle.color = getStatusColor(particle.log.statusCode);
      particle.showingStatus = true;
      particle.statusDisplayTime = 1.0; // Show for 1 second
      particle.statusStickX = barrierX; // Stick to barrier center
      particle.statusStartY = particle.y - particle.size - 8;
      particle.statusCurrentY = particle.statusStartY;
      particle.hasShownStatus = true; // Mark as shown to prevent re-triggering
    }
    
    // Update status display timer and position
    if (particle.showingStatus) {
      particle.statusDisplayTime -= deltaTime;
      // Slide up like a damage indicator
      particle.statusCurrentY -= 30 * deltaTime; // Move up 30 pixels per second
      
      if (particle.statusDisplayTime <= 0) {
        particle.showingStatus = false;
      }
    }
    
    // Remove the duplicate status display logic for exploding particles
    // Status is already shown once when particle reaches barrier
    
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
        
        // Create laser beam glow animation (don't increment counter yet)
        const feedGlow: FeedGlow = {
          id: `feed-${Date.now()}-${Math.random()}`,
          x: barrierX,
          y: particle.y,
          startY: particle.y,
          targetY: 30,
          opacity: 0,
          size: 4,
          color: getStatusColor(particle.log.statusCode),
          speed: 1500, // much faster - pixels per second
          isAlive: true,
          progress: 0,
          startTime: Date.now()
        };
        feedGlows.current.push(feedGlow);
        return;
      } else {
        // Success - continue through barrier
        particle.phase = 'blocked';
      }
    }
    
    // Remove particle when it goes off screen
    if (particle.x > canvas.width + 50) {
      if (particle.phase === 'blocked') {
        passedCount.current += 1;
      }
      particle.isAlive = false;
    }
  }, []);

  const updateFeedGlow = useCallback((glow: FeedGlow, deltaTime: number) => {
    const currentTime = Date.now();
    const elapsed = (currentTime - glow.startTime) / 1000; // seconds
    const totalDistance = glow.startY - glow.targetY;
    const duration = totalDistance / glow.speed; // total animation duration
    
    // Calculate progress (0 to 1)
    glow.progress = Math.min(elapsed / duration, 1);
    
    // Smooth easing function (ease-out-cubic)
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    const easedProgress = easeOutCubic(glow.progress);
    
    // Update position with smooth easing
    glow.y = glow.startY - (totalDistance * easedProgress);
    
    // Smooth opacity transitions
    if (glow.progress < 0.1) {
      // Fade in during first 10% of journey
      glow.opacity = glow.progress / 0.1;
    } else if (glow.progress > 0.9) {
      // Fade out during last 10% of journey
      glow.opacity = (1 - glow.progress) / 0.1;
    } else {
      // Full opacity in middle
      glow.opacity = 1;
    }
    
    // Increment counter and remove when reached target
    if (glow.progress >= 1) {
      blockedCount.current += 1;
      glow.isAlive = false;
    }
  }, []);

  const drawFeedGlow = useCallback((ctx: CanvasRenderingContext2D, glow: FeedGlow) => {
    const alpha = Math.floor(Math.max(0, Math.min(255, glow.opacity * 255))).toString(16).padStart(2, '0');
    const trailLength = 60;
    
    // Save context for glow effects
    ctx.save();
    
    // Outer glow halo
    const haloGradient = ctx.createRadialGradient(
      glow.x, glow.y, 0,
      glow.x, glow.y, glow.size * 4
    );
    haloGradient.addColorStop(0, glow.color + Math.floor(Math.max(0, Math.min(255, glow.opacity * 0.8 * 255))).toString(16).padStart(2, '0'));
    haloGradient.addColorStop(0.3, glow.color + Math.floor(Math.max(0, Math.min(255, glow.opacity * 0.4 * 255))).toString(16).padStart(2, '0'));
    haloGradient.addColorStop(1, glow.color + '00');
    
    ctx.fillStyle = haloGradient;
    ctx.beginPath();
    ctx.arc(glow.x, glow.y, glow.size * 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Main beam body with realistic falloff
    const beamGradient = ctx.createLinearGradient(
      glow.x, glow.y + trailLength,
      glow.x, glow.y
    );
    beamGradient.addColorStop(0, glow.color + '00');
    beamGradient.addColorStop(0.3, glow.color + Math.floor(Math.max(0, Math.min(255, glow.opacity * 0.2 * 255))).toString(16).padStart(2, '0'));
    beamGradient.addColorStop(0.8, glow.color + Math.floor(Math.max(0, Math.min(255, glow.opacity * 0.7 * 255))).toString(16).padStart(2, '0'));
    beamGradient.addColorStop(1, glow.color + alpha);
    
    // Draw main beam with glow
    ctx.shadowColor = glow.color;
    ctx.shadowBlur = glow.size * 2;
    ctx.strokeStyle = glow.color + alpha;
    ctx.lineWidth = glow.size;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(glow.x, glow.y + trailLength);
    ctx.lineTo(glow.x, glow.y);
    ctx.stroke();
    
    // Intense core beam (colored, not white)
    ctx.shadowBlur = glow.size;
    ctx.strokeStyle = glow.color + Math.floor(Math.max(0, Math.min(255, glow.opacity * 0.9 * 255))).toString(16).padStart(2, '0');
    ctx.lineWidth = glow.size * 0.3;
    ctx.beginPath();
    ctx.moveTo(glow.x, glow.y + trailLength * 0.7);
    ctx.lineTo(glow.x, glow.y);
    ctx.stroke();
    
    // Bright leading point with bloom
    ctx.shadowBlur = glow.size * 1.5;
    ctx.shadowColor = glow.color;
    ctx.fillStyle = glow.color + alpha;
    ctx.beginPath();
    ctx.arc(glow.x, glow.y, glow.size * 0.8, 0, Math.PI * 2);
    ctx.fill();
    
    // Inner core point
    ctx.shadowBlur = 0;
    ctx.fillStyle = glow.color + alpha;
    ctx.beginPath();
    ctx.arc(glow.x, glow.y, glow.size * 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }, []);

  const drawParticle = useCallback((ctx: CanvasRenderingContext2D, particle: LogParticle) => {
    // Calculate opacity based on phase
    const opacity = particle.phase === 'exploding' ? particle.glowIntensity : 1;
    
    // Draw trail
    particle.trail.forEach((point, index) => {
      if (index < particle.trail.length - 1) {
        const nextPoint = particle.trail[index + 1];
        const trailOpacity = point.opacity * opacity;
        
        ctx.strokeStyle = particle.color + Math.floor(Math.max(0, Math.min(255, trailOpacity * 255))).toString(16).padStart(2, '0');
        ctx.lineWidth = particle.size * 0.3;
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        ctx.lineTo(nextPoint.x, nextPoint.y);
        ctx.stroke();
      }
    });

    // Draw glow effect with fade - larger explosion
    const glowSize = particle.size * (particle.phase === 'exploding' ? 6 : 3) * Math.max(particle.glowIntensity, 0.1);
    const gradient = ctx.createRadialGradient(
      particle.x, particle.y, 0,
      particle.x, particle.y, glowSize
    );
    
    const glowOpacity = Math.max(opacity * 0.8, 0);
    gradient.addColorStop(0, particle.color + Math.floor(Math.max(0, Math.min(255, glowOpacity * 255))).toString(16).padStart(2, '0'));
    gradient.addColorStop(0.5, particle.color + Math.floor(Math.max(0, Math.min(255, glowOpacity * 0.3 * 255))).toString(16).padStart(2, '0'));
    gradient.addColorStop(1, particle.color + '00');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, glowSize, 0, Math.PI * 2);
    ctx.fill();

    // Draw main particle with fade - enhanced explosion
    const mainOpacity = Math.max(opacity, 0);
    const particleSize = particle.phase === 'exploding' ? particle.size * 2 : particle.size;
    
    if (particle.phase === 'exploding') {
      // Multiple explosion rings for realistic effect
      for (let ring = 0; ring < 3; ring++) {
        const ringSize = particleSize * (1 + ring * 0.8) * particle.glowIntensity;
        const ringOpacity = mainOpacity * (1 - ring * 0.3);
        
        ctx.fillStyle = particle.color + Math.floor(Math.max(0, Math.min(255, ringOpacity * 255))).toString(16).padStart(2, '0');
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, ringSize, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Bright core explosion
      ctx.fillStyle = '#ffffff' + Math.floor(Math.max(0, Math.min(255, mainOpacity * 0.8 * 255))).toString(16).padStart(2, '0');
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particleSize * 0.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Normal particle
      ctx.fillStyle = particle.color + Math.floor(Math.max(0, Math.min(255, mainOpacity * 255))).toString(16).padStart(2, '0');
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particleSize, 0, Math.PI * 2);
      ctx.fill();
    }

    // Add extra glow for hovered particle or explosion
    if ((hoveredParticleRef.current?.id === particle.id || particle.phase === 'exploding') && opacity > 0.1) {
      const extraGlowSize = particle.phase === 'exploding' ? particleSize * 1.5 : particle.size + 2;
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = particle.phase === 'exploding' ? 40 : 20;
      ctx.fillStyle = particle.color + Math.floor(Math.max(0, Math.min(255, mainOpacity * 0.6 * 255))).toString(16).padStart(2, '0');
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, extraGlowSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Add visual feedback for hovered particle (pulsing ring)
    if (hoveredParticleRef.current?.id === particle.id && opacity > 0.1) {
      const time = Date.now() * 0.005;
      const pulseSize = particle.size + 8 + Math.sin(time) * 3;
      const pulseOpacity = 0.6 + Math.sin(time) * 0.3;
      
      ctx.strokeStyle = '#00ffff' + Math.floor(Math.max(0, Math.min(255, pulseOpacity * 255))).toString(16).padStart(2, '0');
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, pulseSize, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Add visual feedback for sticky hovered particle (static ring)
    if (stickyHoverInfoRef.current?.particle.id === particle.id && opacity > 0.1) {
      ctx.strokeStyle = '#00ffff80';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size + 6, 0, Math.PI * 2);
      ctx.stroke();
      
      // Add small dots around the particle
      const dotCount = 8;
      const dotRadius = particle.size + 10;
      for (let i = 0; i < dotCount; i++) {
        const angle = (i / dotCount) * Math.PI * 2;
        const dotX = particle.x + Math.cos(angle) * dotRadius;
        const dotY = particle.y + Math.sin(angle) * dotRadius;
        
        ctx.fillStyle = '#00ffff';
        ctx.beginPath();
        ctx.arc(dotX, dotY, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, []);

  // Separate function to draw status boxes on top
  const drawStatusBoxes = useCallback((ctx: CanvasRenderingContext2D) => {
    particlesRef.current.forEach(particle => {
      if (particle.showingStatus) {
        const opacity = 1; // Always show status at full opacity regardless of particle phase
        if (particle.statusDisplayTime > 0) {
          const statusText = particle.log.statusCode.toString();
          const statusX = particle.statusStickX;
          const statusY = particle.statusCurrentY;
          
          // Calculate fade opacity based on remaining time
          const fadeProgress = 1 - (particle.statusDisplayTime / 1.0);
          const fadeOpacity = Math.max(0, 1 - fadeProgress);
          
          // Measure text for background box
          ctx.font = '12px monospace';
          ctx.textAlign = 'center';
          const textMetrics = ctx.measureText(statusText);
          const textWidth = textMetrics.width;
          const textHeight = 12;
          
          // Draw black background box with fade
          const bgAlpha = Math.floor(Math.max(0, Math.min(255, fadeOpacity * 255))).toString(16).padStart(2, '0');
          ctx.fillStyle = '#000000' + bgAlpha;
          ctx.fillRect(
            statusX - textWidth / 2 - 4,
            statusY - textHeight - 2,
            textWidth + 8,
            textHeight + 4
          );
          
          // Draw white text with fade
          const textAlpha = Math.floor(Math.max(0, Math.min(255, fadeOpacity * 255))).toString(16).padStart(2, '0');
          ctx.fillStyle = '#ffffff' + textAlpha;
          ctx.fillText(statusText, statusX, statusY);
        }
      }
    });
  }, []);

  // Smart positioning function to avoid blocking particle path
  const getOptimalTooltipPosition = useCallback((particle: LogParticle, mouseX: number, mouseY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: mouseX + 10, y: mouseY - 60 };

    const rect = canvas.getBoundingClientRect();
    const tooltipWidth = 300;
    const tooltipHeight = 100;
    const margin = 20;
    
    // Particle's current lane and path
    const particleLaneY = particle.y;
    const particleStartX = -20;
    const particleEndX = particle.targetX;
    
    // Available positions (priority order)
    const positions = [
      // Above particle path
      { x: mouseX + 10, y: particleLaneY - tooltipHeight - margin, priority: 1 },
      // Below particle path
      { x: mouseX + 10, y: particleLaneY + margin, priority: 2 },
      // Left side (if particle hasn't passed)
      { x: Math.max(margin, particleStartX - tooltipWidth - margin), y: particleLaneY - tooltipHeight / 2, priority: 3 },
      // Right side (if space available)
      { x: Math.min(window.innerWidth - tooltipWidth - margin, particleEndX + margin), y: particleLaneY - tooltipHeight / 2, priority: 4 },
      // Top-left corner
      { x: margin, y: margin, priority: 5 },
      // Top-right corner
      { x: window.innerWidth - tooltipWidth - margin, y: margin, priority: 6 },
      // Bottom-left corner
      { x: margin, y: window.innerHeight - tooltipHeight - margin, priority: 7 },
      // Bottom-right corner
      { x: window.innerWidth - tooltipWidth - margin, y: window.innerHeight - tooltipHeight - margin, priority: 8 }
    ];
    
    // Filter positions that fit within viewport
    const validPositions = positions.filter(pos => 
      pos.x >= margin && 
      pos.x + tooltipWidth <= window.innerWidth - margin &&
      pos.y >= margin && 
      pos.y + tooltipHeight <= window.innerHeight - margin
    );
    
    // Return the highest priority valid position
    const bestPosition = validPositions.sort((a, b) => a.priority - b.priority)[0];
    return bestPosition || { x: mouseX + 10, y: mouseY - 60 };
  }, []);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    mousePosRef.current = { x: event.clientX, y: event.clientY };

    // Check for particle hover
    const hoveredParticle = particlesRef.current.find(particle => {
      const distance = Math.sqrt((particle.x - x) ** 2 + (particle.y - y) ** 2);
      return distance <= particle.size + 5;
    });

    hoveredParticleRef.current = hoveredParticle || null;
    
    // Update sticky hover info when hovering a new particle
    if (hoveredParticle && (!stickyHoverInfoRef.current || stickyHoverInfoRef.current.particle.id !== hoveredParticle.id)) {
      const optimalPos = getOptimalTooltipPosition(hoveredParticle, event.clientX, event.clientY);
      const newStickyInfo = {
        particle: hoveredParticle,
        position: optimalPos
      };
      stickyHoverInfoRef.current = newStickyInfo;
      setRenderTrigger(prev => prev + 1);
    }
  }, [getOptimalTooltipPosition]);

  const handleClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (hoveredParticleRef.current && onParticleClick) {
      // Store the log data immediately to avoid reference issues when particle vanishes
      const logData = { ...hoveredParticleRef.current.log };
      onParticleClick(logData);
    }
  }, [onParticleClick]);

  // Store logs in a ref to avoid useEffect dependency
  const logsRef = useRef<LogEntry[]>([]);
  const processedLogIds = useRef<Set<string>>(new Set());
  const blockedCount = useRef<number>(0);
  const passedCount = useRef<number>(0);
  const feedGlows = useRef<FeedGlow[]>([]);
  
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

      // Update particles
      particlesRef.current.forEach(particle => {
        updateParticle(particle, deltaTime);
      });
      
      // Update feed glows
      feedGlows.current.forEach(glow => {
        updateFeedGlow(glow, deltaTime);
      });
      
      // Check if sticky hover particle is still alive
      if (stickyHoverInfoRef.current && !particlesRef.current.find(p => p.id === stickyHoverInfoRef.current.particle.id)) {
        stickyHoverInfoRef.current = null;
        setRenderTrigger(prev => prev + 1);
      }
      
      // Remove dead particles and glows
      particlesRef.current = particlesRef.current.filter(p => p.isAlive);
      feedGlows.current = feedGlows.current.filter(g => g.isAlive);

      // Draw particles
      particlesRef.current.forEach(particle => {
        drawParticle(ctx, particle);
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

      // Draw feed glows on top of barrier
      feedGlows.current.forEach(glow => {
        drawFeedGlow(ctx, glow);
      });

      // Draw connecting line from sticky hover box to particle
      if (stickyHoverInfoRef.current) {
        const stickyParticle = particlesRef.current.find(p => p.id === stickyHoverInfoRef.current.particle.id);
        if (stickyParticle) {
          const rect = canvas.getBoundingClientRect();
          const boxX = stickyHoverInfoRef.current.position.x - rect.left;
          const boxY = stickyHoverInfoRef.current.position.y - rect.top;
          
          // Always connect from center of tooltip box
          const tooltipWidth = 300;
          const tooltipHeight = 100;
          const tooltipCenterX = boxX + tooltipWidth / 2;
          const tooltipCenterY = boxY + tooltipHeight / 2;
          
          ctx.strokeStyle = '#00ffff80';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(tooltipCenterX, tooltipCenterY);
          ctx.lineTo(stickyParticle.x, stickyParticle.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
      
      // Draw request counters
      const counterY = 30;
      
      // Blocked requests counter (above barrier) with background box
      const blockedText = `BLOCKED: ${blockedCount.current}`;
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      const blockedMetrics = ctx.measureText(blockedText);
      const blockedWidth = blockedMetrics.width;
      const blockedHeight = 16;
      
      // Draw black background box
      ctx.fillStyle = '#000000';
      ctx.fillRect(
        barrierX - blockedWidth / 2 - 8,
        counterY - blockedHeight - 4,
        blockedWidth + 16,
        blockedHeight + 8
      );
      
      // Draw red border
      ctx.strokeStyle = '#ff4444';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        barrierX - blockedWidth / 2 - 8,
        counterY - blockedHeight - 4,
        blockedWidth + 16,
        blockedHeight + 8
      );
      
      // Draw red text
      ctx.fillStyle = '#ff4444';
      ctx.fillText(blockedText, barrierX, counterY);
      
      // Passed requests counter (middle-right side)
      ctx.fillStyle = '#44ff44';
      ctx.textAlign = 'right';
      ctx.fillText(`PASSED: ${passedCount.current}`, canvas.width - 20, canvas.height / 2);
      
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
  }, []); // Remove all dependencies to prevent animation interruption

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        onMouseMove={handleMouseMove}
        onClick={handleClick}
      />
      
      {/* Sticky Hover Tooltip */}
      {stickyHoverInfoRef.current && (
        <div 
          className="fixed z-50 bg-card border border-primary/30 rounded-lg p-3 text-sm glow-primary shadow-lg"
          style={{
            left: stickyHoverInfoRef.current.position.x + 10,
            top: stickyHoverInfoRef.current.position.y - 60,
            maxWidth: '300px'
          }}
        >
          <div className="space-y-2">
            <div className="font-orbitron text-glow-primary font-bold">
              {stickyHoverInfoRef.current.particle.log.method} {stickyHoverInfoRef.current.particle.log.statusCode}
            </div>
            <div className="text-foreground/80">
              <span className="text-glow-accent">IP:</span> {stickyHoverInfoRef.current.particle.log.ip}
            </div>
            <div className="text-foreground/80">
              <span className="text-glow-accent">URL:</span> {stickyHoverInfoRef.current.particle.log.url}
            </div>
            <div className="text-foreground/80 text-xs">
              {stickyHoverInfoRef.current.particle.log.timestamp.toLocaleTimeString()}
            </div>
            <button
              onClick={() => onParticleClick && onParticleClick({ ...stickyHoverInfoRef.current!.particle.log })}
              className="w-full mt-2 px-3 py-1 bg-primary/20 hover:bg-primary/30 border border-primary/50 rounded text-xs font-medium text-primary transition-colors"
            >
              Show Details
            </button>
          </div>
        </div>
      )}
      
      {/* Regular Hover Tooltip (only when no sticky info) */}
      {hoveredParticleRef.current && !stickyHoverInfoRef.current && (
        <div 
          className="fixed z-50 bg-card border border-primary/30 rounded-lg p-3 text-sm glow-primary opacity-80"
          style={{
            left: mousePosRef.current.x + 10,
            top: mousePosRef.current.y - 60,
            maxWidth: '300px'
          }}
        >
          <div className="space-y-2">
            <div className="font-orbitron text-glow-primary font-bold">
              {hoveredParticleRef.current.log.method} {hoveredParticleRef.current.log.statusCode}
            </div>
            <div className="text-foreground/80">
              <span className="text-glow-accent">IP:</span> {hoveredParticleRef.current.log.ip}
            </div>
            <div className="text-foreground/80">
              <span className="text-glow-accent">URL:</span> {hoveredParticleRef.current.log.url}
            </div>
            <div className="text-foreground/80 text-xs">
              {hoveredParticleRef.current.log.timestamp.toLocaleTimeString()}
            </div>
            <button
              onClick={() => onParticleClick && onParticleClick({ ...hoveredParticleRef.current!.log })}
              className="w-full mt-2 px-3 py-1 bg-primary/20 hover:bg-primary/30 border border-primary/50 rounded text-xs font-medium text-primary transition-colors"
            >
              Show Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
};