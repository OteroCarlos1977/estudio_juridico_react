import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Modal } from "react-bootstrap";
import { api } from "../../api/client";
import { confirmDelete, showError, showSuccess } from "../../ui/alerts";
import { downloadFile } from "../../ui/download";
import { FormActionBar, ModalFormHeader } from "../../ui/FormLayout";
import { AgendaForm } from "./AgendaForm";
import { AgendaTable } from "./AgendaTable";

const emptyActionForm = {
  cliente_id: "",
  expediente_id: "",
  clase_actuacion: "agenda",
  titulo: "",
  descripcion: "",
  fecha_evento: "",
  hora_evento: "",
  fecha_vencimiento: "",
  prioridad: "",
  cumplida: false,
  estado_actuacion: "pendiente",
  resultado_cierre: "",
  observaciones: "",
  dias_alerta: 3,
};

export function AgendaPanel() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyActionForm);
  const [editingActionId, setEditingActionId] = useState(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState("todos");
  const [reportFilters, setReportFilters] = useState({ tipo: "diaria", mes: "", tipo_item: "todos" });
  const [isMonthModalOpen, setIsMonthModalOpen] = useState(false);
  const [selectedReportMonth, setSelectedReportMonth] = useState("");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState({});

  const casesQuery = useQuery({
    queryKey: ["cases"],
    queryFn: async () => {
      const response = await api.get("/expedientes");
      return response.data.cases;
    },
    retry: 1,
  });

  const clientsQuery = useQuery({
    queryKey: ["clients"],
    queryFn: async () => (await api.get("/clientes")).data.clients,
    retry: 1,
  });

  const agendaQuery = useQuery({
    queryKey: ["agenda", typeFilter],
    queryFn: async () => {
      const response = await api.get("/agenda", {
        params: {
          estado: "todos",
          tipo: typeFilter === "todos" ? undefined : typeFilter,
          limit: 160,
        },
      });
      return response.data.items;
    },
    retry: 1,
  });

  const saveActionMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingActionId) {
        const response = await api.put(`/agenda/${editingActionId}`, payload);
        return response.data.action;
      }
      const response = await api.post("/agenda", payload);
      return response.data.action;
    },
    onSuccess: (action) => {
      invalidateAgenda();
      resetForm();
      setIsFormModalOpen(false);
      setMessage(`Actuacion guardada: ${action.titulo || action.descripcion}`);
      showSuccess(`Actuacion guardada: ${action.titulo || action.descripcion}`);
    },
    onError: (error) => {
      const response = error.response?.data;
      setErrors(response?.details?.fieldErrors || {});
      setMessage(response?.message || "No se pudo guardar la actuacion.");
      showError(response?.message || "No se pudo guardar la actuacion.");
    },
  });

  const completeActionMutation = useMutation({
    mutationFn: async (actionId) => {
      const response = await api.patch(`/agenda/${actionId}/cumplida`, { cumplida: true });
      return response.data.action;
    },
    onSuccess: () => {
      invalidateAgenda();
      setMessage("Actuacion marcada como cumplida.");
      showSuccess("Actuacion marcada como cumplida.");
    },
  });

  const deleteActionMutation = useMutation({
    mutationFn: async (actionId) => {
      await api.delete(`/agenda/${actionId}`);
      return actionId;
    },
    onSuccess: (actionId) => {
      invalidateAgenda();
      if (editingActionId === actionId) {
        resetForm();
        setIsFormModalOpen(false);
      }
      setMessage("Actuacion eliminada.");
      showSuccess("Actuacion eliminada.");
    },
  });

  const filteredAgenda = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return agendaQuery.data || [];

    return (agendaQuery.data || []).filter((item) =>
      [item.titulo, item.descripcion, item.numero_expediente, item.caratula, item.clase_actuacion, item.estado_actuacion]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [agendaQuery.data, search]);

  const filteredFormCases = useMemo(() => {
    const cases = casesQuery.data || [];
    if (!form.cliente_id) return [];
    return cases.filter((caseItem) => String(caseItem.cliente_principal_id) === String(form.cliente_id));
  }, [casesQuery.data, form.cliente_id]);

  function invalidateAgenda() {
    queryClient.invalidateQueries({ queryKey: ["agenda"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
  }

  function handleChange(event) {
    const { name, type, checked, value } = event.target;
    setForm((current) => {
      const next = { ...current, [name]: type === "checkbox" ? checked : value };
      if (name === "clase_actuacion" && value === "tarea") {
        next.hora_evento = "";
      }
      if (name === "cliente_id") {
        const selectedCase = casesQuery.data?.find((caseItem) => String(caseItem.id) === String(next.expediente_id));
        if (selectedCase && String(selectedCase.cliente_principal_id) !== String(value)) {
          next.expediente_id = "";
        }
      }
      if (name === "expediente_id") {
        const selectedCase = casesQuery.data?.find((caseItem) => String(caseItem.id) === String(value));
        if (selectedCase) next.cliente_id = String(selectedCase.cliente_principal_id || "");
      }
      return next;
    });
    setErrors((current) => ({ ...current, [name]: undefined }));
  }

  function handleReportFilterChange(event) {
    const { name, value } = event.target;
    if (name === "tipo" && value === "mes_especifico") {
      setSelectedReportMonth("");
      setIsMonthModalOpen(true);
      return;
    }
    setReportFilters((current) => ({ ...current, [name]: value }));
  }

  async function downloadAgendaReport(monthOverride = "") {
    const params = new URLSearchParams();
    const month = monthOverride || reportFilters.mes;
    params.set("tipo", month ? "mensual" : reportFilters.tipo);
    params.set("tipo_item", typeFilter);
    if (month) params.set("mes", month);
    await downloadFile(`/agenda/reportes/agenda.pdf?${params.toString()}`, "agenda.pdf");
    if (month) {
      setReportFilters((current) => ({ ...current, tipo: "diaria", mes: "" }));
      setSelectedReportMonth("");
      setIsMonthModalOpen(false);
    }
  }

  function closeMonthModal() {
    setSelectedReportMonth("");
    setIsMonthModalOpen(false);
  }

  function handleSubmit(event) {
    event.preventDefault();
    const validationErrors = {};
    if (!form.expediente_id) validationErrors.expediente_id = ["Seleccione un expediente."];
    if (!form.titulo.trim()) validationErrors.titulo = ["El titulo es obligatorio."];
    if (!form.fecha_vencimiento) {
      validationErrors.fecha_vencimiento = ["Seleccione una fecha."];
    }
    if (form.clase_actuacion === "agenda" && !form.hora_evento) {
      validationErrors.hora_evento = ["La agenda requiere horario."];
    }
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    saveActionMutation.mutate(form);
  }

  async function editAction(actionId) {
    const response = await api.get(`/agenda/${actionId}`);
    const action = response.data.action;
    setEditingActionId(action.id);
    setIsFormModalOpen(true);
    setForm({
      cliente_id: String(action.cliente_principal_id || ""),
      expediente_id: String(action.expediente_id || ""),
      clase_actuacion: action.clase_actuacion || "agenda",
      titulo: action.titulo || "",
      descripcion: action.descripcion || "",
      fecha_evento: action.fecha_evento || "",
      hora_evento: action.hora_evento || "",
      fecha_vencimiento: action.fecha_vencimiento || "",
      prioridad: action.prioridad || "",
      cumplida: Boolean(action.cumplida),
      estado_actuacion: action.estado_actuacion || "pendiente",
      resultado_cierre: action.resultado_cierre || "",
      observaciones: action.observaciones || "",
      dias_alerta: action.dias_alerta ?? 3,
    });
    setMessage("");
  }

  function resetForm() {
    setForm(emptyActionForm);
    setEditingActionId(null);
    setErrors({});
  }

  function openNewActionModal() {
    resetForm();
    setMessage("");
    setIsFormModalOpen(true);
  }

  function closeActionModal() {
    resetForm();
    setIsFormModalOpen(false);
  }

  async function deleteAction(action) {
    const confirmed = await confirmDelete({
      title: `Eliminar actuacion "${action.titulo || action.descripcion}"?`,
      text: "Esta accion la ocultara del listado activo.",
    });

    if (confirmed) {
      deleteActionMutation.mutate(action.id);
    }
  }

  return (
    <>
      <AgendaTable
        actions={filteredAgenda}
        search={search}
        typeFilter={typeFilter}
        message={message}
        isError={agendaQuery.isError}
        isLoading={agendaQuery.isLoading}
        isSaveError={saveActionMutation.isError}
        onSearchChange={setSearch}
        onTypeFilterChange={setTypeFilter}
        onCreate={openNewActionModal}
        onComplete={(actionId) => completeActionMutation.mutate(actionId)}
        onEdit={editAction}
        onDelete={deleteAction}
        reportFilters={reportFilters}
        onReportFilterChange={handleReportFilterChange}
        onDownloadReport={downloadAgendaReport}
      />

      {isFormModalOpen && (
        <AgendaForm
          form={form}
          clients={clientsQuery.data || []}
          cases={filteredFormCases}
          errors={errors}
          isEditing={Boolean(editingActionId)}
          isSaving={saveActionMutation.isPending}
          message={message}
          isError={saveActionMutation.isError}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onReset={resetForm}
          onClose={closeActionModal}
        />
      )}

      {isMonthModalOpen && (
        <Modal show onHide={closeMonthModal} centered aria-labelledby="agenda-report-month-title">
          <Modal.Body>
            <ModalFormHeader title="Reporte mensual" titleId="agenda-report-month-title" onClose={closeMonthModal} />
            <form className="client-form modal-form agenda-report-month-form" onSubmit={(event) => { event.preventDefault(); if (selectedReportMonth) downloadAgendaReport(selectedReportMonth); }}>
              <label className="form-wide">
                Mes
                <input type="month" value={selectedReportMonth} onChange={(event) => setSelectedReportMonth(event.target.value)} />
              </label>
              <FormActionBar>
                <button className="primary-button" type="submit" disabled={!selectedReportMonth}>
                  Descargar PDF
                </button>
              </FormActionBar>
            </form>
          </Modal.Body>
        </Modal>
      )}
    </>
  );
}
