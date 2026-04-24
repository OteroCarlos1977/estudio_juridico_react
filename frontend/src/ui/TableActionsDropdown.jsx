import { Dropdown } from "react-bootstrap";
import { MoreHorizontal } from "lucide-react";

export function TableActionsDropdown({ items, align = "end", label = "Acciones" }) {
  const visibleItems = (items || []).filter((item) => !item.hidden);

  if (visibleItems.length === 0) {
    return "-";
  }

  return (
    <Dropdown align={align}>
      <Dropdown.Toggle className="icon-button table-actions-toggle" variant="light" size="sm" title={label}>
        <MoreHorizontal size={15} />
      </Dropdown.Toggle>
      <Dropdown.Menu className="table-actions-menu">
        {visibleItems.map((item) => (
          <Dropdown.Item
            key={item.key}
            className={item.danger ? "table-actions-danger" : undefined}
            onClick={item.onClick}
          >
            {item.icon}
            <span>{item.label}</span>
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
}
