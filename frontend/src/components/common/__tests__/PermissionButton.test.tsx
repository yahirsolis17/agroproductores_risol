import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PermissionButton } from '../PermissionButton';
import { useAuth } from '../../../modules/gestion_usuarios/context/AuthContext';

vi.mock('../../../modules/gestion_usuarios/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

type AuthValue = ReturnType<typeof useAuth>;
const mockedUseAuth = vi.mocked(useAuth);

const makeAuth = (overrides: Partial<AuthValue> = {}): AuthValue => ({
  user: null,
  permissions: [],
  loading: false,
  isAuthenticated: true,
  isAdmin: false,
  isUser: true,
  hasPerm: vi.fn().mockReturnValue(false),
  login: vi.fn(),
  logout: vi.fn(),
  refreshSession: vi.fn(),
  ...overrides,
});

describe('PermissionButton', () => {
  it('habilita el boton cuando el usuario tiene el permiso requerido', () => {
    mockedUseAuth.mockReturnValue(makeAuth({
      hasPerm: vi.fn((perm: string) => perm === 'add_huerta'),
    }));

    render(<PermissionButton perm="add_huerta">Crear</PermissionButton>);

    expect(screen.getByRole('button', { name: 'Crear' })).toBeEnabled();
  });

  it('habilita con permisos OR cuando alguno coincide', () => {
    mockedUseAuth.mockReturnValue(makeAuth({
      hasPerm: vi.fn((perm: string) => perm === 'view_venta'),
    }));

    render(<PermissionButton perms={['view_inversioneshuerta', 'view_venta']}>Finanzas</PermissionButton>);

    expect(screen.getByRole('button', { name: 'Finanzas' })).toBeEnabled();
  });

  it('deshabilita el boton cuando no hay permiso', () => {
    mockedUseAuth.mockReturnValue(makeAuth());

    render(<PermissionButton perm="delete_huerta">Eliminar</PermissionButton>);

    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeDisabled();
  });

  it('respeta adminBypass=false aunque el usuario sea admin', () => {
    mockedUseAuth.mockReturnValue(makeAuth({
      user: { role: 'admin' } as AuthValue['user'],
      isAdmin: true,
    }));

    render(
      <PermissionButton perm="archive_huerta" adminBypass={false}>
        Archivar
      </PermissionButton>,
    );

    expect(screen.getByRole('button', { name: 'Archivar' })).toBeDisabled();
  });
});
