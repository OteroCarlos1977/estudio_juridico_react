import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";

export function AttachmentsPanel() {
  const query = useQuery({
    queryKey: ["attachments"],
    queryFn: async () => (await api.get("/adjuntos")).data.attachments,
    retry: 1,
  });

  return (
    <section className="panel">
      <div className="panel-title"><h2>Adjuntos</h2></div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Archivo</th><th>Cliente</th><th>Expediente</th><th>Tamano</th><th>Fecha</th></tr></thead>
          <tbody>
            {(query.data || []).slice(0, 25).map((item) => (
              <tr key={item.id}>
                <td>{item.nombre_original || "-"}</td>
                <td>{item.cliente || "-"}</td>
                <td>{item.numero_expediente || "-"}</td>
                <td>{item.tamano_bytes || 0} bytes</td>
                <td>{item.fecha_documento || item.created_at || "-"}</td>
              </tr>
            ))}
            {query.data?.length === 0 && <tr><td colSpan="5">No hay adjuntos cargados.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
