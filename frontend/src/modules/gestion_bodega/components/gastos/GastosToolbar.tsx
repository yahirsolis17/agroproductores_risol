

export default function GastosToolbar({ activeTab }: { activeTab: 'MADERA' | 'CONSUMOS' }) {
  // Aquí se podrían agregar funciones de 'onAdd' mandando abrir Modales
  return (
    <div className="flex justify-between items-center p-4 bg-white border-b border-gray-200 shrink-0">
      <div>
        <h2 className="text-lg font-medium text-gray-800">
          {activeTab === 'MADERA' ? "Historial de Compras de Madera" : "Gastos Varios y Consumibles"}
        </h2>
        <p className="text-sm text-gray-500">
          {activeTab === 'MADERA' 
             ? "Registro de proveedores, montos, pagos y stock inicial de cajas." 
             : "Registro de facturas para marcadores, ligas, rafia, etc."}
        </p>
      </div>
      
      <div className="flex gap-2">
         {/* Botones de captura de gastos */}
         <button 
           className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
           onClick={() => alert('Función de agregar aún no implementada por completo')}
         >
           {activeTab === 'MADERA' ? "+ Comprar Cajas" : "+ Añadir Gasto"}
         </button>
      </div>
    </div>
  );
}
