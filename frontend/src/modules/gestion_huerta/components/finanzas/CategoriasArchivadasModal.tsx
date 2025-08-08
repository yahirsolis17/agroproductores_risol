// src/modules/gestion_huerta/components/finanzas/CategoriasArchivadasModal.tsx
import React, { useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Chip,
  Box,
  Typography,
} from '@mui/material';

import { useCategoriasInversion } from '../../hooks/useCategoriasInversion';
import { PermissionButton }        from '../../../../components/common/PermissionButton';
import ActionsMenu                 from '../common/ActionsMenu';

/* -------------------------------------------------------------------------- */
/* Props                                                                      */
/* -------------------------------------------------------------------------- */
interface CategoriasArchivadasModalProps {
  open: boolean;
  onClose: () => void;
}

/* -------------------------------------------------------------------------- */
/* Componente                                                                 */
/* -------------------------------------------------------------------------- */
const CategoriasArchivadasModal: React.FC<CategoriasArchivadasModalProps> = ({
  open,
  onClose,
}) => {
  const {
    categorias,
    loading,
    error,
    restore,
    removeCategoria,
    refetch,
  } = useCategoriasInversion();

  /* --- Sólo archivadas --- */
  const archivadas = categorias.filter(c => !c.is_active);

  /* --- Refetch al abrir --- */
  useEffect(() => {
    if (open) refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* ---------------------------------------------------------------------- */
  /* Render                                                                 */
  /* ---------------------------------------------------------------------- */
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Categorías archivadas</DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error" align="center" sx={{ my: 4 }}>
            {error}
          </Typography>
        ) : archivadas.length === 0 ? (
          <Typography align="center" sx={{ my: 4 }}>
            No hay categorías archivadas.
          </Typography>
        ) : (
          archivadas.map(cat => (
            <Box
              key={cat.id}
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              sx={{ p: 1, borderBottom: '1px solid #eee' }}
            >
              <Box display="flex" alignItems="center" gap={1}>
                <Chip label={cat.nombre} variant="outlined" color="warning" />
                {cat.archivado_en && (
                  <Typography variant="caption" color="text.secondary">
                    · Archivada el&nbsp;
                    {new Date(cat.archivado_en).toLocaleDateString('es-MX')}
                  </Typography>
                )}
              </Box>

              <ActionsMenu
                isArchived
                onArchiveOrRestore={() => restore(cat.id)}
                onDelete={() => removeCategoria(cat.id)}
                permArchiveOrRestore="archive_categoria_inversion"
                permDelete="delete_categoria_inversion"
                /* escondemos editar / finalizar */
                hideEdit
                hideFinalize
              />
            </Box>
          ))
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
        {/* Botón para crear desde aquí si tienes el permiso */}
        <PermissionButton
          perm="add_categoria_inversion"
          variant="contained"
          onClick={() => {
            /* Podrías abrir CategoriaFormModal desde el padre vía prop */
            onClose();
          }}
        >
          Nueva categoría
        </PermissionButton>
      </DialogActions>
    </Dialog>
  );
};

export default CategoriasArchivadasModal;
