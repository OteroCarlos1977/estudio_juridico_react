import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Modal } from "react-bootstrap";
import { Download, Edit3, Plus, Save, Trash2, X } from "lucide-react";
import { api } from "../../api/client";
import { downloadFile } from "../../ui/download";
import { confirmDelete, showError, showSuccess } from "../../ui/alerts";
import { QueryState } from "../../ui/QueryState";

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
      <section className="panel">
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
            <div className="table-wrap">
              <table>
                <thead><tr><th>Usuario</th><th>Nombre</th><th>Email</th><th>Roles</th><th>Activo</th><th>Acciones</th></tr></thead>
                <tbody>
                  {(usersQuery.data || []).map((user) => (
                    <tr key={user.id}>
                      <td>{user.username}</td>
                      <td>{user.nombre || "-"}</td>
                      <td>{user.email || "-"}</td>
                      <td>{user.roles || "-"}</td>
                      <td>{user.activo ? "Si" : "No"}</td>
                      <td>
                        {isAdmin ? (
                          <div className="row-actions">
                          <button className="row-button" type="button" onClick={() => openEditUserModal(user)}>
                            <Edit3 size={15} />
                            Editar
                          </button>
                          <button className="row-button danger" type="button" onClick={() => deleteUser(user)}>
                            <Trash2 size={15} />
                            Eliminar
                          </button>
                          </div>
                        ) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
            <div className="table-wrap">
              <table>
                <thead><tr><th>Archivo</th><th>Fecha</th><th>Usuario</th><th>Acciones</th></tr></thead>
                <tbody>
                  {(backupsQuery.data || []).map((backup) => (
                    <tr key={backup.id || backup.archivo}>
                      <td>{backup.archivo}</td>
                      <td>{backup.fecha || "-"}</td>
                      <td>{backup.usuario || "-"}</td>
                      <td>
                        {isAdmin ? (
                          <button className="row-button" type="button" onClick={() => downloadBackup(backup.archivo)}>
                            <Download size={15} />
                            Descargar
                          </button>
                        ) : "-"}
                      </td>
                    </tr>
                  ))}
                  {(backupsQuery.data || []).length === 0 && (
                    <tr><td colSpan="4">No hay backups registrados.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {isUserModalOpen && (
        <Modal show onHide={closeUserModal} centered size="lg" aria-labelledby="user-form-title">
          <Modal.Body>
            <div className="panel-title split">
              <h2 id="user-form-title">{editingUserId ? "Editar usuario" : "Nuevo usuario"}</h2>
              <Button variant="outline-secondary" className="icon-button close-detail-button" type="button" onClick={closeUserModal} title="Cerrar">
                <X size={17} />
              </Button>
            </div>
            <form className="client-form modal-form" onSubmit={handleSubmit} noValidate>
              <Field label="Usuario" name="username" value={form.username} error={errors.username} onChange={handleChange} />
              <Field label={editingUserId ? "Nueva contraseña" : "Contraseña"} name="password" type="password" value={form.password} error={errors.password} onChange={handleChange} />
              <Field label="Nombre" name="nombre" value={form.nombre} onChange={handleChange} />
              <Field label="Apellido" name="apellido" value={form.apellido} onChange={handleChange} />
              <Field label="Nombre completo" name="nombre_completo" value={form.nombre_completo} onChange={handleChange} />
              <Field label="Email" name="email" type="email" value={form.email} error={errors.email} onChange={handleChange} />
              <label>
                Rol
                <select name="rol_id" value={form.rol_id} onChange={handleChange}>
                  <option value="">Seleccionar</option>
                  {(rolesQuery.data || []).map((role) => (
                    <option key={role.id} value={role.id}>{role.nombre}</option>
                  ))}
                </select>
                <ErrorText value={errors.rol_id} />
              </label>
              <label className="checkbox-field">
                <input name="activo" type="checkbox" checked={form.activo} onChange={handleChange} />
                Activo
              </label>
              <div className="form-actions form-wide">
                <button className="primary-button" type="submit" disabled={saveUserMutation.isPending}>
                  <Save size={17} />
                  Guardar
                </button>
                <button className="secondary-button close-text-button" type="button" onClick={closeUserModal}>
                  <X size={17} />
                  Cancelar
                </button>
              </div>
            </form>
          </Modal.Body>
        </Modal>
      )}
    </>
  );
}

function Field({ label, name, value, error, onChange, type = "text" }) {
  return (
    <label>
      {label}
      <input name={name} type={type} value={value} onChange={onChange} />
      <ErrorText value={error} />
    </label>
  );
}

function ErrorText({ value }) {
  return value?.length ? <span className="error-text">{value[0]}</span> : null;
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
