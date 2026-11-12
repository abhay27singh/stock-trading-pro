import { createTheme } from '@mui/material/styles';

/**
 * Central dark theme: "Obsidian Terminal".
 *
 * Follows the Stitch design system, blended as agreed: the prose spec's surface tiering
 * and signal colours with the exported config's typography scale.
 *
 * Two rules drive the look:
 *   1. Colour carries meaning, never decoration. Emerald and crimson are reserved for
 *      price direction, blue for commands the user issues, amber for warnings. Nothing
 *      else is tinted, so a green number always means "up".
 *   2. Depth comes from surface tiers and 1px borders, not shadows or blur. Ambient
 *      shadows smear across a dense table and cost GPU time on every repaint.
 *
 * Every page reads these tokens, so the whole app restyles from this one file.
 */

// Brand palette. Key names are kept stable because pages import them directly.
export const COLORS = {
  bg: '#0B0F17',          // deep obsidian: app canvas
  surface: '#111827',     // charcoal slate: panels and cards
  surface2: '#1E293B',    // muted slate: elevated cells, hover
  surface3: '#283548',    // focused surface
  border: '#1E293B',      // interior dividers
  borderStrong: '#334155', // active panel borders, table dividers

  up: '#10B981',          // bullish / buy
  upPressed: '#059669',
  upDim: 'rgba(16,185,129,0.12)',
  down: '#EF4444',        // bearish / sell
  downPressed: '#DC2626',
  downDim: 'rgba(239,68,68,0.12)',

  accent: '#3B82F6',      // command / primary action
  accentPressed: '#2563EB',
  accentDim: 'rgba(59,130,246,0.12)',

  info: '#3B82F6',        // kept as an alias so existing usages stay valid
  infoDim: 'rgba(59,130,246,0.12)',
  warn: '#F59E0B',        // warning / exposure
  warnDim: 'rgba(245,158,11,0.12)',

  text: '#F8FAFC',        // primary values and tickers
  textDim: '#94A3B8',     // column headers, secondary telemetry
  textMuted: '#64748B',   // metadata, disabled
};

/** Monospace stack for every number, so columns do not shift as prices tick. */
export const MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

/**
 * Apply to any element showing a figure. tabular-nums fixes digit width, which stops
 * a live-updating price from jittering its own column on each tick.
 */
