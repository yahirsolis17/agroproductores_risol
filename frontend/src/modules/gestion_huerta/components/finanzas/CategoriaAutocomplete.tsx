import React, { useEffect, useMemo, useState } from 'react';
import {
  TextField, IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, Button
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Archive as ArchiveIcon,
  Unarchive as UnarchiveIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { styled, lighten, darken } from '@mui/system';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import { CategoriaInversion } from '../../types/categoriaInversionTypes';
import { categoriaInversionService } from '../../services/categoriaInversionService';
import useCategoriasInversion from '../../hooks/useCategoriasInversion';

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
  helperText
}) => {
  const [list, setList] = useState<CategoriaInversion[]>([]);
  const [loading, setLoading] = useState(false);

  // Control explícito del popup para que NO se cierre al abrir menús/diálogos
  const [popupOpen, setPopupOpen] = useState(false);

  // Menú contextual
  const [menu, setMenu] = useState<{ anchorEl: HTMLElement | null; cat: CategoriaInversion | null }>({
    anchorEl: null,
    cat: null
  });

  // Diálogos
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editValue, setEditValue] = useState('');

  const { archive, restore, removeCategoria, editCategoria } = useCategoriasInversion();

  // Cargar todas (activas + archivadas) orden alfabético
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

  // Escucha cuando InversionFormModal crea una nueva categoría (evento global)
  useEffect(() => {
    const onCreated = (ev: any) => {
      const nueva: CategoriaInversion | undefined = ev?.detail;
      if (!nueva) return;
      setList(prev => {
        const exists = prev.some(c => c.id === nueva.id);
        const next = exists ? prev.map(c => (c.id === nueva.id ? nueva : c)) : [nueva, ...prev];
        next.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
        return next;
      });
      // Seleccionarla sin cerrar el popup
      onChangeId(nueva.id);
      setPopupOpen(true);
    };
    window.addEventListener('categoria-created', onCreated as any);
    return () => window.removeEventListener('categoria-created', onCreated as any);
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

  const openMenu = (e: React.MouseEvent<HTMLElement>, cat: CategoriaInversion) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ anchorEl: e.currentTarget, cat });
    // mantener el popup abierto mientras el menú está visible
    setPopupOpen(true);
  };
  const closeMenu = () => setMenu({ anchorEl: null, cat: null });

  // Acciones con actualización en caliente (sin recargar toda la lista)
  const doArchive = async () => {
    if (!menu.cat) return;
    await archive(menu.cat.id);
    setList(prev => prev.map(c => c.id === menu.cat!.id ? { ...c, is_active: false, archivado_en: new Date().toISOString() } : c));
    closeMenu();
    setPopupOpen(true);
  };

  const doRestore = async () => {
    if (!menu.cat) return;
    await restore(menu.cat.id);
    setList(prev => prev.map(c => c.id === menu.cat!.id ? { ...c, is_active: true, archivado_en: null } : c));
    closeMenu();
    setPopupOpen(true);
  };

  const doDelete = async () => {
    if (!menu.cat) return;
    await removeCategoria(menu.cat.id);
    setList(prev => prev.filter(c => c.id !== menu.cat!.id));
    // si la que estaba seleccionada se borró
    if (valueId === menu.cat.id) onChangeId(null);
    setConfirmOpen(false);
    closeMenu();
    setPopupOpen(true);
  };

  const doEditStart = () => {
    if (!menu.cat) return;
    setEditValue(menu.cat.nombre);
    setEditOpen(true);
  };

  const doEditConfirm = async () => {
    if (!menu.cat) return;
    const name = (editValue || '').trim();
    if (!name || name.length < 3) return;
    const updated = await editCategoria(menu.cat.id, { nombre: name });
    // actualizar localmente sin refetch
    setList(prev =>
      prev
        .map(c => (c.id === menu.cat!.id ? { ...c, nombre: updated.nombre } : c))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    );
    setEditOpen(false);
    closeMenu();
    setPopupOpen(true);
  };

  return (
    <>
      <Autocomplete
        options={options}
        value={value}
        loading={loading}
        disableCloseOnSelect
        open={popupOpen}
        onOpen={() => setPopupOpen(true)}
        onClose={(_, reason) => {
          // no cerrar si el menú o diálogos están activos
          if (menu.anchorEl || confirmOpen || editOpen) return;
          // cerrar solo por click-away/escape
          if (reason === 'blur' || reason === 'escape' || reason === 'toggleInput') {
            setPopupOpen(false);
          } else {
            setPopupOpen(false);
          }
        }}
        groupBy={(opt) =>
          (typeof (opt as any).id === 'number' && (opt as any).id !== -1 ? ((opt as any).firstLetter || '') : '')
        }
        filterOptions={(opts, params) => {
          const fixed = opts.filter(o => (o as any).id === -1);
          const cats  = opts.filter(o => (o as any).id !== -1) as CategoriaInversion[];
          const filtered = filter(cats as any, params).sort((a: any, b: any) => a.nombre.localeCompare(b.nombre, 'es'));
          return [...fixed as any, ...filtered as any];
        }}
        getOptionLabel={(opt) =>
          (opt as any).id === -1 ? 'Registrar nueva categoría' : (opt as CategoriaInversion).nombre
        }
        isOptionEqualToValue={(o, v) => (o as any).id === (v as any).id}
        onChange={(_, sel) => {
          if (!sel) { onChangeId(null); return; }
          const s: any = sel;
          if (s.id === -1) {
            const ev = new CustomEvent('open-create-categoria');
            window.dispatchEvent(ev);
            // mantener abierto
            setPopupOpen(true);
            return;
          }
          if ('is_active' in s && !s.is_active) return; // archivadas no seleccionables
          onChangeId(s.id);
          setPopupOpen(false); // tras elegir activa, cierra
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
          if (anyOpt.id === -1) {
            return (
              <li
                {...props}
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const ev = new CustomEvent('open-create-categoria');
                  window.dispatchEvent(ev);
                  setPopupOpen(true);
                }}
              >
                ➕ Registrar nueva categoría
              </li>
            );
          }

          const cat = option as CategoriaInversion;
          const isArchived = !cat.is_active;

          const onRowClick = (e: React.MouseEvent) => {
            if (isArchived) { e.preventDefault(); e.stopPropagation(); }
          };

          return (
            <li
              {...props}
              onClick={onRowClick}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
            >
              <Tooltip title={isArchived ? 'Archivada · no seleccionable' : ''}>
                <span style={{ opacity: isArchived ? 0.55 : 1 }}>{cat.nombre}</span>
              </Tooltip>

              <IconButton
                size="small"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  openMenu(e, cat);
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
        onClose={() => { closeMenu(); setPopupOpen(true); }}
        keepMounted
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top',    horizontal: 'right' }}
      >
        {/* Editar (si activa) */}
        {menu.cat?.is_active && (
          <MenuItem onClick={() => { doEditStart(); }}>
            <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Editar</ListItemText>
          </MenuItem>
        )}

        {/* Archivar / Restaurar */}
        {menu.cat?.is_active ? (
          <MenuItem onClick={doArchive}>
            <ListItemIcon><ArchiveIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Archivar</ListItemText>
          </MenuItem>
        ) : (
          <MenuItem onClick={doRestore}>
            <ListItemIcon><UnarchiveIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Restaurar</ListItemText>
          </MenuItem>
        )}

        {/* Eliminar (solo si está archivada) */}
        {!menu.cat?.is_active && (
          <MenuItem onClick={() => { setConfirmOpen(true); }}>
            <ListItemIcon><DeleteIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Eliminar</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Confirmar eliminación */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>¿Eliminar la categoría permanentemente?</DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={doDelete}>Eliminar</Button>
        </DialogActions>
      </Dialog>

      {/* Editar nombre */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Editar categoría</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            autoFocus
            label="Nombre"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            inputProps={{ maxLength: 100 }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancelar</Button>
          <Button onClick={doEditConfirm} variant="contained" disabled={(editValue.trim().length < 3)}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CategoriaAutocomplete;
