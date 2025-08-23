import { LogEntry } from '@/types/log';
import { getThemeStatusColor } from '@/utils/themes';
import { useMemo, useEffect, useState, useRef } from 'react';

interface LogTaillogProps {
  logs: LogEntry[];
  theme?: string;
  hoveredLogId?: string | null;
  onLogClick?: (log: LogEntry) => void;
}

export const LogTaillog = ({ logs, theme = 'azion', hoveredLogId, onLogClick }: LogTaillogProps) => {
  const maxEntries = 100;
  const [displayedLogs, setDisplayedLogs] = useState<LogEntry[]>([]);
  const [newLogIds, setNewLogIds] = useState<Set<string>>(new Set());
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set());
  const prevLogsLength = useRef(0);
  const logsRef = useRef<LogEntry[]>([]);
  
  // Keep logs ref updated
  useEffect(() => {
    logsRef.current = logs;
  }, [logs]);

  // Simple 1-second interval update
  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayedLogs([...logsRef.current]);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Initialize on mount
  useEffect(() => {
    setDisplayedLogs([...logs]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Get the most recent log entries
  const recentLogs = useMemo(() => {
    return displayedLogs
      .slice(-maxEntries)
      .reverse(); // Show newest first
  }, [displayedLogs]);

  // Track new entries for staggered fade-in animation
  useEffect(() => {
    if (displayedLogs.length > prevLogsLength.current && prevLogsLength.current > 0) {
      const newEntries = displayedLogs.slice(prevLogsLength.current);
      const newIds = new Set(newEntries.map(log => log.id));
      
      if (newIds.size > 0) {
        setNewLogIds(newIds);
        setAnimatingIds(prev => new Set([...prev, ...newIds]));
        
        // Stagger animations for multiple entries
        newEntries.forEach((_, index) => {
          setTimeout(() => {
            // Remove from animating set after animation completes
            setTimeout(() => {
              setAnimatingIds(prev => {
                const updated = new Set(prev);
                newEntries.slice(index, index + 1).forEach(entry => updated.delete(entry.id));
                return updated;
              });
            }, 800);
          }, index * 100); // 100ms stagger between entries
        });
        
        // Clear new IDs after all animations start
        setTimeout(() => {
          setNewLogIds(new Set());
        }, newEntries.length * 100 + 100);
      }
    }
    prevLogsLength.current = displayedLogs.length;
  }, [displayedLogs]);

  const getStatusColorClass = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) return 'text-glow-success';
    if (statusCode >= 300 && statusCode < 400) return 'text-glow-redirect';
    if (statusCode >= 400 && statusCode < 500) return 'text-glow-error';
    if (statusCode >= 500) return 'text-glow-server-error';
    return 'text-glow-primary';
  };

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const truncateUrl = (url: string, maxLength: number = 25) => {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength - 3) + '...';
  };

  const truncateUserAgent = (userAgent: string, maxLength: number = 20) => {
    if (userAgent.length <= maxLength) return userAgent;
    return userAgent.substring(0, maxLength - 3) + '...';
  };

  // Find the highlighted log entry
  const highlightedLog = hoveredLogId ? recentLogs.find(log => log.id === hoveredLogId) : null;
  const filteredLogs = hoveredLogId ? recentLogs.filter(log => log.id !== hoveredLogId) : recentLogs;

  const renderLogEntry = (log: LogEntry, isPinned = false) => {
    const isNewEntry = newLogIds.has(log.id);
    const isAnimating = animatingIds.has(log.id);
    
    return (
      <div 
        key={log.id} 
        className={`flex items-center space-x-2 text-xs font-tech py-1 px-2 rounded transition-colors cursor-pointer ${
          isNewEntry && !isPinned
            ? 'animate-taillog-fade-in' 
            : ''
        } ${
          hoveredLogId === log.id 
            ? isPinned 
              ? 'bg-primary/30 border border-primary/60 shadow-lg shadow-primary/20' 
              : 'bg-primary/20 border border-primary/40'
            : 'hover:bg-primary/5'
        }`}
        onClick={() => onLogClick?.(log)}
      >
        {/* Timestamp */}
        <span className="text-glow-accent text-[10px] w-16 flex-shrink-0">
          {formatTime(log.timestamp)}
        </span>
        
        {/* Status indicator dot */}
        <div 
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ 
            backgroundColor: getThemeStatusColor(log.statusCode, theme),
            boxShadow: `0 0 4px ${getThemeStatusColor(log.statusCode, theme)}80`
          }}
        />
        
        {/* Method */}
        <span className="text-glow-primary font-orbitron text-[10px] w-10 flex-shrink-0">
          {log.method}
        </span>
        
        {/* Status Code */}
        <span className={`${getStatusColorClass(log.statusCode)} font-orbitron text-[10px] w-6 flex-shrink-0`}>
          {log.statusCode}
        </span>
        
        {/* IP */}
        <span className="text-foreground/60 text-[10px] w-16 flex-shrink-0 truncate">
          {log.ip}
        </span>
        
        {/* User Agent */}
        <span className="text-foreground/70 text-[10px] w-20 flex-shrink-0 truncate">
          {truncateUserAgent(log.userAgent)}
        </span>
        
        {/* URL */}
        <span className="text-foreground/80 text-[10px] flex-1 truncate">
          {truncateUrl(log.url, 20)}
        </span>
      </div>
    );
  };

  return (
    <div className="bg-card/30 border border-primary/20 rounded-lg p-4 backdrop-blur-sm flex flex-col h-full">
      <h2 className="font-orbitron text-lg text-glow-primary mb-4 flex-shrink-0">Taillog</h2>
      
      {/* Pinned highlighted entry */}
      {highlightedLog && (
        <div className="mb-2 border-b border-primary/30 pb-2 flex-shrink-0">
          <div className="text-xs font-tech text-glow-accent mb-1 flex items-center">
            <span className="w-2 h-2 bg-primary rounded-full mr-2 animate-pulse"></span>
            Highlighted Entry
          </div>
          {renderLogEntry(highlightedLog, true)}
        </div>
      )}
      
      <div className="space-y-1 flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-primary/20">
        {filteredLogs.length === 0 ? (
          <div className="text-muted-foreground text-sm font-tech text-center py-4">
            {highlightedLog ? 'Other entries...' : 'No log entries yet...'}
          </div>
        ) : (
          filteredLogs.map((log) => renderLogEntry(log))
        )}
      </div>
      
      {/* Footer info */}
      <div className="mt-3 pt-2 border-t border-primary/10 flex-shrink-0">
        <div className="text-xs font-tech text-muted-foreground">
          Showing last {Math.min(recentLogs.length, maxEntries)} entries • Real-time
        </div>
      </div>
    </div>
  );
};
