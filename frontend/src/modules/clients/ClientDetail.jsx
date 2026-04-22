import { formatClientName, formatLocation } from "./clientUtils";

export function ClientDetail({ client }) {
  if (!client) {
    return null;
  }

  return (
    <section className="panel">
      <div className="panel-title">
        <h2>Detalle de cliente</h2>
      </div>
      <dl className="details compact-details">
        <div>
          <dt>Cliente</dt>
          <dd>{formatClientName(client)}</dd>
        </div>
        <div>
          <dt>DNI/CUIT</dt>
          <dd>{client.dni_cuit || "-"}</dd>
        </div>
        <div>
          <dt>Contacto</dt>
          <dd>{[client.telefono, client.email].filter(Boolean).join(" / ") || "-"}</dd>
        </div>
        <div>
          <dt>Domicilio</dt>
          <dd>{[client.domicilio, formatLocation(client), client.codigo_postal].filter((item) => item && item !== "-").join(" / ") || "-"}</dd>
        </div>
        <div>
          <dt>Observaciones</dt>
          <dd>{client.observaciones || "-"}</dd>
        </div>
      </dl>
    </section>
  );
}
