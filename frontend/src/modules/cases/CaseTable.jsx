import { useState } from "react";
import { Edit3, Eye, Filter, Plus, Trash2 } from "lucide-react";
import { Badge, ButtonGroup, Offcanvas, Stack } from "react-bootstrap";
import { DataTable } from "../../ui/DataTable";
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
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  return (
    <section className="panel" style={{ display: "flex", flexDirection: "column", flex: "1 1 auto", minHeight: 0, overflow: "hidden" }}>
      <div className="panel-title split">
        <h2>Expedientes</h2>
        <Stack direction="horizontal" gap={2} className="panel-actions">
          <label className="search-box">
            Buscar
            <input name="q" value={filters.q} onChange={onFilterChange} placeholder="Numero, caratula, cliente" />
          </label>
          <button className="primary-button" type="button" onClick={onCreate}>
            <Plus size={17} />
            Nuevo expediente
          </button>
          <button className="secondary-button" type="button" onClick={() => setIsFiltersOpen(true)}>
            <Filter size={16} />
            Filtros
          </button>
        </Stack>
      </div>
      {message && <p className={isSaveError ? "form-message error-text" : "form-message"}>{message}</p>}
      <QueryState isLoading={isLoading} isError={isError} loadingText="Cargando expedientes..." errorText="No se pudieron cargar los expedientes." />
      {!isLoading && !isError && (
        <DataTable maxHeight="40vh">
            <thead>
              <tr>
                <th>Numero</th>
                <th>Caratula</th>
                <th>Cliente</th>
                <th>Fuero</th>
                <th>Estado</th>
                <th className="actions-cell">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((caseItem) => (
                <tr key={caseItem.id} className={selectedCaseId === caseItem.id ? "selected-row" : undefined}>
                  <td>{caseItem.numero_expediente || "-"}</td>
                  <td>{caseItem.caratula || "-"}</td>
                  <td>{caseItem.cliente || "-"}</td>
                  <td>{caseItem.fuero || "-"}</td>
                  <td>
                    <Badge pill bg="light" text="dark" className={`status-pill ${getCaseStateClass(caseItem.estado_expediente)}`}>
                      {caseItem.estado_expediente || "-"}
                    </Badge>
                  </td>
                  <td className="actions-cell">
                    <ButtonGroup aria-label="Acciones del expediente" className="row-actions table-button-group">
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
                    </ButtonGroup>
                  </td>
                </tr>
              ))}
              {cases.length === 0 && (
                <tr>
                  <td colSpan="6">No hay expedientes activos para mostrar.</td>
                </tr>
              )}
            </tbody>
        </DataTable>
      )}

      <Offcanvas show={isFiltersOpen} onHide={() => setIsFiltersOpen(false)} placement="end">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Filtros de expedientes</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <div className="offcanvas-form-grid">
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
        </Offcanvas.Body>
      </Offcanvas>
    </section>
  );
}

function getCaseStateClass(state) {
  const normalized = String(state || "").toLowerCase();
  if (["activo", "en curso", "abierto"].includes(normalized)) return "pending";
  if (["cerrado", "finalizado", "archivado"].includes(normalized)) return "success";
  if (["vencido", "suspendido"].includes(normalized)) return "warning";
  return "";
}
