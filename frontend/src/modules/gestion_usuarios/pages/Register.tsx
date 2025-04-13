import React from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../context/AuthContext';
import authService, { RegisterData } from '../services/authService';
import { handleBackendNotification } from '../../../global/utils/NotificationEngine';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const validationSchema = Yup.object({
  nombre: Yup.string().matches(/^[a-zA-ZñÑáéíóúÁÉÍÓÚ ]+$/, 'Solo letras y espacios').required('Nombre requerido'),
  apellido: Yup.string().matches(/^[a-zA-ZñÑáéíóúÁÉÍÓÚ ]+$/, 'Solo letras y espacios').required('Apellido requerido'),
  telefono: Yup.string().matches(/^\d{10}$/, 'Debe tener 10 dígitos').required('Teléfono requerido'),
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
    <div className="flex items-center justify-center min-h-screen  px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <Formik
          initialValues={{ nombre: '', apellido: '', telefono: '', role: 'usuario' }}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting }) => (
            <Form className="bg-white p-8 rounded-2xl shadow-soft space-y-4">
              <h2 className="text-2xl font-bold text-center text-primary-dark">Registrar Usuario</h2>

              <div>
                <Field
                  name="nombre"
                  placeholder="Nombre"
                  className="w-full px-4 py-2 border rounded-xl focus:outline-none"
                />
                <ErrorMessage name="nombre" component="div" className="text-red-600 text-sm mt-1" />
              </div>

              <div>
                <Field
                  name="apellido"
                  placeholder="Apellido"
                  className="w-full px-4 py-2 border rounded-xl focus:outline-none"
                />
                <ErrorMessage name="apellido" component="div" className="text-red-600 text-sm mt-1" />
              </div>

              <div>
                <Field
                  name="telefono"
                  placeholder="Teléfono"
                  className="w-full px-4 py-2 border rounded-xl focus:outline-none"
                />
                <ErrorMessage name="telefono" component="div" className="text-red-600 text-sm mt-1" />
              </div>

              <div>
                <Field
                  as="select"
                  name="role"
                  className="w-full px-4 py-2 border rounded-xl bg-white text-gray-700"
                >
                  <option value="usuario">Usuario</option>
                  <option value="admin">Administrador</option>
                </Field>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-light transition-all"
              >
                {isSubmitting ? 'Registrando...' : 'Registrar'}
              </button>
            </Form>
          )}
        </Formik>
      </motion.div>
    </div>
  );
};

export default Register;
