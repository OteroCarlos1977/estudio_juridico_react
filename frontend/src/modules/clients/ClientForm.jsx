import { Plus, RotateCcw, Save } from "lucide-react";
import { FormField, FormSelect, FormTextarea } from "../../ui/FormFields";

export function ClientForm({
  form,
  errors,
  isEditing,
  isSaving,
  message,
  isError,
  showNewButton = true,
  showHeader = true,
  surface = "panel",
  titleId,
  onChange,
  onSubmit,
  onReset,
}) {
  return (
    <section className={surface === "panel" ? "panel" : undefined}>
      {showHeader && (
        <div className="panel-title split">
          <h2 id={titleId}>{isEditing ? "Editar cliente" : "Nuevo cliente"}</h2>
          {showNewButton && (
            <button className="icon-button" type="button" onClick={onReset} title="Nuevo cliente">
              <Plus size={17} />
            </button>
          )}
        </div>
      )}

      <form className="client-form" onSubmit={onSubmit} noValidate>
        <FormSelect
          label="Tipo"
          name="tipo_persona"
          value={form.tipo_persona}
          onChange={onChange}
          options={[
            { value: "fisica", label: "Persona fisica" },
            { value: "juridica", label: "Persona juridica" },
          ]}
        />

        <FormField label="Apellido" name="apellido" value={form.apellido} error={errors.apellido} onChange={onChange} />
        <FormField label="Nombre" name="nombre" value={form.nombre} error={errors.nombre} onChange={onChange} />
        <FormField
          label="Razon social"
          name="razon_social"
          value={form.razon_social}
          error={errors.razon_social}
          onChange={onChange}
        />
        <FormField label="DNI/CUIT" name="dni_cuit" value={form.dni_cuit} error={errors.dni_cuit} onChange={onChange} inputMode="numeric" />
        <FormField label="Telefono" name="telefono" value={form.telefono} error={errors.telefono} onChange={onChange} inputMode="tel" />
        <FormField label="Email" name="email" type="email" value={form.email} error={errors.email} onChange={onChange} inputMode="email" />
        <FormField label="Domicilio" name="domicilio" value={form.domicilio} error={errors.domicilio} onChange={onChange} />
        <FormField label="Localidad" name="localidad" value={form.localidad} error={errors.localidad} onChange={onChange} />
        <FormField label="Provincia" name="provincia" value={form.provincia} error={errors.provincia} onChange={onChange} />
        <FormField
          label="Codigo postal"
          name="codigo_postal"
          value={form.codigo_postal}
          error={errors.codigo_postal}
          onChange={onChange}
        />

        <FormTextarea className="form-wide" label="Observaciones" name="observaciones" rows={3} value={form.observaciones} error={errors.observaciones} onChange={onChange} />

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
