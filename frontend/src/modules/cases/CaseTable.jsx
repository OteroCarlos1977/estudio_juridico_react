import { Edit3, Eye, Plus, Trash2 } from "lucide-react";
import { QueryState } from "../../ui/QueryState";

export function CaseTable({
  cases,
  clients,
  filters,
  stateOptions,
  selectedCaseId,
  message,
  isError,
  isLoading,
  isSaveError,
  onFilterChange,
  onCreate,
  onView,
  onEdit,
  onDelete,
}) {
  return (
    <section className="panel">
      <div className="panel-title split">
        <h2>Expedientes</h2>
        <div className="panel-actions">
          <label className="search-box">
            Buscar
            <input name="q" value={filters.q} onChange={onFilterChange} placeholder="Numero, caratula, cliente" />
          </label>
          <button className="primary-button" type="button" onClick={onCreate}>
            <Plus size={17} />
            Nuevo expediente
          </button>
        </div>
      </div>
      {message && <p className={isSaveError ? "form-message error-text" : "form-message"}>{message}</p>}
      <div className="filter-row case-filters">
        <label>
          Cliente
          <select name="cliente_id" value={filters.cliente_id} onChange={onFilterChange}>
            <option value="">Todos</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.razon_social || [client.apellido, client.nombre].filter(Boolean).join(", ")}
              </option>
            ))}
          </select>
        </label>
        <label>
          Estado
          <select name="estado" value={filters.estado} onChange={onFilterChange}>
            <option value="todos">Todos</option>
            {stateOptions.map((state) => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
        </label>
        <label>
          Fuero
          <input name="fuero" value={filters.fuero} onChange={onFilterChange} placeholder="Civil, Laboral..." />
        </label>
        <label>
          Desde
          <input name="fecha_desde" type="date" value={filters.fecha_desde} onChange={onFilterChange} />
        </label>
        <label>
          Hasta
          <input name="fecha_hasta" type="date" value={filters.fecha_hasta} onChange={onFilterChange} />
        </label>
        <label>
          Limite
          <select name="limit" value={filters.limit} onChange={onFilterChange}>
            <option value="10">10</option>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="200">200</option>
            <option value="300">300</option>
          </select>
        </label>
      </div>
      <QueryState isLoading={isLoading} isError={isError} loadingText="Cargando expedientes..." errorText="No se pudieron cargar los expedientes." />
      {!isLoading && !isError && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Numero</th>
                <th>Caratula</th>
                <th>Cliente</th>
                <th>Fuero</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((caseItem) => (
                <tr key={caseItem.id} className={selectedCaseId === caseItem.id ? "selected-row" : undefined}>
                  <td>{caseItem.numero_expediente || "-"}</td>
                  <td>{caseItem.caratula || "-"}</td>
                  <td>{caseItem.cliente || "-"}</td>
                  <td>{caseItem.fuero || "-"}</td>
                  <td>{caseItem.estado_expediente || "-"}</td>
                  <td>
                    <div className="row-actions">
                      <button className="row-button" type="button" onClick={() => onView(caseItem.id)}>
                        <Eye size={15} />
                        Ver
                      </button>
                      <button className="row-button" type="button" onClick={() => onEdit(caseItem.id)}>
                        <Edit3 size={15} />
                        Editar
                      </button>
                      <button className="row-button danger" type="button" onClick={() => onDelete(caseItem)}>
                        <Trash2 size={15} />
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {cases.length === 0 && (
                <tr>
                  <td colSpan="6">No hay expedientes activos para mostrar.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
