// src/theme.ts
import { createTheme, alpha } from '@mui/material/styles';

const PRIMARY_MAIN = '#2B7A78';
const PRIMARY_DARK = '#17252A';
const PRIMARY_LIGHT = '#3AAFA9';
const SECONDARY_MAIN = '#DEF2F1';
const TEXT_PRIMARY = '#1e293b';
const BG_DEFAULT = '#7E9B9A';

const theme = createTheme({
  typography: {
    fontFamily: 'Poppins, sans-serif',
    h1: { fontWeight: 800, letterSpacing: 0.2 },
    h2: { fontWeight: 800, letterSpacing: 0.2 },
    h3: { fontWeight: 700, letterSpacing: 0.15 },
    h4: { fontWeight: 700, letterSpacing: 0.1 },
    h5: { fontWeight: 700, letterSpacing: 0.1 },
    h6: { fontWeight: 600, letterSpacing: 0.05 },
    subtitle1: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  palette: {
    primary: {
      main: PRIMARY_MAIN,
      dark: PRIMARY_DARK,
      light: PRIMARY_LIGHT,
    },
    secondary: {
      main: SECONDARY_MAIN,
    },
    text: {
      primary: TEXT_PRIMARY,
    },
    background: {
      default: BG_DEFAULT,   // mantiene tu fondo global actual
      paper: '#FFFFFF',      // tarjetas blancas para contraste “executive”
    },
    divider: alpha(PRIMARY_DARK, 0.08),
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    // Tarjetas / contenedores
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },

    // Botones “executive” (sin mayúsculas forzadas, sin elevación)
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 12,
          fontWeight: 600,
          textTransform: 'none',
        },
        containedSecondary: {
          color: PRIMARY_DARK, // buen contraste sobre #DEF2F1
        },
      },
    },

    // IconButton con radio suave
    MuiIconButton: {
      styleOverrides: {
        root: { borderRadius: 12 },
      },
    },

    // Tabs + Tab con indicador sutil
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 3,
          borderRadius: 3,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          minHeight: 40,
        },
      },
    },

    // Chip “pill” elegante
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 9999,
          fontWeight: 500,
        },
        outlined: {
          borderColor: alpha(PRIMARY_DARK, 0.15),
        },
      },
    },

    // Alert con bordes redondeados
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 12 },
      },
    },

    // Tooltip discreto con flecha
    MuiTooltip: {
      defaultProps: {
        arrow: true,
      },
      styleOverrides: {
        tooltip: {
          borderRadius: 8,
          fontSize: 12,
        },
      },
    },

    // Skeleton con esquinas suaves
    MuiSkeleton: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },

    // Divider más sutil (va de la mano con palette.divider)
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: alpha(PRIMARY_DARK, 0.08) },
      },
    },
  },
});

export default theme;
