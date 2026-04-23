import { Button, Modal } from "react-bootstrap";
import { Save, X } from "lucide-react";

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
        <div className="panel-title split">
          <h2 id="case-action-form-title">{isEditing ? "Editar actuacion" : "Nueva actuacion"}</h2>
          <Button variant="outline-secondary" className="icon-button close-detail-button" type="button" onClick={onClose} title="Cerrar">
            <X size={17} />
          </Button>
        </div>
        <form className="client-form modal-form" onSubmit={onSubmit} noValidate>
          <label>
            Clase
            <select name="clase_actuacion" value={form.clase_actuacion} onChange={onChange}>
              <option value="agenda">Agenda</option>
              <option value="vencimiento">Vencimiento</option>
              <option value="tarea">Tarea</option>
              <option value="audiencia">Audiencia</option>
              <option value="presentacion">Presentacion</option>
              <option value="otro">Otro</option>
            </select>
          </label>
          <Field label="Titulo" name="titulo" value={form.titulo} onChange={onChange} />
          <Field label="Fecha evento" name="fecha_evento" type="date" value={form.fecha_evento} onChange={onChange} />
          <Field label="Hora" name="hora_evento" type="time" value={form.hora_evento} onChange={onChange} />
          <Field
            label="Vencimiento"
            name="fecha_vencimiento"
            type="date"
            value={form.fecha_vencimiento}
            error={errors.fecha_vencimiento}
            onChange={onChange}
          />
          <Field label="Prioridad" name="prioridad" value={form.prioridad} onChange={onChange} />
          <label>
            Estado
            <select name="estado_actuacion" value={form.estado_actuacion} onChange={onChange}>
              <option value="pendiente">Pendiente</option>
              <option value="en_proceso">En proceso</option>
              <option value="vencida">Vencida</option>
              <option value="finalizada">Finalizada</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </label>
          <Field label="Dias alerta" name="dias_alerta" type="number" value={form.dias_alerta} onChange={onChange} />
          <label className="checkbox-field">
            <input name="cumplida" type="checkbox" checked={form.cumplida} onChange={onChange} />
            Cumplida
          </label>
          <label className="form-wide">
            Descripcion
            <textarea name="descripcion" rows="3" value={form.descripcion} onChange={onChange} />
            <ErrorText value={errors.descripcion} />
          </label>
          <label className="form-wide">
            Observaciones
            <textarea name="observaciones" rows="2" value={form.observaciones} onChange={onChange} />
          </label>
          <div className="form-actions form-wide">
            <button className="primary-button" type="submit" disabled={isSaving}>
              <Save size={17} />
              Guardar
            </button>
            <button className="secondary-button close-text-button" type="button" onClick={onClose}>
              <X size={17} />
              Cancelar
            </button>
          </div>
          {message && <p className={isError ? "form-message error-text" : "form-message"}>{message}</p>}
        </form>
      </Modal.Body>
    </Modal>
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
