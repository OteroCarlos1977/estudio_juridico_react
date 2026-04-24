import { useState } from "react";
import { Download, Edit3, Filter, Plus, Search, SlidersHorizontal, Trash2, X } from "lucide-react";
import { Badge, ButtonGroup, Stack } from "react-bootstrap";
import { DataTable } from "../../ui/DataTable";
import { QueryState } from "../../ui/QueryState";
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
        maxHeight: "clamp(16rem, calc(100vh - 28rem), 24rem)",
        overflowY: "auto",
        overflowX: "hidden",
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
      <div className="totals-grid finance-summary-grid">
        {summaries.map((item) => (
          <button
            className={`metric compact-metric finance-summary-card ${item.key} ${activeSummary === item.key ? "active" : ""}`}
            key={item.key}
            type="button"
            onClick={() => toggleSummaryFilter(item.key)}
            aria-pressed={activeSummary === item.key}
          >
            <span>{item.label}</span>
            <strong>{formatMoney(item.amount, item.currency)}</strong>
            <small>{item.count} movimiento{item.count === 1 ? "" : "s"}</small>
          </button>
        ))}
        {movements.length === 0 && <p className="muted-text">Sin totales para los filtros seleccionados.</p>}
      </div>
      <QueryState isLoading={isLoading} isError={isError} loadingText="Cargando movimientos..." errorText="No se pudieron cargar los movimientos." />
      {!isLoading && !isError && (
        <div className="finance-groups" style={groupsContainerStyle}>
          {visibleGroups.map((group) => (
            <MovementGroup
              key={group.key}
              title={group.title}
              description={group.description}
              movements={group.movements}
              emptyText={group.emptyText}
              autoHeight={activeSummary === "all"}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
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
            <div className="filter-row finance-filters finance-modal-filters">
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
                Pagos
                <select name="vencimiento" value={reportFilters.vencimiento} onChange={onReportFilterChange}>
                  <option value="todos">Todos</option>
                  <option value="actuales_anteriores">Actuales y anteriores</option>
                  <option value="futuros">Futuros</option>
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

function MovementGroup({ title, description, movements, emptyText, autoHeight = false, onEdit, onDelete }) {
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
        autoHeight={autoHeight}
        scrollStyle={{
          marginBottom: "0.8rem",
          paddingBottom: "0.4rem",
        }}
        maxHeight={autoHeight ? undefined : "clamp(16rem, calc(100vh - 28rem), 22rem)"}
      >
          <thead>
            <tr>
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
                <td colSpan="8">{emptyText}</td>
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

function formatMoney(amount, currency = "ARS") {
  return `${currency || "ARS"} ${Number(amount || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatInstallments(item) {
  const total = Number(item.cuotas_total || 1);
  const current = Number(item.cuota_numero || 1);
  const amount = item.monto_cuota || (total > 1 ? Number(item.monto || 0) / total : item.monto);

  if (total <= 1) {
    return formatMoney(amount, item.moneda);
  }

  const state = String(item.estado_pago || "").toLowerCase();
  if (["pagado", "cobrado"].includes(state)) {
    return `${current}/${total} · ${formatMoney(amount, item.moneda)} · cobrada`;
  }

  return `${current}/${total} · ${formatMoney(amount, item.moneda)}`;
}

function groupMovements(movements, includeHistoricalSettled = false) {
  const currentMonth = new Date().toISOString().slice(0, 7);

  return movements.reduce(
    (groups, item) => {
      const state = String(item.estado_pago || "").toLowerCase();
      const itemMonth = String(item.fecha_movimiento || "").slice(0, 7);
      const isHistoricalSettled = ["pagado", "cobrado"].includes(state) && itemMonth < currentMonth;

      if (isHistoricalSettled && !includeHistoricalSettled) {
        return groups;
      }

      if (isOutgoingMovement(item)) {
        if (itemMonth === currentMonth || includeHistoricalSettled) {
          groups.payable.push(item);
        }
        return groups;
      }

      const dueDate = item.fecha_vencimiento || item.fecha_movimiento || "";

      if (["vencido", "cancelado"].includes(state) || (state === "pendiente" && isPastDate(dueDate))) {
        groups.overdue.push(item);
        return groups;
      }

      if (["pagado", "cobrado"].includes(state) && itemMonth === currentMonth) {
        groups.collected.push(item);
        return groups;
      }

      groups.pending.push(item);
      return groups;
    },
    { payable: [], collected: [], pending: [], overdue: [] }
  );
}

function buildSummaries(groups) {
  const items = [
    { key: "payable", label: "Lo que se paga", movements: groups.payable },
    { key: "collected", label: "Cobrado", movements: groups.collected },
    { key: "pending", label: "Por cobrar", movements: groups.pending },
    { key: "overdue", label: "Cobros vencidos", movements: groups.overdue },
  ];

  return items.map((item) => {
    const firstCurrency = item.movements[0]?.moneda || "ARS";
    return {
      key: item.key,
      label: item.label,
      currency: firstCurrency,
      count: item.movements.length,
      amount: item.movements.reduce((total, movement) => total + getCurrentInstallmentAmount(movement), 0),
    };
  });
}

function getCurrentInstallmentAmount(item) {
  const total = Number(item.cuotas_total || 1);
  if (total > 1) {
    return Number(item.monto_cuota || 0);
  }
  return Number(item.monto || 0);
}

function getStateClass(state) {
  const normalized = String(state || "").toLowerCase();
  if (["pagado", "cobrado"].includes(normalized)) return "success";
  if (["cancelado", "vencido"].includes(normalized)) return "warning";
  return "pending";
}

function formatConcept(item) {
  const concept = String(item.concepto || item.descripcion || "-").trim();
  const caseNumber = String(item.numero_expediente || "").trim();

  if (!caseNumber) {
    return concept;
  }

  return concept
    .replace(new RegExp(`\\s*[·\\-]\\s*${escapeRegExp(caseNumber)}$`, "i"), "")
    .replace(new RegExp(`\\s+${escapeRegExp(caseNumber)}$`, "i"), "")
    .trim();
}

function getVisibleGroups(groupedMovements, activeSummary) {
  const groups = [
    {
      key: "payable",
      title: "Lo que se paga",
      description: "Egresos del estudio: internet, IUS, bonos, tasas y otros pagos.",
      movements: groupedMovements.payable,
      emptyText: "No hay pagos del estudio para los filtros seleccionados.",
    },
    {
      key: "collected",
      title: "Cobrado",
      description: "Cobros del mes actual ya abonados por clientes.",
      movements: groupedMovements.collected,
      emptyText: "No hay cobros del mes actual para los filtros seleccionados.",
    },
    {
      key: "pending",
      title: "Por cobrar",
      description: "Proximas cuotas y cobros pendientes aun no vencidos.",
      movements: groupedMovements.pending,
      emptyText: "No hay movimientos por cobrar para los filtros seleccionados.",
    },
    {
      key: "overdue",
      title: "Cobros vencidos",
      description: "Cobros de clientes que no se realizaron en fecha.",
      movements: groupedMovements.overdue,
      emptyText: "No hay cobros vencidos para los filtros seleccionados.",
    },
  ];

  if (activeSummary === "all") {
    return groups;
  }

  return groups.filter((group) => group.key === activeSummary);
}

function getSummaryLabel(key) {
  if (key === "payable") return "Lo que se paga";
  if (key === "collected") return "Cobrado";
  if (key === "pending") return "Por cobrar";
  if (key === "overdue") return "Cobros vencidos";
  return "Todos";
}

function isOutgoingMovement(item) {
  const slug = String(item.tipo_movimiento_slug || "").toLowerCase();
  return slug === "gasto" || slug === "cuenta_por_pagar";
}

function isPastDate(value) {
  if (!value) return false;
  const today = new Date().toISOString().slice(0, 10);
  return value < today;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
