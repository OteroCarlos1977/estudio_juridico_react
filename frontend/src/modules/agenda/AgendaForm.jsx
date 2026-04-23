import { Button, Modal } from "react-bootstrap";
import { RotateCcw, Save, X } from "lucide-react";

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
        <div className="panel-title split">
          <h2 id="agenda-form-title">{isEditing ? "Editar tarea" : "Nueva tarea"}</h2>
          <Button variant="outline-secondary" className="icon-button close-detail-button" type="button" onClick={onClose} title="Cerrar">
            <X size={17} />
          </Button>
        </div>
        <form className="client-form modal-form" onSubmit={onSubmit} noValidate>
          <label className="form-wide">
            Tipo
            <select name="clase_actuacion" value={form.clase_actuacion} onChange={onChange}>
              <option value="agenda">Agenda con horario</option>
              <option value="tarea">Tarea por dia</option>
            </select>
          </label>
          <label>
            Cliente
            <select name="cliente_id" value={form.cliente_id} onChange={onChange}>
              <option value="">Seleccionar</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.razon_social || [client.apellido, client.nombre].filter(Boolean).join(", ")}
                </option>
              ))}
            </select>
          </label>
          <label>
            Expediente
            <select name="expediente_id" value={form.expediente_id} onChange={onChange}>
              <option value="">{form.cliente_id ? "Seleccionar" : "Seleccione cliente"}</option>
              {cases.map((caseItem) => (
                <option key={caseItem.id} value={caseItem.id}>
                  {[caseItem.numero_expediente, caseItem.caratula].filter(Boolean).join(" - ")}
                </option>
              ))}
            </select>
            <ErrorText value={errors.expediente_id} />
          </label>
          <Field
            label="Titulo"
            name="titulo"
            value={form.titulo}
            error={errors.titulo}
            onChange={onChange}
          />
          <Field
            label={form.clase_actuacion === "agenda" ? "Fecha" : "Fecha de tarea / vencimiento"}
            name="fecha_vencimiento"
            type="date"
            value={form.fecha_vencimiento}
            error={errors.fecha_vencimiento}
            onChange={onChange}
          />
          {form.clase_actuacion === "agenda" && (
            <Field label="Hora" name="hora_evento" type="time" value={form.hora_evento} error={errors.hora_evento} onChange={onChange} />
          )}
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
          <label className="checkbox-field">
            <input name="cumplida" type="checkbox" checked={form.cumplida} onChange={onChange} />
            Cumplida
          </label>
          <label className="form-wide">
            Detalle
            <textarea name="descripcion" rows="3" value={form.descripcion} onChange={onChange} />
            <ErrorText value={errors.descripcion} />
          </label>
          <div className="form-actions form-wide">
            <button className="primary-button" type="submit" disabled={isSaving}>
              <Save size={17} />
              Guardar
            </button>
            <button className="secondary-button" type="button" onClick={onReset}>
              <RotateCcw size={17} />
              Limpiar
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
