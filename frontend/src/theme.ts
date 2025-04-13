// src/theme.ts
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  typography: {
    fontFamily: 'Poppins, sans-serif',
  },
  palette: {
    primary: {
      main: '#2B7A78',
      dark: '#17252A',
      light: '#3AAFA9',
    },
    secondary: {
      main: '#DEF2F1',
    },
    text: {
      primary: '#1e293b',
    },
    background: {
      default: '#f1f5f9',
    },
  },
  shape: {
    borderRadius: 12,
  },
});

export default theme;
