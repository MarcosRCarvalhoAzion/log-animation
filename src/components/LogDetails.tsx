import { LogEntry } from '@/types/log';
import { getStatusColorClass } from '@/utils/logGenerator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface LogDetailsProps {
  log: LogEntry | null;
  isOpen: boolean;
  onClose: () => void;
}

export const LogDetails = ({ log, isOpen, onClose }: LogDetailsProps) => {
  if (!log) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card border-primary/30 text-foreground max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-orbitron text-glow-primary">
            Log Entry Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Status and Method */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-secondary/20 rounded-lg p-3 border border-primary/10">
              <div className="text-xs font-tech text-glow-accent mb-1">HTTP Method</div>
              <div className="text-lg font-orbitron text-glow-primary">{log.method}</div>
            </div>
            <div className="bg-secondary/20 rounded-lg p-3 border border-primary/10">
              <div className="text-xs font-tech text-glow-accent mb-1">Status Code</div>
              <div className={`text-lg font-orbitron ${getStatusColorClass(log.statusCode)}`}>
                {log.statusCode}
              </div>
            </div>
          </div>

          {/* URL */}
          <div className="bg-secondary/20 rounded-lg p-3 border border-primary/10">
            <div className="text-xs font-tech text-glow-accent mb-1">Request URL</div>
            <div className="font-tech text-foreground break-all">{log.url}</div>
          </div>

          {/* IP and Timestamp */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-secondary/20 rounded-lg p-3 border border-primary/10">
              <div className="text-xs font-tech text-glow-accent mb-1">Client IP</div>
              <div className="font-tech text-glow-primary">{log.ip}</div>
            </div>
            <div className="bg-secondary/20 rounded-lg p-3 border border-primary/10">
              <div className="text-xs font-tech text-glow-accent mb-1">Timestamp</div>
              <div className="font-tech text-foreground">
                {log.timestamp.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          {(log.responseTime || log.bytes) && (
            <div className="grid grid-cols-2 gap-4">
              {log.responseTime && (
                <div className="bg-secondary/20 rounded-lg p-3 border border-primary/10">
                  <div className="text-xs font-tech text-glow-accent mb-1">Response Time</div>
                  <div className="font-orbitron text-glow-primary">{log.responseTime}ms</div>
                </div>
              )}
              {log.bytes && (
                <div className="bg-secondary/20 rounded-lg p-3 border border-primary/10">
                  <div className="text-xs font-tech text-glow-accent mb-1">Bytes Sent</div>
                  <div className="font-orbitron text-glow-primary">
                    {log.bytes.toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User Agent */}
          <div className="bg-secondary/20 rounded-lg p-3 border border-primary/10">
            <div className="text-xs font-tech text-glow-accent mb-1">User Agent</div>
            <div className="font-tech text-foreground text-sm break-all">
              {log.userAgent}
            </div>
          </div>

          {/* Unique ID */}
          <div className="bg-secondary/20 rounded-lg p-3 border border-primary/10">
            <div className="text-xs font-tech text-glow-accent mb-1">Log ID</div>
            <div className="font-tech text-muted-foreground text-sm break-all">
              {log.id}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};