import { useState, useEffect, useCallback } from 'react';
import { LogEntry } from '@/types/log';
import { generateRandomLog } from '@/utils/logGenerator';
import { LogCanvas } from '@/components/LogCanvas';
import { LogStatsComponent } from '@/components/LogStats';
import { LogControls } from '@/components/LogControls';
import { LogDetails } from '@/components/LogDetails';
import { useLogReceiver } from '@/hooks/useLogReceiver';
import { setupLogEndpoint } from '@/utils/logEndpoint';
import { toast } from 'sonner';

const Index = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Setup log endpoint interceptor
  useEffect(() => {
    setupLogEndpoint();
  }, []);

  // Handle new logs from external sources
  const handleNewExternalLog = useCallback((newLog: LogEntry) => {
    setLogs(prev => {
      const updated = [...prev, newLog];
      return updated.slice(-1000);
    });
    toast('External log received', {
      description: `${newLog.method} ${newLog.url} - ${newLog.statusCode}`
    });
  }, []);

  // Use log receiver hook
  useLogReceiver({ onNewLog: handleNewExternalLog });

  // Generate logs in real-time
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      const newLog = generateRandomLog();
      setLogs(prev => {
        const updated = [...prev, newLog];
        // Keep only last 1000 logs for performance
        return updated.slice(-1000);
      });
    }, Math.max(100, 1000 / speed)); // Faster speed = more frequent logs

    return () => clearInterval(interval);
  }, [isRunning, speed]);

  const handleToggleRunning = useCallback(() => {
    setIsRunning(prev => {
      const newState = !prev;
      toast(newState ? 'Log stream started' : 'Log stream paused', {
        description: newState ? 'Real-time logs are now flowing' : 'Log generation paused'
      });
      return newState;
    });
  }, []);

  const handleSpeedChange = useCallback((newSpeed: number) => {
    setSpeed(newSpeed);
    toast(`Speed changed to ${newSpeed.toFixed(1)}x`, {
      description: 'Log generation rate updated'
    });
  }, []);

  const handleClear = useCallback(() => {
    setLogs([]);
    toast('Logs cleared', {
      description: 'All log entries have been removed'
    });
  }, []);

  const handleParticleClick = useCallback((log: LogEntry) => {
    setSelectedLog(log);
    setIsDetailsOpen(true);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setIsDetailsOpen(false);
    setSelectedLog(null);
  }, []);

  return (
    <div className="min-h-screen bg-background cyber-grid scan-lines relative overflow-hidden">
      {/* Header */}
      <div className="relative z-10 border-b border-primary/20 bg-card/20 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <h1 className="font-orbitron text-3xl font-bold text-glow-primary">
            NEON LOG STREAM
          </h1>
          <p className="font-tech text-sm text-glow-accent mt-1">
            Real-time HTTP log visualization • Logstalgia style
          </p>
          <p className="font-tech text-xs text-glow-accent/70 mt-2">
            Send logs: <code className="bg-primary/10 px-1 rounded">curl -X POST {window.location.origin}/logs -d "log_line"</code>
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 py-6 h-[calc(100vh-100px)]">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
          {/* Canvas Area */}
          <div className="lg:col-span-3 bg-card/10 border border-primary/20 rounded-lg overflow-hidden relative">
            <LogCanvas 
              logs={logs} 
              speed={speed} 
              onParticleClick={handleParticleClick}
            />
            
            {/* Status overlay */}
            <div className="absolute top-4 right-4 bg-card/80 border border-primary/30 rounded-lg px-3 py-2 backdrop-blur-sm">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  isRunning ? 'bg-status-success glow-success' : 'bg-status-error glow-error'
                }`} />
                <span className="font-tech text-xs text-glow-primary">
                  {isRunning ? 'LIVE' : 'PAUSED'} • {logs.length} logs
                </span>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Controls */}
            <LogControls
              isRunning={isRunning}
              speed={speed}
              onToggleRunning={handleToggleRunning}
              onSpeedChange={handleSpeedChange}
              onClear={handleClear}
            />

            {/* Stats */}
            <LogStatsComponent logs={logs} />
          </div>
        </div>
      </div>

      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Animated scan line */}
        <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-primary to-transparent opacity-30 animate-scan-line" />
      </div>

      {/* Log Details Modal */}
      <LogDetails 
        log={selectedLog}
        isOpen={isDetailsOpen}
        onClose={handleCloseDetails}
      />
    </div>
  );
};

export default Index;
