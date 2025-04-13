// src/modules/gestion_usuarios/pages/Login.tsx
import React, { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import LoginForm from '../components/LoginForm';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

const Login: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [errorMessage] = useState('');
  const location = useLocation();

  if (isAuthenticated && !location.state?.fromLoginRedirect) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100 px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="bg-white shadow-2xl rounded-2xl p-8 w-full max-w-md border border-slate-200"
      >
        {errorMessage && (
          <div className="mb-4 text-red-600 font-semibold text-center">{errorMessage}</div>
        )}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-green-700">Agrosproductores Risol</h1>
          <p className="text-gray-500 text-sm mt-1">Ingresa con tu cuenta</p>
        </div>
        <LoginForm />
      </motion.div>
    </div>
  );
};

export default Login;
