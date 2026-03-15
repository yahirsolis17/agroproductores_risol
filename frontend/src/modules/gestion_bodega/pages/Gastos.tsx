import { useEffect } from 'react';
import GastosPageContent from '../components/gastos/GastosPageContent';
import { useGastos } from '../hooks/useGastos';
import { useAppSelector } from '../../../global/store/store';

export default function Gastos() {
  const { syncFromTablero } = useGastos();
  const { bodegaId, temporadaId, selectedWeekId } = useAppSelector((s) => s.tableroBodega);

  useEffect(() => {
    syncFromTablero({
      bodegaId: bodegaId ?? undefined,
      temporadaId: temporadaId ?? undefined,
      semanaId: selectedWeekId ?? undefined,
    });
  }, [bodegaId, temporadaId, selectedWeekId, syncFromTablero]);

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 overflow-hidden">
        <GastosPageContent />
      </div>
    </div>
  );
}
