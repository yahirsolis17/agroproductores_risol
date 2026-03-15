import { alpha, createTheme } from '@mui/material/styles';

const PRIMARY_MAIN = '#184d46';
const PRIMARY_DARK = '#103730';
const PRIMARY_LIGHT = '#2c6d64';
const SECONDARY_MAIN = '#0f7892';
const SECONDARY_DARK = '#0b5d72';
const SECONDARY_LIGHT = '#4eb4c9';

const TEXT_PRIMARY = '#10201f';
const TEXT_SECONDARY = '#526465';
const SURFACE = '#ffffff';
const SURFACE_MUTED = '#f6fbfb';
const BG_DEFAULT = '#eef4f6';
const BORDER = alpha(TEXT_PRIMARY, 0.1);
const SHADOW_SOFT = '0 20px 60px rgba(16, 32, 31, 0.08)';
const SHADOW_FLOAT = '0 28px 90px rgba(16, 32, 31, 0.12)';

type ChipTone = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

const CHIP_TEXT: Record<Exclude<ChipTone, 'default'>, string> = {
  primary: PRIMARY_DARK,
  secondary: SECONDARY_DARK,
  success: '#126b4d',
  warning: '#7a5115',
  error: '#8d3142',
  info: SECONDARY_DARK,
};

const CHIP_BG: Record<Exclude<ChipTone, 'default'>, string> = {
  primary: alpha(PRIMARY_MAIN, 0.12),
  secondary: alpha(SECONDARY_MAIN, 0.12),
  success: alpha('#198f67', 0.13),
  warning: alpha('#cb8a2c', 0.18),
  error: alpha('#cb4d63', 0.13),
  info: alpha(SECONDARY_MAIN, 0.12),
};

const CHIP_BORDER: Record<Exclude<ChipTone, 'default'>, string> = {
  primary: alpha(PRIMARY_MAIN, 0.18),
  secondary: alpha(SECONDARY_MAIN, 0.18),
  success: alpha('#198f67', 0.2),
  warning: alpha('#cb8a2c', 0.24),
  error: alpha('#cb4d63', 0.2),
  info: alpha(SECONDARY_MAIN, 0.18),
};

