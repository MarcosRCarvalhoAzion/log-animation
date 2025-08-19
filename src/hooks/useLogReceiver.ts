import { useEffect, useCallback } from 'react';
import { LogEntry } from '@/types/log';
import { parseApacheLog } from '@/utils/logGenerator';

interface LogReceiverProps {
  onNewLog: (log: LogEntry) => void;
}

export const useLogReceiver = ({ onNewLog }: LogReceiverProps) => {
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
    // Listen for custom log events
    window.addEventListener('newLogReceived', handleLogSubmission);
    
    return () => {
      window.removeEventListener('newLogReceived', handleLogSubmission);
    };
  }, [handleLogSubmission]);

  return null;
};