import React, {
  useEffect,
  useState,
  forwardRef,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../global/store/store';
import { setPermissions } from '../../../global/store/authSlice';
import permisoService, { Permiso } from '../services/permisoService';
import { handleBackendNotification } from '../../../global/utils/NotificationEngine';

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
  Skeleton,
  Slide,
  SlideProps,
} from '@mui/material';

const Transition = forwardRef(function Transition(
  props: SlideProps & { children: React.ReactElement<any, any> },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="down" ref={ref} {...props} />;
});

interface PermissionsDialogProps {
  open: boolean;
  onClose: () => void;
  userId: number;
  currentPerms: string[];
}

const PermissionsDialog: React.FC<PermissionsDialogProps> = ({
  open,
  onClose,
  userId,
}) => {
  /* ------------------------------------------------- */
  /*                       STATE                       */
  /* ------------------------------------------------- */
  const dispatch = useDispatch<AppDispatch>();
  const currentUserId = useSelector((s: RootState) => s.auth.user?.id);

  const [allPerms, setAllPerms] = useState<Permiso[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [loadingUser, setLoadingUser] = useState(false);
  const [saving, setSaving] = useState(false);

  /* Skeleton delay — mismos 400 ms que en UsersAdmin */
  const [delayedLoading, setDelayedLoading] = useState(false);

  /* ------------------------------------------------- */
  /*                    EFFECTS                        */
  /* ------------------------------------------------- */
  useEffect(() => {
    if (!open) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    (async () => {
      setLoadingAll(true);
      setLoadingUser(true);
      timer = setTimeout(() => setDelayedLoading(true), 400);

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
        clearTimeout(timer);
        setLoadingAll(false);
        setLoadingUser(false);
        setDelayedLoading(false);
      }
    })();

    return () => clearTimeout(timer);
  }, [open, userId]);

  /* ------------------------------------------------- */
  /*                     HANDLERS                      */
  /* ------------------------------------------------- */
  const toggle = (codename: string) =>
    setSelected((prev) =>
      prev.includes(codename)
        ? prev.filter((p) => p !== codename)
        : [...prev, codename],
    );

  const onSave = async () => {
    setSaving(true);
    try {
      const res = await permisoService.setUserPermisos(userId, selected);
      handleBackendNotification(res);

      const updated = await permisoService.getUserPermisos(userId);
      setSelected(updated);

      /* si edito mis propios permisos → sincronizar Redux */
      if (userId === currentUserId) dispatch(setPermissions(updated));

      onClose();
    } catch (err: any) {
      handleBackendNotification(err.response?.data);
    } finally {
      setSaving(false);
    }
  };

  const loading = loadingAll || loadingUser;

  /* ------------------------------------------------- */
  /*                     RENDER                        */
  /* ------------------------------------------------- */
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
          /* Skeleton list */
          <Box py={2}>
            {delayedLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Skeleton
                  key={i}
                  variant="rectangular"
                  height={32}
                  sx={{ mb: 1, borderRadius: 1 }}
                />
              ))
            ) : (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            )}
          </Box>
        ) : (
          <FormGroup row className="gap-4">
            {allPerms.map((p) => (
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
