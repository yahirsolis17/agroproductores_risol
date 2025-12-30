import React, { useEffect, useRef, useState } from 'react';
import { TextField, TextFieldProps } from '@mui/material';
import { useField, useFormikContext } from 'formik';
import { normalizeErrorMessages, renderErrorMessages } from './formFieldUtils';

export type FormikTextFieldProps = TextFieldProps & {
  name: string;
};

const FormikTextField: React.FC<FormikTextFieldProps> = ({ name, onBlur, onFocus, onChange, helperText, ...props }) => {
  const [field, meta] = useField(name);
  const { submitCount } = useFormikContext();
  const [isFocused, setIsFocused] = useState(false);
  const everErroredRef = useRef(false);

  const errorMessages = normalizeErrorMessages(meta.error);
  const hasError = errorMessages.length > 0;

  const showError = hasError && !isFocused && (meta.touched || submitCount > 0);

  useEffect(() => {
    if (showError) {
      everErroredRef.current = true;
    }
  }, [showError]);

  const showSuccess = everErroredRef.current && !hasError && !isFocused;

  return (
    <TextField
      {...props}
      {...field}
      name={name}
      value={props.value ?? field.value ?? ''}
      onChange={onChange ?? field.onChange}
      onFocus={(event) => {
        setIsFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        field.onBlur(event);
        setIsFocused(false);
        onBlur?.(event);
      }}
      error={showError}
      helperText={showError ? renderErrorMessages(errorMessages) : helperText ?? ' '}
      sx={(theme) => ({
        '& .MuiOutlinedInput-root': {
          transition: 'border-color 200ms ease, box-shadow 200ms ease',
          ...(showSuccess
            ? {
                '& fieldset': {
                  borderColor: theme.palette.success.main,
                },
                '&:hover fieldset': {
                  borderColor: theme.palette.success.dark,
                },
                '&.Mui-focused fieldset': {
                  borderColor: theme.palette.success.main,
                  boxShadow: `0 0 0 3px ${theme.palette.success.light}`,
                },
              }
            : {}),
        },
        ...(showSuccess
          ? {
              '& .MuiFormLabel-root': {
                color: theme.palette.success.main,
              },
            }
          : {}),
      })}
    />
  );
};

export default FormikTextField;
