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
  helperText?: string;
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

  // 👇 ahora acepta una bandera para decidir si mantenemos abierto el autocomplete
  const closeMenu = (opts?: { keepAutoOpen?: boolean }) => {
    setMenu({ anchorEl: null, cat: null });
    if (!opts?.keepAutoOpen) {
      // si no abrimos un modal, liberamos el bloqueo para que pueda cerrarse al click afuera o con la “V”
      keepOpenRef.current = false;
    }
  };

  const handleEdit = () => {
    if (!menu.cat) return;
    setEditingCategory(menu.cat);
    setEditModalOpen(true);
    // cerramos menú pero dejamos keepOpenRef activo mientras el modal esté abierto
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
    // aquí ya podemos permitir que se cierre si el usuario hace click afuera
    closeMenu(); // keepAutoOpen = false
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
    // después de confirmar, ya no bloqueamos: que se pueda cerrar normal
    keepOpenRef.current = false;
    await loadAll();
  };

  const handleEditClose = () => {
    setEditModalOpen(false);
    setEditingCategory(null);
    // si cierra sin guardar, seguimos permitiendo que se cierre el autocomplete
    keepOpenRef.current = false;
  };

  const handleEditSuccess = async () => {
    setEditModalOpen(false);
    setEditingCategory(null);
    keepOpenRef.current = false;
    await loadAll();
  };

  return (
    <>
      <Autocomplete
        options={options}
        value={value}
        loading={loading}
        open={openList}
        onOpen={() => setOpenList(true)}
        onClose={(_e, reason) => {
          // ✅ siempre permitir cerrar con el icono “V” (toggle)
          if (reason === 'toggleInput') {
            keepOpenRef.current = false;
            setOpenList(false);
            return;
          }
          // Si hay menú/modal activos, no cerrar por click afuera/escape
          if (keepOpenRef.current) return;
          setOpenList(false);
        }}
        blurOnSelect={false}
        disableCloseOnSelect
        clearOnBlur={false}
        forcePopupIcon // asegura que la “V” esté visible para poder cerrar manualmente
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
            keepOpenRef.current = true; // mantener abierto mientras se crea
            setOpenList(true);
            return;
          }
          if ('is_active' in s && !s.is_active) return; // no seleccionable si está archivada
          onChangeId(s.id);
          setOpenList(false); // cerrar al seleccionar
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
          const anyOpt = option as any;

          // Opción "nueva categoría"
          if (anyOpt.id === -1) {
            return (
              <li
                {...props}
                onMouseDown={(e) => e.preventDefault()} // evita seleccionar/cerrar
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

          return (
            <li
              {...props}
              onMouseDown={(e) => {
                if (isArchived) {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <Tooltip title={isArchived ? 'Archivada · no seleccionable' : ''}>
                <span style={{ opacity: isArchived ? 0.55 : 1 }}>{cat.nombre}</span>
              </Tooltip>

              <IconButton
                size="small"
                onMouseDown={(e) => {
                  // NO dejar que el listbox interprete mousedown como selección/cierre
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
        <MenuItem onClick={handleEdit}>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Editar</ListItemText>
        </MenuItem>

        {menu.cat?.is_active ? (
          <MenuItem onClick={handleArchive}>
            <ListItemIcon><ArchiveIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Archivar</ListItemText>
          </MenuItem>
        ) : (
          <MenuItem onClick={handleRestore}>
            <ListItemIcon><UnarchiveIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Restaurar</ListItemText>
          </MenuItem>
        )}

        <MenuItem onClick={handleDelete}>
          <ListItemIcon><DeleteIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Eliminar</ListItemText>
        </MenuItem>
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
          // al cerrar el confirm, dejamos que el autocomplete pueda cerrarse si el usuario quiere
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
