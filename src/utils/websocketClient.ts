import { LogEntry } from '@/types/log';
import { parseApacheLog } from './logGenerator';

export interface WebSocketConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  protocols?: string[];
}

export class LogWebSocketClient {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private listeners: Set<(log: LogEntry) => void> = new Set();
  private statusListeners: Set<(status: 'connecting' | 'connected' | 'disconnected' | 'error') => void> = new Set();

  constructor(config: WebSocketConfig) {
    this.config = {
      reconnectInterval: 3000,
      maxReconnectAttempts: 10,
      protocols: [],
      ...config
    };
  }

  connect(): Promise<void> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.CONNECTING)) {
      return Promise.resolve();
    }

    this.isConnecting = true;
    this.notifyStatusListeners('connecting');

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.url, this.config.protocols);

        this.ws.onopen = () => {
          console.log('WebSocket connected to:', this.config.url);
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.notifyStatusListeners('connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          this.isConnecting = false;
          this.notifyStatusListeners('disconnected');
          this.scheduleReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          this.notifyStatusListeners('error');
          reject(error);
        };

      } catch (error) {
        this.isConnecting = false;
        this.notifyStatusListeners('error');
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.reconnectAttempts = 0;
    this.isConnecting = false;
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.config.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1);
    
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  private handleMessage(data: string): void {
    try {
      // Try to parse as JSON first (for structured log data)
      let logData: any;
      try {
        logData = JSON.parse(data);
      } catch {
        // If not JSON, treat as raw log line
        logData = { logLine: data };
      }

      // Handle different message formats
      if (logData.type === 'log' && logData.data) {
        // Structured message: { type: 'log', data: { ... } }
        this.processLogData(logData.data);
      } else if (logData.logLine) {
        // Raw log line: { logLine: "..." } or just a string
        this.processLogLine(logData.logLine);
      } else if (typeof logData === 'string') {
        // Direct log line
        this.processLogLine(logData);
      } else if (logData.logs && Array.isArray(logData.logs)) {
        // Batch of logs: { logs: [...] }
        logData.logs.forEach((log: any) => this.processLogData(log));
      } else {
        // Try to process as direct log data
        this.processLogData(logData);
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error, data);
    }
  }

  private processLogData(logData: any): void {
    // Convert structured data to LogEntry
    const logEntry: LogEntry = {
      id: logData.id || `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ip: logData.ip || logData.clientIp || logData.remote_addr || '0.0.0.0',
      timestamp: logData.timestamp ? new Date(logData.timestamp) : new Date(),
      method: logData.method || logData.request_method || 'GET',
      url: logData.url || logData.path || logData.request_uri || '/',
      statusCode: logData.statusCode || logData.status || logData.response_status || 200,
      userAgent: logData.userAgent || logData.user_agent || logData.http_user_agent || '',
      responseTime: logData.responseTime || logData.response_time || logData.duration,
      bytes: logData.bytes || logData.response_size || logData.body_bytes_sent
    };

    this.notifyListeners(logEntry);
  }

  private processLogLine(logLine: string): void {
    // Parse Apache/Nginx log format
    const parsedLog = parseApacheLog(logLine);
    if (parsedLog) {
      this.notifyListeners(parsedLog);
    } else {
      // If parsing fails, create a basic log entry
      const basicLog: LogEntry = {
        id: `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ip: '0.0.0.0',
        timestamp: new Date(),
        method: 'GET',
        url: '/',
        statusCode: 200,
        userAgent: logLine.substring(0, 100) // Use part of log line as user agent
      };
      this.notifyListeners(basicLog);
    }
  }

  private notifyListeners(log: LogEntry): void {
    this.listeners.forEach(listener => {
      try {
        listener(log);
      } catch (error) {
        console.error('Error in log listener:', error);
      }
    });
  }

  private notifyStatusListeners(status: 'connecting' | 'connected' | 'disconnected' | 'error'): void {
    this.statusListeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('Error in status listener:', error);
      }
    });
  }

  onLog(listener: (log: LogEntry) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onStatus(listener: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  getStatus(): 'connecting' | 'connected' | 'disconnected' | 'error' {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
      case WebSocket.CLOSED:
        return 'disconnected';
      default:
        return 'error';
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Default WebSocket URLs for different environments
export const DEFAULT_WEBSOCKET_URLS = {
  // Local development
  local: 'ws://localhost:8080/ws',
  
  // Popular WebSocket testing services
  echo: 'wss://echo.websocket.org',
  
  // Example production URLs (replace with your actual WebSocket server)
  production: 'wss://your-websocket-server.com/logs',
  staging: 'wss://staging-websocket-server.com/logs'
};

// Environment detection
export function getDefaultWebSocketUrl(): string {
  const hostname = window.location.hostname;
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return DEFAULT_WEBSOCKET_URLS.local;
  }
  
  // For Azion deployment, you'll need to configure your WebSocket server URL
  // This could be an environment variable or configuration
  return process.env.REACT_APP_WEBSOCKET_URL || DEFAULT_WEBSOCKET_URLS.echo;
}
