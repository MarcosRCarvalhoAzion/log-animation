import { LogEntry, type LogStats } from '@/types/log';
import { getStatusColorClass } from '@/utils/logGenerator';
import { useMemo } from 'react';

interface LogStatsProps {
  logs: LogEntry[];
}

export const LogStatsComponent = ({ logs }: LogStatsProps) => {
  const stats = useMemo((): LogStats => {
    const statusCounts = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 };
    const ipCounts = new Map<string, number>();
    const urlCounts = new Map<string, number>();

    logs.forEach(log => {
      // Count status codes
      if (log.statusCode >= 200 && log.statusCode < 300) statusCounts['2xx']++;
      else if (log.statusCode >= 300 && log.statusCode < 400) statusCounts['3xx']++;
      else if (log.statusCode >= 400 && log.statusCode < 500) statusCounts['4xx']++;
      else if (log.statusCode >= 500) statusCounts['5xx']++;

      // Count IPs
      ipCounts.set(log.ip, (ipCounts.get(log.ip) || 0) + 1);

      // Count URLs
      urlCounts.set(log.url, (urlCounts.get(log.url) || 0) + 1);
    });

    // Calculate requests per second (last 60 seconds)
    const oneMinuteAgo = new Date(Date.now() - 60000);
    const recentLogs = logs.filter(log => log.timestamp > oneMinuteAgo);
    const requestsPerSecond = recentLogs.length / 60;

    // Get top IPs and URLs
    const topIPs = Array.from(ipCounts.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([ip, count]) => ({ ip, count }));

    const topUrls = Array.from(urlCounts.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([url, count]) => ({ url, count }));

    return {
      totalRequests: logs.length,
      statusCounts,
      requestsPerSecond,
      topIPs,
      topUrls
    };
  }, [logs]);

  return (
    <div className="bg-card/30 border border-primary/20 rounded-lg p-4 backdrop-blur-sm">
      <h2 className="font-orbitron text-xl text-glow-primary mb-4">Live Stats</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Requests */}
        <div className="bg-secondary/20 rounded-lg p-3 border border-primary/10">
          <div className="text-glow-accent text-sm font-tech">Total Requests</div>
          <div className="text-2xl font-orbitron text-glow-primary">
            {stats.totalRequests.toLocaleString()}
          </div>
        </div>

        {/* Requests per Second */}
        <div className="bg-secondary/20 rounded-lg p-3 border border-primary/10">
          <div className="text-glow-accent text-sm font-tech">Req/sec (1m)</div>
          <div className="text-2xl font-orbitron text-glow-primary">
            {stats.requestsPerSecond.toFixed(1)}
          </div>
        </div>

        {/* Status Code Distribution */}
        <div className="bg-secondary/20 rounded-lg p-3 border border-primary/10 md:col-span-2">
          <div className="text-glow-accent text-sm font-tech mb-2">Status Codes</div>
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center">
              <div className="text-glow-success text-lg font-orbitron">{stats.statusCounts['2xx']}</div>
              <div className="text-xs text-muted-foreground">2xx</div>
            </div>
            <div className="text-center">
              <div className="text-glow-redirect text-lg font-orbitron">{stats.statusCounts['3xx']}</div>
              <div className="text-xs text-muted-foreground">3xx</div>
            </div>
            <div className="text-center">
              <div className="text-glow-error text-lg font-orbitron">{stats.statusCounts['4xx']}</div>
              <div className="text-xs text-muted-foreground">4xx</div>
            </div>
            <div className="text-center">
              <div className="text-glow-server-error text-lg font-orbitron">{stats.statusCounts['5xx']}</div>
              <div className="text-xs text-muted-foreground">5xx</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top IPs */}
        <div className="bg-secondary/20 rounded-lg p-3 border border-primary/10">
          <div className="text-glow-accent text-sm font-tech mb-3">Top IPs</div>
          <div className="space-y-2">
            {stats.topIPs.map(({ ip, count }, index) => (
              <div key={ip} className="flex justify-between items-center">
                <span className="font-tech text-sm text-foreground/80">{ip}</span>
                <span className="text-glow-primary font-orbitron text-sm">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top URLs */}
        <div className="bg-secondary/20 rounded-lg p-3 border border-primary/10">
          <div className="text-glow-accent text-sm font-tech mb-3">Top URLs</div>
          <div className="space-y-2">
            {stats.topUrls.map(({ url, count }, index) => (
              <div key={url} className="flex justify-between items-center">
                <span className="font-tech text-sm text-foreground/80 truncate mr-2">
                  {url}
                </span>
                <span className="text-glow-primary font-orbitron text-sm">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};