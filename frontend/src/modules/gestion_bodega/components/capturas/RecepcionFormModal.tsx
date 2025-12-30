import { useEffect, useMemo, useState } from "react";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import { Save, Add } from "@mui/icons-material";
import { Formik, Form } from "formik";

import { formatDateISO, parseLocalDateStrict } from "../../../../global/utils/date";
import { applyBackendErrorsToFormik, isValidationError } from "../../../../global/validation/backendFieldErrors";
import { focusFirstError } from "../../../../global/validation/focusFirstError";
import { handleBackendNotification } from "../../../../global/utils/NotificationEngine";
import FormAlertBanner from "../../../../components/common/form/FormAlertBanner";
import FormikDateField from "../../../../components/common/form/FormikDateField";
import FormikNumberField from "../../../../components/common/form/FormikNumberField";
import FormikTextField from "../../../../components/common/form/FormikTextField";

import type { Captura, CapturaCreateDTO, CapturaUpdateDTO } from "../../types/capturasTypes";

type Props = {
  open: boolean;
  onClose: () => void;
  initial?: Captura | null;
  bodegaId?: number;
  temporadaId?: number;
  onCreate: (payload: CapturaCreateDTO) => Promise<any> | void;
  onUpdate: (id: number, payload: CapturaUpdateDTO) => Promise<any> | void;
  blocked?: boolean;
  blockReason?: string;
  weekRange?: { from?: string; to?: string };
  busy?: boolean;
};

