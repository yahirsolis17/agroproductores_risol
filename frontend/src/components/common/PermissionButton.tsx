// src/components/common/PermissionButton.tsx
import { Tooltip, Button, ButtonProps } from '@mui/material';
import { shallowEqual, useSelector } from 'react-redux';
import type { RootState } from '../../global/store/store';
import { useAuth } from '../../modules/gestion_usuarios/context/AuthContext';

/**
 * Uso:
 * <PermissionButton perm="add_huerta" ... />
 */
export const PermissionButton = (
  props: ButtonProps & { perm: string }
) => {
  /* 🎯 1) Primero Redux (siempre está actualizado) */
  const roleRedux  = useSelector(
    (s: RootState) => s.auth.user?.role,
    shallowEqual
  );
  const permsRedux = useSelector(
    (s: RootState) => s.auth.permissions,
    shallowEqual
  );

  /* 🎯 2) Context como respaldo  */
  const { user: ctxUser, permissions: ctxPerms } = useAuth();

  /* 🎯 3) Resolver finales */
  const role = roleRedux ?? ctxUser?.role;
  const raw  = permsRedux.length ? permsRedux : ctxPerms;

  /* 🎯 4) Normalizar codenames */
  const normalized = raw.map(p => p.includes('.') ? p.split('.').pop()! : p);

  /* 🎯 5) Regla */
  const has       = role === 'admin' || normalized.includes(props.perm);
  const disabled  = !has || props.disabled;

  return (
    <Tooltip title={has ? '' : 'No tienes permiso'} disableHoverListener={has}>
      <span style={{ display:'inline-block', cursor: disabled ? 'not-allowed':'pointer' }}>
        <Button {...props} disabled={disabled}/>
      </span>
    </Tooltip>
  );
};
