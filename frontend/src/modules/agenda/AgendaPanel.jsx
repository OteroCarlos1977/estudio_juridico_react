import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";

export function AgendaPanel() {
  const query = useQuery({
    queryKey: ["agenda"],
    queryFn: async () => (await api.get("/agenda")).data.items,
    retry: 1,
  });

  return (
    <section className="panel">
      <div className="panel-title"><h2>Agenda y actuaciones</h2></div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Fecha</th><th>Tipo</th><th>Titulo</th><th>Expediente</th><th>Estado</th></tr></thead>
          <tbody>
            {(query.data || []).slice(0, 25).map((item) => (
              <tr key={item.id}>
                <td>{item.fecha_vencimiento || item.fecha_evento || "-"}</td>
                <td>{item.clase_actuacion || "-"}</td>
                <td>{item.titulo || item.descripcion || "-"}</td>
                <td>{item.numero_expediente || item.caratula || "-"}</td>
                <td>{item.cumplida ? "Cumplida" : item.estado_actuacion || "Pendiente"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
