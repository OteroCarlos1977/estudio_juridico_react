import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";

export function SystemPanel() {
  const usersQuery = useQuery({ queryKey: ["users"], queryFn: async () => (await api.get("/sistema/usuarios")).data.users, retry: 1 });
  const reportsQuery = useQuery({ queryKey: ["report-summary"], queryFn: async () => (await api.get("/sistema/reportes/resumen")).data.totals, retry: 1 });
  const backupsQuery = useQuery({ queryKey: ["backups"], queryFn: async () => (await api.get("/sistema/backups")).data.backups, retry: 1 });

  return (
    <section className="panel">
      <div className="panel-title"><h2>Sistema, usuarios, reportes y backups</h2></div>
      <section className="summary-grid">
        {Object.entries(reportsQuery.data || {}).map(([key, value]) => (
          <article className="metric" key={key}><span>{key}</span><strong>{value}</strong></article>
        ))}
      </section>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Usuario</th><th>Nombre</th><th>Email</th><th>Roles</th><th>Activo</th></tr></thead>
          <tbody>
            {(usersQuery.data || []).map((user) => (
              <tr key={user.id}><td>{user.username}</td><td>{user.nombre || "-"}</td><td>{user.email || "-"}</td><td>{user.roles || "-"}</td><td>{user.activo ? "Si" : "No"}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="form-message">Backups registrados: {(backupsQuery.data || []).length}</p>
    </section>
  );
}
