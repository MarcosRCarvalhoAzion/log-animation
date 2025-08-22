export interface LogEntry {
  id: string;
  ip: string;
  timestamp: Date;
  method: string;
  url: string;
  statusCode: number;
  userAgent: string;
  responseTime?: number;
  bytes?: number;
}

export interface LogParticle {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  color: string;
  size: number;
  speed: number;
  log: LogEntry;
  trail: Array<{ x: number; y: number; opacity: number }>;
  isAlive: boolean;
  glowIntensity: number;
  phase: 'moving' | 'blocked' | 'exploding';
  laneIndex: number;
  showingStatus: boolean;
  statusDisplayTime: number;
  statusStickX: number;
  statusStartY: number;
  statusCurrentY: number;
  hasShownStatus: boolean;
}

export interface FeedGlow {
  id: string;
  x: number;
  y: number;
  startY: number;
  targetY: number;
  opacity: number;
  size: number;
  color: string;
  speed: number;
  isAlive: boolean;
  progress: number;
  startTime: number;
}

export interface LogStats {
  totalRequests: number;
  statusCounts: {
    '2xx': number;
    '3xx': number;
    '4xx': number;
    '5xx': number;
  };
  requestsPerSecond: number;
  topIPs: Array<{ ip: string; count: number }>;
  topUrls: Array<{ url: string; count: number }>;
}