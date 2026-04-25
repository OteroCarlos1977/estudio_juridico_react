import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CalendarClock, LogOut, Scale, Server } from "lucide-react";
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
  const [token, setToken] = useState(() => localStorage.getItem("auth_token") || "");
  const [currentUser, setCurrentUser] = useState(() => {
    const storedUser = localStorage.getItem("auth_user");
    if (!storedUser) return null;

    try {
      return JSON.parse(storedUser);
    } catch {
      localStorage.removeItem("auth_user");
      return null;
    }
  });
  const [loginError, setLoginError] = useState("");

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
      localStorage.setItem("auth_token", data.token);
      localStorage.setItem("auth_user", JSON.stringify(data.user));
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

        <div className={isApiReady ? "status sidebar-status online" : "status sidebar-status offline"}>
          <Server size={16} />
          {isApiReady ? "API conectada" : "API sin conexion"}
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">{activeSectionConfig.eyebrow}</p>
            <h1>{activeSectionConfig.title}</h1>
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

function DashboardPanel({ summary, dollarQuotes, isLoading, isError, isDollarLoading, isDollarError }) {
  const [now, setNow] = useState(() => new Date());
  const [taskText, setTaskText] = useState("");
  const [memoryTasks, setMemoryTasks] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("dashboard_memory_tasks") || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem("dashboard_memory_tasks", JSON.stringify(memoryTasks));
  }, [memoryTasks]);

  function addMemoryTask(event) {
    event.preventDefault();
    const text = taskText.trim();
    if (!text) return;
    setMemoryTasks((current) => [{ id: Date.now(), text, done: false }, ...current].slice(0, 8));
    setTaskText("");
  }

  function toggleMemoryTask(taskId) {
    setMemoryTasks((current) => current.map((task) => (task.id === taskId ? { ...task, done: !task.done } : task)));
  }

  function deleteMemoryTask(taskId) {
    setMemoryTasks((current) => current.filter((task) => task.id !== taskId));
  }

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
        <Metric title="Clientes" value={summary?.clients ?? 0} href="#clientes" />
        <Metric title="Expedientes" value={summary?.cases ?? 0} href="#expedientes" />
        <Metric title="Vencimientos" value={summary?.pendingDeadlines ?? 0} href="#agenda" />
        <Metric title="Impagos" value={summary?.unpaidMovements ?? 0} href="#finanzas" />
      </section>

      <section className="panel dashboard-focus-panel">
        <div className="dashboard-work-grid">
          <div>
            <div className="panel-title">
              <CalendarClock size={18} />
              <h2>Para hoy</h2>
            </div>
            <div className="dashboard-today-list">
              {(summary?.todayItems || []).map((item, index) => (
                <a className="dashboard-today-row" href={item.href} key={`${item.source}-${index}`}>
                  <span className="dashboard-today-type">{item.tipo}</span>
                  <span className="dashboard-today-time">{item.hora || "-"}</span>
                  <strong>{item.detalle}</strong>
                  <span>{item.referencia || "-"}</span>
                </a>
              ))}
              {(summary?.todayItems || []).length === 0 && (
                <div className="dashboard-today-empty">No hay tareas, pagos ni reuniones para hoy.</div>
              )}
            </div>
          </div>
          <aside className="dashboard-memory">
            <div className="panel-title">
              <h2>Por hacer</h2>
            </div>
            <form className="dashboard-memory-form" onSubmit={addMemoryTask}>
              <input value={taskText} onChange={(event) => setTaskText(event.target.value)} placeholder="Agregar ayuda memoria" />
              <button className="icon-button" type="submit" title="Agregar tarea">+</button>
            </form>
            <div className="dashboard-memory-list">
              {memoryTasks.map((task) => (
                <label className={`dashboard-memory-item ${task.done ? "done" : ""}`} key={task.id}>
                  <input type="checkbox" checked={task.done} onChange={() => toggleMemoryTask(task.id)} />
                  <span>{task.text}</span>
                  <button type="button" onClick={() => deleteMemoryTask(task.id)} title="Quitar">×</button>
                </label>
              ))}
              {memoryTasks.length === 0 && <p className="muted-text">Sin notas pendientes.</p>}
            </div>
          </aside>
        </div>
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

function Metric({ title, value, href }) {
  const content = (
    <>
      <span>{title}</span>
      <strong>{value}</strong>
    </>
  );

  if (href) {
    return (
      <a className="metric metric-link" href={href}>
        {content}
      </a>
    );
  }

  return <article className="metric">{content}</article>;
}

export default App;
