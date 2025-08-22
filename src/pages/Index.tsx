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
  const [totalRequestsGenerated, setTotalRequestsGenerated] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [frequency, setFrequency] = useState(2.0); // requests per second
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Setup log endpoint interceptor
  useEffect(() => {
    setupLogEndpoint();
  }, []);

  // Handle new logs from external sources
  const handleNewExternalLog = useCallback((newLog: LogEntry) => {
    setTotalRequestsGenerated(prev => prev + 1);
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
      setTotalRequestsGenerated(prev => prev + 1);
      setLogs(prev => {
        const updated = [...prev, newLog];
        // Keep only last 1000 logs for performance
        return updated.slice(-1000);
      });
    }, Math.max(50, 1000 / frequency)); // frequency controls requests per second

    return () => clearInterval(interval);
  }, [isRunning, frequency]);

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
      description: 'Animation speed updated'
    });
  }, []);

  const handleFrequencyChange = useCallback((newFrequency: number) => {
    setFrequency(newFrequency);
    toast(`Request frequency changed to ${newFrequency.toFixed(1)}/s`, {
      description: 'Log generation rate updated'
    });
  }, []);

  const handleClear = useCallback(() => {
    setLogs([]);
    setTotalRequestsGenerated(0);
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
    <div className="h-screen w-screen bg-background cyber-grid scan-lines relative overflow-hidden flex flex-col">
      {/* Compact Header */}
      <div className="relative z-10 border-b border-primary/20 bg-card/20 backdrop-blur-sm flex-shrink-0">
        <div className="px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-orbitron text-lg sm:text-2xl font-bold text-glow-primary">
                NEON LOG STREAM
              </h1>
              <p className="font-tech text-xs sm:text-sm text-glow-accent">
                Real-time HTTP log visualization • Logstalgia style
              </p>
            </div>
            <div className="hidden lg:block">
              <p className="font-tech text-xs text-glow-accent/70">
                Send logs: <code className="bg-primary/10 px-1 rounded">curl -X POST {window.location.origin}/logs -d "log_line"</code>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Full remaining height */}
      <div className="relative z-10 flex-1 flex overflow-hidden">
        {/* Canvas Area - Takes 70% of space */}
        <div className="w-[70%] bg-card/10 border-r border-primary/20 relative overflow-hidden">
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
                {isRunning ? 'LIVE' : 'PAUSED'} • {totalRequestsGenerated.toLocaleString()} requests
              </span>
            </div>
          </div>
        </div>

        {/* Sidebar - 30% of horizontal space, full height */}
        <div className="w-[30%] bg-background/50 backdrop-blur-sm border-l border-primary/20 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Controls */}
            <LogControls
              isRunning={isRunning}
              speed={speed}
              frequency={frequency}
              onToggleRunning={handleToggleRunning}
              onSpeedChange={handleSpeedChange}
              onFrequencyChange={handleFrequencyChange}
              onClear={handleClear}
            />

            {/* Stats */}
            <LogStatsComponent logs={logs} totalRequestsGenerated={totalRequestsGenerated} />
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
