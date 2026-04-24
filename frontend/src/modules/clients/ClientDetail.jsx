import { X } from "lucide-react";
import { Col, Row, Stack } from "react-bootstrap";
import { formatClientName, formatLocation } from "./clientUtils";

export function ClientDetail({ client, onClose }) {
  if (!client) {
    return null;
  }

  return (
    <section className="panel">
      <div className="panel-title split">
        <h2>Detalle de cliente</h2>
        <Stack direction="horizontal" gap={2} className="panel-actions">
          <button className="icon-button close-detail-button" type="button" onClick={onClose} title="Cerrar detalle">
            <X size={17} />
          </button>
        </Stack>
      </div>
      <Row className="detail-row-grid g-3">
        <Col md={6}>
          <DetailItem label="Cliente" value={formatClientName(client)} />
        </Col>
        <Col md={6}>
          <DetailItem label="DNI/CUIT" value={client.dni_cuit || "-"} />
        </Col>
        <Col md={6}>
          <DetailItem label="Contacto" value={[client.telefono, client.email].filter(Boolean).join(" / ") || "-"} />
        </Col>
        <Col md={6}>
          <DetailItem
            label="Domicilio"
            value={[client.domicilio, formatLocation(client), client.codigo_postal].filter((item) => item && item !== "-").join(" / ") || "-"}
          />
        </Col>
        <Col xs={12}>
          <DetailItem label="Observaciones" value={client.observaciones || "-"} />
        </Col>
      </Row>
    </section>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="detail-item">
      <span className="detail-label">{label}</span>
      <div className="detail-value">{value}</div>
    </div>
  );
}
