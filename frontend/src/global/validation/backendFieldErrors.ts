import { FormikHelpers, FormikValues } from 'formik';

type FieldErrors = Record<string, string[]>;

type NormalizedBackendErrors = {
  fieldErrors: FieldErrors;
  formErrors: string[];
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
  return payload as Record<string, unknown>;
};

export const normalizeBackendErrors = (err: unknown): NormalizedBackendErrors => {
  const data = (err as any)?.data ?? (err as any)?.response?.data ?? err ?? {};
  const candidate = extractErrorsRecord(data) ?? {};
  const fieldErrors: FieldErrors = {};
  const formErrors: string[] = [];

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

  return { fieldErrors, formErrors };
};

export const applyBackendErrorsToFormik = <Values extends FormikValues>(
  err: unknown,
  helpers: FormikHelpers<Values>
): NormalizedBackendErrors => {
  const { fieldErrors, formErrors } = normalizeBackendErrors(err);

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

  return { fieldErrors, formErrors };
};
