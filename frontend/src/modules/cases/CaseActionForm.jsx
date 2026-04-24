import { Modal } from "react-bootstrap";
import { Save } from "lucide-react";
import { FormCheckbox, FormField, FormSelect, FormTextarea } from "../../ui/FormFields";
import { FormActionBar, ModalFormHeader } from "../../ui/FormLayout";

export function CaseActionForm({
  form,
  errors,
  isEditing,
  isSaving,
  message,
  isError,
  onChange,
  onSubmit,
  onClose,
}) {
  return (
    <Modal show onHide={onClose} centered size="xl" aria-labelledby="case-action-form-title">
      <Modal.Body>
        <ModalFormHeader title={isEditing ? "Editar actuacion" : "Nueva actuacion"} titleId="case-action-form-title" onClose={onClose} />
        <form className="client-form modal-form" onSubmit={onSubmit} noValidate>
          <FormSelect
            label="Clase"
            name="clase_actuacion"
            value={form.clase_actuacion}
            onChange={onChange}
            options={[
              { value: "agenda", label: "Agenda" },
              { value: "vencimiento", label: "Vencimiento" },
              { value: "tarea", label: "Tarea" },
              { value: "audiencia", label: "Audiencia" },
              { value: "presentacion", label: "Presentacion" },
              { value: "otro", label: "Otro" },
            ]}
          />
          <FormField label="Titulo" name="titulo" value={form.titulo} onChange={onChange} />
          <FormField label="Fecha evento" name="fecha_evento" type="date" value={form.fecha_evento} onChange={onChange} />
          <FormField label="Hora" name="hora_evento" type="time" value={form.hora_evento} onChange={onChange} />
          <FormField
            label="Vencimiento"
            name="fecha_vencimiento"
            type="date"
            value={form.fecha_vencimiento}
            error={errors.fecha_vencimiento}
            onChange={onChange}
          />
          <FormField label="Prioridad" name="prioridad" value={form.prioridad} onChange={onChange} />
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
          <FormField label="Dias alerta" name="dias_alerta" type="number" value={form.dias_alerta} onChange={onChange} />
          <FormCheckbox name="cumplida" checked={form.cumplida} onChange={onChange}>
            Cumplida
          </FormCheckbox>
          <FormTextarea className="form-wide" label="Descripcion" name="descripcion" rows={3} value={form.descripcion} error={errors.descripcion} onChange={onChange} />
          <FormTextarea className="form-wide" label="Observaciones" name="observaciones" rows={2} value={form.observaciones} onChange={onChange} />
          <FormActionBar>
            <button className="primary-button" type="submit" disabled={isSaving}>
              <Save size={17} />
              Guardar
            </button>
          </FormActionBar>
          {message && <p className={isError ? "form-message error-text" : "form-message"}>{message}</p>}
        </form>
      </Modal.Body>
    </Modal>
  );
}
