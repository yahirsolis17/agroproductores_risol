import { FormikErrors } from 'formik';

const getFirstErrorKey = (errors: FormikErrors<unknown>) => {
  const entries = Object.entries(errors);
  for (const [key, value] of entries) {
    if (!value) continue;
    if (typeof value === 'string' || Array.isArray(value)) return key;
    if (typeof value === 'object') {
      return key;
    }
  }
  return undefined;
};

export const focusFirstError = (errors: FormikErrors<unknown>, form?: HTMLElement | null) => {
  const firstKey = getFirstErrorKey(errors);
  if (!firstKey) return;
  const selector = `[name="${firstKey}"]`;
  const scope = form ?? document;
  const element = scope.querySelector(selector) as HTMLElement | null;
  if (!element) return;
  element.focus();
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
};
