import { LogEntry } from '@/types/log';
import { parseApacheLog } from './logGenerator';

export interface AzionLogClientConfig {
  baseUrl?: string;
  pollInterval?: number;
  enablePolling?: boolean;
}

export class AzionLogClient {
  private config: Required<AzionLogClientConfig>;
  private pollTimer: NodeJS.Timeout | null = null;
  private listeners: Set<(log: LogEntry) => void> = new Set();
  private statusListeners: Set<(status: 'connected' | 'disconnected' | 'error') => void> = new Set();
  private lastLogTimestamp: string = '';
  private isPolling = false;

  constructor(config: AzionLogClientConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || window.location.origin,
      pollInterval: config.pollInterval || 2000,
      enablePolling: config.enablePolling ?? true
    };

    // Listen for storage events from other tabs/windows
    this.setupStorageListener();
    
    // Setup the /logs endpoint interceptor for same-origin requests
    this.setupLogEndpointInterceptor();
  }

  private setupStorageListener(): void {
    // Listen for localStorage changes (cross-tab communication)
    window.addEventListener('storage', (event) => {
      if (event.key === 'azion_logs_received' && event.newValue) {
        try {
          const logData = JSON.parse(event.newValue);
          this.processReceivedLogs(logData.logs);
        } catch (error) {
          console.error('Error processing storage log event:', error);
        }
      }
    });

    // Listen for custom events in the same tab
    window.addEventListener('azion_logs_received', ((event: CustomEvent) => {
      if (event.detail && event.detail.logs) {
        this.processReceivedLogs(event.detail.logs);
      }
    }) as EventListener);
  }

  private setupLogEndpointInterceptor(): void {
    // Intercept fetch requests to /logs endpoint
    const originalFetch = window.fetch;
    
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();
      
      // Check if this is a POST to /logs
      if (url.includes('/logs') && init?.method === 'POST') {
        try {
          // Make the actual request to Azion Edge Function
          const response = await originalFetch(input, init);
          
          if (response.ok) {
            // Parse the response to get processed logs
            const responseData = await response.json();
            
            if (responseData.status === 'success' && responseData.logs) {
              // Process and broadcast the logs immediately
              this.processReceivedLogs(responseData.logs);
              
              // Store in localStorage for cross-tab communication
              localStorage.setItem('azion_logs_received', JSON.stringify({
                logs: responseData.logs,
                timestamp: new Date().toISOString()
              }));
              
              // Dispatch custom event for same-tab communication
              window.dispatchEvent(new CustomEvent('azion_logs_received', {
                detail: { logs: responseData.logs }
              }));
            }
          }
          
          return response;
        } catch (error) {
          console.error('Error intercepting /logs request:', error);
          this.notifyStatusListeners('error');
          return originalFetch(input, init);
        }
      }
      
      // For all other requests, use original fetch
      return originalFetch(input, init);
    };
  }

  private processReceivedLogs(logs: any[]): void {
    logs.forEach(logData => {
      const logEntry = this.normalizeLogEntry(logData);
      this.notifyListeners(logEntry);
    });
  }

  private normalizeLogEntry(logData: any): LogEntry {
    return {
      id: logData.id || `azion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ip: logData.ip || '0.0.0.0',
      timestamp: logData.timestamp ? new Date(logData.timestamp) : new Date(),
      method: logData.method || 'GET',
      url: logData.url || '/',
      statusCode: logData.statusCode || 200,
      userAgent: logData.userAgent || '',
      responseTime: logData.responseTime,
      bytes: logData.bytes
    };
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

  private notifyStatusListeners(status: 'connected' | 'disconnected' | 'error'): void {
    this.statusListeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('Error in status listener:', error);
      }
    });
  }

  // Public methods
  onLog(listener: (log: LogEntry) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onStatus(listener: (status: 'connected' | 'disconnected' | 'error') => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  // Send logs directly to the Edge Function
  async sendLog(logData: any): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(logData)
      });

      return response.ok;
    } catch (error) {
      console.error('Error sending log:', error);
      this.notifyStatusListeners('error');
      return false;
    }
  }

  // Send raw log line
  async sendRawLog(logLine: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain'
        },
        body: logLine
      });

      return response.ok;
    } catch (error) {
      console.error('Error sending raw log:', error);
      this.notifyStatusListeners('error');
      return false;
    }
  }

  getStatus(): 'connected' | 'disconnected' | 'error' {
    // Since we're using HTTP requests, we're always "connected" if the page is loaded
    return 'connected';
  }

  isConnected(): boolean {
    return true; // Always connected for HTTP-based communication
  }

  // Test the connection
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/logs/stream`, {
        method: 'GET'
      });
      return response.ok;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}
