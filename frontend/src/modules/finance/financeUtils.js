import { currentMonthISO, isPastISODate } from "../../utils/dateTime";

export function formatMoney(amount, currency = "ARS") {
  return `${currency || "ARS"} ${Number(amount || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatInstallments(item) {
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

export function groupMovements(movements, includeHistoricalSettled = false) {
  const currentMonth = currentMonthISO();

  return movements.reduce(
    (groups, item) => {
      const state = String(item.estado_pago || "").toLowerCase();
      const itemMonth = String(item.fecha_movimiento || "").slice(0, 7);
      const isHistoricalSettled = ["pagado", "cobrado"].includes(state) && itemMonth < currentMonth;
      const reportGroup = classifyMovementGroup(item);

      if (isHistoricalSettled && !includeHistoricalSettled) {
        return groups;
      }

      if (reportGroup === "payments") {
        if (itemMonth === currentMonth || includeHistoricalSettled) {
          groups.payable.push(item);
        }
        return groups;
      }

      const dueDate = item.fecha_vencimiento || item.fecha_movimiento || "";

      if (reportGroup === "receivable" && (state === "vencido" || (state === "pendiente" && isPastDate(dueDate)))) {
        groups.overdue.push(item);
        return groups;
      }

      if (reportGroup === "income" && itemMonth === currentMonth) {
        groups.collected.push(item);
        return groups;
      }

      groups.pending.push(item);
      return groups;
    },
    { payable: [], collected: [], pending: [], overdue: [] }
  );
}

export function buildSummaries(groups) {
  const items = [
    { key: "payable", label: "Lo que se paga", movements: groups.payable },
    { key: "collected", label: "Cobrado", movements: groups.collected },
    { key: "pending", label: "Por cobrar", movements: groups.pending },
    { key: "overdue", label: "Cobros vencidos", movements: groups.overdue },
  ];

  const summaries = items.map((item) => {
    const firstCurrency = item.movements[0]?.moneda || "ARS";
    return {
      key: item.key,
      label: item.label,
      currency: firstCurrency,
      count: item.movements.length,
      amount: item.movements.reduce((total, movement) => total + getCurrentInstallmentAmount(movement), 0),
    };
  });
  const collected = summaries.find((item) => item.key === "collected");
  const payable = summaries.find((item) => item.key === "payable");

  return [
    ...summaries,
    {
      key: "monthly-balance",
      label: "Saldo del mes",
      currency: collected?.currency || payable?.currency || "ARS",
      amount: Number((Number(collected?.amount || 0) - Number(payable?.amount || 0)).toFixed(2)),
      caption: "Cobrado - pagos",
      isBalance: true,
    },
  ];
}

export function getCurrentInstallmentAmount(item) {
  const total = Number(item.cuotas_total || 1);
  if (total > 1) {
    return Number(item.monto_cuota || 0);
  }
  return Number(item.monto || 0);
}

export function getStateClass(state) {
  const normalized = String(state || "").toLowerCase();
  if (["pagado", "cobrado"].includes(normalized)) return "success";
  if (["cancelado", "vencido"].includes(normalized)) return "warning";
  return "pending";
}

export function formatConcept(item) {
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

export function getVisibleGroups(groupedMovements, activeSummary) {
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

export function buildGeneralMovements(groupedMovements) {
  return getVisibleGroups(groupedMovements, "all").flatMap((group) =>
    group.movements.map((movement) => ({
      ...movement,
      financeGroupLabel: group.title,
      financeSortKey: group.key,
    }))
  );
}

export function isOutgoingMovement(item) {
  const slug = String(item.tipo_movimiento_slug || "").toLowerCase();
  return slug === "gasto" || slug === "cuenta_por_pagar";
}

export function classifyMovementGroup(item) {
  const state = String(item.estado_pago || "").toLowerCase();

  if (isOutgoingMovement(item)) {
    return "payments";
  }

  if (["pagado", "cobrado"].includes(state)) {
    return "income";
  }

  return "receivable";
}

export function isPastDate(value) {
  return isPastISODate(value);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
