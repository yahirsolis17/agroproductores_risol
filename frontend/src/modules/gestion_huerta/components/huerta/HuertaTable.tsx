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
import { Huerta } from '../../types/huertaTypes';

interface HuertaTableProps {
  data: Huerta[];
}

const HuertaTable: React.FC<HuertaTableProps> = ({ data }) => {
  return (
    <TableContainer
      component={Paper}
      className="rounded-xl border border-neutral-200"
    >
      <Table size="small">
        <TableHead className="bg-neutral-100">
          <TableRow>
            <TableCell className="font-semibold">Nombre</TableCell>
            <TableCell className="font-semibold">Ubicación</TableCell>
            <TableCell className="font-semibold">Variedades</TableCell>
            <TableCell className="font-semibold">Hectáreas</TableCell>
            <TableCell className="font-semibold">Propietario</TableCell>
            <TableCell className="font-semibold">Acciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.length > 0 ? (
            data.map((huerta) => (
              <TableRow key={huerta.id} hover>
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
                  <span className="text-sm text-neutral-500">🔧 Acciones</span>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-neutral-500 py-6">
                No hay huertas registradas.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default HuertaTable;
