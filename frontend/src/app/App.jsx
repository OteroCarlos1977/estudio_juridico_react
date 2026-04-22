import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Database, Edit3, Plus, RotateCcw, Save, Scale, Server } from "lucide-react";
import { api } from "../api/client";

const emptyClientForm = {
  tipo_persona: "fisica",
  apellido: "",
  nombre: "",
  razon_social: "",
  dni_cuit: "",
  telefono: "",
  email: "",
  domicilio: "",
  localidad: "",
  provincia: "",
  codigo_postal: "",
  observaciones: "",
};

function App() {
  const queryClient = useQueryClient();
  const [clientForm, setClientForm] = useState(emptyClientForm);
  const [editingClientId, setEditingClientId] = useState(null);
  const [clientFormErrors, setClientFormErrors] = useState({});
  const [clientFormMessage, setClientFormMessage] = useState("");

  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const response = await api.get("/health");
      return response.data;
    },
    retry: 1,
  });

  const summaryQuery = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const response = await api.get("/dashboard/summary");
      return response.data;
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

  const isApiReady = healthQuery.data?.ok;
  const database = healthQuery.data?.database;
  const isEditingClient = Boolean(editingClientId);

  const saveClientMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingClientId) {
        const response = await api.put(`/clientes/${editingClientId}`, payload);
        return response.data.client;
      }

      const response = await api.post("/clientes", payload);
      return response.data.client;
    },
    onSuccess: (client) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      setClientForm(emptyClientForm);
      setEditingClientId(null);
      setClientFormErrors({});
      setClientFormMessage(`Cliente guardado: ${formatClientName(client)}`);
    },
    onError: (error) => {
      const response = error.response?.data;
      setClientFormErrors(response?.details?.fieldErrors || {});
      setClientFormMessage(response?.message || "No se pudo guardar el cliente.");
    },
  });

  function handleClientFieldChange(event) {
    const { name, value } = event.target;
    setClientForm((current) => ({ ...current, [name]: value }));
    setClientFormErrors((current) => ({ ...current, [name]: undefined }));
  }

  function handleClientSubmit(event) {
    event.preventDefault();
    setClientFormMessage("");

    const validationErrors = validateClientForm(clientForm);
    setClientFormErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setClientFormMessage("Revisa los campos marcados antes de guardar.");
      return;
    }

    saveClientMutation.mutate(clientForm);
  }

  function startNewClient() {
    setClientForm(emptyClientForm);
    setEditingClientId(null);
    setClientFormErrors({});
    setClientFormMessage("");
  }

  async function startEditingClient(clientId) {
    setClientFormMessage("");
    setClientFormErrors({});

    try {
      const response = await api.get(`/clientes/${clientId}`);
      const client = response.data.client;
      setEditingClientId(client.id);
      setClientForm({
        tipo_persona: client.tipo_persona || "fisica",
        apellido: client.apellido || "",
        nombre: client.nombre || "",
        razon_social: client.razon_social || "",
        dni_cuit: client.dni_cuit || "",
        telefono: client.telefono || "",
        email: client.email || "",
        domicilio: client.domicilio || "",
        localidad: client.localidad || "",
        provincia: client.provincia || "",
        codigo_postal: client.codigo_postal || "",
        observaciones: client.observaciones || "",
      });
    } catch (error) {
      setClientFormMessage(error.response?.data?.message || "No se pudo cargar el cliente.");
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <Scale size={26} />
          <div>
            <strong>Rollie</strong>
            <span>Estudio juridico</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="Modulos principales">
          <a className="active" href="#dashboard">Dashboard</a>
          <a href="#clientes">Clientes</a>
          <a href="#expedientes">Expedientes</a>
          <a href="#agenda">Agenda</a>
          <a href="#finanzas">Finanzas</a>
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Nueva aplicacion React</p>
            <h1>Base tecnica inicial</h1>
          </div>
          <div className={isApiReady ? "status online" : "status offline"}>
            <Server size={16} />
            {isApiReady ? "API conectada" : "API sin conexion"}
          </div>
        </header>

        {healthQuery.isError && (
          <div className="notice error">
            <AlertCircle size={18} />
            No se pudo conectar con el backend en http://localhost:3001/api.
          </div>
        )}

        <section className="summary-grid" aria-label="Resumen operativo">
          <Metric title="Clientes" value={summaryQuery.data?.clients ?? 0} />
          <Metric title="Expedientes" value={summaryQuery.data?.cases ?? 0} />
          <Metric title="Vencimientos" value={summaryQuery.data?.pendingDeadlines ?? 0} />
          <Metric title="Impagos" value={summaryQuery.data?.unpaidMovements ?? 0} />
        </section>

        <section className="panel">
          <div className="panel-title">
            <Database size={18} />
            <h2>Conexion SQLite</h2>
          </div>
          <dl className="details">
            <div>
              <dt>Estado</dt>
              <dd>{database?.exists ? "Base encontrada" : "Base pendiente de copiar"}</dd>
            </div>
            <div>
              <dt>Archivo</dt>
              <dd>{database?.path || "Sin informacion"}</dd>
            </div>
            <div>
              <dt>Tamano</dt>
              <dd>{database?.sizeBytes ?? 0} bytes</dd>
            </div>
          </dl>
        </section>

        <section className="panel">
          <div className="panel-title split">
            <h2>{isEditingClient ? "Editar cliente" : "Nuevo cliente"}</h2>
            <button className="icon-button" type="button" onClick={startNewClient} title="Nuevo cliente">
              <Plus size={17} />
            </button>
          </div>

          <form className="client-form" onSubmit={handleClientSubmit} noValidate>
            <label>
              Tipo
              <select name="tipo_persona" value={clientForm.tipo_persona} onChange={handleClientFieldChange}>
                <option value="fisica">Persona fisica</option>
                <option value="juridica">Persona juridica</option>
              </select>
            </label>

            <Field
              label="Apellido"
              name="apellido"
              value={clientForm.apellido}
              error={clientFormErrors.apellido}
              onChange={handleClientFieldChange}
            />
            <Field
              label="Nombre"
              name="nombre"
              value={clientForm.nombre}
              error={clientFormErrors.nombre}
              onChange={handleClientFieldChange}
            />
            <Field
              label="Razon social"
              name="razon_social"
              value={clientForm.razon_social}
              error={clientFormErrors.razon_social}
              onChange={handleClientFieldChange}
            />
            <Field
              label="DNI/CUIT"
              name="dni_cuit"
              value={clientForm.dni_cuit}
              error={clientFormErrors.dni_cuit}
              onChange={handleClientFieldChange}
            />
            <Field
              label="Telefono"
              name="telefono"
              value={clientForm.telefono}
              error={clientFormErrors.telefono}
              onChange={handleClientFieldChange}
            />
            <Field
              label="Email"
              name="email"
              type="email"
              value={clientForm.email}
              error={clientFormErrors.email}
              onChange={handleClientFieldChange}
            />
            <Field
              label="Domicilio"
              name="domicilio"
              value={clientForm.domicilio}
              error={clientFormErrors.domicilio}
              onChange={handleClientFieldChange}
            />
            <Field
              label="Localidad"
              name="localidad"
              value={clientForm.localidad}
              error={clientFormErrors.localidad}
              onChange={handleClientFieldChange}
            />
            <Field
              label="Provincia"
              name="provincia"
              value={clientForm.provincia}
              error={clientFormErrors.provincia}
              onChange={handleClientFieldChange}
            />
            <Field
              label="Codigo postal"
              name="codigo_postal"
              value={clientForm.codigo_postal}
              error={clientFormErrors.codigo_postal}
              onChange={handleClientFieldChange}
            />

            <label className="form-wide">
              Observaciones
              <textarea
                name="observaciones"
                rows="3"
                value={clientForm.observaciones}
                onChange={handleClientFieldChange}
              />
              <ErrorText value={clientFormErrors.observaciones} />
            </label>

            <div className="form-actions form-wide">
              <button className="primary-button" type="submit" disabled={saveClientMutation.isPending}>
                <Save size={17} />
                {saveClientMutation.isPending ? "Guardando" : "Guardar"}
              </button>
              <button className="secondary-button" type="button" onClick={startNewClient}>
                <RotateCcw size={17} />
                Limpiar
              </button>
            </div>

            {clientFormMessage && (
              <p className={saveClientMutation.isError ? "form-message error-text" : "form-message"}>
                {clientFormMessage}
              </p>
            )}
          </form>
        </section>

        <section className="panel">
          <div className="panel-title">
            <h2>Clientes activos</h2>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>DNI/CUIT</th>
                  <th>Telefono</th>
                  <th>Email</th>
                  <th>Localidad</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {(clientsQuery.data || []).map((client) => (
                  <tr key={client.id}>
                    <td>{formatClientName(client)}</td>
                    <td>{client.dni_cuit || "-"}</td>
                    <td>{client.telefono || "-"}</td>
                    <td>{client.email || "-"}</td>
                    <td>{formatLocation(client)}</td>
                    <td>
                      <button
                        className="row-button"
                        type="button"
                        onClick={() => startEditingClient(client.id)}
                        title="Editar cliente"
                      >
                        <Edit3 size={15} />
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
                {clientsQuery.data?.length === 0 && (
                  <tr>
                    <td colSpan="6">No hay clientes activos cargados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}

function Metric({ title, value }) {
  return (
    <article className="metric">
      <span>{title}</span>
      <strong>{value}</strong>
    </article>
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
  if (!value?.length) {
    return null;
  }

  return <span className="error-text">{value[0]}</span>;
}

function validateClientForm(form) {
  const errors = {};

  if (form.tipo_persona === "fisica" && !form.apellido.trim() && !form.nombre.trim()) {
    errors.apellido = ["Debe cargar apellido o nombre para personas fisicas."];
  }

  if (form.tipo_persona === "juridica" && !form.razon_social.trim()) {
    errors.razon_social = ["La razon social es obligatoria para personas juridicas."];
  }

  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = ["Email invalido."];
  }

  return errors;
}

function formatClientName(client) {
  if (client.razon_social) {
    return client.razon_social;
  }

  return [client.apellido, client.nombre].filter(Boolean).join(", ") || `Cliente ${client.id}`;
}

function formatLocation(client) {
  return [client.localidad, client.provincia].filter(Boolean).join(", ") || "-";
}

export default App;
