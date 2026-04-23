import { Plus, RotateCcw, Save } from "lucide-react";

export function ClientForm({
  form,
  errors,
  isEditing,
  isSaving,
  message,
  isError,
  showNewButton = true,
  surface = "panel",
  titleId,
  onChange,
  onSubmit,
  onReset,
}) {
  return (
    <section className={surface === "panel" ? "panel" : undefined}>
      <div className="panel-title split">
        <h2 id={titleId}>{isEditing ? "Editar cliente" : "Nuevo cliente"}</h2>
        {showNewButton && (
          <button className="icon-button" type="button" onClick={onReset} title="Nuevo cliente">
            <Plus size={17} />
          </button>
        )}
      </div>

      <form className="client-form" onSubmit={onSubmit} noValidate>
        <label>
          Tipo
          <select name="tipo_persona" value={form.tipo_persona} onChange={onChange}>
            <option value="fisica">Persona fisica</option>
            <option value="juridica">Persona juridica</option>
          </select>
        </label>

        <Field label="Apellido" name="apellido" value={form.apellido} error={errors.apellido} onChange={onChange} />
        <Field label="Nombre" name="nombre" value={form.nombre} error={errors.nombre} onChange={onChange} />
        <Field
          label="Razon social"
          name="razon_social"
          value={form.razon_social}
          error={errors.razon_social}
          onChange={onChange}
        />
        <Field label="DNI/CUIT" name="dni_cuit" value={form.dni_cuit} error={errors.dni_cuit} onChange={onChange} inputMode="numeric" />
        <Field label="Telefono" name="telefono" value={form.telefono} error={errors.telefono} onChange={onChange} inputMode="tel" />
        <Field label="Email" name="email" type="email" value={form.email} error={errors.email} onChange={onChange} inputMode="email" />
        <Field label="Domicilio" name="domicilio" value={form.domicilio} error={errors.domicilio} onChange={onChange} />
        <Field label="Localidad" name="localidad" value={form.localidad} error={errors.localidad} onChange={onChange} />
        <Field label="Provincia" name="provincia" value={form.provincia} error={errors.provincia} onChange={onChange} />
        <Field
          label="Codigo postal"
          name="codigo_postal"
          value={form.codigo_postal}
          error={errors.codigo_postal}
          onChange={onChange}
        />

        <label className="form-wide">
          Observaciones
          <textarea name="observaciones" rows="3" value={form.observaciones} onChange={onChange} />
          <ErrorText value={errors.observaciones} />
        </label>

        <div className="form-actions form-wide">
          <button className="primary-button" type="submit" disabled={isSaving}>
            <Save size={17} />
            {isSaving ? "Guardando" : "Guardar"}
          </button>
          <button className="secondary-button" type="button" onClick={onReset}>
            <RotateCcw size={17} />
            Limpiar
          </button>
        </div>

        {message && <p className={isError ? "form-message error-text" : "form-message"}>{message}</p>}
      </form>
    </section>
  );
}

function Field({ label, name, value, error, onChange, type = "text", inputMode }) {
  return (
    <label>
      {label}
      <input name={name} type={type} value={value} inputMode={inputMode} onChange={onChange} />
      <ErrorText value={error} />
    </label>
  );
}

function ErrorText({ value }) {
  if (!value?.length) {
    return null;
  }

  return <span className="error-text">{value[0]}</span>;
}
