import { CheckCircle2, Download, Edit3, Plus, Trash2 } from "lucide-react";
import { QueryState } from "../../ui/QueryState";

export function AgendaTable({
  actions,
  search,
  typeFilter,
  message,
  isError,
  isLoading,
  isSaveError,
  onSearchChange,
  onTypeFilterChange,
  onCreate,
  onComplete,
  onEdit,
  onDelete,
  reportFilters,
  onReportFilterChange,
  onDownloadReport,
}) {
  return (
    <section className="panel" id="agenda">
      <div className="panel-title split">
        <h2>Agenda y tareas</h2>
        <div className="panel-actions">
          <label className="search-box">
            Buscar
            <input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Titulo, expediente, estado" />
          </label>
          <button className="primary-button" type="button" onClick={onCreate}>
            <Plus size={17} />
            Nueva tarea
          </button>
        </div>
      </div>
      {message && <p className={isSaveError ? "form-message error-text" : "form-message"}>{message}</p>}
      <div className="filter-row">
        <label>
          Ver
          <select value={typeFilter} onChange={(event) => onTypeFilterChange(event.target.value)}>
            <option value="todos">Todo</option>
            <option value="agenda">Agenda</option>
            <option value="tarea">Tareas</option>
          </select>
        </label>
      </div>
      <section className="subsection-title">
        <div className="panel-title split">
          <h2>Reportes de agenda</h2>
          <div className="panel-actions report-actions-inline">
            <label>
              Periodo
              <select name="tipo" value={reportFilters.tipo} onChange={onReportFilterChange}>
                <option value="diaria">Diaria</option>
                <option value="semanal">Semanal</option>
                <option value="quincenal">Quincenal</option>
                <option value="mensual">Mes actual</option>
                <option value="mes_especifico">Elegir mes...</option>
              </select>
            </label>
            <button className="secondary-button" type="button" onClick={onDownloadReport}>
              <Download size={15} />
              PDF
            </button>
          </div>
        </div>
      </section>
      <QueryState isLoading={isLoading} isError={isError} loadingText="Cargando agenda..." errorText="No se pudo cargar la agenda." />
      {!isLoading && !isError && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Titulo</th>
                <th>Expediente</th>
                <th>Tipo</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {actions.map((item) => (
                <tr key={item.id}>
                  <td>{formatDate(item.fecha_vencimiento || item.fecha_evento)}</td>
                  <td>{item.clase_actuacion === "agenda" ? item.hora_evento || "-" : "-"}</td>
                  <td>{item.titulo || item.descripcion || "-"}</td>
                  <td>{item.numero_expediente || item.caratula || "-"}</td>
                  <td>{item.clase_actuacion === "agenda" ? "Agenda" : "Tarea"}</td>
                  <td>{item.cumplida ? "Cumplida" : item.estado_actuacion || "Pendiente"}</td>
                  <td>
                    <div className="row-actions">
                      {!item.cumplida && (
                        <button className="row-button" type="button" onClick={() => onComplete(item.id)}>
                          <CheckCircle2 size={15} />
                          Cumplir
                        </button>
                      )}
                      <button className="row-button" type="button" onClick={() => onEdit(item.id)}>
                        <Edit3 size={15} />
                        Editar
                      </button>
                      <button className="row-button danger" type="button" onClick={() => onDelete(item)}>
                        <Trash2 size={15} />
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {actions.length === 0 && (
                <tr>
                  <td colSpan="6">No hay actuaciones para los filtros seleccionados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function formatDate(value) {
  if (!value) return "-";
  return value;
}
