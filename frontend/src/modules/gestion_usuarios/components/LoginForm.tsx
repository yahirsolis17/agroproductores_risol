// src/modules/gestion_usuarios/components/LoginForm.tsx
import React from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../context/AuthContext';
import { handleBackendNotification } from '../../../global/utils/NotificationEngine';

const validationSchema = Yup.object({
  telefono: Yup.string()
    .matches(/^\d{10}$/, 'Debe tener exactamente 10 dígitos')
    .required('Teléfono requerido'),
  password: Yup.string().required('Contraseña requerida'),
});

const LoginForm: React.FC = () => {
  const { login } = useAuth();

  return (
    <Formik
      initialValues={{ telefono: '', password: '' }}
      validationSchema={validationSchema}
      onSubmit={async (values, { setSubmitting, setErrors }) => {
        try {
          await login(values.telefono, values.password);
        } catch (error: any) {
          const res = error?.response?.data;
          handleBackendNotification(res);
          setErrors({ telefono: ' ', password: ' ' });
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {({ isSubmitting }) => (
        <Form className="w-full max-w-sm mx-auto p-6 bg-white rounded-md shadow-md">
          <h2 className="text-2xl font-bold mb-4 text-center">Iniciar Sesión</h2>

          <div className="mb-4">
            <label className="block mb-1 font-semibold">Teléfono</label>
            <Field name="telefono" type="text" className="w-full p-2 border rounded" />
            <ErrorMessage name="telefono" component="div" className="text-red-600 text-sm mt-1" />
          </div>

          <div className="mb-4">
            <label className="block mb-1 font-semibold">Contraseña</label>
            <Field name="password" type="password" className="w-full p-2 border rounded" />
            <ErrorMessage name="password" component="div" className="text-red-600 text-sm mt-1" />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2 bg-blue-500 text-white font-semibold rounded"
          >
            {isSubmitting ? 'Cargando...' : 'Entrar'}
          </button>
        </Form>
      )}
    </Formik>
  );
};

export default LoginForm;
