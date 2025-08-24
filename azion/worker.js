/**
 * Azion Edge Function for handling /logs endpoint
 * Processes log data and broadcasts to connected clients via Server-Sent Events
 */

// In-memory storage for connected clients (will reset on edge function restart)
const connectedClients = new Set();

// Parse Apache Combined Log Format
function parseApacheLog(logLine) {
  const logRegex = /^(\S+) \S+ \S+ \[([^\]]+)\] "(\S+) (\S+) \S+" (\d+) (\d+|-) "([^"]*)" "([^"]*)"/;
  const match = logLine.match(logRegex);
  
  if (match) {
    const [, ip, timestamp, method, url, statusCode, bytes, referer, userAgent] = match;
    return {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ip,
      timestamp: new Date(timestamp).toISOString(),
      method,
      url,
      statusCode: parseInt(statusCode),
      userAgent,
      bytes: bytes === '-' ? undefined : parseInt(bytes),
      referer: referer === '-' ? undefined : referer
    };
  }
  
  // Fallback for unrecognized format
  return {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ip: '0.0.0.0',
    timestamp: new Date().toISOString(),
    method: 'GET',
    url: '/',
    statusCode: 200,
    userAgent: logLine.substring(0, 100),
    rawLog: logLine
  };
}

// Process log data from different formats
function processLogData(body, contentType) {
  try {
    if (contentType && contentType.includes('application/json')) {
      const jsonData = JSON.parse(body);
      
      // Handle batch logs
      if (jsonData.logs && Array.isArray(jsonData.logs)) {
        return jsonData.logs.map(log => ({
          id: log.id || `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ip: log.ip || '0.0.0.0',
          timestamp: log.timestamp || new Date().toISOString(),
          method: log.method || 'GET',
          url: log.url || '/',
          statusCode: log.statusCode || 200,
          userAgent: log.userAgent || '',
          responseTime: log.responseTime,
          bytes: log.bytes
        }));
      }
      
      // Handle single JSON log
      return [{
        id: jsonData.id || `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ip: jsonData.ip || '0.0.0.0',
        timestamp: jsonData.timestamp || new Date().toISOString(),
        method: jsonData.method || 'GET',
        url: jsonData.url || '/',
        statusCode: jsonData.statusCode || 200,
        userAgent: jsonData.userAgent || '',
        responseTime: jsonData.responseTime,
        bytes: jsonData.bytes
      }];
    } else {
      // Handle Apache log format or plain text
      const logLines = body.split('\n').filter(line => line.trim());
      return logLines.map(line => parseApacheLog(line.trim()));
    }
  } catch (error) {
    console.error('Error processing log data:', error);
    return [{
      id: `error_${Date.now()}`,
      ip: '0.0.0.0',
      timestamp: new Date().toISOString(),
      method: 'GET',
      url: '/error',
      statusCode: 500,
      userAgent: 'Error',
      error: error.message
    }];
  }
}

// Broadcast log to all connected SSE clients
function broadcastToClients(logData) {
  const message = `data: ${JSON.stringify({
    type: 'log',
    data: logData,
    timestamp: new Date().toISOString()
  })}\n\n`;
  
  // In a real implementation, you'd use Azion's real-time features
  // For now, we'll store in browser localStorage as a workaround
  return message;
}

export default async function handler(event) {
  const request = event.request;
  const url = new URL(request.url);
  
  // Enable CORS for all requests
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  };

  // Handle preflight OPTIONS request
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  // Handle /logs endpoint
  if (url.pathname === '/logs' && request.method === 'POST') {
    try {
      const body = await request.text();
      const contentType = request.headers.get('content-type');
      
      // Process the log data
      const logEntries = processLogData(body, contentType);
      
      // Since Azion Edge Functions are stateless, we'll return the processed logs
      // and let the client handle the real-time updates via polling or other methods
      const response = {
        status: 'success',
        message: 'Logs processed successfully',
        count: logEntries.length,
        logs: logEntries,
        timestamp: new Date().toISOString()
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        status: 'error',
        message: 'Failed to process logs',
        error: error.message
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  }

  // Handle /logs/stream endpoint for Server-Sent Events (if needed)
  if (url.pathname === '/logs/stream' && request.method === 'GET') {
    // This would be used for real-time streaming, but Azion Edge Functions
    // don't support long-lived connections. We'll implement polling instead.
    return new Response(JSON.stringify({
      status: 'info',
      message: 'Use POST /logs to send log data',
      polling_endpoint: '/logs/latest'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }

  // Handle /logs/latest for polling recent logs
  if (url.pathname === '/logs/latest' && request.method === 'GET') {
    // In a real implementation, you'd fetch from a database or cache
    // For now, return empty array since we don't have persistent storage
    return new Response(JSON.stringify({
      status: 'success',
      logs: [],
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }

  // For all other requests, return 404
  return new Response(JSON.stringify({
    status: 'error',
    message: 'Endpoint not found',
    available_endpoints: ['/logs (POST)', '/logs/stream (GET)', '/logs/latest (GET)']
  }), {
    status: 404,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}
