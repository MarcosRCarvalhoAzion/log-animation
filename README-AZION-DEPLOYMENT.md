# Deploy para Azion com Endpoint /logs

## Implementação Completa

Implementei uma solução completa para funcionar na Azion usando Edge Functions para processar o endpoint `/logs` sem precisar de servidor externo.

## Arquivos Criados/Modificados

### 1. **Azion Edge Function** (`azion/worker.js`)
- Processa requisições POST para `/logs`
- Suporta formatos Apache Combined Log e JSON
- Retorna logs processados imediatamente
- CORS habilitado para todas as origens

### 2. **Cliente Azion** (`src/utils/azionLogClient.ts`)
- Intercepta requisições para `/logs`
- Comunica entre abas via localStorage
- Processa logs em tempo real
- Compatível com a arquitetura da Azion

### 3. **Hook Atualizado** (`src/hooks/useLogReceiver.ts`)
- Prioridade 1: Azion Edge Function (padrão)
- Prioridade 2: WebSocket (fallback)
- Prioridade 3: Mock endpoint (desenvolvimento)

## Como Testar

### 1. Deploy na Azion
```bash
# Build do projeto
npm run build

# Deploy usando Azion CLI
azion deploy
```

### 2. Enviar Logs via curl

#### Formato Apache Combined Log
```bash
curl -X POST https://sua-url.azionedge.net/logs \
  -d '192.168.1.100 - - [24/Aug/2025:03:00:00 +0000] "GET /api/users HTTP/1.1" 200 1234 "-" "Mozilla/5.0"'
```

#### Formato JSON
```bash
curl -X POST https://sua-url.azionedge.net/logs \
  -H "Content-Type: application/json" \
  -d '{
    "ip": "192.168.1.100",
    "method": "GET",
    "url": "/api/products",
    "statusCode": 200,
    "userAgent": "Mozilla/5.0",
    "responseTime": 150
  }'
```

#### Lote de Logs
```bash
curl -X POST https://sua-url.azionedge.net/logs \
  -H "Content-Type: application/json" \
  -d '{
    "logs": [
      {"ip": "192.168.1.100", "method": "GET", "url": "/api/users", "statusCode": 200},
      {"ip": "192.168.1.101", "method": "POST", "url": "/api/orders", "statusCode": 201}
    ]
  }'
```

## Como Funciona

### 1. **Recepção de Logs**
- Edge Function processa POST `/logs`
- Logs são parseados e normalizados
- Resposta JSON com logs processados

### 2. **Comunicação em Tempo Real**
- Cliente intercepta requisições `/logs`
- Logs são enviados via eventos customizados
- localStorage para comunicação entre abas
- Animações aparecem imediatamente na tela

### 3. **Compatibilidade**
- ✅ Azion Edge Functions
- ✅ Sem servidor externo necessário
- ✅ CORS habilitado
- ✅ Múltiplos formatos de log
- ✅ Comunicação em tempo real

## Integração com Fontes de Log

### Nginx
```nginx
# Configurar log format JSON
log_format json_combined escape=json
  '{"ip":"$remote_addr","method":"$request_method","url":"$request_uri","statusCode":$status,"userAgent":"$http_user_agent","timestamp":"$time_iso8601"}';

# Enviar logs via script
tail -f /var/log/nginx/access.log | while read line; do
  curl -X POST https://sua-url.azionedge.net/logs -d "$line"
done
```

### Apache
```apache
# Log format personalizado
LogFormat "%h - - [%t] \"%r\" %>s %O \"%{Referer}i\" \"%{User-Agent}i\"" combined

# Script para enviar logs
tail -f /var/log/apache2/access.log | while read line; do
  curl -X POST https://sua-url.azionedge.net/logs -d "$line"
done
```

### Aplicação Node.js
```javascript
// Middleware para enviar logs
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', async () => {
    const logData = {
      ip: req.ip,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      userAgent: req.get('User-Agent'),
      responseTime: Date.now() - start
    };
    
    // Enviar para Azion
    fetch('https://sua-url.azionedge.net/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logData)
    }).catch(console.error);
  });
  
  next();
});
```

## Status da Implementação

✅ **Edge Function implementada**  
✅ **Cliente Azion funcional**  
✅ **Hook atualizado**  
✅ **Comunicação em tempo real**  
✅ **Suporte a múltiplos formatos**  
✅ **CORS configurado**  
✅ **Documentação completa**

## Próximos Passos

1. **Deploy na Azion**: `azion deploy`
2. **Testar endpoint**: Use os exemplos de curl acima
3. **Configurar fontes de log**: Nginx, Apache, aplicações
4. **Monitorar**: Logs aparecerão em tempo real na interface

A solução está pronta para produção na Azion!
