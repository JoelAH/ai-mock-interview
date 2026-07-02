'use client';

import { createTheme } from '@mui/material/styles';

// MUI theme that mirrors the CSS custom properties defined in globals.scss.
// This keeps MUI components visually consistent with the rest of the app.
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#ffb661', // --amber
      dark: '#ff9a4d', // --amber-deep
      contrastText: '#2a1a06', // --amber-ink
    },
    secondary: {
      main: '#5ee0c7', // --teal
      dark: '#2bc0d4', // --teal-deep
      contrastText: '#0b0e14',
    },
    background: {
      default: '#0b0e14', // --bg
      paper: '#141a27', // --surface
    },
    text: {
      primary: '#edf0f6', // --text
      secondary: '#aeb7ca', // --text-muted
      disabled: '#79839a', // --text-faint
    },
    error: {
      main: '#ff7a8a', // --coral
    },
    divider: 'rgba(255, 255, 255, 0.08)', // --line
  },
  typography: {
    fontFamily: [
      'var(--font-sans)',
      'Geist',
      'system-ui',
      '-apple-system',
      'Segoe UI',
      'sans-serif',
    ].join(','),
    h1: {
      fontFamily: [
        'var(--font-display)',
        'Bricolage Grotesque',
        'system-ui',
        'sans-serif',
      ].join(','),
      fontWeight: 600,
      lineHeight: 1.04,
      letterSpacing: '-0.03em',
    },
    h2: {
      fontFamily: [
        'var(--font-display)',
        'Bricolage Grotesque',
        'system-ui',
        'sans-serif',
      ].join(','),
      fontWeight: 600,
      lineHeight: 1.04,
      letterSpacing: '-0.03em',
    },
    h3: {
      fontFamily: [
        'var(--font-display)',
        'Bricolage Grotesque',
        'system-ui',
        'sans-serif',
      ].join(','),
      fontWeight: 600,
      lineHeight: 1.04,
      letterSpacing: '-0.03em',
    },
    h4: {
      fontFamily: [
        'var(--font-display)',
        'Bricolage Grotesque',
        'system-ui',
        'sans-serif',
      ].join(','),
      fontWeight: 600,
      lineHeight: 1.04,
      letterSpacing: '-0.03em',
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 10, // --r-sm base
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '999px', // --r-pill for buttons
          padding: '0.6rem 1.5rem',
          '&.MuiButton-containedPrimary': {
            background: 'linear-gradient(135deg, #ffc06b 0%, #ff8a5b 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #ffb661 0%, #ff9a4d 100%)',
            },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(180deg, #141a27 0%, #0e121b 100%)',
          borderRadius: '24px', // --r-lg
        },
      },
    },
  },
});

export default theme;
