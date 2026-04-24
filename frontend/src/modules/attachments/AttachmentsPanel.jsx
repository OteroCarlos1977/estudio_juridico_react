import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Modal } from "react-bootstrap";
import { Download, Eye, Plus, Save, Trash2 } from "lucide-react";
import { api } from "../../api/client";
import { confirmDelete, showError, showSuccess } from "../../ui/alerts";
import { viewAttachmentFile } from "../../ui/attachmentViewer";
import { downloadFile } from "../../ui/download";
import { FormActionBar, ModalFormHeader } from "../../ui/FormLayout";
import { FormError, FormField, FormSelect, FormTextarea } from "../../ui/FormFields";
import { DataTable } from "../../ui/DataTable";
import { QueryState } from "../../ui/QueryState";
import { TableActionsDropdown } from "../../ui/TableActionsDropdown";

const emptyAttachmentForm = {
  archivo: null,
  cliente_id: "",
  expediente_id: "",
  actuacion_id: "",
  movimiento_financiero_id: "",
  descripcion: "",
  fecha_documento: "",
};

export function AttachmentsPanel() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyAttachmentForm);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");

  const attachmentsQuery = useQuery({
    queryKey: ["attachments"],
    queryFn: async () => (await api.get("/adjuntos")).data.attachments,
    retry: 1,
  });

  const clientsQuery = useQuery({
    queryKey: ["clients"],
    queryFn: async () => (await api.get("/clientes")).data.clients,
    retry: 1,
  });

  const casesQuery = useQuery({
    queryKey: ["cases"],
    queryFn: async () => (await api.get("/expedientes", { params: { limit: 300 } })).data.cases,
    retry: 1,
  });

  const agendaQuery = useQuery({
    queryKey: ["agenda", "attachments-options"],
    queryFn: async () => (await api.get("/agenda", { params: { estado: "todos", limit: 300 } })).data.items,
    retry: 1,
  });

  const financeQuery = useQuery({
    queryKey: ["finance-movements", "attachments-options"],
    queryFn: async () => (await api.get("/finanzas/movimientos", { params: { estado_pago: "todos", limit: 300 } })).data.movements,
    retry: 1,
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("archivo", form.archivo);
      appendIfPresent(formData, "cliente_id", form.cliente_id);
      appendIfPresent(formData, "expediente_id", form.expediente_id);
      appendIfPresent(formData, "actuacion_id", form.actuacion_id);
      appendIfPresent(formData, "movimiento_financiero_id", form.movimiento_financiero_id);
      appendIfPresent(formData, "descripcion", form.descripcion);
      appendIfPresent(formData, "fecha_documento", form.fecha_documento);
      return (await api.post("/adjuntos", formData)).data.attachment;
    },
    onSuccess: (attachment) => {
      queryClient.invalidateQueries({ queryKey: ["attachments"] });
      resetForm();
      setIsModalOpen(false);
      setMessage(`Adjunto cargado: ${attachment.nombre_original}`);
      showSuccess(`Adjunto cargado: ${attachment.nombre_original}`);
    },
    onError: (error) => {
      const response = error.response?.data;
      setErrors(response?.details?.fieldErrors || {});
      setMessage(response?.message || "No se pudo cargar el adjunto.");
      showError(response?.message || "No se pudo cargar el adjunto.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (attachmentId) => {
      await api.delete(`/adjuntos/${attachmentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attachments"] });
      setMessage("Adjunto eliminado.");
      showSuccess("Adjunto eliminado.");
    },
    onError: (error) => {
      const response = error.response?.data;
      setMessage(response?.message || "No se pudo eliminar el adjunto.");
      showError(response?.message || "No se pudo eliminar el adjunto.");
    },
  });

  function handleChange(event) {
    const { name, value, files } = event.target;
    setForm((current) => normalizeAttachmentForm({ ...current, [name]: files ? files[0] : value }, name, {
      cases: casesQuery.data || [],
      actions: agendaQuery.data || [],
      movements: financeQuery.data || [],
    }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const validationErrors = {};
    if (!form.archivo) validationErrors.archivo = ["Seleccione un archivo."];
    if (!form.cliente_id && !form.expediente_id && !form.actuacion_id && !form.movimiento_financiero_id) {
      validationErrors.association = ["Asocie el adjunto a un cliente, expediente, actuacion o movimiento."];
    }

    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    uploadMutation.mutate();
  }

  function openModal() {
    resetForm();
    setMessage("");
    setIsModalOpen(true);
  }

  function closeModal() {
    resetForm();
    setIsModalOpen(false);
  }

  function resetForm() {
    setForm(emptyAttachmentForm);
    setErrors({});
  }

  async function downloadAttachment(attachment) {
    try {
      await downloadFile(`/adjuntos/${attachment.id}/descargar`, attachment.nombre_original || "adjunto");
    } catch (error) {
      showError(error.response?.data?.message || "No se pudo descargar el adjunto.");
    }
  }

  async function deleteAttachment(attachment) {
    const confirmed = await confirmDelete({
      title: `Eliminar adjunto "${attachment.nombre_original}"?`,
      text: "Esta accion lo ocultara del listado, pero conservara el archivo fisico.",
    });

    if (confirmed) {
      deleteMutation.mutate(attachment.id);
    }
  }

  const optionQueriesLoading = clientsQuery.isLoading || casesQuery.isLoading || agendaQuery.isLoading || financeQuery.isLoading;
  const optionQueriesError = clientsQuery.isError || casesQuery.isError || agendaQuery.isError || financeQuery.isError;
  const filteredCases = form.cliente_id
    ? (casesQuery.data || []).filter((caseItem) => String(caseItem.cliente_principal_id) === String(form.cliente_id))
    : (casesQuery.data || []);
  const filteredActions = (agendaQuery.data || []).filter((action) => {
    if (form.expediente_id) return String(action.expediente_id) === String(form.expediente_id);
    if (form.cliente_id) {
      return filteredCases.some((caseItem) => String(caseItem.id) === String(action.expediente_id));
    }
    return true;
  });
  const filteredMovements = (financeQuery.data || []).filter((movement) => {
    if (form.expediente_id) return String(movement.expediente_id) === String(form.expediente_id);
    if (form.cliente_id) return String(movement.cliente_id) === String(form.cliente_id);
    return true;
  });

  return (
    <>
      <section className="panel" style={{ display: "flex", flexDirection: "column", flex: "1 1 auto", minHeight: 0, overflow: "hidden" }}>
        <div className="panel-title split">
          <h2>Adjuntos</h2>
          <button className="primary-button" type="button" onClick={openModal}>
            <Plus size={17} />
            Nuevo adjunto
          </button>
        </div>
        {message && <p className={uploadMutation.isError || deleteMutation.isError ? "form-message error-text" : "form-message"}>{message}</p>}
        <QueryState
          isLoading={attachmentsQuery.isLoading}
          isError={attachmentsQuery.isError}
          loadingText="Cargando adjuntos..."
          errorText="No se pudieron cargar los adjuntos."
        />
        {!attachmentsQuery.isLoading && !attachmentsQuery.isError && (
          <DataTable maxHeight="40vh">
              <thead>
                <tr>
                  <th>Archivo</th>
                  <th>Cliente</th>
                  <th>Expediente</th>
                  <th>Asociacion</th>
                  <th>Tamano</th>
                  <th>Fecha</th>
                  <th className="actions-cell">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {(attachmentsQuery.data || []).map((item) => (
                  <tr key={item.id}>
                    <td>{item.nombre_original || "-"}</td>
                    <td>{item.cliente || "-"}</td>
                    <td>{item.numero_expediente || item.caratula || "-"}</td>
                    <td>{formatAssociation(item)}</td>
                    <td>{formatSize(item.tamano_bytes)}</td>
                    <td>{item.fecha_documento || item.created_at || "-"}</td>
                    <td className="actions-cell">
                      <TableActionsDropdown
                        label="Acciones del adjunto"
                        items={[
                          { key: "view", label: "Ver", icon: <Eye size={15} />, onClick: () => viewAttachmentFile(item) },
                          { key: "download", label: "Descargar", icon: <Download size={15} />, onClick: () => downloadAttachment(item) },
                          { key: "delete", label: "Eliminar", icon: <Trash2 size={15} />, onClick: () => deleteAttachment(item), danger: true },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
                {attachmentsQuery.data?.length === 0 && (
                  <tr>
                    <td colSpan="7">No hay adjuntos cargados.</td>
                  </tr>
                )}
              </tbody>
          </DataTable>
        )}
      </section>

      {isModalOpen && (
        <Modal show onHide={closeModal} centered size="xl" aria-labelledby="attachment-form-title">
          <Modal.Body>
            <ModalFormHeader title="Nuevo adjunto" titleId="attachment-form-title" onClose={closeModal} />
            <QueryState
              isLoading={optionQueriesLoading}
              isError={optionQueriesError}
              loadingText="Cargando opciones de asociacion..."
              errorText="No se pudieron cargar las opciones de asociacion."
            />
            {!optionQueriesLoading && !optionQueriesError && (
              <form className="client-form modal-form" onSubmit={handleSubmit} noValidate>
                <label className="form-wide">
                  Archivo
                  <input name="archivo" type="file" accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.bmp,.doc,.docx,.rtf,.odt" onChange={handleChange} />
                  <FormError value={errors.archivo} />
                </label>
                <FormSelect
                  label="Cliente"
                  name="cliente_id"
                  value={form.cliente_id}
                  onChange={handleChange}
                  placeholder="Sin cliente"
                  options={(clientsQuery.data || []).map((client) => ({
                    value: client.id,
                    label: client.razon_social || [client.apellido, client.nombre].filter(Boolean).join(", "),
                  }))}
                />
                <FormSelect
                  label="Expediente"
                  name="expediente_id"
                  value={form.expediente_id}
                  onChange={handleChange}
                  placeholder="Sin expediente"
                  options={filteredCases.map((caseItem) => ({
                    value: caseItem.id,
                    label: [caseItem.numero_expediente, caseItem.caratula].filter(Boolean).join(" - "),
                  }))}
                />
                <FormSelect
                  label="Actuacion"
                  name="actuacion_id"
                  value={form.actuacion_id}
                  onChange={handleChange}
                  placeholder="Sin actuacion"
                  options={filteredActions.map((action) => ({
                    value: action.id,
                    label: [action.fecha_vencimiento || action.fecha_evento, action.titulo || action.descripcion].filter(Boolean).join(" - "),
                  }))}
                />
                <FormSelect
                  label="Movimiento"
                  name="movimiento_financiero_id"
                  value={form.movimiento_financiero_id}
                  onChange={handleChange}
                  placeholder="Sin movimiento"
                  options={filteredMovements.map((movement) => ({
                    value: movement.id,
                    label: [movement.fecha_movimiento, movement.concepto].filter(Boolean).join(" - "),
                  }))}
                />
                <FormField label="Fecha documento" name="fecha_documento" type="date" value={form.fecha_documento} error={errors.fecha_documento} onChange={handleChange} />
                <FormTextarea className="form-wide" label="Descripcion" name="descripcion" rows={3} value={form.descripcion} onChange={handleChange} />
                <FormError value={errors.association} />
                <FormActionBar>
                  <button className="primary-button" type="submit" disabled={uploadMutation.isPending}>
                    <Save size={17} />
                    {uploadMutation.isPending ? "Guardando" : "Guardar"}
                  </button>
                </FormActionBar>
              </form>
            )}
          </Modal.Body>
        </Modal>
      )}
    </>
  );
}

function appendIfPresent(formData, key, value) {
  if (value !== undefined && value !== null && value !== "") {
    formData.append(key, value);
  }
}

function normalizeAttachmentForm(form, changedField, { cases, actions, movements }) {
  const next = { ...form };

  if (changedField === "cliente_id") {
    const selectedCase = cases.find((caseItem) => String(caseItem.id) === String(next.expediente_id));
    if (selectedCase && String(selectedCase.cliente_principal_id) !== String(next.cliente_id)) {
      next.expediente_id = "";
      next.actuacion_id = "";
      next.movimiento_financiero_id = "";
    }
  }

  if (changedField === "expediente_id") {
    const selectedCase = cases.find((caseItem) => String(caseItem.id) === String(next.expediente_id));
    if (selectedCase) {
      next.cliente_id = String(selectedCase.cliente_principal_id || next.cliente_id || "");
    }
    next.actuacion_id = "";
    next.movimiento_financiero_id = "";
  }

  if (changedField === "actuacion_id" && next.actuacion_id) {
    const selectedAction = actions.find((action) => String(action.id) === String(next.actuacion_id));
    if (selectedAction?.expediente_id) {
      next.expediente_id = String(selectedAction.expediente_id);
      const selectedCase = cases.find((caseItem) => String(caseItem.id) === String(selectedAction.expediente_id));
      if (selectedCase) {
        next.cliente_id = String(selectedCase.cliente_principal_id || "");
      }
    }
  }

  if (changedField === "movimiento_financiero_id" && next.movimiento_financiero_id) {
    const selectedMovement = movements.find((movement) => String(movement.id) === String(next.movimiento_financiero_id));
    if (selectedMovement?.cliente_id) {
      next.cliente_id = String(selectedMovement.cliente_id);
    }
    if (selectedMovement?.expediente_id) {
      next.expediente_id = String(selectedMovement.expediente_id);
    }
  }

  return next;
}

function formatAssociation(item) {
  if (item.actuacion_id) return `Actuacion: ${item.actuacion_titulo || item.actuacion_id}`;
  if (item.movimiento_financiero_id) return `Movimiento: ${item.movimiento_concepto || item.movimiento_financiero_id}`;
  if (item.expediente_id) return `Expediente: ${item.numero_expediente || item.caratula || item.expediente_id}`;
  if (item.cliente_id) return `Cliente: ${item.cliente || item.cliente_id}`;
  return "-";
}

function formatSize(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} bytes`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
