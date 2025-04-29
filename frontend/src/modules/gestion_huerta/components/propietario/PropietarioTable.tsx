// src/modules/gestion_huerta/components/propietario/PropietarioTable.tsx
import React from 'react';
import {
  Table,
  TableContainer,
  TableHead,
  TableBody,
  TableCell,
  TableRow,
  Paper,
  Box,
  Pagination,
  Typography,
} from '@mui/material';
import { Propietario } from '../../types/propietarioTypes';
import { PermissionButton } from '../../../../components/common/PermissionButton'; // ← Import

interface PropietarioTableProps {
  data: Propietario[];
  page: number;
  pageSize: number;
  onPageChange: (newPage: number) => void;
  count: number;
}

const PropietarioTable: React.FC<PropietarioTableProps> = ({
  data,
  page,
  pageSize,
  onPageChange,
  count,
}) => {
  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  const isValidData =
    Array.isArray(data) &&
    data.every(
      (item) =>
        typeof item === 'object' &&
        'id' in item &&
        'nombre' in item &&
        'telefono' in item
    );

  if (!isValidData) {
    return (
      <Typography color="error" mt={4} textAlign="center">
        Algo salió mal al cargar los propietarios. Intenta recargar la página.
      </Typography>
    );
  }

  return (
    <Box>
      <TableContainer
        component={Paper}
        className="rounded-xl border border-neutral-200"
      >
        <Table size="small">
          <TableHead className="bg-neutral-100">
            <TableRow>
              <TableCell className="font-semibold">#</TableCell>
              <TableCell className="font-semibold">Nombre</TableCell>
              <TableCell className="font-semibold">Apellidos</TableCell>
              <TableCell className="font-semibold">Teléfono</TableCell>
              <TableCell className="font-semibold">Dirección</TableCell>
              <TableCell className="font-semibold">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.length > 0 ? (
              data.map((prop, index) => (
                <TableRow key={prop.id} hover>
                  <TableCell>{(page - 1) * pageSize + index + 1}</TableCell>
                  <TableCell>{prop.nombre}</TableCell>
                  <TableCell>{prop.apellidos}</TableCell>
                  <TableCell>{prop.telefono}</TableCell>
                  <TableCell>{prop.direccion}</TableCell>
                  <TableCell>
                    {/* Aquí podrías tener Edit/Delete, pero al menos deshabilitamos “Acciones” */}
                    <PermissionButton perm="change_propietario" variant="text">
                      🔧 Acciones
                    </PermissionButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-neutral-500 py-6">
                  No hay propietarios registrados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={4}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, newPage) => onPageChange(newPage)}
            variant="outlined"
            shape="rounded"
            color="primary"
          />
        </Box>
      )}
    </Box>
  );
};

export default PropietarioTable;
