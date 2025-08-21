import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Componente fallback opcional a renderizar cuando ocurre un error */
  fallback?: ReactNode;
  /** Handler opcional para “reintentar” o limpiar estado al resetear */
  onReset?: () => void;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  /** Cuando un hijo lanza, activamos el flag. */
  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  /** Puedes loguear el error en un servicio externo. */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false });
    this.props.onReset?.();
  };

  render() {
    const { hasError } = this.state;
    const { fallback, children } = this.props;

    if (hasError) {
      // Usa el fallback recibido o un mensaje por defecto, limpio para producción.
      return (
        fallback ?? (
          <div className="p-6 text-center text-red-600 space-y-2">
            <div>Ha ocurrido un error inesperado.</div>
            <button
              className="px-3 py-1.5 rounded bg-neutral-800 text-white"
              onClick={this.handleReset}
            >
              Reintentar
            </button>
          </div>
        )
      );
    }

    return <>{children}</>;
  }
}

export default ErrorBoundary;
