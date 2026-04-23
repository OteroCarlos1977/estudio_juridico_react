import { CalendarPlus, CheckCircle2, Download, Edit3, Eye, Trash2, X } from "lucide-react";
import { showError } from "../../ui/alerts";
import { viewAttachmentFile } from "../../ui/attachmentViewer";
import { downloadFile } from "../../ui/download";

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
        <div className="panel-actions">
          <button className="primary-button" type="button" onClick={onCreateAction}>
            <CalendarPlus size={17} />
            Nueva actuacion
          </button>
          <button className="icon-button close-detail-button" type="button" onClick={onClose} title="Cerrar detalle">
            <X size={17} />
          </button>
        </div>
      </div>
      <dl className="details compact-details">
        <div><dt>Caratula</dt><dd>{caseItem.caratula}</dd></div>
        <div><dt>Cliente</dt><dd>{caseItem.cliente || "-"}</dd></div>
        <div><dt>Juzgado</dt><dd>{caseItem.juzgado || "-"}</dd></div>
        <div><dt>Estado</dt><dd>{caseItem.estado_expediente || "-"}</dd></div>
      </dl>
      {actionMessage && <p className={isActionError ? "form-message error-text" : "form-message"}>{actionMessage}</p>}
      <div className="subsection-title">
        <h2>Documentos adjuntos</h2>
      </div>
      {isLoadingAttachments ? (
        <p className="muted-text">Cargando adjuntos...</p>
      ) : (
        <div className="table-wrap compact-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Archivo</th>
                <th>Descripcion</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {attachments.map((item) => (
                <tr key={item.id}>
                  <td>{item.nombre_original || "-"}</td>
                  <td>{item.descripcion || "-"}</td>
                  <td>{item.fecha_documento || item.created_at || "-"}</td>
                  <td>
                    <div className="row-actions">
                      <button className="row-button" type="button" onClick={() => viewAttachmentFile(item)}>
                        <Eye size={15} />
                        Ver
                      </button>
                      <button className="row-button" type="button" onClick={() => downloadAttachment(item)}>
                        <Download size={15} />
                        Descargar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {attachments.length === 0 && (
                <tr>
                  <td colSpan="4">No hay adjuntos cargados para este expediente.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <div className="subsection-title">
        <h2>Actuaciones del expediente</h2>
      </div>
      {isLoadingActions ? (
        <p className="muted-text">Cargando actuaciones...</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Titulo</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {actions.map((item) => (
                <tr key={item.id}>
                  <td>{item.fecha_vencimiento || item.fecha_evento || "-"}</td>
                  <td>{item.clase_actuacion || "-"}</td>
                  <td>{item.titulo || item.descripcion || "-"}</td>
                  <td>{item.cumplida ? "Cumplida" : item.estado_actuacion || "Pendiente"}</td>
                  <td>
                    <div className="row-actions">
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
                    </div>
                  </td>
                </tr>
              ))}
              {actions.length === 0 && (
                <tr>
                  <td colSpan="5">No hay actuaciones cargadas para este expediente.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