const theme = createTheme({
  shape: {
    borderRadius: 20,
  },
  typography: {
    fontFamily: '"Poppins", "Segoe UI", sans-serif',
    h1: { fontWeight: 700, letterSpacing: '-0.04em', color: TEXT_PRIMARY },
    h2: { fontWeight: 700, letterSpacing: '-0.035em', color: TEXT_PRIMARY },
    h3: { fontWeight: 700, letterSpacing: '-0.03em', color: TEXT_PRIMARY },
    h4: { fontWeight: 700, letterSpacing: '-0.025em', color: TEXT_PRIMARY },
    h5: { fontWeight: 650, letterSpacing: '-0.02em', color: TEXT_PRIMARY },
    h6: { fontWeight: 650, letterSpacing: '-0.01em', color: TEXT_PRIMARY },
    subtitle1: { color: TEXT_SECONDARY, fontWeight: 500 },
    subtitle2: { color: TEXT_SECONDARY, fontWeight: 600, letterSpacing: '0.01em' },
    body1: { color: TEXT_PRIMARY, lineHeight: 1.7 },
    body2: { color: TEXT_SECONDARY, lineHeight: 1.65 },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: '0.01em' },
    overline: { fontWeight: 700, letterSpacing: '0.18em', color: SECONDARY_DARK },
  },
  palette: {
    primary: {
      main: PRIMARY_MAIN,
      dark: PRIMARY_DARK,
      light: PRIMARY_LIGHT,
      contrastText: '#ffffff',
    },
    secondary: {
      main: SECONDARY_MAIN,
      dark: SECONDARY_DARK,
      light: SECONDARY_LIGHT,
      contrastText: '#ffffff',
    },
    success: {
      main: '#198f67',
      dark: '#126b4d',
      light: '#7ddfb9',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#cb8a2c',
      dark: '#99661d',
      light: '#f3d39a',
      contrastText: '#fffaf2',
    },
    error: {
      main: '#cb4d63',
      dark: '#99394b',
      light: '#f6b0bc',
      contrastText: '#fff5f7',
    },
    info: {
      main: SECONDARY_MAIN,
      dark: SECONDARY_DARK,
      light: '#a7deea',
      contrastText: '#f4fdff',
    },
    text: {
      primary: TEXT_PRIMARY,
      secondary: TEXT_SECONDARY,
    },
    background: {
      default: BG_DEFAULT,
      paper: SURFACE,
    },
    divider: BORDER,
    action: {
      hover: alpha(PRIMARY_MAIN, 0.06),
      selected: alpha(PRIMARY_MAIN, 0.1),
      focus: alpha(SECONDARY_MAIN, 0.16),
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        ':root': {
          '--app-surface-border': BORDER,
          '--app-surface-shadow': SHADOW_SOFT,
          '--app-surface-shadow-strong': SHADOW_FLOAT,
        },
        'html, body, #root': {
          minHeight: '100%',
        },
        body: {
          margin: 0,
          color: TEXT_PRIMARY,
          background: `
            radial-gradient(circle at top left, rgba(78, 180, 201, 0.12), transparent 24%),
            radial-gradient(circle at bottom right, rgba(25, 143, 103, 0.1), transparent 26%),
            linear-gradient(180deg, #f6fbfc 0%, ${BG_DEFAULT} 100%)
          `,
          backgroundAttachment: 'fixed',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          '&::-webkit-scrollbar': { width: '10px', height: '10px' },
          '&::-webkit-scrollbar-track': { background: alpha(TEXT_PRIMARY, 0.04) },
          '&::-webkit-scrollbar-thumb': {
            background: alpha(PRIMARY_MAIN, 0.22),
            borderRadius: '999px',
            border: '2px solid transparent',
            backgroundClip: 'padding-box',
          },
        },
        '::selection': {
          backgroundColor: alpha(SECONDARY_MAIN, 0.22),
          color: TEXT_PRIMARY,
        },
        '.MuiBackdrop-root': {
          backdropFilter: 'blur(10px)',
          backgroundColor: alpha('#071311', 0.22),
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundColor: alpha(SURFACE, 0.9),
          backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.82), rgba(246,251,251,0.96))',
          border: `1px solid ${BORDER}`,
          boxShadow: SHADOW_SOFT,
          backdropFilter: 'blur(18px)',
        },
        rounded: {
          borderRadius: 24,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          border: `1px solid ${BORDER}`,
          boxShadow: SHADOW_SOFT,
          backgroundColor: alpha(SURFACE, 0.92),
          backdropFilter: 'blur(16px)',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 18,
          paddingInline: 18,
          paddingBlock: 10,
          minHeight: 44,
          fontWeight: 650,
          transition: 'transform 180ms ease, box-shadow 220ms ease, background-color 220ms ease, border-color 220ms ease',
        },
        sizeSmall: {
          minHeight: 38,
          paddingInline: 14,
          paddingBlock: 8,
        },
        sizeLarge: {
          minHeight: 50,
          paddingInline: 22,
          paddingBlock: 12,
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #184d46 0%, #2b7367 100%)',
          boxShadow: '0 14px 34px rgba(24, 77, 70, 0.2)',
          '&:hover': {
            background: 'linear-gradient(135deg, #103730 0%, #225d54 100%)',
            transform: 'translateY(-1px)',
            boxShadow: '0 18px 40px rgba(16, 55, 48, 0.24)',
          },
        },
        outlinedPrimary: {
          borderWidth: 1.5,
          borderColor: alpha(PRIMARY_MAIN, 0.22),
          color: PRIMARY_MAIN,
          backgroundColor: alpha('#ffffff', 0.72),
          '&:hover': {
            borderWidth: 1.5,
            borderColor: alpha(PRIMARY_MAIN, 0.32),
            backgroundColor: alpha(PRIMARY_MAIN, 0.06),
          },
        },
        textPrimary: {
          color: PRIMARY_MAIN,
          '&:hover': {
            backgroundColor: alpha(PRIMARY_MAIN, 0.06),
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          transition: 'background-color 180ms ease, transform 180ms ease',
          '&:hover': {
            backgroundColor: alpha(PRIMARY_MAIN, 0.08),
            transform: 'translateY(-1px)',
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 18,
          backgroundColor: alpha('#ffffff', 0.76),
          transition: 'box-shadow 180ms ease, background-color 180ms ease, border-color 180ms ease, transform 180ms ease',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha(TEXT_PRIMARY, 0.12),
            transition: 'border-color 180ms ease',
          },
          '&:hover': {
            backgroundColor: '#ffffff',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: alpha(PRIMARY_MAIN, 0.22),
            },
          },
          '&.Mui-focused': {
            backgroundColor: '#ffffff',
            boxShadow: `0 0 0 5px ${alpha(SECONDARY_MAIN, 0.12)}`,
            transform: 'translateY(-1px)',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: SECONDARY_MAIN,
              borderWidth: 1.5,
            },
          },
          '&.Mui-error': {
            boxShadow: `0 0 0 4px ${alpha('#cb4d63', 0.12)}`,
          },
        },
        input: {
          paddingTop: 14,
          paddingBottom: 14,
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: TEXT_SECONDARY,
          fontWeight: 500,
        },
      },
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          marginTop: 8,
          fontSize: '0.78rem',
          lineHeight: 1.45,
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        icon: {
          color: alpha(TEXT_PRIMARY, 0.52),
        },
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        paper: {
          borderRadius: 18,
          border: `1px solid ${BORDER}`,
          boxShadow: SHADOW_SOFT,
        },
        option: {
          minHeight: 42,
          borderRadius: 12,
          margin: '4px 8px',
          '&[aria-selected="true"]': {
            backgroundColor: alpha(SECONDARY_MAIN, 0.12),
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 28,
          padding: 6,
          backgroundColor: alpha(SURFACE, 0.94),
          backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.88), rgba(246,251,251,0.98))',
          boxShadow: SHADOW_FLOAT,
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          paddingBottom: 10,
          fontWeight: 700,
          color: TEXT_PRIMARY,
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          color: TEXT_SECONDARY,
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '16px 20px 20px',
          gap: 8,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 44,
        },
        indicator: {
          height: 4,
          borderRadius: '999px 999px 0 0',
          background: 'linear-gradient(90deg, #184d46 0%, #0f7892 100%)',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 44,
          borderRadius: 14,
          paddingInline: 14,
          fontWeight: 600,
          transition: 'background-color 180ms ease, color 180ms ease',
          '&:hover': {
            backgroundColor: alpha(PRIMARY_MAIN, 0.05),
          },
          '&.Mui-selected': {
            color: PRIMARY_MAIN,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: ({ ownerState }) => {
          const chipColor = (ownerState.color ?? 'default') as ChipTone;
          const isOutlined = ownerState.variant === 'outlined';
          const isDefault = chipColor === 'default';
          const resolvedText = isDefault ? TEXT_PRIMARY : CHIP_TEXT[chipColor];
          const resolvedBorder = isDefault ? alpha(TEXT_PRIMARY, 0.08) : CHIP_BORDER[chipColor];
          const resolvedBackground = isDefault ? alpha('#ffffff', 0.76) : CHIP_BG[chipColor];

          return {
            borderRadius: 999,
            fontWeight: 700,
            color: resolvedText,
            border: `1px solid ${resolvedBorder}`,
            backgroundColor: isOutlined ? alpha('#ffffff', 0.52) : resolvedBackground,
            backdropFilter: 'blur(8px)',
            '& .MuiChip-icon, & .MuiChip-deleteIcon': {
              color: 'inherit',
            },
          };
        },
        label: {
          paddingInline: 12,
        },
        outlined: {
          backgroundColor: alpha('#ffffff', 0.52),
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          border: `1px solid ${BORDER}`,
          backgroundColor: alpha('#ffffff', 0.8),
          boxShadow: SHADOW_SOFT,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          backgroundColor: alpha(SURFACE_MUTED, 0.92),
          color: TEXT_SECONDARY,
          fontSize: '0.72rem',
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          borderBottom: `1px solid ${BORDER}`,
        },
        body: {
          borderBottom: `1px solid ${alpha(TEXT_PRIMARY, 0.08)}`,
          color: TEXT_PRIMARY,
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: 'background-color 180ms ease, transform 180ms ease',
          '&:hover': {
            backgroundColor: alpha(SECONDARY_MAIN, 0.04),
          },
        },
      },
    },
    MuiPaginationItem: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          fontWeight: 600,
          '&.Mui-selected': {
            background: 'linear-gradient(135deg, rgba(24,77,70,0.14), rgba(15,120,146,0.16))',
            color: PRIMARY_MAIN,
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          backgroundColor: alpha(PRIMARY_MAIN, 0.08),
        },
        bar: {
          borderRadius: 999,
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: alpha(TEXT_PRIMARY, 0.08),
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 18,
          border: `1px solid ${alpha(TEXT_PRIMARY, 0.08)}`,
          boxShadow: '0 10px 30px rgba(16,32,31,0.06)',
        },
        standardInfo: {
          backgroundColor: alpha(SECONDARY_MAIN, 0.08),
          color: SECONDARY_DARK,
        },
        standardError: {
          backgroundColor: alpha('#cb4d63', 0.08),
        },
        standardWarning: {
          backgroundColor: alpha('#cb8a2c', 0.08),
        },
        standardSuccess: {
          backgroundColor: alpha('#198f67', 0.08),
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: 14,
          backgroundColor: alpha(TEXT_PRIMARY, 0.92),
          fontSize: '0.75rem',
          boxShadow: '0 18px 50px rgba(16,32,31,0.2)',
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          border: `1px solid ${BORDER}`,
          boxShadow: 'none',
          overflow: 'hidden',
          '&::before': {
            display: 'none',
          },
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 18,
          border: `1px solid ${BORDER}`,
          boxShadow: SHADOW_SOFT,
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          minHeight: 42,
          borderRadius: 12,
          margin: '4px 8px',
        },
      },
    },
  },
});

export default theme;
