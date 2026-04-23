import { Download, Edit3, Plus, Trash2 } from "lucide-react";
import { QueryState } from "../../ui/QueryState";

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
  const groupedMovements = groupMovements(movements);
  const summaries = buildSummaries(groupedMovements);

  return (
    <section className="panel">
      <div className="panel-title split">
        <h2>Finanzas</h2>
        <div className="panel-actions">
          <label className="search-box">
            Buscar
            <input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Concepto, cliente, expediente" />
          </label>
          <button className="primary-button" type="button" onClick={onCreate}>
            <Plus size={17} />
            Nuevo movimiento
          </button>
        </div>
      </div>
      {message && <p className={isSaveError ? "form-message error-text" : "form-message"}>{message}</p>}
      <div className="filter-row finance-filters">
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
      </div>
      <section className="subsection-title">
        <div className="panel-title split">
          <h2>Reportes de finanzas</h2>
          <div className="panel-actions report-actions-inline">
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
            <button className="secondary-button" type="button" onClick={() => onDownloadReport("xls")}>
              <Download size={15} />
              Excel
            </button>
            <button className="secondary-button" type="button" onClick={() => onDownloadReport("pdf")}>
              <Download size={15} />
              PDF
            </button>
          </div>
        </div>
      </section>
      <div className="totals-grid finance-summary-grid">
        {summaries.map((item) => (
          <div className="metric compact-metric" key={item.key}>
            <span>{item.label}</span>
            <strong>{formatMoney(item.amount, item.currency)}</strong>
            <small>{item.count} movimiento{item.count === 1 ? "" : "s"}</small>
          </div>
        ))}
        {movements.length === 0 && <p className="muted-text">Sin totales para los filtros seleccionados.</p>}
      </div>
      <QueryState isLoading={isLoading} isError={isError} loadingText="Cargando movimientos..." errorText="No se pudieron cargar los movimientos." />
      {!isLoading && !isError && (
        <div className="finance-groups">
          <MovementGroup
            title="Por cobrar"
            description="Cuotas y movimientos pendientes de ingreso."
            movements={groupedMovements.pending}
            emptyText="No hay movimientos por cobrar para los filtros seleccionados."
            onEdit={onEdit}
            onDelete={onDelete}
          />
          <MovementGroup
            title="Cobrado"
            description="Movimientos registrados como Pagado o Cobrado."
            movements={groupedMovements.collected}
            emptyText="No hay movimientos cobrados para los filtros seleccionados."
            onEdit={onEdit}
            onDelete={onDelete}
          />
          {groupedMovements.other.length > 0 && (
            <MovementGroup
              title="Otros estados"
              description="Movimientos vencidos o cancelados."
              movements={groupedMovements.other}
              emptyText="No hay movimientos en otros estados."
              onEdit={onEdit}
              onDelete={onDelete}
            />
          )}
        </div>
      )}
    </section>
  );
}

function MovementGroup({ title, description, movements, emptyText, onEdit, onDelete }) {
  return (
    <section className="finance-group">
      <div className="subsection-title finance-group-title">
        <div>
          <h2>{title}</h2>
          <p className="muted-text">{description}</p>
        </div>
        <span className="status-pill">{movements.length}</span>
      </div>
      <div className="table-wrap finance-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Concepto</th>
              <th>Cliente</th>
              <th>Expediente</th>
                <th>Plan total</th>
                <th>Interes</th>
                <th>Cuota</th>
                <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((item) => (
              <tr key={item.id}>
                <td>{item.fecha_movimiento || "-"}</td>
                <td>
                  <strong className="table-main-text">{item.concepto || item.descripcion || "-"}</strong>
                  {item.fecha_vencimiento && <span className="table-sub-text">Vence: {item.fecha_vencimiento}</span>}
                </td>
                <td>{item.cliente || "-"}</td>
                <td>{item.numero_expediente || item.caratula || "-"}</td>
                <td>{formatMoney(item.monto, item.moneda)}</td>
                <td>{formatInterest(item)}</td>
                <td>{formatInstallments(item)}</td>
                <td><span className={`status-pill ${getStateClass(item.estado_pago)}`}>{item.estado_pago || "-"}</span></td>
                <td>
                  <div className="row-actions">
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
            {movements.length === 0 && (
              <tr>
                <td colSpan="9">{emptyText}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
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
  const financedTotal = total > 1 ? Number(amount || 0) * total : Number(item.monto || 0);

  if (total <= 1) {
    return formatMoney(amount, item.moneda);
  }

  const state = String(item.estado_pago || "").toLowerCase();
  if (["pagado", "cobrado"].includes(state)) {
    return `${formatMoney(amount, item.moneda)} - cuota ${current} de ${total} cobrada; total financiado ${formatMoney(financedTotal, item.moneda)}`;
  }

  const remaining = Math.max(total - current + 1, 0);
  return `${formatMoney(amount, item.moneda)} - cuota ${current} de ${total}; quedan ${remaining}; total financiado ${formatMoney(financedTotal, item.moneda)}`;
}

function formatInterest(item) {
  return `${getInterestPercentage(item).toLocaleString("es-AR", { maximumFractionDigits: 2 })}%`;
}

function getInterestPercentage(item) {
  if (item.porcentaje_interes !== null && item.porcentaje_interes !== undefined) {
    return Number(item.porcentaje_interes || 0);
  }

  const principal = Number(item.monto || 0);
  const total = Number(item.cuotas_total || 1);
  const amount = Number(item.monto_cuota || 0);
  if (!principal || total <= 1 || !amount) return 0;
  return Number((((amount * total) / principal - 1) * 100).toFixed(2));
}

function groupMovements(movements) {
  return movements.reduce(
    (groups, item) => {
      const state = String(item.estado_pago || "").toLowerCase();
      if (["pagado", "cobrado"].includes(state)) {
        groups.collected.push(item);
      } else if (["cancelado", "vencido"].includes(state)) {
        groups.other.push(item);
      } else {
        groups.pending.push(item);
      }
      return groups;
    },
    { pending: [], collected: [], other: [] }
  );
}

function buildSummaries(groups) {
  const items = [
    { key: "pending", label: "Por cobrar", movements: groups.pending },
    { key: "collected", label: "Cobrado", movements: groups.collected },
  ];

  if (groups.other.length > 0) {
    items.push({ key: "other", label: "Otros estados", movements: groups.other });
  }

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
