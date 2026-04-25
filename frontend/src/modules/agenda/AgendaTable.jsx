import { useState } from "react";
import { CheckCircle2, Download, Edit3, Plus, Trash2 } from "lucide-react";
import { Badge, ButtonGroup, Offcanvas, Stack } from "react-bootstrap";
import { DataTable } from "../../ui/DataTable";
import { QueryState } from "../../ui/QueryState";
import { TableActionsDropdown } from "../../ui/TableActionsDropdown";

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
  const [isUtilityOpen, setIsUtilityOpen] = useState(false);

  return (
    <section className="panel" id="agenda" style={{ display: "flex", flexDirection: "column", flex: "1 1 auto", minHeight: 0, overflow: "hidden" }}>
      <div className="panel-title split">
        <h2>Agenda y tareas</h2>
        <Stack direction="horizontal" gap={2} className="panel-actions">
          <label className="search-box">
            Buscar
            <input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Titulo, expediente, estado" />
          </label>
          <ButtonGroup aria-label="Vista de agenda" className="segmented-control">
            <button className={`secondary-button ${typeFilter === "todos" ? "active" : ""}`} type="button" onClick={() => onTypeFilterChange("todos")}>
              General
            </button>
            <button className={`secondary-button ${typeFilter === "agenda" ? "active" : ""}`} type="button" onClick={() => onTypeFilterChange("agenda")}>
              Agenda
            </button>
            <button className={`secondary-button ${typeFilter === "tarea" ? "active" : ""}`} type="button" onClick={() => onTypeFilterChange("tarea")}>
              Tareas
            </button>
          </ButtonGroup>
          <button className="primary-button" type="button" onClick={onCreate}>
            <Plus size={17} />
            Nueva tarea
          </button>
          <button className="secondary-button" type="button" onClick={() => setIsUtilityOpen(true)}>
            <Download size={16} />
            Reporte
          </button>
        </Stack>
      </div>
      {message && <p className={isSaveError ? "form-message error-text" : "form-message"}>{message}</p>}
      <QueryState isLoading={isLoading} isError={isError} loadingText="Cargando agenda..." errorText="No se pudo cargar la agenda." />
      {!isLoading && !isError && (
        <DataTable maxHeight="clamp(26rem, calc(100vh - 15rem), 68vh)">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Titulo</th>
                <th>Expediente</th>
                <th>Tipo</th>
                <th>Estado</th>
                <th className="actions-cell">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {actions.map((item) => (
                <tr key={item.id} className={isOverdueAgendaItem(item) ? "agenda-row-overdue" : undefined}>
                  <td>{formatDate(item.fecha_vencimiento || item.fecha_evento)}</td>
                  <td>{item.clase_actuacion === "agenda" ? item.hora_evento || "-" : "-"}</td>
                  <td>{item.titulo || item.descripcion || "-"}</td>
                  <td>{item.numero_expediente || item.caratula || "-"}</td>
                  <td>
                    <Badge pill bg="light" text="dark" className="status-pill">
                      {item.clase_actuacion === "agenda" ? "Agenda" : "Tarea"}
                    </Badge>
                  </td>
                  <td>
                    <Badge pill bg="light" text="dark" className={`status-pill ${item.cumplida ? "success" : getAgendaStateClass(item.estado_actuacion)}`}>
                      {formatAgendaState(item)}
                    </Badge>
                  </td>
                  <td className="actions-cell">
                    <TableActionsDropdown
                      label="Acciones de agenda"
                      items={[
                        { key: "complete", label: "Cumplir", icon: <CheckCircle2 size={15} />, onClick: () => onComplete(item.id), hidden: item.cumplida },
                        { key: "edit", label: "Editar", icon: <Edit3 size={15} />, onClick: () => onEdit(item.id) },
                        { key: "delete", label: "Eliminar", icon: <Trash2 size={15} />, onClick: () => onDelete(item), danger: true },
                      ]}
                    />
                  </td>
                </tr>
              ))}
              {actions.length === 0 && (
                <tr>
                  <td colSpan="7">No hay actuaciones para los filtros seleccionados.</td>
                </tr>
              )}
            </tbody>
        </DataTable>
      )}

      <Offcanvas show={isUtilityOpen} onHide={() => setIsUtilityOpen(false)} placement="end">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Reporte de agenda</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <div className="offcanvas-form-grid">
            <p className="muted-text">
              Incluye solo elementos pendientes desde hoy para la vista seleccionada.
            </p>
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
              Descargar PDF
            </button>
          </div>
        </Offcanvas.Body>
      </Offcanvas>
    </section>
  );
}

function formatDate(value) {
  if (!value) return "-";
  return value;
}

function getAgendaStateClass(state) {
  const normalized = String(state || "").toLowerCase();
  if (["pendiente", "programada"].includes(normalized)) return "pending";
  if (["vencida", "cancelada"].includes(normalized)) return "warning";
  if (["cumplida", "cerrada"].includes(normalized)) return "success";
  return "";
}

function formatAgendaState(item) {
  if (item.cumplida) return "Cumplida";
  const labels = {
    pendiente: "Pendiente",
    en_proceso: "En proceso",
    vencida: "Vencida",
    finalizada: "Finalizada",
    cancelada: "Cancelada",
  };
  return labels[item.estado_actuacion] || item.estado_actuacion || "Pendiente";
}

function isOverdueAgendaItem(item) {
  if (item.cumplida) return false;
  const date = item.fecha_vencimiento || item.fecha_evento || "";
  if (!date) return false;
  return date < new Date().toISOString().slice(0, 10);
}
