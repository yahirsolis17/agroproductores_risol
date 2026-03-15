// main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';

import { BrowserRouter } from 'react-router-dom';

import { Provider } from 'react-redux';                // <-- IMPORTA
import { store } from './global/store/store';          // <-- IMPORTA TU STORE
import { ThemeProvider, CssBaseline } from '@mui/material';
import { LazyMotion } from 'framer-motion';

import AppRouter from './global/routes/AppRouter';
import { AuthProvider } from './modules/gestion_usuarios/context/AuthContext';
import { ToastContainer } from 'react-toastify';

import 'react-toastify/dist/ReactToastify.css';
import './index.css';
import '@fontsource/poppins';
import theme from './theme';

const loadMotionFeatures = () =>
  import('framer-motion').then((mod) => mod.domAnimation);


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Provider store={store}>  {/* <-- ENVUELVE TODO DENTRO DE <Provider> */}
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <LazyMotion features={loadMotionFeatures} strict>
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
          </LazyMotion>
        </ThemeProvider>
      </Provider>
    </BrowserRouter>
  </React.StrictMode>
);
