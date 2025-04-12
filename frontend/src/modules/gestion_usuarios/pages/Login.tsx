// src/modules/gestion_usuarios/pages/Login.tsx
import React, { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import LoginForm from '../components/LoginForm';
import { useAuth } from '../context/AuthContext';

const Login: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [errorMessage] = useState('');
  const location = useLocation();

  /*  Solo redirige al dashboard si el usuario sigue
      en /login después de autenticarse.  */
      if (isAuthenticated && !location.state?.fromLoginRedirect) {
        return <Navigate to="/dashboard" replace />;
      }

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div>
        {errorMessage && (
          <div className="mb-4 text-red-600 font-semibold text-center">
            {errorMessage}
          </div>
        )}
        <LoginForm/>
      </div>
    </div>
  );
};

export default Login;
