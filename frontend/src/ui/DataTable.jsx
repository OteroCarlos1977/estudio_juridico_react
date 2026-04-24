import { Table } from "react-bootstrap";

export function DataTable({
  children,
  className = "",
  wrapperClassName = "",
  compact = false,
  fill = false,
  autoHeight = false,
  shellStyle,
  scrollStyle,
  tableStyle,
  maxHeight,
  stickyHeader = true,
}) {
  const shellClassName = ["data-table-shell", wrapperClassName].filter(Boolean).join(" ");
  const tableClassName = ["app-data-table", className].filter(Boolean).join(" ");
  const resolvedShellStyle = {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    ...(fill ? { flex: "1 1 auto", minHeight: 0, height: "100%" } : {}),
    ...shellStyle,
  };
  const resolvedScrollStyle = {
    width: "100%",
    overflowX: "auto",
    overflowY: autoHeight ? "visible" : "auto",
    minHeight: 0,
    marginBottom: "0.8rem",
    ...(fill ? { flex: "1 1 auto", marginTop: "auto" } : {}),
    ...(maxHeight ? { maxHeight } : autoHeight ? {} : compact ? { maxHeight: "260px" } : { maxHeight: "40vh" }),
    ...scrollStyle,
  };
  const resolvedTableStyle = {
    marginBottom: 0,
    ...(stickyHeader ? { "--app-sticky-header": "sticky" } : { "--app-sticky-header": "static" }),
    ...tableStyle,
  };

  return (
    <div className={shellClassName} style={resolvedShellStyle}>
      <div className="data-table-scroll" style={resolvedScrollStyle}>
      <Table
        hover
        size={compact ? "sm" : undefined}
        className={tableClassName}
        style={resolvedTableStyle}
      >
        {children}
      </Table>
      </div>
    </div>
  );
}
