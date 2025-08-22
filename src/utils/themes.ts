export interface Theme {
  name: string;
  colors: {
    success: string;      // 2xx
    redirect: string;     // 3xx
    error: string;        // 4xx
    serverError: string;  // 5xx
    primary: string;      // UI primary
  };
}

export const themes: Record<string, Theme> = {
  azion: {
    name: 'Azion',
    colors: {
      success: '#8BC249',     // Azion Green
      redirect: '#0080ff',    // Blue
      error: '#C83030',       // Azion Red
      serverError: '#ffcc00', // Yellow
      primary: '#F3652B',     // Azion Orange
    }
  },
  blue: {
    name: 'Blue',
    colors: {
      success: '#00ff88',     // Neon Green
      redirect: '#00aaff',    // Neon Blue  
      error: '#ff0066',       // Neon Pink/Red
      serverError: '#ff6600', // Neon Orange
      primary: '#00ffff',     // Neon Cyan
    }
  }
};

export function getThemeStatusColor(statusCode: number, theme: string): string {
  const themeColors = themes[theme]?.colors || themes.azion.colors;
  
  if (statusCode >= 200 && statusCode < 300) return themeColors.success;
  if (statusCode >= 300 && statusCode < 400) return themeColors.redirect;
  if (statusCode >= 400 && statusCode < 500) return themeColors.error;
  if (statusCode >= 500) return themeColors.serverError;
  return themeColors.primary;
}

export function getThemeStatusColorClass(statusCode: number, theme: string): string {
  if (statusCode >= 200 && statusCode < 300) return `text-glow-success-${theme}`;
  if (statusCode >= 300 && statusCode < 400) return `text-glow-redirect-${theme}`;
  if (statusCode >= 400 && statusCode < 500) return `text-glow-error-${theme}`;
  if (statusCode >= 500) return `text-glow-server-error-${theme}`;
  return `text-glow-primary-${theme}`;
}
