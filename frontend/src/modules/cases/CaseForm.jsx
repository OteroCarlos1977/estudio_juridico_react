import { Button, Modal } from "react-bootstrap";
import { RotateCcw, Save, X } from "lucide-react";

export function CaseForm({
  form,
  clients,
  errors,
  stateOptions,
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
    <Modal show onHide={onClose} centered size="xl" aria-labelledby="case-form-title">
      <Modal.Body>
        <div className="panel-title split">
          <h2 id="case-form-title">{isEditing ? "Editar expediente" : "Nuevo expediente"}</h2>
          <Button variant="outline-secondary" className="icon-button close-detail-button" type="button" onClick={onClose} title="Cerrar">
            <X size={17} />
          </Button>
        </div>
        <form className="client-form modal-form" onSubmit={onSubmit} noValidate>
          <label>
            Cliente
            <select name="cliente_principal_id" value={form.cliente_principal_id} onChange={onChange}>
              <option value="">Seleccionar</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.razon_social || [client.apellido, client.nombre].filter(Boolean).join(", ")}
                </option>
              ))}
            </select>
            <ErrorText value={errors.cliente_principal_id} />
          </label>
          <Field label="Numero" name="numero_expediente" value={form.numero_expediente} onChange={onChange} />
          <Field label="Caratula" name="caratula" value={form.caratula} error={errors.caratula} onChange={onChange} />
          <Field label="Materia" name="materia" value={form.materia} onChange={onChange} />
          <Field label="Fuero" name="fuero" value={form.fuero} onChange={onChange} />
          <Field label="Jurisdiccion" name="jurisdiccion" value={form.jurisdiccion} onChange={onChange} />
          <Field label="Juzgado" name="juzgado" value={form.juzgado} onChange={onChange} />
          <Field label="Secretaria" name="secretaria" value={form.secretaria} onChange={onChange} />
          <label>
            Estado
            <select name="estado_expediente" value={form.estado_expediente} onChange={onChange}>
              {stateOptions.map((state) => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
            <ErrorText value={errors.estado_expediente} />
          </label>
          <Field label="Fecha inicio" name="fecha_inicio" type="date" value={form.fecha_inicio} onChange={onChange} />
          <Field label="Fecha cierre" name="fecha_cierre" type="date" value={form.fecha_cierre} error={errors.fecha_cierre} onChange={onChange} />
          <label className="form-wide">
            Observaciones
            <textarea name="observaciones" rows="3" value={form.observaciones} onChange={onChange} />
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
