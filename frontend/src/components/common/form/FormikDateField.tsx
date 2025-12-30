import React from 'react';
import FormikTextField, { FormikTextFieldProps } from './FormikTextField';

type Props = FormikTextFieldProps;

const FormikDateField: React.FC<Props> = (props) => (
  <FormikTextField
    {...props}
    type={props.type ?? 'date'}
    InputLabelProps={{ shrink: true, ...(props.InputLabelProps ?? {}) }}
  />
);

export default FormikDateField;
