import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";

export function FinancePanel() {
  const query = useQuery({
    queryKey: ["finance-movements"],
    queryFn: async () => (await api.get("/finanzas/movimientos")).data.movements,
    retry: 1,
  });

  return (
    <section className="panel">
      <div className="panel-title"><h2>Finanzas</h2></div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Fecha</th><th>Concepto</th><th>Cliente</th><th>Monto</th><th>Estado</th></tr></thead>
          <tbody>
            {(query.data || []).slice(0, 25).map((item) => (
              <tr key={item.id}>
                <td>{item.fecha_movimiento || "-"}</td>
                <td>{item.concepto || item.descripcion || "-"}</td>
                <td>{item.cliente || "-"}</td>
                <td>{item.moneda || "ARS"} {Number(item.monto || 0).toLocaleString("es-AR")}</td>
                <td>{item.estado_pago || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
