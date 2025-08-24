import { useState, useEffect, useCallback } from 'react';
import { LogEntry } from '../types/log';
import { generateRandomLog } from '../utils/logGenerator';
import { LogCanvas } from '../components/LogCanvas';
import { LogControls } from '../components/LogControls';
import { LogDetails } from '../components/LogDetails';
import { useLogReceiver } from '../hooks/useLogReceiver';
import { setupLogEndpoint } from '../utils/logEndpoint';
import { toast } from 'sonner';
import { getThemeStatusColor } from '../utils/themes';
import { LogStatsComponent } from '../components/LogStats';
import { LogTaillog } from '../components/LogTaillog';
import { ConnectionStatus } from '../components/ConnectionStatus';

const Index = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [totalRequestsGenerated, setTotalRequestsGenerated] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [frequency, setFrequency] = useState(2.0); // requests per second
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [theme, setTheme] = useState<'azion' | 'blue'>('azion');
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [websocketUrl, setWebsocketUrl] = useState<string>('');
  const [enableWebSocket, setEnableWebSocket] = useState<boolean>(true);

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
    toast('Log received', {
      description: `${newLog.method} ${newLog.url} - ${newLog.statusCode}`
    });
  }, []);

  // Use log receiver hook with Azion Edge Function support
  const logReceiver = useLogReceiver({ 
    onNewLog: handleNewExternalLog,
    websocketUrl: websocketUrl || undefined,
    enableWebSocket,
    useAzionEndpoint: true // Enable Azion Edge Function by default
  });

  // Generate logs in real-time (only when WebSocket is disabled)
  useEffect(() => {
    if (!isRunning || enableWebSocket) return;

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
  }, [isRunning, frequency, enableWebSocket]);

  const handleToggleRunning = useCallback(() => {
    setIsRunning(prev => {
      const newState = !prev;
      const mode = enableWebSocket ? 'WebSocket' : 'Mock';
      toast(newState ? `${mode} log stream started` : `${mode} log stream paused`, {
        description: newState 
          ? (enableWebSocket ? 'Waiting for WebSocket logs...' : 'Generating mock logs') 
          : 'Log processing paused'
      });
      return newState;
    });
  }, [enableWebSocket]);

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
    // Reset all application state
    setLogs([]);
    setTotalRequestsGenerated(0);
    setSelectedLog(null);
    setSelectedLogId(null);
    setIsDetailsOpen(false);
    
    // Stop the log stream
    setIsRunning(false);
    
    // Reset canvas counters (BLOCKED/PASSED)
    if ((window as unknown as { resetCanvasCounters?: () => void }).resetCanvasCounters) {
      (window as unknown as { resetCanvasCounters?: () => void }).resetCanvasCounters!();
    }
    
    toast('Application reset', {
      description: 'All logs, counters, and selections have been cleared'
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

  const handleLogSelect = useCallback((logId: string | null) => {
    setSelectedLogId(logId);
  }, []);

  const handleTaillogClick = useCallback((log: LogEntry) => {
    if (selectedLogId === log.id) {
      // Second click - open details
      setSelectedLog(log);
      setIsDetailsOpen(true);
      setSelectedLogId(null); // Clear selection after opening details
    } else {
      // First click - select/highlight
      setSelectedLogId(log.id);
    }
  }, [selectedLogId]);

  return (
    <div className="h-screen w-screen bg-background cyber-grid scan-lines relative overflow-hidden flex flex-col p-4 gap-4" data-theme={theme}>
      {/* Compact Header */}
      <div className="relative z-10 border-b border-primary/20 bg-card/20 backdrop-blur-sm flex-shrink-0 rounded-lg">
        <div className="px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-orbitron text-lg sm:text-2xl font-bold text-glow-primary">
                NEON LOG STREAM
              </h1>
              <p className="font-tech text-xs sm:text-sm text-glow-accent">
                Real-time HTTP log visualization • Logstalgia style
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Theme Selector */}
              <div className="flex items-center gap-2">
                <span className="font-tech text-xs text-glow-accent/70">Theme:</span>
                <select 
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as 'azion' | 'blue')}
                  className="bg-card/50 border border-primary/20 rounded px-2 py-1 text-xs font-tech text-foreground focus:outline-none focus:border-primary/50"
                >
                  <option value="azion">Azion</option>
                  <option value="blue">Blue</option>
                </select>
              </div>
              {/* Connection Status */}
              <div className="flex items-center gap-4">
                <ConnectionStatus 
                  status={logReceiver.connectionStatus}
                  onReconnect={logReceiver.reconnect}
                  websocketUrl={websocketUrl}
                />
                <div className="hidden lg:block">
                  <p className="font-tech text-xs text-glow-accent/70">
                    {enableWebSocket ? 'WebSocket Mode' : 'Mock Mode'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Full remaining height */}
      <div className="relative z-10 flex-1 flex overflow-hidden rounded-lg border border-primary/20">
        {/* Canvas Area - Takes 70% of space */}
        <div className="w-[70%] bg-card/10 border-r border-primary/20 relative overflow-hidden">
          <LogCanvas 
            logs={logs}
            speed={speed}
            onParticleClick={handleParticleClick}
            onParticleHover={handleLogSelect}
            hoveredLogId={selectedLogId}
            theme={theme}
            onClear={handleClear}
          />
          
          {/* Status overlay */}
          <div className="absolute top-4 right-4 bg-card/80 border border-primary/30 rounded-lg px-3 py-2 backdrop-blur-sm">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                isRunning ? (enableWebSocket ? 
                  (logReceiver.connectionStatus === 'connected' ? 'bg-status-success glow-success' : 'bg-yellow-500 glow-warning') 
                  : 'bg-status-success glow-success') 
                : 'bg-status-error glow-error'
              }`} />
              <span className="font-tech text-xs text-glow-primary">
                {isRunning ? (enableWebSocket ? 
                  (logReceiver.connectionStatus === 'connected' ? 'WEBSOCKET LIVE' : 'WAITING...') 
                  : 'MOCK LIVE') 
                : 'PAUSED'} • {totalRequestsGenerated.toLocaleString()} requests
              </span>
            </div>
          </div>
        </div>

        {/* Sidebar - 30% of horizontal space, full height */}
        <div className="w-[30%] bg-background/50 backdrop-blur-sm border-l border-primary/20 flex flex-col">
          <div className="flex-1 overflow-hidden p-4 flex flex-col gap-4">
            {/* WebSocket Configuration */}
            <div className="flex-shrink-0 bg-card/20 border border-primary/20 rounded-lg p-3">
              <h3 className="font-tech text-sm text-glow-primary mb-2">Connection Settings</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="enableWebSocket"
                    checked={enableWebSocket}
                    onChange={(e) => setEnableWebSocket(e.target.checked)}
                    className="accent-primary"
                  />
                  <label htmlFor="enableWebSocket" className="font-tech text-xs text-glow-accent">
                    Enable WebSocket
                  </label>
                </div>
                {enableWebSocket && (
                  <input
                    type="text"
                    placeholder="ws://localhost:8080/ws or wss://your-server.com/logs"
                    value={websocketUrl}
                    onChange={(e) => setWebsocketUrl(e.target.value)}
                    className="w-full bg-card/50 border border-primary/20 rounded px-2 py-1 text-xs font-tech text-foreground focus:outline-none focus:border-primary/50"
                  />
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="flex-shrink-0">
              <LogControls
                isRunning={isRunning}
                speed={speed}
                frequency={frequency}
                onToggleRunning={handleToggleRunning}
                onSpeedChange={handleSpeedChange}
                onFrequencyChange={handleFrequencyChange}
                onClear={handleClear}
                theme={theme}
              />
            </div>

            {/* Stats */}
            <div className="flex-shrink-0">
              <LogStatsComponent logs={logs} totalRequestsGenerated={totalRequestsGenerated} />
            </div>

            {/* Taillog - Limited height */}
            <div className="flex-1 min-h-0 max-h-96">
              <LogTaillog 
                logs={logs} 
                theme={theme} 
                hoveredLogId={selectedLogId}
                onLogClick={handleTaillogClick}
              />
            </div>
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
