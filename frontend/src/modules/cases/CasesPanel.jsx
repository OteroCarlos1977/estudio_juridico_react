import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";

export function CasesPanel() {
  const casesQuery = useQuery({
    queryKey: ["cases"],
    queryFn: async () => {
      const response = await api.get("/expedientes");
      return response.data.cases;
    },
    retry: 1,
  });

  return (
    <section className="panel">
      <div className="panel-title">
        <h2>Expedientes</h2>
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
            </tr>
          </thead>
          <tbody>
            {(casesQuery.data || []).map((caseItem) => (
              <tr key={caseItem.id}>
                <td>{caseItem.numero_expediente || "-"}</td>
                <td>{caseItem.caratula || "-"}</td>
                <td>{caseItem.cliente || "-"}</td>
                <td>{caseItem.fuero || "-"}</td>
                <td>{caseItem.estado_expediente || "-"}</td>
              </tr>
            ))}
            {casesQuery.data?.length === 0 && (
              <tr>
                <td colSpan="5">No hay expedientes activos para mostrar.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
