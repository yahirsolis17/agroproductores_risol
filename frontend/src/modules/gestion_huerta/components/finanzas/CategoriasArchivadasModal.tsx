// ============================================================================
// src/modules/gestion_huerta/components/finanzas/CategoriasArchivadasModal.tsx
// ============================================================================
import React, { useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, CircularProgress, Chip, Box, Typography } from '@mui/material';
import useCategoriasInversion from '../../hooks/useCategoriasInversion';
import ActionsMenu from '../common/ActionsMenu';

interface CategoriasArchivadasModalProps { open: boolean; onClose: () => void; }

const CategoriasArchivadasModal: React.FC<CategoriasArchivadasModalProps> = ({ open, onClose }) => {
  const { categorias, loading, error, restore, removeCategoria, refetch } = useCategoriasInversion();
  const archivadas = categorias.filter(c => !c.is_active);

  useEffect(() => { if (open) refetch(); }, [open]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Categorías archivadas</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box display="flex" justifyContent="center" my={4}><CircularProgress /></Box>
        ) : error ? (
          <Typography color="error" align="center" sx={{ my: 4 }}>{error}</Typography>
        ) : archivadas.length === 0 ? (
          <Typography align="center" sx={{ my: 4 }}>No hay categorías archivadas.</Typography>
        ) : (
          archivadas.map(cat => (
            <Box key={cat.id} display="flex" alignItems="center" justifyContent="space-between" sx={{ p: 1, borderBottom: '1px solid #eee' }}>
              <Box display="flex" alignItems="center" gap={1}>
                <Chip label={cat.nombre} variant="outlined" color="warning" />
                {cat.archivado_en && (<Typography variant="caption" color="text.secondary">· Archivada el {new Date(cat.archivado_en).toLocaleDateString('es-MX')}</Typography>)}
              </Box>
              <ActionsMenu isArchived onArchiveOrRestore={() => restore(cat.id)} onDelete={() => removeCategoria(cat.id)} permArchiveOrRestore="archive_categoria_inversion" permDelete="delete_categoria_inversion" hideEdit hideFinalize />
            </Box>
          ))
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default CategoriasArchivadasModal;