export default function RecepcionFormModal({
  open,
  onClose,
  initial,
  bodegaId,
  temporadaId,
  onCreate,
  onUpdate,
  blocked = false,
  blockReason,
  weekRange,
  busy = false,
}: Props) {
  const isEdit = !!initial;

  const [formErrors, setFormErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setFormErrors([]);
  }, [open, initial]);

  const creationHasContext = useMemo(() => !!bodegaId && !!temporadaId, [bodegaId, temporadaId]);

  const initialValues = useMemo(() => ({
    fecha: initial?.fecha ?? formatDateISO(new Date()),
    huertero_nombre: initial?.huertero_nombre ?? "",
    tipo_mango: initial?.tipo_mango ?? "",
    cantidad_cajas: initial?.cantidad_cajas != null ? String(initial.cantidad_cajas) : "",
    observaciones: initial?.observaciones ?? "",
  }), [initial]);

  const validate = (values: typeof initialValues) => {
    const errors: Partial<Record<keyof typeof initialValues, string>> = {};
    const parsedDate = parseLocalDateStrict(values.fecha);
    const fechaValida = !isNaN(parsedDate.getTime());
    if (!fechaValida) {
      errors.fecha = "Fecha inválida.";
    } else {
      const outOfWeekRange = (() => {
        if (!weekRange?.from || !weekRange?.to) return false;
        const from = parseLocalDateStrict(weekRange.from);
        const to = parseLocalDateStrict(weekRange.to);
        const d = new Date(parsedDate.getTime());
        from.setHours(0, 0, 0, 0);
        to.setHours(0, 0, 0, 0);
        d.setHours(0, 0, 0, 0);
        return d < from || d > to;
      })();
      if (outOfWeekRange && weekRange?.from && weekRange?.to) {
        const f = parseLocalDateStrict(weekRange.from).toLocaleDateString();
        const t = parseLocalDateStrict(weekRange.to).toLocaleDateString();
        errors.fecha = `Fuera del rango de la semana (${f} - ${t}).`;
      } else {
        const isTodayOrYesterday = (() => {
          const d = new Date(parsedDate.getTime());
          const today = new Date();
          d.setHours(0, 0, 0, 0);
          today.setHours(0, 0, 0, 0);
          const diffMs = today.getTime() - d.getTime();
          const diffDays = diffMs / (1000 * 60 * 60 * 24);
          return diffDays === 0 || diffDays === 1;
        })();
        if (!isTodayOrYesterday) {
          errors.fecha = "El sistema solo acepta capturas para HOY o AYER.";
        }
      }
    }

    if (!values.tipo_mango.trim()) {
      errors.tipo_mango = "El tipo es requerido.";
    }

    const raw = values.cantidad_cajas.trim();
    const n = raw ? Number(raw) : NaN;
    if (!Number.isFinite(n) || Math.trunc(n) <= 0) {
      errors.cantidad_cajas = "Debe ser un entero mayor a 0.";
    }

    return errors;
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="recepcion-form-title">
      <DialogTitle id="recepcion-form-title">
        {isEdit ? "Editar recepción" : "Registrar recepción"}
      </DialogTitle>

      <Formik
        initialValues={initialValues}
        enableReinitialize
        validate={validate}
        validateOnChange={false}
        validateOnBlur
        validateOnMount={false}
        onSubmit={async (values, helpers) => {
          const raw = values.cantidad_cajas.trim();
          const n = Math.trunc(Number(raw));
          const payloadBase = {
            bodega: initial?.bodega ?? (bodegaId as number),
            temporada: initial?.temporada ?? (temporadaId as number),
            fecha: values.fecha,
            huertero_nombre: values.huertero_nombre,
            tipo_mango: values.tipo_mango.trim(),
            cantidad_cajas: n,
            observaciones: values.observaciones?.trim() ? values.observaciones.trim() : "",
          };

          try {
            if (isEdit && initial) {
              const payload: CapturaUpdateDTO = { ...payloadBase };
              await onUpdate(initial.id, payload);
            } else {
              const payload: CapturaCreateDTO = { ...payloadBase };
              await onCreate(payload);
            }
            setFormErrors([]);
            onClose();
          } catch (err: unknown) {
            const normalized = applyBackendErrorsToFormik(err, helpers);
            if (isValidationError(err)) {
              setFormErrors(normalized.formErrors);
            } else {
              setFormErrors([]);
              const backend = (err as any)?.data || (err as any)?.response?.data || {};
              handleBackendNotification(backend);
            }
          } finally {
            helpers.setSubmitting(false);
          }
        }}
      >
        {({ isSubmitting, values, setTouched, validateForm, submitForm }) => {
          const parsedDate = parseLocalDateStrict(values.fecha);
          const fechaValida = !isNaN(parsedDate.getTime());
          const outOfWeekRange = (() => {
            if (!weekRange?.from || !weekRange?.to || !fechaValida) return false;
            const from = parseLocalDateStrict(weekRange.from);
            const to = parseLocalDateStrict(weekRange.to);
            const d = new Date(parsedDate.getTime());
            from.setHours(0, 0, 0, 0);
            to.setHours(0, 0, 0, 0);
            d.setHours(0, 0, 0, 0);
            return d < from || d > to;
          })();

          const isTodayOrYesterday = (() => {
            if (!fechaValida) return false;
            const d = new Date(parsedDate.getTime());
            const today = new Date();
            d.setHours(0, 0, 0, 0);
            today.setHours(0, 0, 0, 0);
            const diffMs = today.getTime() - d.getTime();
            const diffDays = diffMs / (1000 * 60 * 60 * 24);
            return diffDays === 0 || diffDays === 1;
          })();

          const raw = values.cantidad_cajas.trim();
          const n = raw ? Number(raw) : NaN;
          const cajasValidas = Number.isFinite(n) && Math.trunc(n) > 0;

          const tipoValido = values.tipo_mango.trim().length > 0;

          const disabledSubmit = blocked || busy || !fechaValida || outOfWeekRange || !tipoValido || !cajasValidas || (!isEdit && !creationHasContext) || !isTodayOrYesterday;

          return (
            <Form
              onSubmit={async (event) => {
                event.preventDefault();
                const validationErrors = await validateForm();
                if (Object.keys(validationErrors).length) {
                  const touchedFields = Object.keys(validationErrors).reduce<Record<string, boolean>>(
                    (acc, key) => ({ ...acc, [key]: true }),
                    {}
                  );
                  setTouched(touchedFields, false);
                  focusFirstError(validationErrors, event.currentTarget);
                  return;
                }
                submitForm();
              }}
            >
              <DialogContent dividers>
                {blocked && (
                  <Alert severity="warning" variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
                    <AlertTitle>Operación bloqueada</AlertTitle>
                    {blockReason || "Semana cerrada o temporada finalizada. El formulario está en solo lectura."}
                  </Alert>
                )}
                <FormAlertBanner
                  open={formErrors.length > 0}
                  severity="error"
                  title="Revisa la información"
                  messages={formErrors}
                />

                <Stack spacing={2}>
                  <FormikDateField
                    label="Fecha"
                    name="fecha"
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    disabled={blocked || busy}
                  />

                  <FormikTextField
                    label="Huertero"
                    name="huertero_nombre"
                    size="small"
                    disabled={blocked || busy}
                  />

                  <FormikTextField
                    label="Tipo de mango"
                    name="tipo_mango"
                    size="small"
                    disabled={blocked || busy}
                  />

                  <FormikNumberField
                    label="Cantidad de cajas"
                    name="cantidad_cajas"
                    type="number"
                    size="small"
                    inputProps={{ min: 1, step: 1 }}
                    disabled={blocked || busy}
                  />

                  <FormikTextField
                    label="Observaciones"
                    name="observaciones"
                    size="small"
                    multiline
                    minRows={2}
                    disabled={blocked || busy}
                  />
                </Stack>
              </DialogContent>

              <DialogActions>
                <Button onClick={onClose} sx={{ textTransform: "none" }}>
                  Cancelar
                </Button>
                <Button
                  variant="contained"
                  type="submit"
                  disabled={disabledSubmit || isSubmitting}
                  startIcon={isEdit ? <Save /> : <Add />}
                  sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
                >
                  {isEdit ? "Guardar cambios" : "Crear"}
                </Button>
              </DialogActions>
            </Form>
          );
        }}
      </Formik>
    </Dialog>
  );
}
