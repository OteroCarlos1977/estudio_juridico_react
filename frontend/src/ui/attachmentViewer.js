import { api } from "../api/client";
import { showError, showSuccess } from "./alerts";
import { downloadFile } from "./download";

const previewableExtensions = new Set(["pdf", "png", "jpg", "jpeg", "gif", "webp", "bmp"]);
const officeExtensions = new Set(["doc", "docx", "rtf", "odt"]);

export async function viewAttachmentFile(attachment) {
  const extension = getAttachmentExtension(attachment);

  if (officeExtensions.has(extension)) {
    await downloadFile(`/adjuntos/${attachment.id}/descargar`, attachment.nombre_original || "adjunto");
    showSuccess("El documento se descargo para abrirlo con el programa instalado.");
    return;
  }

  if (!previewableExtensions.has(extension)) {
    await downloadFile(`/adjuntos/${attachment.id}/descargar`, attachment.nombre_original || "adjunto");
    showSuccess("Formato no previsualizable. Se descargo el archivo.");
    return;
  }

  try {
    const response = await api.get(`/adjuntos/${attachment.id}/descargar`, { responseType: "blob" });
    const url = URL.createObjectURL(response.data);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (error) {
    showError(error.response?.data?.message || "No se pudo abrir el adjunto.");
  }
}

function getAttachmentExtension(attachment) {
  const rawExtension = attachment.extension || attachment.nombre_original?.split(".").pop() || "";
  return String(rawExtension).replace(".", "").toLowerCase();
}
