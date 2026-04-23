import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { confirmDelete, showError, showSuccess } from "../../ui/alerts";
import { downloadFile } from "../../ui/download";
import { FinanceForm } from "./FinanceForm";
import { FinanceTable } from "./FinanceTable";

const emptyMovementForm = {
  expediente_id: "",
  cliente_id: "",
  tipo_movimiento_id: 1,
  categoria_financiera_id: "",
  concepto: "",
  descripcion: "",
  fecha_movimiento: new Date().toISOString().slice(0, 10),
  fecha_vencimiento: "",
  monto: "",
  cuotas_total: 1,
  cuota_numero: 1,
  monto_cuota: "",
  porcentaje_interes: 0,
  moneda: "ARS",
  estado_pago: "Pendiente",
  medio_pago: "",
  comprobante_numero: "",
  observaciones: "",
};

const paymentStates = ["Pendiente", "Pagado", "Vencido", "Cancelado", "Cobrado"];

export function FinancePanel() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyMovementForm);
  const [editingMovementId, setEditingMovementId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    estado_pago: "todos",
    cliente_id: "",
    expediente_id: "",
    fecha_desde: "",
    fecha_hasta: "",
  });
  const [reportFilters, setReportFilters] = useState({
    mes: new Date().toISOString().slice(0, 7),
    estado_pago: "todos",
    vencimiento: "todos",
    formato: "xls",
  });
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState({});

  const movementsQuery = useQuery({
    queryKey: ["finance-movements", filters],
    queryFn: async () => {
      const response = await api.get("/finanzas/movimientos", {
        params: {
          ...filters,
          cliente_id: filters.cliente_id || undefined,
          expediente_id: filters.expediente_id || undefined,
          fecha_desde: filters.fecha_desde || undefined,
          fecha_hasta: filters.fecha_hasta || undefined,
          limit: 160,
        },
      });
      return response.data;
    },
    retry: 1,
  });

  const clientsQuery = useQuery({
    queryKey: ["clients"],
    queryFn: async () => (await api.get("/clientes")).data.clients,
    retry: 1,
  });

  const casesQuery = useQuery({
    queryKey: ["cases"],
    queryFn: async () => (await api.get("/expedientes")).data.cases,
    retry: 1,
  });

  const saveMovementMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingMovementId) {
        const response = await api.put(`/finanzas/movimientos/${editingMovementId}`, payload);
        return response.data.movement;
      }
      const response = await api.post("/finanzas/movimientos", payload);
      return response.data.movement;
    },
    onSuccess: (movement) => {
      invalidateFinance();
      closeModal();
      setMessage(`Movimiento guardado: ${movement.concepto}`);
      showSuccess(`Movimiento guardado: ${movement.concepto}`);
    },
    onError: (error) => {
      const response = error.response?.data;
      setErrors(response?.details?.fieldErrors || {});
      setMessage(response?.message || "No se pudo guardar el movimiento.");
      showError(response?.message || "No se pudo guardar el movimiento.");
    },
  });

  const deleteMovementMutation = useMutation({
    mutationFn: async (movementId) => {
      await api.delete(`/finanzas/movimientos/${movementId}`);
      return movementId;
    },
    onSuccess: () => {
      invalidateFinance();
      closeModal();
      setMessage("Movimiento eliminado.");
      showSuccess("Movimiento eliminado.");
    },
  });

  const movements = movementsQuery.data?.movements || [];
  const filteredCasesForFilters = useMemo(() => {
    const allCases = casesQuery.data || [];
    if (!filters.cliente_id) return allCases;
    return allCases.filter((caseItem) => String(caseItem.cliente_principal_id) === String(filters.cliente_id));
  }, [casesQuery.data, filters.cliente_id]);

  const filteredMovements = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return movements;
    return movements.filter((item) =>
      [item.concepto, item.descripcion, item.cliente, item.numero_expediente, item.caratula, item.estado_pago]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [movements, search]);

  function invalidateFinance() {
    queryClient.invalidateQueries({ queryKey: ["finance-movements"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => {
      const next = { ...current, [name]: value };
      if (name === "cliente_id") {
        const selectedCase = casesQuery.data?.find((caseItem) => String(caseItem.id) === String(next.expediente_id));
        if (selectedCase && String(selectedCase.cliente_principal_id) !== String(value)) {
          next.expediente_id = "";
        }
      }
      if (name === "cuotas_total") {
        next.porcentaje_interes = getDefaultInterestPercentage(value);
      }
      if (["monto", "cuotas_total", "porcentaje_interes"].includes(name)) {
        const installmentAmount = calculateInstallmentAmount(next.monto, next.cuotas_total, next.porcentaje_interes);
        next.monto_cuota = installmentAmount ? String(installmentAmount) : "";
      }
      if (name === "cuotas_total" && Number(next.cuota_numero) > Number(value || 1)) {
        next.cuota_numero = value || 1;
      }
      return next;
    });
    setErrors((current) => ({ ...current, [name]: undefined }));
  }

  function handleFilterChange(event) {
    const { name, value } = event.target;
    setFilters((current) => {
      const next = { ...current, [name]: value };
      if (name === "cliente_id") {
        const selectedCase = casesQuery.data?.find((caseItem) => String(caseItem.id) === String(next.expediente_id));
        if (selectedCase && String(selectedCase.cliente_principal_id) !== String(value)) {
          next.expediente_id = "";
        }
      }
      return next;
    });
  }

  function handleReportFilterChange(event) {
    const { name, value } = event.target;
    setReportFilters((current) => ({ ...current, [name]: value }));
  }

  async function downloadFinanceReport(format = reportFilters.formato) {
    const params = new URLSearchParams();
    params.set("mes", reportFilters.mes);
    params.set("estado_pago", reportFilters.estado_pago);
    params.set("vencimiento", reportFilters.vencimiento);
    if (filters.cliente_id) params.set("cliente_id", filters.cliente_id);
    if (filters.expediente_id) params.set("expediente_id", filters.expediente_id);
    await downloadFile(`/finanzas/reportes/finanzas.${format}?${params.toString()}`, `finanzas.${format}`);
  }

  function handleSubmit(event) {
    event.preventDefault();
    const validationErrors = {};
    if (!form.concepto.trim()) validationErrors.concepto = ["El concepto es obligatorio."];
    if (!form.fecha_movimiento) validationErrors.fecha_movimiento = ["La fecha es obligatoria."];
    if (!Number(form.monto) || Number(form.monto) <= 0) validationErrors.monto = ["El monto debe ser mayor a cero."];
    if (Number(form.cuota_numero) > Number(form.cuotas_total)) {
      validationErrors.cuota_numero = ["La cuota no puede superar el total."];
    }
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    saveMovementMutation.mutate(form);
  }

  function openNewModal() {
    setForm(emptyMovementForm);
    setEditingMovementId(null);
    setErrors({});
    setMessage("");
    setIsModalOpen(true);
  }

  async function editMovement(movementId) {
    const response = await api.get(`/finanzas/movimientos/${movementId}`);
    const movement = response.data.movement;
    setEditingMovementId(movement.id);
    setForm({
      expediente_id: String(movement.expediente_id || ""),
      cliente_id: String(movement.cliente_id || ""),
      tipo_movimiento_id: movement.tipo_movimiento_id || 1,
      categoria_financiera_id: String(movement.categoria_financiera_id || ""),
      concepto: movement.concepto || "",
      descripcion: movement.descripcion || "",
      fecha_movimiento: movement.fecha_movimiento || "",
      fecha_vencimiento: movement.fecha_vencimiento || "",
      monto: String(movement.monto || ""),
      cuotas_total: movement.cuotas_total || 1,
      cuota_numero: movement.cuota_numero || 1,
      monto_cuota: movement.monto_cuota ? String(movement.monto_cuota) : "",
      porcentaje_interes: movement.porcentaje_interes ?? inferInterestPercentage(movement),
      moneda: movement.moneda || "ARS",
      estado_pago: movement.estado_pago || "Pendiente",
      medio_pago: movement.medio_pago || "",
      comprobante_numero: movement.comprobante_numero || "",
      observaciones: movement.observaciones || "",
    });
    setErrors({});
    setMessage("");
    setIsModalOpen(true);
  }

  function closeModal() {
    setForm(emptyMovementForm);
    setEditingMovementId(null);
    setErrors({});
    setIsModalOpen(false);
  }

  async function deleteMovement(movement) {
    const confirmed = await confirmDelete({
      title: `Eliminar movimiento "${movement.concepto}"?`,
      text: "Esta accion lo ocultara del listado activo.",
    });

    if (confirmed) {
      deleteMovementMutation.mutate(movement.id);
    }
  }

  return (
    <>
      <FinanceTable
        movements={filteredMovements}
        clients={clientsQuery.data || []}
        cases={filteredCasesForFilters}
        filters={filters}
        search={search}
        paymentStates={paymentStates}
        message={message}
        isError={movementsQuery.isError}
        isLoading={movementsQuery.isLoading}
        isSaveError={saveMovementMutation.isError}
        onSearchChange={setSearch}
        onFilterChange={handleFilterChange}
        onCreate={openNewModal}
        onEdit={editMovement}
        onDelete={deleteMovement}
        reportFilters={reportFilters}
        onReportFilterChange={handleReportFilterChange}
        onDownloadReport={downloadFinanceReport}
      />

      {isModalOpen && (
        <FinanceForm
          form={form}
          clients={clientsQuery.data || []}
          cases={casesQuery.data || []}
          paymentStates={paymentStates}
          errors={errors}
          isEditing={Boolean(editingMovementId)}
          isSaving={saveMovementMutation.isPending}
          message={message}
          isError={saveMovementMutation.isError}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onClose={closeModal}
          installmentPreview={buildInstallmentPreview(form)}
        />
      )}
    </>
  );
}

function getDefaultInterestPercentage(totalInstallments) {
  const installments = Number(totalInstallments || 1);
  if (installments === 3) return 5;
  if (installments >= 4 && installments <= 6) return 8;
  if (installments >= 7 && installments <= 9) return 10;
  if (installments >= 10 && installments <= 12) return 15;
  return 0;
}

function calculateInstallmentAmount(amount, totalInstallments, interestPercentage) {
  const principal = Number(amount || 0);
  const installments = Number(totalInstallments || 1);
  if (!principal || !installments || installments < 1) return "";
  const financedTotal = principal * (1 + Number(interestPercentage || 0) / 100);
  return Number((financedTotal / installments).toFixed(2));
}

function buildInstallmentPreview(form) {
  const principal = Number(form.monto || 0);
  const installments = Number(form.cuotas_total || 1);
  const interestPercentage = Number(form.porcentaje_interes || 0);
  const installmentAmount = Number(form.monto_cuota || calculateInstallmentAmount(principal, installments, interestPercentage) || 0);
  const financedTotal = installments > 1 ? installmentAmount * installments : principal;

  return {
    interestPercentage,
    installmentAmount,
    financedTotal,
    surcharge: Math.max(financedTotal - principal, 0),
  };
}

function inferInterestPercentage(movement) {
  const principal = Number(movement.monto || 0);
  const installments = Number(movement.cuotas_total || 1);
  const installmentAmount = Number(movement.monto_cuota || 0);
  if (!principal || installments <= 1 || !installmentAmount) return 0;
  return Number((((installmentAmount * installments) / principal - 1) * 100).toFixed(2));
}
