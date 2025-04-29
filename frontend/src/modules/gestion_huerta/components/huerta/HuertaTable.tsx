// src/modules/gestion_huerta/components/huerta/HuertaTable.tsx
import React from 'react';
import {
  Table,
  TableContainer,
  TableHead,
  TableBody,
  TableCell,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Box,
  Pagination,
} from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import { Huerta } from '../../types/huertaTypes';
import { PermissionButton } from '../../../../components/common/PermissionButton';

interface HuertaTableProps {
  data: Huerta[];
  page: number;
  total: number;
  onPageChange: (event: React.ChangeEvent<unknown>, value: number) => void;
  onEdit?: (huerta: Huerta) => void;
  onDelete?: (id: number) => void;
  pageSize?: number;
}

const HuertaTable: React.FC<HuertaTableProps> = ({
  data,
  page,
  total,
  onPageChange,
  onEdit,
  onDelete,
  pageSize = 10,
}) => {
  const showEmptyMessage = data.length === 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <TableContainer component={Paper} className="rounded-xl border border-neutral-200">
        <Table size="small">
          <TableHead className="bg-neutral-100">
            <TableRow>
              <TableCell className="font-semibold">#</TableCell>
              <TableCell className="font-semibold">Nombre</TableCell>
              <TableCell className="font-semibold">Ubicación</TableCell>
              <TableCell className="font-semibold">Variedades</TableCell>
              <TableCell className="font-semibold">Hectáreas</TableCell>
              <TableCell className="font-semibold">Propietario</TableCell>
              <TableCell className="font-semibold">Acciones</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {showEmptyMessage ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-neutral-500 py-6">
                  No hay huertas registradas.
                </TableCell>
              </TableRow>
            ) : (
              data.map((huerta, index) => (
                <TableRow key={huerta.id} hover className="text-sm">
                  <TableCell>{(page - 1) * pageSize + index + 1}</TableCell>
                  <TableCell>{huerta.nombre}</TableCell>
                  <TableCell>{huerta.ubicacion}</TableCell>
                  <TableCell>{huerta.variedades}</TableCell>
                  <TableCell>{huerta.hectareas}</TableCell>
                  <TableCell>
                    {huerta.propietario_detalle
                      ? `${huerta.propietario_detalle.nombre} ${huerta.propietario_detalle.apellidos}`
                      : `ID: ${huerta.propietario}`}
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={1}>
                      <Tooltip title="Editar">
                        <PermissionButton
                          perm="change_huerta"
                          component={IconButton}
                          size="small"
                          color="primary"
                          onClick={() => onEdit?.(huerta)}
                        >
                          <Edit fontSize="small" />
                        </PermissionButton>
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <PermissionButton
                          perm="delete_huerta"
                          component={IconButton}
                          size="small"
                          color="error"
                          onClick={() => onDelete?.(huerta.id)}
                        >
                          <Delete fontSize="small" />
                        </PermissionButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {!showEmptyMessage && totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={4}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={onPageChange}
            variant="outlined"
            shape="rounded"
            color="primary"
          />
        </Box>
      )}
    </>
  );
};

export default HuertaTable;
