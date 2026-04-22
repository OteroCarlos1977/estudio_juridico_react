import { Edit3, Eye, Trash2 } from "lucide-react";
import { formatClientName, formatLocation } from "./clientUtils";

export function ClientTable({ clients, search, selectedClientId, onSearchChange, onEdit, onView, onDelete }) {
  const normalizedSearch = search.trim().toLowerCase();
  const filteredClients = clients.filter((client) =>
    [
      formatClientName(client),
      client.dni_cuit,
      client.telefono,
      client.email,
      formatLocation(client),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearch)
  );

  return (
    <section className="panel">
      <div className="panel-title split">
        <h2>Clientes activos</h2>
        <label className="search-box">
          Buscar
          <input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Nombre, DNI, email" />
        </label>
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
            {filteredClients.map((client) => (
              <tr key={client.id} className={selectedClientId === client.id ? "selected-row" : undefined}>
                <td>{formatClientName(client)}</td>
                <td>{client.dni_cuit || "-"}</td>
                <td>{client.telefono || "-"}</td>
                <td>{client.email || "-"}</td>
                <td>{formatLocation(client)}</td>
                <td>
                  <div className="row-actions">
                    <button className="row-button" type="button" onClick={() => onView(client.id)} title="Ver detalle">
                      <Eye size={15} />
                      Ver
                    </button>
                    <button className="row-button" type="button" onClick={() => onEdit(client.id)} title="Editar cliente">
                      <Edit3 size={15} />
                      Editar
                    </button>
                    <button className="row-button danger" type="button" onClick={() => onDelete(client)} title="Eliminar cliente">
                      <Trash2 size={15} />
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredClients.length === 0 && (
              <tr>
                <td colSpan="6">No hay clientes activos para mostrar.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
