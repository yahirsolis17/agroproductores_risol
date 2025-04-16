export interface Propietario {
  id: number;
  nombre: string;
  apellidos: string;
  telefono: string;
  direccion: string;
}

export interface PropietarioCreateData {
  nombre: string;
  apellidos: string;
  telefono: string;
  direccion: string;
}

export interface PropietarioUpdateData {
  nombre?: string;
  apellidos?: string;
  telefono?: string;
  direccion?: string;
}
