import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge, Modal } from "react-bootstrap";
import { Download, Edit3, Plus, Save, Trash2 } from "lucide-react";
import { api } from "../../api/client";
import { downloadFile } from "../../ui/download";
import { confirmDelete, showError, showSuccess } from "../../ui/alerts";
import { DataTable } from "../../ui/DataTable";
import { FormCheckbox, FormField, FormSelect } from "../../ui/FormFields";
import { FormActionBar, ModalFormHeader } from "../../ui/FormLayout";
import { QueryState } from "../../ui/QueryState";
import { TableActionsDropdown } from "../../ui/TableActionsDropdown";

const emptyUserForm = {
  username: "",
  password: "",
  nombre: "",
  apellido: "",
  nombre_completo: "",
  email: "",
  rol_id: "",
  activo: true,
};

export function SystemPanel({ currentUser }) {
  const queryClient = useQueryClient();
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [form, setForm] = useState(emptyUserForm);
  const [errors, setErrors] = useState({});

  const usersQuery = useQuery({ queryKey: ["users"], queryFn: async () => (await api.get("/sistema/usuarios")).data.users, retry: 1 });
  const rolesQuery = useQuery({ queryKey: ["roles"], queryFn: async () => (await api.get("/sistema/roles")).data.roles, retry: 1 });
  const backupsQuery = useQuery({ queryKey: ["backups"], queryFn: async () => (await api.get("/sistema/backups")).data.backups, retry: 1 });

  const saveUserMutation = useMutation({
    mutationFn: async () => {
      if (editingUserId) {
        return (await api.put(`/sistema/usuarios/${editingUserId}`, form)).data.user;
      }
      return (await api.post("/sistema/usuarios", form)).data.user;
    },
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      closeUserModal();
      showSuccess(`Usuario guardado: ${user.username}`);
    },
    onError: (error) => {
      const response = error.response?.data;
      setErrors(response?.details?.fieldErrors || {});
      showError(response?.message || "No se pudo guardar el usuario.");
    },
  });

  const createBackupMutation = useMutation({
    mutationFn: async () => (await api.post("/sistema/backups")).data.backup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backups"] });
      showSuccess("Backup creado.");
    },
    onError: (error) => {
      showError(error.response?.data?.message || "No se pudo crear el backup.");
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId) => {
      await api.delete(`/sistema/usuarios/${userId}`);
      return userId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      showSuccess("Usuario eliminado.");
    },
    onError: (error) => {
      showError(error.response?.data?.message || "No se pudo eliminar el usuario.");
    },
  });

  const isAdmin = currentUser?.roles?.includes("Administrador");
  const isLoading = usersQuery.isLoading || rolesQuery.isLoading;
  const isError = usersQuery.isError || rolesQuery.isError;

  function handleChange(event) {
    const { name, type, checked, value } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : normalizeUserInput(name, value) }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  }

  function openNewUserModal() {
    setEditingUserId(null);
    setForm({ ...emptyUserForm, rol_id: String(rolesQuery.data?.[0]?.id || "") });
    setErrors({});
    setIsUserModalOpen(true);
  }

  function openEditUserModal(user) {
    setEditingUserId(user.id);
    setForm({
      username: user.username || "",
      password: "",
      nombre: user.nombre_simple || "",
      apellido: user.apellido || "",
      nombre_completo: user.nombre_completo || user.nombre || "",
      email: user.email || "",
      rol_id: String(user.rol_id || rolesQuery.data?.[0]?.id || ""),
      activo: Boolean(user.activo),
    });
    setErrors({});
    setIsUserModalOpen(true);
  }

  function closeUserModal() {
    setIsUserModalOpen(false);
    setEditingUserId(null);
    setForm(emptyUserForm);
    setErrors({});
  }

  function handleSubmit(event) {
    event.preventDefault();
    const validationErrors = {};
    if (!form.username.trim()) validationErrors.username = ["El usuario es obligatorio."];
    if (!editingUserId && !form.password) validationErrors.password = ["La contraseña es obligatoria."];
    if (!form.rol_id) validationErrors.rol_id = ["Seleccione un rol."];
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    saveUserMutation.mutate();
  }

  async function downloadBackup(fileName) {
    try {
      await downloadFile(`/sistema/backups/${encodeURIComponent(fileName)}/descargar`, fileName);
    } catch (error) {
      showError(error.response?.data?.message || "No se pudo descargar el backup.");
    }
  }

  async function deleteUser(user) {
    const confirmed = await confirmDelete({
      title: `Eliminar usuario "${user.username}"?`,
      text: "Esta accion lo dejara inactivo y no podra iniciar sesion.",
    });
    if (confirmed) deleteUserMutation.mutate(user.id);
  }

  return (
    <>
      <section className="panel" style={{ display: "flex", flexDirection: "column", flex: "1 1 auto", minHeight: 0, overflow: "hidden" }}>
        <div className="panel-title split">
          <h2>Sistema, usuarios y backups</h2>
          {isAdmin && (
            <button className="primary-button" type="button" onClick={openNewUserModal}>
              <Plus size={17} />
              Nuevo usuario
            </button>
          )}
        </div>
        <QueryState
          isLoading={isLoading}
          isError={isError}
          loadingText="Cargando datos del sistema..."
          errorText="No se pudieron cargar todos los datos del sistema."
        />
        {!isLoading && !isError && (
          <>
            <DataTable maxHeight="clamp(22rem, calc(100vh - 22rem), 52vh)">
              <thead><tr><th>Usuario</th><th>Nombre</th><th>Email</th><th>Roles</th><th>Activo</th><th className="actions-cell">Acciones</th></tr></thead>
                <tbody>
                  {(usersQuery.data || []).map((user) => (
                    <tr key={user.id}>
                      <td>{user.username}</td>
                      <td>{user.nombre || "-"}</td>
                      <td>{user.email || "-"}</td>
                      <td>{user.roles || "-"}</td>
                      <td>
                        <Badge pill bg="light" text="dark" className={`status-pill ${user.activo ? "success" : "warning"}`}>
                          {user.activo ? "Si" : "No"}
                        </Badge>
                      </td>
                      <td className="actions-cell">
                        {isAdmin ? (
                          <TableActionsDropdown
                            label="Acciones del usuario"
                            items={[
                              { key: "edit", label: "Editar", icon: <Edit3 size={15} />, onClick: () => openEditUserModal(user) },
                              { key: "delete", label: "Eliminar", icon: <Trash2 size={15} />, onClick: () => deleteUser(user), danger: true },
                            ]}
                          />
                        ) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
            </DataTable>
            <section className="subsection-title">
              <div className="panel-title split">
                <h2>Backups</h2>
                {isAdmin && (
                  <button className="primary-button" type="button" onClick={() => createBackupMutation.mutate()} disabled>
                    <Save size={17} />
                    Backup pendiente
                  </button>
                )}
              </div>
            </section>
            <DataTable maxHeight="clamp(14rem, calc(100vh - 34rem), 32vh)">
                <thead><tr><th>Archivo</th><th>Fecha</th><th>Usuario</th><th className="actions-cell">Acciones</th></tr></thead>
                <tbody>
                  {(backupsQuery.data || []).map((backup) => (
                    <tr key={backup.id || backup.archivo}>
                      <td>{backup.archivo}</td>
                      <td>{backup.fecha || "-"}</td>
                      <td>{backup.usuario || "-"}</td>
                      <td className="actions-cell">
                        {isAdmin ? (
                          <TableActionsDropdown
                            label="Acciones del backup"
                            items={[
                              { key: "download", label: "Descargar", icon: <Download size={15} />, onClick: () => downloadBackup(backup.archivo) },
                            ]}
                          />
                        ) : "-"}
                      </td>
                    </tr>
                  ))}
                  {(backupsQuery.data || []).length === 0 && (
                    <tr><td colSpan="4">No hay backups registrados.</td></tr>
                  )}
                </tbody>
            </DataTable>
          </>
        )}
      </section>

      {isUserModalOpen && (
        <Modal show onHide={closeUserModal} centered size="lg" aria-labelledby="user-form-title">
          <Modal.Body>
            <ModalFormHeader title={editingUserId ? "Editar usuario" : "Nuevo usuario"} titleId="user-form-title" onClose={closeUserModal} />
            <form className="client-form modal-form" onSubmit={handleSubmit} noValidate>
              <FormField label="Usuario" name="username" value={form.username} error={errors.username} onChange={handleChange} />
              <FormField label={editingUserId ? "Nueva contraseña" : "Contraseña"} name="password" type="password" value={form.password} error={errors.password} onChange={handleChange} />
              <FormField label="Nombre" name="nombre" value={form.nombre} onChange={handleChange} />
              <FormField label="Apellido" name="apellido" value={form.apellido} onChange={handleChange} />
              <FormField label="Nombre completo" name="nombre_completo" value={form.nombre_completo} onChange={handleChange} />
              <FormField label="Email" name="email" type="email" value={form.email} error={errors.email} onChange={handleChange} />
              <FormSelect
                label="Rol"
                name="rol_id"
                value={form.rol_id}
                error={errors.rol_id}
                onChange={handleChange}
                placeholder="Seleccionar"
                options={(rolesQuery.data || []).map((role) => ({ value: role.id, label: role.nombre }))}
              />
              <FormCheckbox name="activo" checked={form.activo} onChange={handleChange}>
                Activo
              </FormCheckbox>
              <FormActionBar>
                <button className="primary-button" type="submit" disabled={saveUserMutation.isPending}>
                  <Save size={17} />
                  Guardar
                </button>
              </FormActionBar>
            </form>
          </Modal.Body>
        </Modal>
      )}
    </>
  );
}

function normalizeUserInput(name, value) {
  if (["nombre", "apellido", "nombre_completo"].includes(name)) {
    return value.toLocaleUpperCase("es-AR");
  }

  if (name === "email" || name === "username") {
    return value.toLocaleLowerCase("es-AR");
  }

  return value;
}
