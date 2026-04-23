import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Database, LogOut, Scale, Server } from "lucide-react";
import { api, setAuthToken } from "../api/client";
import { LoginView } from "./LoginView";
import { AgendaPanel } from "../modules/agenda/AgendaPanel";
import { AttachmentsPanel } from "../modules/attachments/AttachmentsPanel";
import { ClientsPanel } from "../modules/clients/ClientsPanel";
import { CasesPanel } from "../modules/cases/CasesPanel";
import { FinancePanel } from "../modules/finance/FinancePanel";
import { SystemPanel } from "../modules/system/SystemPanel";
import { QueryState } from "../ui/QueryState";

const sections = [
  { id: "dashboard", label: "Dashboard", title: "Dashboard", eyebrow: "Operacion diaria" },
  { id: "clientes", label: "Clientes", title: "Clientes", eyebrow: "Gestion comercial" },
  { id: "expedientes", label: "Expedientes", title: "Expedientes", eyebrow: "Gestion judicial" },
  { id: "agenda", label: "Agenda", title: "Agenda", eyebrow: "Vencimientos y actuaciones" },
  { id: "finanzas", label: "Finanzas", title: "Finanzas", eyebrow: "Movimientos y pagos" },
  { id: "adjuntos", label: "Adjuntos", title: "Adjuntos", eyebrow: "Documentacion" },
  { id: "sistema", label: "Sistema", title: "Sistema", eyebrow: "Usuarios y backups" },
];

const sectionIds = new Set(sections.map((section) => section.id));

function getHashSection() {
  const hash = window.location.hash.replace("#", "");
  return sectionIds.has(hash) ? hash : "dashboard";
}

function App() {
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState(getHashSection);
  const [token, setToken] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
  }, []);

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  useEffect(() => {
    const interceptorId = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401 && token) {
          handleLogout();
        }
        return Promise.reject(error);
      }
    );

    return () => api.interceptors.response.eject(interceptorId);
  }, [token]);

  useEffect(() => {
    if (!window.location.hash || !sectionIds.has(window.location.hash.replace("#", ""))) {
      window.history.replaceState(null, "", "#dashboard");
    }

    const handleHashChange = () => {
      setActiveSection(getHashSection());
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

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
    enabled: Boolean(token),
  });

  const dollarQuery = useQuery({
    queryKey: ["dashboard-dollar"],
    queryFn: async () => {
      const response = await api.get("/dashboard/dollar");
      return response.data.quotes;
    },
    retry: 1,
    refetchInterval: 5 * 60 * 1000,
    enabled: Boolean(token),
  });

  const isAdmin = currentUser?.roles?.includes("Administrador");
  const availableSections = useMemo(
    () => sections.filter((section) => section.id !== "sistema" || isAdmin),
    [isAdmin]
  );

  useEffect(() => {
    if (currentUser && activeSection === "sistema" && !isAdmin) {
      window.history.replaceState(null, "", "#dashboard");
      setActiveSection("dashboard");
    }
  }, [activeSection, currentUser, isAdmin]);

  const activeSectionConfig = useMemo(
    () => availableSections.find((section) => section.id === activeSection) ?? availableSections[0],
    [activeSection, availableSections]
  );

  const isApiReady = healthQuery.data?.ok;

  const loginMutation = useMutation({
    mutationFn: async (credentials) => (await api.post("/auth/login", credentials)).data,
    onSuccess: (data) => {
      setToken(data.token);
      setCurrentUser(data.user);
      setLoginError("");
      queryClient.invalidateQueries();
    },
    onError: (error) => {
      setLoginError(error.response?.data?.message || "No se pudo iniciar sesion.");
    },
  });

  function handleLogout() {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    setToken("");
    setCurrentUser(null);
    setAuthToken("");
    queryClient.clear();
  }

  if (!token || !currentUser) {
    return <LoginView isLoading={loginMutation.isPending} error={loginError} onSubmit={(credentials) => loginMutation.mutate(credentials)} />;
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <Scale size={26} />
          <div>
            <strong>Rollie</strong>
            <span>Consultorio Jurídico</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="Modulos principales">
          {availableSections.map((section) => (
            <a
              aria-current={activeSection === section.id ? "page" : undefined}
              className={activeSection === section.id ? "active" : undefined}
              href={`#${section.id}`}
              key={section.id}
            >
              {section.label}
            </a>
          ))}
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">{activeSectionConfig.eyebrow}</p>
            <h1>{activeSectionConfig.title}</h1>
          </div>
          <div className={isApiReady ? "status online" : "status offline"}>
            <Server size={16} />
            {isApiReady ? "API conectada" : "API sin conexion"}
          </div>
          <div className="user-menu">
            <span>{currentUser.nombre_completo || currentUser.username}</span>
            <button className="icon-button" type="button" onClick={handleLogout} title="Cerrar sesion">
              <LogOut size={17} />
            </button>
          </div>
        </header>

        {healthQuery.isError && (
          <div className="notice error">
            <AlertCircle size={18} />
            No se pudo conectar con el backend en http://localhost:3001/api.
          </div>
        )}

        <div className="module-content">
          {activeSection === "dashboard" && (
            <DashboardPanel
              database={healthQuery.data?.database}
              summary={summaryQuery.data}
              dollarQuotes={dollarQuery.data || []}
              isLoading={summaryQuery.isLoading}
              isError={summaryQuery.isError}
              isDollarLoading={dollarQuery.isLoading}
              isDollarError={dollarQuery.isError}
            />
          )}
          {activeSection === "clientes" && <ClientsPanel />}
          {activeSection === "expedientes" && <CasesPanel />}
          {activeSection === "agenda" && <AgendaPanel />}
          {activeSection === "finanzas" && <FinancePanel />}
          {activeSection === "adjuntos" && <AttachmentsPanel />}
          {activeSection === "sistema" && isAdmin && <SystemPanel currentUser={currentUser} />}
        </div>
      </section>
    </main>
  );
}

