// src/components/common/ErrorBoundary.tsx
import React, { Component, ReactNode } from 'react';

/**
 * Props:
 *  • children  – nodos que envuelve
 *  • fallback  – ( opcional ) elemento a renderizar cuando ocurre un error
 */
interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * State interno sólo necesita un flag de error.
 */
interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  /** Cuando un hijo lanza, activamos el flag. */
  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  /** Aquí puedes loguear el error en un servicio externo. */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  render() {
    const { hasError } = this.state;
    const { fallback, children } = this.props;

    if (hasError) {
      // Usa el fallback recibido o un mensaje por defecto.
      return (
        fallback ?? (
          <div className="p-6 text-center text-red-600">
            Ha ocurrido un error inesperado puta.
          </div>
        )
      );
    }

    return <>{children}</>;
  }
}

export default ErrorBoundary;
