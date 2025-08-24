#!/usr/bin/env node

/**
 * Simple WebSocket Server for Testing Log Streaming
 * 
 * This is a basic Node.js WebSocket server that can be used to test
 * the log streaming functionality before deploying to Azion.
 * 
 * Usage:
 * 1. Install dependencies: npm install ws
 * 2. Run server: node websocket-server-example.js
 * 3. Send logs via WebSocket or HTTP POST to /logs
 */

const WebSocket = require('ws');
const http = require('http');
const url = require('url');

const PORT = process.env.PORT || 8080;

// Create HTTP server
const server = http.createServer();

// Create WebSocket server
const wss = new WebSocket.Server({ 
  server,
  path: '/ws'
});

// Store connected clients
const clients = new Set();

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  console.log(`New WebSocket connection from ${req.socket.remoteAddress}`);
  clients.add(ws);

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'welcome',
    message: 'Connected to log stream server',
    timestamp: new Date().toISOString()
  }));

  // Handle client disconnect
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    clients.delete(ws);
  });

  // Handle client errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });
});

// Broadcast log to all connected clients
function broadcastLog(logData) {
  const message = JSON.stringify({
    type: 'log',
    data: logData,
    timestamp: new Date().toISOString()
  });

  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
      } catch (error) {
        console.error('Error sending to client:', error);
        clients.delete(client);
      }
    }
  });

  console.log(`Broadcasted log to ${clients.size} clients:`, logData);
}

// HTTP request handler for /logs endpoint
server.on('request', (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (parsedUrl.pathname === '/logs' && req.method === 'POST') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        // Try to parse as JSON first
        let logData;
        try {
          logData = JSON.parse(body);
        } catch {
          // If not JSON, treat as raw log line
          logData = parseApacheLogLine(body.trim());
        }

        // Broadcast to WebSocket clients
        broadcastLog(logData);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          status: 'success', 
          message: 'Log received and broadcasted',
          clients: clients.size 
        }));
      } catch (error) {
        console.error('Error processing log:', error);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          status: 'error', 
          message: 'Failed to process log data' 
        }));
      }
    });
  } else if (parsedUrl.pathname === '/status') {
    // Status endpoint
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'running',
      clients: clients.size,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

// Parse Apache log line into structured data
function parseApacheLogLine(logLine) {
  // Apache Combined Log Format:
  // IP - - [timestamp] "METHOD URL HTTP/1.1" status bytes "referer" "user-agent"
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
  } else {
    // If parsing fails, create a basic log entry
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
}

// Generate sample logs for testing
function generateSampleLog() {
  const ips = ['192.168.1.100', '10.0.0.45', '203.0.113.42', '198.51.100.23'];
  const methods = ['GET', 'POST', 'PUT', 'DELETE'];
  const urls = ['/api/users', '/api/products', '/dashboard', '/login', '/static/app.js'];
  const statusCodes = [200, 201, 301, 400, 404, 500];
  
  return {
    id: `sample_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ip: ips[Math.floor(Math.random() * ips.length)],
    timestamp: new Date().toISOString(),
    method: methods[Math.floor(Math.random() * methods.length)],
    url: urls[Math.floor(Math.random() * urls.length)],
    statusCode: statusCodes[Math.floor(Math.random() * statusCodes.length)],
    userAgent: 'Mozilla/5.0 (Test) WebSocket/1.0',
    bytes: Math.floor(Math.random() * 5000) + 100,
    responseTime: Math.floor(Math.random() * 1000) + 10
  };
}

// Start server
server.listen(PORT, () => {
  console.log(`🚀 WebSocket Log Server running on port ${PORT}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}/ws`);
  console.log(`📝 HTTP logs endpoint: http://localhost:${PORT}/logs`);
  console.log(`📊 Status endpoint: http://localhost:${PORT}/status`);
  console.log('\n📋 Test commands:');
  console.log(`   curl -X POST http://localhost:${PORT}/logs -d '192.168.1.1 - - [$(date)] "GET /test HTTP/1.1" 200 1234 "-" "curl/7.68.0"'`);
  console.log(`   curl -X POST http://localhost:${PORT}/logs -H "Content-Type: application/json" -d '{"ip":"192.168.1.1","method":"GET","url":"/api/test","statusCode":200}'`);
  
  // Generate sample logs every 5 seconds for testing
  setInterval(() => {
    if (clients.size > 0) {
      broadcastLog(generateSampleLog());
    }
  }, 5000);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down WebSocket server...');
  wss.clients.forEach(client => {
    client.close(1000, 'Server shutdown');
  });
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
