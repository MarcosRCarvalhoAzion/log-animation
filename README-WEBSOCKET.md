# WebSocket Integration for Azion Deployment

## Overview

This project has been updated to support real-time log streaming via WebSocket connections, making it compatible with Azion's static hosting platform. The previous mock `/logs` endpoint has been replaced with a robust WebSocket client that can connect to external log streaming servers.

## Key Changes

### 1. WebSocket Client (`src/utils/websocketClient.ts`)
- **LogWebSocketClient**: Robust WebSocket client with automatic reconnection
- **Multiple log formats**: Supports JSON, Apache Combined Log Format, and raw text
- **Connection management**: Automatic reconnection with exponential backoff
- **Event-driven architecture**: Clean separation of concerns

### 2. Updated Log Receiver (`src/hooks/useLogReceiver.ts`)
- **Dual mode support**: WebSocket mode for production, mock mode for development
- **Connection status**: Real-time connection status monitoring
- **Backward compatibility**: Maintains support for the original mock endpoint

### 3. Connection Status UI (`src/components/ConnectionStatus.tsx`)
- **Visual indicators**: Real-time connection status with color-coded badges
- **Reconnection controls**: Manual reconnection button
- **Connection details**: WebSocket URL and status information

### 4. Configuration Panel
- **WebSocket URL input**: Configure custom WebSocket server URLs
- **Toggle modes**: Switch between WebSocket and mock modes
- **Environment variables**: Support for `.env` configuration

## Deployment to Azion

### Step 1: Configure WebSocket Server

Since Azion only supports static files, you need an external WebSocket server. Options include:

#### Option A: Use a WebSocket Service
```bash
# Popular WebSocket services:
# - Pusher (pusher.com)
# - Ably (ably.com)
# - Socket.IO with a Node.js server
# - AWS API Gateway WebSocket
```

#### Option B: Deploy Your Own Server
```bash
# Use the provided example server
npm install ws
node websocket-server-example.js

# Or deploy to cloud platforms:
# - Heroku
# - Railway
# - Render
# - AWS Lambda + API Gateway
```

### Step 2: Configure Environment Variables

Create `.env` file:
```bash
cp .env.example .env
```

Edit `.env`:
```env
REACT_APP_WEBSOCKET_URL=wss://your-websocket-server.com/ws
REACT_APP_ENABLE_WEBSOCKET=true
```

### Step 3: Build and Deploy to Azion

```bash
# Build the project
npm run build

# Deploy using Azion CLI
azion deploy

# Or manually upload the dist/ folder to Azion Edge Storage
```

## WebSocket Server Requirements

Your WebSocket server should:

### 1. Accept WebSocket connections on `/ws` endpoint
### 2. Handle log messages in these formats:

#### JSON Format (Recommended)
```json
{
  "type": "log",
  "data": {
    "ip": "192.168.1.100",
    "method": "GET",
    "url": "/api/users",
    "statusCode": 200,
    "userAgent": "Mozilla/5.0...",
    "timestamp": "2024-01-01T12:00:00Z",
    "responseTime": 150,
    "bytes": 1234
  }
}
```

#### Apache Combined Log Format
```
192.168.1.100 - - [01/Jan/2024:12:00:00 +0000] "GET /api/users HTTP/1.1" 200 1234 "-" "Mozilla/5.0..."
```

#### Batch Format
```json
{
  "logs": [
    { "ip": "192.168.1.100", "method": "GET", ... },
    { "ip": "192.168.1.101", "method": "POST", ... }
  ]
}
```

## Testing Locally

### 1. Start the WebSocket Server
```bash
# Install dependencies
npm install ws

# Start the example server
node websocket-server-example.js
```

### 2. Start the React App
```bash
npm run dev
```

### 3. Test Log Streaming
```bash
# Send logs via HTTP POST
curl -X POST http://localhost:8080/logs \
  -d '192.168.1.1 - - [01/Jan/2024:12:00:00 +0000] "GET /test HTTP/1.1" 200 1234 "-" "curl/7.68.0"'

# Send JSON logs
curl -X POST http://localhost:8080/logs \
  -H "Content-Type: application/json" \
  -d '{"ip":"192.168.1.1","method":"GET","url":"/api/test","statusCode":200}'
```

## Integration with Log Sources

### Nginx
```nginx
# Add to nginx.conf
log_format json_combined escape=json
  '{'
    '"ip":"$remote_addr",'
    '"timestamp":"$time_iso8601",'
    '"method":"$request_method",'
    '"url":"$request_uri",'
    '"statusCode":$status,'
    '"bytes":$body_bytes_sent,'
    '"userAgent":"$http_user_agent",'
    '"responseTime":$request_time'
  '}';

access_log /var/log/nginx/access.log json_combined;

# Stream logs to WebSocket server
# Use tools like Fluentd, Logstash, or custom scripts
```

### Apache
```apache
# Add to httpd.conf
LogFormat "%h %l %u %t \"%r\" %>s %O \"%{Referer}i\" \"%{User-Agent}i\"" combined
CustomLog logs/access_log combined

# Stream logs using tail and curl
tail -f /var/log/apache2/access.log | while read line; do
  curl -X POST http://your-websocket-server.com/logs -d "$line"
done
```

### Application Logs
```javascript
// Node.js example
const WebSocket = require('ws');
const ws = new WebSocket('ws://your-websocket-server.com/ws');

// Send application logs
function logRequest(req, res, responseTime) {
  const logData = {
    ip: req.ip,
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
    responseTime
  };
  
  ws.send(JSON.stringify({ type: 'log', data: logData }));
}
```

## Production Considerations

### Security
- Use WSS (WebSocket Secure) for production
- Implement authentication if needed
- Rate limiting on the WebSocket server
- Input validation and sanitization

### Performance
- Buffer logs on the server side
- Implement client-side log batching
- Use compression for WebSocket messages
- Monitor connection health

### Monitoring
- WebSocket connection metrics
- Log processing latency
- Client connection counts
- Error rates and reconnection attempts

## Troubleshooting

### Connection Issues
1. Check WebSocket URL format (ws:// or wss://)
2. Verify CORS settings on WebSocket server
3. Check firewall and proxy settings
4. Monitor browser console for errors

### Log Format Issues
1. Verify log format matches expected structure
2. Check timestamp formats
3. Validate JSON structure
4. Monitor parsing errors in browser console

### Performance Issues
1. Reduce log frequency if needed
2. Implement client-side filtering
3. Use log sampling for high-volume sources
4. Monitor memory usage in browser

## Support

For issues related to:
- **Azion deployment**: Check Azion documentation
- **WebSocket connectivity**: Verify server configuration
- **Log parsing**: Check browser console for parsing errors
- **Performance**: Monitor browser dev tools performance tab
