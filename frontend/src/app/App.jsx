import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Database, Scale, Server } from "lucide-react";
import { api } from "../api/client";
import { AgendaPanel } from "../modules/agenda/AgendaPanel";
import { AttachmentsPanel } from "../modules/attachments/AttachmentsPanel";
import { ClientsPanel } from "../modules/clients/ClientsPanel";
import { CasesPanel } from "../modules/cases/CasesPanel";
import { FinancePanel } from "../modules/finance/FinancePanel";
import { SystemPanel } from "../modules/system/SystemPanel";

function App() {
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

  const isApiReady = healthQuery.data?.ok;
  const database = healthQuery.data?.database;

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

        <ClientsPanel />
        <CasesPanel />
        <AgendaPanel />
        <FinancePanel />
        <AttachmentsPanel />
        <SystemPanel />
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

export default App;
