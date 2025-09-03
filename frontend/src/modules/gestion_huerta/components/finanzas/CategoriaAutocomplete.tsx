// src/modules/gestion_huerta/components/finanzas/CategoriaAutocomplete.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  TextField,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
} from '@mui/material';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import Popper from '@mui/material/Popper';
import { styled, lighten, darken } from '@mui/system';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Archive as ArchiveIcon,
  Unarchive as UnarchiveIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { CategoriaInversion } from '../../types/categoriaInversionTypes';
import { categoriaInversionService } from '../../services/categoriaInversionService';
import useCategoriasInversion from '../../hooks/useCategoriasInversion';
import CategoriaInversionEditModal from './CategoriaInversionEditModal';
import { useAuth } from '../../../gestion_usuarios/context/AuthContext'; // 👈 añadido

/* ---------- Encabezado por grupo ---------- */
const GroupHeader = styled('div')(({ theme }) => ({
  position: 'sticky',
  top: '-8px',
  padding: '4px 10px',
  color: theme.palette.primary.main,
  backgroundColor: lighten(theme.palette.primary.light, 0.85),
  ...(theme as any).applyStyles?.('dark', {
    backgroundColor: darken(theme.palette.primary.main, 0.8),
  }),
}));
const GroupItems = styled('ul')({ padding: 0 });

/* ---------- Popper del Autocomplete con z-index elevado ---------- */
const PopperHighZ = styled(Popper)(({ theme }) => {
  const base = (theme as any)?.zIndex?.modal ?? 1300;
  return { zIndex: base + 1 };
});

type Option = CategoriaInversion | { id: -1; nombre: 'Registrar nueva categoría' };
const filter = createFilterOptions<Option>();

type Props = {
  valueId: number | null;
  onChangeId: (id: number | null) => void;
  label?: string;
  error?: boolean;
  helperText?: React.ReactNode; // ← acepta boolean|string|nodo, compatible con MUI y evita TS2322 en consumidores
};

