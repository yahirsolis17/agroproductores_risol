// main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';

import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';                // <-- IMPORTA
import { store } from './global/store/store';          // <-- IMPORTA TU STORE
import { ThemeProvider, CssBaseline } from '@mui/material';

import AppRouter from './global/routes/AppRouter';
import { AuthProvider } from './modules/gestion_usuarios/context/AuthContext';
import { ToastContainer } from 'react-toastify';

import 'react-toastify/dist/ReactToastify.css';
import './index.css';
// @ts-ignore
import '@fontsource/poppins';
import theme from './theme';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Provider store={store}>  {/* <-- ENVUELVE TODO DENTRO DE <Provider> */}
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <AuthProvider>
            <QueryClientProvider client={queryClient}>
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
            </QueryClientProvider>
          </AuthProvider>
        </ThemeProvider>
      </Provider>
    </BrowserRouter>
  </React.StrictMode>
);
