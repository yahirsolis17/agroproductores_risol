// src/modules/gestion_usuarios/pages/PermissionsDialog.tsx
import React, { useEffect, useState, forwardRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../global/store/store';
import { setPermissions } from '../../../global/store/authSlice';
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
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const currentUserId = useSelector((s: RootState) => s.auth.user?.id);

  const [allPerms, setAllPerms] = useState<Permiso[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [loadingUser, setLoadingUser] = useState(false);
  const [saving, setSaving] = useState(false);

  /** Carga inicial: lista de todos los permisos y permisos del usuario */
  useEffect(() => {
    if (!open) return;

    const load = async () => {
      setLoadingAll(true);
      setLoadingUser(true);
      try {
        const [all, userPerms] = await Promise.all([
          permisoService.getAllPermisos(),
          permisoService.getUserPermisos(userId),
        ]);
        setAllPerms(all);
        setSelected(userPerms);
      } catch (err) {
        console.error('[PermissionsDialog] carga inicial:', err);
        setAllPerms([]);
        setSelected([]);
      } finally {
        setLoadingAll(false);
        setLoadingUser(false);
      }
    };

    load();
  }, [open, userId]);

  /** Toggle de un permiso en local */
  const toggle = (codename: string) =>
    setSelected(prev =>
      prev.includes(codename) ? prev.filter(p => p !== codename) : [...prev, codename]
    );

  /** Guardar cambios: asigna en el back, luego recarga permisos del usuario */
  const onSave = async () => {
    setSaving(true);
    try {
      await permisoService.setUserPermisos(userId, selected);

      // 🔄 Recarga los permisos **actualizados** del usuario
      const updatedPerms = await permisoService.getUserPermisos(userId);
      setSelected(updatedPerms);

      // Si edité mis propios permisos, actualizo el store global
      if (userId === currentUserId) {
        dispatch(setPermissions(updatedPerms));
      }

      handleBackendNotification({
        success: true,
        notification: {
          key: 'permisos_update',
          message: 'Permisos actualizados',
          type: 'success',
        },
      });

      // Finalmente cerramos el modal
      onClose();
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
    } finally {
      setSaving(false);
    }
  };

  const loading = loadingAll || loadingUser;

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
        {loading ? (
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
        <Button onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button
          onClick={onSave}
          variant="contained"
          disabled={saving || loading}
          startIcon={saving ? <CircularProgress size={16} /> : null}
        >
          Guardar cambios
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PermissionsDialog;
