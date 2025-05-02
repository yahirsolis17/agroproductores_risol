import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, Tabs, Tab, DialogContent, Box } from '@mui/material';

import HuertaFormModal from './HuertaFormModal';
import HuertaRentadaFormModal from '../huerta_rentada/HuertaRentadaFormModal';

import { HuertaCreateData } from '../../types/huertaTypes';
import { HuertaRentadaCreateData } from '../../types/huertaRentadaTypes';
import { Propietario } from '../../types/propietarioTypes';

type TipoTab = 'propia' | 'rentada';

interface Props {
  open: boolean;
  onClose: () => void;

  onSubmitPropia: (v: HuertaCreateData) => Promise<void>;
  onSubmitRentada: (v: HuertaRentadaCreateData) => Promise<void>;

  propietarios: Propietario[];
  onRegisterNewPropietario: () => void;

  editTarget?: { tipo: TipoTab; data: any };
}

const HuertaModalTabs: React.FC<Props> = (p) => {
  const [tab, setTab] = useState<TipoTab>('propia');
  const lock = Boolean(p.editTarget); // No cambiar pestaña si estamos en edición

  useEffect(() => {
    if (p.editTarget) setTab(p.editTarget.tipo);
    else               setTab('propia'); // ← reset al abrir para alta
  }, [p.editTarget, p.open]);

  return (
    <Dialog open={p.open} onClose={p.onClose} fullWidth maxWidth="sm">
      <DialogTitle className="text-primary-dark font-bold">
        {p.editTarget ? 'Editar Huerta' : 'Nueva Huerta'}
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="fullWidth"
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab value="propia" label="Huerta Propia" disabled={lock && tab !== 'propia'} />
          <Tab value="rentada" label="Huerta Rentada" disabled={lock && tab !== 'rentada'} />
        </Tabs>
      </Box>

      <DialogContent dividers sx={{ p: 0 }}>
        {tab === 'propia' ? (
          <HuertaFormModal
            open
            onClose={p.onClose}
            onSubmit={p.onSubmitPropia}
            propietarios={p.propietarios}
            onRegisterNewPropietario={p.onRegisterNewPropietario}
            isEdit={p.editTarget?.tipo === 'propia'}
            initialValues={p.editTarget?.data}
          />
        ) : (
          <HuertaRentadaFormModal
            open
            onClose={p.onClose}
            onSubmit={p.onSubmitRentada}
            propietarios={p.propietarios}
            onRegisterNewPropietario={p.onRegisterNewPropietario}
            isEdit={p.editTarget?.tipo === 'rentada'}
            initialValues={p.editTarget?.data}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default HuertaModalTabs;
