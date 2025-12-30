import React from 'react';
import FormikTextField, { FormikTextFieldProps } from './FormikTextField';

type Props = FormikTextFieldProps;

const FormikNumberField: React.FC<Props> = (props) => (
  <FormikTextField
    {...props}
    inputMode={props.inputMode ?? 'numeric'}
  />
);

export default FormikNumberField;
