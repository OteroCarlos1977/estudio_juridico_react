import { useState } from "react";
import { Download, Edit3, Filter, Plus, Search, SlidersHorizontal, Trash2, X } from "lucide-react";
import { Badge, ButtonGroup, Card, Col, Row, Stack } from "react-bootstrap";
import { DataTable } from "../../ui/DataTable";
import { QueryState } from "../../ui/QueryState";
import {
  buildGeneralMovements,
  buildSummaries,
  formatConcept,
  formatInstallments,
  formatMoney,
  getCurrentInstallmentAmount,
  getStateClass,
  getVisibleGroups,
  groupMovements,
} from "./financeUtils";
import "./finance.css";

export function FinanceTable({
  movements,
  clients,
  cases,
  filters,
  search,
  paymentStates,
  message,
  isError,
  isLoading,
  isSaveError,
  onSearchChange,
  onFilterChange,
  onCreate,
  onEdit,
  onDelete,
  reportFilters,
  onReportFilterChange,
  onDownloadReport,
}) {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [activeSummary, setActiveSummary] = useState("all");
  const groupedMovements = groupMovements(movements, filters.include_historical_settled);
  const summaries = buildSummaries(groupedMovements);
  const visibleGroups = getVisibleGroups(groupedMovements, activeSummary);
  const groupsContainerStyle = activeSummary === "all"
    ? {
        flex: "1 1 auto",
        minHeight: 0,
        paddingRight: "0.25rem",
      }
    : {
        flex: "1 1 auto",
        minHeight: 0,
        overflow: "visible",
      };

  function toggleSummaryFilter(key) {
    setActiveSummary((current) => (current === key ? "all" : key));
  }

  return (
    <section className="panel">
      <div className="panel-title split">
        <h2>Finanzas</h2>
        <Stack direction="horizontal" gap={2} className="panel-actions finance-toolbar">
          <label className="search-box">
            Buscar
            <input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Concepto, cliente, expediente" />
          </label>
          {movements.length > 0 && activeSummary !== "all" && (
            <button className="secondary-button finance-reset-button" type="button" onClick={() => setActiveSummary("all")}>
              <SlidersHorizontal size={16} />
              Ver todo
            </button>
          )}
          <button className="secondary-button" type="button" onClick={() => setIsFiltersOpen(true)}>
            <Filter size={16} />
            Filtros
          </button>
          <button className="secondary-button" type="button" onClick={() => setIsReportsOpen(true)}>
            <Download size={16} />
            Reportes
          </button>
          <button className="primary-button" type="button" onClick={onCreate}>
            <Plus size={17} />
            Nuevo movimiento
          </button>
        </Stack>
      </div>
      {message && <p className={isSaveError ? "form-message error-text" : "form-message"}>{message}</p>}
      <Row xs={5} className="g-1 flex-nowrap overflow-auto finance-summary-grid">
        {summaries.map((item) => (
          <Col key={item.key} className="finance-summary-col">
            <Card
              as={item.isBalance ? "div" : "button"}
              className={`h-100 text-start finance-summary-card ${item.key} ${activeSummary === item.key ? "active" : ""}`}
              onClick={item.isBalance ? undefined : () => toggleSummaryFilter(item.key)}
              aria-label={item.label}
              aria-pressed={item.isBalance ? undefined : activeSummary === item.key}
            >
              <Card.Body className="d-flex flex-column justify-content-between p-3">
                <Card.Subtitle className="text-muted small">{item.label}</Card.Subtitle>
                <Card.Title as="strong" className="mb-1 finance-summary-amount">
                  {formatMoney(item.amount, item.currency)}
                </Card.Title>
                <Card.Text as="small" className="text-muted mb-0">
                  {item.caption || `${item.count} movimiento${item.count === 1 ? "" : "s"}`}
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
        ))}
        {movements.length === 0 && <p className="muted-text">Sin totales para los filtros seleccionados.</p>}
      </Row>
      <QueryState isLoading={isLoading} isError={isError} loadingText="Cargando movimientos..." errorText="No se pudieron cargar los movimientos." />
      {!isLoading && !isError && (
        <div className="finance-groups" style={groupsContainerStyle}>
          {activeSummary === "all" ? (
            <MovementGroup
              title="Vista General"
              description="Movimientos organizados por estado financiero, sin cortes de seccion durante el scroll."
              movements={buildGeneralMovements(groupedMovements)}
              emptyText="No hay movimientos para los filtros seleccionados."
              showGroupColumn
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ) : (
            visibleGroups.map((group) => (
              <MovementGroup
                key={group.key}
                title={group.title}
                description={group.description}
                movements={group.movements}
                emptyText={group.emptyText}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))
          )}
        </div>
      )}

      {isFiltersOpen && (
        <div className="modal-backdrop" onClick={() => setIsFiltersOpen(false)}>
          <section className="modal-panel finance-utility-modal" onClick={(event) => event.stopPropagation()}>
            <div className="panel-title split">
              <div>
                <h2>Busqueda avanzada</h2>
                <p className="muted-text">Usa estos filtros solo cuando necesites acotar la consulta.</p>
              </div>
              <button className="icon-button close-detail-button" type="button" onClick={() => setIsFiltersOpen(false)} title="Cerrar">
                <X size={16} />
              </button>
            </div>
            <div className="filter-row finance-filters finance-modal-filters">
              <label>
                Estado
                <select name="estado_pago" value={filters.estado_pago} onChange={onFilterChange}>
                  <option value="todos">Todos</option>
                  {paymentStates.map((state) => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </label>
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
                Expediente
                <select name="expediente_id" value={filters.expediente_id} onChange={onFilterChange}>
                  <option value="">Todos</option>
                  {cases.map((caseItem) => (
                    <option key={caseItem.id} value={caseItem.id}>
                      {[caseItem.numero_expediente, caseItem.caratula].filter(Boolean).join(" - ")}
                    </option>
                  ))}
                </select>
              </label>
              <Field label="Desde" name="fecha_desde" type="date" value={filters.fecha_desde} onChange={onFilterChange} />
              <Field label="Hasta" name="fecha_hasta" type="date" value={filters.fecha_hasta} onChange={onFilterChange} />
              <label className="checkbox-field finance-history-toggle">
                <input
                  name="include_historical_settled"
                  type="checkbox"
                  checked={Boolean(filters.include_historical_settled)}
                  onChange={onFilterChange}
                />
                Incluir pagados/cobrados historicos
              </label>
            </div>
            <div className="finance-modal-actions">
              <button className="secondary-button" type="button" onClick={() => setIsFiltersOpen(false)}>
                <Search size={16} />
                Cerrar
              </button>
            </div>
          </section>
        </div>
      )}

      {isReportsOpen && (
        <div className="modal-backdrop" onClick={() => setIsReportsOpen(false)}>
          <section className="modal-panel finance-utility-modal" onClick={(event) => event.stopPropagation()}>
            <div className="panel-title split">
              <div>
                <h2>Reportes de finanzas</h2>
                <p className="muted-text">Configura el reporte sin ocupar espacio de la vista principal.</p>
              </div>
              <button className="icon-button close-detail-button" type="button" onClick={() => setIsReportsOpen(false)} title="Cerrar">
                <X size={16} />
              </button>
            </div>
            <div className="filter-row finance-filters finance-modal-filters finance-report-filters">
              <label>
                Mes
                <input name="mes" type="month" value={reportFilters.mes} onChange={onReportFilterChange} />
              </label>
              <label>
                Estado
                <select name="estado_pago" value={reportFilters.estado_pago} onChange={onReportFilterChange}>
                  <option value="todos">Todos</option>
                  {paymentStates.map((state) => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </label>
              <label>
                Reporte
                <select name="tipo_reporte" value={reportFilters.tipo_reporte} onChange={onReportFilterChange}>
                  <option value="general">General</option>
                  <option value="income">Ingresos</option>
                  <option value="payments">Pagos</option>
                  <option value="receivable">Por cobrar</option>
                  <option value="payment_plans">Planes de pago</option>
                </select>
              </label>
            </div>
            <div className="finance-modal-actions">
              <button className="secondary-button" type="button" onClick={() => onDownloadReport("xls")}>
                <Download size={15} />
                Excel
              </button>
              <button className="primary-button" type="button" onClick={() => onDownloadReport("pdf")}>
                <Download size={15} />
                PDF
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

function MovementGroup({ title, description, movements, emptyText, showGroupColumn = false, onEdit, onDelete }) {
  const totalAmount = movements.reduce((total, movement) => total + getCurrentInstallmentAmount(movement), 0);
  const currency = movements[0]?.moneda || "ARS";

  return (
    <section className="finance-group">
      <div className="subsection-title finance-group-title">
        <div>
          <h2>{title}</h2>
          <p className="muted-text">{description}</p>
        </div>
        <Stack direction="horizontal" gap={2} className="finance-group-meta">
          <Badge pill bg="light" text="dark" className="status-pill">{movements.length}</Badge>
          <Badge pill bg="light" text="dark" className="status-pill">{formatMoney(totalAmount, currency)}</Badge>
        </Stack>
      </div>
      <DataTable
        wrapperClassName="finance-table-wrap"
        className="finance-table"
        scrollStyle={{
          marginBottom: "0.8rem",
          paddingBottom: "0.4rem",
        }}
        maxHeight="clamp(16rem, calc(100vh - 28rem), 22rem)"
      >
          <thead>
            <tr>
              {showGroupColumn && <th>Vista</th>}
              <th>Fecha</th>
              <th>Concepto</th>
              <th>Cliente</th>
              <th>Expediente</th>
              <th>Plan total</th>
              <th>Cuota</th>
              <th>Estado</th>
              <th className="actions-cell finance-actions-cell">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((item) => (
              <tr key={item.id}>
                {showGroupColumn && <td>{item.financeGroupLabel || "-"}</td>}
                <td>{item.fecha_movimiento || "-"}</td>
                <td>
                  <strong className="table-main-text">{formatConcept(item)}</strong>
                  {(item.tipo_movimiento || item.categoria_financiera) && (
                    <span className="table-sub-text">
                      {[item.tipo_movimiento, item.categoria_financiera].filter(Boolean).join(" · ")}
                    </span>
                  )}
                  {item.fecha_vencimiento && <span className="table-sub-text">Vence: {item.fecha_vencimiento}</span>}
                </td>
                <td>{item.cliente || "-"}</td>
                <td>{item.numero_expediente || item.caratula || "-"}</td>
                <td>{formatMoney(item.monto, item.moneda)}</td>
                <td>{formatInstallments(item)}</td>
                <td>
                  <Badge pill bg="light" text="dark" className={`status-pill ${getStateClass(item.estado_pago)}`}>
                    {item.estado_pago || "-"}
                  </Badge>
                </td>
                <td className="actions-cell finance-actions-cell">
                  <ButtonGroup aria-label="Acciones del movimiento" className="row-actions finance-row-actions table-button-group">
                    <button className="row-button icon-only-button" type="button" onClick={() => onEdit(item.id)} title="Editar movimiento">
                      <Edit3 size={15} />
                    </button>
                    <button className="row-button danger icon-only-button" type="button" onClick={() => onDelete(item)} title="Eliminar movimiento">
                      <Trash2 size={15} />
                    </button>
                  </ButtonGroup>
                </td>
              </tr>
            ))}
            {movements.length === 0 && (
              <tr>
                <td colSpan={showGroupColumn ? "9" : "8"}>{emptyText}</td>
              </tr>
            )}
            </tbody>
      </DataTable>
    </section>
  );
}

function Field({ label, name, value, error, onChange, type = "text" }) {
  return (
    <label>
      {label}
      <input name={name} type={type} value={value} onChange={onChange} />
      <ErrorText value={error} />
    </label>
  );
}

function ErrorText({ value }) {
  return value?.length ? <span className="error-text">{value[0]}</span> : null;
}
