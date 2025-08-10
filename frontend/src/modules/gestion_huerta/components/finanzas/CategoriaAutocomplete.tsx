import React, { useEffect, useMemo, useState } from 'react';
import {
  TextField, IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Archive as ArchiveIcon,
  Unarchive as UnarchiveIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { styled, lighten, darken } from '@mui/system';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import { CategoriaInversion } from '../../types/categoriaInversionTypes';
import { categoriaInversionService } from '../../services/categoriaInversionService';
import useCategoriasInversion from '../../hooks/useCategoriasInversion';
import CategoriaInversionEditModal from './CategoriaInversionEditModal';

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
  valueId, onChangeId, label = 'Categoría', error, helperText,
}) => {
  const [list, setList] = useState<CategoriaInversion[]>([]);
  const [loading, setLoading] = useState(false);

  const { archive, restore, removeCategoria } = useCategoriasInversion();

  // estado de apertura controlada del Autocomplete
  const [openAC, setOpenAC] = useState(false);
  const [inputValue, setInputValue] = useState('');

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

  // refrescos globales (crear/editar/etc)
  useEffect(() => {
    const handler = () => loadAll();
    window.addEventListener('categoria-inversion/refresh', handler as any);
    return () => window.removeEventListener('categoria-inversion/refresh', handler as any);
  }, []);

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

  // menú contextual anclado por posición (evita “salto” y queda sobre el popper)
  const [menu, setMenu] = useState<{ pos: { top: number; left: number } | null; cat: CategoriaInversion | null }>({
    pos: null, cat: null,
  });
  const openMenu = (e: React.MouseEvent<HTMLElement>, cat: CategoriaInversion) => {
    e.preventDefault();
    e.stopPropagation(); // no cerrar el popup
    setMenu({ pos: { top: e.clientY + 6, left: e.clientX - 6 }, cat });
  };
  const closeMenu = () => setMenu({ pos: null, cat: null });
  const isMenuOpen = Boolean(menu.pos);

  // confirmación de borrado
  const [confirm, setConfirm] = useState<{ open: boolean; cat: CategoriaInversion | null }>({ open: false, cat: null });
  const openConfirm = (cat: CategoriaInversion) => setConfirm({ open: true, cat });
  const closeConfirm = () => setConfirm({ open: false, cat: null });

  // modal de edición consistente
  const [editCat, setEditCat] = useState<CategoriaInversion | null>(null);
  const openEditModal = (cat: CategoriaInversion) => setEditCat(cat);
  const closeEditModal = () => setEditCat(null);

  const doArchive = async () => {
    if (!menu.cat) return;
    await archive(menu.cat.id);
    closeMenu();
    loadAll();
    window.dispatchEvent(new CustomEvent('categoria-inversion/refresh'));
  };
  const doRestore = async () => {
    if (!menu.cat) return;
    await restore(menu.cat.id);
    closeMenu();
    loadAll();
    window.dispatchEvent(new CustomEvent('categoria-inversion/refresh'));
  };
  const doDelete = async () => {
    const cat = confirm.cat;
    if (!cat) return;
    await removeCategoria(cat.id);
    closeConfirm();
    if (valueId === cat.id) onChangeId(null);
    loadAll();
    window.dispatchEvent(new CustomEvent('categoria-inversion/refresh'));
  };

  return (
    <>
      <Autocomplete
        options={options}
        value={value}
        loading={loading}
        open={openAC}
        onOpen={() => setOpenAC(true)}
        onClose={(_, reason) => {
          // mantener abierto si el cierre fue por blur mientras el menú está abierto
          if (isMenuOpen && reason === 'blur') return;
          setOpenAC(false);
        }}
        inputValue={inputValue}
        onInputChange={(_, v, reason) => {
          if (reason === 'reset') return; // evita parpadeo al seleccionar
          setInputValue(v);
        }}
        disableCloseOnSelect={false}     // ← cerrar al seleccionar (lo pediste)
        clearOnBlur={false}
        selectOnFocus={false}
        groupBy={(opt) =>
          (typeof (opt as any).id === 'number' && (opt as any).id !== -1 ? ((opt as any).firstLetter || '') : '')
        }
        filterOptions={(opts, params) => {
          const fixed = opts.filter(o => (o as any).id === -1);
          const cats  = opts.filter(o => (o as any).id !== -1) as CategoriaInversion[];
          const filtered = filter(cats as any, params)
            .sort((a: any, b: any) => a.nombre.localeCompare(b.nombre, 'es'));
          return [...fixed as any, ...filtered as any];
        }}
        getOptionLabel={(opt) =>
          (opt as any).id === -1 ? 'Registrar nueva categoría' : (opt as CategoriaInversion).nombre
        }
        isOptionEqualToValue={(o, v) => (o as any).id === (v as any).id}
        onChange={(_, sel) => {
          if (!sel) { onChangeId(null); setOpenAC(false); return; }
          const s: any = sel;
          if (s.id === -1) {
            window.dispatchEvent(new CustomEvent('open-create-categoria'));
            return;
          }
          if ('is_active' in s && !s.is_active) return; // archivadas no seleccionables
          onChangeId(s.id);
          // cerrar al seleccionar
          setOpenAC(false);
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            error={error}
            helperText={helperText}
          />
        )}
        // subimos el z-index del popper; el menú tendrá uno aún mayor
        slotProps={{
          popper: { sx: { zIndex: (t: any) => t.zIndex.modal + 1 } },
          paper:  { sx: { zIndex: (t: any) => t.zIndex.modal + 1 } },
        }}
        renderOption={(props, option) => {
          const anyOpt = option as any;
          if (anyOpt.id === -1) {
            return (
              <li
                {...props}
                onMouseDown={(e) => e.preventDefault()} // no cerrar popup
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.dispatchEvent(new CustomEvent('open-create-categoria'));
                }}
              >
                ➕ Registrar nueva categoría
              </li>
            );
          }

          const cat = option as CategoriaInversion;
          const isArchived = !cat.is_active;

          // NO perdemos el onClick interno para permitir la selección normal
          const { onClick, ...liProps } = props as any;
          const handleLiClick: React.MouseEventHandler<HTMLLIElement> = (e) => {
            if (isArchived) { e.preventDefault(); e.stopPropagation(); return; }
            onClick?.(e);
          };

          return (
            <li
              {...liProps}
              onClick={handleLiClick}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
            >
              <Tooltip title={isArchived ? 'Archivada · no seleccionable' : ''}>
                <span style={{ opacity: isArchived ? 0.55 : 1 }}>{cat.nombre}</span>
              </Tooltip>

              <IconButton
                size="small"
                onMouseDown={(e) => e.preventDefault()} // evita blur/cierre del popup
                onClick={(e) => openMenu(e, cat)}
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

      {/* Menú contextual anclado a posición (siempre por encima del popper) */}
      <Menu
        open={Boolean(menu.pos)}
        onClose={closeMenu}
        anchorReference="anchorPosition"
        anchorPosition={menu.pos || undefined}
        keepMounted
        PaperProps={{ sx: { zIndex: (t) => t.zIndex.modal + 3 } }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <MenuItem onClick={() => { if (menu.cat) openEditModal(menu.cat); closeMenu(); }}>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Editar</ListItemText>
        </MenuItem>

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

        <MenuItem
          onClick={() => {
            if (menu.cat) openConfirm(menu.cat);
            closeMenu();
          }}
        >
          <ListItemIcon><DeleteIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Eliminar</ListItemText>
        </MenuItem>
      </Menu>

      {/* Confirmación de eliminación */}
      <Dialog open={confirm.open} onClose={closeConfirm}>
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent dividers>
          <Typography>¿Eliminar la categoría <b>{confirm.cat?.nombre}</b>?</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            (Solo se puede eliminar si no tiene inversiones asociadas)
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConfirm}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={doDelete}>Eliminar</Button>
        </DialogActions>
      </Dialog>

      {/* Modal de edición consistente */}
      <CategoriaInversionEditModal
        open={Boolean(editCat)}
        initial={editCat || undefined}
        onClose={closeEditModal}
        onSuccess={() => {
          closeEditModal();
          loadAll();
          window.dispatchEvent(new CustomEvent('categoria-inversion/refresh'));
        }}
      />
    </>
  );
};

export default CategoriaAutocomplete;
