import { Button, Modal } from "react-bootstrap";
import { Save, X } from "lucide-react";

export function FinanceForm({
  form,
  clients,
  cases,
  paymentStates,
  errors,
  isEditing,
  isSaving,
  message,
  isError,
  onChange,
  onSubmit,
  onClose,
  installmentPreview,
}) {
  const filteredCases = form.cliente_id
    ? cases.filter((caseItem) => String(caseItem.cliente_principal_id) === String(form.cliente_id))
    : cases;
  const installmentOptions = Array.from({ length: 12 }, (_, index) => index + 1);
  const interestOptions = [0, 3, 5, 8, 10, 12, 15, 18, 20, 25, 30, 35, 40, 50, 75, 100, 150, 200];

  return (
    <Modal show onHide={onClose} centered size="xl" aria-labelledby="finance-form-title">
      <Modal.Body>
        <div className="panel-title split">
          <h2 id="finance-form-title">{isEditing ? "Editar movimiento" : "Nuevo movimiento"}</h2>
          <Button variant="outline-secondary" className="icon-button close-detail-button" type="button" onClick={onClose} title="Cerrar">
            <X size={17} />
          </Button>
        </div>
        <form className="client-form modal-form" onSubmit={onSubmit} noValidate>
          <label>
            Cliente
            <select name="cliente_id" value={form.cliente_id} onChange={onChange}>
              <option value="">Sin cliente</option>
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
              <option value="">{form.cliente_id ? "Sin expediente / no asociado" : "Seleccione primero un cliente o vea todos"}</option>
              {filteredCases.map((caseItem) => (
                <option key={caseItem.id} value={caseItem.id}>
                  {[caseItem.numero_expediente, caseItem.caratula].filter(Boolean).join(" - ")}
                </option>
              ))}
            </select>
            {form.cliente_id && filteredCases.length === 0 && <span className="field-hint">El cliente seleccionado no tiene expedientes activos.</span>}
          </label>
          <Field label="Concepto" name="concepto" value={form.concepto} error={errors.concepto} onChange={onChange} />
          <Field label="Fecha" name="fecha_movimiento" type="date" value={form.fecha_movimiento} error={errors.fecha_movimiento} onChange={onChange} />
          <Field label="Vencimiento" name="fecha_vencimiento" type="date" value={form.fecha_vencimiento} onChange={onChange} />
          <Field
            label="Plan total"
            name="monto"
            type="number"
            value={form.monto}
            error={errors.monto}
            hint="Importe total pactado para el plan o movimiento."
            onChange={onChange}
          />
          <SelectField
            label="Cantidad de cuotas"
            name="cuotas_total"
            value={form.cuotas_total}
            error={errors.cuotas_total}
            hint="Total de cuotas acordadas."
            onChange={onChange}
            options={installmentOptions.map((value) => ({ value, label: String(value) }))}
          />
          <SelectField
            label="Interes aplicado (%)"
            name="porcentaje_interes"
            value={form.porcentaje_interes}
            error={errors.porcentaje_interes}
            hint="Editable: use 0 para cuotas sin interes."
            onChange={onChange}
            options={interestOptions.map((value) => ({ value, label: `${value}%` }))}
          />
          <SelectField
            label="Cuota registrada"
            name="cuota_numero"
            value={form.cuota_numero}
            error={errors.cuota_numero}
            hint="Numero de cuota que se esta cargando o cobrando."
            onChange={onChange}
            options={installmentOptions
              .filter((value) => value <= Number(form.cuotas_total || 1))
              .map((value) => ({ value, label: `${value} de ${form.cuotas_total || 1}` }))}
          />
          <Field
            label="Valor de esta cuota"
            name="monto_cuota"
            type="number"
            value={form.monto_cuota}
            error={errors.monto_cuota}
            hint="Se calcula automaticamente desde el interes aplicado."
            onChange={onChange}
          />
          <div className="finance-preview form-wide">
            <span>Interes aplicado: {Number(installmentPreview.interestPercentage || 0).toLocaleString("es-AR")}%</span>
            <span>Total financiado: {formatMoney(installmentPreview.financedTotal, form.moneda)}</span>
            <span>Interes/recargo: {formatMoney(installmentPreview.surcharge, form.moneda)}</span>
          </div>
          <Field label="Moneda" name="moneda" value={form.moneda} onChange={onChange} />
          <label>
            Estado
            <select name="estado_pago" value={form.estado_pago} onChange={onChange}>
              {paymentStates.map((state) => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </label>
          <Field label="Medio pago" name="medio_pago" value={form.medio_pago} onChange={onChange} />
          <Field label="Comprobante" name="comprobante_numero" value={form.comprobante_numero} onChange={onChange} />
          <label className="form-wide">
            Descripcion
            <textarea name="descripcion" rows="2" value={form.descripcion} onChange={onChange} />
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

function Field({ label, name, value, error, hint, onChange, type = "text", min, max }) {
  return (
    <label>
      {label}
      <input name={name} type={type} value={value} min={min} max={max} onChange={onChange} />
      {hint && <span className="field-hint">{hint}</span>}
      <ErrorText value={error} />
    </label>
  );
}

function SelectField({ label, name, value, error, hint, options, onChange }) {
  return (
    <label>
      {label}
      <select name={name} value={value} onChange={onChange}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {hint && <span className="field-hint">{hint}</span>}
      <ErrorText value={error} />
    </label>
  );
}

function ErrorText({ value }) {
  return value?.length ? <span className="error-text">{value[0]}</span> : null;
}

function formatMoney(amount, currency = "ARS") {
  return `${currency || "ARS"} ${Number(amount || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
