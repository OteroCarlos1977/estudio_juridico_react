import { Button } from "react-bootstrap";
import { X } from "lucide-react";

export function ModalFormHeader({ title, titleId, onClose }) {
  return (
    <div className="panel-title split">
      <h2 id={titleId}>{title}</h2>
      <Button variant="outline-secondary" className="icon-button close-detail-button" type="button" onClick={onClose} title="Cerrar">
        <X size={17} />
      </Button>
    </div>
  );
}

export function FormActionBar({ children, className = "form-actions form-wide" }) {
  return <div className={className}>{children}</div>;
}
