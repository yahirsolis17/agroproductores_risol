// src/theme.ts
import { createTheme, alpha } from '@mui/material/styles';

// --- PALETA DE COLORES ---

// 1. Color Principal: Un verde muy oscuro, casi gris (Deep Mineral Green).
// Transmite: Estabilidad, Corporativo, Naturaleza seria.
const PRIMARY_MAIN = '#2F3E37';
const PRIMARY_DARK = '#1D2822';
const PRIMARY_LIGHT = '#576960';

// 2. Color Secundario: Un tono "Salvia Metálico" o "Hierba Seca".
// Transmite: Industrial, suave, campo técnico.
const SECONDARY_MAIN = '#7A8C80';
const SECONDARY_LIGHT = '#A3B3A9';

// 3. Fondos y Textos
// No usamos negro puro (#000), usamos un carbón verdoso para armonía.
const TEXT_PRIMARY = '#1A211E';
const TEXT_SECONDARY = '#4D5952';

// El fondo no es blanco clínico, es un tono "Misty Concrete" (Gris cálido muy suave)
const BG_CONCRETE = '#F0F2F0';
const PAPER_SURFACE = '#FFFFFF';

// Acento sutil (Opcional, para alertas o CTAs muy específicos): Ocre quemado
// Evita que el sitio se sienta "triste" sin ser "fiesta".
const ACCENT_WARM = '#D9A441';

const theme = createTheme({
  typography: {
    // Mantenemos Poppins pero ajustamos pesos para que se vea más "técnico"
    fontFamily: '"Poppins", "Inter", sans-serif',
    h1: { fontWeight: 700, color: PRIMARY_DARK, letterSpacing: -0.5 },
    h2: { fontWeight: 700, color: PRIMARY_DARK, letterSpacing: -0.5 },
    h3: { fontWeight: 600, color: PRIMARY_MAIN },
    h4: { fontWeight: 600, color: PRIMARY_MAIN },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600, textTransform: 'uppercase', fontSize: '0.875rem', letterSpacing: 1 }, // Estilo "Etiqueta Industrial"
    subtitle1: { color: TEXT_SECONDARY, fontWeight: 500 },
    body1: { color: TEXT_PRIMARY, lineHeight: 1.6 },
    button: { fontWeight: 600, letterSpacing: 0.5 },
  },
  palette: {
    primary: {
      main: PRIMARY_MAIN,
      dark: PRIMARY_DARK,
      light: PRIMARY_LIGHT,
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: SECONDARY_MAIN,
      light: SECONDARY_LIGHT,
      contrastText: '#FFFFFF',
    },
    warning: {
      main: ACCENT_WARM, // Toque cálido (trigo/cuero)
    },
    text: {
      primary: TEXT_PRIMARY,
      secondary: TEXT_SECONDARY,
    },
    background: {
      default: BG_CONCRETE,
      paper: PAPER_SURFACE,
    },
    divider: alpha(PRIMARY_MAIN, 0.12),
    action: {
      hover: alpha(PRIMARY_MAIN, 0.04),
      selected: alpha(PRIMARY_MAIN, 0.08),
    },
  },
  shape: {
    // Reducimos el radio: 6px es más "ingeniería/tech" que 12px (que es más social/app)
    borderRadius: 6,
  },
  components: {
    // --- LÓGICA DE SUPERFICIES ---
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: BG_CONCRETE,
          // Scrollbar estilo industrial
          '&::-webkit-scrollbar': { width: '8px' },
          '&::-webkit-scrollbar-track': { background: '#E0E4E1' },
          '&::-webkit-scrollbar-thumb': { background: '#Aebcb4', borderRadius: '4px' },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none', // Quitamos gradientes por defecto del modo dark si cambiara
        },
        elevation1: {
          boxShadow: '0px 2px 4px -1px rgba(29, 40, 34, 0.06), 0px 4px 12px rgba(29, 40, 34, 0.04)',
          border: `1px solid ${alpha(PRIMARY_MAIN, 0.08)}`, // LÓGICA: Borde sutil para definir límites
        },
        elevation0: {
          border: `1px solid ${alpha(PRIMARY_MAIN, 0.15)}`, // Más contraste en tarjetas planas
        },
      },
    },

    // --- BOTONES INDUSTRIALES ---
    MuiButton: {
      defaultProps: {
        disableElevation: true,
        variant: 'contained',
      },
      styleOverrides: {
        root: {
          textTransform: 'none',
          padding: '8px 20px',
          transition: 'all 0.2s ease-in-out',
        },
        containedPrimary: {
          backgroundColor: PRIMARY_MAIN,
          '&:hover': {
            backgroundColor: PRIMARY_DARK,
            transform: 'translateY(-1px)', // Pequeño feedback mecánico
            boxShadow: '0 4px 12px rgba(47, 62, 55, 0.25)',
          },
        },
        outlined: {
          borderWidth: '1.5px', // Borde más grueso, más robusto
          fontWeight: 600,
          '&:hover': {
            borderWidth: '1.5px',
            backgroundColor: alpha(PRIMARY_MAIN, 0.04),
          },
        },
      },
    },

    // --- INPUTS MÁS LEGIBLES ---
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: alpha('#FFF', 0.6), // Ligeramente translúcido
          transition: 'background-color 0.2s',
          '&:hover': {
            backgroundColor: '#FFF',
          },
          '&.Mui-focused': {
            backgroundColor: '#FFFFFF',
            boxShadow: `0 0 0 4px ${alpha(SECONDARY_MAIN, 0.2)}`, // Anillo de foco estilo "safety"
          },
        },
        notchedOutline: {
          borderColor: alpha(PRIMARY_MAIN, 0.2),
        },
      },
    },

    // --- ELEMENTOS DE NAVEGACIÓN ---
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          color: TEXT_PRIMARY,
          borderBottom: `1px solid ${alpha(PRIMARY_MAIN, 0.1)}`,
          boxShadow: 'none', // Flat design para la barra superior
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 4, // Chips rectangulares (etiquetas de almacén/inventario)
          fontWeight: 600,
        },
        filled: {
          backgroundColor: alpha(SECONDARY_MAIN, 0.15),
          color: PRIMARY_DARK,
        },
        colorPrimary: {
          backgroundColor: PRIMARY_MAIN,
          color: '#FFF',
        },
      },
    },

    // --- TABLAS (DATOS) ---
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 700,
          backgroundColor: alpha(SECONDARY_MAIN, 0.08), // Cabecera de tabla gris/verdosa tenue
          color: PRIMARY_DARK,
          textTransform: 'uppercase',
          fontSize: '0.75rem',
          letterSpacing: 0.5,
        },
        body: {
          color: TEXT_SECONDARY,
        },
      },
    },

    // --- ALERTAS ---
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          border: '1px solid transparent',
        },
        standardInfo: {
          backgroundColor: alpha(PRIMARY_MAIN, 0.05),
          color: PRIMARY_DARK,
          borderColor: alpha(PRIMARY_MAIN, 0.1),
        },
      },
    },
  },
});

export default theme;