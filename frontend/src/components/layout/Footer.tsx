import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-200 text-gray-600 py-3 text-center">
      <p className="text-sm">
        &copy; {new Date().getFullYear()} Agroproductores Risol. Todos los derechos reservados.
      </p>
    </footer>
  );
};

export default Footer;
