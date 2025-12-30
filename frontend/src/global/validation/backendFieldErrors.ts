import { FormikHelpers, FormikValues } from 'formik';

type FieldErrors = Record<string, string[]>;

type NormalizedBackendErrors = {
  fieldErrors: FieldErrors;
  formErrors: string[];
  messageKey?: string;
  status?: number;
  hasErrorsPayload?: boolean;
};

type NormalizeOptions = {
  fieldAliases?: Record<string, string>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

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
  return null;
};

const extractCandidate = (payload: unknown): Record<string, unknown> => {
  if (!isRecord(payload)) return {};
  return payload;
};

const metaKeys = new Set(['message', 'detail', 'message_key', 'notification', 'success', 'status', 'data', 'errors', 'error']);

const looksLikeFieldErrors = (payload: unknown) => {
  if (!isRecord(payload)) return false;
  return Object.keys(payload).some((key) => key === 'non_field_errors' || key === '__all__' || !metaKeys.has(key));
};

const resolveMessageKey = (payload: unknown): string | undefined => {
  if (!isRecord(payload)) return undefined;
  if (typeof payload.message_key === 'string') return payload.message_key;
  if (isRecord(payload.notification) && typeof payload.notification.key === 'string') {
    return payload.notification.key;
  }
  return undefined;
};

const resolveStatus = (err: unknown): number | undefined => {
  const status = (err as any)?.status ?? (err as any)?.response?.status ?? (err as any)?.data?.status;
  return typeof status === 'number' ? status : undefined;
};

export const normalizeBackendErrors = (
  err: unknown,
  options: NormalizeOptions = {}
): NormalizedBackendErrors => {
  const data = (err as any)?.data ?? (err as any)?.response?.data ?? err ?? {};
  const extractedErrors =
    extractErrorsRecord(data) ??
    extractErrorsRecord((data as any)?.data);
  const candidate = extractedErrors ?? (looksLikeFieldErrors(data) ? extractCandidate(data) : {});
  const fieldErrors: FieldErrors = {};
  const formErrors: string[] = [];

  if (isRecord(candidate)) {
    Object.entries(candidate).forEach(([key, value]) => {
      if (key === 'non_field_errors' || key === '__all__') {
        formErrors.push(...toStringArray(value));
        return;
      }
      if (key === 'detail' || key === 'message') {
        formErrors.push(...toStringArray(value));
        return;
      }
      const messages = toStringArray(value);
      if (messages.length) {
        const aliasKey = options.fieldAliases?.[key] ?? key;
        fieldErrors[aliasKey] = messages;
      }
    });
  }

  if (!formErrors.length) {
    const fallbackMessage =
      (data as any)?.message ||
      (data as any)?.detail ||
      (data as any)?.error ||
      (data as any)?.data?.message ||
      (data as any)?.data?.detail;
    if (fallbackMessage) {
      formErrors.push(...toStringArray(fallbackMessage));
    }
  }

  return {
    fieldErrors,
    formErrors,
    messageKey: resolveMessageKey(data),
    status: resolveStatus(err),
    hasErrorsPayload: Boolean(extractedErrors),
  };
};

export const applyBackendErrorsToFormik = <Values extends FormikValues>(
  err: unknown,
  helpers: FormikHelpers<Values>,
  options: NormalizeOptions = {}
): NormalizedBackendErrors => {
  const { fieldErrors, formErrors, messageKey, status, hasErrorsPayload } = normalizeBackendErrors(err, options);

  if (Object.keys(fieldErrors).length) {
    const flatErrors: Record<string, string[] | string> = {};
    Object.entries(fieldErrors).forEach(([key, value]) => {
      flatErrors[key] = value.length > 1 ? value : value[0];
    });
    helpers.setErrors(flatErrors as any);

    const touched: Record<string, boolean> = {};
    Object.keys(fieldErrors).forEach((key) => {
      touched[key] = true;
    });
    helpers.setTouched(touched as any, false);
  }

  return { fieldErrors, formErrors, messageKey, status, hasErrorsPayload };
};

export const isValidationError = (err: unknown, options: NormalizeOptions = {}) => {
  const { fieldErrors, status, hasErrorsPayload } = normalizeBackendErrors(err, options);
  if (typeof status === 'number') {
    if ([400, 409, 422].includes(status)) return true;
    return false;
  }
  return Boolean(hasErrorsPayload || Object.keys(fieldErrors).length > 0);
};
