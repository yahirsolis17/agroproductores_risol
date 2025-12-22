import React, {
  useEffect,
  useState,
  forwardRef,
} from 'react';
import { useAppDispatch, useAppSelector } from '../../../global/store/store';
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
  Typography,
  Paper,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import DeselectIcon from '@mui/icons-material/Deselect';

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
  currentPerms,
}) => {
  /* ------------------------------------------------- */
  /*                       STATE                       */
  /* ------------------------------------------------- */
  const dispatch = useAppDispatch();
  const currentUserId = useAppSelector((s) => s.auth.user?.id);

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
    setSelected(currentPerms);

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
        // Ocultar módulos que no deben mostrarse en el diálogo
        const HIDDEN_MODULES = new Set(['Usuarios', 'Registro de actividad']);
        const filtered = (allRes || []).filter(p => !HIDDEN_MODULES.has(p.modulo));
        setAllPerms(filtered);
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
  }, [open, userId, currentPerms]);

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

  const toggleAll = () => {
    if (selected.length === allPerms.length) {
      setSelected([]);
    } else {
      setSelected(allPerms.map(p => p.codename));
    }
  };

  /* Agrupar permisos por módulo usando el campo 'modulo' */
  const groupedPerms = allPerms.reduce((acc, perm) => {
    const module = perm.modulo;
    if (!acc[module]) acc[module] = [];
    acc[module].push(perm);
    return acc;
  }, {} as Record<string, Permiso[]>);

  /* ------------------------------------------------- */
  /*                     RENDER                        */
  /* ------------------------------------------------- */
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      TransitionComponent={Transition}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Editar permisos</Typography>
          <Tooltip title={selected.length === allPerms.length ? "Deseleccionar todo" : "Seleccionar todo"}>
            <IconButton
              onClick={toggleAll}
              disabled={loading || saving}
              color={selected.length === allPerms.length ? "primary" : "default"}
            >
              {selected.length === allPerms.length ? <DeselectIcon /> : <SelectAllIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <Box py={2}>
            {delayedLoading ? (
              <Box display="grid" gridTemplateColumns="repeat(12, 1fr)" gap={2}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Box
                    key={i}
                    gridColumn={{
                      xs: 'span 12',
                      sm: 'span 6',
                      md: 'span 4'
                    }}
                  >
                    <Skeleton
                      variant="rectangular"
                      height={100}
                      sx={{ borderRadius: 1 }}
                    />
                  </Box>
                ))}
              </Box>
            ) : (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            )}
          </Box>
        ) : (
          <Box display="grid" gridTemplateColumns="repeat(12, 1fr)" gap={2}>
            {Object.entries(groupedPerms).map(([module, perms]) => (
              <Box
                key={module}
                gridColumn={{
                  xs: 'span 12',
                  sm: 'span 6',
                  md: 'span 4'
                }}
              >
                <Paper
                  elevation={0}
                  variant="outlined"
                  sx={{
                    p: 2,
                    height: '100%',
                    backgroundColor: 'background.paper',
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    color="primary"
                    sx={{
                      mb: 1,
                      textTransform: 'capitalize',
                      fontWeight: 'medium'
                    }}
                  >
                    {module}
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <FormGroup>
                    {perms.map((p) => (
                      <FormControlLabel
                        key={p.codename}
                        control={
                          <Checkbox
                            checked={selected.includes(p.codename)}
                            onChange={() => toggle(p.codename)}
                            size="small"
                          />
                        }
                        label={
                          <Typography variant="body2">
                            {p.nombre}
                          </Typography>
                        }
                        sx={{ mb: 0.5 }}
                      />
                    ))}
                  </FormGroup>
                </Paper>
              </Box>
            ))}
          </Box>
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
