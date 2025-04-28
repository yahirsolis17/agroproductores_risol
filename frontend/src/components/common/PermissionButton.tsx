import { Tooltip, Button, ButtonProps } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '../../../src/global/store/store';

export const PermissionButton = (props: ButtonProps & { perm: string }) => {
  const has = useSelector((s: RootState) =>
    s.auth.permissions.includes(props.perm)
  );

  return (
    <Tooltip title={has ? '' : 'No tienes permiso'}>
      <span>
        <Button
          {...props}
          disabled={!has || props.disabled}
          style={{ cursor: has ? 'pointer' : 'not-allowed' }}
        />
      </span>
    </Tooltip>
  );
};