const CategoriaAutocomplete: React.FC<Props> = ({
  valueId,
  onChangeId,
  label = 'Categoría',
  error,
  helperText,
}) => {
  const [list, setList] = useState<CategoriaInversion[]>([]);
  const [loading, setLoading] = useState(false);

  // Control de apertura del listbox
  const [openList, setOpenList] = useState(false);
  const keepOpenRef = useRef(false); // true mientras menú o modal estén activos

  const { archive, restore, removeCategoria } = useCategoriasInversion();

  const loadAll = async () => {
    setLoading(true);
    try {
      const { categorias } = await categoriaInversionService.listAll(1, 1000);
      setList(categorias.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  // Cuando se crea una categoría desde fuera, auto-inyectar + auto-seleccionar
  useEffect(() => {
    const handler = (e: any) => {
      const nueva: CategoriaInversion | undefined = e?.detail;
      if (!nueva) return;
      setList(prev => {
        const exists = prev.some(c => c.id === nueva.id);
        const next = exists ? prev.map(c => (c.id === nueva.id ? nueva : c)) : [nueva, ...prev];
        return next.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
      });
      onChangeId(nueva.id);
      setOpenList(false); // cerrar al autoseleccionar
      keepOpenRef.current = false;
    };
    window.addEventListener('categoria-created', handler as any);
    return () => window.removeEventListener('categoria-created', handler as any);
  }, [onChangeId]);

  const newOption: Option = { id: -1, nombre: 'Registrar nueva categoría' };

  const options: (Option & { firstLetter?: string })[] = useMemo(() => {
    return [newOption, ...list].map((c) => {
      if ('id' in c && c.id !== -1) {
        const first = (c.nombre?.[0] || '').toUpperCase();
        return { ...c, firstLetter: /[0-9]/.test(first) ? '0-9' : first };
      }
      return c as any;
    }) as any;
  }, [list]);

  const value: Option | null = useMemo(() => {
    if (!valueId) return null;
    return (list.find(c => c.id === valueId) as Option) || null;
  }, [valueId, list]);

  /* ---------- Menú contextual y modales ---------- */
  const [menu, setMenu] = useState<{ anchorEl: HTMLElement | null; cat: CategoriaInversion | null }>({
    anchorEl: null,
    cat: null,
  });

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoriaInversion | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<CategoriaInversion | null>(null);

  const openMenu = (el: HTMLElement, cat: CategoriaInversion) => {
    keepOpenRef.current = true; // mantener abierto mientras el menú esté activo
    setOpenList(true);
    setMenu({ anchorEl: el, cat });
  };

  const closeMenu = (opts?: { keepAutoOpen?: boolean }) => {
    setMenu({ anchorEl: null, cat: null });
    if (!opts?.keepAutoOpen) {
      keepOpenRef.current = false;
    }
  };

  const handleEdit = () => {
    if (!menu.cat) return;
    setEditingCategory(menu.cat);
    setEditModalOpen(true);
    closeMenu({ keepAutoOpen: true });
  };

  const handleDelete = () => {
    if (!menu.cat) return;
    setDeletingCategory(menu.cat);
    setConfirmOpen(true);
    closeMenu({ keepAutoOpen: true });
  };

  const handleArchive = async () => {
    if (!menu.cat) return;
    await archive(menu.cat.id);
    await loadAll();
    closeMenu();
  };

  const handleRestore = async () => {
    if (!menu.cat) return;
    await restore(menu.cat.id);
    await loadAll();
    closeMenu();
  };

  const confirmDelete = async () => {
    if (!deletingCategory) return;
    await removeCategoria(deletingCategory.id);
    if (valueId === deletingCategory.id) onChangeId(null);
    setConfirmOpen(false);
    setDeletingCategory(null);
    keepOpenRef.current = false;
    await loadAll();
  };

  const handleEditClose = () => {
    setEditModalOpen(false);
    setEditingCategory(null);
    keepOpenRef.current = false;
  };

  const handleEditSuccess = async () => {
    setEditModalOpen(false);
    setEditingCategory(null);
    keepOpenRef.current = false;
    await loadAll();
  };

  // 👇 permisos (solo afectan habilitado/tooltip; no ocultan nada)
  const { hasPerm, user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const canEdit    = isAdmin || hasPerm('change_categoriainversion');
  const canArchive = isAdmin || hasPerm('archive_categoriainversion');
  const canRestore = isAdmin || hasPerm('restore_categoriainversion');
  const canDelete  = isAdmin || hasPerm('delete_categoriainversion');

  return (
    <>
      <Autocomplete
        options={options}
        value={value}
        loading={loading}
        open={openList}
        onOpen={() => setOpenList(true)}
        onClose={(_e, reason) => {
          if (reason === 'toggleInput') {
            keepOpenRef.current = false;
            setOpenList(false);
            return;
          }
          if (keepOpenRef.current) return;
          setOpenList(false);
        }}
        blurOnSelect={false}
        disableCloseOnSelect
        clearOnBlur={false}
        forcePopupIcon
        slotProps={{
          popper: { component: PopperHighZ as any },
        }}
        groupBy={(opt) =>
          (typeof (opt as any).id === 'number' && (opt as any).id !== -1 ? (opt as any).firstLetter || '' : '')
        }
        filterOptions={(opts, params) => {
          const fixed = opts.filter(o => (o as any).id === -1);
          const cats  = opts.filter(o => (o as any).id !== -1) as CategoriaInversion[];
          const filtered = filter(cats as any, params).sort((a: any, b: any) =>
            a.nombre.localeCompare(b.nombre, 'es')
          );
          return [...(fixed as any), ...(filtered as any)];
        }}
        getOptionLabel={(opt) =>
          (opt as any).id === -1 ? 'Registrar nueva categoría' : (opt as CategoriaInversion).nombre
        }
        isOptionEqualToValue={(o, v) => (o as any).id === (v as any).id}
        onChange={(_, sel) => {
          if (!sel) {
            onChangeId(null);
            setOpenList(false);
            keepOpenRef.current = false;
            return;
          }
          const s: any = sel;
          if (s.id === -1) {
            window.dispatchEvent(new CustomEvent('open-create-categoria'));
            keepOpenRef.current = true;
            setOpenList(true);
            return;
          }
          if ('is_active' in s && !s.is_active) return; // no seleccionable si está archivada
          onChangeId(s.id);
          setOpenList(false);
          keepOpenRef.current = false;
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            error={error}
            helperText={helperText}
          />
        )}
        renderOption={(props, option) => {
          const añopt = option as any;

          // Opción "nueva categoría"
          if (añopt.id === -1) {
            return (
              <li
                {...props}
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.dispatchEvent(new CustomEvent('open-create-categoria'));
                  keepOpenRef.current = true;
                  setOpenList(true);
                }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <AddIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Registrar nueva categoría" />
              </li>
            );
          }

          const cat = option as CategoriaInversion;
          const isArchived = !cat.is_active;

          // Tomamos handlers internos de MUI
          const { onMouseDown: muiMouseDown, onClick: muiClick, ...liProps } = props as any;

          return (
            <li
              {...liProps}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
              onMouseDown={(e) => {
                if (isArchived) {
                  e.preventDefault();
                  e.stopPropagation();
                  return;
                }
                muiMouseDown?.(e);
              }}
              onClick={(e) => {
                if (isArchived) {
                  e.preventDefault();
                  e.stopPropagation();
                  return;
                }
                muiClick?.(e);
              }}
            >
              {/* Área de texto */}
              <Tooltip title={isArchived ? 'Archivada · no seleccionable' : ''}>
                <span
                  onMouseDown={(e) => {
                    if (isArchived) { e.preventDefault(); e.stopPropagation(); }
                  }}
                  onClick={(e) => {
                    if (isArchived) { e.preventDefault(); e.stopPropagation(); }
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    opacity: isArchived ? 0.65 : 1,
                    pointerEvents: 'auto',
                  }}
                >
                  {cat.nombre}
                  {isArchived && <Chip label="Archivada" size="small" color="warning" />}
                </span>
              </Tooltip>

              {/* Botón ⋮ SIEMPRE activo */}
              <IconButton
                size="small"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openMenu(e.currentTarget as HTMLElement, cat);
                }}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </li>
          );
        }}
        renderGroup={(params) => (
          <li key={params.key}>
            <GroupHeader>{params.group}</GroupHeader>
            <GroupItems>{params.children}</GroupItems>
          </li>
        )}
      />

      {/* Menú contextual */}
      <Menu
        anchorEl={menu.anchorEl}
        open={Boolean(menu.anchorEl)}
        onClose={() => closeMenu()}
        anchorOrigin={{ vertical: 'center', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        MenuListProps={{ autoFocusItem: false }}
        slotProps={{
          paper: {
            sx: (theme) => {
              const base = (theme as any)?.zIndex?.modal ?? 1300;
              return { zIndex: base + 2 };
            },
          },
        }}
      >
        {/* Editar */}
        <Tooltip title={(!canEdit || !menu.cat?.is_active) ? (!canEdit ? 'No tienes permiso' : 'No disponible en archivadas') : ''}>
          <span>
            <MenuItem onClick={handleEdit} disabled={!canEdit || !menu.cat?.is_active}>
              <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Editar</ListItemText>
            </MenuItem>
          </span>
        </Tooltip>

        {/* Archivar / Restaurar */}
        {menu.cat?.is_active ? (
          <Tooltip title={!canArchive ? 'No tienes permiso' : ''}>
            <span>
              <MenuItem onClick={handleArchive} disabled={!canArchive}>
                <ListItemIcon><ArchiveIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Archivar</ListItemText>
              </MenuItem>
            </span>
          </Tooltip>
        ) : (
          <Tooltip title={!canRestore ? 'No tienes permiso' : ''}>
            <span>
              <MenuItem onClick={handleRestore} disabled={!canRestore}>
                <ListItemIcon><UnarchiveIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Restaurar</ListItemText>
              </MenuItem>
            </span>
          </Tooltip>
        )}

        {/* Eliminar */}
        <Tooltip title={(!canDelete || menu.cat?.is_active) ? (menu.cat?.is_active ? 'Archiva antes de eliminar' : 'No tienes permiso') : ''}>
          <span>
            <MenuItem onClick={handleDelete} disabled={!canDelete || menu.cat?.is_active}>
              <ListItemIcon><DeleteIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Eliminar</ListItemText>
            </MenuItem>
          </span>
        </Tooltip>
      </Menu>

      {/* Modal editar */}
      <CategoriaInversionEditModal
        open={editModalOpen}
        categoria={editingCategory}
        onClose={handleEditClose}
        onSuccess={handleEditSuccess}
      />

      {/* Confirmar eliminación */}
      <Dialog
        open={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          keepOpenRef.current = false;
        }}
      >
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          ¿Eliminar permanentemente la categoría “{deletingCategory?.nombre}”?
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setConfirmOpen(false);
              keepOpenRef.current = false;
            }}
          >
            Cancelar
          </Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CategoriaAutocomplete;
