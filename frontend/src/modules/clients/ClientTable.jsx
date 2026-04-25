import { Edit3, Eye, Plus, Trash2 } from "lucide-react";
import { Stack } from "react-bootstrap";
import { DataTable } from "../../ui/DataTable";
import { QueryState } from "../../ui/QueryState";
import { TableActionsDropdown } from "../../ui/TableActionsDropdown";
import { formatClientName, formatLocation } from "./clientUtils";

export function ClientTable({ clients, search, selectedClientId, isLoading, isError, onSearchChange, onCreate, onEdit, onView, onDelete }) {
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
    <section className="panel" style={{ display: "flex", flexDirection: "column", flex: "1 1 auto", minHeight: 0, overflow: "hidden" }}>
      <div className="panel-title split">
        <h2>Clientes activos</h2>
        <Stack direction="horizontal" gap={2} className="panel-actions">
          <label className="search-box">
            Buscar
            <input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Nombre, DNI, email" />
          </label>
          <button className="primary-button" type="button" onClick={onCreate}>
            <Plus size={17} />
            Nuevo
          </button>
        </Stack>
      </div>

      <QueryState isLoading={isLoading} isError={isError} loadingText="Cargando clientes..." errorText="No se pudieron cargar los clientes." />
      {!isLoading && !isError && <DataTable maxHeight="clamp(26rem, calc(100vh - 15rem), 68vh)">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>DNI/CUIT</th>
              <th>Telefono</th>
              <th>Email</th>
              <th>Localidad</th>
              <th className="actions-cell">Acciones</th>
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
                <td className="actions-cell">
                  <TableActionsDropdown
                    label="Acciones del cliente"
                    items={[
                      { key: "view", label: "Ver", icon: <Eye size={15} />, onClick: () => onView(client.id) },
                      { key: "edit", label: "Editar", icon: <Edit3 size={15} />, onClick: () => onEdit(client.id) },
                      { key: "delete", label: "Eliminar", icon: <Trash2 size={15} />, onClick: () => onDelete(client), danger: true },
                    ]}
                  />
                </td>
              </tr>
            ))}
            {filteredClients.length === 0 && (
              <tr>
                <td colSpan="6">No hay clientes activos para mostrar.</td>
              </tr>
            )}
          </tbody>
      </DataTable>}
    </section>
  );
}
