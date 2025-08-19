import { LogEntry } from '@/types/log';

// Common IPs, URLs, and User Agents for realistic simulation
const SAMPLE_IPS = [
  '192.168.1.100', '10.0.0.45', '203.0.113.42', '198.51.100.23',
  '172.16.0.88', '192.168.0.15', '10.1.1.200', '203.0.113.195'
];

const SAMPLE_URLS = [
  '/api/users', '/api/products', '/api/orders', '/dashboard',
  '/login', '/logout', '/profile', '/settings', '/help',
  '/api/analytics', '/api/search', '/api/notifications',
  '/static/css/main.css', '/static/js/app.js', '/favicon.ico',
  '/api/upload', '/api/download', '/api/reports'
];

const SAMPLE_USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
  'Mozilla/5.0 (Android 11; Mobile; rv:91.0) Gecko/91.0'
];

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

const STATUS_CODES = [
  { code: 200, weight: 60 }, // Success - most common
  { code: 201, weight: 10 },
  { code: 204, weight: 5 },
  { code: 301, weight: 5 }, // Redirect
  { code: 302, weight: 3 },
  { code: 400, weight: 8 }, // Client error
  { code: 401, weight: 4 },
  { code: 403, weight: 2 },
  { code: 404, weight: 6 },
  { code: 422, weight: 1 },
  { code: 500, weight: 2 }, // Server error
  { code: 502, weight: 1 },
  { code: 503, weight: 1 }
];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getWeightedStatusCode(): number {
  const totalWeight = STATUS_CODES.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const item of STATUS_CODES) {
    random -= item.weight;
    if (random <= 0) {
      return item.code;
    }
  }
  
  return 200; // Fallback
}

export function generateRandomLog(): LogEntry {
  const id = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const ip = getRandomElement(SAMPLE_IPS);
  const method = getRandomElement(HTTP_METHODS);
  const url = getRandomElement(SAMPLE_URLS);
  const statusCode = getWeightedStatusCode();
  const userAgent = getRandomElement(SAMPLE_USER_AGENTS);
  const responseTime = Math.floor(Math.random() * 2000) + 10; // 10-2010ms
  const bytes = Math.floor(Math.random() * 50000) + 500; // 500-50500 bytes

  return {
    id,
    ip,
    timestamp: new Date(),
    method,
    url,
    statusCode,
    userAgent,
    responseTime,
    bytes
  };
}

export function parseApacheLog(logLine: string): LogEntry | null {
  // Apache Combined Log Format:
  // IP - - [timestamp] "METHOD URL HTTP/1.1" status bytes "referer" "user-agent"
  const logRegex = /^(\S+) \S+ \S+ \[([^\]]+)\] "(\S+) (\S+) \S+" (\d+) (\d+|-) "([^"]*)" "([^"]*)"/;
  
  const match = logLine.match(logRegex);
  if (!match) return null;

  const [, ip, timestamp, method, url, statusCode, bytes, , userAgent] = match;
  
  return {
    id: `parsed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ip,
    timestamp: new Date(timestamp),
    method,
    url,
    statusCode: parseInt(statusCode),
    userAgent,
    bytes: bytes === '-' ? undefined : parseInt(bytes)
  };
}

export function getStatusColor(statusCode: number): string {
  if (statusCode >= 200 && statusCode < 300) return 'hsl(var(--success))';
  if (statusCode >= 300 && statusCode < 400) return 'hsl(var(--redirect))';
  if (statusCode >= 400 && statusCode < 500) return 'hsl(var(--error))';
  if (statusCode >= 500) return 'hsl(var(--server-error))';
  return 'hsl(var(--foreground))';
}

export function getStatusColorClass(statusCode: number): string {
  if (statusCode >= 200 && statusCode < 300) return 'text-glow-success';
  if (statusCode >= 300 && statusCode < 400) return 'text-glow-redirect';
  if (statusCode >= 400 && statusCode < 500) return 'text-glow-error';
  if (statusCode >= 500) return 'text-glow-server-error';
  return 'text-glow-primary';
}