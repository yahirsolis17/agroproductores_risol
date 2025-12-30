import React, { useEffect, useRef, useState } from 'react';
import Autocomplete, { AutocompleteProps } from '@mui/material/Autocomplete';
import { TextField, TextFieldProps } from '@mui/material';
import { useField, useFormikContext } from 'formik';
import { normalizeErrorMessages, renderErrorMessages } from './formFieldUtils';

type BaseProps<T> = AutocompleteProps<T, boolean | undefined, boolean | undefined, boolean | undefined>;

type Props<T> = Omit<BaseProps<T>, 'renderInput'> & {
  name: string;
  label: string;
  helperText?: React.ReactNode;
  textFieldProps?: TextFieldProps;
};

function FormikAutocomplete<T>(props: Props<T>) {
  const { name, label, helperText, textFieldProps, ...autoProps } = props;
  const [field, meta, helpers] = useField(name);
  const { submitCount, status, setStatus } = useFormikContext();
  const [isFocused, setIsFocused] = useState(false);
  const everErroredRef = useRef(false);

  const serverError = (status as any)?.serverFieldErrors?.[name];
  const effectiveError = meta.error ?? serverError;
  const errorMessages = normalizeErrorMessages(effectiveError);
  const hasError = errorMessages.length > 0;
  const showError = hasError && !isFocused && (meta.touched || submitCount > 0 || Boolean(serverError));

  useEffect(() => {
    if (showError) {
      everErroredRef.current = true;
    }
  }, [showError]);

  const showSuccess = everErroredRef.current && !hasError && !isFocused;

  return (
    <Autocomplete
      {...autoProps}
      onChange={(event, value, reason, details) => {
        if ((status as any)?.serverFieldErrors?.[name]) {
          setStatus({
            ...(status as any),
            serverFieldErrors: {
              ...(status as any)?.serverFieldErrors,
              [name]: undefined,
            },
          });
        }
        autoProps.onChange?.(event, value, reason, details);
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          {...textFieldProps}
          name={name}
          label={label}
          onFocus={(event) => {
            setIsFocused(true);
            textFieldProps?.onFocus?.(event);
          }}
          onBlur={(event) => {
            field.onBlur(event);
            helpers.setTouched(true, false);
            setIsFocused(false);
            textFieldProps?.onBlur?.(event);
          }}
          error={showError}
          helperText={showError ? renderErrorMessages(errorMessages) : helperText ?? ' '}
          InputProps={{
            ...params.InputProps,
            ...textFieldProps?.InputProps,
            endAdornment: (
              <>
                {textFieldProps?.InputProps?.endAdornment}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
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
      )}
    />
  );
}

export default FormikAutocomplete;
