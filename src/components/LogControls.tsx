import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface LogControlsProps {
  isRunning: boolean;
  speed: number;
  frequency: number;
  onToggleRunning: () => void;
  onSpeedChange: (speed: number) => void;
  onFrequencyChange: (frequency: number) => void;
  onClear: () => void;
}

export const LogControls = ({ 
  isRunning, 
  speed, 
  frequency,
  onToggleRunning, 
  onSpeedChange, 
  onFrequencyChange,
  onClear 
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
            <div>• <span className="text-glow-success">Green</span>: 2xx Success</div>
            <div>• <span className="text-glow-redirect">Blue</span>: 3xx Redirect</div>
            <div>• <span className="text-glow-error">Red</span>: 4xx Client Error</div>
            <div>• <span className="text-glow-server-error">Orange</span>: 5xx Server Error</div>
          </div>
        </div>
      </div>
    </div>
  );
};