export const numeric = {
  fontFamily: MONO,
  fontVariantNumeric: 'tabular-nums',
  letterSpacing: '-0.01em',
};

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: COLORS.accent, dark: COLORS.accentPressed, contrastText: '#FFFFFF' },
    success: { main: COLORS.up },
    error: { main: COLORS.down },
    warning: { main: COLORS.warn },
    background: { default: COLORS.bg, paper: COLORS.surface },
    text: { primary: COLORS.text, secondary: COLORS.textDim, disabled: COLORS.textMuted },
    divider: COLORS.border,
  },

  // Sharp corners: the spec bans pill radii outright and keeps panels near the pixel
  // grid so split views line up. 2px for containers, 4px for interactive controls.
  shape: { borderRadius: 2 },

  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    // Negative tracking at display sizes keeps headings compact in a dense layout.
    h4: { fontSize: 32, lineHeight: '40px', fontWeight: 700, letterSpacing: '-0.02em' },
    h5: { fontSize: 24, lineHeight: '32px', fontWeight: 600, letterSpacing: '-0.015em' },
    h6: { fontSize: 18, lineHeight: '24px', fontWeight: 600, letterSpacing: '-0.01em' },
    subtitle1: { fontSize: 14, lineHeight: '20px', fontWeight: 600, letterSpacing: '-0.005em' },
    body1: { fontSize: 13, lineHeight: '18px' },
    body2: { fontSize: 12, lineHeight: '16px' },
    caption: { fontSize: 11, lineHeight: '14px' },
    overline: {
      fontSize: 10, lineHeight: '12px', fontWeight: 700,
      letterSpacing: '0.06em', textTransform: 'uppercase',
    },
    button: { textTransform: 'none', fontWeight: 600, fontSize: 13, letterSpacing: '-0.005em' },
  },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: COLORS.bg,
          backgroundImage: 'none',   // flat canvas: no ambient glow behind dense data
        },
        // Numbers are monospaced wherever they are tagged, app-wide.
        '.num': { ...numeric },
        '::-webkit-scrollbar': { width: 10, height: 10 },
        '::-webkit-scrollbar-thumb': {
          background: COLORS.surface2,
          borderRadius: 2,
          border: `2px solid ${COLORS.bg}`,
        },
        '::-webkit-scrollbar-track': { background: 'transparent' },
      },
    },

    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
          boxShadow: 'none',
        },
      },
    },

    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          // No lift or glow on hover: motion is reserved for data, not chrome.
          transition: 'background-color .12s ease, border-color .12s ease, color .12s ease',
        },
        contained: { boxShadow: 'none', '&:hover': { boxShadow: 'none' } },
        outlined: {
          borderColor: COLORS.borderStrong,
          color: COLORS.textDim,
          '&:hover': { backgroundColor: COLORS.surface2, color: COLORS.text, borderColor: COLORS.borderStrong },
        },
      },

      /*
       * The design system gives each button a job, and the colour is what says which
       * job it is. Defining them here means a page cannot quietly invent a sixth kind.
       *
       *   buy / sell  directional orders, emerald and crimson
       *   contained   a command the user issues (submit, execute): blue
       *   outlined    secondary utility: transparent until hovered
       *   size=micro  22-26px controls for timeframes and percentage presets
       */
      variants: [
        {
          props: { variant: 'buy' },
          style: {
            backgroundColor: COLORS.up,
            color: '#042F2C',          // dark text: emerald is too bright for white
            fontWeight: 700,
            '&:hover': { backgroundColor: COLORS.upPressed },
            '&:active': { backgroundColor: COLORS.upPressed },
          },
        },
        {
          props: { variant: 'sell' },
          style: {
            backgroundColor: COLORS.down,
            color: '#FFFFFF',
            fontWeight: 700,
            '&:hover': { backgroundColor: COLORS.downPressed },
            '&:active': { backgroundColor: COLORS.downPressed },
          },
        },
        {
          props: { variant: 'contained', color: 'primary' },
          style: { border: `1px solid ${COLORS.accentPressed}` },
        },
        {
          props: { size: 'micro' },
          style: {
            minWidth: 0,
            height: 24,
            padding: '0 8px',
            fontSize: 11,
            fontWeight: 600,
            borderRadius: 4,
            border: `1px solid ${COLORS.border}`,
            color: COLORS.textDim,
            '&:hover': { backgroundColor: COLORS.surface2, color: COLORS.text },
          },
        },
      ],
    },

    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 4, fontWeight: 600, height: 22 },
        label: { paddingLeft: 8, paddingRight: 8 },
      },
    },

    MuiTextField: { defaultProps: { variant: 'outlined', size: 'small' } },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          backgroundColor: COLORS.bg,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.borderStrong },
          // Focus is a crisp border change with no glow, per the spec.
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: COLORS.accent,
            borderWidth: 1,
          },
        },
      },
    },

    // Dense rows: the spec locks table rows to 24-28px to fit more above the fold.
    MuiTableCell: {
      styleOverrides: {
        root: {
          paddingTop: 4,
          paddingBottom: 4,
          borderBottom: `1px solid ${COLORS.border}`,
          fontSize: 13,
        },
        head: {
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: COLORS.textMuted,
          backgroundColor: COLORS.bg,
        },
      },
    },

    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: COLORS.bg,
          backgroundImage: 'none',
          borderBottom: `1px solid ${COLORS.border}`,
          boxShadow: 'none',
        },
      },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: COLORS.surface2,
          border: `1px solid ${COLORS.borderStrong}`,
          borderRadius: 4,
          fontSize: 12,
        },
      },
    },
  },
});

export default theme;
