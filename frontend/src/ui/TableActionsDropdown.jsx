import { ButtonGroup } from "react-bootstrap";

export function TableActionsDropdown({ items, align = "end", label = "Acciones" }) {
  const visibleItems = (items || []).filter((item) => !item.hidden);

  if (visibleItems.length === 0) {
    return "-";
  }

  return (
    <ButtonGroup aria-label={label} className={`row-actions table-button-group table-action-icons align-${align}`}>
      {visibleItems.map((item) => (
        <button
          key={item.key}
          className={`row-button icon-only-button table-action-icon-button${item.danger ? " danger" : ""}`}
          type="button"
          title={item.label}
          aria-label={item.label}
          onClick={item.onClick}
        >
          {item.icon}
        </button>
      ))}
    </ButtonGroup>
  );
}
