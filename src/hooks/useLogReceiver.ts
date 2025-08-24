import { useEffect, useCallback, useRef, useState } from 'react';
import { LogEntry } from '@/types/log';
import { parseApacheLog } from '@/utils/logGenerator';
import { LogWebSocketClient, getDefaultWebSocketUrl } from '@/utils/websocketClient';
import { AzionLogClient } from '@/utils/azionLogClient';

interface LogReceiverProps {
  onNewLog: (log: LogEntry) => void;
  websocketUrl?: string;
  enableWebSocket?: boolean;
  useAzionEndpoint?: boolean;
}

export const useLogReceiver = ({ 
  onNewLog, 
  websocketUrl, 
  enableWebSocket = true,
  useAzionEndpoint = true
}: LogReceiverProps) => {
  const wsClientRef = useRef<LogWebSocketClient | null>(null);
  const azionClientRef = useRef<AzionLogClient | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');

  // Legacy handler for mock endpoint (fallback)
  const handleLogSubmission = useCallback(async (event: Event) => {
    if (!(event instanceof CustomEvent)) return;
    
    const { logData } = event.detail;
    if (!logData) return;

    // Parse multiple log lines if they exist
    const logLines = logData.split('\n').filter((line: string) => line.trim());
    
    for (const logLine of logLines) {
      const parsedLog = parseApacheLog(logLine.trim());
      if (parsedLog) {
        onNewLog(parsedLog);
      }
    }
  }, [onNewLog]);

  useEffect(() => {
    // Priority 1: Use Azion Edge Function endpoint (default for production)
    if (useAzionEndpoint) {
      const azionClient = new AzionLogClient({
        baseUrl: window.location.origin
      });

      azionClientRef.current = azionClient;

      // Set up log listener
      const unsubscribeLog = azionClient.onLog(onNewLog);

      // Set up status listener  
      const unsubscribeStatus = azionClient.onStatus(setConnectionStatus);

      // Test connection and set status
      azionClient.testConnection().then(connected => {
        setConnectionStatus(connected ? 'connected' : 'error');
      });

      return () => {
        unsubscribeLog();
        unsubscribeStatus();
        azionClientRef.current = null;
      };
    }

    // Priority 2: Use WebSocket if Azion endpoint is disabled
    if (enableWebSocket) {
      const wsUrl = websocketUrl || getDefaultWebSocketUrl();
      const wsClient = new LogWebSocketClient({
        url: wsUrl,
        reconnectInterval: 3000,
        maxReconnectAttempts: 10
      });

      wsClientRef.current = wsClient;

      // Set up log listener
      const unsubscribeLog = wsClient.onLog(onNewLog);

      // Set up status listener
      const unsubscribeStatus = wsClient.onStatus(setConnectionStatus);

      // Connect to WebSocket
      wsClient.connect().catch(error => {
        console.error('Failed to connect to WebSocket:', error);
        setConnectionStatus('error');
      });

      // Cleanup
      return () => {
        unsubscribeLog();
        unsubscribeStatus();
        wsClient.disconnect();
        wsClientRef.current = null;
      };
    }

    // Priority 3: Fall back to legacy mock endpoint listener
    window.addEventListener('newLogReceived', handleLogSubmission);
    setConnectionStatus('connected');
    
    return () => {
      window.removeEventListener('newLogReceived', handleLogSubmission);
    };
  }, [onNewLog, websocketUrl, enableWebSocket, useAzionEndpoint, handleLogSubmission]);

  // Return connection utilities
  return {
    connectionStatus,
    isConnected: wsClientRef.current?.isConnected() || false,
    reconnect: () => wsClientRef.current?.connect(),
    disconnect: () => wsClientRef.current?.disconnect()
  };
};