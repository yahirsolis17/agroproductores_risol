// src/modules/gestion_usuarios/pages/Register.tsx
import React from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import authService, { RegisterData } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { handleBackendNotification } from '../../../global/utils/NotificationEngine';

const validationSchema = Yup.object({
  nombre: Yup.string()
    .matches(/^[a-zA-ZñÑáéíóúÁÉÍÓÚ ]+$/, 'Solo letras y espacios')
    .required('Nombre requerido'),
  apellido: Yup.string()
    .matches(/^[a-zA-ZñÑáéíóúÁÉÍÓÚ ]+$/, 'Solo letras y espacios')
    .required('Apellido requerido'),
  telefono: Yup.string()
    .matches(/^\d{10}$/, 'Debe tener 10 dígitos')
    .required('Teléfono requerido'),
  role: Yup.string().required('Rol requerido'),
});

const Register: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (user?.role !== 'admin') {
    return <div className="p-6 text-center text-red-500">No tienes permiso para registrar usuarios.</div>;
  }

  const handleSubmit = async (values: RegisterData, { setSubmitting, setErrors }: any) => {
    try {
      const res = await authService.register(values);
      handleBackendNotification(res);
      navigate('/dashboard');
    } catch (error: any) {
      const res = error?.response?.data;
      handleBackendNotification(res);
      setErrors({ telefono: ' ', nombre: ' ', apellido: ' ' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Formik
        initialValues={{ nombre: '', apellido: '', telefono: '', role: 'usuario' }}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting }) => (
          <Form className="bg-white p-6 rounded shadow-md w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4 text-center">Registrar Usuario</h2>

            <Field name="nombre" placeholder="Nombre" className="w-full p-2 border rounded mb-2" />
            <ErrorMessage name="nombre" component="div" className="text-red-600 text-sm mb-2" />

            <Field name="apellido" placeholder="Apellido" className="w-full p-2 border rounded mb-2" />
            <ErrorMessage name="apellido" component="div" className="text-red-600 text-sm mb-2" />

            <Field name="telefono" placeholder="Teléfono" className="w-full p-2 border rounded mb-2" />
            <ErrorMessage name="telefono" component="div" className="text-red-600 text-sm mb-2" />

            <Field as="select" name="role" className="w-full p-2 border rounded mb-4">
              <option value="usuario">Usuario</option>
              <option value="admin">Administrador</option>
            </Field>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 bg-blue-500 text-white font-semibold rounded"
            >
              {isSubmitting ? 'Registrando...' : 'Registrar'}
            </button>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default Register;
