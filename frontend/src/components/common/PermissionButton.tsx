import { Tooltip, Button, ButtonProps } from '@mui/material';
import { useAuth } from '../../modules/gestion_usuarios/context/AuthContext';

type PermProp = {
  /** Un solo permiso requerido (codename plano, p.ej. "add_huerta") */
  perm?: string;
  /** Alternativa: varios permisos (habilita si el usuario tiene al menos uno) */
  perms?: string[];
  /** Si true (default), los admins pasan siempre */
  adminBypass?: boolean;
};

/**
 * Uso:
 *  <PermissionButton perm="add_huerta" variant="contained" />
 *  <PermissionButton perms={['archive_huerta','archive_huertarentada']} size="small" />
 */
export const PermissionButton = (
  props: ButtonProps & PermProp
) => {
  const { user, hasPerm } = useAuth();

  const {
    perm,
    perms,
    adminBypass = true,
    disabled: disabledProp,
    ...btnProps
  } = props;

  // 1) Resolver permisos requeridos (soporta uno o varios)
  const required = perms?.length ? perms : (perm ? [perm] : []);

  // 2) Reglas de habilitación:
  //    - Admin (si adminBypass) → habilitado
  //    - Si no se definió ningún permiso → habilitado (el backend seguirá validando)
  //    - Si se definieron → habilitar si el usuario tiene AL MENOS uno
  const isAdmin = user?.role === 'admin';
  const allowed =
    (adminBypass && isAdmin) ||
    (required.length === 0 ? true : required.some(p => !!p && hasPerm(p)));

  const disabled = !allowed || !!disabledProp;

  return (
    <Tooltip title={allowed ? '' : 'No tienes permiso'} disableHoverListener={allowed}>
      <span style={{ display: 'inline-block', cursor: disabled ? 'not-allowed' : 'pointer' }}>
        <Button {...btnProps} disabled={disabled} />
      </span>
    </Tooltip>
  );
};
