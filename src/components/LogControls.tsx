import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { themes } from '../utils/themes';

interface LogControlsProps {
  isRunning: boolean;
  speed: number;
  frequency: number;
  onToggleRunning: () => void;
  onSpeedChange: (speed: number) => void;
  onFrequencyChange: (frequency: number) => void;
  onClear: () => void;
  theme?: string;
}

export const LogControls = ({ 
  isRunning, 
  speed, 
  frequency,
  onToggleRunning, 
  onSpeedChange, 
  onFrequencyChange,
  onClear,
  theme = 'azion'
}: LogControlsProps) => {
  return (
    <div className="bg-card/30 border border-primary/20 rounded-lg p-4 backdrop-blur-sm">
      <h2 className="font-orbitron text-lg text-glow-primary mb-4">Controls</h2>
      
      <div className="space-y-4">
        {/* Play/Pause Button */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-tech text-glow-accent">Stream Status</span>
          <Button
            onClick={onToggleRunning}
            className={`cyber-button font-orbitron ${
              isRunning 
                ? 'text-glow-success border-status-success' 
                : 'text-glow-error border-status-error'
            }`}
            variant="outline"
          >
            {isRunning ? '⏸ Pause' : '▶ Start'}
          </Button>
        </div>

        {/* Speed Control */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-tech text-glow-accent">Speed</span>
            <span className="text-sm font-orbitron text-glow-primary">{speed.toFixed(1)}x</span>
          </div>
          <Slider
            value={[speed]}
            onValueChange={([value]) => onSpeedChange(value)}
            min={0.1}
            max={5}
            step={0.1}
            className="w-full"
          />
        </div>

        {/* Request Frequency Control */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-tech text-glow-accent">Request Frequency</span>
            <span className="text-sm font-orbitron text-glow-primary">{frequency.toFixed(1)}/s</span>
          </div>
          <Slider
            value={[frequency]}
            onValueChange={([value]) => onFrequencyChange(value)}
            min={0.1}
            max={50}
            step={0.1}
            className="w-full"
          />
        </div>

        {/* Clear Button */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-tech text-glow-accent">Clear Logs</span>
          <Button
            onClick={onClear}
            className="cyber-button font-orbitron text-glow-server-error border-status-server-error"
            variant="outline"
          >
            🗑 Clear
          </Button>
        </div>

        {/* Instructions */}
        <div className="pt-4 border-t border-primary/20">
          <div className="text-xs font-tech text-muted-foreground space-y-1">
            <div>• Hover particles for details</div>
            <div>• Click particles for more info</div>
            <div>• <span style={{ 
              backgroundColor: themes[theme]?.colors.success || themes.azion.colors.success,
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              display: 'inline-block',
              marginRight: '6px',
              boxShadow: `0 0 8px ${themes[theme]?.colors.success || themes.azion.colors.success}80`
            }}></span>2xx Success</div>
            <div>• <span style={{ 
              backgroundColor: themes[theme]?.colors.redirect || themes.azion.colors.redirect,
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              display: 'inline-block',
              marginRight: '6px',
              boxShadow: `0 0 8px ${themes[theme]?.colors.redirect || themes.azion.colors.redirect}80`
            }}></span>3xx Redirect</div>
            <div>• <span style={{ 
              backgroundColor: themes[theme]?.colors.error || themes.azion.colors.error,
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              display: 'inline-block',
              marginRight: '6px',
              boxShadow: `0 0 8px ${themes[theme]?.colors.error || themes.azion.colors.error}80`
            }}></span>4xx Client Error</div>
            <div>• <span style={{ 
              backgroundColor: themes[theme]?.colors.serverError || themes.azion.colors.serverError,
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              display: 'inline-block',
              marginRight: '6px',
              boxShadow: `0 0 8px ${themes[theme]?.colors.serverError || themes.azion.colors.serverError}80`
            }}></span>5xx Server Error</div>
          </div>
        </div>
      </div>
    </div>
  );
};