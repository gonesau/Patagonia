import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("ErrorBoundary capturó un error", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto mt-10 max-w-lg rounded-md border border-border bg-white p-6 text-center shadow-sm">
          <h2 className="mb-2 font-heading text-xl text-textDark">Ocurrió un error inesperado</h2>
          <p className="mb-4 text-sm text-neutral">La aplicación se recuperará al recargar la página.</p>
          <Button onClick={this.handleReset}>Recargar</Button>
        </div>
      );
    }

    return this.props.children;
  }
}
