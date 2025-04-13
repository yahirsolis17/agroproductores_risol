// main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import AppRouter from './global/routes/AppRouter';
import { AuthProvider } from './modules/gestion_usuarios/context/AuthContext';
import { BrowserRouter } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './index.css';
// @ts-ignore
import '@fontsource/poppins';

// 💡 MUI Theme
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme'; // <- crea este archivo si no lo hiciste

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <AppRouter />
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
