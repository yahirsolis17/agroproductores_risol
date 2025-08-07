import React, { useMemo, useState } from 'react';
import {
  Autocomplete, TextField, Chip, Box, CircularProgress,
  IconButton, Menu, MenuItem, Tooltip,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AddIcon from '@mui/icons-material/Add';
import type { CategoriaInversion } from '../../types/categoriaInversionTypes';

type Option = CategoriaInversion | { id: 'new'; nombre: string };

interface Props {
  value?: number | null;
  onChange: (categoriaId: number | null) => void;

  categorias: CategoriaInversion[];
  loading?: boolean;
  hideArchived?: boolean;

  onCreateCategoria: () => void;
  onUpdateCategoria: (cat: CategoriaInversion) => void;
  onArchiveCategoria: (cat: CategoriaInversion) => void;
  onRestoreCategoria: (cat: CategoriaInversion) => void;
  onDeleteCategoria: (cat: CategoriaInversion) => void;

  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

const CategoriaAutocomplete: React.FC<Props> = ({
  value,
  onChange,
  categorias,
  loading = false,
  hideArchived = false,
  onCreateCategoria,
  onUpdateCategoria,
  onArchiveCategoria,
  onRestoreCategoria,
  onDeleteCategoria,
  label = 'Categoría',
  placeholder = 'Selecciona o crea una categoría…',
  disabled = false,
}) => {
  const newOption: Option = { id: 'new', nombre: 'Crear nueva categoría' };

  const filtered = useMemo(
    () => (hideArchived ? categorias.filter((c) => c.is_active) : categorias),
    [categorias, hideArchived],
  );
  const options: Option[] = useMemo(() => [newOption, ...filtered], [filtered]);

  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuTarget, setMenuTarget] = useState<CategoriaInversion | null>(null);
  const openMenu = (evt: React.MouseEvent<HTMLElement>, cat: CategoriaInversion) => {
    setMenuAnchor(evt.currentTarget); setMenuTarget(cat);
  };
  const handleCloseMenu = () => { setMenuAnchor(null); setMenuTarget(null); };

  const getOptionLabel = (opt: Option) => opt.nombre;
  const getOptionDisabled = (opt: Option) => opt.id !== 'new' && !!opt.archivado_en;

  const selectedOption: Option | null =
    value != null ? options.find((o) => o.id !== 'new' && o.id === value) || null : null;

  return (
    <Box>
      <Autocomplete
        options={options}
        loading={loading}
        disabled={disabled}
        value={selectedOption}
        getOptionDisabled={getOptionDisabled}
        isOptionEqualToValue={(o, v) =>
          (o.id === 'new' && v.id === 'new') || (o.id !== 'new' && v.id !== 'new' && o.id === v.id)}
        getOptionLabel={getOptionLabel}
        filterOptions={(opts) => opts}
        onChange={(_, opt) => {
          if (!opt) return onChange(null);
          if (opt.id === 'new') { onCreateCategoria(); return; }
          onChange(opt.id as number);
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            placeholder={placeholder}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading && <CircularProgress size={18} />}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        renderOption={(props, option) => {
          if (option.id === 'new') {
            return (
              <Box component="li" {...props} key="new-cat" sx={{ display: 'flex', alignItems: 'center' }}>
                <AddIcon fontSize="small" style={{ marginRight: 8 }} /> {option.nombre}
              </Box>
            );
          }
          const cat = option as CategoriaInversion;
          const isArchived = !!cat.archivado_en || cat.is_active === false;
          return (
            <Box
              component="li" {...props} key={cat.id}
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.nombre}</span>
                {isArchived
                  ? <Chip size="small" label="Archivada" color="warning" />
                  : <Chip size="small" label="Activa"   color="success" />
                }
              </Box>
              <Tooltip title="Acciones">
                <IconButton size="small"
                  onClick={(e) => openMenu(e, cat)}
                  onMouseDown={(e) => e.preventDefault()}>
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          );
        }}
      />

      <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={handleCloseMenu}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
        {menuTarget && (
          <>
            <MenuItem onClick={() => { onUpdateCategoria(menuTarget); handleCloseMenu(); }}>Editar</MenuItem>
            {menuTarget.archivado_en
              ? <MenuItem onClick={() => { onRestoreCategoria(menuTarget); handleCloseMenu(); }}>Restaurar</MenuItem>
              : <MenuItem onClick={() => { onArchiveCategoria(menuTarget); handleCloseMenu(); }}>Archivar</MenuItem>
            }
            <MenuItem onClick={() => { onDeleteCategoria(menuTarget); handleCloseMenu(); }}>Eliminar</MenuItem>
          </>
        )}
      </Menu>
    </Box>
  );
};

export default CategoriaAutocomplete;
