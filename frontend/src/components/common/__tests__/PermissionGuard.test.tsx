import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import PermissionGuard from '../PermissionGuard';
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

describe('PermissionGuard', () => {
  it('renderiza los hijos cuando cumple cualquier permiso requerido', () => {
    mockedUseAuth.mockReturnValue(makeAuth({
      hasPerm: vi.fn((perm: string) => perm === 'view_huerta'),
    }));

    render(
      <MemoryRouter initialEntries={['/privado']}>
        <Routes>
          <Route
            path="/privado"
            element={(
              <PermissionGuard anyOf={['view_huerta', 'view_huertarentada']}>
                <div>Permitido</div>
              </PermissionGuard>
            )}
          />
          <Route path="/unauthorized" element={<div>No autorizado</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Permitido')).toBeInTheDocument();
  });

  it('redirige cuando no cumple los permisos requeridos', () => {
    mockedUseAuth.mockReturnValue(makeAuth());

    render(
      <MemoryRouter initialEntries={['/privado']}>
        <Routes>
          <Route
            path="/privado"
            element={(
              <PermissionGuard allOf={['view_huerta', 'change_huerta']}>
                <div>Zona privada</div>
              </PermissionGuard>
            )}
          />
          <Route path="/unauthorized" element={<div>No autorizado</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('No autorizado')).toBeInTheDocument();
  });
});
