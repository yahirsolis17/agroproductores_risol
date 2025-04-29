import { Tooltip, Button, ButtonProps } from '@mui/material';
import { useSelector, shallowEqual } from 'react-redux';
import type { RootState } from '../../global/store/store';
import { useAuth } from '../../modules/gestion_usuarios/context/AuthContext';

export const PermissionButton = (
  props: ButtonProps & { perm: string }
) => {
  /* 1️⃣  AuthContext primero */
  const { user: ctxUser, permissions: ctxPerms } = useAuth();

  /* 2️⃣  Redux respaldo */
  const roleRedux = useSelector(
    (s: RootState) => s.auth.user?.role,
    shallowEqual
  );
  const permsRedux = useSelector(
    (s: RootState) => s.auth.permissions,
    shallowEqual
  );

  /* 3️⃣  Resolver rol / permisos finales */
  const role = ctxUser?.role ?? roleRedux;
  const rawPermissions = ctxPerms.length ? ctxPerms : permsRedux;

  /* 4️⃣  Normalizar: quedarnos con la parte posterior al último punto */
  const normalized = rawPermissions.map((p) =>
    p.includes('.') ? p.split('.').pop()! : p
  );

  /* 5️⃣  Regla central */
  const has = role === 'admin' || normalized.includes(props.perm);
  const isDisabled = !has || props.disabled;

  return (
    <Tooltip
      title={has ? '' : 'No tienes permiso'}
      disableHoverListener={has}
    >
      <span
        style={{
          display: 'inline-block',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
        }}
      >
        <Button {...props} disabled={isDisabled} />
      </span>
    </Tooltip>
  );
};
