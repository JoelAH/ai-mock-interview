'use client';

import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import theme from '@/lib/theme';

/**
 * Client-side wrapper that provides:
 * 1. AppRouterCacheProvider — Emotion cache for correct SSR/streaming style flushing
 * 2. ThemeProvider — MUI theme context
 * 3. CssBaseline — MUI's baseline reset (layered under our globals.scss)
 */
export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider options={{ key: 'mui', enableCssLayer: true }}>
      <ThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        {children}
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
