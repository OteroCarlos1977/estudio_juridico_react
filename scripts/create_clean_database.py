import argparse
import shutil
import sqlite3
from pathlib import Path


DEFAULT_SOURCE = Path("data/estudio_juridico_v28.db")
DEFAULT_OUTPUT = Path("data/estudio_juridico_clean.db")

TABLES_TO_CLEAR = [
    "actuaciones",
    "adelantos_empleado",
    "adjuntos",
    "auditoria",
    "clientes",
    "empleados",
    "expediente_partes",
    "expedientes",
    "facturas",
    "historial_backups",
    "liquidacion_detalles",
    "liquidaciones_sueldos",
    "movimientos_financieros",
    "recibos",
]

CATALOG_TABLES_TO_KEEP = [
    "roles",
    "tipos_actuacion",
    "tipos_documento",
    "tipos_movimiento_financiero",
    "categorias_financieras",
    "conceptos_liquidacion",
    "configuracion_sistema",
]


def parse_args():
    parser = argparse.ArgumentParser(description="Genera una base limpia para instalacion desde la base actual.")
    parser.add_argument("--source", default=str(DEFAULT_SOURCE), help="Base origen. No se modifica.")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT), help="Base limpia a generar.")
    parser.add_argument("--force", action="store_true", help="Sobrescribe la base destino si existe.")
    return parser.parse_args()


def table_exists(connection, table):
    row = connection.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
        (table,),
    ).fetchone()
    return row is not None


def table_count(connection, table):
    if not table_exists(connection, table):
        return None
    return connection.execute(f'SELECT COUNT(*) FROM "{table}"').fetchone()[0]


def reset_sequence(connection, table):
    if not table_exists(connection, "sqlite_sequence"):
        return
    connection.execute("DELETE FROM sqlite_sequence WHERE name = ?", (table,))


def set_sequence_to_max_id(connection, table):
    if not table_exists(connection, "sqlite_sequence") or not table_exists(connection, table):
        return
    max_id = connection.execute(f'SELECT COALESCE(MAX(id), 0) FROM "{table}"').fetchone()[0]
    connection.execute("DELETE FROM sqlite_sequence WHERE name = ?", (table,))
    if max_id:
        connection.execute("INSERT INTO sqlite_sequence (name, seq) VALUES (?, ?)", (table, max_id))


def clean_database(output):
    connection = sqlite3.connect(output)
    connection.row_factory = sqlite3.Row
    try:
        connection.execute("PRAGMA foreign_keys = OFF")
        connection.execute("BEGIN")

        for table in TABLES_TO_CLEAR:
            if table_exists(connection, table):
                connection.execute(f'DELETE FROM "{table}"')
                reset_sequence(connection, table)

        keep_admin_only(connection)

        connection.commit()
        connection.execute("PRAGMA foreign_keys = ON")
        integrity = connection.execute("PRAGMA integrity_check").fetchone()[0]
        if integrity != "ok":
            raise RuntimeError(f"PRAGMA integrity_check devolvio: {integrity}")
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()

    vacuum_database(output)


def keep_admin_only(connection):
    if not table_exists(connection, "usuarios"):
        return

    admin = connection.execute("SELECT id FROM usuarios WHERE username = 'admin' AND activo = 1").fetchone()
    if admin is None:
        raise RuntimeError("No se encontro usuario admin activo en la base origen.")

    admin_id = admin["id"]

    if table_exists(connection, "usuario_roles"):
        admin_role = connection.execute("SELECT id FROM roles WHERE nombre = 'Administrador' AND activo = 1").fetchone()
        if admin_role is None:
            raise RuntimeError("No se encontro rol Administrador activo.")
        connection.execute("DELETE FROM usuario_roles WHERE usuario_id <> ?", (admin_id,))
        connection.execute("DELETE FROM usuario_roles WHERE usuario_id = ? AND rol_id <> ?", (admin_id, admin_role["id"]))
        exists = connection.execute(
            "SELECT 1 FROM usuario_roles WHERE usuario_id = ? AND rol_id = ?",
            (admin_id, admin_role["id"]),
        ).fetchone()
        if exists is None:
            connection.execute("INSERT INTO usuario_roles (usuario_id, rol_id, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)", (admin_id, admin_role["id"]))
        set_sequence_to_max_id(connection, "usuario_roles")

    connection.execute("DELETE FROM usuarios WHERE id <> ?", (admin_id,))
    set_sequence_to_max_id(connection, "usuarios")


def vacuum_database(output):
    connection = sqlite3.connect(output)
    try:
        connection.execute("VACUUM")
    finally:
        connection.close()


def build_report(output):
    connection = sqlite3.connect(output)
    connection.row_factory = sqlite3.Row
    try:
        report = {
            "archivo": str(output),
            "integridad": connection.execute("PRAGMA integrity_check").fetchone()[0],
            "usuarios": table_count(connection, "usuarios"),
            "usuario_roles": table_count(connection, "usuario_roles"),
            "tablas_limpias": {table: table_count(connection, table) for table in TABLES_TO_CLEAR if table_exists(connection, table)},
            "catalogos": {table: table_count(connection, table) for table in CATALOG_TABLES_TO_KEEP if table_exists(connection, table)},
        }
        admin = connection.execute(
            """
            SELECT u.username, r.nombre AS rol
            FROM usuarios u
            LEFT JOIN usuario_roles ur ON ur.usuario_id = u.id
            LEFT JOIN roles r ON r.id = ur.rol_id
            WHERE u.username = 'admin'
            """
        ).fetchall()
        report["admin"] = [dict(row) for row in admin]
        return report
    finally:
        connection.close()


def main():
    args = parse_args()
    source = Path(args.source)
    output = Path(args.output)

    if not source.exists():
        raise SystemExit(f"No existe la base origen: {source}")
    if output.exists() and not args.force:
        raise SystemExit(f"La base destino ya existe: {output}. Use --force para sobrescribir.")

    output.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, output)
    clean_database(output)
    report = build_report(output)

    print("Base limpia generada")
    print(f"Archivo: {report['archivo']}")
    print(f"Integridad: {report['integridad']}")
    print(f"Usuarios: {report['usuarios']}")
    print(f"Roles de admin: {report['admin']}")
    print("Tablas limpias:")
    for table, total in report["tablas_limpias"].items():
        print(f"  {table}: {total}")
    print("Catalogos conservados:")
    for table, total in report["catalogos"].items():
        print(f"  {table}: {total}")


if __name__ == "__main__":
    main()
