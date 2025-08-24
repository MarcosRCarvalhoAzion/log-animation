import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, RotateCcw, AlertCircle } from 'lucide-react';

interface ConnectionStatusProps {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  onReconnect?: () => void;
  websocketUrl?: string;
}

export function ConnectionStatus({ status, onReconnect, websocketUrl }: ConnectionStatusProps) {
  const [showDetails, setShowDetails] = useState(false);

  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: <Wifi className="w-4 h-4" />,
          text: 'Conectado',
          variant: 'default' as const,
          className: 'bg-green-600 hover:bg-green-700 text-white border-green-500'
        };
      case 'connecting':
        return {
          icon: <RotateCcw className="w-4 h-4 animate-spin" />,
          text: 'Conectando...',
          variant: 'secondary' as const,
          className: 'bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-500'
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-4 h-4" />,
          text: 'Erro',
          variant: 'destructive' as const,
          className: 'bg-red-600 hover:bg-red-700 text-white border-red-500'
        };
      default:
        return {
          icon: <WifiOff className="w-4 h-4" />,
          text: 'Desconectado',
          variant: 'outline' as const,
          className: 'bg-gray-600 hover:bg-gray-700 text-white border-gray-500'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="flex items-center gap-2">
      <Badge 
        variant={config.variant}
        className={`${config.className} cursor-pointer transition-all duration-200 hover:scale-105`}
        onClick={() => setShowDetails(!showDetails)}
      >
        {config.icon}
        <span className="ml-1">{config.text}</span>
      </Badge>

      {(status === 'disconnected' || status === 'error') && onReconnect && (
        <Button
          size="sm"
          variant="outline"
          onClick={onReconnect}
          className="h-6 px-2 text-xs bg-gray-800 border-gray-600 hover:bg-gray-700 text-white"
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          Reconectar
        </Button>
      )}

      {showDetails && (
        <div className="absolute top-full left-0 mt-2 p-3 bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-50 min-w-64">
          <div className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Status:</span>
              <span className={`font-medium ${
                status === 'connected' ? 'text-green-400' :
                status === 'connecting' ? 'text-yellow-400' :
                status === 'error' ? 'text-red-400' : 'text-gray-400'
              }`}>
                {config.text}
              </span>
            </div>
            {websocketUrl && (
              <div className="flex justify-between">
                <span className="text-gray-400">URL:</span>
                <span className="text-blue-400 font-mono text-xs break-all">
                  {websocketUrl}
                </span>
              </div>
            )}
            <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-700">
              {status === 'connected' && 'Recebendo logs em tempo real'}
              {status === 'connecting' && 'Estabelecendo conexão...'}
              {status === 'disconnected' && 'Clique em "Reconectar" para tentar novamente'}
              {status === 'error' && 'Verifique a URL do WebSocket e tente novamente'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
