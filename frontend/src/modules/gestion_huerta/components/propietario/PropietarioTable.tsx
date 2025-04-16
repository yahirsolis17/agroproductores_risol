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
import { Propietario } from '../../types/propietarioTypes';

interface PropietarioTableProps {
  data: Propietario[];
}

const PropietarioTable: React.FC<PropietarioTableProps> = ({ data }) => {
  return (
    <TableContainer
      component={Paper}
      className="rounded-xl border border-neutral-200"
    >
      <Table size="small">
        <TableHead className="bg-neutral-100">
          <TableRow>
            <TableCell className="font-semibold">Nombre</TableCell>
            <TableCell className="font-semibold">Apellidos</TableCell>
            <TableCell className="font-semibold">Teléfono</TableCell>
            <TableCell className="font-semibold">Dirección</TableCell>
            <TableCell className="font-semibold">Acciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.length > 0 ? (
            data.map((prop) => (
              <TableRow key={prop.id} hover>
                <TableCell>{prop.nombre}</TableCell>
                <TableCell>{prop.apellidos}</TableCell>
                <TableCell>{prop.telefono}</TableCell>
                <TableCell>{prop.direccion}</TableCell>
                <TableCell>
                  <span className="text-sm text-neutral-500">
                    🔧 Acciones
                  </span>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-neutral-500 py-6">
                No hay propietarios registrados.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default PropietarioTable;
