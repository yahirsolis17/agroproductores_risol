// src/modules/gestion_huerta/components/cosecha/CosechaTable.tsx
import React from 'react';
import {
  Table,
  TableContainer,
  TableHead,
  TableBody,
  TableCell,
  TableRow,
  Paper,
} from '@mui/material';
import { Cosecha } from '../../types/cosechaTypes';

interface CosechaTableProps {
  data: Cosecha[];
}

const CosechaTable: React.FC<CosechaTableProps> = ({ data }) => {
  return (
    <TableContainer component={Paper} className="rounded-xl border border-neutral-200">
      <Table size="small">
        <TableHead className="bg-neutral-100">
          <TableRow>
            <TableCell className="font-semibold">Nombre</TableCell>
            <TableCell className="font-semibold">Fecha Inicio</TableCell>
            <TableCell className="font-semibold">Fecha Fin</TableCell>
            <TableCell className="font-semibold">Acciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.length > 0 ? (
            data.map((cosecha) => (
              <TableRow key={cosecha.id} hover>
                <TableCell>{cosecha.nombre}</TableCell>
                <TableCell>{cosecha.fecha_inicio || 'N/A'}</TableCell>
                <TableCell>{cosecha.fecha_fin || 'N/A'}</TableCell>
                <TableCell>
                  <span className="text-sm text-neutral-500">🔧 Acciones</span>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-neutral-500 py-6">
                No hay cosechas registradas.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default CosechaTable;
