import { createTheme } from '@mui/material/styles';

/**
 * Central dark "trading terminal" theme — Bloomberg/TradingView vibe.
 * Near-black navy background, neon green for up/buy, red for down/sell.
 * Everything (Paper, Card, Button, Chip, AppBar) inherits from here, so the
 * whole app restyles from this one file.
 */

// Brand palette
export const COLORS = {
  bg: '#0a0e17',          // near-black navy (app background)
  surface: '#111722',     // cards / panels
  surface2: '#161d2b',    // raised surfaces / hover
  border: '#1f2937',      // hairline borders
  up: '#22c55e',          // bullish / buy
  upDim: 'rgba(34,197,94,0.12)',
  down: '#ef4444',        // bearish / sell
  downDim: 'rgba(239,68,68,0.12)',
  accent: '#22c55e',      // primary accent (matches chart)
  text: '#e6edf3',
  textDim: '#8b98a9',
};

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: COLORS.accent, contrastText: '#04210f' },
    success: { main: COLORS.up },
    error: { main: COLORS.down },
    background: { default: COLORS.bg, paper: COLORS.surface },
    text: { primary: COLORS.text, secondary: COLORS.textDim },
    divider: COLORS.border,
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    h4: { fontWeight: 800, letterSpacing: '-0.02em' },
    h5: { fontWeight: 700, letterSpacing: '-0.01em' },
    h6: { fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 700 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: COLORS.bg,
          // subtle radial glow top-center for depth
          backgroundImage:
            'radial-gradient(900px 500px at 50% -10%, rgba(34,197,94,0.08), transparent 60%)',
          backgroundAttachment: 'fixed',
        },
        '::-webkit-scrollbar': { width: 10, height: 10 },
        '::-webkit-scrollbar-thumb': {
          background: COLORS.surface2,
          borderRadius: 8,
          border: `2px solid ${COLORS.bg}`,
        },
        '::-webkit-scrollbar-track': { background: 'transparent' },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          // subtle top-lit gradient gives panels depth instead of flat black
          backgroundImage: `linear-gradient(180deg, ${COLORS.surface2} 0%, ${COLORS.surface} 100%)`,
          backgroundColor: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
          boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
          // NOTE: no backdrop blur here — cards are opaque, so blur was invisible
          // but forced expensive GPU recompositing on every card. Blur kept only
          // on the navbar (AppBar) and auth glass cards where it's actually over content.
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          transition: 'transform .15s ease, box-shadow .15s ease, background-color .15s ease',
          '&:hover': { transform: 'translateY(-1px)' },
        },
        containedPrimary: {
          boxShadow: '0 4px 18px rgba(34,197,94,0.35)',
          '&:hover': { boxShadow: '0 6px 24px rgba(34,197,94,0.5)' },
        },
      },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 700 } },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined', size: 'small' },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(10,14,23,0.7)',
          backgroundImage: 'none',
          backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${COLORS.border}`,
          boxShadow: 'none',
        },
      },
    },
  },
});

export default theme;