function DashboardPanel({ database, summary, dollarQuotes, isLoading, isError, isDollarLoading, isDollarError }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <>
      <QueryState isLoading={isLoading} isError={isError} loadingText="Cargando resumen..." errorText="No se pudo cargar el resumen operativo." />
      <section className="summary-grid dashboard-info-grid" aria-label="Fecha, hora y dolar">
        <article className="metric">
          <span>Fecha</span>
          <strong>{formatDate(now)}</strong>
        </article>
        <article className="metric">
          <span>Hora</span>
          <strong>{formatTime(now)}</strong>
        </article>
        {dollarQuotes.map((quote) => (
          <article className="metric dollar-metric" key={quote.casa}>
            <span>Dolar {quote.nombre}</span>
            <strong>{formatCurrency(quote.venta)}</strong>
            <small>Compra {formatCurrency(quote.compra)} · Venta {formatCurrency(quote.venta)}</small>
            <small>Actualizado {formatDateTime(quote.fechaActualizacion)}</small>
          </article>
        ))}
        {isDollarLoading && <article className="metric"><span>Dolar</span><strong>Cargando</strong></article>}
        {isDollarError && <article className="metric"><span>Dolar</span><strong>Sin datos</strong><small>No se pudo consultar la cotizacion.</small></article>}
      </section>
      <section className="summary-grid" aria-label="Resumen operativo">
        <Metric title="Clientes" value={summary?.clients ?? 0} />
        <Metric title="Expedientes" value={summary?.cases ?? 0} />
        <Metric title="Vencimientos" value={summary?.pendingDeadlines ?? 0} />
        <Metric title="Impagos" value={summary?.unpaidMovements ?? 0} />
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
    </>
  );
}

function formatDate(value) {
  return value.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTime(value) {
  return value.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(value) {
  return `$${Number(value || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function Metric({ title, value }) {
  return (
    <article className="metric">
      <span>{title}</span>
      <strong>{value}</strong>
    </article>
  );
}

export default App;
