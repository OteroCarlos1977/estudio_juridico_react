import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit3, Eye, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { api } from "../../api/client";

const emptyCaseForm = {
  cliente_principal_id: "",
  numero_expediente: "",
  caratula: "",
  materia: "",
  fuero: "",
  jurisdiccion: "",
  juzgado: "",
  secretaria: "",
  estado_expediente: "Activo",
  fecha_inicio: "",
  fecha_cierre: "",
  descripcion: "",
  observaciones: "",
};

export function CasesPanel() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyCaseForm);
  const [editingCaseId, setEditingCaseId] = useState(null);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState({});

  const casesQuery = useQuery({
    queryKey: ["cases"],
    queryFn: async () => {
      const response = await api.get("/expedientes");
      return response.data.cases;
    },
    retry: 1,
  });

  const clientsQuery = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const response = await api.get("/clientes");
      return response.data.clients;
    },
    retry: 1,
  });

  const selectedCaseQuery = useQuery({
    queryKey: ["case-detail", selectedCaseId],
    queryFn: async () => {
      const response = await api.get(`/expedientes/${selectedCaseId}`);
      return response.data.case;
    },
    enabled: Boolean(selectedCaseId),
    retry: 1,
  });

  const saveCaseMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingCaseId) {
        const response = await api.put(`/expedientes/${editingCaseId}`, payload);
        return response.data.case;
      }
      const response = await api.post("/expedientes", payload);
      return response.data.case;
    },
    onSuccess: (caseItem) => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      setSelectedCaseId(caseItem.id);
      resetForm();
      setMessage(`Expediente guardado: ${caseItem.caratula}`);
    },
    onError: (error) => {
      const response = error.response?.data;
      setErrors(response?.details?.fieldErrors || {});
      setMessage(response?.message || "No se pudo guardar el expediente.");
    },
  });

  const deleteCaseMutation = useMutation({
    mutationFn: async (caseId) => {
      await api.delete(`/expedientes/${caseId}`);
      return caseId;
    },
    onSuccess: (caseId) => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.removeQueries({ queryKey: ["case-detail", caseId] });
      if (selectedCaseId === caseId) setSelectedCaseId(null);
      if (editingCaseId === caseId) resetForm();
      setMessage("Expediente eliminado.");
    },
  });

  const filteredCases = (casesQuery.data || []).filter((caseItem) =>
    [
      caseItem.numero_expediente,
      caseItem.caratula,
      caseItem.cliente,
      caseItem.fuero,
      caseItem.estado_expediente,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  );

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const validationErrors = {};
    if (!form.cliente_principal_id) validationErrors.cliente_principal_id = ["Seleccione un cliente."];
    if (!form.caratula.trim()) validationErrors.caratula = ["La caratula es obligatoria."];
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    saveCaseMutation.mutate(form);
  }

  async function editCase(caseId) {
    const response = await api.get(`/expedientes/${caseId}`);
    const caseItem = response.data.case;
    setEditingCaseId(caseItem.id);
    setSelectedCaseId(caseItem.id);
    setForm({
      cliente_principal_id: String(caseItem.cliente_principal_id || ""),
      numero_expediente: caseItem.numero_expediente || "",
      caratula: caseItem.caratula || "",
      materia: caseItem.materia || "",
      fuero: caseItem.fuero || "",
      jurisdiccion: caseItem.jurisdiccion || "",
      juzgado: caseItem.juzgado || "",
      secretaria: caseItem.secretaria || "",
      estado_expediente: caseItem.estado_expediente || "Activo",
      fecha_inicio: caseItem.fecha_inicio || "",
      fecha_cierre: caseItem.fecha_cierre || "",
      descripcion: caseItem.descripcion || "",
      observaciones: caseItem.observaciones || "",
    });
  }

  function resetForm() {
    setForm(emptyCaseForm);
    setEditingCaseId(null);
    setErrors({});
  }

  function deleteCase(caseItem) {
    if (window.confirm(`Eliminar expediente "${caseItem.caratula}"?`)) {
      deleteCaseMutation.mutate(caseItem.id);
    }
  }

  return (
    <>
      <section className="panel">
        <div className="panel-title split">
          <h2>{editingCaseId ? "Editar expediente" : "Nuevo expediente"}</h2>
          <button className="icon-button" type="button" onClick={resetForm} title="Nuevo expediente">
            <Plus size={17} />
          </button>
        </div>
        <form className="client-form" onSubmit={handleSubmit} noValidate>
          <label>
            Cliente
            <select name="cliente_principal_id" value={form.cliente_principal_id} onChange={handleChange}>
              <option value="">Seleccionar</option>
              {(clientsQuery.data || []).map((client) => (
                <option key={client.id} value={client.id}>
                  {client.razon_social || [client.apellido, client.nombre].filter(Boolean).join(", ")}
                </option>
              ))}
            </select>
            <ErrorText value={errors.cliente_principal_id} />
          </label>
          <Field label="Numero" name="numero_expediente" value={form.numero_expediente} onChange={handleChange} />
          <Field label="Caratula" name="caratula" value={form.caratula} error={errors.caratula} onChange={handleChange} />
          <Field label="Materia" name="materia" value={form.materia} onChange={handleChange} />
          <Field label="Fuero" name="fuero" value={form.fuero} onChange={handleChange} />
          <Field label="Jurisdiccion" name="jurisdiccion" value={form.jurisdiccion} onChange={handleChange} />
          <Field label="Juzgado" name="juzgado" value={form.juzgado} onChange={handleChange} />
          <Field label="Secretaria" name="secretaria" value={form.secretaria} onChange={handleChange} />
          <Field label="Estado" name="estado_expediente" value={form.estado_expediente} onChange={handleChange} />
          <Field label="Fecha inicio" name="fecha_inicio" type="date" value={form.fecha_inicio} onChange={handleChange} />
          <Field label="Fecha cierre" name="fecha_cierre" type="date" value={form.fecha_cierre} onChange={handleChange} />
          <label className="form-wide">
            Observaciones
            <textarea name="observaciones" rows="3" value={form.observaciones} onChange={handleChange} />
          </label>
          <div className="form-actions form-wide">
            <button className="primary-button" type="submit" disabled={saveCaseMutation.isPending}>
              <Save size={17} />
              Guardar
            </button>
            <button className="secondary-button" type="button" onClick={resetForm}>
              <RotateCcw size={17} />
              Limpiar
            </button>
          </div>
          {message && <p className={saveCaseMutation.isError ? "form-message error-text" : "form-message"}>{message}</p>}
        </form>
      </section>

      {selectedCaseQuery.data && (
        <section className="panel">
          <div className="panel-title">
            <h2>Detalle de expediente</h2>
          </div>
          <dl className="details compact-details">
            <div><dt>Caratula</dt><dd>{selectedCaseQuery.data.caratula}</dd></div>
            <div><dt>Cliente</dt><dd>{selectedCaseQuery.data.cliente || "-"}</dd></div>
            <div><dt>Juzgado</dt><dd>{selectedCaseQuery.data.juzgado || "-"}</dd></div>
            <div><dt>Estado</dt><dd>{selectedCaseQuery.data.estado_expediente || "-"}</dd></div>
          </dl>
        </section>
      )}

      <section className="panel">
        <div className="panel-title split">
          <h2>Expedientes</h2>
          <label className="search-box">
            Buscar
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Numero, caratula, cliente" />
          </label>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Numero</th>
                <th>Caratula</th>
                <th>Cliente</th>
                <th>Fuero</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredCases.map((caseItem) => (
                <tr key={caseItem.id} className={selectedCaseId === caseItem.id ? "selected-row" : undefined}>
                  <td>{caseItem.numero_expediente || "-"}</td>
                  <td>{caseItem.caratula || "-"}</td>
                  <td>{caseItem.cliente || "-"}</td>
                  <td>{caseItem.fuero || "-"}</td>
                  <td>{caseItem.estado_expediente || "-"}</td>
                  <td>
                    <div className="row-actions">
                      <button className="row-button" type="button" onClick={() => setSelectedCaseId(caseItem.id)}><Eye size={15} />Ver</button>
                      <button className="row-button" type="button" onClick={() => editCase(caseItem.id)}><Edit3 size={15} />Editar</button>
                      <button className="row-button danger" type="button" onClick={() => deleteCase(caseItem)}><Trash2 size={15} />Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCases.length === 0 && (
                <tr>
                  <td colSpan="6">No hay expedientes activos para mostrar.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
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
