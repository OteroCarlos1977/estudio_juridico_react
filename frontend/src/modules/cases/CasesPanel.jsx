import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { confirmDelete, showError, showSuccess } from "../../ui/alerts";
import { CaseActionForm } from "./CaseActionForm";
import { CaseDetail } from "./CaseDetail";
import { CaseForm } from "./CaseForm";
import { CaseTable } from "./CaseTable";

const emptyCaseForm = {
  cliente_principal_id: "",
  numero_expediente: "",
  caratula: "",
  materia: "",
  fuero: "",
  jurisdiccion: "",
  juzgado: "",
  secretaria: "",
  estado_expediente: "Activo",
  fecha_inicio: "",
  fecha_cierre: "",
  descripcion: "",
  observaciones: "",
};

const emptyActionForm = {
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

const caseStateOptions = ["Activo", "En tramite", "Suspendido", "Archivado", "Cerrado"];

export function CasesPanel() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyCaseForm);
  const [editingCaseId, setEditingCaseId] = useState(null);
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [filters, setFilters] = useState({
    q: "",
    cliente_id: "",
    estado: "todos",
    fuero: "",
    fecha_desde: "",
    fecha_hasta: "",
    limit: "100",
  });
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState({});
  const [actionForm, setActionForm] = useState(emptyActionForm);
  const [editingActionId, setEditingActionId] = useState(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionErrors, setActionErrors] = useState({});
  const [actionMessage, setActionMessage] = useState("");

  const casesQuery = useQuery({
    queryKey: ["cases", filters],
    queryFn: async () => {
      const response = await api.get("/expedientes", {
        params: {
          q: filters.q || undefined,
          cliente_id: filters.cliente_id || undefined,
          estado: filters.estado === "todos" ? undefined : filters.estado,
          fuero: filters.fuero || undefined,
          fecha_desde: filters.fecha_desde || undefined,
          fecha_hasta: filters.fecha_hasta || undefined,
          limit: filters.limit || undefined,
        },
      });
      return response.data.cases;
    },
    retry: 1,
  });

  const clientsQuery = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const response = await api.get("/clientes");
      return response.data.clients;
    },
    retry: 1,
  });

  const selectedCaseQuery = useQuery({
    queryKey: ["case-detail", selectedCaseId],
    queryFn: async () => {
      const response = await api.get(`/expedientes/${selectedCaseId}`);
      return response.data.case;
    },
    enabled: Boolean(selectedCaseId),
    retry: 1,
  });

  const selectedCaseActionsQuery = useQuery({
    queryKey: ["case-actions", selectedCaseId],
    queryFn: async () => {
      const response = await api.get("/agenda", {
        params: { expediente_id: selectedCaseId, estado: "todos", limit: 80 },
      });
      return response.data.items;
    },
    enabled: Boolean(selectedCaseId),
    retry: 1,
  });

  const selectedCaseAttachmentsQuery = useQuery({
    queryKey: ["case-attachments", selectedCaseId],
    queryFn: async () => {
      const response = await api.get("/adjuntos", {
        params: { expediente_id: selectedCaseId, limit: 80 },
      });
      return response.data.attachments;
    },
    enabled: Boolean(selectedCaseId),
    retry: 1,
  });

  const saveCaseMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingCaseId) {
        const response = await api.put(`/expedientes/${editingCaseId}`, payload);
        return response.data.case;
      }
      const response = await api.post("/expedientes", payload);
      return response.data.case;
    },
    onSuccess: (caseItem) => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["case-detail", caseItem.id] });
      setSelectedCaseId(caseItem.id);
      resetForm();
      setIsCaseModalOpen(false);
      setMessage(`Expediente guardado: ${caseItem.caratula}`);
      showSuccess(`Expediente guardado: ${caseItem.caratula}`);
    },
    onError: (error) => {
      const response = error.response?.data;
      setErrors(response?.details?.fieldErrors || {});
      setMessage(response?.message || "No se pudo guardar el expediente.");
      showError(response?.message || "No se pudo guardar el expediente.");
    },
  });

  const deleteCaseMutation = useMutation({
    mutationFn: async (caseId) => {
      await api.delete(`/expedientes/${caseId}`);
      return caseId;
    },
    onSuccess: (caseId) => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.removeQueries({ queryKey: ["case-detail", caseId] });
      queryClient.removeQueries({ queryKey: ["case-actions", caseId] });
      queryClient.removeQueries({ queryKey: ["case-attachments", caseId] });
      if (selectedCaseId === caseId) setSelectedCaseId(null);
      if (editingCaseId === caseId) closeCaseModal();
      setMessage("Expediente eliminado.");
      showSuccess("Expediente eliminado.");
    },
    onError: (error) => {
      const message = error.response?.data?.message || "No se pudo eliminar el expediente.";
      setMessage(message);
      showError(message);
    },
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
      invalidateActionQueries(action.expediente_id);
      closeActionModal();
      setActionMessage(`Actuacion guardada: ${action.titulo || action.descripcion}`);
      showSuccess(`Actuacion guardada: ${action.titulo || action.descripcion}`);
    },
    onError: (error) => {
      const response = error.response?.data;
      setActionErrors(response?.details?.fieldErrors || {});
      setActionMessage(response?.message || "No se pudo guardar la actuacion.");
      showError(response?.message || "No se pudo guardar la actuacion.");
    },
  });

  const completeActionMutation = useMutation({
    mutationFn: async (actionId) => {
      const response = await api.patch(`/agenda/${actionId}/cumplida`, { cumplida: true });
      return response.data.action;
    },
    onSuccess: (action) => {
      invalidateActionQueries(action.expediente_id);
      setActionMessage("Actuacion marcada como cumplida.");
      showSuccess("Actuacion marcada como cumplida.");
    },
  });

  const deleteActionMutation = useMutation({
    mutationFn: async (actionId) => {
      await api.delete(`/agenda/${actionId}`);
      return actionId;
    },
    onSuccess: () => {
      invalidateActionQueries(selectedCaseId);
      closeActionModal();
      setActionMessage("Actuacion eliminada.");
      showSuccess("Actuacion eliminada.");
    },
  });

  function invalidateActionQueries(caseId) {
    queryClient.invalidateQueries({ queryKey: ["agenda"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    if (caseId) queryClient.invalidateQueries({ queryKey: ["case-actions", caseId] });
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  }

  function handleFilterChange(event) {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const validationErrors = {};
    if (!form.cliente_principal_id) validationErrors.cliente_principal_id = ["Seleccione un cliente."];
    if (!form.caratula.trim()) validationErrors.caratula = ["La caratula es obligatoria."];
    if (form.fecha_inicio && form.fecha_cierre && form.fecha_cierre < form.fecha_inicio) {
      validationErrors.fecha_cierre = ["La fecha de cierre no puede ser anterior a la fecha de inicio."];
    }
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    saveCaseMutation.mutate(form);
  }

  function handleActionChange(event) {
    const { name, type, checked, value } = event.target;
    setActionForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
    setActionErrors((current) => ({ ...current, [name]: undefined }));
  }

  function handleActionSubmit(event) {
    event.preventDefault();
    const validationErrors = {};
    if (!actionForm.descripcion.trim()) validationErrors.descripcion = ["La descripcion es obligatoria."];
    if (!actionForm.fecha_evento && !actionForm.fecha_vencimiento) {
      validationErrors.fecha_vencimiento = ["Cargue fecha de evento o vencimiento."];
    }
    setActionErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    saveActionMutation.mutate(actionForm);
  }

  function openNewCaseModal() {
    resetForm();
    setMessage("");
    setIsCaseModalOpen(true);
  }

  async function editCase(caseId) {
    const response = await api.get(`/expedientes/${caseId}`);
    const caseItem = response.data.case;
    setEditingCaseId(caseItem.id);
    setSelectedCaseId(caseItem.id);
    setIsCaseModalOpen(true);
    setForm({
      cliente_principal_id: String(caseItem.cliente_principal_id || ""),
      numero_expediente: caseItem.numero_expediente || "",
      caratula: caseItem.caratula || "",
      materia: caseItem.materia || "",
      fuero: caseItem.fuero || "",
      jurisdiccion: caseItem.jurisdiccion || "",
      juzgado: caseItem.juzgado || "",
      secretaria: caseItem.secretaria || "",
      estado_expediente: caseItem.estado_expediente || "Activo",
      fecha_inicio: caseItem.fecha_inicio || "",
      fecha_cierre: caseItem.fecha_cierre || "",
      descripcion: caseItem.descripcion || "",
      observaciones: caseItem.observaciones || "",
    });
  }

  function resetForm() {
    setForm(emptyCaseForm);
    setEditingCaseId(null);
    setErrors({});
  }

  function closeCaseModal() {
    resetForm();
    setIsCaseModalOpen(false);
  }

  function openNewActionModal() {
    if (!selectedCaseId) return;
    setEditingActionId(null);
    setActionForm({ ...emptyActionForm, expediente_id: String(selectedCaseId) });
    setActionErrors({});
    setActionMessage("");
    setIsActionModalOpen(true);
  }

  async function editAction(actionId) {
    const response = await api.get(`/agenda/${actionId}`);
    const action = response.data.action;
    setEditingActionId(action.id);
    setActionForm({
      expediente_id: String(action.expediente_id || selectedCaseId || ""),
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
    setActionErrors({});
    setActionMessage("");
    setIsActionModalOpen(true);
  }

  function closeActionModal() {
    setActionForm(emptyActionForm);
    setEditingActionId(null);
    setActionErrors({});
    setIsActionModalOpen(false);
  }

  async function deleteCase(caseItem) {
    const confirmed = await confirmDelete({
      title: `Eliminar expediente "${caseItem.caratula}"?`,
      text: "Esta accion lo ocultara del listado activo.",
    });

    if (confirmed) {
      deleteCaseMutation.mutate(caseItem.id);
    }
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
      <CaseDetail
        caseItem={selectedCaseQuery.data}
        actions={selectedCaseActionsQuery.data || []}
        attachments={selectedCaseAttachmentsQuery.data || []}
        isLoadingActions={selectedCaseActionsQuery.isLoading}
        isLoadingAttachments={selectedCaseAttachmentsQuery.isLoading}
        actionMessage={actionMessage}
        isActionError={saveActionMutation.isError}
        onCreateAction={openNewActionModal}
        onCompleteAction={(actionId) => completeActionMutation.mutate(actionId)}
        onEditAction={editAction}
        onDeleteAction={deleteAction}
        onClose={() => setSelectedCaseId(null)}
      />

      <CaseTable
        cases={casesQuery.data || []}
        clients={clientsQuery.data || []}
        filters={filters}
        stateOptions={caseStateOptions}
        selectedCaseId={selectedCaseId}
        message={message}
        isError={casesQuery.isError}
        isLoading={casesQuery.isLoading}
        isSaveError={saveCaseMutation.isError || deleteCaseMutation.isError}
        onFilterChange={handleFilterChange}
        onCreate={openNewCaseModal}
        onView={setSelectedCaseId}
        onEdit={editCase}
        onDelete={deleteCase}
      />

      {isCaseModalOpen && (
        <CaseForm
          form={form}
          clients={clientsQuery.data || []}
          errors={errors}
          stateOptions={caseStateOptions}
          isEditing={Boolean(editingCaseId)}
          isSaving={saveCaseMutation.isPending}
          message={message}
          isError={saveCaseMutation.isError}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onReset={resetForm}
          onClose={closeCaseModal}
        />
      )}

      {isActionModalOpen && (
        <CaseActionForm
          form={actionForm}
          errors={actionErrors}
          isEditing={Boolean(editingActionId)}
          isSaving={saveActionMutation.isPending}
          message={actionMessage}
          isError={saveActionMutation.isError}
          onChange={handleActionChange}
          onSubmit={handleActionSubmit}
          onClose={closeActionModal}
        />
      )}
    </>
  );
}
