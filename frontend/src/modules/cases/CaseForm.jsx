import { Modal } from "react-bootstrap";
import { RotateCcw, Save } from "lucide-react";
import { FormError, FormField, FormSelect, FormTextarea } from "../../ui/FormFields";
import { FormActionBar, ModalFormHeader } from "../../ui/FormLayout";

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
        <ModalFormHeader title={isEditing ? "Editar expediente" : "Nuevo expediente"} titleId="case-form-title" onClose={onClose} />
        <form className="client-form modal-form" onSubmit={onSubmit} noValidate>
          <FormSelect
            label="Cliente"
            name="cliente_principal_id"
            value={form.cliente_principal_id}
            error={errors.cliente_principal_id}
            onChange={onChange}
            placeholder="Seleccionar"
            options={clients.map((client) => ({
              value: client.id,
              label: client.razon_social || [client.apellido, client.nombre].filter(Boolean).join(", "),
            }))}
          />
          <FormField label="Numero" name="numero_expediente" value={form.numero_expediente} onChange={onChange} />
          <FormField label="Caratula" name="caratula" value={form.caratula} error={errors.caratula} onChange={onChange} />
          <FormField label="Materia" name="materia" value={form.materia} onChange={onChange} />
          <FormField label="Fuero" name="fuero" value={form.fuero} onChange={onChange} />
          <FormField label="Jurisdiccion" name="jurisdiccion" value={form.jurisdiccion} onChange={onChange} />
          <FormField label="Juzgado" name="juzgado" value={form.juzgado} onChange={onChange} />
          <FormField label="Secretaria" name="secretaria" value={form.secretaria} onChange={onChange} />
          <FormSelect
            label="Estado"
            name="estado_expediente"
            value={form.estado_expediente}
            error={errors.estado_expediente}
            onChange={onChange}
            options={stateOptions.map((state) => ({ value: state, label: state }))}
          />
          <FormField label="Fecha inicio" name="fecha_inicio" type="date" value={form.fecha_inicio} onChange={onChange} />
          <FormField label="Fecha cierre" name="fecha_cierre" type="date" value={form.fecha_cierre} error={errors.fecha_cierre} onChange={onChange} />
          <FormTextarea className="form-wide" label="Observaciones" name="observaciones" rows={3} value={form.observaciones} onChange={onChange} />
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
