import * as Yup from 'yup';
import { emptyStringToNull, parseNumber, trimString } from './yupTransforms';
import { validationMessages } from './messages';

export const trimmedString = () =>
  Yup.string().transform(trimString).nullable();

export const requiredString = () =>
  trimmedString().required(validationMessages.required);

export const numberNonNegative = () =>
  Yup.number()
    .transform(parseNumber)
    .typeError(validationMessages.invalidNumber)
    .min(0, validationMessages.nonNegative)
    .nullable();

export const numberPositive = () =>
  Yup.number()
    .transform(parseNumber)
    .typeError(validationMessages.invalidNumber)
    .moreThan(0, validationMessages.positive)
    .nullable();

export const optionalNumber = () =>
  Yup.number()
    .transform(parseNumber)
    .nullable();

export const optionalDate = () =>
  Yup.date()
    .transform(emptyStringToNull)
    .nullable()
    .typeError(validationMessages.invalidDate);

export const phone10Digits = () =>
  trimmedString()
    .matches(/^\d{10}$/, validationMessages.invalidPhone);
