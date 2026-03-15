import React from 'react';
import { useField, useFormikContext } from 'formik';
import FormikTextField, { FormikTextFieldProps } from './FormikTextField';
import { formatWithThousands, normalizeNumericInput } from '../../../global/utils/numericInput';

type Props = FormikTextFieldProps & {
  thousandSeparator?: boolean;
  allowDecimal?: boolean;
  maxDecimals?: number;
};

const FormikNumberField: React.FC<Props> = (props) => {
  const {
    name,
    onChange,
    thousandSeparator = false,
    allowDecimal = true,
    maxDecimals,
    inputMode,
    type,
    value,
    ...rest
  } = props;

  const [field] = useField(name);
  const { setFieldValue } = useFormikContext<Record<string, unknown>>();

  const rawValue = String(value ?? field.value ?? '');
  const displayValue = thousandSeparator
    ? formatWithThousands(rawValue, { allowDecimal, maxDecimals })
    : rawValue;

  return (
    <FormikTextField
      {...rest}
      name={name}
      type={thousandSeparator ? 'text' : (type ?? 'number')}
      inputMode={inputMode ?? (allowDecimal ? 'decimal' : 'numeric')}
      value={displayValue}
      onChange={(event) => {
        if (!thousandSeparator) {
          if (onChange) onChange(event);
          else field.onChange(event);
          return;
        }

        const normalized = normalizeNumericInput(event.target.value, {
          allowDecimal,
          maxDecimals,
        });

        setFieldValue(name, normalized, false);

        if (onChange) {
          const patchedEvent = {
            ...event,
            target: {
              ...event.target,
              name,
              value: normalized,
            },
          } as React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
          onChange(patchedEvent);
        }
      }}
    />
  );
};

export default FormikNumberField;
