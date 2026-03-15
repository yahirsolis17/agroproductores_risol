import React, { useEffect, useState, forwardRef } from 'react';
import { setPermissions } from '../../../global/store/authSlice';
import { useAppDispatch, useAppSelector } from '../../../global/store/store';
import { filterForDisplay } from '../../../global/utils/uiTransforms';
import permisoService, { Permiso } from '../services/permisoService';

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
  Chip,
  Stack,
  alpha,
  useTheme,
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

type GroupedPerms = Record<string, Record<string, Permiso[]>>;

const AREA_DESCRIPTIONS: Record<string, string> = {
  'Gestion Huerta': 'Permisos para huertas, temporadas, cosechas, ventas, inversiones y propietarios.',
  'Gestion Bodega': 'Permisos para recepciones, empaque, camiones, inventarios, gastos y reportes.',
  'Administracion del sistema': 'Permisos relacionados con configuracion y control administrativo del sistema.',
};

const PermissionsDialog: React.FC<PermissionsDialogProps> = ({
  open,
  onClose,
  userId,
  currentPerms,
}) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const currentUserId = useAppSelector((s) => s.auth.user?.id);

  const [allPerms, setAllPerms] = useState<Permiso[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [loadingUser, setLoadingUser] = useState(false);
  const [saving, setSaving] = useState(false);
  const [delayedLoading, setDelayedLoading] = useState(false);

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
        const hiddenModules = new Set(['Usuarios', 'Registro de actividad']);
        const filtered = filterForDisplay(allRes || [], (perm) => !hiddenModules.has(perm.modulo));
        setAllPerms(filtered);
        setSelected(userPerms);
      } catch {
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

  const toggle = (codename: string) =>
    setSelected((prev) =>
      prev.includes(codename)
        ? filterForDisplay(prev, (perm) => perm !== codename)
        : [...prev, codename],
    );

  const onSave = async () => {
    setSaving(true);
    try {
      await permisoService.setUserPermisos(userId, selected);
      const updated = await permisoService.getUserPermisos(userId);
      setSelected(updated);

      if (userId === currentUserId) dispatch(setPermissions(updated));

      onClose();
    } catch {
      // Backend notifications already explain the failure.
    } finally {
      setSaving(false);
    }
  };

  const loading = loadingAll || loadingUser;

  const toggleAll = () => {
    if (selected.length === allPerms.length) {
      setSelected([]);
    } else {
      setSelected(allPerms.map((perm) => perm.codename));
    }
  };

  const groupedPerms = allPerms.reduce((acc, perm) => {
    const area = perm.area || 'General';
    const module = perm.modulo;
    if (!acc[area]) acc[area] = {};
    if (!acc[area][module]) acc[area][module] = [];
    acc[area][module].push(perm);
    return acc;
  }, {} as GroupedPerms);

  const totalSelected = selected.length;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      TransitionComponent={Transition}
    >
      <DialogTitle>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={2}>
          <Box>
            <Typography variant="h6">Editar permisos del usuario</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Los permisos estan organizados por areas del sistema y por secciones funcionales para que el administrador los entienda mejor.
            </Typography>
          </Box>
          <Tooltip title={selected.length === allPerms.length ? 'Deseleccionar todo' : 'Seleccionar todo'}>
            <IconButton
              onClick={toggleAll}
              disabled={loading || saving}
              color={selected.length === allPerms.length ? 'primary' : 'default'}
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
                    <Skeleton variant="rectangular" height={132} sx={{ borderRadius: 1.5 }} />
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
          <Stack spacing={3}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
                p: 1.5,
                borderRadius: 2,
                backgroundColor: alpha(theme.palette.primary.main, 0.05),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.14)}`,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Asigna solo lo necesario para el trabajo del usuario. Aunque aqui se activen permisos, el backend sigue validando todas las acciones.
              </Typography>
              <Chip
                color="primary"
                variant="outlined"
                label={`${totalSelected} permiso${totalSelected === 1 ? '' : 's'} seleccionado${totalSelected === 1 ? '' : 's'}`}
              />
            </Box>

            {Object.entries(groupedPerms).map(([area, modules]) => {
              const areaPerms = Object.values(modules).flat();
              const selectedInArea = areaPerms.filter((perm) => selected.includes(perm.codename)).length;

              return (
                <Paper
                  key={area}
                  elevation={0}
                  variant="outlined"
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    borderColor: alpha(theme.palette.divider, 0.4),
                    background: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.98)} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
                  }}
                >
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', md: 'center' }}
                    flexDirection={{ xs: 'column', md: 'row' }}
                    gap={1.5}
                    mb={2}
                  >
                    <Box>
                      <Typography variant="h6" color="primary" sx={{ fontWeight: 800 }}>
                        {area}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {AREA_DESCRIPTIONS[area] || 'Permisos agrupados por modulo funcional.'}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      color="primary"
                      variant="outlined"
                      label={`${selectedInArea}/${areaPerms.length} asignados`}
                    />
                  </Box>

                  <Divider sx={{ mb: 2.5 }} />

                  <Box display="grid" gridTemplateColumns="repeat(12, 1fr)" gap={2}>
                    {Object.entries(modules).map(([module, perms]) => (
                      <Box
                        key={`${area}-${module}`}
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
                            borderRadius: 2.5,
                            borderColor: alpha(theme.palette.divider, 0.35),
                            backgroundColor: alpha(theme.palette.background.paper, 0.96),
                          }}
                        >
                          <Box display="flex" justifyContent="space-between" alignItems="center" gap={1} mb={1}>
                            <Typography
                              variant="subtitle1"
                              color="text.primary"
                              sx={{
                                textTransform: 'none',
                                fontWeight: 700
                              }}
                            >
                              {module}
                            </Typography>
                            <Chip
                              size="small"
                              label={`${perms.filter((perm) => selected.includes(perm.codename)).length}/${perms.length}`}
                              sx={{ height: 22 }}
                            />
                          </Box>

                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                            Acciones disponibles para esta seccion.
                          </Typography>
                          <Divider sx={{ mb: 1.5 }} />

                          <FormGroup>
                            {perms.map((perm) => (
                              <FormControlLabel
                                key={perm.codename}
                                control={
                                  <Checkbox
                                    checked={selected.includes(perm.codename)}
                                    onChange={() => toggle(perm.codename)}
                                    size="small"
                                  />
                                }
                                label={
                                  <Box sx={{ py: 0.25 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {perm.nombre}
                                    </Typography>
                                    {!!perm.descripcion && (
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{ display: 'block', mt: 0.25, lineHeight: 1.4 }}
                                      >
                                        {perm.descripcion}
                                      </Typography>
                                    )}
                                  </Box>
                                }
                                sx={{
                                  alignItems: 'flex-start',
                                  mb: 0.75,
                                  mx: 0,
                                  py: 0.25,
                                  borderRadius: 1.5,
                                }}
                              />
                            ))}
                          </FormGroup>
                        </Paper>
                      </Box>
                    ))}
                  </Box>
                </Paper>
              );
            })}
          </Stack>
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
