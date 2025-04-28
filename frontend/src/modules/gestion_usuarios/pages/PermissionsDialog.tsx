// src/modules/gestion_usuarios/pages/PermissionsDialog.tsx
import React, { useEffect, useState, forwardRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Button,
  CircularProgress,
  Box,
  Slide,
  SlideProps,
} from '@mui/material';
import permisoService, { Permiso } from '../services/permisoService';
import { handleBackendNotification } from '../../../global/utils/NotificationEngine';

interface PermissionsDialogProps {
  open: boolean;
  onClose: () => void;
  userId: number;
  currentPerms: string[];
}

const Transition = forwardRef(function Transition(
  props: SlideProps & { children: React.ReactElement<any, any> },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="down" ref={ref} {...props} />;
});

const PermissionsDialog: React.FC<PermissionsDialogProps> = ({
  open,
  onClose,
  userId,
  currentPerms,
}) => {
  const [allPerms, setAllPerms] = useState<Permiso[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // ───────── cargar permisos ─────────
  useEffect(() => {
    if (!open) return;

    setSelected(currentPerms);

    permisoService
      .getAllPermisos()
      .then(setAllPerms)
      .catch(err => {
        console.error('[PermissionsDialog] error cargando permisos:', err);
        setAllPerms([]);
      });
  }, [open, userId, currentPerms]);

  // ───────── toggle checkbox ─────────
  const toggle = (codename: string) =>
    setSelected(prev =>
      prev.includes(codename) ? prev.filter(p => p !== codename) : [...prev, codename],
    );

  // ───────── guardar ─────────
  const onSave = async () => {
    setLoading(true);
    try {
      await permisoService.setUserPermisos(userId, selected);

      handleBackendNotification({
        success: true,
        notification: {
          key: 'permisos_update',
          message: 'Permisos actualizados',
          type: 'success',
        },
      });
      onClose();
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      TransitionComponent={Transition}
    >
      <DialogTitle>Editar permisos</DialogTitle>

      <DialogContent dividers>
        {allPerms.length === 0 ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <FormGroup row className="gap-4">
            {allPerms.map(p => (
              <FormControlLabel
                key={p.codename}
                control={
                  <Checkbox
                    checked={selected.includes(p.codename)}
                    onChange={() => toggle(p.codename)}
                  />
                }
                label={p.nombre}
              />
            ))}
          </FormGroup>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          onClick={onSave}
          variant="contained"
          color="primary"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : null}
        >
          Guardar cambios
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PermissionsDialog;
