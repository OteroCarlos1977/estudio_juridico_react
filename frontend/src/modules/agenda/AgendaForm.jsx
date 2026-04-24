import { Modal } from "react-bootstrap";
import { RotateCcw, Save } from "lucide-react";
import { FormCheckbox, FormError, FormField, FormSelect, FormTextarea } from "../../ui/FormFields";
import { FormActionBar, ModalFormHeader } from "../../ui/FormLayout";

export function AgendaForm({
  form,
  clients,
  cases,
  errors,
  isEditing,
  isSaving,
  message,
  isError,
  onChange,
  onSubmit,
  onReset,
  onClose,
}) {
  return (
    <Modal show onHide={onClose} centered size="xl" aria-labelledby="agenda-form-title">
      <Modal.Body>
        <ModalFormHeader title={isEditing ? "Editar tarea" : "Nueva tarea"} titleId="agenda-form-title" onClose={onClose} />
        <form className="client-form modal-form" onSubmit={onSubmit} noValidate>
          <FormSelect
            className="form-wide"
            label="Tipo"
            name="clase_actuacion"
            value={form.clase_actuacion}
            onChange={onChange}
            options={[
              { value: "agenda", label: "Agenda con horario" },
              { value: "tarea", label: "Tarea por dia" },
            ]}
          />
          <FormSelect
            label="Cliente"
            name="cliente_id"
            value={form.cliente_id}
            onChange={onChange}
            placeholder="Seleccionar"
            options={clients.map((client) => ({
              value: client.id,
              label: client.razon_social || [client.apellido, client.nombre].filter(Boolean).join(", "),
            }))}
          />
          <FormSelect
            label="Expediente"
            name="expediente_id"
            value={form.expediente_id}
            error={errors.expediente_id}
            onChange={onChange}
            placeholder={form.cliente_id ? "Seleccionar" : "Seleccione cliente"}
            options={cases.map((caseItem) => ({
              value: caseItem.id,
              label: [caseItem.numero_expediente, caseItem.caratula].filter(Boolean).join(" - "),
            }))}
          />
          <FormField
            label="Titulo"
            name="titulo"
            value={form.titulo}
            error={errors.titulo}
            onChange={onChange}
          />
          <FormField
            label={form.clase_actuacion === "agenda" ? "Fecha" : "Fecha de tarea / vencimiento"}
            name="fecha_vencimiento"
            type="date"
            value={form.fecha_vencimiento}
            error={errors.fecha_vencimiento}
            onChange={onChange}
          />
          {form.clase_actuacion === "agenda" && (
            <FormField label="Hora" name="hora_evento" type="time" value={form.hora_evento} error={errors.hora_evento} onChange={onChange} />
          )}
          <FormSelect
            label="Estado"
            name="estado_actuacion"
            value={form.estado_actuacion}
            onChange={onChange}
            options={[
              { value: "pendiente", label: "Pendiente" },
              { value: "en_proceso", label: "En proceso" },
              { value: "vencida", label: "Vencida" },
              { value: "finalizada", label: "Finalizada" },
              { value: "cancelada", label: "Cancelada" },
            ]}
          />
          <FormCheckbox name="cumplida" checked={form.cumplida} onChange={onChange}>
            Cumplida
          </FormCheckbox>
          <FormTextarea className="form-wide" label="Detalle" name="descripcion" rows={3} value={form.descripcion} error={errors.descripcion} onChange={onChange} />
          <FormActionBar>
            <button className="primary-button" type="submit" disabled={isSaving}>
              <Save size={17} />
              Guardar
            </button>
            <button className="secondary-button" type="button" onClick={onReset}>
              <RotateCcw size={17} />
              Limpiar
            </button>
          </FormActionBar>
          {message && <p className={isError ? "form-message error-text" : "form-message"}>{message}</p>}
        </form>
      </Modal.Body>
    </Modal>
  );
}
