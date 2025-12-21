// src/theme.ts
import { createTheme, alpha } from '@mui/material/styles';

// Paleta Industrial-Corporativa con toques del campo
const PRIMARY_MAIN = '#2c3e50';      // Azul-gris oscuro industrial (acero)
const PRIMARY_DARK = '#1a252f';      // Casi carbón
const PRIMARY_LIGHT = '#4a5f7f';     // Acero claro

const SECONDARY_MAIN = '#6b7f5c';    // Verde oliva apagado (campo/naturaleza)
const SECONDARY_DARK = '#4a5940';    // Verde musgo oscuro
const SECONDARY_LIGHT = '#8c9d7e';   // Verde salvia

const ACCENT = '#a0826d';            // Terracota/cuero (toque cálido sutil)

const TEXT_PRIMARY = '#1f2937';      // Gris muy oscuro (casi negro)
const TEXT_SECONDARY = '#4b5563';    // Gris medio

const BG_DEFAULT = '#e8e6e1';        // Gris cálido tenue (cemento claro)
const BG_PAPER = '#f5f4f0';          // Papel ligeramente más cálido (lino)
const BG_ELEVATED = '#ffffff';       // Blanco puro solo para elementos elevados importantes

const theme = createTheme({
  typography: {
    fontFamily: '"Inter", "Roboto", "Arial", sans-serif',
    h1: { 
      fontWeight: 700, 
      letterSpacing: -0.5,
      color: TEXT_PRIMARY,
    },
    h2: { 
      fontWeight: 700, 
      letterSpacing: -0.3,
      color: TEXT_PRIMARY,
    },
    h3: { 
      fontWeight: 600, 
      letterSpacing: -0.2,
      color: TEXT_PRIMARY,
    },
    h4: { 
      fontWeight: 600, 
      letterSpacing: 0,
      color: TEXT_PRIMARY,
    },
    h5: { 
      fontWeight: 600,
      color: TEXT_PRIMARY,
    },
    h6: { 
      fontWeight: 600,
      color: TEXT_PRIMARY,
    },
    subtitle1: { 
      fontWeight: 500,
      color: TEXT_SECONDARY,
    },
    subtitle2: { 
      fontWeight: 500,
      color: TEXT_SECONDARY,
    },
    body1: {
      color: TEXT_PRIMARY,
    },
    body2: {
      color: TEXT_SECONDARY,
    },
    button: { 
      textTransform: 'none', 
      fontWeight: 600,
      letterSpacing: 0.3,
    },
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
    error: {
      main: '#b85450',        // Rojo oxidado (industrial)
      light: '#d67872',
      dark: '#8f3f3c',
    },
    warning: {
      main: '#c4a053',        // Ocre/mostaza apagado
      light: '#dab970',
      dark: '#9a7d3f',
    },
    info: {
      main: '#5b7a99',        // Azul acero
      light: '#7b95b3',
      dark: '#3f5570',
    },
    success: {
      main: SECONDARY_MAIN,   // Usa el verde oliva
      light: SECONDARY_LIGHT,
      dark: SECONDARY_DARK,
    },
    text: {
      primary: TEXT_PRIMARY,
      secondary: TEXT_SECONDARY,
      disabled: alpha(TEXT_PRIMARY, 0.38),
    },
    background: {
      default: BG_DEFAULT,    // Cemento claro
      paper: BG_PAPER,        // Papel/lino
    },
    divider: alpha(PRIMARY_DARK, 0.12),
    action: {
      active: PRIMARY_MAIN,
      hover: alpha(PRIMARY_MAIN, 0.08),
      selected: alpha(PRIMARY_MAIN, 0.14),
      disabled: alpha(PRIMARY_MAIN, 0.26),
      disabledBackground: alpha(PRIMARY_MAIN, 0.12),
    },
  },
  shape: {
    borderRadius: 8,          // Menos redondeado = más industrial
  },
  shadows: [
    'none',
    '0px 1px 3px rgba(31, 41, 55, 0.08), 0px 1px 2px rgba(31, 41, 55, 0.06)',
    '0px 2px 4px rgba(31, 41, 55, 0.08), 0px 2px 3px rgba(31, 41, 55, 0.06)',
    '0px 3px 6px rgba(31, 41, 55, 0.09), 0px 3px 4px rgba(31, 41, 55, 0.07)',
    '0px 4px 8px rgba(31, 41, 55, 0.10), 0px 4px 5px rgba(31, 41, 55, 0.08)',
    '0px 6px 12px rgba(31, 41, 55, 0.11), 0px 5px 7px rgba(31, 41, 55, 0.09)',
    '0px 8px 16px rgba(31, 41, 55, 0.12), 0px 6px 9px rgba(31, 41, 55, 0.10)',
    '0px 10px 20px rgba(31, 41, 55, 0.13), 0px 8px 11px rgba(31, 41, 55, 0.11)',
    '0px 12px 24px rgba(31, 41, 55, 0.14), 0px 10px 13px rgba(31, 41, 55, 0.12)',
    '0px 14px 28px rgba(31, 41, 55, 0.15), 0px 12px 15px rgba(31, 41, 55, 0.13)',
    '0px 16px 32px rgba(31, 41, 55, 0.16), 0px 14px 17px rgba(31, 41, 55, 0.14)',
    '0px 16px 32px rgba(31, 41, 55, 0.16), 0px 14px 17px rgba(31, 41, 55, 0.14)',
    '0px 16px 32px rgba(31, 41, 55, 0.16), 0px 14px 17px rgba(31, 41, 55, 0.14)',
    '0px 16px 32px rgba(31, 41, 55, 0.16), 0px 14px 17px rgba(31, 41, 55, 0.14)',
    '0px 16px 32px rgba(31, 41, 55, 0.16), 0px 14px 17px rgba(31, 41, 55, 0.14)',
    '0px 16px 32px rgba(31, 41, 55, 0.16), 0px 14px 17px rgba(31, 41, 55, 0.14)',
    '0px 16px 32px rgba(31, 41, 55, 0.16), 0px 14px 17px rgba(31, 41, 55, 0.14)',
    '0px 16px 32px rgba(31, 41, 55, 0.16), 0px 14px 17px rgba(31, 41, 55, 0.14)',
    '0px 16px 32px rgba(31, 41, 55, 0.16), 0px 14px 17px rgba(31, 41, 55, 0.14)',
    '0px 16px 32px rgba(31, 41, 55, 0.16), 0px 14px 17px rgba(31, 41, 55, 0.14)',
    '0px 16px 32px rgba(31, 41, 55, 0.16), 0px 14px 17px rgba(31, 41, 55, 0.14)',
    '0px 16px 32px rgba(31, 41, 55, 0.16), 0px 14px 17px rgba(31, 41, 55, 0.14)',
    '0px 16px 32px rgba(31, 41, 55, 0.16), 0px 14px 17px rgba(31, 41, 55, 0.14)',
    '0px 16px 32px rgba(31, 41, 55, 0.16), 0px 14px 17px rgba(31, 41, 55, 0.14)',
    '0px 16px 32px rgba(31, 41, 55, 0.16), 0px 14px 17px rgba(31, 41, 55, 0.14)',
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: `${alpha(PRIMARY_MAIN, 0.3)} transparent`,
          '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
            width: 10,
            height: 10,
          },
          '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
            borderRadius: 8,
            backgroundColor: alpha(PRIMARY_MAIN, 0.3),
            border: `2px solid ${BG_DEFAULT}`,
          },
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          borderRadius: 8,
          border: `1px solid ${alpha(PRIMARY_DARK, 0.08)}`,
        },
        elevation0: {
          border: 'none',
        },
        elevation1: {
          boxShadow: '0px 2px 4px rgba(31, 41, 55, 0.06), 0px 1px 2px rgba(31, 41, 55, 0.04)',
        },
        elevation2: {
          boxShadow: '0px 4px 8px rgba(31, 41, 55, 0.08), 0px 2px 4px rgba(31, 41, 55, 0.06)',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 600,
          textTransform: 'none',
          padding: '10px 20px',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 2px 4px rgba(31, 41, 55, 0.12)',
          },
        },
        containedPrimary: {
          backgroundColor: PRIMARY_MAIN,
          '&:hover': {
            backgroundColor: PRIMARY_DARK,
          },
        },
        containedSecondary: {
          backgroundColor: SECONDARY_MAIN,
          '&:hover': {
            backgroundColor: SECONDARY_DARK,
          },
        },
        outlined: {
          borderWidth: 1.5,
          '&:hover': {
            borderWidth: 1.5,
            backgroundColor: alpha(PRIMARY_MAIN, 0.04),
          },
        },
        text: {
          '&:hover': {
            backgroundColor: alpha(PRIMARY_MAIN, 0.06),
          },
        },
      },
      variants: [
        {
          props: { variant: 'contained', color: 'primary' },
          style: {
            background: `linear-gradient(135deg, ${PRIMARY_MAIN} 0%, ${PRIMARY_DARK} 100%)`,
            '&:hover': {
              background: PRIMARY_DARK,
            },
          },
        },
      ],
    },
    MuiIconButton: {
      styleOverrides: {
        root: { 
          borderRadius: 6,
          '&:hover': {
            backgroundColor: alpha(PRIMARY_MAIN, 0.06),
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          border: `1px solid ${alpha(PRIMARY_DARK, 0.08)}`,
          boxShadow: '0px 2px 4px rgba(31, 41, 55, 0.04)',
          transition: 'box-shadow 0.2s ease-in-out, transform 0.2s ease-in-out',
          '&:hover': {
            boxShadow: '0px 8px 16px rgba(31, 41, 55, 0.10)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${alpha(PRIMARY_DARK, 0.08)}`,
          backgroundColor: alpha(PRIMARY_MAIN, 0.02),
        },
        title: {
          fontWeight: 600,
          color: TEXT_PRIMARY,
        },
        subheader: {
          color: TEXT_SECONDARY,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: BG_ELEVATED,
          color: TEXT_PRIMARY,
          boxShadow: `0px 1px 0px ${alpha(PRIMARY_DARK, 0.08)}`,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: BG_PAPER,
          borderRight: `1px solid ${alpha(PRIMARY_DARK, 0.12)}`,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${alpha(PRIMARY_DARK, 0.12)}`,
        },
        indicator: {
          height: 3,
          borderRadius: 3,
          backgroundColor: ACCENT,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          minHeight: 48,
          color: TEXT_SECONDARY,
          '&.Mui-selected': {
            color: PRIMARY_MAIN,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
          height: 28,
        },
        filled: {
          backgroundColor: alpha(PRIMARY_MAIN, 0.12),
          color: PRIMARY_DARK,
        },
        outlined: {
          borderColor: alpha(PRIMARY_DARK, 0.20),
          borderWidth: 1.5,
        },
        colorSecondary: {
          backgroundColor: alpha(SECONDARY_MAIN, 0.15),
          color: SECONDARY_DARK,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { 
          borderRadius: 8,
          border: '1px solid',
        },
        standardError: {
          backgroundColor: alpha('#b85450', 0.08),
          borderColor: alpha('#b85450', 0.2),
        },
        standardWarning: {
          backgroundColor: alpha('#c4a053', 0.08),
          borderColor: alpha('#c4a053', 0.2),
        },
        standardInfo: {
          backgroundColor: alpha('#5b7a99', 0.08),
          borderColor: alpha('#5b7a99', 0.2),
        },
        standardSuccess: {
          backgroundColor: alpha(SECONDARY_MAIN, 0.08),
          borderColor: alpha(SECONDARY_MAIN, 0.2),
        },
      },
    },
    MuiTooltip: {
      defaultProps: {
        arrow: true,
      },
      styleOverrides: {
        tooltip: {
          borderRadius: 6,
          fontSize: 13,
          backgroundColor: PRIMARY_DARK,
          padding: '8px 12px',
        },
        arrow: {
          color: PRIMARY_DARK,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: BG_ELEVATED,
            '& fieldset': {
              borderColor: alpha(PRIMARY_DARK, 0.15),
              borderWidth: 1.5,
            },
            '&:hover fieldset': {
              borderColor: alpha(PRIMARY_MAIN, 0.4),
            },
            '&.Mui-focused fieldset': {
              borderColor: PRIMARY_MAIN,
              borderWidth: 2,
            },
          },
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: alpha(PRIMARY_MAIN, 0.04),
          '& .MuiTableCell-root': {
            fontWeight: 600,
            color: TEXT_PRIMARY,
            borderBottom: `2px solid ${alpha(PRIMARY_DARK, 0.12)}`,
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: alpha(PRIMARY_MAIN, 0.03),
          },
          '&:last-child td': {
            borderBottom: 0,
          },
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: { 
          borderColor: alpha(PRIMARY_DARK, 0.10),
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          backgroundColor: alpha(PRIMARY_MAIN, 0.12),
        },
        bar: {
          borderRadius: 4,
        },
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: { 
          borderRadius: 6,
          backgroundColor: alpha(PRIMARY_MAIN, 0.08),
        },
      },
    },
  },
});

export default theme;