export const validationMessages = {
  required: 'Este campo es requerido',
  invalidNumber: 'Ingresa un número válido',
  nonNegative: 'No se permiten números negativos',
  positive: 'Debe ser mayor que 0',
  invalidDate: 'Ingresa una fecha válida',
  maxLength: (max: number) => `Máximo ${max} caracteres`,
  minLength: (min: number) => `Mínimo ${min} caracteres`,
  invalidPhone: 'Ingresa un teléfono válido',
} as const;
