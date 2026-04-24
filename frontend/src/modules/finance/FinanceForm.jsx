import { Modal } from "react-bootstrap";
import { Save } from "lucide-react";
import { FormField, FormSelect, FormTextarea } from "../../ui/FormFields";
import { FormActionBar, ModalFormHeader } from "../../ui/FormLayout";

export function FinanceForm({
  form,
  clients,
  cases,
  movementTypes,
  categories,
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
  const selectedType = movementTypes.find((type) => String(type.id) === String(form.tipo_movimiento_id));
  const filteredCategories = categories.filter((category) => String(category.tipo_movimiento_id) === String(form.tipo_movimiento_id));
  const isOutgoing = ["gasto", "cuenta_por_pagar"].includes(String(selectedType?.slug || "").toLowerCase());
  const showInstallments = !isOutgoing;
  const installmentOptions = Array.from({ length: 12 }, (_, index) => index + 1);
  const interestOptions = [0, 3, 5, 8, 10, 12, 15, 18, 20, 25, 30, 35, 40, 50, 75, 100, 150, 200];

  return (
    <Modal show onHide={onClose} centered size="xl" aria-labelledby="finance-form-title">
      <Modal.Body>
        <ModalFormHeader title={isEditing ? "Editar movimiento" : "Nuevo movimiento"} titleId="finance-form-title" onClose={onClose} />
        <form className="client-form modal-form" onSubmit={onSubmit} noValidate>
          <FormSelect
            label="Tipo de movimiento"
            name="tipo_movimiento_id"
            value={form.tipo_movimiento_id}
            onChange={onChange}
            options={movementTypes.map((type) => ({ value: type.id, label: type.nombre }))}
          />
          <FormSelect
            label="Categoria"
            name="categoria_financiera_id"
            value={form.categoria_financiera_id}
            onChange={onChange}
            placeholder="Sin categoria"
            options={filteredCategories.map((category) => ({ value: category.id, label: category.nombre }))}
          />
          <FormSelect
            label="Cliente"
            name="cliente_id"
            value={form.cliente_id}
            onChange={onChange}
            placeholder="Sin cliente"
            options={clients.map((client) => ({
              value: client.id,
              label: client.razon_social || [client.apellido, client.nombre].filter(Boolean).join(", "),
            }))}
          />
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
          <FormField label="Concepto" name="concepto" value={form.concepto} error={errors.concepto} onChange={onChange} />
          <FormField label="Fecha" name="fecha_movimiento" type="date" value={form.fecha_movimiento} error={errors.fecha_movimiento} onChange={onChange} />
          <FormField label="Vencimiento" name="fecha_vencimiento" type="date" value={form.fecha_vencimiento} onChange={onChange} />
          <FormField
            label={showInstallments ? "Plan total" : "Importe"}
            name="monto"
            type="number"
            value={form.monto}
            error={errors.monto}
            hint={showInstallments ? "Importe total pactado para el plan o movimiento." : "Importe total del pago o gasto."}
            onChange={onChange}
          />
          {showInstallments ? (
            <>
              <FormSelect
                label="Cantidad de cuotas"
                name="cuotas_total"
                value={form.cuotas_total}
                error={errors.cuotas_total}
                hint="Total de cuotas acordadas."
                onChange={onChange}
                options={installmentOptions.map((value) => ({ value, label: String(value) }))}
              />
              <FormSelect
                label="Interes aplicado (%)"
                name="porcentaje_interes"
                value={form.porcentaje_interes}
                error={errors.porcentaje_interes}
                hint="Editable: use 0 para cuotas sin interes."
                onChange={onChange}
                options={interestOptions.map((value) => ({ value, label: `${value}%` }))}
              />
              <FormSelect
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
              <FormField
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
            </>
          ) : (
            <div className="finance-preview form-wide">
              <span>Tipo: {selectedType?.nombre || "Gasto"}</span>
              <span>Importe: {formatMoney(form.monto, form.moneda)}</span>
              <span>Registro directo sin plan de cuotas.</span>
            </div>
          )}
          <FormField label="Moneda" name="moneda" value={form.moneda} onChange={onChange} />
          <FormSelect
            label="Estado"
            name="estado_pago"
            value={form.estado_pago}
            onChange={onChange}
            options={paymentStates.map((state) => ({ value: state, label: state }))}
          />
          <FormField label="Medio pago" name="medio_pago" value={form.medio_pago} onChange={onChange} />
          <FormField label="Comprobante" name="comprobante_numero" value={form.comprobante_numero} onChange={onChange} />
          <FormTextarea className="form-wide" label="Descripcion" name="descripcion" rows={2} value={form.descripcion} onChange={onChange} />
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

function formatMoney(amount, currency = "ARS") {
  return `${currency || "ARS"} ${Number(amount || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
