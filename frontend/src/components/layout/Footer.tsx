// src/components/layout/Footer.tsx
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-neutral-100 text-primary-light text-center py-4 mt-auto border-t border-neutral-200">
      <p className="text-sm tracking-wide">
        &copy; {new Date().getFullYear()} Agroproductores Risol · Todos los derechos reservados
      </p>
    </footer>
  );
};

export default Footer;
