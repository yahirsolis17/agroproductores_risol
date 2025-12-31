import { FormikHelpers, FormikValues } from 'formik';

// --- TYPES ---

export type FieldErrors = Record<string, string[]>;

export type NormalizedBackendErrors = {
  fieldErrors: FieldErrors;
  formErrors: string[];
  messageKey?: string; // Para lógica de negocio
  status?: number; // HTTP status
  hasErrorsPayload: boolean; // Si realmente trajo info de errores
};

// --- HELPERS ---

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

const toStringArray = (value: unknown): string[] => {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.map((v) => (typeof v === 'string' ? v : String(v))).filter(Boolean);
  }
  if (typeof value === 'string') return value ? [value] : [];
  return [String(value)];
};

const META_KEYS = new Set([
  'success', 'message', 'detail', 'message_key', 'messageKey',
  'notification', 'data', 'meta', 'results', 'count', 'next',
  'previous', 'status'
]);

/**
 * Busca recursivamente un objeto que parezca un mapa de errores de campos.
 * Prioriza: 1) root.errors, 2) root.data.errors, 3) root (si parece mapa de campos de DRF)
 */
const extractErrorsRecord = (payload: unknown): Record<string, unknown> | null => {
  if (!isRecord(payload)) return null;

  // 1. Estándar: root.errors
  if (isRecord(payload.errors)) return payload.errors as Record<string, unknown>;

  // 2. Wrappers data.errors
  if (isRecord(payload.data)) {
    if (isRecord(payload.data.errors)) return payload.data.errors as Record<string, unknown>;
    // Nested data.data.errors cases
    if (isRecord(payload.data.data) && isRecord((payload.data.data as any).errors)) {
      return (payload.data.data as any).errors as Record<string, unknown>;
    }
  }

  // 3. DRF plano (heurística: keys que no son meta y values que son strings/arrays)
  const keys = Object.keys(payload);
  const possibleFieldMap = keys.some(k => !META_KEYS.has(k));
  if (possibleFieldMap) {
    // Verificar si tiene 'non_field_errors' o keys que parecen campos con arrays de strings
    const hasErrorLikeContent = keys.some(k => {
        const val = payload[k];
        return Array.isArray(val) || (typeof val === 'string' && !META_KEYS.has(k));
    });
    if (hasErrorLikeContent) return payload;
  }

  return null;
};

// --- CORE FUNCTIONS ---

export const normalizeBackendErrors = (err: unknown): NormalizedBackendErrors => {
  // 1. Extract raw payload
  const raw = (err as any)?.response?.data ?? (err as any)?.data ?? (err as any)?.payload ?? err ?? {};
  const status = (err as any)?.response?.status ?? (err as any)?.status;
  
  // 2. Extract meta info
  const messageKey = raw?.message_key ?? raw?.messageKey ?? raw?.notification?.key;

  // 3. Extract errors
  const fieldErrors: FieldErrors = {};
  const formErrors: string[] = [];

  const errorsRecord = extractErrorsRecord(raw);

  // Manejo de non_field_errors en root o en record
  const addNonField = (source: any) => {
    if (source?.non_field_errors) formErrors.push(...toStringArray(source.non_field_errors));
    if (source?.__all__) formErrors.push(...toStringArray(source.__all__));
    if (source?.detail && Array.isArray(source.detail)) formErrors.push(...toStringArray(source.detail)); // DRF detail array
  };
  addNonField(raw);
  if (errorsRecord) addNonField(errorsRecord);

  // Mapeo de campos
  if (errorsRecord) {
    Object.entries(errorsRecord).forEach(([key, value]) => {
      if (['non_field_errors', '__all__', 'detail', 'message', 'success', 'data'].includes(key)) return;
      
      const msgs = toStringArray(value);
      if (msgs.length > 0) {
        fieldErrors[key] = msgs;
      }
    });
  }

  // Fallback si no hay errores específicos pero hay mensaje global
  if (Object.keys(fieldErrors).length === 0 && formErrors.length === 0) {
    const fallback = raw?.message ?? raw?.detail;
    if (typeof fallback === 'string') formErrors.push(fallback);
  }

  const hasErrorsPayload = Object.keys(fieldErrors).length > 0 || formErrors.length > 0;

  return { fieldErrors, formErrors, messageKey, status, hasErrorsPayload };
};

export const applyBackendErrorsToFormik = <Values extends FormikValues>(
  err: unknown,
  helpers: FormikHelpers<Values>,
  options?: {
    fieldAliases?: Record<string, string>;
    fieldNames?: string[];
    spreadNonFieldToFields?: string[];
    alsoSetFormikErrors?: boolean;
  }
): NormalizedBackendErrors => {
  const normalized = normalizeBackendErrors(err);
  const { fieldErrors, formErrors } = normalized;

  const aliases = options?.fieldAliases ?? {};
  const allowedFields = options?.fieldNames;
  
  const mappedFieldErrors: FieldErrors = {};
  const extraBannerErrors: string[] = [];

  // Mapear campos
  Object.entries(fieldErrors).forEach(([key, msgs]) => {
    const alias = aliases[key] ?? key;
    // Si hay lista blanca de campos y este no está, va al banner (security/usability)
    if (allowedFields && !allowedFields.includes(alias)) {
        extraBannerErrors.push(`${alias}: ${msgs.join(', ')}`);
    } else {
        mappedFieldErrors[alias] = msgs;
    }
  });

  // Spread non-field a campos si se solicita (ej. error general pintarlo en 'nombre')
  if (options?.spreadNonFieldToFields && formErrors.length > 0) {
      options.spreadNonFieldToFields.forEach(f => {
          if (!mappedFieldErrors[f]) mappedFieldErrors[f] = [...formErrors];
      });
  }

  const finalFormErrors = [...formErrors, ...extraBannerErrors];

  // 1. Set Status (Fuente de verdad para FormikTextField que lee status.serverFieldErrors)
  helpers.setStatus({
    serverFieldErrors: mappedFieldErrors,
    serverFormErrors: finalFormErrors,
    messageKey: normalized.messageKey,
    status: normalized.status
  });

  // 2. Touch fields (para que se muestren rojos inmediatamente)
  const touchedMap: Record<string, boolean> = {};
  Object.keys(mappedFieldErrors).forEach(k => touchedMap[k] = true);
  if (Object.keys(touchedMap).length > 0) {
      helpers.setTouched(touchedMap as any, false);
  }

  return normalized;
};

const VALIDATION_MESSAGE_KEYS = new Set([
  'validation_error', 'context_incomplete', 'contexto_invalido', 'missing_temporada', 
  'propietario_telefono_duplicado' // Agregamos keys conocidas para ser explícitos
]);

export const isValidationError = (input: unknown | NormalizedBackendErrors): boolean => {
  const normalized = (isRecord(input) && 'hasErrorsPayload' in input) 
    ? input as NormalizedBackendErrors 
    : normalizeBackendErrors(input);

  if (normalized.status === 400 || normalized.status === 422) return true;
  if (normalized.hasErrorsPayload) return true;
  if (normalized.messageKey && VALIDATION_MESSAGE_KEYS.has(normalized.messageKey)) return true;
  
  return false;
};
