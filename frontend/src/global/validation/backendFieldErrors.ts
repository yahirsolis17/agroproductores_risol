import { FormikHelpers, FormikValues } from 'formik';

type FieldErrors = Record<string, string[]>;

type NormalizedBackendErrors = {
  fieldErrors: FieldErrors;
  formErrors: string[];
  messageKey?: string;
  status?: number;
  hasErrorsPayload: boolean;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

const VALIDATION_MESSAGE_KEYS = new Set<string>([
  'validation_error',
  'context_incomplete',
  'contexto_invalido',
  'missing_temporada',
]);

const toStringArray = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === 'string' ? item : String(item))).filter(Boolean);
  }
  if (typeof value === 'string') return [value];
  return [String(value)];
};

const extractErrorsRecord = (payload: unknown): Record<string, unknown> | null => {
  if (!isRecord(payload)) return null;
  if ('errors' in payload && isRecord(payload.errors)) return payload.errors;
  if ('data' in payload && isRecord(payload.data) && 'errors' in payload.data && isRecord(payload.data.errors)) {
    return payload.data.errors;
  }
  return payload as Record<string, unknown>;
};

export const normalizeBackendErrors = (err: unknown): NormalizedBackendErrors => {
  const data =
    (err as any)?.response?.data ??
    (err as any)?.data ??
    (err as any)?.payload ??
    (err as any)?.errors ??
    err ??
    {};
  const status =
    (err as any)?.response?.status ??
    (err as any)?.status;
  const candidate = extractErrorsRecord(data) ?? {};
  const fieldErrors: FieldErrors = {};
  const formErrors: string[] = [];
  const messageKey =
    (data as any)?.message_key ??
    (data as any)?.messageKey ??
    (data as any)?.notification?.key;
  const hasErrorsPayload = Boolean(
    (isRecord(data) && ('errors' in data || 'non_field_errors' in data || '__all__' in data)) ||
      (isRecord(data) && 'data' in data && isRecord(data.data) && 'errors' in data.data)
  );

  if (isRecord(candidate)) {
    Object.entries(candidate).forEach(([key, value]) => {
      if (key === 'non_field_errors' || key === '__all__') {
        formErrors.push(...toStringArray(value));
        return;
      }
      const messages = toStringArray(value);
      if (messages.length) {
        fieldErrors[key] = messages;
      }
    });
  }

  if (!formErrors.length) {
    const fallbackMessage = (data as any)?.message || (data as any)?.detail;
    if (fallbackMessage) {
      formErrors.push(...toStringArray(fallbackMessage));
    }
  }

  return {
    fieldErrors,
    formErrors,
    messageKey,
    status,
    hasErrorsPayload,
  };
};

export const applyBackendErrorsToFormik = <Values extends FormikValues>(
  err: unknown,
  helpers: FormikHelpers<Values>,
  options?: { fieldAliases?: Record<string, string>; fieldNames?: string[] }
): NormalizedBackendErrors => {
  const normalized = normalizeBackendErrors(err);
  const { fieldErrors, formErrors } = normalized;
  const fieldAliases = options?.fieldAliases ?? {};
  const fieldNames = options?.fieldNames ?? [];

  const mappedFieldErrors: FieldErrors = {};
  if (Object.keys(fieldErrors).length) {
    const flatErrors: Record<string, string[] | string> = {};
    const bannerErrors: string[] = [];
    Object.entries(fieldErrors).forEach(([key, value]) => {
      const alias = fieldAliases[key] ?? key;
      if (fieldNames.length && !fieldNames.includes(alias)) {
        bannerErrors.push(...value);
        return;
      }
      mappedFieldErrors[alias] = value;
      flatErrors[alias] = value.length > 1 ? value : value[0];
    });
    if (Object.keys(flatErrors).length) {
      helpers.setErrors(flatErrors as any);
    }

    const touched: Record<string, boolean> = {};
    Object.keys(mappedFieldErrors).forEach((key) => {
      if (!fieldNames.length || fieldNames.includes(key)) {
        touched[key] = true;
      }
    });
    if (Object.keys(touched).length) {
      helpers.setTouched(touched as any, false);
    }
    if (bannerErrors.length) {
      formErrors.push(...bannerErrors);
    }
  }

  helpers.setStatus({
    serverFieldErrors: mappedFieldErrors,
    serverFormErrors: formErrors,
  });

  return normalized;
};

export const isValidationError = (input: unknown | NormalizedBackendErrors): boolean => {
  const normalized = isRecord(input) && 'fieldErrors' in input && 'formErrors' in input
    ? (input as NormalizedBackendErrors)
    : normalizeBackendErrors(input);
  if (normalized.status && [400, 409, 422].includes(normalized.status)) return true;
  if (normalized.hasErrorsPayload) return true;
  if (normalized.messageKey && VALIDATION_MESSAGE_KEYS.has(normalized.messageKey)) return true;
  return false;
};
