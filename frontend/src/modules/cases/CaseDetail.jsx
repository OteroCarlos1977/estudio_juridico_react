import { CalendarPlus, CheckCircle2, Download, Edit3, Eye, Trash2, X } from "lucide-react";
import { Badge, ButtonGroup, Col, Row, Stack } from "react-bootstrap";
import { showError } from "../../ui/alerts";
import { viewAttachmentFile } from "../../ui/attachmentViewer";
import { downloadFile } from "../../ui/download";
import { DataTable } from "../../ui/DataTable";
import { TableActionsDropdown } from "../../ui/TableActionsDropdown";

export function CaseDetail({
  caseItem,
  actions,
  attachments,
  isLoadingActions,
  isLoadingAttachments,
  actionMessage,
  isActionError,
  onCreateAction,
  onCompleteAction,
  onEditAction,
  onDeleteAction,
  onClose,
}) {
  if (!caseItem) {
    return null;
  }

  async function downloadAttachment(attachment) {
    try {
      await downloadFile(`/adjuntos/${attachment.id}/descargar`, attachment.nombre_original || "adjunto");
    } catch (error) {
      showError(error.response?.data?.message || "No se pudo descargar el adjunto.");
    }
  }

  return (
    <section className="panel">
      <div className="panel-title split">
        <h2>Detalle de expediente</h2>
        <Stack direction="horizontal" gap={2} className="panel-actions">
          <button className="primary-button" type="button" onClick={onCreateAction}>
            <CalendarPlus size={17} />
            Nueva actuacion
          </button>
          <button className="icon-button close-detail-button" type="button" onClick={onClose} title="Cerrar detalle">
            <X size={17} />
          </button>
        </Stack>
      </div>
      <Row className="detail-row-grid g-3">
        <Col md={6}>
          <DetailItem label="Caratula" value={caseItem.caratula || "-"} />
        </Col>
        <Col md={6}>
          <DetailItem label="Cliente" value={caseItem.cliente || "-"} />
        </Col>
        <Col md={6}>
          <DetailItem label="Juzgado" value={caseItem.juzgado || "-"} />
        </Col>
        <Col md={6}>
          <DetailItem
            label="Estado"
            value={(
              <Badge pill bg="light" text="dark" className={`status-pill ${getCaseStateClass(caseItem.estado_expediente)}`}>
                {caseItem.estado_expediente || "-"}
              </Badge>
            )}
          />
        </Col>
      </Row>
      {actionMessage && <p className={isActionError ? "form-message error-text" : "form-message"}>{actionMessage}</p>}
      <div className="subsection-title">
        <h2>Documentos adjuntos</h2>
      </div>
      {isLoadingAttachments ? (
        <p className="muted-text">Cargando adjuntos...</p>
      ) : (
        <DataTable compact maxHeight="260px" scrollStyle={{ marginBottom: "0.6rem" }}>
            <thead>
              <tr>
                <th>Archivo</th>
                <th>Descripcion</th>
                <th>Fecha</th>
                <th className="actions-cell">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {attachments.map((item) => (
                <tr key={item.id}>
                  <td>{item.nombre_original || "-"}</td>
                  <td>{item.descripcion || "-"}</td>
                  <td>{item.fecha_documento || item.created_at || "-"}</td>
                  <td className="actions-cell">
                    <TableActionsDropdown
                      label="Acciones del adjunto"
                      items={[
                        { key: "view", label: "Ver", icon: <Eye size={15} />, onClick: () => viewAttachmentFile(item) },
                        { key: "download", label: "Descargar", icon: <Download size={15} />, onClick: () => downloadAttachment(item) },
                      ]}
                    />
                  </td>
                </tr>
              ))}
              {attachments.length === 0 && (
                <tr>
                  <td colSpan="4">No hay adjuntos cargados para este expediente.</td>
                </tr>
              )}
            </tbody>
        </DataTable>
      )}
      <div className="subsection-title">
        <h2>Actuaciones del expediente</h2>
      </div>
      {isLoadingActions ? (
        <p className="muted-text">Cargando actuaciones...</p>
      ) : (
        <DataTable maxHeight="40vh">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Titulo</th>
                <th>Estado</th>
                <th className="actions-cell">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {actions.map((item) => (
                <tr key={item.id}>
                  <td>{item.fecha_vencimiento || item.fecha_evento || "-"}</td>
                  <td>
                    <Badge pill bg="light" text="dark" className="status-pill">
                      {item.clase_actuacion || "-"}
                    </Badge>
                  </td>
                  <td>{item.titulo || item.descripcion || "-"}</td>
                  <td>
                    <Badge pill bg="light" text="dark" className={`status-pill ${item.cumplida ? "success" : getAgendaStateClass(item.estado_actuacion)}`}>
                      {item.cumplida ? "Cumplida" : item.estado_actuacion || "Pendiente"}
                    </Badge>
                  </td>
                  <td className="actions-cell">
                    <ButtonGroup aria-label="Acciones de actuacion" className="row-actions table-button-group">
                      {!item.cumplida && (
                        <button className="row-button" type="button" onClick={() => onCompleteAction(item.id)}>
                          <CheckCircle2 size={15} />
                          Cumplir
                        </button>
                      )}
                      <button className="row-button" type="button" onClick={() => onEditAction(item.id)}>
                        <Edit3 size={15} />
                        Editar
                      </button>
                      <button className="row-button danger" type="button" onClick={() => onDeleteAction(item)}>
                        <Trash2 size={15} />
                        Eliminar
                      </button>
                    </ButtonGroup>
                  </td>
                </tr>
              ))}
              {actions.length === 0 && (
                <tr>
                  <td colSpan="5">No hay actuaciones cargadas para este expediente.</td>
                </tr>
              )}
            </tbody>
        </DataTable>
      )}
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

function getAgendaStateClass(state) {
  const normalized = String(state || "").toLowerCase();
  if (["pendiente", "programada"].includes(normalized)) return "pending";
  if (["vencida", "cancelada"].includes(normalized)) return "warning";
  if (["cumplida", "cerrada"].includes(normalized)) return "success";
  return "";
}

function getCaseStateClass(state) {
  const normalized = String(state || "").toLowerCase();
  if (["activo", "en curso", "abierto"].includes(normalized)) return "pending";
  if (["cerrado", "finalizado", "archivado"].includes(normalized)) return "success";
  if (["vencido", "suspendido"].includes(normalized)) return "warning";
  return "";
}
