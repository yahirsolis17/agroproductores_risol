// src/modules/gestion_usuarios/pages/PermissionsDialog.tsx
import React, { useEffect, useState, forwardRef } from 'react';

interface PermissionsDialogProps {
  open: boolean;
  onClose: () => void;
  userId: number;
  currentPerms: string[];

}
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

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoadingAll(true);
      setLoadingUser(true);
      try {
        const [allRes, userPerms] = await Promise.all([
          permisoService.getAllPermisos(),
          permisoService.getUserPermisos(userId),
        ]);
        setAllPerms(allRes);
        setSelected(userPerms);
      } catch (err) {
        console.error(err);
        setAllPerms([]);
        setSelected([]);
      } finally {
        setLoadingAll(false);
        setLoadingUser(false);
      }
    })();
  }, [open, userId]);

  const toggle = (codename: string) =>
    setSelected(prev =>
      prev.includes(codename) ? prev.filter(p => p !== codename) : [...prev, codename]
    );

    const onSave = async () => {
      setSaving(true);
      try {
        const res = await permisoService.setUserPermisos(userId, selected);
        handleBackendNotification(res);
        const updatedPerms = await permisoService.getUserPermisos(userId);
        setSelected(updatedPerms);
        if (userId === currentUserId) dispatch(setPermissions(updatedPerms));
        onClose();
      } catch (err: any) {
        handleBackendNotification(err.response?.data);
      } finally {
        setSaving(false);
      }
    };

  const loading = loadingAll || loadingUser;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" TransitionComponent={Transition}>
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
