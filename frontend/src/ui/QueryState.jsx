import { AlertCircle, Loader2 } from "lucide-react";

export function QueryState({ isLoading, isError, loadingText = "Cargando datos...", errorText = "No se pudieron cargar los datos." }) {
  if (isLoading) {
    return (
      <div className="query-state">
        <Loader2 className="spin" size={18} />
        {loadingText}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="query-state error-text">
        <AlertCircle size={18} />
        {errorText}
      </div>
    );
  }

  return null;
}
