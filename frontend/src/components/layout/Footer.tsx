import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="mx-4 mb-4 mt-auto rounded-[24px] border border-white/70 bg-white/70 px-6 py-4 text-center text-slate-500 shadow-[0_16px_48px_rgba(16,32,31,0.06)] backdrop-blur-xl">
      <p className="text-sm tracking-[0.08em]">
        &copy; {new Date().getFullYear()} Agroproductores Risol - Todos los derechos reservados
      </p>
    </footer>
  );
};

export default Footer;
